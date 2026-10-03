"""Fetch the labelled part of Horsing Around without downloading the 11 GB archive.

The archive (data.zip, 10,963,052,937 bytes) holds 156 CSV parts, about 25 GB uncompressed,
plus MATLAB copies of the same data. Most rows carry the label "null". This script:

1. Lists the remote zip with HTTP range requests (remotezip) and saves the listing.
2. Extracts the small metadata files (activity distribution, subject mapping, settings).
3. Streams each CSV part of each subject that has labels, decompresses it in memory and
   keeps only labelled rows (label not "null" or "unknown"), with the columns we use:
   row (index within the subject), Ax, Ay, Az (m/s^2), label, segment.
   The result is written gzipped to ml/data/raw/labelled/.

Subjects with only "null" labels are skipped. Network use is the compressed size of the
parts we stream; disk use is the filtered output (a few hundred MB).

Usage: uv run python -m equid_ml.fetch_subset [--workers 4] [--subjects Galoway,Happy]
"""

from __future__ import annotations

import argparse
import csv
import gzip
import io
import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from remotezip import RemoteZip

from equid_ml import RAW_DIR

URL = "https://data.4tu.nl/file/013cb2e2-e74a-4d55-8a9e-c3ea66806417/8674a9eb-73ca-43f6-abe6-ec50ddd7651f"
DOI = "10.4121/uuid:2e08745c-4178-4183-8551-f248c992cb14"
EXPECTED_ZIP_BYTES = 10_963_052_937

METADATA = ["csv/activity_distribution.csv", "csv/subject_mapping.csv", "csv/settings.csv"]
SKIP_LABELS = {"null", "unknown"}
PART_RE = re.compile(r"^csv/subject_(\d+)_(\w+?)_part_(\d+)\.csv$")
OUT_COLUMNS = ["row", "Ax", "Ay", "Az", "label", "segment"]
LABELLED_DIR = RAW_DIR / "labelled"


def list_parts(names: list[str]) -> dict[str, list[tuple[int, str]]]:
    """Map subject name to its CSV parts, sorted by part number."""
    parts: dict[str, list[tuple[int, str]]] = {}
    for n in names:
        m = PART_RE.match(n)
        if m:
            parts.setdefault(m.group(2), []).append((int(m.group(3)), n))
    for v in parts.values():
        v.sort()
    return parts


def labelled_subjects(distribution_csv: str) -> list[str]:
    """Subjects with at least one window labelled something other than null or unknown."""
    rows = list(csv.DictReader(io.StringIO(distribution_csv)))
    out = []
    for r in rows:
        name = r["Row"]
        if name == "total":
            continue
        n = 0.0
        for k, v in r.items():
            if k in ("Row", "null", "unknown", "total") or v in ("NaN", ""):
                continue
            n += float(v)
        if n > 0:
            out.append(name)
    return out


def filter_part(text_stream: io.TextIOBase, writer, row_offset: int) -> tuple[int, int, dict[str, int]]:
    """Copy labelled rows from one part. Returns (rows read, rows kept, rows per label)."""
    header = text_stream.readline().rstrip("\n").rstrip("\r").split(",")
    idx = {name: i for i, name in enumerate(header)}
    for col in ("Ax", "Ay", "Az", "label", "segment"):
        if col not in idx:
            raise RuntimeError(f"column {col} missing, header is {header}")
    ia, iy, iz, il, iseg = idx["Ax"], idx["Ay"], idx["Az"], idx["label"], idx["segment"]
    n = kept = 0
    per_label: dict[str, int] = {}
    for line in text_stream:
        row = row_offset + n
        n += 1
        # Cheap check first: most rows are "null".
        if ",null," in line or ",unknown," in line:
            continue
        f = line.rstrip("\n").rstrip("\r").split(",")
        label = f[il]
        if label in SKIP_LABELS:
            continue
        writer.writerow([row, f[ia], f[iy], f[iz], label, f[iseg]])
        kept += 1
        per_label[label] = per_label.get(label, 0) + 1
    return n, kept, per_label


def fetch_subject(name: str, parts: list[tuple[int, str]]) -> dict:
    out_path = LABELLED_DIR / f"{name}.csv.gz"
    done_path = LABELLED_DIR / f"{name}.json"
    if done_path.exists():
        return json.loads(done_path.read_text())
    t0 = time.time()
    tmp = out_path.with_suffix(".tmp")
    total = kept = 0
    per_label: dict[str, int] = {}
    with RemoteZip(URL) as z, gzip.open(tmp, "wt", newline="", compresslevel=6) as gz:
        w = csv.writer(gz)
        w.writerow(OUT_COLUMNS)
        for _, member in parts:
            with z.open(member) as raw:
                text = io.TextIOWrapper(raw, encoding="utf-8", newline="")
                n, k, pl = filter_part(text, w, total)
            total += n
            kept += k
            for lab, c in pl.items():
                per_label[lab] = per_label.get(lab, 0) + c
            print(f"  {member}: {n} rows, {k} labelled", flush=True)
    tmp.replace(out_path)
    summary = {
        "subject": name,
        "parts": [m for _, m in parts],
        "rows": total,
        "labelledRows": kept,
        "rowsPerLabel": dict(sorted(per_label.items())),
        "seconds": round(time.time() - t0, 1),
    }
    done_path.write_text(json.dumps(summary, indent=2))
    return summary


def fetch_subject_with_retry(name: str, parts: list[tuple[int, str]], attempts: int = 6) -> dict:
    """The server answers 503 when busy. Restart the subject from scratch after a pause."""
    for attempt in range(1, attempts + 1):
        try:
            return fetch_subject(name, parts)
        except Exception as e:  # noqa: BLE001, any network error is worth a retry
            if attempt == attempts:
                raise
            wait = 10 * attempt
            print(f"  {name}: attempt {attempt} failed ({e.__class__.__name__}: {e}), retry in {wait} s", flush=True)
            time.sleep(wait)
    raise AssertionError("unreachable")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--subjects", default="", help="comma separated subject names, default all labelled")
    args = ap.parse_args(argv)

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    LABELLED_DIR.mkdir(parents=True, exist_ok=True)

    for attempt in range(1, 7):
        try:
            with RemoteZip(URL) as z:
                infos = z.infolist()
                size = z.size()
                listing = [
                    {"name": i.filename, "bytes": i.file_size, "compressedBytes": i.compress_size}
                    for i in infos
                ]
                for m in METADATA:
                    (RAW_DIR / Path(m).name).write_bytes(z.read(m))
            break
        except Exception as e:  # noqa: BLE001
            if attempt == 6:
                raise
            print(f"listing failed ({e}), retry in {10 * attempt} s", flush=True)
            time.sleep(10 * attempt)
    if size != EXPECTED_ZIP_BYTES:
        print(f"warning: archive is {size} bytes, expected {EXPECTED_ZIP_BYTES}", file=sys.stderr)
    (RAW_DIR / "zip_listing.json").write_text(
        json.dumps({"url": URL, "doi": DOI, "archiveBytes": size, "members": listing}, indent=1)
    )

    parts = list_parts([m["name"] for m in listing])
    compressed = {m["name"]: m["compressedBytes"] for m in listing}
    wanted = labelled_subjects((RAW_DIR / "activity_distribution.csv").read_text())
    if args.subjects:
        wanted = [s for s in args.subjects.split(",") if s]
    print(f"labelled subjects: {', '.join(wanted)}")
    stream_bytes = sum(compressed[m] for s in wanted for _, m in parts[s])
    print(f"will stream {stream_bytes / 1e9:.2f} GB of compressed CSV parts")

    summaries = []
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(fetch_subject_with_retry, s, parts[s]): s for s in wanted}
        for fut in as_completed(futs):
            s = fut.result()
            s["compressedBytesStreamed"] = sum(compressed[m] for m in s["parts"])
            (LABELLED_DIR / f"{s['subject']}.json").write_text(json.dumps(s, indent=2))
            summaries.append(s)
            print(f"done {s['subject']}: {s['labelledRows']} labelled rows of {s['rows']}", flush=True)

    on_disk = sum(p.stat().st_size for p in RAW_DIR.rglob("*") if p.is_file())
    report = {
        "url": URL,
        "doi": DOI,
        "archiveBytes": size,
        "compressedBytesStreamed": sum(s["compressedBytesStreamed"] for s in summaries),
        "bytesOnDisk": on_disk,
        "subjects": sorted(summaries, key=lambda s: s["subject"]),
    }
    (RAW_DIR / "fetch_report.json").write_text(json.dumps(report, indent=2))
    print(f"streamed {report['compressedBytesStreamed'] / 1e9:.2f} GB, {on_disk / 1e6:.0f} MB on disk")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
