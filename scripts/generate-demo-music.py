#!/usr/bin/env python3
"""Create a deterministic, original, voice-free ambient score for the demo."""

from __future__ import annotations

import math
import sys
import wave
from pathlib import Path

import numpy as np


SAMPLE_RATE = 48_000
DURATION_SECONDS = 240
CHORD_SECONDS = 12
BLOCK_SECONDS = 4

# D major / B minor / G major / A suspended, voiced as soft ninth chords.
CHORDS = (
    (73.416, 110.000, 138.591, 164.814, 185.000),  # D2 A2 C#3 E3 F#3
    (61.735, 92.499, 110.000, 138.591, 164.814),
    (98.000, 146.832, 185.000, 220.000, 293.665),
    (110.000, 164.814, 207.652, 246.942, 329.628),
    (73.416, 110.000, 146.832, 164.814, 220.000),
    (61.735, 92.499, 123.471, 138.591, 185.000),
    (98.000, 146.832, 196.000, 220.000, 293.665),
    (110.000, 164.814, 220.000, 246.942, 329.628),
)
PLUCKS = (293.665, 369.994, 440.000, 493.883, 554.365, 440.000, 369.994, 329.628)


def smoothstep(x: np.ndarray) -> np.ndarray:
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3.0 - 2.0 * x)


def render_block(start_sample: int, count: int, duration_seconds: int) -> np.ndarray:
    indices = np.arange(start_sample, start_sample + count, dtype=np.float64)
    times = indices / SAMPLE_RATE
    chord_number = np.floor(times / CHORD_SECONDS).astype(np.int64) % len(CHORDS)
    chord_position = np.mod(times, CHORD_SECONDS)
    crossfade = smoothstep((chord_position - (CHORD_SECONDS - 1.5)) / 1.5)

    left = np.zeros(count, dtype=np.float64)
    right = np.zeros(count, dtype=np.float64)
    for chord_index, notes in enumerate(CHORDS):
        active = chord_number == chord_index
        next_active = (chord_number == chord_index) & (crossfade > 0)
        current_weight = np.where(active, 1.0 - crossfade, 0.0)
        next_index = (chord_index - 1) % len(CHORDS)
        next_weight = np.where((chord_number == next_index) & (crossfade > 0), crossfade, 0.0)
        weight = current_weight + next_weight
        if not np.any(weight):
            continue
        # Chord index is selected by time; this branch contributes the current chord.
        current_weight = np.where(active, 1.0 - crossfade, 0.0)
        for voice, frequency in enumerate(notes):
            phase = 2.0 * math.pi * frequency * times + voice * 0.41 + chord_index * 0.23
            voice_wave = np.sin(phase) + 0.13 * np.sin(2.0 * phase + 0.17)
            left += voice_wave * current_weight * 0.026
            right += (np.sin(phase + 0.025) + 0.13 * np.sin(2.0 * phase + 0.19)) * current_weight * 0.026

    # Add the following chord for a short equal-power-like crossfade at each boundary.
    for chord_index, notes in enumerate(CHORDS):
        active = chord_number == chord_index
        blend = np.where(active, crossfade, 0.0)
        if not np.any(blend):
            continue
        following = CHORDS[(chord_index + 1) % len(CHORDS)]
        for voice, frequency in enumerate(following):
            phase = 2.0 * math.pi * frequency * times + voice * 0.41 + (chord_index + 1) * 0.23
            voice_wave = np.sin(phase) + 0.13 * np.sin(2.0 * phase + 0.17)
            left += voice_wave * blend * 0.026
            right += (np.sin(phase + 0.025) + 0.13 * np.sin(2.0 * phase + 0.19)) * blend * 0.026

    # Sparse bell-like notes add movement without percussion or voice.
    beat_seconds = 2.4
    beat_position = np.mod(times, beat_seconds)
    beat_index = np.floor(times / beat_seconds).astype(np.int64)
    pluck_frequency = np.asarray(PLUCKS, dtype=np.float64)[beat_index % len(PLUCKS)]
    pluck_envelope = np.exp(-beat_position / 0.46)
    pluck_phase = 2.0 * math.pi * pluck_frequency * beat_position
    pluck = (np.sin(pluck_phase) + 0.24 * np.sin(2.0 * pluck_phase)) * pluck_envelope * 0.065
    left += pluck
    right += pluck * 0.76

    bass_frequency = np.asarray((36.708, 30.868, 49.000, 55.000, 36.708, 30.868, 49.000, 55.000))[chord_number]
    bass_phase = 2.0 * math.pi * bass_frequency * times
    bass = np.sin(bass_phase) * 0.035
    left += bass
    right += bass * 0.96

    fade_in = np.clip(times / 3.0, 0.0, 1.0)
    fade_out = np.clip((duration_seconds - times) / 6.0, 0.0, 1.0)
    envelope = fade_in * fade_out
    stereo = np.column_stack((left * envelope, right * envelope)) * 0.72
    return np.clip(stereo, -0.88, 0.88)


def generate(destination: Path, duration_seconds: int = DURATION_SECONDS) -> None:
    if not 180 <= duration_seconds <= 300:
        raise ValueError("Demo music duration must be between 180 and 300 seconds.")
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        raise FileExistsError(f"Refusing to overwrite existing music file: {destination}")
    frame_count = SAMPLE_RATE * duration_seconds
    with destination.open("xb") as raw_file:
        with wave.open(raw_file, "wb") as output:
            output.setnchannels(2)
            output.setsampwidth(2)
            output.setframerate(SAMPLE_RATE)
            for start in range(0, frame_count, SAMPLE_RATE * BLOCK_SECONDS):
                count = min(SAMPLE_RATE * BLOCK_SECONDS, frame_count - start)
                block = render_block(start, count, duration_seconds)
                pcm = np.rint(block * 32767).astype("<i2")
                output.writeframesraw(pcm.tobytes())
    with wave.open(str(destination), "rb") as rendered:
        if rendered.getnframes() != frame_count or rendered.getframerate() != SAMPLE_RATE or rendered.getnchannels() != 2:
            destination.unlink(missing_ok=True)
            raise RuntimeError(f"Generated soundtrack metadata does not match {duration_seconds} seconds of stereo 48 kHz PCM.")


if __name__ == "__main__":
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/MethaneResponse-delivery-2026-10-18/original-instrumental.wav")
    duration = int(sys.argv[2]) if len(sys.argv) > 2 else DURATION_SECONDS
    generate(target, duration)
    print(f"Original instrumental generated: {target} · {duration}s · stereo {SAMPLE_RATE} Hz")
