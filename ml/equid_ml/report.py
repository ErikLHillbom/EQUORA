"""Write the measured numbers into docs/data.md, between the generated markers.

Reads public/models/metrics.json, ml/data/interim/build_summary.json and
ml/data/raw/fetch_report.json, so the doc never carries a number typed by hand.

Usage: uv run python -m equid_ml.report
"""

from __future__ import annotations

import json
import re

from equid_ml import INTERIM_DIR, MODELS_DIR, RAW_DIR, REPO_ROOT

DOC = REPO_ROOT / "docs" / "data.md"
START = "<!-- generated:start (ml/equid_ml/report.py) -->"
END = "<!-- generated:end -->"


def pct(x: float) -> str:
    return f"{100 * x:.1f}%"


def table(header: list[str], rows: list[list[object]]) -> str:
    out = ["| " + " | ".join(header) + " |", "|" + "|".join("---" for _ in header) + "|"]
    out += ["| " + " | ".join(str(c) for c in r) + " |" for r in rows]
    return "\n".join(out)


def render(m: dict, b: dict, f: dict | None, replay: dict | None) -> str:
    parts: list[str] = []

    parts.append("### What we downloaded\n")
    if f:
        parts.append(
            f"- Archive: `data.zip`, {f['archiveBytes']:,} bytes. Listed with HTTP range requests, never downloaded whole.\n"
            f"- Streamed: {f['compressedBytesStreamed'] / 1e9:.2f} GB of compressed CSV parts from the "
            f"{len(f['subjects'])} horses with labels. Each part was filtered in memory.\n"
            f"- Kept on disk: {f['bytesOnDisk'] / 1e6:.0f} MB (labelled rows only, columns Ax, Ay, Az, label, segment).\n"
        )
        rows = [[s["subject"], f"{s['rows']:,}", f"{s['labelledRows']:,}"] for s in f["subjects"]]
        parts.append(table(["Horse", "Rows at 100 Hz", "Labelled rows kept"], rows) + "\n")
    parts.append(
        f"Mean acceleration magnitude over the windows we kept: {b['meanMagnitudeG']} g "
        f"(input in {b['unitsIn']}, divided by 9.80665). Walking and trotting raise the mean above 1 g; "
        "the builder stops if it falls outside 0.8 to 1.25 g.\n"
    )

    parts.append("### Windows per class\n")
    per_class = b["windowsPerClass"]
    rows = [[lab, f"{per_class.get(lab, 0):,}", "yes" if lab in m["labels"] else "no, rule only"] for lab in ["stand", "walk", "trot", "eat", "roll"]]
    parts.append(table(["Class", "2 s windows", "In the classifier"], rows) + "\n")
    rows = [[lab, f"{n:,}", b["dropReasons"].get(lab, "")] for lab, n in sorted(b["droppedWindows"].items(), key=lambda kv: -kv[1])]
    parts.append("Dropped labels:\n\n" + table(["Label", "2 s windows", "Why"], rows) + "\n")

    parts.append("### Results, leave-one-horse-out\n")
    parts.append(
        f"Each fold trains on all horses but one and tests on the one left out. "
        f"{len(m['subjectsUsed'])} horses, {m['windows']:,} windows, classes {', '.join(m['labels'])}.\n"
    )
    rows = [
        ["Random forest (shipped)", pct(m["accuracy"]), f"{m['macroF1']:.3f}"],
        ["Logistic regression (baseline)", pct(m["baseline"]["accuracy"]), f"{m['baseline']['macroF1']:.3f}"],
    ]
    parts.append(table(["Model", "Accuracy", "Macro F1"], rows) + "\n")
    rows = [
        [lab, f"{v['precision']:.3f}", f"{v['recall']:.3f}", f"{v['f1']:.3f}", f"{v['support']:,}", f"{m['baseline']['perClass'][lab]['f1']:.3f}"]
        for lab, v in m["perClass"].items()
    ]
    parts.append(table(["Class", "Precision", "Recall", "F1", "Windows", "Baseline F1"], rows) + "\n")
    labels = m["confusion"]["labels"]
    rows = [[f"true {labels[i]}", *[f"{v:,}" for v in r]] for i, r in enumerate(m["confusion"]["matrix"])]
    parts.append("Confusion matrix (rows are the true class):\n\n" + table(["", *[f"predicted {lab}" for lab in labels]], rows) + "\n")
    rows = [[x["heldOut"], f"{x['windows']:,}", pct(x["accuracy"])] for x in m["perFold"]]
    parts.append("Accuracy per held-out horse:\n\n" + table(["Horse left out", "Windows", "Accuracy"], rows) + "\n")

    mp = m["model"]
    parts.append("### Shipped model\n")
    parts.append(
        f"- Random forest, {mp['n_estimators']} trees, max depth {mp['max_depth']}, at least {mp['min_samples_leaf']} windows per leaf, "
        f"balanced class weights. Selection: {m['tuning']['selection']}.\n"
        f"- Trained on {len(m['subjectsInShippedModel'])} horses. {m['replaySubject']} is left out, so the Tag screen replays a horse the model never saw.\n"
        f"- `public/models/activity-v1.json`: {m['modelBytes']:,} bytes, {m['modelNodes']:,} nodes.\n"
        f"- Confidence threshold: {m['confidenceThreshold']}. Rule: {m['thresholdRule']}. "
        f"Windows above it: {pct(m['coverageAtThreshold'])}, with accuracy {pct(m['accuracyAtThreshold'])}. "
        "Windows below it are NOT SURE in the app.\n"
    )
    rd = m["rollDecision"]
    if "withRoll" in rd:
        w = rd["withRoll"]
        parts.append(
            f"- Rolling as a classifier class: precision {w['precision']:.2f}, recall {w['recall']:.2f} on {w['support']} windows. "
            f"Rule: {rd['rule']}. Kept: {'yes' if rd['kept'] else 'no'}.\n"
        )
    if replay:
        clips = ", ".join(f"{c['label']} {c['windows']}" for c in replay["clips"])
        parts.append(f"- Replay fixtures from {replay['subject']}: windows per clip {clips}; {replay['bytes']:,} bytes in `public/replay/`.\n")
    return "\n".join(parts)


def main() -> int:
    m = json.loads((MODELS_DIR / "metrics.json").read_text(encoding="utf-8"))
    b = json.loads((INTERIM_DIR / "build_summary.json").read_text(encoding="utf-8"))
    fp = RAW_DIR / "fetch_report.json"
    f = json.loads(fp.read_text(encoding="utf-8")) if fp.exists() else None
    replay_dir = REPO_ROOT / "public" / "replay"
    replay = json.loads((replay_dir / "manifest.json").read_text(encoding="utf-8"))
    replay["bytes"] = sum(p.stat().st_size for p in replay_dir.glob("*.bin"))
    text = DOC.read_text(encoding="utf-8")
    block = f"{START}\n\n{render(m, b, f, replay)}\n{END}"
    new, n = re.subn(re.escape(START) + r".*?" + re.escape(END), lambda _: block, text, flags=re.S)
    if n != 1:
        raise SystemExit(f"{DOC} needs exactly one generated block")
    DOC.write_text(new, encoding="utf-8", newline="\n")
    print(f"updated {DOC}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
