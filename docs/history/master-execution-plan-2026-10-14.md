# MethaneResponse — Master Execution Plan

> **Historical plan.** This document predates the 15 October decision to use a local file-based prototype without a database. Database/cloud tasks and estimates below are retained as historical context, not active instructions. See [current implementation status](../release/current-implementation-status.md); do not prepare or reintroduce a database service based on this plan.
>
> Translation note: The original prose is available at Git revision `9d38ad2`; frozen manifests and run-bound artifacts are unchanged.

- **Plan version:** 1.5
- **Review date:** 15 October 2026 (WITA)
- **Purpose:** provide an inspectable work path from repository state to hackathon submission and then to the internal evidence-readiness target.
- **Status:** plan approved; staged execution was underway. This plan does not claim all work below is complete. Latest progress evidence is in [`docs/history/execution-checkpoint-2026-10-15.md`](execution-checkpoint-2026-10-15.md).
- **Technical-status sources:** repository and linked local-test records. Latest browser E2E workflow is in the [15 October checkpoint](execution-checkpoint-2026-10-15.md); fast-changing status must be rechecked on the release candidate.

## 1. Main decisions

MethaneResponse already had a broad local MVP. The next work was not to add many features, but to preserve active changes, re-prove one complete workflow on current source, correct inaccurate claims, and then add external evidence that was still missing.

There were two distinct goals:

1. **Submission before the official window on 25 October 2026:** a repeatable demo that is honest about historical data, audit results, AI/prediction limits, storage, and blockchain status.
2. **Internal target of “at least 18/20” on each criterion:** stronger technical evidence and user evaluation. A 20-point scale and threshold of 18 are not Devpost's official rubric; judges published five qualitative criteria only. This plan could improve evidence readiness but could not guarantee a score.

In this plan, **complete** means relevant acceptance criteria have evidence artifacts and their limits are disclosed. It does not mean bug-free software, certain prediction of physical leaks, or emissions reduction caused by MethaneResponse.

## 2. Repository snapshot when the plan was written

| Area | Available per source/repository notes | Not yet established |
|---|---|---|
| Dataset | Active UNEP MARS snapshot `unep-mars-ccd8267c55ee`, archive SHA-256 `ccd8267c55ee93304f7135059b3c23247a6d9442edf0fa32a4b97fae08042ab2`: **4,213 sources, 30,357 plumes** (23,810 linked, 6,547 without source ID, 1,050 without quantified flux), observations 29 Oct 2020–12 Sep 2026. Manifest gzip/decoded hashes, counts, unique plume IDs, real-data status, and date range matched snapshot history. 11–12 October releases remain as historical versions. | Not a live feed and does not measure continuous satellite coverage. Updates must create new snapshots; earlier audits stay bound to their recorded hashes. |
| Cases and map | Table/pagination, source picker, Map Explorer navigation, historical observations, publisher plume geometry, historical flux layer, context imagery, and fallback in source. | Esri/OpenFreeMap depend on network/external terms; context imagery is not overpass imagery. Headless browser uses SwiftShader, not evidence of mobile-GPU performance. |
| Intelligence | Offline pipeline creates descriptive trends, anomaly screen, and recurrence model. Model v5 specifically estimates whether another **linked MARS record appears within 365 days**, not a leak, future flux, or mitigation. | Latest evaluation was retrospective; its test window had been seen during development. No prospective validation on a release after cutoff. Do not market it as leak probability. |
| Rules baseline and AI | Rules baseline, local excerpt parser, optional server-side AI, exact citation matching, abstention, document hashes, human review, v3 audit revisions, and benchmark evaluator existed. Baseline had 15 examples (9 real casebook, 6 DEMO); real subset macro-F1 was 0.6667. | No independent AI benchmark. Of three screened casebook references, 0 were cleared for provider input. No live-provider call or model-accuracy result. |
| Audit and database | Persistent local file store; PostgreSQL/PostGIS migrations and integration tests had passed with temporary PostGIS; append-only audit/revisions and hashes existed. | No cloud database configured. File storage on an ephemeral host is not production storage. A shared reviewer token is not per-user identity or ownership. |
| Blockchain | EvidenceRegistry, v2/v3 receipt compatibility, review-before-anchor, intent/recovery path, and transaction verifier were implemented; local Foundry tests were recorded as passing. | No Sepolia deployment, registry address, transaction, or live event verified. No transaction without explicit authorization. |
| Release and automation | Current GitHub Actions workflow ran typecheck, API/web/verifier, build, bundle budget, Python/baseline, and Foundry. API job used PostGIS service and `CI=true`; `scripts/check-local.sh` provided an aggregate local gate. | Exact-CI PostGIS API tests had passed locally; GitHub Actions for this working-tree revision was not verified. No live deployment. |
| Presentation | Workflow documentation, evidence matrix, README noting public status/access limits, and local browser captures under `/tmp`. Anonymous `git ls-remote` and a shallow clone had previously succeeded at public commit `99662e6de86b1d745e6ce3589ce37a9ed6c0d66c`. | Local changes after that commit were not in the verified public revision. No final 3–5 minute video or submission proof; eligibility and official time conflict unresolved. |

**Active-change warning:** at initial audit, `git status` showed **148 changed/untracked paths** under `main` at commit `99662e6`; diff contained about 87,995 added lines and the intelligence snapshot was about 16.4 MB. This is not a reason to discard changes. Before implementation, record status manifest and large-artifact hashes; do not reset, clean, squash, or regenerate snapshots without comparing deterministic results and preserving owner changes.

### Execution status as of 15 October 2026

Section 2 deliberately preserves the **baseline from when the plan was first written**. It is not a current dataset/repository inventory. After later work through 14 October, use the execution checkpoint for detailed evidence and the following table as status index.

| Package | Status at the checkpoint | Limits / remaining work |
|---|---|---|
| **WP-0 — Baseline** | **SOURCE RELEASE PUBLISHED; CURRENT WORKTREE PUBLISHED AND CI VERIFIED.** Baseline manifest had 304 hashed entries. Preserved 338 candidate paths; published 330 in source release `37169eeb35de5ad4e3217f08ae2ab8d9ccffa48d`; eight PNG mockups stayed local. On 15 October AI/map/data-test changes were published at `e55663da9343a6e78c4c54bf1ca9aafefcd4254e`, deployment blueprint pinned at `29d1a224da74e27c55e5e1b749c4850076f745ec`, and benchmark runner/two renderer-comparison reports at `b9c18f562eca0715fa89754df1ec6246025a4ec8`; CI passed [run 38652944182](https://github.com/AndroLay/MethaneResponse/actions/runs/38652944182). Remote `main` matched that commit. Two alternate draft captions stayed local. Details and CI: [execution checkpoint](execution-checkpoint-2026-10-15.md). | — |
| **WP-1 — Rules and submission** | **OPEN; CURRENT PUBLIC CI VERIFIED; EVENT RULES CONFLICT CONFIRMED.** Workflow-only commit `0f52ac280ffab8567e684e0ca19ccdff57e102dd` was published to `main`. CI pinned runner to Ubuntu 24.04 and moved checkout/setup-python/setup-uv to Node 24; all three jobs passed [run 38606971136](https://github.com/AndroLay/MethaneResponse/actions/runs/38606971136). App at `962fa4443a619c5ed1b96d855a5c7016a4472e45` passed [run 38604021117](https://github.com/AndroLay/MethaneResponse/actions/runs/38604021117). | Overview reread 15 October still said “students only” and deadline 17:00 MSK. Earlier Rules read broader categories and a ban before 08:00 PT; Rules/Dates/forum fetches then returned 403. Forum index showed a participant follow-up, not organizer response. Eligibility/time conflict unresolved. Final video, creative review/imagery rights, upload, submission proof open. |
| **WP-2 — Data** | **PASS LOCAL; UPSTREAM OBJECT METADATA RECHECKED (15 OCT).** Snapshot `unep-mars-675417694883`: 4,218 sources, 30,414 plumes, cutoff 2026-09-13 UTC. Full archive downloaded 14 October passed size, `Content-MD5`, SHA-256, ZIP CRC, parser, and CSV/GeoJSON join checks. Official HEAD on 15 October again returned HTTP 200 with ETag, size, `Content-MD5`, and `Last-Modified` matching archive; no download/re-ingest occurred. | Catalog gave no release-publication date or checksum. Data remain historical, not a live feed. Details: [`data-and-claims.md`](../product/data-and-claims.md). |
| **WP-3 — UI/map/workflow** | **PASS LOCAL; MATCHED WINDOWED SOFTWARE/GPU MEASUREMENT RECORDED; PHYSICAL DEVICE PENDING.** Cases tested at 25/50/100 rows, filters, empty state, details, and source-to-map navigation; Operators/Settings were connected and tested in Chromium. Evidence Auditor searched 4,218 sources with at most 20 results and keyboard access. UAT on active snapshot demonstrated `KAZ_S_159` → full case → observation/uncertainty → overpass geometry → auditor. Automated Playwright repeated baseline audit/export/digest/tamper and document→AI mock→abstention→review revision→private report→digest. Production-preview software baseline at `0de5170`: median readiness **2.150 ms desktop / 1.779 ms emulated mobile viewport**. Paired windowed run at `f5a832c`: SwiftShader **2.544 / 1.831 ms**, Radeon 680M **1.732 / 1.703 ms**, five contexts per viewport on the same snapshot. | Transfers differed; cache/tile scheduling were uncontrolled, so results are not causal estimates or FPS guarantees. Tile-fallback capture showed source/marker use without basemap. Reports: [`SwiftShader`](../evidence/map-performance-software-windowed-2026-10-15.json), [`Radeon`](../evidence/map-performance-amd-radeon-680m-windowed-2026-10-15.json), and [checkpoint](execution-checkpoint-2026-10-15.md). Physical-phone testing remained open. |
| **WP-4 — Intelligence** | **PASS RETROSPECTIVE, PROSPECTIVE PENDING.** Analysis predicts a next linked MARS record, not a methane leak. The 365-day ledger was frozen. | No labels/outcomes to measure prospective performance. |
| **WP-5 — AI benchmark** | **BLOCKED ON RIGHTS/ANNOTATORS/PROVIDER; LOCAL INPUT-INTEGRITY TOOLING TESTED.** Rules baseline available; exact claim/payload frozen with SHA-256, compared across gold/reviewer/prediction, and stored in a private manifest without claim/excerpt content. Two-annotator agreement tools and local manifest had regressions. | No independent AI benchmark. Tools do not authenticate annotators or create gold labels. Do not present live AI as validated until documents, processing rights, annotators, provider, and evaluation are available. |
| **WP-6 — Review/persistence** | **PASS LOCAL, CLOUD PENDING.** Revisions, private review, local restart, and digest tested. Public API and PostgreSQL keyset pagination use the same claim/citation visibility rules; PostGIS regression prevents private-claim rows from displacing a public audit from a page. | No cloud PostgreSQL service or per-user identity. |
| **WP-7 — Blockchain** | **PASS LOCAL, SEPOLIA NOT CONFIGURED.** Contract/verifier and local receipts tested. | No Sepolia address/receipt; no live anchor without authorization. |
| **WP-8 — Deployment** | **NOT LIVE; REPRODUCIBLE BLUEPRINT TESTED; PROVIDER ACCESS MISSING.** `render.yaml` uses `bun install --frozen-lockfile`; regression checks keep `BUN_VERSION` aligned with `.bun-version` and CI. Cloudflare/Render/Neon limits and `dist` build size were refreshed from official sources on 15 October. | No provider token/connector, `DATABASE_URL`, or `.env` in workspace; external accounts unknown. No resource, remote migration, backup/restore, or deployment. Local file store is not cloud persistence. |
| **WP-9 — Pilot** | **NOT RUN.** | No target participants; developer walkthrough is not a pilot. |
| **WP-10 — Verification** | **LOCAL POSTGIS GATE AND PUBLIC CI PASS; PERFORMANCE BASELINE AND E2E VERIFIED.** Full local gate: API/PostGIS **116 / 679 assertions / 0 skip**, web **180 / 164,729**, verifier **27 / 120**, Python **140**, Foundry **4**, build, bundle budget, and baseline reproduction passed. After deployment tests were tied to `.bun-version`/CI, verifier passed **27 / 121 assertions**; `bun run check` and YAML parsing passed. GitHub Actions [38645312810](https://github.com/AndroLay/MethaneResponse/actions/runs/38645312810) at `13c6ef4` passed `javascript`, `data-pipeline`, and `contracts`. Benchmark-tool commit `0de5170` passed `bun run check`, `bun run test:verifier` (**34 tests / 137 assertions**), and `bun run test:map-performance` (**7 tests / 16 assertions**); production build and five-per-viewport browser probe completed. GitHub Actions [38649555786](https://github.com/AndroLay/MethaneResponse/actions/runs/38649555786) passed all three jobs at exact commit `abf51e0912c53f6dd4aad08e49f03216fe4e1216`, including Chromium E2E. Latest runner/report changes passed [CI 38652944182](https://github.com/AndroLay/MethaneResponse/actions/runs/38652944182) at `b9c18f5`; local `test:map-performance` 13/13 (40 assertions) and `test:verifier` 40/40 (161 assertions) passed. | Cloud DB, independent AI provider/benchmark, Sepolia, pilot, and physical GPU/device remained unverified. |
| **WP-11 — Demo** | **LOCAL CAPTIONED CUT TECHNICALLY VALID; CREATIVE REVIEW / RIGHTS / SUBMISSION OPEN.** Browser capture showed historical source → observation → rules-baseline abstention → JSON export → matching digest → modified bundle rejected. Latest cut was **223.36 seconds (3:43.36)**, 1600×900, 25 fps, H.264/yuv420p, no audio; full audit passed for SHA-256 `a08bf76a85d037bd4656a1fb3e185b29a1bb36fc37d4fb8f870fb85100556650`. Captions: [`3:43 demo captions`](../demo/IEEE-ClimateChain-3m43-captions-2026-10-15.srt). Captions were mapped to UI state; video remained local in `/tmp`. Repeat technical audit of same digest passed full decode; contact sheet and selected stills were inspected. | Full normal-speed playback remained `not_reviewed` because Orca runtime returned `runtime_unavailable`. Silent cut matched specification. Imagery rights, upload, organizer clarification, and submission proof remained open; see 15 October checkpoint. |
| **WP-12 — Post-hackathon** | **FUTURE WORK.** | Operational readiness, 365-day prospective evaluation, and impact attribution need services, users, and observation time. |

**Updates after the status table:** public `main` was at [`547d445`](https://github.com/AndroLay/MethaneResponse/commit/547d445d6f52f8610c40a5a5b182aed308d7adf2); three CI jobs passed [run 38668204968](https://github.com/AndroLay/MethaneResponse/actions/runs/38668204968). Latest change showed prediction-validation limits on the card and fixed a mobile regression; `adb devices -l` found no connected Android device, so physical rendering remained pending. AI benchmark/provider, cloud, Sepolia, pilot, and submission status did not change.

**15 October publication update:** official UNEP source/metadata for `CAN_S_002` were added versionedly in commit [`f4dd19f`](https://github.com/AndroLay/MethaneResponse/commit/f4dd19f2ccb7e598d4eefbd618539bcf37435720). Exact-commit CI [38671495914](https://github.com/AndroLay/MethaneResponse/actions/runs/38671495914) passed all three jobs. The report link remained metadata only; content was not processed by AI, mitigation audit abstained without evidence, and Sepolia, cloud, pilot, and physical device remained unverified.

**15 October local verification update:** MapLibre readiness/fallback regression waits for map `idle`, preserves source markers when tiles fail, and has inspected Chromium screenshot paths recorded in the checkpoint. Working-tree suites: web **180/0/164,728 assertions**, verifier **20/0/96**, Python **138 pass**, Foundry **4 pass**, check/typecheck, production build, bundle guard, and **3 browser journeys** passed. API without DB skipped 13 PostGIS tests; afterward `bun run check:all:postgis` passed with local Docker-daemon access. Temporary test container used loopback/tmpfs and was removed by runner. Rules baseline was byte-identical to tracked report. Build warned that MapPanel chunk was **1,122.95 kB raw / 307.15 kB gzip**; it remained lazy-loaded. E2E screenshot showed fallback when external tiles were deliberately blocked, not live imagery or proof of globe visual quality. Cloud persistence, independent AI provider/benchmark, Sepolia, pilot, and physical-device GPU remained unverified. Details: [15 October execution checkpoint](execution-checkpoint-2026-10-15.md).

**14 October local gate update:** `bun run check:all:postgis` passed with snapshot `unep-mars-675417694883`: API/PostGIS **112 tests / 649 assertions / 0 skips**, web **174 / 164,716 assertions**, verifier/workflow **20 / 96 assertions**, Python **122**, Foundry **4**, typecheck, production build, bundle budget, and baseline reproducibility. Runner used the same PostGIS image as CI on a random loopback port with tmpfs and cleaned up by a per-process random label. Manual gate required `TEST_DATABASE_URL`, ran API tests with `CI=true`, and rejected empty URLs or URLs matching `DATABASE_URL`. Regenerated rules-baseline output matched tracked artifact byte-for-byte (SHA-256 `395414c365ce4e322596048dce622836e49132a917d3cdd1fea0440454f726a8`). Build emitted a nonfatal MapPanel warning at **1,122,112 raw bytes / about 306.76 kB gzip**, while configured bundle guard passed. This is local working-tree evidence, not GitHub revision, live service, physical-device, or external-user evidence.

Detailed status references: [`next-steps.md`](next-steps.md), [`workflow-verification-2026-10-13.md`](workflow-verification-2026-10-13.md), [`data-and-claims.md`](../product/data-and-claims.md), [`AI_BENCHMARK_ANNOTATION_PROTOCOL_2026-10-14.md`](../testing/ai-benchmark-annotation.md), and [`event-requirements.md`](../release/event-requirements.md).

## 3. Product workflow and end-to-end acceptance

Reviewers should be able to try these steps in order:

1. Open a map labeled **historical**, with consistent snapshot ID, latest observation date, units, and provenance.
2. Select a source and read linked plume records separately from records without source IDs; do not force an unlinked record into a facility.
3. Read trends/priority with correct method labels. Call a heuristic an investigation priority; call recurrence the chance of an **archive record** within the stated horizon/cutoff.
4. Open an evidence excerpt only after processing rights/consent are declared; show source URL, date, page/section, original-file hash, and rights status.
5. Run AI only when provider and permissions are configured server-side. Every citation must exactly match the submitted excerpt; failed citations, insufficient documents, provider failures, or unverified sources must visibly abstain/error.
6. Request human review under the correct scope. Approval must indicate inspection of the original source and is not confirmation of physical mitigation.
7. Create a new revision, preserve provenance/model/snapshot/citation hashes, export a report, and verify its local digest.
8. Only when chain use is authorized, anchor a reviewed revision and match receipt/event/issuer/version/hash with an independent verifier.

For **every** step: never turn unknown into zero; never present a partial snapshot as complete; never delete old revisions; never send documents automatically; never expose private audits; never retry a transaction with uncertain broadcast result; and never use map color as evidence of concentration or mitigation.

## 4. Internal measurable gates by criterion

These are **internal gates** for producing assessable evidence, not promised judge scores.

| Criterion | Required outcome | Minimum evidence and interpretation limit |
|---|---|---|
| **Climate Impact** | Show a real problem and how the tool helps trace observations/follow-up claims. | Real MARS case; origin, date, flux/uncertainty if available; at least 5 target users in formative pilot; at least 4/5 complete core task without facilitator. Report time, errors, assistance, and comments. This supports early usability/transparency, not emissions reduction. |
| **Innovation & Creativity** | Show a testable differentiator: claim → citation → abstention/contradiction → review → revision → verifier. | Rights-cleared independent benchmark: target 40–80 claims from 10–20 documents and at least 10 sources; two independent annotators plus adjudication; source- and document-disjoint. Initial gate: macro-F1 ≥0.80, exact-citation precision ≥0.90, zero false-supported on the bounded set, AI compared with rules on same claims. If gate fails, do not advertise model superiority. |
| **Technical Execution** | Reproducible implementation from public clone through saved/verifiable report. | All CI/local gates pass on frozen revision; browser workflow passes; PostgreSQL restart preserves audit; if blockchain is shown, independently match Sepolia receipt/event. Label live services/providers separately from mock/local. |
| **Practical Usefulness** | Target user completes workflow without a technical operator. | Pilot with task defined before session; at least 4/5 independent successes; record errors/assistance and median time versus manual workflow without dropping failures. Five people is only formative. |
| **Presentation & Communication** | Explain problem, workflow, potential benefit, and claim limits clearly. | 3–5 minute video from same release candidate as code; include a real case, claim, decision, hash/verifier, and historical/mock/provider/chain disclosure. Repo/video links must open without special login. |

Insufficient evidence for stronger claims: test count alone, visible UI, retrospective score on seen data, fluent AI response, MARS feedback, no later detection, or blockchain receipt. None alone proves physical mitigation or emissions impact.

## 5. Work packages WP-0–WP-12

The packages below are historical acceptance work. Evidence/current status is summarized above and in the linked checkpoints.

### WP-0 — Protect baseline and freeze scope

Record HEAD/status/file list, large dataset/snapshot hashes, dependencies, and latest test results; separate source/generated-data/docs/temporary evidence. Prioritize P0 source selection/provenance/audit/review/report/verifier over P1 cosmetic globe/extra features. References: `git status`, `git diff --stat`, `data/processed/intelligence-snapshot.json`, `docs/history/next-steps.md`, `docs/history/workflow-verification-2026-10-13.md`. Estimated 3–5 engineer hours; project owner approves demo scope. Preserve every change, date/scope cited tests, and a post-freeze changelog. If baseline is unsafe, stop broad refactoring and keep core-flow fixes separate.

### WP-1 — Confirm event rules and submission path

Goal: clarify deadline/opening time, eligibility, deliverables, and judge access before submission. On 14 October, [Devpost overview](https://ieee-climatechain-hack.devpost.com/) and [schedule](https://ieee-climatechain-hack.devpost.com/details/dates) showed a 25 October 17:00 MSK deadline and submission opening 5 October 07:00 MSK. [Rules](https://ieee-climatechain-hack.devpost.com/rules) said not to submit before “official start time” 08:00 PT on 25 October, so the authoritative window was ambiguous. Overview said “students only”; Rules eligibility also listed academics, independent developers/startups, and environmental professionals. [Clarification thread](https://ieee-climatechain-hack.devpost.com/forum_topics/45102-session-1-recording-and-clarification-on-submission-window) contained participant questions but no organizer answer visible at review. `git ls-remote` from the environment was `UNVERIFIED_NETWORK_OR_AUTH`; local `origin/main` was not proof of current public revision.

Project owner was to request written clarification of UTC window, Indonesian eligibility, public repo, and video. Engineer was to check anonymous clone/read, update `README.md` only after public access was verified, and record URL/time/screenshot or credential-free clone. Gate: one official answer/form resolves conflict and all release links are public. Estimate: owner 0.5–1 hour plus wait; engineer 1–2 hours. Fallback: prepare materials before 24 October, do not guess a conflicting time, and do not change repo visibility from this workspace.

### WP-2 — Lock data integrity and snapshot history

Goal: map, case, API, intelligence, audit, and export use the same snapshot and retain access to old snapshots. Inspect/update: `services/data-pipeline/ingest_mars.py`, `build_web_snapshot.py`, `build_intelligence.py`, `build_plume_geometries.py`, `data/real/`, `apps/web/public/data/mars-*manifest.json`, `apps/web/src/mars-snapshot-integrity.ts`, `mars-snapshot-loader.ts`, `apps/api/src/intelligence-data.ts`, `packages/shared/src/index.ts`.

Validate unique source/plume IDs, explicit `sourceId` joins, UTC timestamps, WGS84 bounds, nonnegative flux/uncertainty with explicit units; distinguish null, zero, null geometry, unlinked, and DEMO; compare manifest/index/API/web/report counts and hashes. Re-run pipeline into a temporary directory and compare bytes/hashes before replacing active artifacts. Add a new versioned snapshot for a new official/licensed UNEP release; never rewrite historical audit bindings. Release manifest should record publisher, license, retrieval date, archive hash, snapshot ID/hash, date range, counts, release changes, and reproduction steps. Estimated 8–12 engineer hours; new release also depends on data access/rights. Fallback: use active `unep-mars-675417694883`, cutoff 13 Sep 2026 UTC, or another verified historical snapshot; do not fill missing data with synthetic results.

### WP-3 — Stabilize Map Explorer, Cases, Operators, Settings

Goal: explore thousands of sources without confusing metadata, observations, geometry, and evidence. Files: `apps/web/src/MapPanel.tsx`, `CasesWorkspace.tsx`, `CaseDetailsDialog.tsx`, `EvidenceObservationPanel.tsx`, `PublisherFootprintCard.tsx`, `OperatorsWorkspace.tsx`, `SettingsWorkspace.tsx`, `case-table.ts`, `workspace-preferences.ts`, `earth-rendering.ts`, `map-marker-style.ts`.

Test search/filter/pagination at 25/50/100 rows, reset on filter change, empty/error rows, cross-page source selection, View buttons/coordinates, and correct dialog/map navigation. Confirm flux markers mean snapshot maximum flux (kg/h), not concentration; unlinked plume never becomes a source; `VERIFIED` geometry is bound to publisher records/hashes. Test satellite/grayscale/street/dark layers, globe/flat, Eco/Balanced/Quality/Auto, local preference persistence, WebGL/tile failure; Settings must visibly work and Operators shows MARS metadata, not operator communication. Preserve progressive loading: initial route loads catalog; source detail loads needed bucket; full-history overlay waits for all verified shards; failed shard shows zero partial data and retry.

Run `bun run measure:map-performance -- --server=production-preview --output=docs/evidence/map-performance-production-YYYY-MM-DD.json` for 5 fresh contexts per viewport. Record encoded/decoded response bytes, ready time, long task/LoAF, errors, overflow, fallback. Keep Chromium sandbox active; label software renderer/emulated viewport, not physical benchmark. Gate: no blocking desktop/mobile overflow/error; IDs/coordinates consistent; metadata not shown as repair evidence; complete or fail-closed load. Compare only with the 15 October production-preview baseline using same server mode/browser/viewport/snapshot/machine. Physical-device testing remains open. Estimate 8–14 hours incl. UI regressions. Fallback: history/table/coordinates/audit remain usable if tiles/globe fail; disable heavy Auto/Eco effects.

### WP-4 — Present intelligence/prediction scientifically

Files: `services/data-pipeline/build_intelligence.py`, `record_recurrence.py`, `train_redetection.py`, `evaluate_baseline.py`, `apps/api/src/intelligence-data.ts`, `apps/api/src/app.ts`, `apps/web/src/IntelligencePanel.tsx`, `record-recurrence-view.ts`, `docs/product/data-and-claims.md`. Show dataset ID/as-of cutoff/target horizon/baseline/evaluation/warnings in every view/export/API; retain `not_available` if coverage/validation fails; label anomaly screen as statistical candidate, not confirmed leak; regression-test against “future leak/emission probability” wording for archive-record recurrence. Freeze model/hash before a prospective window and save prediction ledger before future labels open.

Acceptance: concise model card (target/features/source time/evaluation window/comparator/CI/coverage/bias/abstention/limits), consistent API/UI/export; no physical-target probability; predictions bind to snapshot/model version; retrospective/prospective status clear; MARS indicators that are not outcomes are not treated as ground truth. Estimate 4–8 hours for local claim boundaries/regressions and 12–20 hours for prospective pipeline after a new snapshot. A 365-day prospective study cannot finish before the hackathon through UI work alone; it needs a frozen model and complete released outcome window.

### WP-5 — Complete rights-cleared, correctly annotated AI benchmark

Files: `docs/testing/ai-benchmark-annotation.md`, `docs/research/mars-casebook-document-rights-inventory-2026-10-14.md`, `services/data-pipeline/evaluate_evidence_ai.py`, `scripts/run-ai-benchmark.ts`, `apps/api/src/ai-review.ts`, `apps/api/src/app.ts`. Need 10–20 documents with explicit rights for excerpting, provider processing, evaluation, and metric publication; store only metadata/hash if full text cannot enter repo. Two annotators label independently with exact citations; adjudicator resolves differences blind to predictions. Freeze source/document-disjoint split before inference. Compare rules and AI on identical claims/inputs; use provider only after rights, backend token, budget, and minimization are approved.

Expected artifacts: private/licensed dataset version, rights manifest, auditable annotation/adjudication, baseline/AI outputs, seed, model/prompt, source/document counts, per-label precision/recall/F1, exact-citation precision, abstention, false-supported mitigation, source-cluster interval, paired AI−rules delta. Gate: ≥40 held-out claims from ≥10 sources, ideally 80 from 10–20 documents; all three labels represented; no document/source overlap between splits; macro-F1 ≥0.80, citation precision ≥0.90 as internal gates, zero false-supported on the bounded set, benefit over rules explained with CI. Zero false positives in a small sample is not real-world safety assurance. Estimate 25–40 engineer hours plus about 20–40 combined human-review hours; rights/reviewer availability can delay indefinitely. Fallback: keep provider off product claims, use rules/abstention/licensed MARS citations; do not add synthetic rows or lower thresholds.

### WP-6 — Audit workflow, reviewer, and persistence evidence

Files: `apps/api/src/{audit.ts,ai-review.ts,reviewer-auth.ts,store.ts,postgres-store.ts,app.ts,audit-pagination.ts,audit-visibility.ts}`, `platform/database/migrations/0001_init.sql`–`0005_audit_history_pagination.sql`, `apps/web/src/{App.tsx,AuditHistoryPanel.tsx,ImportedAuditVerifier.tsx}`. Test valid/tampered/no-citation/contradictory documents; approved/rejected/needs-more-evidence; public/private consent; wrong/expired token scope; concurrent review/revisions; store restart, DB reconnect, tampered export, revision pagination. Audits stay append-only; claims without valid citations abstain; `needs_more_evidence` cannot become supported.

Expected: transition matrix/API-browser logs, store reopen/restart evidence, digest, permission/cache-control status, revision chain. Gate: private drafts hidden without token; required consent for publication; each change is a new revision with parent hash; recovery does not duplicate audits; restarted report verifies. Estimate 8–12 hours; remote integration in WP-8. Fallback: if remote identity/database are unavailable, demo only on a file store persistent on the demo machine; do not call shared token per-user access or file store cloud durability.

### WP-7 — Independent blockchain and historical compatibility

Files: `contracts/src/EvidenceRegistry.sol`, `contracts/test/EvidenceRegistry.t.sol`, `apps/api/src/chain.ts`, `apps/api/src/app.ts`, `scripts/verify-audit.ts`, `apps/web/src/ImportedAuditVerifier.tsx`. Retain receipt v2; test v3 canonical serialization/hash; `anchor` auth scope; require review before anchoring AI; durable intent before send; no auto-retry on transaction timeout; reconcile only when event matches registry, chainId, issuer, version, block, tx hash, and bundle digest. Verifier cannot trust UI/API state.

Expected report matches local hash/on-chain event/explorer-RPC/issuer/revision; docs limit blockchain claim to integrity/order of records. Gate: Foundry/regressions pass, old receipt still verifies, and if chain is shown live, one real Sepolia transaction is independently verified. Estimate 5–8 hours; deployment/funded signer/transaction only by authorized owner, no such action without new authorization. Fallback: local digest labeled `Not anchored`, no synthetic public receipt.

### WP-8 — Deploy and secure the MVP operationally

Files: `render.yaml`, `.env.example`, `docs/release/deployment.md`, `apps/api/src/store.ts`, `apps/api/src/postgres-store.ts`, `apps/api/src/rate-limit.ts`, `apps/api/src/app.ts`, `platform/database/migrations/0006_shared_api_rate_limits.sql`, `.github/workflows/ci.yml`. Owner selects provider/account/region/plan and confirms costs/retention before resource creation. Configure `DATABASE_URL`, consistent `RATE_LIMIT_HASH_SECRET` across replicas, correct CORS origin, reviewer/provider secrets only in backend; run additive migrations, seed snapshot, health check, then public-URL audit/review/restart/verify. For public API, add gateway rate limiting and validate trusted client IP; shared PostgreSQL counter does not replace ingress protection. Test backup/restore before claiming durability.

Expected runbook/rollback, service URLs, health response showing `postgres` + persistent, restart read, migration, auth denial, CORS, backup/restore. Gate: API/browser flow survives restart, remote DB preserves revisions, no secrets in bundle/log, private access denied, ingress limit exists. Estimate 10–16 engineer hours + 2–4 owner hours/access; actual-account cost/quotas must be verified. Fallback: local demo; no cloud-persistence/production-availability claims; free tier is not SLA/industrial readiness.

### WP-9 — Usability pilot and supportable benefit claims

Goal: test whether target users review a claim more systematically than with a manual workflow. Protocol: ≥5 environmental researchers/auditors/analysts; brief consent, anonymous participant data, same case/instructions; find source, read history, assess claim, identify missing evidence, generate/verify report. Record time, success/failure, source/citation errors, assistance, and feedback; compare manual workflow without hiding learning-order/facilitator effects.

Expected pre-session protocol, aggregated notes, participant count, median/range time, task success/errors/assistance, anonymous feedback excerpts, sample limits. Gate: ≥4/5 independently complete core task; no critical error presents administrative evidence as mitigation; prioritize/fix or record usability findings. Estimate 8–12 engineer/facilitator hours; scheduling 1–3 weeks. App use is not methane-reduction evidence. Fallback: report “pilot not conducted”; developer walkthrough is not a substitute.

### WP-10 — Full verification, CI, and release candidate

Goal: rerun prior gates on the revision actually demoed. Add `bun run check:web-bundle` to GitHub Actions; provide disposable PostGIS in CI so `TEST_DATABASE_URL` is not empty; skipped DB tests count as a failed gate, not a pass. Consider automated browser smoke only with existing repository tools. Run deterministic rules baseline and ensure generated output does not unintentionally change snapshot/history.

Commands:

```bash
bun install --frozen-lockfile
bun run check
bun run test:api
bun run test:web
bun run test:verifier
bun run build:web
bun run check:web-bundle
bun run test:data
cd services/data-pipeline && uv run python evaluate_baseline.py --output /tmp/mr-baseline.json
bun run test:contracts
bash scripts/check-local.sh
```

For the full DB gate, provide a separate PostGIS `TEST_DATABASE_URL` to `scripts/check-local.sh`. Record per-command summary, commit/revision/hash, passed/failed/skipped counts, runtime versions, desktop/mobile screenshots, console/network summary, and test-service cleanup. Gate: no hidden failure/skips called pass; post-check working tree changes only intended outputs whose hashes were compared; release candidate reproducible from public clone. Estimate 6–10 engineer hours including P0/P1 fixes; one fail/fix cycle may add 4–8 hours. If CI lacks PostGIS/browser, label gate `NOT RUN` in CI and keep local disposable evidence separate.

**Local implementation status when this plan was prepared, before promotion of the 14 October archive release:** first full gate on active working tree passed with disposable PostGIS and no DB tests skipped: typecheck passed; API **111 tests / 648 assertions / 0 skipped**; web **169 / 164,451**; verifier **9 / 53**; Python **119**; Foundry **4 / 0 skipped**; production build, bundle budget, and baseline reproduction passed. Gate baseline output matched tracked report (SHA-256 `44fad3fedcbc80bb9b9874540ee5ac5476383556fe11228a108bd74e4866bb96`). Snapshot analysis compared retrospective next-linked-MARS-record estimates within 365 days with publisher persistence metadata: 3,057/4,213 numeric sources, Spearman 0.726, top-decile overlap 149/306, `emissionStatus` missing for 4,213/4,213. These are descriptive statistics on the same snapshot, not independent model validation or emissions prediction. Chromium smoke checked Evidence Auditor desktop/mobile, category table, no overflow, and zero page errors; nine WebGL/ReadPixels warnings and partial tile fallback were recorded. Reopened UNEP MARS catalog still linked CSV/GeoJSON but listed no release date/hash; reader rejected `application/octet-stream` ZIP, so the snapshot ending 2026-09-12 UTC remained the verified historical version without a claim it was newest. Details: [`evidence/local-quality-gate-2026-10-14.md`](../evidence/local-quality-gate-2026-10-14.md) and execution checkpoint. Next paths: independent AI waits for licensed documents/annotators/provider; cloud Postgres waits for owner target/access/cost; Sepolia waits for owner authorization; pilot waits for participants; GitHub Actions/public clone on active revision unproven; video/submission unavailable. This local result did not change public HEAD `99662e6` and does not prove live service or emissions impact.

**Latest execution update after archive promotion:** local `bun run check:all:postgis` passed with snapshot `unep-mars-675417694883`: API/PostGIS **112 tests / 649 assertions / 0 skipped**, web **174 / 164,716 assertions**, verifier/workflow **20 / 96 assertions**, Python **122**, Foundry **4**; typecheck/build/bundle guard passed. 14 October browser UAT demonstrated real source `KAZ_S_159` → full-case popup → observation/uncertainty → dated publisher geometry → rules abstention for mitigation claim → audit stored and digest valid after local API restart. Artifact: [`live local UAT`](../evidence/live-local-uat-2026-10-14/README.md). This supersedes older gate/dataset summary above; external services, independent AI provider/benchmark, cloud Postgres, Sepolia, GitHub Actions on active revision, pilot, physical device, video, and submission remained unverified.

**WP-3 addition, 20:10 WITA:** Chromium also demonstrated cluster click → source marker `LBY_S_098` → full-case dialog → Evidence Auditor → search/select `LBY_S_143`. Two screenshots with hashes/UAT limits are in the same evidence package. Session used software WebGL renderer and produced 38 warnings; this is not GPU/phone performance evidence.

### WP-11 — Submission and demo package

Goal: one concise story; every video claim matches build/source revision. Historical 3–5 minute outline: (0:00–0:35) problem/not a MARS replacement; (0:35–1:25) select source/historical snapshot; (1:25–2:10) history, flux/uncertainty/geometry/labeled priority; (2:10–3:10) evidence claim, exact citation/insufficient evidence, human review; (3:10–4:00) report version/hash/verifier; (4:00–4:40) user value, limits, AI/DB/chain status. Adjust final duration to 3–5 minutes.

Artifacts: publicly accessible video; description of problem/solution/target user/track/scalability/adoption; public GitHub URL; credits/license; instructions; screenshot; recorded revision manifest; risk/limitations statement. Gate: fresh browser/clone repeats demo without developer secrets; do not claim live AI/cloud/Sepolia/pilot if not live; every displayed number has snapshot/unit/cutoff. Estimate 8–12 engineer hours; project owner uploads video/submits from their account after window is confirmed. Fallback: if window remains unclear, keep package local and status `NOT SUBMITTED`; do not use guessed timestamp as proof.

### WP-12 — Post-hackathon research/industry readiness

Separate hackathon product from operational system. Work: per-user identity/ownership; evidence access/retention/deletion policy; secret rotation; gateway rate limiting; non-sensitive logs/metrics; backup/restore and incident runbook; accessibility; load/budget tests; provider terms; data-license review; vulnerability/dependency review; device tests; prospective recurrence study; larger pilot; longitudinal climate-impact design.

Gate: security owner approves controls; restore drill passes; workload/availability targets derive from real needs; prospective model tested on post-freeze release; impact claim has outcome data/attribution design. Outside hackathon estimate: at least 3–6 additional engineering weeks after services/prerequisites exist. Prospective recurrence needs at least 365 days after model/cutoff freeze plus MARS publication delay; emissions-impact evaluation needs independent follow-up observations.

## 6. Dependency order and Go/No-Go gates

```text
WP-0 baseline freeze ─┬─ WP-1 event/public access ────────────────┐
                      ├─ WP-2 data/snapshot ─┬─ WP-3 UI workflow ──┤
                      │                      └─ WP-4 intelligence ──┤
                      ├─ rights + annotators ───── WP-5 AI benchmark│
                      ├─ owner credentials ─ WP-8 deployment ───────┤
                      ├─ owner chain approval ─ WP-7 Sepolia ───────┤
                      └─ pilot participants ─ WP-9 pilot ──────────┤
                                                   WP-10 RC ─ WP-11 submission
```

| Gate/date WITA | Decision | GO if | NO-GO/fallback |
|---|---|---|---|
| **14–15 Oct — G0** | Scope and access rights | Baseline file/status recorded; organizer clarification requested; demo source selected. | Freeze features; assign blockers; do not change repository/external services. |
| **16 Oct — G1** | Scientific/document evidence | Snapshot/history consistent; licensed document and reviewer available if AI is shown. | Historical data only, rules baseline/abstention; no live-AI claim. |
| **19 Oct — G2** | Local product path | Map→case→history→assessment→review→report→verifier works on current source; P0/P1 errors closed. | Narrow demo to repeatable path; do not hide failed step with video/editorial. |
| **20 Oct — G3** | External service | Owner configures Postgres/provider target and secure access; no spend/deploy without approval. | Local file store; cloud/provider unverified. |
| **22 Oct — G4** | Feature/claim freeze | No open P0/P1; data/AI/prediction labels correct; existing pilot/test results recorded. | Stop new features; fix release blockers/document limits. |
| **24 Oct — G5** | Release candidate | Fresh-session dry run and repo/video links ready; build matches demo revision; claims/attribution match. | Do not submit with broken links or conflicting window; owner decides from official source. |
| **25 Oct — G6** | Submission | Official window/time confirmed by Devpost/organizer and owner account shows Submitted. | Preserve conflict evidence; do not claim submission without confirmation. |

## 7. Estimates and critical path

### Capacity before the hackathon

Planning assumption: **one engineer × 5 focused hours/day**, 14–24 October: 55 gross hours, 20% (11 hours) buffer for interruptions/revisions, about **44 planned hours**. This is an assumption, not an owner-hours commitment or guarantee. It excludes organizer/rights/service-account/reviewer/participant/network waiting time.

| Submission package | Maximum hours | Note |
|---|---:|---|
| WP-0/1 baseline, scope, rules, public access | 4 | Some work belongs to project owner. |
| WP-2 case choice and provenance/data check | 4 | No new release without official source and permission. |
| WP-3/6/10 workflow regression, browser check, P0/P1 fixes | 14 | Prioritize E2E, fail-closed, restart; avoid cosmetic refactor. |
| WP-8 live Postgres/provider if access is ready | 0–6 | If unavailable, use time for local hardening; no automatic account/billing setup. |
| WP-9 pilot if real participants are available | 0–5 | Without participants, prepare protocol; do not claim results. |
| WP-11 video, description, credits, clean dry run | 8 | Changes after video require another review. |
| Buffer | 3 | Not for extra features. |
| **Maximum total** | **44** | Full AI benchmark and Sepolia were not assumed possible in this capacity. |

### Evidence-backed internal target after submission

WP-0 through WP-11 were estimated at **94–151 engineering hours**, about 19–31 focused workdays at 5 hours/day, plus about 20–40 hours of human annotation and external scheduling. Starting 26 October with prerequisites quickly available and external work in parallel, the realistic path was about **4–8 calendar weeks (approximately 23 November–21 December 2026)**. Delayed document rights, service accounts, reviewers, or participants would extend it. This rough estimate carried high risk in WP-5/WP-8/WP-9 and was not a promise date.

A 365-day prospective prediction and emissions-reduction evidence cannot be “caught up” by more coding before the event; both need post-freeze time/follow-up data, valid outcome methods, and a later snapshot release.

Critical order: preserve repo changes → confirm event/public access → choose safe case/claim; verify snapshot/local workflow → close P0/P1 → feature freeze; prepare video/RC before submission; then rights+annotators→AI benchmark, credentials→PostGIS/provider, approval→Sepolia, participants→pilot. These paths can run in parallel after access exists but cannot be replaced by unlabeled mocks.

## 8. Verification/evidence archive matrix

| ID | Gate | Evidence artifact | Pass condition |
|---|---|---|---|
| V1 | Data | Snapshot ID, archive SHA, manifest counts/date range, generator repeatability output, hash-verification log. | Pipeline/browser/API/report hashes/counts match; unlinked/null/unknown remain distinct. |
| V2 | Workflow | Browser recording/screenshots from source → history → evidence → review → revisions → export → verifier; HAR/error summary without credentials. | Repeatable on same revision; no blocking page error or false outcome claim. |
| V3 | AI | Rights manifest, gold labels/adjudication, split report, model/prompt, evaluator JSON, confidence intervals. | Minimum sample/split/thresholds visible; false-supported analyzed; if gate fails, do not market AI mode as validated. |
| V4 | Persistence/auth | Migration, store backend/health (no connection string), create/review/restart/read, permission matrix, backup/restore record. | Data survive process restart; private access closed; no secrets in frontend/log. |
| V5 | Chain | Local bundle digest, transaction receipt, event, chainId, registry, issuer, version, external verifier output. | All fields match report revision; absent transaction remains local/not anchored. |
| V6 | Prediction | Frozen model card, input snapshot, target definition, cutoff, retrospective report, later prospective report. | Explicit archive-record target; no methane-zero/physical-leak interpretation. |
| V7 | UX/performance | Browser version, OS/device/GPU, 5 cold runs, transfer bytes, canvas-ready timing, long tasks, mobile overflow/fallback screenshots. | Performance claims derive from repeated measurements on stated device, not global FPS promise. |
| V8 | Pilot | Protocol, consent, anonymous task sheets, aggregated outcomes/limits. | At least 5 participants; ≥4 independent successes as formative internal gate; address serious errors. |
| V9 | Submission | Public-clone check, video URL/duration, description, attribution, event-window evidence, submission confirmation. | Links open; video matches RC; submission timestamp is inside official window. |

## 9. Risks, triggers, and responses

| Risk | Impact | Trigger | Response |
|---|---|---|---|
| Devpost time/eligibility conflict | Ineligible/late submission | Overview, Rules, schedule/form disagree | Request written answer; save capture/form; do not guess timezone. |
| 148 changed worktree files | Lose features/data/new work | Source changed before baseline | Manifest/hash first; grouped diff; avoid cleanup/generated rewrite. |
| Latest dataset is 12 Sep 2026 | UI mistaken for live feed | “Live” label or stats without cutoff | Label historical/date on each route; update only from new official release. |
| Document rights unclear | License/privacy breach; invalid benchmark | Provider receives report/excerpt | Do not download/process/send; find explicit rights or use rules baseline. |
| Small benchmark sample | AI performance appears more certain than it is | High macro-F1 on few sources | Cluster CI, source/document splits, false-positive review; call exploratory. |
| Recurrence model mistaken for methane forecast | Wrong investigation decision | UI says future leak/flux | Label archive-record target; add linter/test/copy gate; separate prospective study. |
| Ephemeral host storage | Audit lost on restart | Deploy without Postgres | Production startup fails closed without DB; test restart/backup before public demo. |
| Shared reviewer token/ingress identity/rate-limit config | Cross-user access and abuse | Public API behind replicas/proxy | Do not expose draft without controls; operational per-user identity, shared Postgres limiter with same HMAC secret, verified gateway limit/trusted client IP. |
| Ambiguous Sepolia write | Duplicate/wrong receipt | RPC timeout after broadcast | Durable intent + reconciliation; no auto-retry; operator verifies exact event. |
| Device-dependent tile/GPU | Map missing/slow/different | Tile outage/SwiftShader/low-end mobile | Retry/fallback; history remains usable; report environment; no FPS promise. |
| README/GitHub status mismatch | Judges receive wrong instructions | README says private while owner says public | Verify anonymously, then update README/test clean clone. |
| Post-video changes | Video no longer matches source | Fix after final recording | Rebuild/review video or limit to release blocker and rerecord affected section. |

## 10. Progress reporting and change rules

At each day end, update one row: **WP/target · actual output · evidence path/URL · PASS/FAIL/BLOCKED · hours used · blocker/owner · next action**. Do not combine statuses into percentages. Use `LOCAL`, `LIVE`, `MOCK`, `EXTERNAL`, `UNVERIFIED` tags.

A package is `PASS` only when artifact exists and acceptance criteria are met. `BLOCKED` names a specific external prerequisite and owner; independent work continues. `NOT RUN` must not be written as PASS. Every regression fix references the test that caught it. Changes to data format, contract, public claims, provider, permissions, or chain need an impact review against older audits.

## 11. Work not performed when this plan was written

- This plan changed no source code or dataset.
- No test/build/browser run was performed during the plan-writing turn; cited results came from dated repository notes and must be rerun on the release candidate.
- No organizer contact, new account/provider, spend, deployment, GitHub change, AI file upload, or blockchain transaction occurred.
- No judge score of 18/20 can be promised; only judges give official scores.

## 12. References

- [Devpost overview](https://ieee-climatechain-hack.devpost.com/) — displayed deadline, tracks, submission overview.
- [Devpost Rules](https://ieee-climatechain-hack.devpost.com/rules) — eligibility, submission instructions, five criteria; differed from overview when checked 14 October.
- [Devpost schedule](https://ieee-climatechain-hack.devpost.com/details/dates) — opened during 14 October check; showed 5–25 October submissions, still conflicting with Rules timing restriction.
- [UNEP MARS data dictionary](https://methanedata.unep.org/dict-mars-emission-sources-plumes), [MARS methodology](https://methanedata.unep.org/approach-methodology), and [MARS FAQ](https://www.unep.org/index.php/topics/energy/methane/international-methane-emissions-observatory/mars-frequently-asked-questions) — record definitions, methods, interpretation limits.
- [`research/methane-response-evidence-and-evaluation-2026-10-13.md`](../research/methane-response-evidence-and-evaluation-2026-10-13.md) — research informing target, baseline, citations, and claim limits.
