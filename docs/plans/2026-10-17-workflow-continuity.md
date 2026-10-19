# Workflow continuity and MARS alignment

Owner: root, sole implementation writer. Scope: the five approved workflow gaps. Preserve prior changes and evidence; no external notifications or deployment.

## Interfaces and sequence

1. Shared evidence eligibility: one pure selector for API baseline and scoped web coverage; retain unscoped behavior. Tests cover dates, event, recipient and mitigation follow-up.
2. Browser case work v2: independent work IDs within source/snapshot/archive/mode, non-destructive v1 reading, per-item optimistic revisions, queue selection and resume. Tests cover migration, isolation and conflicts.
3. Session drafts: explicit field allowlists; incomplete reference metadata is recoverable, reviewer tokens and inspection confirmation are excluded. Warn on context/navigation changes and browser unload. Tests cover recovery and isolation.
4. Manual investigation guidance: manual assessment leads directly to Review; Document AI stays optional. Human determinations are named correctly. Scope-aware reference counts show exclusions.
5. Explicit follow-up handoff: copy a saved human request into the selected work draft, with audit ID/hash lineage, without changing triage status. User explicitly saves the work item.

## Acceptance evidence

- Focused failing tests before implementation, then API/web/verifier regressions, TypeScript checks, web build and bundle budget.
- Browser scenarios for draft recovery, cancellation, multiple investigations, manual-to-review navigation, scoped coverage and explicit follow-up transfer; inspect desktop/mobile captures.
- One bounded read-only review of draft privacy, migration and stale context handling.
- Document official MARS actors/flow with primary source links, supported product mapping and local prototype limitations.

## Progress

- [x] Inspect current repo and verify official UNEP / IEA-IMEO workflow.
- [x] Implement five gaps and focused tests.
- [x] Review, verify browser behavior, and record limitations/evidence.

## Outcome

All five items completed. Independent review fixes are covered by focused tests and browser scenarios. Fresh verification: 116 API + 229 web + 34 verifier tests, TypeScript, build, 13 main + 3 private/mock-AI browser scenarios, and bundle budget (73,147 App gzip bytes). Evidence Auditor is now lazy to satisfy the existing budget. The evidence record preserves local storage and metadata limitations: [workflow continuity evidence](../evidence/workflow-continuity-2026-10-17/README.md).
