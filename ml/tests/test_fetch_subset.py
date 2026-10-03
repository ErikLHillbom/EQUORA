import csv
import io

from equid_ml.fetch_subset import filter_part, labelled_subjects, list_parts

HEADER = "Ax,Ay,Az,Gx,Gy,Gz,Mx,My,Mz,A3D,G3D,M3D,label,segment,subject\n"


def row(label: str, seg: int = 7) -> str:
    return f"1.0,2.0,9.5,0,0,0,NaN,NaN,NaN,9.8,0,NaN,{label},{seg},3\n"


def test_filter_part_keeps_labelled_rows_with_global_row_index():
    text = io.StringIO(HEADER + row("null") + row("standing") + row("unknown") + row("grazing", 8))
    out = io.StringIO()
    n, kept, per_label = filter_part(text, csv.writer(out), row_offset=100)
    assert n == 4
    assert kept == 2
    assert per_label == {"standing": 1, "grazing": 1}
    lines = out.getvalue().strip().splitlines()
    assert lines[0] == "101,1.0,2.0,9.5,standing,7"
    assert lines[1] == "103,1.0,2.0,9.5,grazing,8"


def test_labelled_subjects_skips_null_only_horses():
    dist = "Row,null,standing,unknown,total\nA,10,5,1,16\nB,20,NaN,NaN,20\nC,3,NaN,4,7\ntotal,33,5,5,43\n"
    assert labelled_subjects(dist) == ["A"]


def test_list_parts_sorts_numerically():
    names = [
        "csv/subject_2_Happy_part_10.csv",
        "csv/subject_2_Happy_part_2.csv",
        "csv/subject_mapping.csv",
        "matlab/subject_2_Happy.mat",
    ]
    assert list_parts(names) == {
        "Happy": [(2, "csv/subject_2_Happy_part_2.csv"), (10, "csv/subject_2_Happy_part_10.csv")]
    }
