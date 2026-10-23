# MethaneResponse — current Devpost submission, v18

**Updated: 23 October 2026.** The authenticated Devpost readback now records a
submitted entry and a YouTube URL. See [publication status](publication-status-2026-10-23.json)
for the exact observation and its limits. The packaging tools themselves perform
no publication, upload or deployment. Older archives keep their original status.

## General info

**Project name:** MethaneResponse

**Elevator pitch** (143 characters, within the supplied 200-character limit):

```text
Trace methane claims to evidence. Explore historical satellite data, identify missing proof, and verify the integrity of investigation reports.
```

**Track:** Climate Data & Environmental Monitoring.

Paste [project-story.md](project-story.md) into About the project in Markdown
mode. Its seven headings match the requested form. The current story follows
**Plan → Investigate → Verify**, primary source **TKM_S_021**, with a separately
labeled archived **KAZ_S_159 DeepSeek DEMO**.

**Built with** (15 tags): React, TypeScript, Vite, MapLibre GL JS, Bun, Hono,
Zod, Python, uv, Solidity, Foundry, viem, Ethereum, SHA-256, Playwright.
No database is required or presented as a completed service.

## Try it out and access status

- Source: https://github.com/AndroLay/MethaneResponse
- Limited preview: https://methaneresponse-preview.onrender.com/dashboard
- Video: https://youtu.be/_YzYe921q6g — registered on the submitted Devpost entry;
  public metadata is accessible. Full playback and comparison with the local cut
  remain unverified.
- [Proposed YouTube title, description and chapters](youtube-metadata.md) are
  ready to paste into YouTube Studio; they have not been saved to that account.

[access-status.json](access-status.json) retains the **pre-release baseline**:
GitHub `b067ad36c792ab45c472334984b338662b679637` had successful CI; it did not
contain the local v18 delivery. The first preview checks had a health timeout
and dashboard HTTP 503; retries returned HTTP 200 with the casebook ready and
model configured. These observations apply to their recorded time, not every
later deployment. See the [23 October release record](../../evidence/release-sync-2026-10-23/README.md)
for fresh local gates and exact-commit CI/deployment inspection links. Do not infer
current runtime identity or a successful model call from a prior HTTP check.

> The demo shows the full local prototype. The public preview is limited to
> selected sources and excludes private review and blockchain writes.

The public health response lists only KAZ_S_159, LBY_S_143 and CAN_S_002 for
anonymous baseline operations, and marks audit state ephemeral. Download anything
that must be preserved. Do not promise the full TKM private-review journey on
Render. The recorded DeepSeek result is historical integration evidence, not a
new provider run performed during this packaging.

## Current video

- Local file: `delivery-output/final-v18/MethaneResponse-Final-Submission-v18.mp4`.
- **4:57**, 1920×1080, 25fps, English burned-in captions and stock synthetic male
  Andrew voice; original instrumental score.
- SHA-256: `b14bc61f893176631c8ce15445217ea1ab4977e52a1c252b81d2e661b4006fad`.
- [Delivery/review scope](../../demo/delivery-2026-10-22-final-v18/README.md):
  18 technical checks and 34 video regressions pass. Full normal-speed playback
  and actual listening remain unreviewed; these tests do not establish usability.
- The host URL is now recorded in [fields.json](fields.json). Check the uploaded
  cut, captions and playback separately; public metadata does not verify its
  contents or byte identity. Keep the 56 MB MP4 outside the 35 MB attachment.

## Generate the matching judging attachment

```bash
python3 docs/release/devpost-submission/test_v18_package.py
python3 docs/release/devpost-submission/package_v18_submission.py \
  --output delivery-output/release-sync-2026-10-23/MethaneResponse-Devpost-Judging-Pack-v18-aligned-final.zip
```

The builder rejects replacement of an existing ZIP, verifies the exact MP4 and
proof manifest, restricts inputs to an explicit allowlist, and enforces the
conservative 35,000,000-byte attachment limit through archive validation.
It includes the current story/fields/guide, v18 audit, the exact v17 **take8**
TKM export/pin/receipt/local state, recorded AI smoke summary, frozen r12 findings,
the dated release validation, licenses and six gallery images. No signing key, model credential, raw browser
trace, full third-party report body, or video is included. This is an evidence
attachment, not the full source repository. Clone the full repository for replay.

Gallery images retain 16:9 rather than cropping out useful evidence. The form
recommends 3:2. Each image is under 5 MB. `gallery-captions.json` distinguishes
actual archived browser capture, composed application footage, proof readout and
an **editorial impact diagram**. Do not call the diagram observational evidence.

Older dated v12/v16 and non-render attachments remain historical. The legacy
`package_submission.py` and `package_current_submission.py` serve their earlier
package formats; use `package_v18_submission.py` for the current attachment.

## Scientific, technical and publication boundaries

- Historical snapshot: 4,218 sources; 30,414 total plume records; 23,861 linked
  and 6,553 unlinked. Historical observations are not a live emissions feed.
- Take8 pin: `0xcab36a271a000facd92cefbbfb902b314cce70eed565a9471ca6b263b5353ec2`.
  Use [the take8 proof instructions](../../evidence/video-v17-2026-10-22/README.md),
  never the older v16 take2 pin. Anvil is local chain 31337, not Sepolia.
- `mitigation_confirmed` names the claim under review; the actual TKM decision
  is `request_more_evidence`. Reviewer and response are software DEMO fixtures.
- AI proposes document assessments; review and exact citations constrain use.
  Blockchain commits report integrity; neither establishes physical repair.
- Potential field follow-up and comparable measurements explain the impact
  pathway. No achieved repairs, emissions reduction or productivity is measured.
- Frozen r12 remains **0/48 task completion** under its scorer. Twelve passing
  deterministic gates do not replace the 48 task results.

See [judges-guide.md](judges-guide.md), [sources](source-links.md),
[rules-check.md](rules-check.md) and [fields.json](fields.json). The submitted
entry is verified through authenticated readback. Uploaded attachment contents,
full video playback, proposed YouTube metadata and any eligibility discrepancy
still require their own checks. No judging score or winner outcome is guaranteed.
