# MethaneResponse — final presentation and demo v12

English presentation, real application footage, explanatory animation, a visible
cursor, stock synthetic neural narration and the existing original instrumental
score. This delivery is local. No deployment, source publication, video upload
or Notion import is performed.

## Watch

- Video: `delivery-output/story-v12/MethaneResponse-Final-Presentation-Demo-v12.mp4`
- Runtime: **267.92 seconds / 4:27.92**, 1920×1080, 25 fps.
- English captions: the matching `.mp4.en.srt` and an optional embedded subtitle
  track. Selectable captions leave the real form fields unobstructed by default.
- Editable English script: [story.json](story.json).
- Sequence, timecodes and animation intent: [storyboard.md](storyboard.md).
- Checks and remaining review limits: [review.md](review.md).
- Exact export results: [verification.json](verification.json).

The previous v11 export is preserved. Large media and generated timing, audio,
frame samples and technical reports remain in the ignored output directory.

## What this revision fixes

| Earlier weakness | Implemented change | Evidence |
|---|---|---|
| Product benefit arrived late | Start with an analyst's decision, then explain the product's practical help at about 7.68 seconds | Authored script, measured speech timing, opening frames |
| Repeated card grids and repeated application introductions | Use an analyst/document scene, open MARS path, uncertainty plot, calendar, actual result crop, before/after evidence request and report-fingerprint model; introduce the app through a shared window only once | 18-scene storyboard, transition regression, rendered frame samples |
| Too much technical vocabulary for a first-time viewer | Use “choose the date,” “more evidence needed,” “next request” and “digital fingerprint”; define hash once | Script regression and narration transcript |
| Important instructions were too small | Increase editorial action guides from 22 to 40 px, graph values from 30 to 44 px and dates from 23 to 32 px; use closer settled form views | Font-size/layout tests, actual rendered form frames |

Raw application metadata remains authentic and may require pausing. Enlarged
editorial guidance explains what to follow; it does not replace application
results. These changes do not establish universal phone readability or measured
audience comprehension.

## The story

**Question:** when a repair is reported, what should an analyst check?
**Context:** MARS detects major emissions, notifies stakeholders and follows up.
**Contribution:** inspect whether the available evidence supports a particular
claim. **Demonstration:** inspect KAZ_S_159, retain the dated estimates and their
uncertainty, identify the missing exact action date, run the rules baseline for
11 July 2026, save a specific local evidence request, export the report and test
the original/changed/original sequence in the actual application.

The opening company scenario is explicitly hypothetical. The following source
and observations are historical UNEP records. The rules result applies to the
material submitted in this local review. It neither contradicts UNEP's catalogue
nor establishes that mitigation failed. No live model assessment or Sepolia
receipt is shown. A matching hash establishes local consistency, not issuer
identity or physical repair. No operator is contacted by the saved request.

The governing [source and claim ledger](../delivery-2026-10-19-story-v4/03-Sources-and-Claims.md)
is retained. Graphics are explanatory models, not satellite imagery or observed
plumes. Brief catalogue metadata is paraphrased; the third-party report body is
not reproduced. User and climate impact remain unmeasured.

## Narration and timing

- 47 short English voice cues and 96 punctuation-aware caption groups.
- Stock `en-US-AvaMultilingualNeural` voice via `edge-tts` 7.3.1, rate −2%.
  The voice is synthetic; no person is cloned or impersonated.
- Maximum scheduled inter-cue gap: 2.97 s. Voice-only RMS quiet intervals are
  separately measured in the export verification.
- Word boundaries drive meaningful diagram reveals and editorial action guides.
- All eight genuine application shots retain their original action duration:
  **114 seconds** total, with no interaction speed-up.
- Smooth fractional camera coordinates, neutral camera during page scrolling,
  visible pointer and click rings are retained. Larger form views settle for
  reading. Most joins are direct cuts; four short dissolves connect explanations.
- Music ducks under speech and fades at the ending. Encoded audio is measured
  separately from the two-pass mix settings.

The measures above support timing and technical claims. Human-like delivery,
music balance, clarity for first-time viewers and overall artistic quality still
require normal-speed audiovisual review by a person.

## Reproduce

Prerequisites: Python 3 with Pillow/numpy, FFmpeg/ffprobe, the retained v10 capture
and manifest, the v4 original instrumental, and cached voice cues. Export commands
preserve earlier final files and refuse to overwrite an existing final MP4.

```bash
# From the repository root; cached synthesis needs no online speech service.
python3 docs/demo/delivery-2026-10-19-final-v12/narration.py --schedule-only
python3 docs/demo/delivery-2026-10-19-final-v12/captions.py
python3 docs/demo/delivery-2026-10-19-final-v12/test_timing.py
python3 docs/demo/delivery-2026-10-19-final-v12/finish.py
python3 docs/demo/delivery-2026-10-19-final-v12/render.py study
python3 docs/demo/delivery-2026-10-19-final-v12/render.py full
python3 docs/demo/delivery-2026-10-19-final-v12/verify.py
```

For new speech synthesis, install the small client into ignored runtime output:

```bash
uv pip install --target delivery-output/voice-runtime/edge-packages edge-tts==7.3.1
PYTHONPATH=delivery-output/voice-runtime/edge-packages \
  python3 docs/demo/delivery-2026-10-19-final-v12/narration.py
```

Only the public authored script is sent to the speech service. No API key, user
evidence, application state or captured document is sent. Preserve the cue cache and narration manifest
for this exact cut; future service synthesis may differ.

## Provenance

Capture: `delivery-output/story-v10/capture-master/actual-ui.webm`, SHA-256
`3de8dc98ffd4cb0e9aaf00f3a1b8838949cc84e7a04bce9257af3e0a0a4a2b98`.
The manifest binds KAZ_S_159, snapshot `unep-mars-675417694883`, local actions,
focus rectangles, pointer events and report digests. It records zero page errors
for that capture session; it is not a new full-application test of this revision.

`verification-summary.json`, `production-source-hashes.json`, narration/mix
manifests and the fresh technical report bind the current cut to its inputs.
The application source, frozen evidence packages and older exports are preserved.
