# MethaneResponse — final presentation/demo cut v11

This is a local video delivery, with an English presentation, actual application
footage, a visible cursor, original explanatory animation, stock synthetic neural
narration, and the existing original instrumental score. It does not publish the
application or upload the video. No Notion import is required.

## Open the current cut

- Video: `delivery-output/story-v11/MethaneResponse-Final-Presentation-Demo-v11.mp4`
- English captions: the matching `.mp4.en.srt`, and an optional embedded English
  subtitle track. Captions are selectable so they do not cover form fields or
  scientific labels by default.
- Runtime: **248.48 seconds / 4:08.48**, 1920×1080, 25 fps.
- Editable script: [story.json](story.json).
- Generated timing, audio, checks and media remain in the ignored output folder.
- Verification and review: [review.md](review.md).
- Actual test/export results: [verification.json](verification.json).

## The story

**Why:** methane is important to climate, and a reported response needs traceable
evidence. **What:** MethaneResponse complements MARS with a scoped review of the
available references. **How:** inspect KAZ_S_159, compare uncertain dated
observations, apply a UTC-day scope, run the rules baseline, record the missing
evidence request, export a report and test its integrity. **Proof:** the actual
application accepts the original, rejects a changed hashed reason, and accepts
the untouched original again. **Value:** a reproducible next investigation step.

See [storyboard.md](storyboard.md) for timecodes and reading/action holds.
The governing [source and claim ledger](../delivery-2026-10-19-story-v4/03-Sources-and-Claims.md)
is retained. MARS feedback, an absent later plume, and matching hashes do not
establish physical repair. No live LLM or Sepolia receipt is represented here.

## What changed from v10

- New conversational neural voice, `en-US-AvaMultilingualNeural`, with contractions
  and short instructions. It is **synthetic**, with no cloned or impersonated voice.
- 48 voice cues replace twelve long narration blocks. Each cue has generated
  word boundaries, explicit audio provenance and reproducible cached input hashes.
- The longest inter-cue gap is 2.91 s, down from 15.25 s in the v4 narration used
  by v10. A separate 10 ms RMS measurement finds 3.05 s of maximum actual quiet
  in the new voice-only track at the documented -42 dBFS threshold.
- Presentation duration follows spoken duration. Real UI action time is preserved
  across all eight app shots (114 seconds); interactions are not sped up.
- Important model reveals follow spoken numbers and dates. The warming figure
  fades in as `~30%`, with no transient animated `0%` reading.
- Action guides follow the spoken cue. The audit result is explained after it
  appears. Actual pointer movements, fractional camera paths, reading holds and
  shared-window transitions are preserved.
- Captions are an actual word-timed transcript, with unique sequential indices;
  the former broad scene captions are not reused.
- Music ducks under speech and fades at the new ending. The mix is normalized
  in two passes; the actual encoded export is measured separately.

These are source and technical findings. They do not establish that every viewer
will consider the voice human or the film artistically final; full normal-speed
playback and listening remain a distinct review gate.

## Reproduce

Prerequisites: Python 3 with Pillow/numpy, system FFmpeg/ffprobe, the retained
v10 capture and its manifest, and the original v4 instrumental. Existing output
files are preserved. Rendering refuses to overwrite the final MP4.

```bash
# Run from the repository root. Install the small speech client separately.
uv pip install --target delivery-output/voice-runtime/edge-packages --no-deps edge-tts==7.3.1
PYTHONPATH=delivery-output/voice-runtime/edge-packages \
  python3 docs/demo/delivery-2026-10-19-final-v11/narration.py
# With cached cues, no network or speech client is needed:
python3 docs/demo/delivery-2026-10-19-final-v11/narration.py --schedule-only
python3 docs/demo/delivery-2026-10-19-final-v11/captions.py
python3 docs/demo/delivery-2026-10-19-final-v11/test_timing.py
python3 docs/demo/delivery-2026-10-19-final-v11/finish.py
python3 docs/demo/delivery-2026-10-19-final-v11/render.py study
python3 docs/demo/delivery-2026-10-19-final-v11/render.py full
python3 docs/demo/delivery-2026-10-19-final-v11/verify.py
```

Speech generation submits **only the public authored script** to the online Edge
speech service through [edge-tts](https://github.com/rany2/edge-tts), version 7.3.1.
Its client is installed in ignored runtime output, not vendored into application
source. The narrator is a Microsoft stock neural voice. No API key, user evidence,
app state or captured document is sent. Re-synthesis needs service availability;
cached synthesis and the finished audio are reproducible offline. Voice delivery
may vary if the service changes. Keep `narration-manifest.json` and cue cache for
the exact export rather than treating a later regeneration as identical.

An attempted open local-model download was stopped when the small neural-client
path succeeded. The incomplete model and isolated dependency attempt are not
inputs to this cut, nor a requirement for reproducing cached audio.

## Provenance and scope

The raw source remains `delivery-output/story-v10/capture-master/actual-ui.webm`.
Its SHA-256 is
`3de8dc98ffd4cb0e9aaf00f3a1b8838949cc84e7a04bce9257af3e0a0a4a2b98`.
`capture.json` records the temporary local UI session, source/snapshot, actions,
focus coordinates, pointer events, report fingerprints and zero page errors.
Sync slates are excluded from the film. Model graphics are original diagrams,
not satellite evidence. No source report body is reproduced. Dataset and
catalogue attribution/limitations remain in the source ledger.

Output manifests bind script, narration, capture and final film hashes. The
frozen application evidence packages and all older exports are preserved.
