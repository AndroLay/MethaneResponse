# Full local quality gate — 14 October 2026

**Scope:** current working tree at base commit `99662e6`; local-only verification, not a release or remote CI result.

## Command and environment

```bash
UV_CACHE_DIR=/tmp/methane-response-uv-cache \
TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54335/methane_test \
CI=true \
bash scripts/check-local.sh
```

The final rerun used a disposable `postgis/postgis:17-3.5-alpine` container named `methane-response-final-check-20261014`, an empty test database, and loopback port 54335. The container and its anonymous data volume were removed after the run; no listener remained. No cloud credentials, AI provider, RPC endpoint, user data, or funded wallet was used.

An earlier run on loopback port 54333 encountered `ECONNREFUSED` from the restricted command sandbox although PostGIS was healthy. The final rerun on port 54335 used the authorized environment and completed successfully. The initial connection errors were environment isolation, not failing application assertions.

## Results

| Check | Result |
|---|---|
| Frozen dependency install | PASS — Bun 1.4.3 checked 138 installs / 211 packages; no changes |
| API and web typechecks (`bun run check`) | PASS |
| API including PostGIS (`CI=true`) | PASS — 108 tests, 0 failed, 633 assertions; database tests ran, none skipped |
| Web | PASS — 164 tests, 0 failed, 164,424 assertions |
| Audit verifier and benchmark runner | PASS — 9 tests, 0 failed, 53 assertions |
| Python data pipeline | PASS — 117 tests |
| Solidity / Foundry | PASS — 4 tests, 0 failed, 0 skipped |
| Production web build | PASS — Vite build completed |
| Web bundle budget | PASS — App entry 62,594 gzip bytes; 8 route chunks |
| Rules baseline reproducibility | PASS — generated JSON SHA-256 matched tracked report: `44fad3fedcbc80bb9b9874540ee5ac5476383556fe11228a108bd74e4866bb96` |
| `git diff --check` | PASS |

The build still reports upstream Zod/Rollup annotation notices and a raw MapPanel chunk of 1,121,936 bytes (306.68 kB gzip). The configured bundle budget passes; this is not a mobile GPU or network performance result.

## Browser check for the historical-data indicator

After the gate, a read-only Chromium smoke check opened `/dashboard?sourceId=KAZ_S_159` on Vite port 5175. Desktop and 390×844 screenshots are in `/tmp/methane-response-dashboard-status-20261014.png` and `/tmp/methane-response-dashboard-status-mobile-20261014.png`. The DOM exposed `UNEP SNAPSHOT · NOT LIVE`, the 2026-09-12 archive cutoff, and the historical-source label. The header indicator computed to neutral `rgb(135, 153, 165)`; there were zero `.pulse` / `.live-dot` elements. On mobile, `document.documentElement.scrollWidth` was 390 for a 390px viewport. Chromium reported zero page errors and 12 software-WebGL warnings; visible basemap tiles were unavailable and the UI showed its existing retry/fallback notice. This does not validate imagery access on a public/judge network or physical GPU performance.

## Interpretation and remaining gates

This establishes a reproducible local source/test gate against disposable PostGIS. It does not establish GitHub Actions success for the active working tree, a clean-clone release run, cloud persistence or backup/restore, live AI quality, human reviewer independence, Sepolia receipt verification, physical-device rendering, user-pilot usefulness, or emission reductions. The full gate log was kept at `/tmp/methane-response-final-check-20261014.log` for this session; the summarized results above are the durable record.

## Addendum: full rerun after requiring rights declarations — 14 October 2026

The AI request schema now requires a per-document `rightsDeclared` value. The first full run exposed old test fixtures that did not represent valid new requests; those fixtures were updated. A separate regression confirms historical v3 bundles without this optional digest field still verify by their original canonical hash.

The complete `bash scripts/check-local.sh` run used the disposable PostGIS image `postgis/postgis:17-3.5-alpine` on loopback port 54347, with `CI=true` and the repository UV cache under `/tmp`. It exited 0. The container was stopped after the run.

| Check | Result |
|---|---|
| Frozen dependency install | PASS — Bun 1.4.3 checked 138 installs / 211 packages; no changes |
| API and web typechecks | PASS |
| API including PostGIS | PASS — 110 tests, 0 failed, 637 assertions; no database tests skipped |
| Web | PASS — 166 tests, 0 failed, 164,429 assertions |
| Audit verifier and benchmark runner | PASS — 9 tests, 0 failed, 53 assertions |
| Python data pipeline | PASS — 117 tests |
| Solidity / Foundry | PASS — 4 tests, 0 failed, 0 skipped |
| Production web build | PASS |
| Web bundle budget | PASS — App entry 62,595 gzip bytes; 8 route chunks |
| Rules baseline reproduction | PASS — output hash matches tracked report: `44fad3fedcbc80bb9b9874540ee5ac5476383556fe11228a108bd74e4866bb96` |
| `git diff --check` | PASS |

Vite still warns that the raw MapPanel chunk is 1,121,936 bytes (about 306.68 kB gzip). The configured budget passes; device and network performance were not measured. The baseline report has 15 total claims, including 6 explicitly synthetic fixtures; the real casebook subset has 9 examples and macro-F1 0.6667, with no `contradicted` examples. The combined score is not a valid estimate of operational AI accuracy.

The full gate itself did not run browser automation. A separate scoped Chromium smoke then opened the active snapshot and Evidence Auditor on local Vite/API. The browser-only status endpoint was mocked; with synthetic-only text and all other fields set, the assessment button was disabled until a rights declaration was selected and became enabled afterward. It was never clicked and no provider request was sent. Chromium recorded zero errors and 10 warnings, including MapLibre/WebGL `ReadPixels` stalls; this is not a physical-device performance measurement. The session and its snapshots containing the dummy token/test text were closed and removed. Cloud database, external AI provider, independent benchmark data/reviewers, Sepolia, user pilot, physical devices, and emission outcomes remain unverified. The detailed gate log is `/tmp/methane-response-rights-check-20261014-rerun2.log`.

## Latest rerun: rights metadata hash regression — 14 October 2026

After adding a test that changing a document's `rightsDeclared` value invalidates its audit digest, the complete local gate was rerun on a new empty disposable PostGIS container (`postgis/postgis:17-3.5-alpine`, loopback port 54348). It exited 0; the container was stopped and the port is closed.

| Check | Result |
|---|---|
| Frozen dependency install | PASS — Bun 1.4.3 checked 138 installs / 211 packages; no changes |
| API and web typechecks | PASS |
| API including PostGIS | PASS — 111 tests, 0 failed, 640 assertions; database tests ran with no skips |
| Web | PASS — 166 tests, 0 failed, 164,429 assertions |
| Audit verifier and benchmark runner | PASS — 9 tests, 0 failed, 53 assertions |
| Python data pipeline | PASS — 117 tests |
| Solidity / Foundry | PASS — 4 tests, 0 failed, 0 skipped |
| Production web build | PASS |
| Web bundle budget | PASS — App entry 62,595 gzip bytes; 8 route chunks |
| Rules baseline reproduction | PASS — output SHA-256 matches tracked JSON: `44fad3fedcbc80bb9b9874540ee5ac5476383556fe11228a108bd74e4866bb96` |
| `git diff --check` | PASS |

MapPanel remains 1,121,936 bytes raw (about 306.68 kB gzip); the build emits the existing >500 kB chunk warning although the configured bundle budget passes. The browser smoke for the rights control used synthetic text and a mocked capability status; it did not call the AI provider. Cloud DB, live AI, independent benchmark review, Sepolia, pilot, and physical-device rendering remain unverified. Full gate log: `/tmp/methane-response-final-gate-20261014.log`.

After this full gate, the reviewer report gained a visible rights declaration summary. The focused UI test and full web suite passed (**167 tests / 164,434 assertions**), `bun run check`, production build, and `bun scripts/check-web-bundle.ts` passed. A scoped Chromium flow rendered a synthetic mocked assessment, displayed its per-document declaration and unverified-status note, recorded zero browser errors, and showed no horizontal overflow at 390px. No provider call was made; this focused frontend validation does not rerun API/PostGIS, Python, or Foundry gates.

## Addendum: UNEP publisher-indicator comparison — 14 October 2026

The working intelligence artifact now includes a deterministic, dataset-bound comparison between the retrospective estimate of a later linked MARS record within 365 days and publisher-supplied UNEP persistency metadata. It is deliberately labeled descriptive and is not independent/prospective model validation or physical methane ground truth.

For pinned snapshot `unep-mars-ccd8267c55ee` (CSV archive SHA-256 `ccd8267c55ee93304f7135059b3c23247a6d9442edf0fa32a4b97fae08042ab2`; input SHA-256 `895a4ce26240080c28315eff106806e7b40e37c6ba8f328f787637a0d19fc0e0`), 3,057 of 4,213 sources had numeric persistency, all 4,213 had a persistency category, and none had `emissionStatus`. On the 3,057 matched numeric sources, Spearman rank association was 0.726; top-decile overlap was 149/306, with 157 recurrence-only and 157 persistency-only. Missing `emissionStatus` is unknown, not zero. Persistency categories are publisher metadata; “absent” does not mean no emissions. The model target remains a later linked archive record, not a methane leak or flux.

| Check | Result |
|---|---|
| `bun run check` | PASS — API and web TypeScript |
| API + PostgreSQL integration | PASS — 111 tests, 0 failed, 648 assertions; no database tests skipped |
| Web suite | PASS — 169 tests, 0 failed, 164,451 assertions |
| Audit verifier and benchmark runner | PASS — 9 tests, 0 failed, 53 assertions |
| Python pipeline suite | PASS — 119 tests |
| Solidity / Foundry | PASS — 4 tests, 0 failed, 0 skipped |
| Production build | PASS — MapPanel 1,121,936 bytes raw / 306.68 kB gzip; existing >500 kB raw chunk warning remains |
| Bundle budget | PASS — App entry 62,596 gzip bytes; 8 route chunks |
| Rules baseline reproduction | PASS — generated output matches tracked SHA-256 `44fad3fedcbc80bb9b9874540ee5ac5476383556fe11228a108bd74e4866bb96` |
| Snapshot output | PASS — SHA-256 `d9ed8a40180b37ffd8fffc3472ab84d4523c2d4683f4f07eec2d592f4f3426b7` |
| `git diff --check` | PASS |

A local Chromium smoke opened the real Evidence Auditor at `/dashboard/audit?sourceId=KAZ_S_159`, displayed the comparison metrics, expanded its category table, and inspected desktop plus 390×844 viewport rendering. Mobile `documentWidth` equaled 390 pixels with no horizontal overflow. The browser reported zero page errors and nine MapLibre/renderer WebGL `ReadPixels` warnings; some imagery tiles were unavailable and the existing fallback remained visible. These observations do not establish physical-device performance or public imagery reachability. The AI provider was not configured or called. Browser screenshots, the browser session, Vite/API processes, and isolated temporary audit store were removed after inspection.

The exact aggregate command was `CI=true TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55401/methane_test UV_CACHE_DIR=/tmp/methane-response-uv-cache bash scripts/check-local.sh`. It exited 0 against disposable `postgis/postgis:17-3.5-alpine` container `methane-response-local-gate-20261014-415`, using tmpfs for database files. The container was removed after verification. Baseline output was written to `/tmp/methane-response-baseline.Jp0Tsk`; its SHA-256 matched the tracked report. This gate is local evidence only, not GitHub Actions, cloud persistence, or a deployment test.
