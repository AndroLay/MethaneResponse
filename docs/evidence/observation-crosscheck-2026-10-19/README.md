# Observation Claim Cross-Check — 19 October 2026

[Evidence index](../README.md) · [Product workflow](../../product/user-workflow.md) · [Design/acceptance](../../plans/2026-10-19-observation-crosscheck.md)

## Implemented distinction

Users can test a precise statement against historical records and obtain **exact counterexample records**. This complements Decision Lab Reference Coverage: it identifies observations contradicting an archive-related statement, rather than only reporting missing documents.

These statements are **analyst-authored scenarios**. They do not allege that any company or UNEP made them. Analyst-selected kg/h thresholds are not approved compliance/safety limits.

| Question | Calculation | Conclusion boundary |
|---|---|---|
| No linked detection in the period | Exact source-linked plume IDs on inclusive UTC days | No records does not mean no emissions; observation opportunities are unavailable |
| All reported point estimates are at most X kg/h | Records with point estimates greater than X; equality is not a counterexample | Not a probability of physical flux exceeding the threshold; reported SD remains visible |
| Physical mitigation succeeded | Always `requires_document_review` | Observations or their absence cannot establish repair success |

## Try it in the application

Start API/web using [local setup](../../development/local-setup.md).

1. Open `/dashboard/audit?sourceId=CAN_S_002`.
2. Select **Decision Lab → Observation cross-check**.
3. Click **Use loaded observation period**. Choose **Every reported flux estimate is at most a threshold** and enter **1000 kg/h**.
4. Run **Check observation claim**. Record `35328376-5922-43c4-9076-c97af6231527`, `2026-04-10T19:07:29`, reports **1,044 kg/h** with SD **370 kg/h**. This is an archive-level numeric counterexample. Estimate ± SD crosses the threshold, so physical-threshold certainty is not established.
5. Inspect points, exact-record table, and provenance. Download the follow-up draft/JSON; it has not been sent.
6. For `KAZ_S_159`, the full observation range provides three counterexamples to “no linked detections.” **1–31 August 2026** yields `no_observations`; the physical outcome remains unknown.
7. **Physical methane mitigation succeeded** requires document review for every period.
8. Continue through **Open source observations**, **Continue to human assessment**, or **Open follow-up work**. Exploration does not automatically write/publish/anchor audits. Reviewers record their assessments separately.

## Data contract and security

- `POST /api/investigations/observation-check` accepts source ID, snapshot ID, structured query, and an optional input hash for compatibility. The new UI always supplies/verifies it. JSON limit 16 KiB, separate 20-request/minute limiter, `no-store`, strict schema, and public-preview allowlist apply. This is not distributed DDoS protection.
- API reads pinned local files only. Compressed SHA-256 is checked before decompression, with 16 MB compressed/128 MB expanded limits. Requests cannot supply file URLs/paths. Identity mismatch, duplicate IDs, invalid dates/units/linkage, and changes during reads are rejected.
- Cache/in-flight loading bind path/stat, dataset ID, upstream archive SHA-256, intelligence snapshot SHA-256, and normalized-input SHA-256. Data cannot be served under a different snapshot identity.
- Browser binds source, query type/period/threshold, snapshot, archive hash, and normalized-input SHA-256; it verifies SHA-256 and replays `mars-observation-claim/1`. Query edits cancel requests/clear results; source/snapshot changes reset the panel.
- Lazy UI uses 20-row batches and at most the 200 highest point estimates in the chart. Replay retains all records, including those outside the period. Missing flux is never plotted as zero. Mobile charts scroll without shrinking labels beyond readability.
- Dataset metadata is escaped in Markdown. Exports are unsent and do not alter historical audit revisions. No frontend model/credential or new dependency.
- **Unsigned replay is not authentication.** Altered-and-rehashed output fails policy replay, but an attacker can change all inputs and generate a consistent new analysis. Publisher identity requires a trusted external commitment. This feature does not claim an on-chain anchor.

## Data and proof

Snapshot `unep-mars-675417694883`, archive SHA-256 `675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43`; normalized-input SHA-256 `f27c21ab0932de3768a57029410c90677944e732f8be341e1d3abf4f36a91ae7`. Real examples include attribution and **CC BY-NC-SA 4.0** licensing. Separately licensed document/map contents are not copied.

The scan covers **4,218 source rows / 23,861 exact-linked plume records**. The complete snapshot has 30,414 plume rows; this tool does not allocate unlinked records by approximate proximity. The 8,436 checks are **two questions per source**, not independent tests or labeled mitigation cases.

[Proof metadata](proof/verification.json) records working-tree source hashes, baseline commit, eleven examples, and the all-source scan commitment. [Python conformance](python-conformance.json) rereads the same input with a separate implementation, checking all-source counts/threshold witness IDs and the eleven examples' IDs, timestamps, original fields, statuses, and summaries.

| Real source | No linked records, full archive | All point estimates ≤1,000 kg/h | Physical repair |
|---|---|---|---|
| KAZ_S_159 | Three counterexamples | No counterexample in archive | Document review required |
| CAN_S_002 | One counterexample | One counterexample | Document review required |
| LBY_S_143 | One counterexample | No counterexample in archive | Document review required |

Additional KAZ queries: August with no records → `no_observations`; extending through December 2026 beyond archive end → `incomplete_window`. These eleven queries create no stored audits.

This is **implementation consistency on one normalized input**, not independent labeled data, AI evaluation, satellite-measurement validation, or human research. [UNEP guidance](https://www.unep.org/en/what-we-do/energy/methane/how-mars-works) explains observations/follow-up; dataset provenance records observation-specific methods/limits.

## Reproduction

From repository root, choose a new output directory; the generator refuses overwrite:

```bash
bun run prove:observations --output /tmp/methane-observation-proof-NEW
python services/data-pipeline/observation_check_oracle.py /tmp/methane-observation-proof-NEW
bun run prove:observations --verify /tmp/methane-observation-proof-NEW/CAN_S_002-threshold-1000.json
```

`--expected-digest 0x…` compares a digest supplied outside the file. This helps only when the expected value comes from a trusted source. [Four CLI scenarios](cli-verification.json) cover original/expected, changed status, altered+rehashed output, and wrong expected digest.

## Local test results

Final `bun run check:all` passed:

| Check | Result |
|---|---:|
| `bun install --frozen-lockfile` | No dependency/lockfile changes |
| API/web/E2E/evaluation TypeScript | Passed |
| API | 221 passed |
| Web | 259 passed |
| Verifier/tooling | 54 passed |
| Python | 215 passed |
| Foundry | Four passed |
| Total above five suites | **753** |
| Build/bundle | Passed; App 71,984 gzip bytes, 75,000 budget, eight required route chunks |
| Actual Anvil integration | One passed / 42 assertions, separate from 753 |
| Chromium browser | **27 passed**: 18 baseline + nine private/team/publication/mock-AI; no retries/skips |
| Runner helpers | Four passed, separate from scenarios |

Focused checks found/fixed stale cache identity, differing input projections, and Markdown-structure injection. Regressions also cover UTC-offset boundaries, null/zero/equality, threshold-crossing SD, wrong source/link/unit, duplicates, request size, cache/error/rate limits, replay, and checksum changes. `checks.json` records diagnostic logs/run identities; final browser evidence/screenshots are in this package.

Actual screenshots: [desktop](observation-counterexample-desktop.png) · [mobile](observation-threshold-mobile.png). Browser checks cover JSON/Markdown downloads, exact IDs, threshold/SD, physical-outcome requests, no-record periods, stale responses after query edits, error/retry, and return to Reference Coverage. Focused screenshot repeats are not added to 27 scenarios.

Chromium used the local sandbox; mobile viewport is not physical-device testing. AI uses local fixtures/mocks, not a live provider. Anvil 31337 is disposable, not Sepolia. No new deployment/push/publication, payment, database change, or emission-reduction proof occurred here.

## Compatibility and limits

| Area | Files |
|---|---|
| Policy/replay format | `packages/shared/src/observation-claims.ts` and subpath export |
| API/cache/limits/regressions | `apps/api/src/observation-archive.ts`, `observation-claims.test.ts`, `app.ts`, `rate-limit.ts` |
| Lazy UI/input binding/export/chart | `apps/web/src/ObservationClaimPanel.tsx`, `observation-check.ts`, `observation-check.test.ts`, `DecisionLabPanel.tsx`, `decision-lab.ts`, `decision-lab.css`, `EvidenceAuditorWorkflow.tsx`, `App.tsx` |
| Local proof | `scripts/observation-claim-proof.ts`, Python oracle/tests, `e2e/audit-workflow.spec.ts` |
| Documentation/configuration | README, workflow, API reference, status, plan, package command, typecheck include |

No database migration, new dependency, or contract change. Audit schemas, EvidenceRegistry, historical receipts, and DecisionPlan remain compatible. ObservationCheck is separate from anchored versioned audits. Twenty-five previous Decision Lab artifacts remained byte-identical to their original manifest.

This makes data-grounded decisions more concrete, without proving human time savings, additional AI benefit, field repairs, or competition success. A useful next step is pairing these results with authorized documents and reviewer assessment in one investigation, then evaluating usefulness with target users when the human pilot resumes.
