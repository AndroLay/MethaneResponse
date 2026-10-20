# Devpost submission — ready-to-copy fields

**Prepared/check date: 19 October 2026.** This package prepares content and local
attachments. It does not save a Devpost form, upload media, publish source or
deploy the application.

## Project overview / General info

**Project name**

```text
MethaneResponse
```

**Elevator pitch** — 143 characters, within the supplied 200-character limit:

```text
Trace methane claims to evidence. Explore historical satellite data, identify missing proof, and verify the integrity of investigation reports.
```

**Track:** Climate Data & Environmental Monitoring.

## Project details / About the project

Paste [project-story.md](project-story.md), beginning with `## Inspiration` and
ending with `## What's next for Methane Response`. Its seven headings match the
form supplied by the user. Use Markdown mode, then inspect the rendered preview.

## Built with

Enter these 15 tags separately:

React, TypeScript, Vite, MapLibre GL JS, Bun, Hono, Zod, Python, uv, Solidity,
Foundry, viem, Ethereum, SHA-256, Playwright.

No database or unsupported model framework is added to the tags. JSON storage
and the optional model integration are explained in the story.

## Try it out links

| Label | Value for the form |
|---|---|
| Source code | `https://github.com/AndroLay/MethaneResponse` |
| Live prototype | Add the actual verified deployment URL; no URL is invented here |

The repository address comes from this project. The current public revision was
not verified by the web reader on this pass (cache miss); check the committed
version and unauthenticated access before submission.

## Project Media / Image gallery

Run the packager below. It copies six unchanged actual UI captures to
`delivery-output/devpost-submission-2026-10-19/gallery/`. Upload them in numbered
order; the English titles/captions are in `gallery-captions.json` beside them.
Each image is under 5 MB. They retain the native **16:9** interface frame, including
credits. The form recommends **3:2**; it does not require cropping the interface.

## Video demo link

Upload the finished video to a platform supported by Devpost and paste its
embeddable/publicly accessible URL. A local file path is not a video URL.

Local video:
`delivery-output/story-v12/MethaneResponse-Final-Presentation-Demo-v12.mp4`.
Duration: **4:27.92**, within the official 3–5-minute window. The matching English
SRT is beside the MP4. Do not put the video inside the 35 MB form attachment.
The video has technical verification and sampled frame review; full listening
and normal-speed human playback remain unverified.

## Additional info / Upload a File

Upload the generated **`MethaneResponse-Devpost-Judging-Pack.zip`**. It contains
the project story, judging guide, source links, real gallery images, example
original/changed report files, scoped verification summaries, rights notices,
and checksums. Source code is reached through the repository link.

```sh
python3 docs/release/devpost-submission/package_submission.py
python3 docs/release/devpost-submission/test_submission.py
```

Output:
`delivery-output/devpost-submission-2026-10-19/MethaneResponse-Devpost-Judging-Pack.zip`.
The packager enforces a conservative **35,000,000-byte** maximum and preserves
any existing output. Its ZIP is a judge attachment, not the full repository or
the video. The helper copies only explicit approved inputs, never environment
files, private state, credentials or third-party report bodies.

## Rules alignment and remaining fields

[Rules alignment](rules-check.md) records the current official sources, judging
coverage, form limits, access checks and unresolved eligibility discrepancy.
[fields.json](fields.json) keeps pending live/video URLs explicitly null. These
must be filled with actual addresses; they are not evidence of publication.

Actual form limits for media/file upload are taken from the user's supplied
form. Recheck them in the authenticated form if it changes. No external party
has been contacted and no submission is claimed.

## Current completion attachment — 20 October

The additive packager retains the dated v12 materials and P2 evidence. Use the
explicit completion switch to also include the current map regression, local
Anvil receipt and desktop/mobile captures:

```sh
python3 docs/release/devpost-submission/package_current_submission.py --include-non-render-completion --output delivery-output/release-nonrender-2026-10-20/MethaneResponse-NonRender-Judging-Pack.zip
```

Existing output is never overwritten. `completion-proof/checks.json` records
the new run; `current-proof/` remains the earlier P2 package. Blockchain acceptance
is local Anvil chain 31337, without public-wallet funding. Luna live-model
verification is deferred until the user provides the provider configuration.
This creates a local ZIP, not a submitted entry or uploaded video.
