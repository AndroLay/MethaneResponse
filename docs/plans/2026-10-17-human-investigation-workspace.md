# Human investigation workspace

## Goal and boundaries

Complete the three product gaps identified in the functional review: independent human evidence assessment without a model, event/period-bound rules, and resumable local case work. The accepted no-database ADR remains authoritative. Existing dirty investigation, demo, and research changes are preserved. Root owns all implementation files; any delegated reviewer is read-only.

No deployment, external publication, new infrastructure, third-party report reproduction, or physical mitigation certification. User authorization already includes reproducible automated tests.

## Design

- Keep schema 2/3 audits readable and their canonical bytes unchanged. Introduce schema 4 for private human determinations, with authenticated reviewer identity, exact claim, bounded scope, submitted reference metadata, separately recorded rules result, rationale, and optional parent bundle hash. No model request or document content is needed. These records stay private and cannot be anchored through the existing prototype path.
- Add optional bounded scope to baseline input. Bind selected observations to their source and snapshot. Scoped rules exclude undated/out-of-period/unrelated references; notification checks a named recipient and mitigation references require action and dated follow-up metadata. These checks assess reference coverage, not authenticity. Legacy unscoped behavior remains available and labeled.
- Keep the audit JSON store as the only API persistence. Mutable analyst work (question, notes, evidence request, next action, triage status, claim and scope) lives in browser-local storage, keyed by dataset snapshot/archive, source and real/demo mode. No credentials or evidence contents are saved there. Cases exposes a work-status filter and the existing investigation-priority heuristic.

## Milestones

- [x] Scope contracts and deterministic rules: shared types, source/event validation, baseline route, focused tests for dates, event identity, metadata and backward compatibility.
- [x] Independent human determination: new API module/route, existing reviewer authorization, bounded requests, immutable/private audit history, persistence/restart tests and independent result choice. Integrate digest verification, comparison and exports without exposing private content in Markdown.
- [x] User workflow: scope controls and human assessment panel, editable reference rows with page/record locators and conditional response metadata; preserve source/claim/dataset isolation. Add local case notes, explicit save/resume, work-status queue and optional priority sorting.
- [x] Verification and documentation: typecheck, affected API/web suites, full API/web regressions, build, browser workflow checks including refresh, isolation, private history and mobile overflow; update product/status docs with precise limits.

## Acceptance commands

Use declared Bun scripts: `bun run check`, `bun run test:api`, `bun run test:web`, `bun run build:web`, `bun run test:e2e`. Run focused tests first and capture verbose results to `/tmp` as needed. Use disposable stores for integration/browser tests, never alter real saved audit history.

## Decisions and evidence

2026-10-17: inspected current shared schema, baseline, atomic JSON store, reviewer auth, AI workflow, export verifier and Cases workspace. Existing audit persistence groups revisions by case and claim; scoped case IDs will distinguish periods/events. Existing prioritization is retained as a heuristic, separate from user triage and audit results.

2026-10-17 completion: all four milestones are implemented and checked. The read-only safety review led to fixes for wrong-recipient contrary records, foreign observation IDs in period-only references, fallback case identity, reconciliation bypass and DEMO observation selection. Browser regressions then exposed selected-row pagination overriding priority order and edits against temporary DEMO data; both were fixed and exercised again. Final results: 116 API + 220 web + 34 verifier tests, API/web/E2E typechecks, build/bundle budget, 11 main browser scenarios together and 3 manual/mock-AI scenarios in isolated processes. Reproduction, capture hashes and limits: [evidence record](../evidence/human-investigation-workspace-2026-10-17/README.md).
