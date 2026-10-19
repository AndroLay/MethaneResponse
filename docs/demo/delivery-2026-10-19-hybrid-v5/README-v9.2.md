# MethaneResponse — Hybrid Presentation Demo v9.2

This is the presentation-style demo requested for the IEEE ClimateChain entry. It combines motion-designed explanation with actual recorded product footage: why methane evidence matters, what UNEP MARS already does, what MethaneResponse adds, and a reproducible review of KAZ_S_159. It is paced as a short documentary-style product presentation, rather than a static slide deck or an uninterrupted screen recording.

## What changes in v9.2

Story v4 is a continuous application walkthrough with captions. The presentation retains its chapters, progressive diagram builds, uncertainty-point plot, July timing ambiguity, and result/limits panels. V9.1 removes the continuous camera drift that made authored slides feel unsteady, replaces directional wipes with short dissolves, and renders at the source capture's native 25 fps to avoid mixed-cadence judder. Motion remains in the authored element reveals and in deliberate application zooms.

The application sequence now gives the observation-day scope its own screen segment. Its close-up begins after the recorded page has settled on the date form, then moves to the scope action and the rules-baseline run. The result receives a separate readable hold before the view pulls back. The date is already selected in this form footage; the video does not fabricate keystrokes or interaction. The observation focus keeps dated points and uncertainty context visible. A subtle ring marks the latest observation; it does not connect values or imply continuous monitoring. Zooms use captured application pixels and add no synthetic evidence.

## Production status

- Reference samples were inspected visually at the opening, middle, and near the end. Audio and full playback of those references were not assessed.
- **Higgsfield is unavailable in this session:** there is no connected Higgsfield tool or account path. No Higgsfield generation is claimed.
- HyperFrames CLI and Higgsfield are unavailable here. No remote generation is claimed. The fallback is a local HTML/CSS/SVG motion composition captured with system Chromium and edited with FFmpeg; no application dependency was added.
- Generated imagery is excluded. All case imagery comes from the recorded MethaneResponse interface and pinned historical snapshot.
- Existing story-v4 footage, narration, music, and captions are retained as inputs; the v4 MP4 is not overwritten.
- Full playback and listening were not performed in this session; the visual review uses sampled frames and motion-study sections.

## Scientific scope

MARS is the detection, notification, and follow-up system. MethaneResponse demonstrates a separate, claim-scoped evidence review. The KAZ_S_159 result is the deterministic rules baseline against the selected bundle and UTC scope. It does not contradict the UNEP catalog record, prove repair, or establish zero emissions. The local SHA-256 check detects a changed copy; it is not a public-chain receipt or issuer signature.

## Files

- [Design system](DESIGN.md)
- [Reference analysis](reference-analysis.md)
- [Timed storyboard](storyboard.md)
- `composition.html` — authored motion and actual-footage timeline
- `capture-slide-stills.mjs` — captures three progressive stages per authored slide
- `render-hybrid-v5.mjs` — assembles the progressive presentation, recorded app clips, voice, and original instrumental
- `composition-v9.html` — v9.1 presentation timeline and authored composition
- `capture-slide-stills-v9.mjs` and `render-hybrid-v9.mjs` — reproducible capture, focus-study and final render pipeline
- `delivery-spec-v9.json` — technical delivery contract at 25 fps
- [Local export review](delivery-review-v9.2.md) — technical result, frame-sampling scope, and review limits

The current local export is `MethaneResponse-Hybrid-Presentation-Demo-4m50-v9.2-final.mp4`, with an English SRT sidecar, captured animation states, and a technical audit under the ignored `delivery-output/story-v5/` directory. Earlier v5–v9.1 renders remain preserved. No external video was uploaded or published. See [storyboard.md](storyboard.md) for the timed narration-to-visual map and [delivery-review-v9.2.md](delivery-review-v9.2.md) for verification details.
