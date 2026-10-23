# MethaneResponse score-readiness roadmap

> **Status refresh, 2026-10-15:** This document is retained as a dated evidence and planning archive. Its later sections contain older commits, score estimates, database-era gates, schedules and test totals; they are not current acceptance criteria. Follow the [current implementation status](current-implementation-status.md) for active work and tested state. The accepted prototype has no database requirement.

- **Updated:** 2026-10-15
- **Purpose:** Track evidence needed to make an internal target of at least 18/20 per criterion defensible. This is a project plan, not an official score prediction. Devpost publishes five qualitative criteria without numeric weights or an 18/20 threshold.

> **Current scope override (2026-10-15):** PostgreSQL/PostGIS, Supabase, cloud database persistence, migration work, and database deployment have been removed from the active prototype plan. This roadmap contains dated historical notes that mention those earlier experiments; they are not current tasks. The active direction is MARS-first local snapshots plus local JSON audit history, as recorded in the [scope decision](../architecture/decisions/2026-10-15-local-prototype-no-database.md).

For the task-by-task execution plan, expected artifacts, acceptance criteria, owners, dependencies, fallback paths, and revised estimates, see [`MASTER_EXECUTION_PLAN_2026-10-14.md`](../history/master-execution-plan-2026-10-14.md). This file remains the shorter status/evidence board.

## Current state

The local prototype uses the verified active MARS snapshot `unep-mars-675417694883` (4,218 sources, 30,414 plume rows through 2026-09-13 UTC), preserves earlier releases, and exposes source-bound observation geometry. Its deterministic claim-audit baseline, document-grounded assessment path, human review, immutable reports, and local hash verifier have local regression coverage. Chromium UAT covers source history → abstaining mitigation audit → API restart → digest verification, plus real marker selection, full-case handoff to Auditor, and changing the Auditor case through search. The 15 October browser workflows additionally cover mock AI assessment, exact citation, abstention, scoped review, private reports, and digest verification; they do not prove real-model quality. Seven screenshots and exact limits are recorded in [`live local UAT evidence`](../evidence/live-local-uat-2026-10-14/README.md). A separate rehearsal covers report export and CLI verification. Public `main` is now at [`547d445`](https://github.com/AndroLay/MethaneResponse/commit/547d445d6f52f8610c40a5a5b182aed308d7adf2); the exact revision passed all three jobs in [CI run 38668204968](https://github.com/AndroLay/MethaneResponse/actions/runs/38668204968). This proves source accessibility and automated checks, not submission readiness. The read-only `check_mars_upstream.py --verify-content` check compared both official archive byte streams with the active snapshot on 15 October: SHA-256, byte length, and Content-MD5 matched; no new release was imported.

The most recent full local gate in the 15 October checkpoint passed API/PostGIS **116 tests / 679 assertions / 0 skips**, web **180 / 164,729 assertions**, verifier/workflow **27 / 120 assertions**, Python **140**, Foundry **4**, typecheck, production build, bundle budget, and baseline reproduction. Subsequent focused changes and the earlier source commit [`f7effb6`](https://github.com/AndroLay/MethaneResponse/commit/f7effb6808e631881477f306a2e530326b9f5c0f) passed their listed regressions and CI run [38664825202](https://github.com/AndroLay/MethaneResponse/actions/runs/38664825202). Documentation commits [`582dd3b`](https://github.com/AndroLay/MethaneResponse/commit/582dd3ba5da5d6e4c0e8dcb28a0e0d1f30658c93) and [`75430c5`](https://github.com/AndroLay/MethaneResponse/commit/75430c5bfcde369ccf585671d9fdd3308ac0fa2a) also passed all three CI jobs; the latest CI retested the JavaScript/API/PostGIS/E2E, Poppler-enabled data-pipeline, and Foundry contract gates. The remaining score-critical evidence is external: rights-cleared human-adjudicated AI benchmark data, a live provider run, a judge-accessible deployment with durable storage, an independently verified testnet receipt, and a target-user pilot. Local checks establish software behavior, not real-world audit accuracy, user benefit, or methane reductions. The current public revision [`547d445`](https://github.com/AndroLay/MethaneResponse/commit/547d445d6f52f8610c40a5a5b182aed308d7adf2) adds visible same-snapshot/prospective-validation status to recurrence estimates and passed all CI jobs in [run 38668204968](https://github.com/AndroLay/MethaneResponse/actions/runs/38668204968).

## Phases and gates

Latest source/data evidence on 15 October: public `main` points to [`f4dd19f`](https://github.com/AndroLay/MethaneResponse/commit/f4dd19f2ccb7e598d4eefbd618539bcf37435720), and all three jobs passed in [CI run 38671495914](https://github.com/AndroLay/MethaneResponse/actions/runs/38671495914). This version adds the official Canada MARS report reference as link-only metadata, preserves the April observation as pre-report historical context, and leaves mitigation unconfirmed. Earlier source commits restricted legacy reviewer credentials to private-read/review scopes and added streamed MARS byte verification; details remain in the [execution checkpoint](../history/execution-checkpoint-2026-10-15.md). The remaining external gates are still the rights-cleared human benchmark, live AI provider, durable cloud deployment, independent Sepolia receipt, target-user pilot, physical-device validation, and final media/submission review.

| Phase | Status | Deliverable and acceptance evidence | Score connection |
|---|---|---|---|
| **0. Local foundation** | **Complete on active snapshot** | Active snapshot `unep-mars-675417694883` was checked against archive/gzip/decoded hashes, history, counts, unique IDs, row semantics and date range; earlier snapshots remain preserved. Historical and demo data stay distinct; the local workflow runs from source history through audit, review, report, and verifier. Latest API/web/Python/Foundry gates are recorded in the execution checkpoint. | Technical baseline; protects all criteria from unsupported claims. |
| **1. Evaluation reporting** | **Implemented; 151 full Python pipeline tests pass** | AI evaluator computes seeded, source-cluster 95% intervals for macro-F1 and citation precision, and a paired interval for AI-minus-rules macro-F1. One-source evaluations explicitly return no interval. It rejects documents reused across splits and gold citations to documents absent from a claim's inputs. Default: 400 replicates, seed `20261014`. The release gate enforces macro-F1 ≥0.80 and records all active thresholds. | Makes Innovation/Technical evaluation more transparent and prevents weak macro-F1 or document leakage from being treated as release-ready; it does not raise an AI score without benchmark data. |
| **2. Independent evidence benchmark** | **Protocol ready; 4 active casebook references rights-screened and 13 research-paper candidates inventoried; 0 cleared for provider input** | See [`AI_BENCHMARK_ANNOTATION_PROTOCOL_2026-10-14.md`](../testing/ai-benchmark-annotation.md) and [`MARS casebook document-rights inventory`](../research/mars-casebook-document-rights-inventory-2026-10-14.md). Kazakhstan, Libya, and Canada item pages list CC BY-NC-ND 3.0 IGO; Argentina's inspected item page does not show an item-level license. Thirteen paper candidates have visible open-license metadata, but no PDFs were downloaded and no provider-processing scope was cleared. Target: 40–80 held-out claims from 10–20 authorized documents, source- and document-disjoint splits, all three verdict labels, independent source inspection, exact accepted citations, and matched rules predictions. | Main gate for Innovation; also supports Technical Execution. |
| **3. Evidence workflow validation** | **Local workflow implemented; external evaluation pending** | Verify the local source → exact-citation validation → authorized human-review → immutable report → local digest workflow. Independently evaluate live AI only after documents are cleared and a labeled benchmark is adjudicated. A database/cloud deployment is outside the accepted prototype scope. | Main gate for Technical Execution; supports Practical Usefulness. |
| **4. Target-user pilot** | **Pending participant access** | Run a small formative pilot with researchers, auditors, or environmental analysts on real cases. Record task completion, assistance, errors, review time, provenance/citation completeness, and user feedback against a documented manual baseline. A small pilot is usability evidence, not a population-wide or emissions-impact estimate. | Main gate for Climate Impact and Practical Usefulness. |
| **5. Submission proof** | **Not ready** | Produce and review the required 3–5 minute demo, prepare the project description and architecture/limitations, complete license checks, and provide a current public repository revision as required by the event. Confirm the conflicting eligibility and submission-time instructions with the organizer. | Main gate for Presentation and submission completeness. |

## Progress log

### 2026-10-15 — recurrence validation disclosure and exact public CI

- Public `main` is at [`547d445`](https://github.com/AndroLay/MethaneResponse/commit/547d445d6f52f8610c40a5a5b182aed308d7adf2); all three jobs passed in [CI run 38668204968](https://github.com/AndroLay/MethaneResponse/actions/runs/38668204968).
- The recurrence estimate now exposes the same-snapshot development-holdout limitation and hides when evaluation-role provenance is absent. Web, typecheck, build, bundle budget and three Chromium workflows passed locally; the 390×844 label was visually inspected.
- No live provider, independent labeled AI benchmark, cloud PostGIS, Sepolia transaction, target-user pilot, or physical Android device was available/verified. Exact local boundaries are in the [15 October checkpoint](../history/execution-checkpoint-2026-10-15.md).

### 2026-10-15 — readiness roadmap and competition-source refresh

- Resynchronized the status board with the current public revision [`75430c5`](https://github.com/AndroLay/MethaneResponse/commit/75430c5bfcde369ccf585671d9fdd3308ac0fa2a). Its three GitHub Actions jobs passed in [run 38665750266](https://github.com/AndroLay/MethaneResponse/actions/runs/38665750266), including JavaScript/API/PostGIS/E2E, the Poppler-enabled Python data pipeline and baseline reproduction, and Foundry contracts.
- Rechecked the official [Devpost Overview](https://ieee-climatechain-hack.devpost.com/): it still says “Students only” and 17:00 MSK, while its About section also invites researchers and developers. A current direct read of [Rules](https://ieee-climatechain-hack.devpost.com/rules) returned 403. The exact observed inconsistency and unresolved status are recorded in [`event research`](event-requirements.md); eligibility and deadline remain unconfirmed.
- No product code, dataset, external service, account or submission was changed. The two local caption drafts remain untracked. External benchmark/provider/cloud/Sepolia/pilot/device/media gates remain open.

### 2026-10-15 — AI/reviewer browser workflow and public CI

- Added an isolated mock-provider browser path for document excerpt → exact citation → skeptical second pass → abstention → scoped reviewer decision → immutable revision → private report → export digest verification. The excerpt is explicitly synthetic and is omitted from the exported report.
- Hardened Playwright process boundaries with an allowlisted environment, disabled Bun dotenv autoload, and isolated Vite env loading. Regression tests cover filtering and file-specific phase routing; worker assertions check for ambient credentials. A full local run with disposable `GH_TOKEN`, `AI_API_KEY`, `DATABASE_URL`, and `VITE_TEST_SECRET` sentinels passed all 3 runner tests and both browser journeys.
- `bun run check` passed. At the 15 October public-main check, workflow commit `0f52ac280ffab8567e684e0ca19ccdff57e102dd` was present; its CI run [38606971136](https://github.com/AndroLay/MethaneResponse/actions/runs/38606971136) passed all three jobs on Ubuntu 24.04/Node 24. Application code commit `962fa4443a619c5ed1b96d855a5c7016a4472e45` passed [run 38604021117](https://github.com/AndroLay/MethaneResponse/actions/runs/38604021117).
- This improves evidence for local workflow integration and technical execution only. No real-model accuracy, legal document permission, real reviewer identity, cloud persistence, Sepolia receipt, user benefit, or physical emission reduction is established.

### 2026-10-15 — CI runtime and runner migration

- Updated the hosted workflow to Node 24-compatible action versions and pinned all jobs to Ubuntu 24.04 ahead of the `ubuntu-latest` migration window.
- Public CI run [38606971136](https://github.com/AndroLay/MethaneResponse/actions/runs/38606971136) passed all three jobs, including Chromium E2E. This hardens submission-week CI reproducibility; it does not change evidence quality or close external service gates.

### 2026-10-15 — Competition requirements rechecked

- The current Devpost overview still says “students only” and lists a 25 October deadline at 17:00 MSK; Rules list broader participant categories and say not to submit before 08:00 PT that day. Overview lists US$3,000 in prizes while Rules still say “Prizes TBD”. The schedule endpoint returned 403 on this read-only check; its last successful contents were recorded on 14 October.
- The updates page and the existing submission-window discussion were inspected. The visible thread contains participant questions about timing, blockchain, track selection, and the submission form, but no organizer answer was visible. No message was sent.
- These discrepancies remain a submission eligibility/timing blocker. Public project source and code CI are verified separately above; neither resolves the event rules.

### 2026-10-14 — WP-1/WP-2 current-state recheck

- Public `main` and anonymous GitHub `HEAD` both resolve to `59ac59e76d0ce59686ee783690ec0f99a15ae822`. The source release ancestor `37169ee` has a successful Actions run; no CI result is claimed for this documentation-only follow-up.
- Fresh official CSV/GeoJSON HEAD requests returned HTTP 200 and the same active ETags, lengths, `Content-MD5`, and `Last-Modified`. Local complete archives match the live `Content-MD5`, pinned SHA-256, size, ZIP CRC, and required CSV member checks.
- Devpost overview/schedule and Rules still conflict on the submission start/deadline by one hour and on participant eligibility. This remains an organizer clarification blocker; no message was sent.

### 2026-10-14 — WP-2 upstream archive revalidation

- Direct HEAD requests to the official UNEP CSV and GeoJSON download objects returned the same Last-Modified timestamp, ETags, byte lengths, and Content-MD5 values recorded in the active snapshot history.
- Recomputed local archive SHA-256 and MD5 values matched the active manifests for both files. The active dataset already contains this release, so no replacement snapshot or duplicate archive was created.
- A bounded CSV GET attempt stopped early and a later sequential retry timed out; those partial transfers were discarded. They do not invalidate the complete archive acquired earlier with ETag-pinned byte ranges and verified against the live size/Content-MD5 and the manifest SHA-256. Do not treat either partial response as an archive.
- The full offline data-pipeline suite passed **122/122**. The recheck does not indicate that the historical snapshot is live or that UNEP has an exact monthly cadence for the full combined source/plume archive.

### 2026-10-14 — WP-3 supplemental Chromium UAT

- Verified mouse selection through Libya's source clusters: individual marker `LBY_S_098` changed the selected case and URL, its full-case dialog opened, and the dialog handed the same case to Evidence Auditor.
- Verified the Auditor picker against the same pinned snapshot: searching `LBY_S_143` returned one match, and selecting it updated the source, evidence inventory, coordinates and URL.
- Captured screenshots 06–07 with SHA-256 in the UAT evidence README. The isolated API used a RAM-backed file store; no live provider, human reviewer credentials, cloud DB or chain was configured.
- Chromium recorded zero JavaScript errors and 38 software-WebGL/MapLibre warnings, including ReadPixels stalls. Physical GPU/mobile behavior remains untested.

### 2026-10-14 — Phase 1 implementation

- Added deterministic source-cluster bootstrap intervals for AI benchmark macro-F1 and exact-citation precision.
- Added paired resampling of identical source clusters for the AI-versus-rules macro-F1 difference.
- Added explicit `insufficient_source_clusters` status when fewer than two held-out sources exist.
- Added document-disjoint split validation and rejected accepted citation hashes for documents not supplied to that claim's model input.
- A regression fixture first demonstrated that macro-F1 0.5556 could pass the release gate when citation precision was 1.0; the evaluator now blocks that result below 0.80 and records the active thresholds.
- Focused evaluator tests: 13 passed; full Python pipeline suite: **67 passed, 0 failed** (`PYTHONPATH=. UV_CACHE_DIR=/tmp/methaneresponse-uv-cache uv run --no-sync pytest -q`).
- No provider was called, no report content was added, and no external service was changed.
- Benchmark corpus and labels remain absent, so no AI quality claim or criterion score has been increased.

### 2026-10-14 — Phase 2 rights screen

- Inspected only the three item landing pages linked by the local MARS casebook; no PDFs were downloaded or processed.
- Kazakhstan and Libya pages list CC BY-NC-ND 3.0 IGO. The Argentina page inspected does not show item-level license metadata.
- Recorded the results and exact next checks in [`research/mars-casebook-document-rights-inventory-2026-10-14.md`](../research/mars-casebook-document-rights-inventory-2026-10-14.md).

### 2026-10-14 — Benchmark output safety and upstream provenance refresh

- The billable AI benchmark runner now buffers only the bounded result set, writes it to a mode-`0600` temporary file, and publishes it atomically without overwriting an existing output. An exclusive sibling lock prevents simultaneous invocations from making duplicate provider calls. Failure tests verify that a mid-batch provider error leaves no prediction file or temporary artifacts; the provider is injected in tests and was not called live.
- The regression also verifies overwrite rejection happens before provider use, the complete output is mode `0600`, successful runs remove lock/temp artifacts, and output paths under public assets are rejected.
- Verification: `bun test scripts/run-ai-benchmark.test.ts` **5 passed / 33 assertions**; `bun run test:verifier` **7 passed / 45 assertions**; `bun run check` (API and web TypeScript) passed; `git diff --check` passed.
- The current UNEP catalog and dictionary were reread. The catalog describes monthly updates but exposes no publication timestamp/checksum in the page text; the current dictionary states that listed satellite classes were requantified after 2026-02-20. The local archive hash still matches the 2026-10-13 provenance. Refetching the official ZIP was blocked by DNS failure in this workspace, so the snapshot is latest locally verified, not asserted to be newest upstream. The official pages currently differ on license wording; the dataset-specific archive license remains the applied term.
- No billable AI provider, external database, deployment, blockchain transaction, or GitHub action was run.

### 2026-10-14 — Full local gate after runner hardening

- `UV_CACHE_DIR=/tmp/methane-response-uv-cache bash scripts/check-local.sh` exited 0. Frozen install had no dependency changes; API/web typecheck passed; web **161/161**, benchmark + verifier **9/9**, Python **117/117**, Foundry **4/4**, production build and bundle budget passed.
- API suite was **97 pass / 13 skipped / 0 fail / 552 assertions**; the skips require PostgreSQL. This is not a cloud database or fresh PostGIS integration result. Bundle warnings and browser/GPU limitations remain as documented in the execution checkpoint.
- No provider, cloud, chain transaction, GitHub Actions run, or new browser session was used. No criterion score or AI quality claim is increased by this gate.

### 2026-10-14 — PostgreSQL integration gate without skips

- Reran `bun run test:api` with `CI=true` and a disposable `postgis/postgis:17-3.5-alpine` database after the aggregate run had skipped DB tests. Result: **108 pass / 0 fail / 633 assertions**. The suite exercised persistent store reconnect/revision paths and cross-instance PostgreSQL quotas.
- Verified that the container was removed after the command. This closes the local PostGIS integration gate for the tested code; cloud persistence, backup/restore, public-origin browser path, and GitHub Actions on the working revision remain unverified.

### 2026-10-14 — Shared API write quotas and asset-rights inventory

- Added additive migration `0006_shared_api_rate_limits.sql` and an atomic PostgreSQL counter shared across API store connections. Audit writes use the existing 20/minute limit; document assessments use 6/minute.
- Keys are HMAC-SHA-256 pseudonyms scoped by endpoint and, for AI, a token fingerprint. Raw socket addresses and bearer tokens are not written to the database. Expired counters are pruned in bounded batches.
- Production health degrades and writes fail closed with HTTP 503 if the PostgreSQL limiter is available but its 32+ character `RATE_LIMIT_HASH_SECRET` is not configured, or the counter query fails. The deployment blueprint now declares the secret but has not been deployed.
- Regression evidence: the API unit suite covers missing-secret fail-closed behavior, shared keys across API instances, ignored spoofed forwarding headers, and backend outage. PostGIS integration tests cover concurrent requests through two independent database connections and two production API instances; see the execution checkpoint.
- The `public/assets/*.webp` bundle was inventoried by exact SHA-256 and source references. The files' redistribution rights remain unresolved; unused files remain unmodified and must be cleared or excluded before a public release. See [`interface asset rights inventory`](../research/interface-asset-rights-inventory-2026-10-14.md).
- Residual boundary: application quotas do not replace a gateway limit, and the true client IP behind the intended proxy has not been verified. No cloud service or external endpoint was changed.
- **Benchmark status remains blocked:** 0 of the 3 references are cleared for provider processing; the target corpus needs 10–20 authorized documents and independent adjudication.

### 2026-10-14 — Prospective recurrence cohort frozen

- Added `prospective_recurrence.py` to register source-level recurrence predictions against exact snapshot, archive, model/calibration, feature, and source-code hashes. Existing files cannot be silently replaced; an evaluation runner is ready for a later publisher release.
- Frozen 4,213 predictions from `unep-mars-ccd8267c55ee` for `(2026-09-12, 2027-09-12]`. v5 replays byte-identically: SHA-256 `b5c026828d2691ac327e5218ee1a020cf835bcf789ba13702f1d6951412f6742`; prediction hash remains `147d0075aaaf146536db933d31695c1d38e89f1286bf3b81ee49abc29ddb1906`. v4 remains preserved but is superseded because a review found its historical gate-result field contained thresholds rather than boolean results.
- Freeze rejects inconsistent model/calibrator-to-prediction values, wrong bootstrap seed, impossible cluster counts, invalid optimizer/calibrator metadata, inconsistent metric relationships, and malformed intervals. All 116 Python tests pass (47 recurrence tests); API/web typechecks pass.
- A full rebuild still produces 4,213 sources and exactly matches active artifact SHA-256 `15e7248a4efe480c057252fd0a396b305eaee7510468cfe825796d774ab74d`. v5 replay returns `already_identical`; same-snapshot evaluation returns `not_available` with 0 labels and is stored in the repository.
- The same-snapshot evaluator output is saved and hashed; it returns `not_available` with zero labels. This is expected abstention, not prospective accuracy. No future outcome has been opened or used; a qualifying later snapshot is not yet available.
- The retrospective development backtest remains a same-dataset, previously inspected holdout and must not be called prospective. See [`prospective recurrence registration`](../product/prospective-recurrence.md) for commands, metrics, artifacts, and limits.

### 2026-10-14 — full local gate rerun and event-page refresh

- Frozen install: 138 installs / 211 packages checked, no dependency changes. API/web typecheck, web **152/152**, verifier **4/4 (31 assertions)**, Python **117/117**, Foundry **4/4**, production build, and bundle budget all passed.
- API without a database: **93 pass / 10 skipped** (PostgreSQL integration only). Exact CI PostGIS image on a disposable loopback container: **101 pass / 0 skipped / 589 assertions**; the test container was removed afterward. This is local integration evidence, not cloud persistence or GitHub Actions.
- Production build warning remains for the raw 1,121,285-byte MapPanel chunk; its gzip size is 306.52 kB and the configured budget passed. Zod/Rollup annotation warnings are nonfatal. No physical-device FPS claim follows from this build.
- Devpost overview, schedule and Rules were directly reopened at 12:44 WITA. The Rules start-time instruction still lands one hour after the overview/schedule deadline, and eligibility remains inconsistent. GitHub could not be fetched by the available browser (cache miss); the owner reports public visibility, but current anonymous access is unverified. No organizer contact or submission was made.
- The active MARS gzip and intelligence snapshot SHA-256 values stayed unchanged. No browser session, external provider, cloud service, deployment, GitHub push, or chain transaction was run in this gate.

## Next actions

1. Obtain processing rights for source documents and independent human adjudication before creating benchmark rows.
2. Configure provider, database, reviewer identity, and testnet only with authorized credentials and any required cost approval.
3. Recruit pilot participants and record results; keep measurements anonymous and separate from methane measurements.
4. Complete and inspect the demo video and public submission package before the event deadline.

No phase completion implies a guaranteed judge score. The official rubric remains qualitative; only judge feedback can establish an actual competition score.

## Execution plan and time estimate — 2026-10-14

### Definition of done

“Complete” means the MVP can be independently tested and product claims are supported by appropriate evidence; it does not mean the system is bug-free or has proven emissions reductions. The 18/20 target per criterion is an internal readiness threshold, not an official organizer scale or score. Devpost publishes five qualitative criteria.

The closing conditions for that internal target are:

- **Climate Impact:** at least five target users complete a formative test on real cases; record task completion, errors, time, and assistance compared with the manual workflow. A small pilot supports usability/transparency only, not emissions-reduction claims.
- **Innovation & Creativity:** an independent benchmark of 40–80 claims from 10–20 authorized documents, separated by source and document, covering all three audit labels. Report macro-F1, citation precision, uncertainty intervals, false confirmations, and paired difference against the rules baseline. Internal thresholds: macro-F1 ≥0.80, exact-citation precision ≥0.90, and zero false-supported results on the limited set. If the model does not add value over baseline, do not claim AI improvement.
- **Technical Execution:** the end-to-end workflow from an accessible origin through observations, assessment, citation validation, human review, report revision, persistence after restart, and verifier must run; all relevant local gates must pass. If the demo includes blockchain, independently verify one testnet receipt from its event and digest.
- **Practical Usefulness:** target users can complete the core workflow without a technical operator; pilot results record success rate, time, errors, and feedback. A small sample must be identified as a pilot, not population-wide effectiveness evidence.
- **Presentation & Communication:** a 3–5 minute video shows one working workflow, explains the limits of historical data, AI, prediction, and blockchain, and matches the submitted revision/build.

### Work packages, gates, and duration

Durations below are **engineering workdays**; waiting time for permissions, accounts, reviewers, participants, and services is separate. Some packages can run in parallel after initial gates.

| Order | Package and completion criteria | Current status | Estimate |
|---|---|---|---:|
| 0 | **Competition/access gate:** organizer confirms opening/closing time and participant eligibility; a lawful document path and reviewer/pilot schedule exist; the revision to be judged is accessible without login. | **Not closed.** Submission-window and eligibility conflicts still need an official answer. Source release 37169eeb35de5ad4e3217f08ae2ab8d9ccffa48d was pushed; anonymous no-credential git ls-remote demonstrated that public main is accessible. GitHub Actions passed. Final video, reviewer/pilot schedule, and submission proof are missing. | 0.5–1 workday + external wait |
| 1 | **Independent evidence benchmark:** select 10–20 documents with clear processing/quotation rights; two reviewers label claims and exact citations; adjudicate; split train/dev/test by source and document; run AI and baseline with the existing evaluator and intervals. | **Protocol and evaluator available; corpus absent.** 0 of 3 reviewed references are cleared for provider input. | 5–8 workdays after licensed sources and reviewers are available; permissions may take an unknown amount of time |
| 2 | **Live service and persistence:** configure the backend provider, Postgres/PostGIS, reviewer authentication, and approved deployment; demonstrate cold start/restart and end-to-end workflow on the target origin. | **Not configured.** Credentials and service target are not available in the checked repository. | 2–3 workdays after access |
| 3 | **External blockchain verification:** only if used as demo evidence; with owner authorization, configure issuer/RPC, anchor a reviewer-approved report, then match receipt, event, and digest using an independent verifier. | **Contract tested locally; Sepolia unproven.** No transaction was sent. | 1–2 workdays after authorization and testnet account access |
| 4 | **Benefit and usability pilot:** recruit at least five target users; run the same task in the manual and MethaneResponse workflows; record time, success, errors, assistance, and comments; state generalization limits. | **Not run.** Participants are unavailable. | 2–4 workdays for sessions/analysis + about 2–7 calendar days for scheduling |
| 5 | **Device, map, and recovery validation:** inspect desktop and physical phone if available; measure only metrics that can actually be recorded; test imagery/provider failure and retry; do not claim FPS without a measured device/GPU. | **Local Chromium browser passed; GPU acceleration and physical devices are unverified.** | 1–2 workdays if devices are available |
| 6 | **Freeze and submission:** rerun all gates, check asset attribution/permissions, ensure judges can open the source revision, record/review a 3–5 minute video, match build, URLs, screenshots, and claims, then submit through the participant account. | **Not ready.** Public repository was demonstrated only at an older commit; active changes were not published. Video has not been made and asset permissions/attribution need review. | 1.5–2 workdays after demo content stabilizes |

### ETA and scenarios

- **Estimated work for evidence-backed internal targets:** about **14–22 engineering workdays**. If access, documents, reviewers, and participants are immediately available, the most likely calendar time is around **4 weeks from 14 October 2026 (about 11 November 2026)**; a reasonable range is **3–6 weeks (about 4–25 November)** because some work waits on external parties.
- **Submission package before the date shown by Devpost:** about 11 calendar days remained as of 14 October. The realistic goal in that time is an honest, locally tested demo/entry; it is not safe to promise a complete independent benchmark, pilot, and live service unless all external access is available immediately. Clarify the deadline and opening time first because the checked pages were inconsistent.
- **If document rights, provider/database, or participants are unavailable:** target dates move with those prerequisites. No accurate completion date can be promised for permissions and recruitment before external responses arrive.

Dates are work plans, not score promises. The 18/20 figure cannot be guaranteed: the official rubric does not publish those weights or a numerical scale, and only judges set scores.

### Execution priorities

1. Close Gate 0: ask the organizer to confirm rules/timing and verify repository access without login; the owner reports that the repository is public.
2. In parallel, identify alternative documents with clear rights for processing and quotation; schedule two reviewers and five pilot participants. Do not send report content to a provider before the rights for that use are obtained.
3. Complete the benchmark and live workflow only when prerequisites pass; retain abstention when citations or evidence are insufficient.
4. Anchor on testnet only after authorization; blockchain evidence remains limited to integrity and chronology, not physical mitigation truth.
5. Freeze the demo based on results actually tested, then complete the video, attribution, repository access, and submission.

## Optimized work schedule — 14–25 October 2026

### Capacity assumptions and focus

- Planned capacity: one engineer with **5 focused hours per day** through 24 October. That provides about 55 hours; 20% (11 hours) is reserved for fixes and submission issues, leaving about **44 planned work hours**.
- In this estimate, one engineering workday is one five-hour focus block. The full evidence target needs about **14–22 blocks (70–110 hours)**, plus external wait time. With 44 hours available before the deadline, it is not realistic to promise all 18/20 gates by 25 October. Work before the deadline focuses on one demonstrable workflow; an independent benchmark, pilot, cloud service, and Sepolia are included only if prerequisites are actually available.
- Avoid new visual/feature changes after **22 October** unless there is a P0/P1 bug or the primary workflow fails. Reserve 24 October for judge access, final fixes, and a dry run; do not use the deadline date as a build day.
- Start items waiting on people/permissions first and run them in parallel. Do not send document content to AI or claim a pilot before permissions/results exist.

### 44-hour budget through release candidate

| Work block | Deadline | Budget | Priority |
|---|---|---:|---|
| Event rules, public-repository access, asset/document rights, and demo-case choice | Start 14 Oct; corpus decision 16 Oct | 4 hours | Avoid ineligible submission or unauthorized material use. |
| Local workflow audit from snapshot through verifier and P0/P1 blocker fixes | 17–19 Oct | 12 hours | Keep the demo repeatable even when external services are unavailable. |
| Provider/PostGIS and auth review if owner access is available | 18–20 Oct | Up to 8 hours | Only if credentials/target are available; otherwise use the time for local-workflow hardening and service-limit documentation. |
| Scheduled user test or test-protocol preparation | 20–22 Oct | Up to 5 hours | Run sessions only with real participants; if there are too few, keep the protocol and report the pilot as pending. |
| Video, description, attribution, runbook, and submission dry run | 23–24 Oct | 10 hours | Record the video from the release candidate; any later revision requires rechecking. |
| Incident, network, browser, or submission-form buffer | 14–24 Oct | 5 hours | Do not reallocate this time to new features. |

Planned work budget: **44 hours**. No artificial time slot is assigned to a complete AI benchmark on the deadline path: the benchmark is complete only after the corpus, independent annotations, and full evaluation results exist. If reviewers work in parallel and all licensed material is available, benchmark results may be included in the submission only after every acceptance criterion passes.

### Organizer clarification ready to send

The owner can send this question through an official Devpost channel. It has not been sent from the workspace.

> Hello, could you please confirm the submission window and eligibility rules in writing? The event overview lists October 25, 2026 at 5:00 PM MSK, while the Rules page says not to submit before 8:00 AM PT on October 25. Please confirm the exact opening and closing timestamps in UTC. The overview says “students only,” while the Rules page also lists researchers, faculty, independent developers/startups, and environmental professionals. Could you confirm whether an individual participant residing in Indonesia is eligible and whether any country restrictions apply? Finally, are a public source repository and a 3–5 minute demo video required for every submission?

### Pre-deadline submission path

| Date (WITA) | Main focus | Required saved output | Decision gate / fallback |
|---|---|---|---|
| **14 Oct** | Lock one demo workflow: choose a historical source with traceable observations and geometry; inventory claims that can/cannot be supported. Prepare event clarification questions for the owner to send through an official channel. Start scheduling potential reviewers/pilot. | Five-step workflow script, evidence and claim-limit list, blockers with owners and decision dates. | If eligibility or submission window is unclear, record the risk; do not assume the rules. |
| **15 Oct** | When connectivity is available, verify public-repository access from a logged-out session; check run instructions, asset licensing/attribution, and demo links. In parallel, inventory documents with clear processing rights and request access/service confirmation if they will be used. | Public-access evidence (URL/clone result without token), licensed-asset list, candidate documents with rights status, and required credentials list without secrets in the repository. | If GitHub access cannot be checked from the workspace, the owner stores logged-out browser/clone evidence; status remains “reported public” until verified. |
| **16 Oct — Gate A** | Decide the corpus: document rights, two independent reviewers, and enough cases to annotate. Run the benchmark only if all requirements are available. | If passed: licensed labeled dataset, source/document splits, baseline and AI report with intervals. Otherwise: record that no benchmark exists. | Without licensed documents and independent labels, **AI remains inactive/unvalidated**; demo uses rules baseline, available quotations, or abstention. Do not lower evaluation thresholds to make it pass. |
| **17–19 Oct** | Reproduce the hero workflow locally from MARS data through source details, history, permitted evidence submission, human review, report revision, export, and verifier. Fix only workflow failures. Run a limited benchmark if Gate A passes. | Step recording, API/web/Python/Foundry/verifier gate results, browser screenshots, relevant failure/retry logs. | If no provider is available, use a clearly labeled local mode; do not describe a mock as live AI. If real documents lack rights, show MARS metadata and insufficient evidence status. |
| **18–20 Oct — Gate B** | If owner credentials are available, connect one Postgres/PostGIS target and backend provider; test restart, reviewer auth, CORS/origin, and draft privacy. Begin previously scheduled pilot sessions in parallel. | Test-environment URL, evidence of persistence after restart, auth/browser-flow results, anonymous pilot result forms if any. | Without credentials/authorization, remain on the tested local file store/disposable PostGIS; state cloud and provider are unverified. Without five participants, mark the pilot pending and do not claim user benefit. |
| **20–22 Oct — Gate C and feature freeze** | Complete available user sessions; measure task completion, time, errors, help needed, and comments. Test desktop/mobile browser, map fallback, and recovery. Use Sepolia only if authorization and a testnet account are ready. Freeze features on 22 October. | Pilot summary with sample size/limits, browser/device report, independent transaction evidence if any, remaining bug list and freeze decision. | Without a physical GPU/device, report browser/software-rendering tests only. Without a transaction, keep verifier local; do not present a demo receipt as a real transaction. |
| **23 Oct** | Record a 3–5 minute demo video from the frozen build. Tell one case/claim story; show source/date/uncertainty, review result, and digest verification. | Video draft, submission description, attribution, and limitations list. | Do not include steps that only work on the developer's machine and cannot be reproduced by judges. |
| **24 Oct — Release candidate** | Full dry run from a clean browser/another device; test repository access, install instructions, links, video, metadata, and claim consistency. Save the build/hash shown. Keep this day as buffer. | Release checklist with pass/fail, final video, project description, public repository URL, and revision/demo manifest. | Fix only submission blockers or bugs that break the workflow. A post-recording change requires the video and related checks to be repeated. |
| **25 Oct — Submission window** | Submit through the participant account only after the valid window is confirmed; do not wait until the last minute. | Verifiable submission proof and timestamp. | Overview lists 17:00 MSK, while Rules prohibit submission before 08:00 PT on the same date. Ask the organizer; do not guess the applicable window. |

### Evidence order to protect time

1. **Required for the demo:** historical MARS case with ID, date, location, flux/uncertainty when available, data source, and statement that the feed is not live.
2. **Required for a mitigation claim:** document with clear usage rights, exact quotation, quotation validation, reviewer status, and abstention when evidence is insufficient. If no document is available, the demo stops at “mitigation evidence is insufficient.”
3. **Required for result integrity:** versioned report, SHA-256 digest, and local verifier. Claim Sepolia only if a real transaction/event exists.
4. **Required for submission:** 3–5 minute video, public repository judges can open, track/target-user/impact description, attribution, run instructions, and limitations matching the demo build.
5. **Do not do before release candidate:** extra features, globe redesign without a measured bug, new forecasting model, or deployment requiring unavailable accounts/cost/permissions.

### Post-submission path toward evidence-backed targets

After submitting the demo, continue score-critical blockers in dependency order instead of adding unrelated features:

1. **Corpus and benchmark (5–8 workdays after permission):** 10–20 clearly licensed documents; two reviewers; 40–80 claims; source/document-disjoint splits; run rules and AI on identical claims; store dataset version, seed, intervals, and review errors.
2. **Live origin (2–3 days after credentials):** server-side provider, Postgres/PostGIS, reviewer auth, migration, persistence across restart, and browser check from an origin judges can access.
3. **Pilot (2–4 days for sessions/analysis + scheduling):** at least five target users; compare the core task with manual baseline; publish only anonymous results and sample limits.
4. **Sepolia and real devices (1–2 days each, after access):** anchor only an approved report; match receipt/event/digest; measure map on available physical GPU/device.
5. **Regression and evidence package (1.5–2 days):** rerun affected checks, audit submission claims, save runtime evidence and limits.

This plan treats the submission date and full development target as separate goals. If an external prerequisite is unmet, independent work can proceed; pending status is recorded without substitute evidence.

### Post-hackathon product completion

Hackathon completion is not production readiness. If the product will be used beyond a demo, add these separate gates after benchmark/live/pilot work:

- **Operational security:** per-user reviewer identity, report ownership, cross-replica rate limits, access audit logs without secrets, secret rotation, backup/restore testing, document retention/deletion policy, and incident handling.
- **Prediction:** keep priority scores as heuristics until a later MARS snapshot is available for prospective evaluation. Freeze predictions before follow-up, compare with MARS persistence/status indicators, and report coverage/calibration only when supported by labels; do not call leak probability calibrated without independent validation.
- **Climate impact:** measure traceability/workflow improvement separately from emissions outcomes. Methane-reduction claims require physical follow-up evidence and longitudinal attribution design; application use alone does not prove reduction.
- **Service readiness:** load and provider-cost limits, error/latency monitoring, backup/recovery, accessibility, phone compatibility, and data/imagery licensing on the actual deployment.

This post-hackathon package needs its own estimate and deployment decision. It does not change the claim limits or release-candidate criteria above.

## Owners, prerequisites, and closure evidence

### Responsibilities

| Role | Responsibility | Access/decision limits |
|---|---|---|
| **Codex/repository engineer** | Audit the source, make necessary code changes, maintain the evaluator/documentation, run local gates and browser flows, and record results. | Do not contact organizers/participants, change repository visibility, deploy, send documents to a provider, or make transactions without separate authorization. |
| **Project owner** | Send rule questions through an official channel, confirm submission from their account, arrange provider/database access if selected, recruit reviewers/pilot users, and decide on cost/visibility. | Supply credentials through a secure secret manager/environment; do not put them in Git, prompt logs, or `VITE_*`. |
| **Two independent reviewers** | Label claims and quotations without seeing each other's labels; resolve disagreements through documented adjudication. | Use only documents whose processing, quotation, storage, and redistribution rights are clear. |
| **Pilot users** | Complete the same task in the manual and MethaneResponse workflows; provide voluntary feedback. | Anonymize participant data; five participants are a formative pilot only and do not prove population-level benefit. |
| **Organizers** | Provide written answers to conflicts about timing, eligibility, and deliverables. | Do not assume how rules apply until a written answer or participant form resolves the conflict. |

### Prerequisites with decision dates

| Prerequisite | Action owner | Decision deadline | If unavailable |
|---|---|---|---|
| Confirmed opening/closing time and eligibility | Project owner sends the clarification draft above; retain the answer/form | **15 Oct** | Submission remains at risk; prepare the package on 24 Oct and do not rely on conflicting times. |
| Anonymous repository access and asset licenses | Engineer tries an anonymous clone/read when network is available; owner may provide logged-out browser evidence | **15 Oct** | Record as unverified; replace/remove assets without clear rights before the final package. |
| Documents for benchmark and AI use | Engineer checks licenses/permissions; owner obtains written approval if terms are unclear | **16 Oct** | Do not release an AI benchmark; use the rules baseline and abstention. |
| Two independent reviewers | Owner schedules the reviewers and one adjudicator | **16 Oct** | Make no independent-benchmark claim; continue other tooling and submission work. |
| Provider/PostGIS/demo origin | Owner selects the service and configures secrets securely | **17 Oct** | Run the local workflow; mark provider/cloud as inactive. |
| Five pilot users and test devices | Owner arranges sessions and available devices | **18 Oct** | Mark pilot/physical-device work pending; do not substitute internal evaluation. |
| Sepolia issuer/RPC and transaction authorization | Owner authorizes and prepares a testnet account | **20 Oct** | Do not anchor; demo only the local verifier and explain the digest. |

Decision dates are cutoffs for choosing a path, not promises that external parties will respond. After a deadline, use the recorded fallback so local work can continue.

### Final verification gates that must produce artifacts

| Gate | Check | Evidence artifact to retain | Pass condition |
|---|---|---|---|
| **Data** | Validate the snapshot hash/manifest; check source ID, UTC date, coordinates, units, uncertainty, and historical-versus-demo labels. | Check log, snapshot ID/hash, and sources/dates shown in the demo. | Map, case details, and report use the same snapshot; missing data is not treated as zero. |
| **Audit** | Run cases with a valid quote, a mismatched quote, an unavailable document, and conflicting evidence. | API/browser result and report revision ID. | Exact quotes are bound to input; the system abstains without evidence; `feedback` is not repair evidence; report changes create a new revision. |
| **Persistence/reviewer** | Save an audit, stop and restart the process; try reading a draft without a token, with a wrong token, and with a valid reviewer token. | Restart/read-permission log and HTTP status results. | Revisions remain; unauthorized access does not expose content; authorization is not granted by UI alone. |
| **Integrity** | Export a report, validate its digest, change one byte/field, and verify again. If Sepolia is active, match the transaction receipt, event, issuer, and bundle hash. | Export file, digest, verifier output, and tx hash if real. | Changes are detected; local/testnet/public labels are distinct; receipt proves only integrity/version order. |
| **Browser** | Run the main flow on desktop and a 390×844 viewport; check map, case selection, evidence panel, audit, review, report, verifier, and tile/API fallback. | Screenshot from an actual browser, version/build, console/network error summary. | Main flow is repeatable without blocking errors or overflow; imagery/provider failure shows a clear fallback. |
| **Repository quality** | Run `bun install --frozen-lockfile`, `bash scripts/check-local.sh`, then `bun run check:web-bundle`; repeat affected gates after each fix. | Dated concise output and pass/fail status for every command. | All gates pass or each failure/blocker is recorded and not presented as a pass. |
| **Submission** | Check the public repository without login, project description, track, attribution, 3–5 minute video, and submission form from the owner's account. | Checklist, URL, video duration/hash, submission confirmation/timestamp. | All links are accessible, video matches the build, claims match evidence, and the timestamp is within the confirmed window. |

For the pilot, the proposed formative threshold is **at least 4 of 5** participants completing the core task without facilitator help. Report median time, errors, and assistance together with the participant count; this threshold is an internal evaluation rule, not a guarantee of an 18/20 score or general statistical evidence.

### Status board as of 14 October 2026

| Gate | Status based on available records | Next action |
|---|---|---|
| Data and local flow | **Local PASS for MARS → PostGIS → restart → report → verifier.** Browser selected `KAZ_S_159`, rules baseline abstained on the mitigation claim, audit/hash survived API restart, and export separated three historical observations as context. | Repeat on the release candidate and public origin; do not equate local status with live AI or verified mitigation. |
| Evaluator | **Tooling PASS; 117 Python pipeline tests passed in the 14 Oct rerun.** No independent gold set or provider run yet. | Produce benchmark results only after permitted documents and independent annotations are available. |
| GitHub | **Owner reported it public; remote access was not verified in this session.** Base workspace points to `AndroLay/MethaneResponse`; active local changes were not confirmed published. | Test anonymous clone/read and align the release-candidate revision before submission. |
| Document rights | **BLOCKED for 3 screened references; 0 cleared for provider input.** | Find clearly licensed alternatives; request permission if needed. |
| Provider and cloud database | **Not configured/UNVERIFIED live.** | Owner selects a target and prepares secrets; test cold start and persistence after restart. |
| Sepolia | **No live registry address/transaction receipt.** | Use only after authorization; if not ready, do not show on-chain status. |
| Pilot/physical device | **No recorded user session/physical GPU performance.** | Schedule five participants and a device test; report the gap if unavailable. |
| Submission | **No video or submission timestamp yet.** Window and eligibility need clarification. | Freeze on 24 Oct; submit only at the confirmed time. |

### Latest local quality gate — 14 October 2026

`bash scripts/check-local.sh` passed with disposable PostGIS active: API 108 tests / 633 assertions / 0 skipped; web 164 / 164,424 assertions; verifier 9 / 53 assertions; Python 117; Foundry 4 / 0 skipped; typecheck, build, bundle budget, and reproducible baseline passed. Run details and limits are in the [`local quality gate evidence`](../evidence/local-quality-gate-2026-10-14.md). This strengthens local implementation evidence; it does not prove remote CI, cloud, an AI model, blockchain receipt, user benefit, or emissions reduction.

### Daily progress reporting format

Record one row per date with these columns: **today's plan · actual output · evidence path/link · gate PASS/FAIL/BLOCKED · hours spent · blocker and owner · next 24-hour action**. Do not use an aggregate percentage; count gates that actually PASS and show blockers separately. If a result depends on an external service, mark it `LOCAL`, `LIVE`, or `UNVERIFIED`.

### Progress update — repository visibility

- Owner reported that the GitHub repository is public.
- Metadata check through GitHub CLI from the workspace failed because `api.github.com` was unreachable. No GitHub changes were made here.
- Working status: **reported public; anonymous/judge access and asset redistribution rights still need verification**.

### 2026-10-14 — Map cold run and imagery fallback

- Ran five new headless Chromium contexts at desktop 1280×800 and mobile viewport 390×844. Median MapLibre-ready status was **1,069 ms** and **1,022 ms**, respectively; each opening measured about **5.96 MB** of browser resources. This used a development server and software WebGL, not a GPU/physical-device benchmark or production CDN.
- Reproducing failure of all Esri tiles showed that the case remained selectable but there was no explanation for failed imagery. Added an accessible notice and retry; helper tests went red/green, and the browser showed that source/coordinates remained available and the notice appeared. When the external service still failed after retry, the notice remained; provider recovery is not claimed.
- Gates: typecheck, web **161/161**, production build, and bundle budget passed. Per-run details, resources, long tasks, fallback, and screenshots are recorded in the [`execution checkpoint`](../history/execution-checkpoint-2026-10-14.md) and [`map cold-run results`](../evidence/map-performance-cold-runs-2026-10-14.json).
- Next on the local path: evaluate 257–374 ms long tasks if valid profiling time is available; physical tests still require a real phone. External gates for a permitted benchmark, cloud services, reviewer/pilot, Sepolia, and submission remain pending as shown above.

### 2026-10-14 — Browser evidence for AI-review revision and private persistence

- The Evidence Auditor flow on a labeled synthetic fixture produced an exact quote and `insufficient_evidence` verdict; a reviewer test requested more evidence, so the report became revision 2 without being promoted to `supported`.
- API restart retained both revisions in the local file store. Private-scope, no-store-header, wrong-scope-token, parent-hash, two-reviewer-decision race, and valid/tampered export tests returned expected results. Detailed evidence is in the [`execution checkpoint`](../history/execution-checkpoint-2026-10-14.md).
- This strengthens evidence for local code-flow technical execution/usefulness; it does not strengthen evidence for AI accuracy, climate impact, or user validation. The provider was a loopback mock; the reviewer identity was a test identity; the file store is not cloud storage; no blockchain receipt exists.
- Next status: the rules-baseline result remains the only available comparative basis for AI. An empirical AI-benefit claim requires documents with clear rights, independent annotations, evaluation on the same examples as the baseline, and then a target-user pilot.

### 2026-10-14 — Baseline provenance updated

- The rules evaluator and intelligence fixture are now bound to the 13 October MARS snapshot (`unep-mars-ccd8267c55ee`); the report includes benchmark/casebook hashes and full provenance metadata. The report and reproducibility tests are in `services/data-pipeline/reports/baseline-evaluation.json` and `services/data-pipeline/tests/`.
- Active Python gate: **117/117 passed**; verifier **4/4 passed**. Baseline scores are not AI evidence: 15 claims (9 real, 6 DEMO), real macro-F1 **0.6667**, and the `contradicted` label remains unrepresented in the real subset.
- Next priorities are unchanged: add a permitted corpus and independent labels before evaluating an AI model; prepare an origin/provider and pilot only when the owner supplies access and required approvals.

### 2026-10-14 — Local release-gate rerun

- Aggregate gate `scripts/check-local.sh` ended at **exit 0**. Typecheck, 161 web tests, 4 verifier tests, 117 Python tests, 4 Foundry tests, production build, and bundle budget passed.
- API: 97 passed; 13 PostgreSQL tests were **skipped** because no DB connection was available in this run. The sandbox denied access to the Docker socket, so I did not create a new container; those tests do not count as passed in this rerun. Disposable PostGIS results from an earlier checkpoint remain separate local evidence, not a cloud service.
- Build still logged a warning that the raw MapPanel chunk exceeded 500 kB; gzip size and the configured budget passed. Physical GPU, GitHub Actions on local changes, AI provider, cloud Postgres, Sepolia, pilot, and emissions impact remain unverified.

### 2026-10-14 — Expanded benchmark-rights shortlist

- Review of primary Copernicus pages added eight candidate text works; the inventory now has **13 shortlisted documents/works** and notes visible licenses and cases suitable for claim-level review.
- No candidate is automatically cleared for provider use, and document count is not source-cluster count. The benchmark still needs rights for each use scope, provider review, 40+ held-out claims, two independent annotators, and adjudication. No PDFs/supplements were downloaded and no provider was called.
- Detailed notes, links, and limits for each candidate are in the [document-rights inventory](/home/andro/dev/projects/Devpost/iEEE-Methane-response/docs/research/mars-casebook-document-rights-inventory-2026-10-14.md). AI remains behind the rules baseline until the benchmark meets the protocol.

### 2026-10-14 — PostGIS browser E2E and report context

- In the local application, `KAZ_S_159` loaded from the UNEP MARS snapshot `unep-mars-ccd8267c55ee`; three historical plumes were shown. The same mitigation claim ran through the rules baseline and returned `insufficient_evidence`, not successful mitigation.
- The audit was saved to disposable PostGIS and read again after API restart with the same audit ID and bundle SHA-256. The browser opened revision history and exported JSON; the CLI verifier accepted the bundle with chain status `ABSENT`.
- Export now carries three observations in `historicalContext`, marked `context_only_not_claim_evidence`; `observations` remains empty because the mitigation audit has no detection citation. The browser verifier shows the context count. Changing a flux value in the context caused the export checksum to be rejected. A snapshot mismatch removes both observation sets.
- Before the historical status indicator change, web **163/163**, verifier **9/9**, typecheck, production build, bundle budget, and `git diff --check` passed. That result is superseded by the latest rerun above with web 164/164. The raw MapPanel chunk warning remains at **1,121.94 kB**; the configured gzip limit passed.
- This demonstrates the local software flow and persistence in a temporary container, not cloud PostgreSQL, an AI provider, an independent reviewer, Sepolia, or mitigation impact. Next gates remain corpus rights and independent labels, the deployment selected by the owner, a user pilot, and chain evidence only after authorization.

### 2026-10-14 20.50 WITA — Public base and release-candidate gate

- Anonymous `git ls-remote` showed that `HEAD` and `main` of the public repository pointed to `99662e6de86b1d745e6ce3589ce37a9ed6c0d66c`, matching the local base; working-tree changes had not been published.
- Comparison against the initial manifest recorded 338 status paths when each untracked file is counted separately, 34 paths outside the manifest, 20 baseline files with changed size/hash, and no missing baseline entries. All changes were retained. The high-confidence scanner for private-key headers and GitHub/AWS/OpenAI/Stripe/Slack tokens found 0 candidate files; pattern scanning is not a universal guarantee.
- `bun install --frozen-lockfile` did not change dependencies. The aggregate gate initially failed with `EDQUOT` while writing the file store in `/tmp` without temporary-directory configuration; the API suite and two related assessments passed with `TMPDIR=/dev/shm`. `TMPDIR=/dev/shm bun run check:all:postgis` then exited 0, with API/PostGIS **112/112 (649 assertions, 0 skipped)**, web **174/174 (164,716 assertions)**, verifier **20/20 (96 assertions)**, Python **122/122**, Foundry **4/4**, typecheck, production build, and bundle budget.
- Asset guard **2/2 (23 assertions)** passed, and 0/10 assets without redistribution permission appeared in production `dist/assets`. Nine tracked files were removed from the local revision; no force-push was done, so files remain accessible in historical commits.
- Estimated changed file payload was about **57.5 MB**. The licensed browser snapshot remains included; raw archives are excluded. GitHub CI for the candidate revision and all live services remained unverified.

### 2026-10-14 21.08 WITA — Source release published and CI verified

- Commit `37169eeb35de5ad4e3217f08ae2ab8d9ccffa48d` was pushed to public `main` as a fast-forward from `99662e6`. GitHub Actions run [38569058427](https://github.com/AndroLay/MethaneResponse/actions/runs/38569058427) for that commit ended with `success`.
- `git ls-remote`, with system/global Git config, credential helper, and HTTP extraheader disabled, returned the same commit for `HEAD` and `refs/heads/main`; `git status --short` was empty after the push.
- The release contains implementation, licensed browser data, migrations, tests, documentation, and browser evidence. Nine UI assets were removed from the current tree; eight PNG mockups were stored locally and ignored. Older history was not rewritten, so files published previously remain accessible in earlier commits.
- This closes public-source access and remote CI for the source release, not competition submission. Schedule/eligibility conflicts, video, AI provider/benchmark, cloud database, Sepolia, pilot, and device measurement remain open.

### 2026-10-15 — Matched WebGL measurement, public CI, and submission recheck

- Added separate `--browser-mode=headless|windowed` selection to the map benchmark. On exact runner revision `f5a832c`, five fresh contexts per desktop/mobile viewport used one windowed display, Chromium 153, and the same pinned MARS snapshot. Renderer identity was verified as SwiftShader in all 11 software contexts and AMD Radeon 680M in all 11 system-renderer contexts.
- Median readiness was SwiftShader **2,544 ms desktop / 1,831 ms mobile viewport emulation** versus Radeon **1,732 ms / 1,703 ms**. Maximum Long Task was **452/130 ms** versus **75/80 ms**. Normal samples had no page errors, overflow, or failed requests. Encoded bytes varied, caches were not reset, and the order was sequential; these results do not isolate GPU causation, prove FPS, or represent physical mobile hardware. Per-run evidence and these limits are in the [checkpoint](../history/execution-checkpoint-2026-10-15.md) and the [software](../evidence/map-performance-software-windowed-2026-10-15.json)/[Radeon](../evidence/map-performance-amd-radeon-680m-windowed-2026-10-15.json) reports.
- Commit `b9c18f562eca0715fa89754df1ec6246025a4ec8` is on public `main`; CI [38652944182](https://github.com/AndroLay/MethaneResponse/actions/runs/38652944182) passed JavaScript, data-pipeline, and contracts jobs. The runner-specific local checks passed `bun run check`, `test:verifier` (**40/40, 161 assertions**), `test:map-performance` (**13/13, 40 assertions**), and runner bundling.
- A fresh technical audit of local demo v14, SHA-256 `a08bf76a85d037bd4656a1fb3e185b29a1bb36fc37d4fb8f870fb85100556650`, again passed dimensions, cadence, duration, H.264/yuv420p, silent-track spec, and full decode. Contact-sheet/selected-frame inspection was completed, but the creative verdict remains **not reviewed** and `delivery_ready=false`: `orca-ide` returned `runtime_unavailable`, so no full normal-speed playback was observed. The cut has no audio; imagery-rights review and upload also remain open. No video was uploaded or submitted.
- The current Devpost overview still says “students only” and 25 October, 17:00 MSK; direct Rules, Dates, and forum reads returned 403 in this recheck. Search-indexed discussion shows a participant follow-up but no organizer response, so eligibility and the submission-time conflict remain unresolved. No organizer was contacted and no submission was made.
