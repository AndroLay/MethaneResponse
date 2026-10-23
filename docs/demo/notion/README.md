# MethaneResponse — Notion presentation package

**Story:** Evidence Before Claims · **Demo target:** 4:30 · **Prepared:** 16 October 2026 WITA

This local package contains a presentation page, operator guide, claim evidence, Q&A, and application screenshots. No page has been created in a Notion workspace: Notion integration was not connected during this session. The main presentation is in English for a hackathon audience; operator notes and repository status are maintained in English as well. This package is an optional archival reference.

## Start here

| Page | Use |
|---|---|
| [01 — Presentation](01-Presentation.md) | Main audience page: problem → case → two claims → export/verification → next step |
| [02 — Presenter Runbook](02-Presenter-Runbook.md) | Script, time budget, clicks, reset, and fallback |
| [03 — Claims and Q&A](03-Claims-and-QA.md) | Evidence ledger, claim limits, and judge answers |
| [04 — Publisher Appendix](04-Publisher-Appendix.md) | Indicators for Q&A; outside the main flow |
| [05 — Repository Brief](05-Repository-Brief.md) | Architecture, repository state, and decisions in force |

## Import instructions

1. Use the ZIP built from this folder, including `assets/`; do not import Markdown without its images.
2. In Notion desktop/web, open **Settings → Import → Convert Zip to pages** and select the ZIP.
3. Make `01-Presentation` the main page. Place the runbook, ledger, appendix, and brief as supporting pages.
4. Enable **Full width**, use the default font and normal text size. Keep one column, dividers between sections, and one idea per section. Do not add emoji or decorative columns to the main flow.
5. Check every image, table, inter-page navigation link, and readability on the presentation screen. If an image is missing, upload the PNG from `assets/` again in the same position.

Notion supports importing Markdown and ZIP folders; special formatting and navigation may need adjustment. These instructions follow [Notion's official import guide](https://www.notion.com/help/import-data-into-notion), checked on 16 October 2026. The import and final rendering have not been checked in an authenticated Notion workspace.

## Capture evidence — 16 October 2026 WITA

- Code baseline `a82e2eee99bb79327f859f304f2f5d5939f07041`, with no product-code changes. The main capture began at 00:31 WITA; the separate Summary capture began at 00:36 WITA. UTC timestamps are stored in `capture-manifest.json`.
- Chromium headless **with sandbox**, viewport 1600 × 1000, local Vite web app and Bun/Hono API, isolated temporary JSON state. External HTTP requests were blocked. AI, reviewer, and chain writes were disabled; no transaction occurred.
- Flow checked: KAZ_S_159 → three observations → **Supported** detection → **Insufficient Evidence** mitigation → export → valid bundle digest without a receipt → inconsistent copy rejected → September Top 50 → Algeria history. Summary confirms both notification/feedback metadata fields are **Yes**.
- Nine PNGs were created and visually inspected. The verification panel was captured as a browser element screenshot so its result would be readable. The images are not mockups or reconstructions. [Capture Map Explorer](assets/01-historical-map.png) deliberately retains the tile-fallback notice; the main page uses Summary so the opening metadata is clearly visible.
- JavaScript page errors: **0** in both successful passes. The tile fallback remains visible and explained; this is not a GPU, public-network, physical-device, or production-build measurement.
- `bun --no-env-file scripts/verify-audit.ts docs/demo/notion/audit-report.json`: exit 0, `bundle_hash: VALID`, `chain_receipt: ABSENT`. `document_rights_metadata: NOT_RECORDED` is consistent with the audit rules because document contents are not included. The original report file and manifest are stored in this folder, outside the import ZIP.
- The modified copy was rejected with **Audit summary fields do not match the hashed bundle.** The check stopped before comparing digests. The package does not claim that this scene isolates a SHA-256 failure.
- SHA-256, size, and PNG headers were matched against the manifest; local Markdown links, ZIP contents/CRC, and `git diff --check` were checked. Results and the ZIP hash are in `package-verification.json` after packaging.

The initial capture was delayed by the parent environment's proxy and Chromium Unix-socket restrictions. The successful pass used environment isolation consistent with the repository runner and host permission for the browser, while keeping Chromium's sandbox enabled. No application-code fix was needed.

No full test suite or new build was run for these documentation changes. The checks above establish the recorded local flow and assets; they do not establish Notion publication, a timed presenter rehearsal, or a final video.

## Recreate the local ZIP

Run from the repository root. This command creates a new file in `/tmp`, refuses to overwrite an existing file, and uploads nothing. JSON manifests/reports remain repository evidence and are not included as import pages.

```python
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path("docs/demo/notion")
target = Path("/tmp/MethaneResponse-Notion-2026-10-16.zip")
files = sorted(root.glob("*.md")) + sorted((root / "assets").glob("*.png"))
with ZipFile(target, "x", compression=ZIP_DEFLATED) as package:
    for item in files:
        package.write(item, Path("MethaneResponse Demo") / item.relative_to(root))
with ZipFile(target) as package:
    assert package.testzip() is None
print(target)
```

## Final status items that still require an external environment

| Stage | Status |
|---|---|
| Story, script, Q&A, and repository context | Prepared; two independent reviewers reviewed the narrative/evidence limits |
| Local flow and screenshots | Successful; 9 images, 0 page errors in the successful pass, standalone verifier result valid |
| Notion page and visual QA after import | Waiting for Notion integration/workspace; not performed |
| 4:30 presenter rehearsal | Script is timed; actual duration has not been measured |
| New video and matching captions | Not created from this script; older video/captions are not the final output of this package |
| Eligibility and submission time | Official-page conflict remains unresolved; no organizer confirmation |
| Public access, deployment, transaction, and submission | Not performed by this local package |
| External DeepThink | Unavailable in this session; review was done locally by two independent agents, not in a ChatGPT Web session |

When Notion is available, estimated work is 20–40 minutes for import/layout and 60–120 minutes for rehearsal, one clean take, captions, and full review. These are planning estimates, not measured durations; retakes may add time. Organizer clarification and external evaluation cannot be assigned a guaranteed duration.
