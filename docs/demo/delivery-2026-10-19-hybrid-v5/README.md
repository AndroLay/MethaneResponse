# MethaneResponse — Hybrid Presentation Demo v9.3

This is the presentation-style demo for the IEEE ClimateChain entry. It combines motion-designed explanation with actual MethaneResponse footage: why methane evidence matters, what UNEP MARS already does, what MethaneResponse adds, and an interactive review of the historical KAZ_S_159 case. It is paced as a short documentary-style product presentation, rather than a static slide deck or an uninterrupted screen recording.

## What changes in v9.3

V9.3 preserves v9.2's locked slide camera, progressive diagram builds, uncertainty-point plot, short dissolves, and native 25 fps cadence. It replaces the previously static, already-filled date-form section with a fresh capture of the local application workflow. The on-screen analyst loads the historical observation period, selects the July 11, 2026 observation event, applies that one-day UTC scope, and runs the rules baseline. Smooth close-ups now follow those actual controls and the resulting “Insufficient Reference Coverage” state.

The page is scrolled into position before recording starts; it no longer moves while the camera closes in. A small cursor marker follows real browser pointer and click events because headless Chromium does not render an operating-system cursor. The marker is an overlay only; all selections, scope validation, and the result come from the running application. No text entry, evidence, result, or satellite measurement is fabricated. The result receives a readable hold before the view pulls back.

## Production status

- Reference samples were inspected visually at the opening, middle, and near the end. Audio and full playback of those references were not assessed.
- **Higgsfield is unavailable in this session:** there is no connected Higgsfield tool or account path. No Higgsfield generation is claimed.
- HyperFrames CLI and Higgsfield are unavailable here. No remote generation is claimed. The fallback is a local HTML/CSS/SVG motion composition captured with system Chromium and edited with FFmpeg; no application dependency was added.
- Generated imagery is excluded. All case imagery comes from the recorded MethaneResponse interface and pinned historical snapshot.
- Existing story-v4 footage, narration, music, and captions are retained as inputs; the v4 MP4 is not overwritten.
- Full normal-speed playback and listening were not performed in this session; the visual review uses sampled frames and motion-study sections, including the new date-selection and audit close-ups.

## Scientific scope

MARS is the detection, notification, and follow-up system. MethaneResponse demonstrates a separate, claim-scoped evidence review. The KAZ_S_159 result is the deterministic rules baseline against the selected bundle and UTC scope. It does not contradict the UNEP catalog record, prove repair, or establish zero emissions. The local SHA-256 check detects a changed copy; it is not a public-chain receipt or issuer signature.

## Files

- [Design system](DESIGN.md)
- [Reference analysis](reference-analysis.md)
- [Timed storyboard](storyboard.md)
- `composition.html` — authored motion and actual-footage timeline
- `capture-slide-stills.mjs` — captures three progressive stages per authored slide
- `render-hybrid-v5.mjs` — assembles the progressive presentation, recorded app clips, voice, and original instrumental
- `composition-v9.3.html` — current presentation timeline and authored composition
- `capture-audit-interaction-v9.mjs` — reproducible local capture of actual scope and audit actions
- `render-hybrid-v9.3.mjs` — hash-checked local capture integration, focus studies, and final render
- `delivery-spec-v9.3.json` — technical delivery contract at 25 fps
- [Local export review](delivery-review-v9.3.md) — technical result, frame-sampling scope, and review limits

The current local export is `MethaneResponse-Hybrid-Presentation-Demo-4m50-v9.3-final.mp4`, with an English SRT sidecar, a source-hashed local interaction recording, captured slide states, and a technical audit under the ignored `delivery-output/story-v5/` directory. Earlier v5–v9.2 exports remain preserved. No external video was uploaded or published. See [storyboard.md](storyboard.md) for the timed narration-to-visual map and [delivery-review-v9.3.md](delivery-review-v9.3.md) for verification details.
