# v15 export review — 21 October 2026

**Local MP4 delivered; technical acceptance PASS. Not uploaded.**

File: `delivery-output/final-v15-TAKE01/MethaneResponse-Final-Submission-v15.mp4`

SHA-256: `c23e05776f8094c249364481e6b2304f4e9ecf7eb5251be46bc2bfde318df408`.

## Actual checks

- 280.000 seconds, 1920×1080 H.264/yuv420p, exactly 7,000 frames at 25 fps.
  Every decoded video timestamp advances 0.040 seconds. Full decode passed.
- AAC stereo 48 kHz; integrated loudness −18.03 LUFS, true peak −2.01 dBFS.
- Male stock synthetic Andrew voice. Pitch-preserving bounded timing fit;
  maximum measured quiet interval in narration is **0.80 seconds**, using
  10 ms RMS below −42 dBFS. Original instrumental bed covers the whole film
  and is ducked under narration.
- English subtitles are burned in; embedded subtitle text matches the sidecar.
- 18/18 declared technical checks passed; eight production regressions passed.
- Actual Chromium capture: both takes passed the connected workflow. Main
  TKM proof binds take2 only; local Anvil conformance passed 34 assertions.
- All 340 source hashes and 57 artifact hashes in the pre-video acceptance
  manifest still match. Frozen r12 and the existing acceptance evidence remain
  unchanged. No new research episode or paid model run was performed.

## Visual inspection actually performed

Native frame inspection covered planner input 10/20, allocation callout,
historical globe/location context, source/UTC claim scope, actual KAZ exact
quotation, request text, frozen decision digest, revisit and tamper rejection.
The first smoke edit exposed clipping of the capacity input: camera focus was
moved left. A timing defect in FFmpeg trim was fixed before full rendering.

One later refinement changed only the request clip entry: start at the evidence
fields, rather than 6.5 seconds later. Source-diff validation preserved the nine
other encoded scenes byte-for-byte. The first master/source and the incremental
edit manifest remain available. The final request frame now shows the actual
evidence-to-request text while that request is narrated.

The actual final MP4 was sampled before/during/after all nine section joins:
45 native PNGs plus the audit contact sheet. The short dip to the common
background and persistent chapter header are intentional; a frame at the exact
join is not a missing scene. Camera focus regions remain fixed during reading
holds, with smooth approach/return curves. No fake cursor is drawn on the
archival AI still. Opening/closing and intermediate native frames were inspected.

**This is sampled visual review and automated audio measurement, not a claim of
watching the entire film at normal speed or listening to it.** Audio input is
unavailable to this agent. Voice naturalness, pronunciation and subjective music
balance need a normal-speed human playback before publication. The audit helper
therefore retains `creative_status: not_reviewed` and `delivery_ready: false`;
those fields have not been changed into an unsupported approval.

## Content boundaries

- TKM_S_021, historical MARS snapshot and source-specific DEMO claim stay
  consistent through allocation, review, export, revisit and local proof.
- Global catalog crop is fresh take1 geographical context, not a KAZ/TKM audit.
- KAZ_S_159 is visibly a separate retained DeepSeek integration, using a
  project-authored DEMO excerpt; it is not a live TKM model request.
- TKM reviewer/response material is software DEMO, not an operator report,
  domain-expert review or a participant in a human pilot.
- Anvil 31337 is local. The disabled browser Anchor button is not clicked in
  the film; the exact downloaded decision is replayed in an isolated backend.
- Response ≠ repair, absent observation ≠ zero emissions, receipt ≠ physical
  truth. No productivity or climate impact is invented. Frozen r12 completion
  stays **0/48**, explicitly bounded in the closing scene.
- MARS dataset credit/license, original score and synthetic voice attribution
  are embedded in MP4 metadata and provided in `CREDITS.txt` for upload captions.

## Publication state

No video upload, Git push, Render update or public blockchain transaction was
performed in this production. Use the local MP4, its SRT and credits. Review it
with sound, then publish only through an authorized destination. The original
pre-production handoff remains an archive, not the current delivery status.
