#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10,<3.14"
# dependencies = ["kokoro-onnx==0.6.1", "numpy>=2.0.2", "soundfile==0.13.1"]
# ///
"""Render a timed English demo narration locally with the Kokoro ONNX voice model."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def load_segments(path: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload.get("schemaVersion") != 1 or payload.get("syntheticVoice") is not True:
        raise ValueError("Narration JSON must use schemaVersion 1 and declare a synthetic voice.")
    duration_seconds = payload.get("durationSeconds", 240)
    if not isinstance(duration_seconds, int) or not 180 <= duration_seconds <= 300:
        raise ValueError("Narration durationSeconds must be an integer between 180 and 300 seconds.")
    segments = payload.get("segments")
    if not isinstance(segments, list) or not segments:
        raise ValueError("Narration JSON must contain at least one segment.")

    previous_end = 0.0
    for index, segment in enumerate(segments, start=1):
        start = segment.get("startSeconds")
        end = segment.get("endSeconds")
        text = segment.get("text")
        if not isinstance(start, (int, float)) or not isinstance(end, (int, float)) or not isinstance(text, str) or not text.strip():
            raise ValueError(f"Narration segment {index} is missing valid start, end, or text.")
        if start < previous_end or end <= start or end > duration_seconds:
            raise ValueError(f"Narration segment {index} has an invalid or overlapping time window.")
        previous_end = float(end)
    return payload, segments


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--script", type=Path, required=True, help="Timed narration JSON file")
    parser.add_argument("--model", type=Path, required=True, help="Kokoro ONNX model file")
    parser.add_argument("--voices", type=Path, required=True, help="Kokoro voice pack file")
    parser.add_argument("--output", type=Path, required=True, help="Destination timed PCM WAV")
    parser.add_argument("--base-speed", type=float, default=1.0)
    parser.add_argument("--max-fit-speed", type=float, default=1.12)
    parser.add_argument("--lead-in", type=float, default=0.45, help="Seconds after each scene marker before speech begins")
    args = parser.parse_args()

    payload, segments = load_segments(args.script)
    duration_seconds = int(payload.get("durationSeconds", 240))
    for file in (args.script, args.model, args.voices):
        if not file.is_file():
            raise FileNotFoundError(file)
    if args.base_speed <= 0 or args.max_fit_speed < args.base_speed or args.lead_in < 0:
        raise ValueError("Speech speeds and lead-in must be positive and ordered.")

    tts = Kokoro(str(args.model), str(args.voices))
    voice_id = str(payload.get("voiceId", "af_sarah"))
    language = str(payload.get("language", "en-US")).lower()
    if language != "en-us":
        raise ValueError("This narration script is authored for the en-US voice pack.")

    generated: list[tuple[int, np.ndarray, dict[str, Any]]] = []
    used_speeds: list[float] = []
    sample_rate: int | None = None
    total_speech_seconds = 0.0

    for index, segment in enumerate(segments, start=1):
        start = float(segment["startSeconds"])
        end = float(segment["endSeconds"])
        available_seconds = end - start - args.lead_in - 0.35
        if available_seconds <= 0:
            raise ValueError(f"Narration segment {index} leaves no time for speech after its lead-in.")

        audio, rate = tts.create(segment["text"], voice=voice_id, speed=args.base_speed, lang=language)
        samples = np.asarray(audio, dtype=np.float32).reshape(-1)
        duration = len(samples) / rate
        speed = args.base_speed
        if duration > available_seconds:
            speed = args.base_speed * duration / available_seconds * 1.015
            if speed > args.max_fit_speed:
                raise ValueError(
                    f"Segment {index} needs speed {speed:.3f}, above --max-fit-speed {args.max_fit_speed:.2f}; shorten its text or widen its scene."
                )
            audio, rate = tts.create(segment["text"], voice=voice_id, speed=speed, lang=language)
            samples = np.asarray(audio, dtype=np.float32).reshape(-1)
            duration = len(samples) / rate
            if duration > available_seconds + 0.08:
                raise ValueError(f"Segment {index} remains too long after a bounded speed adjustment ({duration:.2f}s).")

        if sample_rate is not None and rate != sample_rate:
            raise ValueError("Kokoro returned inconsistent sample rates between segments.")
        sample_rate = rate
        start_sample = round((start + args.lead_in) * rate)
        end_sample = start_sample + len(samples)
        if end_sample > duration_seconds * rate:
            raise ValueError(f"Segment {index} extends beyond the narration track.")

        fade_in = min(round(rate * 0.035), len(samples) // 4)
        fade_out = min(round(rate * 0.08), len(samples) // 4)
        if fade_in:
            samples[:fade_in] *= np.linspace(0.0, 1.0, fade_in, dtype=np.float32)
        if fade_out:
            samples[-fade_out:] *= np.linspace(1.0, 0.0, fade_out, dtype=np.float32)
        if not np.isfinite(samples).all():
            raise ValueError(f"Segment {index} contains non-finite audio samples.")

        generated.append((start_sample, samples, {"index": index, "startSeconds": start + args.lead_in, "endSeconds": start + args.lead_in + duration, "durationSeconds": duration, "speed": speed, "words": len(segment["text"].split())}))
        used_speeds.append(speed)
        total_speech_seconds += duration

    assert sample_rate is not None
    track = np.zeros(duration_seconds * sample_rate, dtype=np.float32)
    for start_sample, samples, _metadata in generated:
        track[start_sample : start_sample + len(samples)] += samples

    args.output.parent.mkdir(parents=True, exist_ok=True)
    sf.write(args.output, track, sample_rate, subtype="PCM_16")
    manifest_path = args.output.with_suffix(".manifest.json")
    manifest = {
        "schemaVersion": 1,
        "generatedBy": "scripts/generate-demo-narration.py",
        "voiceModel": payload["voiceModel"],
        "voiceId": voice_id,
        "voiceIsSynthetic": True,
        "language": payload["language"],
        "sampleRate": sample_rate,
        "durationSeconds": duration_seconds,
        "speechDurationSeconds": round(total_speech_seconds, 3),
        "scriptSha256": sha256(args.script),
        "outputSha256": sha256(args.output),
        "segments": [metadata for _start, _samples, metadata in generated],
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "narration-rendered", "output": str(args.output), "sampleRate": sample_rate, "durationSeconds": duration_seconds, "speechDurationSeconds": round(total_speech_seconds, 3), "segments": len(generated), "speedRange": [round(min(used_speeds), 3), round(max(used_speeds), 3)], "sha256": manifest["outputSha256"]}))


if __name__ == "__main__":
    main()
