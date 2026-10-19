# Local Video Review — v7

## Artifact

- File: `delivery-output/story-v5/MethaneResponse-Hybrid-Presentation-Demo-4m50-v7.mp4`
- SHA-256: `8d48d690d2e116db61844e886fb386303793a5d75d07279908c2efbdf9bfef8c`
- English captions: `MethaneResponse-Hybrid-Presentation-Demo-4m50-v7.mp4.en.srt`
- Render metadata: `delivery-output/story-v5/render-manifest-v7.json`
- Technical audit: `delivery-output/story-v5/review-v7/report.json`
- Claim authority: [story-v4 source and claim ledger](../delivery-2026-10-19-story-v4/03-Sources-and-Claims.md)

The MP4, SRT, captures, and generated review evidence are local ignored artifacts; no remote service received or published them.

## Technical verdict

**Pass against the local 1920×1080, 30 fps, 290-second H.264 delivery spec.** The video has 8,700 frames and decodes fully. Audio is AAC, stereo, 48 kHz, 290 seconds, measured at −18.08 LUFS integrated and −1.96 dBFS true peak. The SRT digest matches the render manifest. The v7 digest in the audit matches the MP4.

The full-file audit is `delivery-output/story-v5/review-v7/report.json`. It sampled 27 frames around the opening, ending, and selected story joins. This is an export integrity/codec review, not artistic approval.

## Visual inspection coverage

- Inspected full-resolution authored frames for the MARS role diagram and the three EnMAP estimates, including all three points and uncertainty intervals.
- Inspected the 20-second audit interaction study: recorded cursor, claim review, and the bundle-scoped result appear in sequence.
- Inspected short join studies around 00:40 (climate context → MARS roles), 02:51 (recorded audit → rules result), and 03:48 (report diagram → verifier interaction), plus selected frame sequences from the full v7 export.
- The v6 review exposed too much crossfade overlap between unrelated slide and UI text. V7 shortens the chapter dissolve to 0.15 seconds; the selected v7 joins were checked again.
- Reference videos were only sampled visually at the opening, middle, and near the end. Full reference playback and reference audio were not assessed; parity is not claimed.

## Artistic review status

**Not fully reviewed.** A normal-speed uninterrupted playback of the full 4:50 export and actual listening to its complete mix were not available in this review surface. The spot checks show a motion presentation with progressive slide reveals, an uncertainty chart, and recorded application interactions. Those checks do not establish full-film pacing, voice naturalness, music balance across all scenes, or reference parity.

| Dimension | Status | Evidence or remaining limit |
|---|---|---|
| Story and product proof | not reviewed | Selected frames show actual recorded UI and the bounded rules result; full narrative playback remains unchecked. |
| Composition and hierarchy | not reviewed | Slide frames and selected joins inspected; full-screen rhythm not viewed continuously. |
| Choreography and continuity | not reviewed | Progressive states and three joins inspected as frame studies; no uninterrupted normal-speed review. |
| Tempo and reading holds | not reviewed | Depends on full playback at intended viewing size. |
| Visual character/reference fit | not reviewed | Reference samples are limited and the complete films were not watched. |
| Typography and UI readability | not reviewed | Full-resolution chart and key frames are legible; every text/UI hold was not timed by full viewing. |
| Sound-motion integration | not reviewed | Loudness/peak and full decode passed; the complete audio was not listened to. Narration is synthetic Kokoro `af_heart`, not a human recording. |
| Truth, rights, and privacy | pass for the inspected content | Claims follow the local source ledger; recorded interface and attributed historical case metadata are used. This is not a legal opinion. |
| Delivery variants | not applicable | Only 16:9 landscape was requested. |

## Production limits

Higgsfield and HyperFrames were unavailable in this environment. V7 uses authored HTML/CSS/SVG motion, local Chromium captures, actual recorded MethaneResponse footage, the existing original instrumental, and FFmpeg. No generated methane imagery or external video assets were added. The recording is not a live service capture. The synthetic narration's human-like quality needs a human listen before describing it as natural or final.

## Readiness

**Technically valid local preview; artistic approval and publication remain unverified.** The next review step is to watch the full MP4 at normal speed with sound on the target device, then fix only observed pacing, readability, or audio problems. The file has not been uploaded, published, or submitted.
