"""Train the activity classifier with leave-one-horse-out cross-validation.

Reads ml/data/interim/features.csv (built by scripts/build-features.ts with the app's own
feature code). Compares a small random forest against a logistic regression baseline, picks
the confidence threshold for NOT SURE, then fits the shipped model.

The shipped model leaves out the replay horse (see build_summary.json), so the Tag screen
replays data the model has never seen.

Usage: uv run python -m equid_ml.train [--roll auto|keep|drop]
Writes ml/data/interim/model.pkl and ml/data/interim/train_results.json.
"""

from __future__ import annotations

import argparse
import json
import pickle
import time
from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import LeaveOneGroupOut
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from equid_ml import INTERIM_DIR, LABELS
from equid_ml.evaluate import pick_threshold, r, scores

META_COLUMNS = ["subject", "name", "label", "source_label", "segment", "start_row"]
SEED = 0
# Light tuning: forests of 30 trees. The app downloads the model and a tag stores it, so we take
# the smallest forest (fewest nodes) whose leave-one-horse-out macro F1 is within
# SIZE_TOLERANCE of the best one.
RF_GRID = [
    {"max_depth": d, "min_samples_leaf": leaf} for d in (8, 10) for leaf in (5, 20, 50)
]
SIZE_TOLERANCE = 0.005
# Roll stays a classifier class only if leave-one-horse-out precision and recall both reach this.
ROLL_KEEP_MIN = 0.3


@dataclass
class Data:
    X: np.ndarray
    y: np.ndarray
    groups: np.ndarray
    names: np.ndarray
    feature_names: list[str]
    frame: pd.DataFrame


def load(path=INTERIM_DIR / "features.csv") -> Data:
    df = pd.read_csv(path)
    feature_names = [c for c in df.columns if c not in META_COLUMNS]
    X = df[feature_names].to_numpy(dtype=np.float32)
    if not np.isfinite(X).all():
        raise ValueError("features.csv has non-finite values")
    return Data(
        X=X,
        y=df["label"].to_numpy(),
        groups=df["subject"].to_numpy(),
        names=df["name"].to_numpy(),
        feature_names=feature_names,
        frame=df,
    )


def make_rf(**params) -> RandomForestClassifier:
    return RandomForestClassifier(
        n_estimators=30,
        class_weight="balanced",
        max_features="sqrt",
        random_state=SEED,
        n_jobs=-1,
        **params,
    )


def make_lr():
    return make_pipeline(
        StandardScaler(),
        LogisticRegression(class_weight="balanced", max_iter=3000, random_state=SEED),
    )


def loho(model, d: Data, labels: list[str]) -> dict:
    """Out-of-fold predictions and probabilities, one fold per horse."""
    proba = np.zeros((len(d.y), len(labels)), dtype=np.float64)
    folds = []
    for train_idx, test_idx in LeaveOneGroupOut().split(d.X, d.y, d.groups):
        m = clone(model).fit(d.X[train_idx], d.y[train_idx])
        p = m.predict_proba(d.X[test_idx])
        # Map the fold model's classes to the full label order (a fold can miss a class).
        for j, c in enumerate(m.classes_):
            proba[test_idx, labels.index(c)] = p[:, j]
        pred = np.array(labels)[proba[test_idx].argmax(axis=1)]
        yt = d.y[test_idx]
        folds.append(
            {
                "heldOut": str(d.names[test_idx][0]),
                "windows": int(len(test_idx)),
                "accuracy": r((pred == yt).mean()),
            }
        )
    pred = np.array(labels)[proba.argmax(axis=1)]
    return {"proba": proba, "pred": pred, "folds": folds, **scores(d.y, pred, labels)}


def subset(d: Data, mask: np.ndarray) -> Data:
    return Data(d.X[mask], d.y[mask], d.groups[mask], d.names[mask], d.feature_names, d.frame[mask])


def run(roll: str = "auto") -> dict:
    t0 = time.time()
    summary = json.loads((INTERIM_DIR / "build_summary.json").read_text())
    data = load()
    labels = [lab for lab in LABELS if np.any(data.y == lab)]
    print(f"{len(data.y)} windows, {len(set(data.groups))} horses, classes {labels}")

    def tune(d: Data, labs: list[str]):
        results = []
        for params in RF_GRID:
            res = loho(make_rf(**params), d, labs)
            res["nodes"] = int(sum(e.tree_.node_count for e in make_rf(**params).fit(d.X, d.y).estimators_))
            print(f"  rf {params}: accuracy {res['accuracy']}, macro F1 {res['macroF1']}, {res['nodes']} nodes")
            results.append((params, res))
        top = max(res["macroF1"] for _, res in results)
        close = [pr for pr in results if pr[1]["macroF1"] >= top - SIZE_TOLERANCE]
        best = min(close, key=lambda pr: (pr[1]["nodes"], -pr[1]["macroF1"]))
        return best, results

    (params, rf_res), grid_results = tune(data, labels)
    roll_decision = {"rule": f"keep roll if leave-one-horse-out precision and recall are both >= {ROLL_KEEP_MIN}"}
    if "roll" in labels:
        pc = rf_res["perClass"]["roll"]
        roll_decision["withRoll"] = pc
        keep = roll == "keep" or (roll == "auto" and pc["precision"] >= ROLL_KEEP_MIN and pc["recall"] >= ROLL_KEEP_MIN)
        roll_decision["kept"] = bool(keep)
        if not keep:
            print(f"dropping roll from the classifier: {pc}")
            roll_decision["windowsDropped"] = int((data.y == "roll").sum())
            data = subset(data, data.y != "roll")
            labels = [lab for lab in labels if lab != "roll"]
            (params, rf_res), grid_results = tune(data, labels)
    else:
        roll_decision["kept"] = False

    print(f"chosen forest {params}")
    lr_res = loho(make_lr(), data, labels)
    print(f"  logistic regression: accuracy {lr_res['accuracy']}, macro F1 {lr_res['macroF1']}")

    classes = np.array(labels)
    thr = pick_threshold(data.y, rf_res["proba"], classes)
    print(f"threshold {thr['threshold']}: coverage {thr['coverage']}, accuracy {thr['accuracy']}")

    # Shipped model: every horse except the replay horse.
    replay = summary.get("replaySubject")
    ship_mask = data.names != replay
    final = make_rf(**params).fit(data.X[ship_mask], data.y[ship_mask])
    assert list(final.classes_) == sorted(labels)

    with open(INTERIM_DIR / "model.pkl", "wb") as f:
        pickle.dump(final, f)

    def strip(res: dict) -> dict:
        return {k: v for k, v in res.items() if k not in ("proba", "pred")}

    out = {
        "trainedAt": pd.Timestamp.now(tz="UTC").isoformat(timespec="seconds"),
        "labels": labels,
        "featureNames": data.feature_names,
        "windows": int(len(data.y)),
        "windowsPerClass": {lab: int((data.y == lab).sum()) for lab in labels},
        "subjects": sorted(set(map(str, data.names))),
        "subjectsInShippedModel": sorted(set(map(str, data.names[ship_mask]))),
        "replaySubject": replay,
        "cvMethod": "leave-one-horse-out",
        "rfParams": {"n_estimators": 30, "class_weight": "balanced", "max_features": "sqrt", **params},
        "rfGrid": [
            {"params": p, "accuracy": res["accuracy"], "macroF1": res["macroF1"], "nodes": res["nodes"]}
            for p, res in grid_results
        ],
        "selection": f"smallest forest within {SIZE_TOLERANCE} macro F1 of the best",
        "rf": strip(rf_res),
        "baseline": {"model": "logistic regression (standardised features, balanced class weights)", **strip(lr_res)},
        "threshold": thr,
        "rollDecision": roll_decision,
        "seconds": round(time.time() - t0, 1),
    }
    (INTERIM_DIR / "train_results.json").write_text(json.dumps(out, indent=2))
    print(f"done in {out['seconds']} s")
    return out


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--roll", choices=["auto", "keep", "drop"], default="auto")
    args = ap.parse_args(argv)
    run(args.roll)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
