# v18 — From investigation to potential climate impact

Focused local edit of v17: a stronger methane opening, ordinary-language workflow outputs and an explicit pathway to conditional field follow-up. No achieved emissions reduction or human productivity improvement is claimed.

## Revised picture

| Time | Revision |
|---|---|
| 00:11–00:22 | Detection is a starting point, not proof of repair; a response still needs evidence. |
| 02:33–03:04 | MISSING EVIDENCE → ACTION REQUIRED → REVIEWABLE DECISION. Labels sit above the application viewport. |
| 03:04–03:27 | A new response opens review while the previous decision is preserved. |
| 03:27–04:06 | Existing v17 TKM export, Anvil local receipt and trusted digest retained. |
| 04:06–04:23 | New animated pathway: UNEP MARS observations → priorities/requests → organizational field work → comparable post-action measurements. The last two stages are not demonstrated outcomes. |
| 04:23–04:57 | Original outputs, evaluation limitations and closing CTA. |

Delivery contract: **297 seconds (4:57), 1920×1080, 25fps**, English burned-in captions and stock synthetic male Andrew narration. The [official rules](https://ieee-climatechain-hack.devpost.com/rules), checked 22 October 2026, specify a 3–5 minute demo and ask the presentation to communicate the climate problem, solution and potential real-world environmental impact. No numerical judging score is inferred from that page.

## Continuity and limits

- Source: `delivery-output/final-v17/MethaneResponse-Final-Submission-v17.mp4`, SHA-256 `e0764396ca1ec16e458396f037c09e3de36b3cd39b91d4bde4f2a3059171f57c`.
- TKM_S_021 remains the primary historical case. KAZ_S_159 remains a separate archived AI DEMO. There is no new assessment model call or blockchain transaction.
- Actual UI geometry, timing and cursor movement are reused. Labels replace the editorial 1664×70 header at (128,116), above the viewport beginning at y188. They do not cover the fields or cursor.
- The new diagram is editorial explanation, not application footage, a sensor result or evidence of field repairs.
- The closing replaces its old 18-frame entry with an 18-frame hold and corrected captions, avoiding a return to the blockchain screen between the diagram and outro. Actual UI interactions are retained.
- Entry and exit of the impact diagram use the established narrow feathered reveal, avoiding a full-screen dissolve between two text screens. A regression limits the partially mixed edge to 96 pixels. The first export with overlapping text is retained under `delivery-output/final-v18/first-cut/` as a rejected edit, not the final deliverable.
- The progress strip is recalculated for 297 seconds. The MP4 has no selectable subtitle stream that could duplicate burned-in captions.
- The procedural score is extended using the same composition and a later fade. Its first 284 seconds are compared with the existing score before the original fade.
- Two new speech cues are used. Three short public-script candidates were synthesized during timing refinement. Only authored public text is sent to the existing free stock-voice service. The voice is synthetic and not cloned. Other narration samples remain unchanged, including the AI and blockchain explanation.
- Frozen r12 remains 0/48 under its original scorer. No field outcome, productivity gain or institutional pilot is claimed.

## Reproduce with installed tools

```bash
PYTHONPATH=delivery-output/voice-runtime/edge-packages python3 docs/demo/delivery-2026-10-22-final-v18/pipeline.py prepare --cached
python3 docs/demo/delivery-2026-10-22-final-v18/pipeline.py assets
python3 docs/demo/delivery-2026-10-22-final-v18/pipeline.py mix
python3 docs/demo/delivery-2026-10-22-final-v18/test_revision.py
python3 docs/demo/delivery-2026-10-22-final-v18/pipeline.py assemble
python3 docs/demo/delivery-2026-10-22-final-v18/verify.py
```

The final MP4 and audit directory reject accidental replacement. Use fresh output paths for later edits. `prepare --cached` makes no network synthesis request. A local MP4 is not an upload or deployment.

## Validation scope

The 12 new regressions check source preservation, duration, narrative boundaries, narrow transition blending, banner geometry, unchanged main narration, separate AI/Anvil narration, caption chronology, bounded speech timing, chapter continuity and frozen research. The 22 retained v17 motion regressions are also rerun. Final verification audits the encoded MP4 and compares six viewport samples against v17 for camera/cursor continuity. Meters and sampled frames do not establish complete normal-speed playback and listening; those remain separately unreviewed.

## Actual exported result — 22 October 2026

Local MP4: `delivery-output/final-v18/MethaneResponse-Final-Submission-v18.mp4`.

- SHA-256: `b14bc61f893176631c8ce15445217ea1ab4977e52a1c252b81d2e661b4006fad`.
- 56,450,949 bytes; exactly 297 seconds; 1920×1080, H.264, 25fps and 7,425 frames with contiguous 40ms timestamps.
- 18/18 technical checks pass, including full decode. Audio measures −18.02 LUFS and −2.00 dBTP, stereo 48kHz.
- 12/12 revision regressions and 22/22 retained motion/evidence regressions pass. No application source changes are introduced by this edit.
- Six actual encoded viewport comparisons with v17 have RGB RMSE 0.65–1.36/255, consistent with bounded re-encoding loss. This is sampled continuity evidence, not a measurement of subjective camera smoothness.
- 39 additional action/transition frames were extracted. The contact sheet and native frames at 02:44.64, 04:06.36, 04:20.00 and 04:22.64 were inspected: the action banner is above the fields, the cursor remains visible, the impact diagram distinguishes demonstrated inputs/workflow from conditional field outcomes, and transition mixing is confined to a narrow moving edge.
- Maximum measured narration quiet interval is 0.80s under the documented 10ms RMS threshold. This is a signal measurement, not a listening judgment.
- 340 acceptance-bound source hashes and 57 artifact hashes remain unchanged. Frozen r12 remains 0/48; no productivity or emissions outcome is inferred.
- Eleven chapters; burned-in English captions; no selectable subtitle stream. A platform may still add its own captions after upload.

Verification command completed with exit 0. Machine-readable evidence is in
[`verification-summary.json`](../../evidence/video-v18-2026-10-22/verification-summary.json)
and [`technical-video-audit.json`](../../evidence/video-v18-2026-10-22/technical-video-audit.json).
Samples and the rejected first export remain local in `delivery-output/final-v18/`.

**Review boundary:** technically verified local export with sampled visual inspection.
Complete normal-speed playback and actual audio listening remain `not_reviewed`;
the automated audit intentionally does not certify artistic readiness. No upload,
push, deployment, assessment-provider request or public transaction was performed.
