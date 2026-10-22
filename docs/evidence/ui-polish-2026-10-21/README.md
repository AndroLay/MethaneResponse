# Focused UI polish — 21 October 2026

## Scope

Four improvements authorized after the pre-video UI review:

1. Document AI prioritizes the exact claim, authorized excerpt, assessment, exact
   quotations and human review. Historical statistics remain in a native disclosure
   after the primary task. Report provenance, rights and hashes remain available
   in a separate disclosure; revision and publication status remain visible.
2. Operational labels and supporting text are larger. Form controls use 16 px on
   narrow screens, and affected action buttons have a 44 px minimum height.
3. Mobile global search has explicit open/close controls, Escape and Ctrl/Cmd+K
   support. Closing returns focus to the trigger; choosing a result moves focus
   into the selected case workspace.
4. Active-plan rows have one primary Evidence action, with statistics and Map in
   source details. Evidence events show concise summaries, ten per page; exact
   request/response IDs, criteria, declared rights, date precision and SHA-256
   remain accessible in individual disclosures.

No API, database, canonical bundle, contract, model, dataset or dependency changes.
Scientific caveats and processing/publication permission gates are preserved.
Native disclosure state does not grant consent or change persisted evidence.

## Verification record

| Check | Result |
|---|---|
| `bun run check` | Passed: API, web, E2E and evaluation TypeScript |
| `bun run test:web` | 282 passed, 0 failed |
| Full browser regression gate | 29 application + 12 mock-AI workflow tests passed |
| Final focused browser confirmation | 2 application + 2 mock-AI/history tests passed |
| Production build through isolated browser runner | Passed |
| `bun run check:web-bundle` | Passed; App entry remains below 75,000 gzip bytes; eight required lazy workspaces retained |

There are **42 distinct workflow scenarios** across these runs: the full gate's
41 plus the new pagination/save scenario. Repeated confirmations are not counted
as additional distinct tests. One scenario checks Node ESM schema loading rather
than driving a browser page. The full gate preceded the final copy, focus and
typography refinements; final source received web/type/build checks and focused
browser confirmations covering those refinements.

The new history regression issues eleven explicitly DEMO requests, navigates both
pages, opens an exact request's criteria/ID, saves shared work, and verifies the
server returned all eleven unique request IDs and unchanged due dates. The
focused Auditor regression checks draft retention, processing-limit disclosure,
disabled assessment without configuration, search open/close/Escape/Ctrl+K,
keyboard focus after selection, 44 px search targets, 16 px mobile inputs, and
absence of document-level overflow at 390 and 320 px.

Screenshots use an actual local production build: desktop 1440 × 1000 and mobile
390 × 844; the mock-AI result capture is 1280 × 800. The code and screenshot
SHA-256 values are recorded in [verification.json](verification.json). That file
identifies local working-tree source, not a published release or external audit.

An initial new regression used an exact label locator whose matching text changed
when React updated a controlled textarea. The browser accessibility snapshot still
contained the field and draft. The regression now targets the textbox's accessible
role/name and continues to assert that the draft survives disclosure changes.

The sandbox also encountered a temporary-directory quota. Final runs use an
ignored project-local temporary directory. Chromium sandboxing remains enabled.

## Runtime captures

- [Focused document form, desktop](auditor-focused-desktop.png).
- [Focused document form, mobile](auditor-focused-mobile.png).
- [Collapsed mobile search and historical-data label](mobile-header-collapsed.png).
- [Expanded mobile search](mobile-header-search.png).
- [Active-plan queue, mobile](active-plan-queue-mobile.png).
- [Assessment, exact quote and human-review controls](document-assessment-result-desktop.png).
- [Event-history second page, mobile](evidence-history-mobile.png).

The assessment screenshot is a **software mock fixture** deliberately pairing a
Kazakhstan question with a UK research article. The expected result is insufficient
evidence. It is not a source-specific repair finding or a new live-model result.
The eleven repeated requests in the history test are DEMO workflow input, not
messages to an operator. Capture review confirms task hierarchy and text remain
visible; it is not independent human usability research.

## Boundaries

- Local production-preview validation is distinct from the public Render preview.
  This task does not deploy, publish, push or call a paid AI provider.
- Browser AI uses an explicitly isolated mock provider and temporary DEMO reviewer
  credentials. It checks workflow compatibility, not live model quality.
- Emulated viewport checks are not physical Android/iPhone testing, a full WCAG
  audit, or a guarantee of video readability at every export resolution.
- Existing satellite/terrain rendering and frozen evidence packages are preserved.
  External imagery is blocked in the deterministic browser suite; fallback imagery
  is not a new scientific measurement.

## Source surfaces

- `apps/web/src/IntelligencePanel.tsx` and `workflow-polish.css`
- `apps/web/src/App.tsx` and `main.tsx`
- `apps/web/src/PlanQueue.tsx` and `EvidenceRequestPanel.tsx`
- `apps/web/src/IntelligencePanel.test.ts` and `EvidenceRequestPanel.test.ts`
- `e2e/audit-workflow.spec.ts` and `e2e/ai-review-workflow.spec.ts`
