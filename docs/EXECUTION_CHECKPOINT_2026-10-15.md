# MethaneResponse execution checkpoint — 15 October 2026

## WP-3 / WP-10 — repeatable browser proof for the historical audit workflow

- Added a pinned Playwright runner and a root `test:e2e` command. The runner starts its own loopback API and Vite servers, creates a fresh temporary file store, clears AI/reviewer/database/Sepolia credentials, and never reuses an existing developer server.
- Added a browser test for the active UNEP MARS snapshot `unep-mars-675417694883`: select `KAZ_S_159`, open its case and dated observation table, hand it to the Evidence Auditor, run the deterministic mitigation baseline, export the JSON report, verify the local digest, and confirm a modified bundle is rejected. Non-loopback requests are blocked, so this test does not depend on external imagery or transmit evidence to a provider.
- Local evidence on Chromium at `/usr/bin/chromium`:
  - `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e`: **1 passed**. It checked the historical snapshot ID, source ID, claim label, `insufficient_evidence` result, local digest and tamper rejection; receipt remained absent.
  - `bun run check`: API, web and Playwright TypeScript checks passed.
  - `TMPDIR=/dev/shm bun run test:web`: **176 passed / 0 failed / 164,718 assertions**.
  - `TMPDIR=/dev/shm bun run test:verifier`: **20 passed / 0 failed / 96 assertions**.
  - `TMPDIR=/dev/shm bun run test:api`: **101 passed / 0 failed / 566 assertions; 13 PostGIS tests skipped** because no database URL was supplied to this run. The previous full disposable-PostGIS gate remains **112 passed / 0 failed / 0 skipped / 649 assertions**.
  - `bun install --frozen-lockfile`: **143 installs checked; no changes**.
- The `javascript` CI job installs managed Chromium and runs the same browser test after the existing checks. GitHub Actions run [38596679424](https://github.com/AndroLay/MethaneResponse/actions/runs/38596679424) for commit `ce12477407200a297a2487847406f56ad9ef34d8` completed with **success** across `javascript`, `data-pipeline`, and `contracts`; both `playwright install --with-deps chromium` and `test:e2e` steps passed.

## Limits

- This is deterministic browser regression evidence using a real historical dataset snapshot and the rules baseline. It is not a live AI assessment, licensed-document review, human reviewer identity check, cloud persistence test, Sepolia transaction, imagery reachability check, physical mitigation result, or mobile-device performance test.
- External map tiles are deliberately blocked during this E2E test. Separate Chromium UAT and the existing screenshot evidence cover map behavior; GPU/device validation remains open.
- The environment's default temporary directory can return quota error `-122`; `scripts/run-e2e.sh` uses `/dev/shm` when available, and the workflow itself passed with that fallback.

## Next action

Verify the updated public CI run. Then continue against the remaining external gates in order: rights-cleared independent AI benchmark, owner-configured cloud persistence, authorized Sepolia verification, pilot and physical-device check, and final submission media/eligibility.

## WP-2 / WP-6 / WP-10 — AI/reviewer browser workflow and full local gates

- Added a second Playwright journey backed only by a deterministic mock provider on loopback. The runner creates ephemeral AI/reviewer credentials **before** spawning Playwright so its API server and worker receive matching values; the regression probe confirms the API accepts that token before the browser submits an assessment.
- A follow-up review found that Playwright inherited caller environment variables and that one-file selectors were sent to both mutually exclusive test processes. The runner now passes an explicit environment allowlist, disables Bun dotenv loading, gives Vite an empty test-only env directory, and routes file-specific selectors to the matching phase. Three focused regression tests plus worker assertions cover environment filtering and phase routing.
- The browser journey uses the historical pinned source `KAZ_S_159` but labels the submitted test excerpt synthetic. It verifies two provider requests (exact first-pass citation plus skeptical second pass), abstention for insufficient mitigation evidence, a `needs_more_evidence` human review as immutable revision 2, reviewer-scope denial for private report reads, omission of the submitted excerpt from the exported bundle, JSON export, digest verification, and absence of a blockchain receipt. It blocks external browser traffic; no real document, model, reviewer identity, or chain is used.
- `GH_TOKEN`, `AI_API_KEY`, `DATABASE_URL`, and `VITE_TEST_SECRET` were set to disposable sentinel values for a full `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e` run. **3/3 runner regression tests and 2/2 browser journeys passed**; worker assertions confirmed caller credential names were absent. `bun run check` passed with the API, web, Playwright and mock-provider TypeScript checks.
- Verification on the current local tree: `bun install --frozen-lockfile` checked **143 installs with no changes**; `test:api` **101 pass / 13 DB-dependent skips** without a supplied database; `test:web` **176 pass / 0 fail / 164,718 assertions**; `test:verifier` **20 pass / 0 fail / 96 assertions**; Python **122 pass**; Foundry **4 pass**; and `build:web` passed. `bun run check:all:postgis` also exited **0** using the repository's disposable database runner, so the PostGIS-backed full gate completed successfully.
- The production build's bundle guard passed, but Vite still warns that the lazy `MapPanel` chunk is **1,122,112 raw bytes / 306.76 kB gzip**. This is not a budget failure; reducing initial bytes is a remaining performance improvement.
- GitHub Actions run [38596679424](https://github.com/AndroLay/MethaneResponse/actions/runs/38596679424) covers the earlier baseline E2E commit. The new AI/reviewer journey is still local and has not been pushed or verified by public CI.

### Limits and next action

This proves application integration and local permission/hash behavior with a synthetic excerpt and deterministic test provider; it does **not** validate model quality, legal permission, document authenticity, a real reviewer, cloud durability, a public Sepolia receipt, physical mitigation, user benefit, or emissions impact. Next, get this new test through CI after the normal source-publication step, then proceed only when the separate rights/annotator/provider, cloud-account, chain-authorization, user-pilot and device-testing prerequisites are available. Do not substitute these local tests for those external gates.
