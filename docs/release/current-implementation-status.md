# Active implementation status

## V18 delivery alignment — 23 October 2026

The [latest release check](../evidence/release-sync-2026-10-23/README.md) contains the new gates, integration-timeout handling, frozen inputs, publication target, and rollback. These results do not replace the r12 score or earlier test evidence.

The [active submission package](devpost-submission/README.md) references the local 4:57 v18 MP4 and [v17 take8 proof](../evidence/video-v17-2026-10-22/README.md), not the v16 take2 receipt or v12 video. TKM_S_021 is the main investigation; KAZ_S_159 is a separate DeepSeek DEMO example. The added environmental-impact story describes a potential path toward organizational action and measurement, not a measured mitigation outcome. V18 passed 18 technical audits and 34 video regressions; these did not rerun the application suite. Full listening/playback has not been verified. GitHub status and public endpoint status were checked separately in [access-status.json](devpost-submission/access-status.json). Dated notes below remain historical results for their revisions; not all were rerun.

[Documentation home](../README.md) · [Architecture](../architecture/overview.md) · [Evidence index](../evidence/README.md)

## Active update — 21 October 2026

On 21 October, the user replaced Luna with **DeepSeek V4.1 Flash 1017** through ExperientialLabs and again requested Render deployment. The provider catalog, private configuration, and real API smoke check were inspected: three DEMO document examples passed, including quotation validation and bundle hash checks. This is not an independent quality benchmark. [Evidence](../evidence/deepseek-live-2026-10-21/README.md) · [Configuration](../development/deepseek-integration.md).

The user later approved creating a Free service after billing visibility limits were explained. The [Render preview](https://methaneresponse-preview.onrender.com/dashboard) was **live at the recorded check**, with the backend model and a real browser assessment verified on source 98b25ca. [Public evidence and scope limits](../evidence/render-preview-2026-10-21/README.md). Free compute was confirmed; a total workspace cost of Rp0 is not guaranteed. The 20 October notes below about excluding Render and Luna being pending are superseded decision history, not current scope.

## Baseline history — 20 October 2026

**Updated: 20 October 2026.** P2 was published in commit 173bbb8b763a0014289031d3d14dec5a64399c9f. The following completion increment used that commit as its baseline and recorded actual source bytes in the [non-Render completion package](../evidence/non-render-completion-2026-10-20/README.md). Push/CI status for later revisions must be checked directly on GitHub; local results do not certify a deployment. Earlier evidence remains tied to the revision and conditions of its original run.

**Scope:** a local MARS-focused proof of concept using a fixed-version snapshot and single-process JSON audit file. A database, shared hosted persistence, and field mitigation operations are outside active scope. The [15 October ADR](../architecture/decisions/2026-10-15-local-prototype-no-database.md) replaces database assumptions in older plans; the [P1 ADR](../architecture/decisions/2026-10-17-shared-casework-single-writer.md) adds local small-team collaboration without a new database/deployment.

## Non-Render completion — active decision

**CI verification is separate from local verification.** Runs 39424647485, 39427086280, and 39428246566 failed on the 20-source map caption. The latest run measurement found the caption appeared about 0.44 seconds after Locate, followed by a 20.715-second long mount task; the module completed in about 90 ms. A regression showed that two WebGL contexts were allocated. The next increment removes the temporary probe, uses one MapLibre canvas, and starts at pixel ratio ≤1 while preserving the final quality ceiling/cache. Construction fallback and renderer adaptation are retained. Local results and CI status for the exact commit are checked separately; a diagnostic-only run does not prove the fix's effect.

The user excluded Render, planned to provide Luna configuration later, and chose blockchain as an **unfunded prototype with no public wallet funding**. Blockchain acceptance uses the actual EvidenceRegistry contract on Anvil chain 31337: transactions, receipt/latest/historical checks, rejection of modified reports, and crash recovery. Sepolia is optional and unverified; local receipts do not have a public explorer URL. Rules and manual review remain available without AI.

P2 CI failure (39419272105) was reproduced as a dependency on a viewport notification before lazy MapPanel mount. Explicit focus now activates and opens the map; ordinary lazy loading remains. Regression checks block the map-specific observer notification and inspect 10→20 membership, map caption, viewport, and case handoff. New results do not overwrite P2 evidence.

See the [plan/decision](../plans/2026-10-20-non-render-completion.md), [Luna contract](../development/luna-integration.md), and [Anvil runbook](../development/blockchain-recovery.md#running-local-checks). Notion is not an active deliverable. The v12 video and 20 October supplement remain separate local artifacts; no new upload or submission is claimed.

## Related evidence and next-release staging — 20 October

The [P2 evidence package](../evidence/p2-delivery-2026-10-20/README.md) added checks for authorized evidence reuse across current investigations, reviewer interpretation history, pagination, and CLI verification. Scope is bounded by snapshot/claim/source/date; valid reuse is supported and no double-counted repair conclusion is made. Private endpoints enforce current authority, revocation, CAS/read revision, no-store, a 500-work-item limit, and a process-local quota.

The official opt-in downloader and two-snapshot staging protect active sources and frozen evidence. The 20 October UNEP release was downloaded and normalized separately: **4,197 sources/30,529 plumes**. TypeScript replay and the Python oracle matched on 8,415 sources/60,943 plume records, including removals, corrections, and reassignment; the **active snapshot remains 4,218/30,414**. The candidate is not promoted automatically. Documents record source history and interpretation limits.

The new source/judging packager enforces an allowlist, checksum/CRC, runtime pin, and rejection of credential patterns, symlinks, and state/cache/temp directories. The source manifest and check details are in the P2 package. These are local results; push/CI status is checked separately on GitHub. The v12 video remains the 19 October historical presentation; the 65.4-second technical supplement shows the latest workflow from the actual browser, with English captions and original music. Render was allowed only if a Rp0 limit could be confirmed; the connector did not expose billing/spend caps, so no new service was created at that time. An AI provider, public Sepolia, cross-provider facility matching, and human/physical-device validation remained unproven.

## Connected Investigations — 20 October

The [workflow and evidence](../evidence/connected-investigations-2026-10-20/README.md) combine an accepted allocation, scoped work item, append-only evidence requests/responses, assessment, human review, frozen decision, verifier, and revisit reasons. Document dates retain day/month/year/unknown precision; response acceptance does not produce a mitigation verdict. Plan/snapshot/assessment materials are replayed before freezing, with signed current authority and CAS. A new response or review may recommend reassessment without rewriting the old decision.

**Local gate: 284 API + 275 web + 58 tooling + 221 Python + 4 Foundry = 842 main tests passed**; frozen install, typecheck, production build, and bundle budget passed. **40 E2E checks passed** (28 main + 12 private/team, comprising 39 browser journeys and one Node schema check), with no fail/retry/skip in the final run. Five runner helpers are not double-counted. Actual Anvil integration, two casework operations, and one publication crash/restart passed. Eleven CLI scenarios on retained exports matched expected exits. Source bindings and reproduction results are in the evidence package; these counts are not AI accuracy or user impact.

Additional reproduction: 137 dependency packages were installed frozen/offline from cache in a copy without node_modules, then the 842-test/build/budget gate passed again. 414 runtime/config files and data inputs were identical to active source. The earlier fresh-cache network download was stopped because it was slow; there is no claim that a full new network download succeeded.

Anvil called the contract, verified event/latest/historical states, rejected a modified and rehashed rationale, and recovered a lost acknowledgement after reopen. The old audit path and decisions share the pending/nonce coordinator. EvidenceRegistry and the old audit namespace remain compatible; the file envelope becomes 3 after the first decision. The receipt is outside the frozen payload. [Operations and rollback](../development/connected-investigations.md) explain the single writer, backup, limits, and anchor permissions.

Actual desktop/mobile-viewport screenshots were inspected; the investigation journey had no page error or horizontal overflow. App entry was **74.667/75,000 gzip bytes**; lazy MapPanel still had a 1,124,042-byte raw-size advisory. 98 earlier frozen artifacts were verified intact. This increment did not verify a new external AI provider/independent benchmark, human pilot, physical phone, public CI/deployment, Sepolia receipt, or new video.

## Snapshot Change Watch — 20 October

The [implementation and replay evidence](../evidence/snapshot-change-watch-2026-10-20/README.md) added a complete comparison of two real MARS projections: the release retrieved 12 October (4,211 sources/30,319 plumes) and active input from 14 October (4,218/30,414). The old input was restored byte-for-byte from Git with provenance; active input was not replaced. The original CSV was not downloaded or reauthenticated in this increment.

The diff by ID and explicit field policy found **7 sources added, 170 source metadata changes, 95 plumes added, 3 plume-record changes, and no removals/relinks for this input pair**. Two records changed in flux/SD/update timestamp; one changed only in update timestamp. 82 additions are dated after the earlier archive window; 13 are backfills, not 95 new leaks. 178 source IDs were affected; under the default weighted plan at capacity 10/20, three sources need record review: DZA_S_011, IRN_S_065, TKM_S_021. Unresolved records remain separate (6,534→6,553).

The Cases panel shows selected/all scope, pagination, before/after values, timestamp/unit/SD, error/retry, stale-response guard, and ID handoff to evidence/map. The API validates input/report manifests, caches offline results, and rejects the full diff on public preview. Export uses canonical SHA-256; the CLI verifier requires both original inputs and separately obtained expected hashes, then replays the full diff. The Python oracle separately checks source/observation fields and UTC grouping.

**Final gate passed: 257 API + 270 web + 56 tooling + 221 Python + 4 Foundry = 808 main tests**; frozen install, typecheck/build/bundle, and baseline conformance passed. Browser: **28 main + 10 private/team/publication/mock-AI = 38 unique scenarios**, with no fail/retry/skip in the final run. Eight CLI scenarios matched expected exits; the Python oracle matched 8,429 sources/60,733 plume records. App entry was 74.104/75,000 gzip bytes; lazy MapPanel remained subject to a raw-size build advisory at 1,124,042 bytes. Two viewport screenshots were inspected; 87 earlier artifacts remained intact. [Run and source bindings](../evidence/snapshot-change-watch-2026-10-20/checks.json) limit these results to the local environment, not a real model, physical phone, public chain, or deployment.

This closes the record-comparison gap with **two real historical snapshots** documented in the earlier Operations increment. There is still no automatic acquisition of a later release, live feed, prospective validation, automatic rescheduling, new provider brief, or plan anchor on blockchain. Feedback is not repair; a missing record is not zero emissions; a review flag is not confirmation of physical change.

## Investigation Operations — 20 October

The [increment and evidence](../evidence/investigation-operations-2026-10-20/README.md) connect a plan to a 10-row/page queue and one map-ring layer for up to 50 sources. Explicit activation checks replay and the latest selection; capacity/strategy edits do not silently replace the queue. Snapshot, archive, and normalized input must match. Clicks on overlapping layers route to one target, prioritizing the plan ring.

Plan/history import requires a separately recorded digest. Comparison separates allocation changes from changes in data summaries; snapshot/publisher/scope validation prevents incompatible catalogs from being treated as one series. In this Operations run, cross-snapshot comparison was tested only with a DEMO fixture; real 10→20 evidence used the same snapshot. The Snapshot Change Watch increment above adds a separate real record diff, without automatically monitoring upstream releases.

A reviewer with signed access and current directory authority can accept, defer, or reject an allocation through the backend. Actor/time come from the server; CAS protects revisions, and a conflict draft can be saved after loading the latest history. The companion private file uses the same writer lock, atomic writes, and initialized marker; report payloads are deduplicated. History is exported with full replay and verified by the CLI against an expected head. **No assignment, publication, or blockchain anchor for the plan is created automatically.** History is not an identity signature or proof of physical truth. [Guide](../product/user-workflow.md#operate-and-review-a-plan) · [API contract](../architecture/api-reference.md#versioned-investigation-plan-decisions).

The final local gate **passed: 243 API, 267 web, 55 tooling, 217 Python, 4 Foundry = 786 main tests**, plus typecheck/build and an App budget of 72.831/75,000 gzip bytes. Separate browser run: **25 main + 10 private/team/publication/mock-AI = 35 unique scenarios**, with no failures/retries/skips; five runner helpers are not double-counted. Six CLI scenarios and file-store reopen used real input with a DEMO software reviewer. Four actual screenshots were inspected; mobile was viewport emulation and external imagery was blocked. Code review closed four activation/scope/recovery/click findings; form-label fixes were also verified. The manifest's 72 artifacts from three earlier increments remained intact. [Run record](../evidence/investigation-operations-2026-10-20/checks.json) distinguishes this local evidence from provider, receipt, and public deployment.

## Product-value improvements — 18 October

Observation-period/event-day presets use UTC days and require Apply; the baseline is blocked while scope remains a draft. Scope drafts recover per tab context (subject to SessionStorage availability). Reports now include a file verifier without the CLI, requiring export context by default, with an explicit legacy option and visible authenticity limits. The [evidence package](../evidence/product-value-2026-10-18/README.md) contains 16 functional comparison cells; [three case studies](../research/three-historical-decision-cases-2026-10-18.md) produce metadata-based decisions and next requests. This does not replace older P5 results or a human pilot. The internal 18/20 target is not automatically achieved by tests.

## Decision Lab — 19 October

The [evidence package and trial guide](../evidence/decision-lab-2026-10-19/README.md) record each reference's eligibility, bounded leave-one-reference-out sensitivity, evidence requests with acceptance checks, and five authored challenges kept separate from real cases. Six analyses across three historical sources matched the saved rules baseline; this is not an independent gold benchmark. Snapshot, archive, attribution, license, and limitations are included in exports. The browser verifies the checksum and replays policy before showing results.

The new local gate passed: **210 API, 255 web, 54 tooling, 212 Python, 4 Foundry**, plus typecheck/build/bundle. Anvil integration used a historical KAZ_S_159 detection audit and rejected a report that was modified and rehashed, by comparing it with the contract commitment. This did not verify Sepolia or repair. Read browser and separate checks in the increment evidence package to avoid mixing its counts with historical runs.

GitHub CI baseline failed while launching Chromium (No usable sandbox), before application assertions. The sandbox exception is now restricted to an explicit GitHub-hosted runner; the sandbox remains active locally and in other CI. The change was not run on GitHub, so remote CI status is **not yet verified as fixed**.

## Observation Claim Cross-Check — follow-up increment, 19 October

The [evidence package](../evidence/observation-crosscheck-2026-10-19/README.md) adds exact-record falsification for analyst scenarios about no linked detections and reported point estimates below a threshold. The API validates the full snapshot input, linkage/ID/date/unit, and cached provenance. The lazy UI loads a point chart, 20-record table pages, follow-up draft, and replay JSON. The browser also matches the normalized input SHA-256; stale results or results for another question are discarded. Metadata is escaped in Markdown exports.

**Final local gate: 221 API + 259 web + 54 tooling + 215 Python + 4 Foundry = 753 tests**, with typecheck/build/bundle passed; App was 71.984 gzip bytes (75,000 budget). A scan of 8,436 questions across 4,218 source rows/23,861 linked records matched a separate Python oracle on the same input. Eleven historical examples, four CLI scenarios including edit+rehash, and local Anvil regression passed. Browser evidence is in the increment package. This large test count is not proof of physical-mitigation accuracy, AI quality, or human impact.

## Current capabilities

**Investigation Capacity Planner — 19 October:** [evidence and guide](../evidence/investigation-planner-2026-10-19/README.md). Cases compares four source allocations under the same slots, country quotas, and scope, with selection/exclusion reasons, sensitivity, pagination, atomic handoff, and replay export. All 4,218 sources remain bound to the snapshot; public preview is limited to three sources. The local gate passed 767 tests, typecheck/build/bundle, and browser checks rebuilt a production build per phase. Hidden local filters are cleared after approved handoff and the active source remains consistent. Browser/CLI/Python/Anvil details and source bindings are recorded separately. This allocation does not prove improved field benefit, is not UNEP Top 50, and adds no live AI or public receipt. No migration/database was added.

| Area | Local implementation | Evidence/operational limits |
|---|---|---|
| Historical explorer | Map, Cases, provenance, progressive source/history loading, monthly geometry, and fallback | Historical snapshot; geographic imagery is not methane/plume-pixel measurement |
| Publisher indicators | Nine monthly Top 50 releases, eight country response-rate periods, exact-ID map handoff, history, and pagination | Does not invent rank from CSV order; feedback rate is not repair rate |
| Investigation analysis | Historical summary, anomaly screen, explainable priority heuristic, retrospective 365-day record recurrence, and prospective ledger | Not a physical-emissions forecast; final retrospective window was seen during development; no independent prospective outcome yet |
| Rules baseline | Three claims, abstention, scoped dates/event/recipient/action-follow-up, and citations | Checks metadata coverage, not document authentication or methane-authority determination |
| Human assessment | Required scope, exact claim, references, determination, rationale, next request, immutable private schema 4, and parent hash | Reviewer must be configured; recorded decision does not certify physical repair |
| Evidence/reviewer trust | Opt-in bounded HTTPS publisher retrieval/digest, category/expiry/revocation directory attestation, separate conflict declaration | No real reviewer is enrolled; operator attestation and self-report do not verify external identity/independence |
| Investigation continuity | Multiple work IDs, local notes or shared queue, owner/assignee/due date, CAS/history, per-tab draft, navigation guards, and explicit request handoff | Local mode remains non-transactional across tabs; shared mode uses one authorized writer; not real-time or multi-instance |
| History/reports | Immutable revisions, comparison, JSON/export verifier, and Markdown brief | Full schema 4/JSON is private; Markdown is not a verifier artifact or automatic Notion publication |
| Public transparency | Per-revision consent, atomic correction/supersession/withdrawal, current/history pagination, direct URL, and live status check | Historical summaries remain available; private fields stay hidden; offline checksum does not certify current status or issuer |
| Document AI | Provider interface, exact quotation checks, source-level assessment, and separate human review | Provider is not live-configured in the workspace; mock tests are not an AI quality benchmark |
| Blockchain | Durable intent, write opt-in, exact-intent recovery, UI target/pending/reconcile, and verifier CLI | Local Anvil 31337 tested with SIGKILL/revert and separate verifier; no public Sepolia receipt yet |
| Storage/runtime | Separate private audit/casework files, kernel writer lock, state/marker fsync, offline backup/restore, and lost-state detection | Not multi-instance/encrypted; loss of entire volume+marker is undetected; hosted temporary filesystem is not durable |

## Active data

Snapshot unep-mars-675417694883: **4,218 source rows, 30,414 plume rows**, observations from 29 October 2020 to 13 September 2026 UTC; retrieved 14 October. The active casebook has four sources. Provenance, license, release history, hash, and rebuild commands are in [data/real/README.md](../../data/real/README.md). The upstream check recorded on 15 October does not make this a live feed.

The September 2026 mitigation report remains link-only publisher metadata. Separately licensed PDF content, tables, images, and report counts are not copied. Synthetic fixtures remain labeled DEMO.

## Latest recorded development checks

The [P1 shared-casework evidence](../evidence/shared-casework-2026-10-17/README.md) records the following actual results against the P1 increment source manifest:

- **bun run check:all passed:** API/web/E2E TypeScript, 138 API, 234 web, 34 verifier, production build/bundle, 160 Python, baseline conformance, and 4 Foundry tests. Frozen install did not change dependencies/lockfile.
- Separate checks: **2 casework operations** (backup/restore/lock and actual API crash/restart) and **1 actual local TLS transport** passed. The test runner filtered the parent environment; no real provider was called.
- **13 main + 5 private/manual/shared/mock-AI = 18 Chromium scenarios** passed in one full invocation, including two browser contexts and a draft retained after refresh failure. Three runner-helper regressions also passed; focused repeats are not added to scenario totals.
- Desktop and mobile-viewport shared-work captures were inspected; there was no page error or horizontal overflow in P1 scenarios. This is not a physical-phone test or GPU performance benchmark.
- Bundle gate: App **74,537 gzip bytes**, 75,000 budget; eight required route chunks passed. MapPanel remained lazy with a 1,122,953-byte raw-size advisory.
- Independent static review found lost-state reset, stale queue during refresh, and delayed history response issues. All three were fixed with red/green regressions and checked in the final suite. Remote-volume limits remain documented.

The run used Bun 1.4.3 (repository pin remains 1.4.2), project Python 3.12.13, Chromium 153 with sandbox active, Linux flock, and disposable DEMO data/credentials. This full local gate does not verify hosted persistence, a testnet, or a real model. The [earlier trust/transparency evidence](../evidence/trust-transparency-2026-10-17/README.md) retains counts and the source hash for its original run; P1 did not overwrite it.

## P2 checks after P1

The [17 October P2 evidence](../evidence/blockchain-recovery-2026-10-17/README.md) records durable intent before broadcast, exact transaction recovery, issuer serialization, canonical receipt/minimum confirmations, UI target/pending, and verifier --require-chain. Tests used local Anvil chain 31337 and a disposable random signer, including actual process SIGKILL before/after broadcast and a reverted transaction. A separate verifier process accepted latest/historical receipts and rejected modified reports/issuers. Independent implementation review closed findings on current reviewer authorization, receipt immutability, and target approval.

Full P2 gate: 151 API, 236 web, 35 verifier, 160 Python, and 4 Foundry tests passed; casework operations and chain integration were tested separately. App was 74,704 gzip bytes, below the 75,000 budget. Browser: 14 main + 5 private/manual/shared/mock-AI = 19 Chromium scenarios passed. P2 desktop/mobile captures used DEMO UI responses; the actual blockchain transaction was proven separately on Anvil. The [runbook](../development/blockchain-recovery.md) documents pending transactions that cannot be canceled automatically, confirmations/reorgs, a dedicated issuer, and backup limits.

[Later Sepolia preparation](../evidence/sepolia-preparation-2026-10-17/README.md): public RPC was checked, a dedicated issuer and configuration were stored privately, and a historical source_detected baseline was persisted in separate operational state and passed offline hash verification. The registry was still a predicted address, not deployed; signing was off by default. The user had approved one faucet claim, one deployment, and one anchor with a cost limit. The initial faucet required CAPTCHA; the user later reported a 0.001 ETH Mainnet requirement, which did not match the new issuer. QuickNode was also rejected according to the actual form reported by the user; the earlier FAQ did not prove eligibility. An agent then tried the PoW faucet twice directly at the user's request; both starts were rejected with [INVALID_CAPTCHA]. Mining/claim did not succeed. RPC reads during those attempts confirmed a 0 SepETH balance and pending nonce 0. P2 remained **in progress** until actual Sepolia funding, deployment, anchor, and receipt verification were complete. The same approval did not need to be requested again. This did not close P3–P6.

**Testing path without a faucet:** after the user's question, [31 focused tests and one Anvil integration were rerun and passed](../evidence/p2-local-testing-2026-10-17/README.md). The contract was actually deployed locally; crash/recovery and a separate verifier were tested with DEMO data. Development could continue without funding or changing private Sepolia configuration. The local profile was verified; the original target, a Sepolia receipt, remained unavailable.

## P3 checks after P2

The [18 October P3 evidence](../evidence/publication-lifecycle-2026-10-18/README.md) closed six schema 4 summary correction/withdrawal criteria. Private events and new publications are stored atomically in envelope version 2; full schema 4 remains private and old bundles/hashes are unchanged. A revision without consent does not change publication. Reviewer authority is checked at mutation time; stale/repeated CAS writes are rejected; renewed consent and human-parent recovery after a baseline are supported.

- **Full gate exit 0:** 164 API, 240 web, 36 verifier, 160 Python, 15-case baseline conformance, and 4 Foundry; typecheck/build/bundle passed. App was **74,957 gzip bytes** against a 75,000 budget; only 43 bytes remained, and eight required route chunks passed.
- **23 Chromium scenarios** passed in one full invocation: 14 main + 9 private/manual/shared/mock-AI, including four new P3 scenarios. Three runner-helper regressions also passed. DEMO desktop/mobile screenshots were inspected; credentials were cleared, with no overflow/page error on the main lifecycle scenarios.
- Separate operations: 1 publication SIGKILL/restart, 2 casework backup/restore/lock/crash, 1 actual Anvil integration, and 1 TLS loopback transport passed. P1/P2 regressions still worked after the envelope change.
- Read-only implementation review closed parent/authorization/event and UI recovery findings. This is not a P4 domain-expert review. The [P3 runbook](../development/publication-lifecycle.md) explains consent, status/offline checksum, and migration; old P2 binaries cannot read envelope version 2, so roll-forward and a complete backup are required.

This increment did not use external deployment/publication, real enrollment, a live AI provider, or Sepolia transaction. Earlier P1/P2 results remain tied to their original manifest/date and were not overwritten.

## P4 — research remediation and v2 package

The user requested remediation of all research-intake issues. The [F01–F13 disposition](../research/p4-research-remediation-2026-10-18.md) records URL/HTTP 400, pointer and scope, calendar/UTC-day, recipient normalization, and hash-bound assessment/physical verification fixes. UI/history/report/brief now distinguish metadata coverage from human/model determination. Old bundles and the schema 1 public-summary projection are unchanged.

[P4 v2 package](../evidence/domain-review-remediation-2026-10-18/README.md) is the version for a new review; [v1](../evidence/domain-review-preparation-2026-10-18/README.md) is retained as historical. Application/package checks are on the v2 evidence page. Complete reference fields still do not prove original documents or physical outcomes. The ARG confirmation-month question remains unverified from primary sources; publication date is not used as the action date.

**P4 engineering completed locally:** full gate of 193 API / 247 web / 37 verifier / 160 Python / 4 contracts, 23 application browser scenarios, and 4 focused checks passed; details and limits are in v2 evidence.

**P4 in progress:** engineering remediation does not replace domain review; **0 experts confirmed, 0 sessions, 0 human results**. No external party was contacted. All five human-result checklist forms remain unchecked. The [P4 protocol](../testing/domain-expert-review.md) governs competence, consent, material findings, and rechecks.

## P5/P6 — agent-scoped work completed, 18 October

The user asked to leave P4 waiting and complete P5/P6 through agents. The [latest results package](../evidence/p5-p6-agent-completion-2026-10-18/README.md) completed the [agent execution plan](../plans/2026-10-18-p5-p6-agent-execution.md):

- **P5:** two agents, six repeated sessions, and 48 manual/app tasks on LBY/CAN; 40 correct/8 partly. Actual time, assistance, and deviations were recorded. Of 24 pairs, 15 met the accuracy/no-substantive-help filter; median manual-minus-app was −33.914 seconds (the app was slower for this subset of agent wall time). There is no evidence of human time savings; two agents are not six participants. Confidence remains null. A CLI-context finding was fixed after sessions; 25 original/tampered exports were replayed, with 50/50 checks matching expectation.
- **P6:** licensed metadata challenges with **authored DEMO** claims, 96 train/dev/test probes across separate 2/2/12 sources; test set had 72 claims/three classes. Two unlabeled agent contexts each got 71/72 correct, macro-F1 0.9861; grammar-aware rules got 72/72. Both agents made the same wrong claim despite exact quote match. No additional AI benefit was shown; activation was not deemed eligible. 216 rules/agent bindings were replayed from frozen inputs; this is not human gold or an application-provider benchmark, and rationale/quote relevance quality was not scored.
- **Final verification:** bun run check:all exit 0 — 193 API, 247 web, 52 verifier/tooling, 212 Python, and 4 Foundry (**708 tests**); typecheck/build/bundle passed, App 71,689 gzip bytes. A separate agent review checked CLI, P6 binding, and P5 raw/scored/aggregate consistency. No deployment/transaction/live provider was used.

All execution, analysis, and finding closure within the agent scope are complete. Human/provider research for P5/P6 remains incomplete; negative results were not turned into benefit claims. The [initial increment](../evidence/p5-p6-agent-evaluation-2026-10-18/README.md) and P4 v1/v2 remain historical; human expert review is still pending.

## Three-integration simulation through agent roles

The [18 October simulation package](../evidence/integration-role-simulation-2026-10-18/README.md) used three supporting agents in analyst, skeptical reviewer, faulty provider, unauthorized visitor, operator, issuer, and verifier roles. **13 scenarios** passed through an HTTPS fixture provider → local production API (one test/116 assertions), including two passes with different payloads, consent/rights, HTTP/JSON/schema/size failures, and a **40.198 ms** stalled body. A deliberately wrong provider agreement remains private/unreviewed advice and cannot be anchored directly; this does not prove model quality or resolve prompt injection.

An additional Anvil integration simulated a node accepting a transaction and then returning HTTP 502 for its acknowledgement. The pending intent remained, retry was rejected, and the same hash was recovered without another nonce. Two casework operations, one publication operation, 34 focused tests, typecheck/build/bundle, and four HTTP checks of the local production build passed. **39 tests in this increment**, not a rerun of all 708 tests/E2E. No runtime API/web/shared code changed; outdated deployment guidance was fixed. An external provider, public deployment, and Sepolia receipt remained unverified.

## Completed development sequence

| Date | Increment | Plan/result |
|---|---|---|
| 15 October | Publisher indicators: deterministic import, exact source joins, responsive UI, archive/manifest checks | [Completed plan](../superpowers/plans/2026-10-15-mars-publisher-indicators.md) · [evidence](../evidence/mars-publisher-indicators-2026-10-15/README.md) |
| 16 October | Evidence requirements/next checks, revision comparison, Markdown brief, and stale-response boundaries | [Workflow evidence](../evidence/investigation-workflow-2026-10-16/README.md) |
| 17 October | Human assessment without AI, bounded scope, and browser-local analyst work | [Plan](../plans/2026-10-17-human-investigation-workspace.md) · [evidence](../evidence/human-investigation-workspace-2026-10-17/README.md) |
| 17 October | Draft recovery, manual route, shared coverage, explicit follow-up lineage, and multiple work items | [Plan](../plans/2026-10-17-workflow-continuity.md) · [evidence](../evidence/workflow-continuity-2026-10-17/README.md) |
| 17 October | P1 team collaboration, CAS/history, explicit import, private file recovery, and writer lock | [Six-package plan](../plans/2026-10-17-six-package-completion.md#4-p1--kolaborasi-dan-penyimpanan-bersama) · [P1 evidence](../evidence/shared-casework-2026-10-17/README.md) |
| 17 October | P2 intent/recovery, target approval, and local network verification | [P2 evidence](../evidence/blockchain-recovery-2026-10-17/README.md) · public Sepolia integration pending |
| 18 October | P3 public-summary correction/withdrawal, durable migration/events, and private-parent recovery | [ADR](../architecture/decisions/2026-10-18-publication-lifecycle.md) · [evidence](../evidence/publication-lifecycle-2026-10-18/README.md) |
| 17 October | Reference checks, reviewer assurance, and redacted public transparency | [Plan](../plans/2026-10-17-trust-transparency.md) · [evidence](../evidence/trust-transparency-2026-10-17/README.md) |

Figures and assumptions in [checkpoints](../history/README.md), the [judge matrix](judge-evidence-matrix.md), the [score roadmap](score-readiness-roadmap.md), and older plans remain tied to their source dates. This page is the active status reference; internal estimates are not judge scores or a guarantee of winning.

## What has not been demonstrated beyond local implementation

| Need | Status |
|---|---|
| Independent AI benchmark | [P6 agent work complete](../evidence/p5-p6-agent-completion-2026-10-18/README.md): 72 authored record claims, two contexts, did not outperform rules. Licensed event/repair corpus, independent human labels, and provider comparison are not available |
| User benefit | [P5 agent work complete](../evidence/p5-p6-agent-completion-2026-10-18/p5-analysis.json): paired manual/app results and agent wall time are available; human user pilot and human time savings are unproven |
| Real reviewers/documents | Software controls exist; enrollment, independent checks, and application to real documents are not evidence in the trust increment |
| Public service | Not deployed from this workspace; optional Render preview uses /tmp, not durable audit storage |
| Public chain demo | Anvil test profile without a faucet was reverified; Sepolia target/operations are recorded if resumed, but there is no public deployment/receipt |
| Physical device | Desktop GPU evidence exists for dated revisions; mobile viewport emulation does not replace a physical phone |
| Competition package | Requirements/eligibility need confirmation, rights/video need review, and submission must use the owner's account; a local Notion package does not mean a Notion page was published |
| Climate impact | No repair or emissions reduction caused by product use has been demonstrated |

**Six-package ledger:** P1 verified locally; P2 implementation verified locally, public Sepolia integration pending; P3 verified locally; P4 waiting as directed by the user; P5/P6 **complete within agent scope**, with human study/independent provider benchmark still pending under the [plan](../plans/2026-10-17-six-package-completion.md#11-status-dan-keputusan-selesai). Agent checks do not complete expert review, human pilot, or independent AI benchmark.

No later plume is not proof of zero emissions. Feedback is not proof of repair. Hashes/receipts prove integrity/chronology aspects, not physical truth. The complete trust operations guide is [trust and transparency](../product/trust-and-transparency.md).
