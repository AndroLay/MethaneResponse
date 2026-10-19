# Local delivery review — presentation v8

## Artifact

- File: `MethaneResponse-Hybrid-Presentation-Demo-4m50-v8-final.mp4`
- Runtime: 290 seconds (4:50)
- Frame: 1920×1080, 30 fps, H.264 / yuv420p
- Audio: AAC, stereo, 48 kHz
- SHA-256: `62b78bfcb9a5280f51fdd5d6b87718826d2e94c00042e21177e5624a41376d7c`
- English captions: `MethaneResponse-Hybrid-Presentation-Demo-4m50-v8-final.mp4.en.srt`

## Technical verification

The local media audit passed all declared checks, including full decode, exact duration, frame size/rate, audio presence/format, integrated loudness, and true peak. Measured audio was −18.08 LUFS integrated and −2.86 dBFS true peak. The delivery contract is [delivery-spec-v8.json](delivery-spec-v8.json); machine-readable results are in the ignored local output at `delivery-output/story-v5/review-v8-final-audit/report.json`.

## Motion and framing spot checks

The current export's contact sheet and selected full-resolution frames were inspected. The following are frame-sequence checks, not a normal-speed playback verdict:

| Timecode | Review focus | Observation |
|---|---|---|
| 01:19.70–01:20.00 | Explanation → recorded app | Directional reveal completes into the application without adding content over the interface. |
| 01:45.20–01:52.00 | Historical observations | Camera moves toward the timeline and returns; all three dated points, endpoint dates, and uncertainty bars remain in view. |
| 02:31.20–02:38.00 | Evidence Auditor | The amber insufficient-coverage result becomes readable, then the full assessment context returns. |
| 03:34.30–03:38.80 | Exported report | Focus settles on the green local digest-check result, then returns to the Reports workspace. |
| 03:49.80–03:57.20 | Altered report | Focus enlarges the actual red SHA-256 mismatch message, then restores the report history around it. |

The designed observation chart uses separate points and uncertainty bars. Its dashed pulse ring highlights the latest dated observation; no line connects the estimates. Application zooms use the recorded screen capture and preserve the visible cursor.

## Review limits

- Full 4:50 normal-speed playback and listening were not completed in this review. Motion rhythm, perceived voice naturalness, music balance in context, and sound-to-motion sync therefore remain `not_reviewed`.
- The narration is synthetic Kokoro `af_heart`; no human voice recording is included.
- The UI is recorded local preview footage, not a live service session. The audit result is a deterministic rules baseline scoped to the selected bundle. The report check is local digest verification, not a public blockchain receipt or proof of physical mitigation.
- Reference videos were not fully assessed for this revision; no claim of matching them is made.
- The technical helper reports `creative_status: not_reviewed` and `delivery_ready: false`. Treat this as a technically verified local draft pending a full human playback/listening review, not a final publication approval.

## Reproduction

Run `node docs/demo/delivery-2026-10-19-hybrid-v5/render-hybrid-v8.mjs full` from the repository root. The renderer refuses to overwrite existing outputs. Render inputs, previous v5–v7 exports, and the first v8 attempt remain preserved. No video was uploaded or published.
