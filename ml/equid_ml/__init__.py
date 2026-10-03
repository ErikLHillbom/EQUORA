"""Equid Sentinel activity classifier: data fetch, training, evaluation and export."""

from pathlib import Path

ML_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = ML_ROOT.parent
RAW_DIR = ML_ROOT / "data" / "raw"
INTERIM_DIR = ML_ROOT / "data" / "interim"
EXPORT_DIR = ML_ROOT / "export"
MODELS_DIR = REPO_ROOT / "public" / "models"

LABELS = ["stand", "walk", "trot", "eat", "roll"]
