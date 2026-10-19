# MethaneResponse — IEEE ClimateChain delivery pack

**Version:** 19 October 2026 · **Demo length:** exactly 4:00 · **Presentation and narration:** English · **Operator notes:** Indonesian

This package is grounded in the current repository and the local production-build capture. It is prepared for Notion ZIP import; it is **not** a Notion page that has already been imported or published. The MP4 is a separate local artifact and has not been uploaded.

## Notion import

The ZIP contains the pages below plus current browser screenshots. In Notion, use **Settings → Import → Convert Zip to pages**, select the ZIP, and make `01-Presentation` the parent page. Verify image placement and source links after import. The official instructions are [Notion's import guide](https://www.notion.com/help/import-data-into-notion). No Notion authoring connection was available in this session, so the import has not been performed or visually verified.

## Package contents

- [01 — Presentation](01-Presentation.md): concise English product story for judges.
- [02 — Judge Q&A](02-Judge-QA.md): evidence-backed answers and explicit limits.
- [03 — Sources and claim ledger](03-Sources-and-Claims.md): approved wording, primary sources and license notes.
- [04 — Four-minute storyboard](04-Storyboard.md): timestamped scenes and on-screen messages.
- [05 — Operator runbook](05-Runbook-ID.md): local setup, reset and manual fallback in Indonesian.
- `assets/`: new screenshots captured from the built app with local API state, including the searchable case table, source observations, scoped assessment and report verification.

Video production files are outside the Notion import ZIP:

- `06-Captions-EN.srt` — English on-screen copy timing.
- `06-Captions-EN-story-v3.srt` — captions for the story-focused video, with the UNEP and IEA context visible on screen.
- `narration-en-story-v3.json` — latest English narration, divided into 11 timed scenes. It adds the climate rationale, MARS context, real case evidence, review method and supported product value. Earlier narration revisions remain beside it.
- `scripts/generate-demo-narration.py` — local neural-voice generator; voice is synthetic, not a human recording.
- `scripts/delivery-cursor.ts` and its test — pointer and click pulse embedded in the browser capture only.
- `scripts/capture-delivery-demo.ts` — reproducible browser capture of actual app interactions.
- `scripts/render-delivery-narrated-demo.sh` — subtitle, voice/music mix, 240-second pad and final encode.
- `scripts/generate-demo-music.py` — deterministic original instrumental generator.
- `/tmp/MethaneResponse-delivery-2026-10-19-voice/MethaneResponse-IEEE-ClimateChain-Demo-4m-2026-10-19.mp4` — latest local output with actual app footage, captured-app still inserts, cursor and narration.
- `/tmp/MethaneResponse-delivery-2026-10-19-voice/voice-preview-story-v3-storyfix-18s.mp3` — short voice sample covering the opening narration.
- `/tmp/MethaneResponse-delivery-2026-10-18/MethaneResponse-IEEE-ClimateChain-4m.mp4` — preserved earlier instrumental-only output.

The current edit uses 471 words across 11 narration blocks. Its conversational English script uses Kokoro `af_heart` at 0.94 speed and occupies 206.348 seconds of the exact **240-second** video. Original instrumental music sits under speech and carries about 34 seconds of product-action pauses. The TTS script and model run locally; narration text is not sent to a voice service. This is a synthetic neural voice, not a human recording. A white-and-teal cursor with restrained click pulses appears in the actual browser footage; evidence screenshots remain cursor-free.

The four-minute story explains why methane matters, what MARS already does, what MethaneResponse adds, how one historical case is examined, what the result means, and how a report's integrity can be checked. It cites UNEP's roughly 30% global-warming context and the IEA's 12% MARS response statistic, explicitly stating that response is not repair. It then demonstrates KAZ_S_159 and a bounded assessment result. These are context and workflow evidence, not measured project impact.

The capture uses the local production build, temporary API state, and Chromium SwiftShader; it is not a physical-GPU performance test. Cases → Evidence Auditor → Reports are shown. To avoid blank startup/loading frames, the source directory (00:00–00:23), selected case (00:23–00:40), and observation timeline (00:40–01:04) use real screenshots captured from the running application, not generated illustrations. The remaining sequence uses actual browser footage. The globe remains omitted because public basemap tiles did not render consistently in headless capture.

The video is local and has not been uploaded. Its technical audit details, SHA-256 and measurements are recorded in `narration-update-2026-10-19.md` (kept outside the Notion import). The report still marks `creative_status = not_reviewed` and `delivery_ready = false`: full-speed playback and human listening were not completed in this environment, so subjective voice naturalness and overall creative polish remain unverified.

## Story in one sentence

MethaneResponse makes the scope and limits of a methane-claim review inspectable: a user can trace historical MARS records, run a deterministic evidence-coverage baseline, record follow-up, export the result, and check whether the exported audit bundle still matches its digest.

## What this delivery does not claim

- The source snapshot is historical, not a live methane feed.
- Source-level notification or feedback metadata does not establish delivery to a specific recipient or physical repair.
- The July 2026 UNEP catalogue summary for KAZ_S_159 is not contradicted by this app's narrower metadata assessment; the exact action timestamp is not present in the casebook.
- The rules baseline is not an AI model and does not authenticate linked documents.
- A local digest check is not a blockchain receipt, issuer authentication, or proof of physical truth.
- The Render Blueprint is configured for a free, temporary preview but is not deployed. Render free services may sleep and lose `/tmp` state.
- Screenshots, Notion ZIP and local MP4 are separate outputs; none means that a public page or video has been published.

## Delivery verification

The local full gate was rerun on 18 October 2026 after the preview configuration and landing-page notice changes:

- API 201/201, web 253/253, verifier/tooling 54/54, Python 212/212, Foundry 4/4.
- Typechecks, production build, web bundle budget and `git diff --check` passed.
- Bundle budget: App 71,894 gzip bytes; eight route chunks. MapPanel is 1,122,953 bytes raw / 304,890 bytes gzip and still triggers Vite's advisory 500 KB raw-chunk warning.
- These checks validate the local checkout. They do not validate Render, public HTTPS, Notion import, or an uploaded video.

The original repository file `delivery-verification.json` records the October 18 local application gate and the earlier instrumental-only export. `narration-update-2026-10-19.md` records preserved revisions, the current story edit, cursor, export and audit evidence; it is intentionally outside the Notion import ZIP. Naturalness and creative pacing still need a human review.
