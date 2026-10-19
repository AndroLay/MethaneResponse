# Human investigation workspace — local implementation evidence

**Date:** 17 October 2026 (Asia/Makassar)  
**Baseline:** local `main` at `a82e2eee99bb79327f859f304f2f5d5939f07041` plus the uncommitted implementation. Existing investigation, demo and research edits were preserved.  
**Runtime:** Bun 1.4.3, Chromium 153.0.8010.52. The repository's existing Bun pin was not changed.

## Delivered scope

1. **Independent human evidence assessment.** An authenticated reviewer records an exact claim, bounded period/event, up to 12 inspected reference metadata records, rationale, determination and next evidence request. Schema 4 records the reviewer, separate baseline coverage, immutable revisions and parent hash. It requires no AI provider, text processing or remote document fetch. Strong outcomes need matching reference types; an insufficient-evidence decision remains independent of a supported rules result.
2. **Bounded deterministic rules.** Scope is tied to the dataset/source and optionally a particular observation. Invalid dates, unrelated observations, undated/out-of-period references and recipient mismatches are excluded or rejected. Mitigation-reference coverage requires action and dated follow-up metadata. The legacy unscoped baseline stays available. A named-recipient baseline is private.
3. **Resumable analyst work.** Mutable question, notes, evidence request, next action, triage status, claim and scope are saved explicitly in browser-local storage, separate from immutable audit records. Cases filters work status and sorts the existing snapshot-matched priority heuristic. Stale saves are rejected; storage failure does not report success. Editors wait for the intended dataset rather than accepting edits against a temporary DEMO fallback.

Human assessments stay private through public list/detail/verification routes and cannot be anchored or reconciled. Markdown briefs omit private claim text, recipient, references and free-text reasoning. Authorized JSON exports retain private assessment material. Reviewer credentials remain in session memory; they are not saved as case notes or included in these captures.

## Reproduce

Run from the repository root with installed dependencies:

```bash
bun run test:api
bun run test:web
bun run test:verifier
bun run check
bun run build:web
bun run check:web-bundle
env PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e e2e/audit-workflow.spec.ts --max-failures=1
env PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e e2e/ai-review-workflow.spec.ts --grep 'local mock AI citations' --max-failures=1
env PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e e2e/ai-review-workflow.spec.ts --grep 'late document responses' --max-failures=1
env PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e e2e/ai-review-workflow.spec.ts --grep 'human-only evidence' --max-failures=1
git diff --check
```

The browser runner uses disposable API stores, isolated Vite configuration and temporary scoped tokens. The AI workflows use a deterministic local mock provider; browser requests outside localhost are blocked. The API tests also exercise the human-only path with the document provider disabled and assert it is never called. Chromium needed host execution permission because the sandbox denies its socket operations.

## Final results

| Check | Recorded result |
|---|---|
| API unit/integration | 116 passed, 0 failed, 20 files |
| Web logic/component | 220 passed, 0 failed, 45 files |
| Verifier/tool regressions | 34 passed, 0 failed, 6 files |
| API, web and E2E TypeScript | Passed |
| Production build | Passed; existing large MapPanel advisory remains |
| Compressed bundle budget | Passed; App 74,879 gzip bytes; 8 route chunks; MapPanel 1,122,953 raw bytes |
| Main Chromium suite | 11 passed together in one final invocation |
| Existing mock-AI review/publication scenario | 1 passed in an isolated final invocation |
| Late-document-response regression | 1 passed in an isolated final invocation |
| Human-only assessment scenario | 1 passed in an isolated final invocation |
| E2E runner environment regressions | 3 passed in each of the four final invocations |
| Diff whitespace check | Passed |

The human browser scenario creates and revises a decision independently of rules coverage, verifies unauthorized reads return 404, downloads a redacted Markdown brief, unlocks private history, verifies the saved digest with authorized read access, locks history, and confirms the active private report is cleared. It asserts zero document-AI assessment requests and no page exceptions. The case-work scenario deliberately delays the dataset, then saves, refreshes, resumes the scope and notes, runs the baseline, checks highest-priority ordering, filters saved work, and checks 390 px page bounds.

API regressions include file-store restart, stale-parent rejection, immutable ancestors, source/snapshot/event/recipient isolation, metadata requirements, private caching/visibility, and anchor/reconciliation denial. Web tests cover local-storage failure, namespace isolation, stale revisions, private export redaction, comparison and canonical digest verification.

## Review and intermediate failures

- Read-only safety review found wrong-recipient contrary evidence, foreign observation IDs in period-only references, differing fallback case identity, a reconciliation bypass for human bundles and an empty DEMO event selector. These were corrected and covered by focused regressions.
- Browser testing exposed selected-case pagination overriding a new priority sort. The page anchor now follows selection/context changes; sorting opens the first queue page.
- A cold load exposed editable temporary DEMO data before the requested historical dataset arrived. Editors now wait for the requested dataset. The regression deliberately holds the catalog request before checking that editors are absent.
- The old Review button selector became ambiguous after adding Human assessment. The test now matches the intended Review step explicitly.
- Some combined browser attempts lost the Vite server with exit 143 and subsequent connection-refused errors. Those runs are not counted as passes. The final main suite passed together; the three manual/mock-AI cases each passed in a fresh process. No application fix is claimed for the unexplained process termination.
- Initial screenshot capture retained a sticky header over the scrolled form. Final captures clear focus and scroll to the page top first; this was a capture setup correction.

## Inspected captures and file binding

- [Case work and queue — desktop](case-work-queue-desktop.png)
- [Case work and queue — mobile](case-work-queue-mobile.png)
- [Human determination — desktop](human-assessment-desktop.png)
- [Human determination — mobile](human-assessment-mobile.png)

Desktop capture uses 1600 × 1000 and mobile 390 × 844 Chromium viewports; full-page images are taller. The reference text marked CONFIDENTIAL is a test fixture, not a third-party report. The images show the saved human decision separately from baseline coverage and the saved work status separately from priority. They were visually inspected; mobile controls fit the page and stack vertically.

[implementation-manifest.json](implementation-manifest.json) records hashes of changed implementation/test files in this working tree, including the preceding investigation changes they build on. [SHA256SUMS](SHA256SUMS) binds this record, the manifest and four captures. Raw browser traces, tokens and third-party document bodies are not included.

## Limits

Reference metadata checks do not authenticate an entered document or establish physical mitigation. A human token identifies a configured local reviewer, not a verified external professional. Document AI remains source-level; clear the event/period scope to use it. Schema 4 has no publication or anchoring path in this prototype.

Mutable notes are unencrypted browser-local data, not shared case management. Clearing browser storage removes them. Revision checks are not transactional locking across simultaneous tabs. The JSON audit store serializes one instance; multi-instance writes and hosted durability are outside scope. Python pipeline and Solidity source are unchanged and their suites were not rerun. These checks establish local software behavior; no deployment, external provider quality, target-user result, physical-device performance or emissions reduction is established.
