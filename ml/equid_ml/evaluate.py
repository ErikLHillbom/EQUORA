"""Metrics for the activity classifier: per-class scores, confusion matrix, confidence threshold."""

from __future__ import annotations

import numpy as np
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_recall_fscore_support


def r(x: float, nd: int = 4) -> float:
    return float(round(float(x), nd))


def scores(y_true: np.ndarray, y_pred: np.ndarray, labels: list[str]) -> dict:
    """Accuracy, macro F1 over the labels present in y_true, per-class scores, confusion matrix."""
    present = [lab for lab in labels if np.any(y_true == lab)]
    p, rec, f1, sup = precision_recall_fscore_support(y_true, y_pred, labels=labels, zero_division=0)
    per_class = {
        lab: {"precision": r(p[i]), "recall": r(rec[i]), "f1": r(f1[i]), "support": int(sup[i])}
        for i, lab in enumerate(labels)
    }
    return {
        "accuracy": r(accuracy_score(y_true, y_pred)),
        "macroF1": r(f1_score(y_true, y_pred, labels=present, average="macro", zero_division=0)),
        "perClass": per_class,
        "confusion": {
            "labels": labels,
            "rowsAreTrue": True,
            "matrix": confusion_matrix(y_true, y_pred, labels=labels).tolist(),
        },
    }


def coverage_accuracy(y_true: np.ndarray, proba: np.ndarray, classes: np.ndarray, threshold: float) -> tuple[float, float]:
    """Share of windows whose top probability is at least `threshold`, and accuracy on them."""
    top = proba.max(axis=1)
    keep = top >= threshold
    if not keep.any():
        return 0.0, 0.0
    pred = classes[proba.argmax(axis=1)]
    return float(keep.mean()), float((pred[keep] == y_true[keep]).mean())


def pick_threshold(
    y_true: np.ndarray,
    proba: np.ndarray,
    classes: np.ndarray,
    target_accuracy: float = 0.90,
    grid: np.ndarray | None = None,
) -> dict:
    """Lowest threshold on the top-class probability with accuracy >= target on the windows above it.

    Windows below the threshold become NOT SURE in the app. Returns the threshold, the share of
    windows kept (coverage) and the accuracy on them. Falls back to the threshold with the best
    accuracy if no threshold reaches the target.

    The grid starts at 0.5: the top class must hold more than half the probability, even when
    the accuracy target is already met below that.
    """
    if grid is None:
        grid = np.round(np.arange(0.50, 0.96, 0.01), 2)
    curve = []
    for t in grid:
        cov, acc = coverage_accuracy(y_true, proba, classes, float(t))
        curve.append({"threshold": r(t, 2), "coverage": r(cov), "accuracy": r(acc)})
    ok = [c for c in curve if c["coverage"] > 0 and c["accuracy"] >= target_accuracy]
    reached = bool(ok)
    best = ok[0] if ok else max(curve, key=lambda c: (c["accuracy"], c["coverage"]))
    return {
        "targetAccuracy": target_accuracy,
        "reached": reached,
        "threshold": best["threshold"],
        "coverage": best["coverage"],
        "accuracy": best["accuracy"],
        "curve": curve,
    }
