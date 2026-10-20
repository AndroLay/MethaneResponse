# Investigation Capacity Planner — local evidence

19–20 October 2026 (Asia/Makassar). Local prototype increment on the existing working tree; no push, deployment, paid service, database or new on-chain publication. Earlier Decision Lab and Observation Cross-Check evidence remains unchanged. [Implementation plan](../../plans/2026-10-19-investigation-planner.md) · [User workflow](../../product/user-workflow.md#rencanakan-kapasitas-investigasi).

## What changed

Cases now offers **Plan investigation capacity**. Set 1–50 slots, country cap, country/sector scope and a historical recurrence weight. Compare four deterministic portfolios under identical hard constraints. Inspect selected/excluded records with 20-row pagination, allocation reasons and assumption sensitivity. Open the exact source in its case, map or Evidence Auditor; handoff clears hiding filters and confirms unsaved work once. Input changes invalidate pending/old output; unavailable API, invalid constraints, empty scope and unfillable quotas are explicit states.

Backend-only pinned input access, bounded request/rate limits, strict schemas and `no-store` responses. Geography is joined by exact source ID. Median flux/SD and distinct observation dates are recomputed from linked archive records, then checked against the existing intelligence summaries. No evidence documents, private notes, model secrets or signing keys enter this tool. No audit/reviewer/contract schemas or database migrations change.

## An actual, inspectable tradeoff

Snapshot `unep-mars-675417694883`: all **4,218 source rows**, **23,861 linked plume records**; historical coverage **2020-10-29–2026-09-13 UTC**. Unlinked plume rows are not silently assigned to sources. Default scenario: ten slots, at most two per country, 50/50 recurrence/magnitude, all countries and sectors.

| Application-defined strategy | Selected | Known countries | Known sectors | Median of selected source medians (kg/h) | Median distinct observed dates |
|---|---:|---:|---:|---:|---:|
| Weighted historical indicators | 10 | 7 | 1 | 10,538.5 | 47.5 |
| Median reported flux first | 10 | 6 | 1 | 214,707.25 | 1 |
| Observed recurrence first | 10 | 6 | 1 | 2,637.5 | 128 |
| Greedy geographic / sector breadth | 10 | 10 | 7 | 7,738 | 19.5 |

These are descriptive allocation tradeoffs, **not evidence that one portfolio delivers more repairs or climate benefit**. Numeric flux alone can emphasize sparsely sampled sources; broader coverage may trade away other indicators. The complete selections, reported median uncertainties, missing values and sensitivity outcomes are in [global-ten.json](proof/global-ten.json). The five saved scenarios also cover fifty slots, a restrictive Kazakhstan quota, waste-sector scope and an empty scope.

## Verification

- `bun run check:all`: frozen installation, TypeScript API/web/E2E/evaluation, **231 API + 261 web + 54 tooling + 217 Python + 4 Foundry = 767 main tests**, build and bundle budget passed. App entry **72,057 gzip bytes**, budget 75,000; eight existing required lazy chunks remain. New planner chunk: 23,819 raw / 8,072 gzip bytes. No dependencies added.
- **21 baseline + 9 private/team/publication/mock-AI = 30 unique browser scenarios**, plus five distinct runner helper regressions, passed without retries or skips. Browser evidence and exact totals are recorded in [checks.json](checks.json) and `browser-output.txt`. Tests exercise real local app/API interoperation, desktop/mobile, exact source case/map/audit handoffs, exclusions/pagination/export, stale responses, errors, unfillable quotas, cancellation and single confirmation. Mock-AI/reviewer scenarios are explicitly fixtures, not live provider validation.
- Five real-input scenarios compare **20 portfolios and 24 sensitivity allocations** with a separately implemented Python oracle. Every candidate projection is checked against the same normalized archive, including country/sector, source IDs, counts, dates, flux and reported SD. This is independent-language implementation conformance on the **same input**, not an independently labeled benchmark or user study.
- Six actual CLI runs: original with expected digest passes; edited output, edited + rehashed output, wrong expected digest, unknown flag and missing expected digest fail. See [CLI outcomes](cli-verification.json).
- Existing chain path: **one local Anvil integration test / 42 assertions**, covering historical audit compatibility, lost acknowledgment, crash recovery and independent verifier. This is separate from 767 main tests. Planner analyses are unsigned and are not anchored by this feature.
- Earlier frozen manifests: all 25 Decision Lab and 30 Observation Cross-Check artifacts retain their checksums. Source bindings in those earlier records remain historical.

The final browser checks force `NODE_ENV=production` for a fresh frontend build and isolated preview, rather than a development transform server. Sandbox and credential isolation remain enforced. [Desktop capture](planner-desktop.png) · [Mobile controls](planner-mobile.png) · [Mobile comparisons](planner-comparisons-mobile.png).

Evidence logs retain the exact final command results. An earlier browser attempt exposed an accessibility-label mismatch; explicit select labels fixed it. The new navigation regression initially retained the user's Excluded view in its test setup; the test now explicitly selects Selected before looking for a selected source. A concurrent browser launch found an occupied test port; dedicated ports resolved it. One browser run exposed hardcoded port 4179 in an older AI test; page requests now use the configured base URL, with non-default ports exercised. A new regression then demonstrated that local text/work-queue filters could hide a planned source after opening its dialog. The handler now clears those filters only after navigation is accepted; the production browser regression passes. Repeated dev-server and compiler attempts received SIGTERM; the host earlyoom journal reported low memory and full swap. Heap-limit and CSS-scan experiments did not resolve that condition and were reverted. The final main gate was rerun successfully with system Node in the invocation PATH. Browser verification now builds production assets before each isolated preview phase; no global runtime or memory policy changes are required. An initial preview retained the test harness’s development `NODE_ENV`; a new red/green runner regression now forces production specifically for the frontend build/preview. Earlier preview runs are excluded from the final scenario totals. These environmental failures are not counted as passing application tests.

## Reproduce

```bash
bun run check:all
bun run test:e2e
bun run prove:planner --output /tmp/NEW-planner-proof-directory
bun run prove:planner --verify docs/evidence/investigation-planner-2026-10-19/proof/global-ten.json --expected-digest TRUSTED_DIGEST
python3 services/data-pipeline/investigation_plan_oracle.py docs/evidence/investigation-planner-2026-10-19/proof/global-ten.json apps/web/public/data/mars-snapshot.json.gz
```

`--output` refuses an existing directory. The independently supplied trusted digest can be found in the frozen verification summary after authenticating that source separately. Source/runtime bindings and single-run timing/response-size measurements are in [verification.json](proof/verification.json). First scenario took 779 ms, subsequent scenarios 268–355 ms in this one local process, including serialization and policy replay. This is not a browser-device, concurrency, production latency or guaranteed performance benchmark.

## Scientific, trust and scope limits

One slot is an analyst's equal-effort assumption. Sampling opportunities differ. Date counts are not normalized leakage frequencies or UNEP persistency. Magnitude percentiles are pool-relative tied midranks; missing flux gives no magnitude ranking points and never becomes a zero measurement. Median reported SD is not uncertainty of a source median or a confidence interval. The weighted mean score in the replay is its own objective, not a neutral success metric for other strategies. Breadth uses a greedy marginal heuristic, not a guaranteed global coverage optimum. Unknown country is one quota bucket and never increases known-country coverage.

No discrete kg/h sums become avoided emissions. Feedback is not repair evidence; absence of later records is not zero emissions. Capacity/weight sensitivity measures analyst assumptions, not physical uncertainty or calibrated predictions. These flux/recurrence baselines are application-defined, **not the official UNEP Top 50**. Dataset provenance and CC BY-NC-SA 4.0 attribution remain in every exported report.

Full preview exports contain all candidates; configured public preview contains only three allowed historical sources, explicitly labeled. The checksum/replay cannot establish authentic publisher identity or physical truth. No assignments or requests are sent. A separate authorized human-reviewed investigation is still required before publication. Official Top 50 portfolio comparison, temporal window selection, cross-snapshot change radar, measured user benefit and prospective scientific validation remain future work. No competition outcome is guaranteed.
