# Connected, Versioned Investigations

## Approved product decision

MethaneResponse helps teams select investigations within their capacity, check claims against evidence, request specific follow-up, and account for decisions and revisions. This direction is frozen for subsequent development. Competitive advantage and a competition win must be demonstrated; code or test counts do not measure field benefit.

Core workflow: **select a source → allocation rationale → claim and period → evidence → follow-up request → reviewer decision → recheck if data changes → integrity verification**.

- PLUME adaptation: clear owners, deadlines, and evidence requirements.
- HourMatch adaptation: AI extracts claims into structured fields; code checks dates, facilities, units, and citations; a reviewer decides.
- CanopyProof/CarbonTwin adaptation: link evidence to decisions and recheck after relevant data changes; preserve prior history.
- Kanopy/CarbonTwin adaptation: candidates for repeated outcome claims receive human review. One document may validly support multiple questions.
- Uncounted adaptation: make uncertainty, observation coverage, and reproducibility explicit.

References: [PLUME](https://github.com/KaavinB/PLUME), [HourMatch](https://devpost.com/software/hourmatch), [CanopyProof](https://github.com/Thanatos9404/canopyproof), [Kanopy](https://devpost.com/software/kanopy), [CarbonTwin](https://devpost.com/software/carbontwin-release-steward), [Uncounted](https://devpost.com/software/uncounted-verifiable-ledger-for-wildfire-war-emissions), [IEA–IMEO response framework](https://www.iea.org/reports/responding-to-satellite-notifications-from-the-methane-alert-and-response-system). These are design adaptations, not claims of integration with or endorsement by those projects/organizations.

## Boundaries and baseline

Implementation owner: primary agent in the active checkout. Baseline HEAD `8e19c034e666a6b00d93b4cb3f5747f563c75aab`; 97 paths had changed before this increment. Preserve all of them and all earlier evidence packages. Retain React/MapLibre, Bun/Hono/Zod, Python, and EvidenceRegistry; single-writer file store, with no new database/dependency/deployment.

Feedback is not a repair; missing observations do not mean zero emissions; a hash is not physical truth. Allocation approval is not confirmation of mitigation. AI stays in the backend and must be compared with a baseline. Reviewer access remains a signed token plus current directory authority. Historical approvals must be shown as historical, not as current mandates.

## Current implementation increment

One investigation uses the existing casework, with optional references to an approved plan version and a snapshot-change report. Evidence acceptance criteria are recorded with the request. The server validates all relationships; the export includes work history, the related plan, the change report, and the related assessment bundle. The verifier checks separate hashes, replay, and cross-artifact relationships. Existing APIs/audits/receipts remain compatible.

- [x] Regressions: wrong plan link, source outside the allocation, changed snapshot, forged head/revision, mismatched assessment, change plus rehash, private access, and CAS.
- [x] Shared layer: link schema, canonical SHA-256 dossier, relationship validation, and independent verifier.
- [x] Backend: validate links before save, bounded/no-store export, recheck authorization, accept no user-supplied URL/path.
- [x] UI: attach the accepted plan version, acceptance criteria, explicit change review, and export dossier from shared casework; preserve loading/error/conflict/draft states.
- [x] Evidence: unit/integration/CLI/browser checks, actual desktop/mobile screenshots, build/bundle/checks; record environment and blockers precisely.
- [x] Final review and results documentation in a new evidence package; do not alter earlier frozen artifacts.

Main files: `packages/shared/src/investigation-links.ts`, `investigation-dossier.ts`, `apps/api/src/investigation-dossier.ts`, casework routes, `apps/web/src/SharedCaseWorkPanel.tsx` and the lazy-loaded supplemental panel; `scripts/verify-investigation.ts` and related tests. Checks use `bun run check`, `test:api`, `test:web`, `test:verifier`, `build:web`, `check:web-bundle`, and E2E through the existing runner.

## Remaining follow-up work

1. Apply AI to authorized real documents: structured extraction, exact citations, date/facility mismatches, and evidence requests; measure against a baseline and record false confirmation/abstention.
2. Connect evidence changes to a new review under the same scope; do not automatically change historical verdicts. Identify duplicate claims using event/action/period similarity and human confirmation.
3. Anchor reviewed dossiers through a compatible integration, a real local transaction, and an independent contract verifier. Public-chain deployment/funds depend on applicable authorization and service availability.

The P1 continuation below completes the link between new responses and revisit, plus a real local anchor. Live AI, cross-investigation duplicate-action review, human pilot, emissions reduction, public chain, and operational benefit still require separate work/evidence.

## Approved continuation: all P1 coding

Implementation reference reviewed: `/home/andro/Downloads/MethaneResponse_3_Master_Prompt_Siap_Kirim.md`. P2 live AI/independent benchmark, expert pilot, and publication still require authorized sources, services, or external approval; do not fabricate results.

- [x] M1: completed connected-dossier E2E; Node ESM and browser workflow were restored to the full suite of 12 private/team checks. Aligned Playwright runtime import boundaries without changing product validation.
- [x] M2 implementation: append-only evidence events (`issued`/`response_received`/`response_reviewed`), original hash and rights declaration, and day/month/year/unknown dates without inventing a day. Accepting evidence for assessment is not confirmation of mitigation.
- [x] M3 implementation: freeze the exact dossier and reviewed digest for a decision; require scope/assessment and a current signed reviewer; use CAS for decision head and work revision. A later snapshot triggers a specific reason; contextual metadata does not automatically invalidate a verdict.
- [x] M4 implementation: separate decision namespace, preserve existing EvidenceRegistry, keep receipt outside the payload; use one atomic file and pending/nonce coordinator for audits and decisions. New envelope 3 is written only when a decision is stored; old envelopes remain readable. Rollback requires a version that understands envelope 3 or a backup made before the change; do not write with old code.
- [x] M5: 842 main-gate tests, 28 main + 12 private/team E2E checks (39 browser + one Node schema check), actual Anvil + CLI, two casework operations, and one publication crash/restart passed. Focused repeats do not count as new coverage.
- [x] M6: permission, normalization-tamper, terminal-reconciliation, and revisit findings were closed with regressions; actual source/log/export/screenshots are in the [new evidence package](../evidence/connected-investigations-2026-10-20/README.md). All 98 earlier frozen artifacts remain unchanged.

Final reproduction also ran the gate on a source copy without `node_modules`, using a frozen install from cache. All 842 tests/build/budget checks passed; 414 runtime/config files and data pins matched the active source. The stopped attempt to download a new cache is recorded separately; it is not a passing result or a public-service requirement.

Prototype limits: one-writer file store, no new database/dependencies, casework API body 16 KiB / history 100 revisions / 40 evidence events / decision store 100 decisions / total state 64 MiB. Documents are not automatically downloaded or sent to AI. Hash/rights values in a response are declarations until checked. Only opaque keys and digests go on-chain; no automatic publishing/upload/deployment.
