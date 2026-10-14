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
- The `javascript` CI job now installs managed Chromium and runs the same browser test after the existing checks. Remote CI has not yet been observed for this change.

## Limits

- This is deterministic browser regression evidence using a real historical dataset snapshot and the rules baseline. It is not a live AI assessment, licensed-document review, human reviewer identity check, cloud persistence test, Sepolia transaction, imagery reachability check, physical mitigation result, or mobile-device performance test.
- External map tiles are deliberately blocked during this E2E test. Separate Chromium UAT and the existing screenshot evidence cover map behavior; GPU/device validation remains open.
- The environment's default temporary directory can return quota error `-122`; `scripts/run-e2e.sh` uses `/dev/shm` when available, and the workflow itself passed with that fallback.

## Next action

Verify the updated public CI run. Then continue against the remaining external gates in order: rights-cleared independent AI benchmark, owner-configured cloud persistence, authorized Sepolia verification, pilot and physical-device check, and final submission media/eligibility.
