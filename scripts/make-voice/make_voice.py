"""Placeholder voices for the tag phrases, made with Meta MMS-TTS.

Run from the repo root:
    uv run --project scripts/make-voice python scripts/make-voice/make_voice.py

Reads the phrases from src/tag/strings.ts and writes small mono MP3 files to
public/audio/{en,am}/{water,check,urgent,not_sure}.mp3.

The MMS models are CC BY-NC 4.0. They download to the Hugging Face cache, never into the repo.
These files are placeholders until a native speaker records the phrases.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
from transformers import AutoTokenizer, VitsModel

ROOT = Path(__file__).resolve().parents[2]
STRINGS = ROOT / "src" / "tag" / "strings.ts"
OUT = ROOT / "public" / "audio"
MODELS = {"en": "facebook/mms-tts-eng", "am": "facebook/mms-tts-amh"}
PHRASES = ["water", "check", "urgent", "not_sure"]
SEED = 7


def read_phrases() -> dict[str, dict[str, str]]:
    text = STRINGS.read_text(encoding="utf-8")
    blocks = {
        "en": text[text.index("en: {") : text.index("am: {")],
        "am": text[text.index("am: {") :],
    }
    out: dict[str, dict[str, str]] = {}
    for lang, block in blocks.items():
        out[lang] = {}
        for key in PHRASES:
            m = re.search(rf"'tag\.phrase\.{key}':\s*'([^']*)'", block)
            if not m:
                sys.exit(f"Missing tag.phrase.{key} for {lang} in {STRINGS}")
            out[lang][key] = m.group(1)
    return out


def romanise(text: str) -> str:
    # MMS Amharic was trained on romanised text (tokenizer has is_uroman = true).
    import uroman

    return uroman.Uroman().romanize_string(text)


def synthesise(model: VitsModel, tokenizer, text: str) -> np.ndarray:
    torch.manual_seed(SEED)
    inputs = tokenizer(text, return_tensors="pt")
    with torch.no_grad():
        wave = model(**inputs).waveform[0].numpy()
    # Trim near-silence at both ends, pad 120 ms, peak-normalise to -1 dBFS.
    thresh = 0.02 * np.abs(wave).max()
    idx = np.where(np.abs(wave) > thresh)[0]
    if len(idx):
        wave = wave[max(0, idx[0] - 400) : idx[-1] + 400]
    sr = model.config.sampling_rate
    pad = np.zeros(int(0.12 * sr), dtype=wave.dtype)
    wave = np.concatenate([pad, wave, pad])
    return (wave / np.abs(wave).max() * 0.89).astype(np.float32)


def main() -> None:
    phrases = read_phrases()
    for lang, model_id in MODELS.items():
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        model = VitsModel.from_pretrained(model_id)
        model.eval()
        model.speaking_rate = 0.9
        model.noise_scale = 0.5
        sr = model.config.sampling_rate
        (OUT / lang).mkdir(parents=True, exist_ok=True)
        for key, text in phrases[lang].items():
            src = romanise(text) if getattr(tokenizer, "is_uroman", False) else text
            wave = synthesise(model, tokenizer, src)
            path = OUT / lang / f"{key}.mp3"
            sf.write(path, wave, sr, format="MP3", subtype="MPEG_LAYER_III", compression_level=0.6)
            secs = len(wave) / sr
            print(f"{lang}/{key}.mp3  {secs:.2f} s  {path.stat().st_size} B  input: {src}")


if __name__ == "__main__":
    main()
