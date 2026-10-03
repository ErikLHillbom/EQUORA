import numpy as np
from sklearn.ensemble import RandomForestClassifier

from equid_ml.evaluate import coverage_accuracy, pick_threshold, scores
from equid_ml.export import float32_floor, forest_json, predict_json


def synthetic(n=600, seed=1):
    rng = np.random.default_rng(seed)
    X = rng.normal(size=(n, 6)).astype(np.float32)
    y = np.where(X[:, 0] + 0.5 * X[:, 1] > 0.3, "walk", np.where(X[:, 2] > 0, "stand", "eat"))
    return X, y


def test_json_forest_matches_sklearn_probabilities():
    X, y = synthetic()
    rf = RandomForestClassifier(n_estimators=12, max_depth=8, class_weight="balanced", random_state=0).fit(X, y)
    fj = forest_json(rf, [f"f{i}" for i in range(6)], 0.5)
    Xt, _ = synthetic(200, seed=2)
    # Include the training points: their values sit next to the split thresholds.
    Xt = np.vstack([Xt, X[:200]])
    assert np.abs(predict_json(fj, Xt) - rf.predict_proba(Xt)).max() < 1e-5


def test_float32_floor_keeps_comparisons_exact():
    for x in [0.1, 1 / 3, 2.5, -7.123456789, 1e-8]:
        f = float32_floor(x)
        assert float(f) <= x
        assert float(np.nextafter(f, np.float32(np.inf))) > x


def test_scores_and_confusion():
    y = np.array(["a", "a", "b", "b"])
    p = np.array(["a", "b", "b", "b"])
    s = scores(y, p, ["a", "b", "c"])
    assert s["accuracy"] == 0.75
    assert s["confusion"]["matrix"] == [[1, 1, 0], [0, 2, 0], [0, 0, 0]]
    assert s["perClass"]["a"]["recall"] == 0.5
    # Macro F1 counts only classes present in the truth.
    assert abs(s["macroF1"] - (2 / 3 + 0.8) / 2) < 1e-4


def test_threshold_is_lowest_that_reaches_target():
    classes = np.array(["a", "b"])
    proba = np.array([[0.95, 0.05], [0.9, 0.1], [0.6, 0.4], [0.55, 0.45], [0.2, 0.8]])
    y = np.array(["a", "a", "b", "b", "b"])
    t = pick_threshold(y, proba, classes, target_accuracy=0.9, grid=np.array([0.5, 0.7, 0.8]))
    assert t["threshold"] == 0.7
    assert t["reached"]
    cov, acc = coverage_accuracy(y, proba, classes, 0.7)
    assert (cov, acc) == (0.6, 1.0)
