"""Export the shipped model for the app, the metrics for the About the data screen, and a C header.

Writes:
  public/models/activity-v1.json   the forest as flat arrays per tree
  public/models/metrics.json       leave-one-horse-out results, read by the app (never typed by hand)
  ml/export/activity_model.h       emlearn C code for a microcontroller tag
  ml/export/golden.json            feature vectors with sklearn's probabilities, for the parity test

Usage: uv run python -m equid_ml.export
"""

from __future__ import annotations

import json
import pickle

import emlearn
import numpy as np

from equid_ml import EXPORT_DIR, INTERIM_DIR, MODELS_DIR
from equid_ml.train import load

MODEL_VERSION = "activity-v1"
# Rounding error per tree is at most 5e-6, so the averaged probability stays within 1e-5.
LEAF_DECIMALS = 5
DATASET = {
    "name": "Horsing Around",
    "citation": "Kamminga JW, Janßen LM, Meratnia N, Havinga PJM. 2019. Horsing Around: a dataset comprising horse movement. Data 4(4):131.",
    "doi": "10.4121/uuid:2e08745c-4178-4183-8551-f248c992cb14",
    "url": "https://doi.org/10.4121/uuid:2e08745c-4178-4183-8551-f248c992cb14",
    "licence": "CC0",
}


def float32_floor(x: float) -> np.float32:
    """Largest float32 not above x. For a float32 feature v: v <= x exactly when v <= float32_floor(x)."""
    f = np.float32(x)
    if float(f) > x:
        f = np.nextafter(f, np.float32(-np.inf))
    return f


def fmt32(x: np.float32) -> float:
    """Shortest decimal that parses back to the same float32 (the app applies Math.fround)."""
    v = float(str(np.float32(x)))
    # Same path as the app: parse to a double, then round to float32 (Math.fround).
    assert np.float32(v) == np.float32(x), x
    return v


def tree_to_json(est, n_classes: int) -> dict:
    t = est.tree_
    feature, threshold, left, right = [], [], [], []
    leaves: list[float] = []
    for i in range(t.node_count):
        if t.children_left[i] == -1:
            v = t.value[i][0].astype(np.float64)
            v = v / v.sum()
            feature.append(-1)
            threshold.append(0)
            left.append(len(leaves) // n_classes)
            right.append(-1)
            leaves.extend(round(float(p), LEAF_DECIMALS) for p in v)
        else:
            feature.append(int(t.feature[i]))
            threshold.append(fmt32(float32_floor(float(t.threshold[i]))))
            left.append(int(t.children_left[i]))
            right.append(int(t.children_right[i]))
    return {"feature": feature, "threshold": threshold, "left": left, "right": right, "leaves": leaves}


def forest_json(model, feature_names: list[str], threshold: float) -> dict:
    classes = [str(c) for c in model.classes_]
    return {
        "version": MODEL_VERSION,
        "kind": "random-forest",
        "format": (
            "Per tree, flat node arrays. feature[i] = -1 marks a leaf; its class probabilities are "
            "leaves[left[i] * classes.length ...]. Otherwise go to left[i] when x[feature[i]] <= "
            "Math.fround(threshold[i]), else right[i]. Average the leaf probabilities over trees."
        ),
        "classes": classes,
        "featureNames": feature_names,
        "hz": 25,
        "windowSeconds": 2,
        "confidenceThreshold": threshold,
        "trees": [tree_to_json(e, len(classes)) for e in model.estimators_],
    }


def predict_json(fj: dict, X: np.ndarray) -> np.ndarray:
    """Reference evaluator of the exported JSON, the same walk the app does in src/sensing/model.ts."""
    k = len(fj["classes"])
    out = np.zeros((len(X), k))
    X = np.asarray(X, dtype=np.float32)
    for tree in fj["trees"]:
        f, t, left, right, leaves = tree["feature"], tree["threshold"], tree["left"], tree["right"], tree["leaves"]
        for n, x in enumerate(X):
            i = 0
            while f[i] != -1:
                i = left[i] if x[f[i]] <= np.float32(t[i]) else right[i]
            out[n] += leaves[left[i] * k : left[i] * k + k]
    return out / len(fj["trees"])


def main() -> int:
    tr = json.loads((INTERIM_DIR / "train_results.json").read_text())
    summary = json.loads((INTERIM_DIR / "build_summary.json").read_text())
    with open(INTERIM_DIR / "model.pkl", "rb") as f:
        model = pickle.load(f)
    data = load()

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)

    thr = tr["threshold"]
    fj = forest_json(model, tr["featureNames"], thr["threshold"])
    model_text = json.dumps(fj, separators=(",", ":"))
    model_path = MODELS_DIR / f"{MODEL_VERSION}.json"
    model_path.write_text(model_text)
    model_bytes = len(model_text.encode())
    n_nodes = sum(e.tree_.node_count for e in model.estimators_)
    print(f"{model_path.name}: {model_bytes} bytes, {len(model.estimators_)} trees, {n_nodes} nodes")

    # C header for a microcontroller (emlearn, float features, 8-bit leaf proportions).
    cmodel = emlearn.convert(model, method="inline", dtype="float", leaf_bits=8)
    header = cmodel.save(name="activity_model", file=str(EXPORT_DIR / "activity_model.h"))
    print(f"activity_model.h: {len(header.encode())} bytes")

    # Golden vectors: 10 per class from the training table, with sklearn's probabilities.
    rng = np.random.default_rng(0)
    idx = []
    for c in model.classes_:
        pool = np.flatnonzero(data.y == c)
        idx.extend(rng.choice(pool, size=min(10, len(pool)), replace=False).tolist())
    X = data.X[idx]
    proba = model.predict_proba(X)
    gap = float(np.abs(predict_json(fj, X) - proba).max())
    print(f"JSON forest against sklearn on golden cases: max difference {gap:.2e}")
    assert gap < 1e-5, gap
    golden = {
        "model": MODEL_VERSION,
        "classes": [str(c) for c in model.classes_],
        "featureNames": tr["featureNames"],
        "cases": [
            {"features": [float(v) for v in X[i]], "label": str(data.y[idx[i]]), "probs": [float(p) for p in proba[i]]}
            for i in range(len(idx))
        ],
    }
    (EXPORT_DIR / "golden.json").write_text(json.dumps(golden, indent=1))

    rf = tr["rf"]
    base = tr["baseline"]
    metrics = {
        "version": MODEL_VERSION,
        "trainedAt": tr["trainedAt"],
        "dataset": DATASET,
        "subjectsUsed": tr["subjects"],
        "subjectsInShippedModel": tr["subjectsInShippedModel"],
        "replaySubject": tr["replaySubject"],
        "windows": tr["windows"],
        "windowsPerClass": tr["windowsPerClass"],
        "labelMap": summary["labelMap"],
        "droppedWindows": summary["droppedWindows"],
        "labels": tr["labels"],
        "cvMethod": tr["cvMethod"],
        "model": {"kind": "random forest", **tr["rfParams"]},
        "accuracy": rf["accuracy"],
        "macroF1": rf["macroF1"],
        "perClass": rf["perClass"],
        "confusion": rf["confusion"],
        "perFold": rf["folds"],
        "baseline": {
            "model": base["model"],
            "accuracy": base["accuracy"],
            "macroF1": base["macroF1"],
            "perClass": base["perClass"],
        },
        "tuning": {"selection": tr["selection"], "grid": tr["rfGrid"]},
        "rollDecision": tr["rollDecision"],
        "confidenceThreshold": thr["threshold"],
        "thresholdRule": (
            f"lowest top-class probability, from 0.5 up, with accuracy >= {thr['targetAccuracy']} "
            "on the leave-one-horse-out windows above it"
        ),
        "thresholdCurve": [c for c in thr["curve"] if round(c["threshold"] * 100) % 5 == 0],
        "thresholdReached": thr["reached"],
        "coverageAtThreshold": thr["coverage"],
        "accuracyAtThreshold": thr["accuracy"],
        "modelBytes": model_bytes,
        "modelNodes": int(n_nodes),
        "featureNames": tr["featureNames"],
        "hz": 25,
        "windowSeconds": 2,
    }
    (MODELS_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2) + "\n")
    print(f"metrics.json: accuracy {rf['accuracy']}, macro F1 {rf['macroF1']}, threshold {thr['threshold']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
