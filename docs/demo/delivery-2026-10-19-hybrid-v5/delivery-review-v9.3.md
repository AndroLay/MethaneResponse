# Local export review — v9.3

**Review date:** 2026-10-19  
**Export:** `delivery-output/story-v5/MethaneResponse-Hybrid-Presentation-Demo-4m50-v9.3-final.mp4`  
**SHA-256:** `5b76cdd7009b3b397ed0473ce079a87bebd08907b899803e9affc6ecf7b28157`

## Change made for the reported issue

The earlier cut showed the assessment dates already filled, so it did not prove how the analyst chose them. V9.3 replaces that section with a new recording of the running local application. It visibly selects the July 11, 2026 observation day, applies the single-day UTC scope, and runs the rules baseline. The corresponding close-ups now follow those actual pointer and click events. Dates are set by the application's “Use selected observation day” action; the video does not fake typing into the fields.

The page is positioned before the capture begins. Camera zooms use eased moves and settled holds, with no simultaneous page scrolling. Designed slides retain a locked camera. The cursor ring is a visible overlay driven by real browser pointer events because headless Chromium does not render the OS cursor.

## Technical verdict

The fresh local media audit report is `delivery-output/story-v5/review-v9.3-final-recheck/report.json`; requested cut samples are at 139.6, 148, and 171 seconds.

- Technical status: **pass**; all 18 declared checks passed.
- Full-file decode: pass.
- Video: H.264, 1920×1080, yuv420p, 25 fps, 290 seconds.
- Audio: AAC stereo, 48 kHz, 290 seconds; −18.08 LUFS integrated and −2.86 dBFS true peak.
- English SRT sidecar: `MethaneResponse-Hybrid-Presentation-Demo-4m50-v9.3-final.mp4.en.srt`.
- The renderer's hash-checked source is the local capture `audit-interaction-v9-3-final-source.webm`; its SHA-256 is `69dd7c5ce7da882371a9ee1cfe59c7959e498526055ce7d46c70c605b2369396`.

## Motion and framing inspection

The review used the final export's contact sheet, 44 audit samples, full-resolution stills, and a frame sequence from 139.6 to 170.6 seconds. This is selected visual inspection, not complete normal-speed playback.

| Timecode | Review focus | Observation |
|---|---|---|
| 02:19.60–02:20.80 | Transition from date-boundary explanation into the Evidence Auditor | The view settles on the selected case and scope form before close-ups begin. |
| 02:20.15–02:25.65 | Observation-day selection and scope application | The “Use selected observation day” control and the populated July 11 dates are legible; the cursor ring marks the real action. The “Apply assessment scope” click is shown separately. |
| 02:28.00–02:34.20 | Run rules baseline and read the result | The action is framed before the click; the captured application result, “Insufficient Reference Coverage,” is held and readable before the view pulls back. |
| 02:35.00–02:50.60 | Result context and exit | The result remains visible with its limits; no camera movement coincides with page scrolling. |

On these sampled transitions, the camera move follows a smooth eased zoom rather than the unmotivated drift that prompted the complaint. The inspected field, action button, and result remain inside the 1920×1080 frame. This evidence supports the repair in this segment; it does not establish that every shot in the five-minute film has ideal rhythm.

## Artistic coverage and limits

| Dimension | Status | Evidence and remaining limit |
|---|---|---|
| Story / product proof | **not_reviewed** | Selected frames confirm the real scope action and deterministic result. Full normal-speed playback is still needed to judge the complete narrative. |
| Composition / hierarchy | **pass for inspected segment** | The field/action/result close-ups and return to context are visible in sampled frames. Other chapters were not fully played back. |
| Choreography / continuity | **pass for inspected segment** | The selected-day and audit focus moves use eased in/hold/out timing; no scroll occurs during these moves. Full playback remains outstanding. |
| Tempo / readable holds | **not_reviewed** | Still and frame-sequence inspection cannot establish perceived pacing at normal speed. |
| Visual character / reference fit | **not_reviewed** | Reference videos were not re-watched for this revision; no parity claim is made. |
| Type / UI readability | **pass for inspected segment** | The selected observation date, Apply control, Run rules baseline, and outcome are readable in original-resolution frames. |
| Sound-motion integration | **not_reviewed** | Audio meters passed; exported audio was not listened to in this review. |
| Truth / rights / privacy | **not_reviewed** | The new footage is local app footage with a hash-checked capture manifest and no page errors. A complete rights review of every inherited asset was not repeated here. |
| Requested variants | **not_applicable** | This export is the requested 16:9 landscape master; no alternate aspect ratio was requested. |

The automated audit reports `creative_status: not_reviewed` and `delivery_ready: false`. The correct delivery state is **technically verified local draft**, pending full normal-speed playback, listening, and any required asset-rights review. The current check did not use a live AI provider, public blockchain receipt, or public data service.

## Artifact state

The MP4, SRT, capture, manifests, and audit report are local artifacts. Nothing was uploaded or published. Earlier v5–v9.2 exports and their documentation remain preserved. No application/backend source was changed for this video revision.
