# P4 — Research Finding Remediation and Refreezing

**Authorization:** the user asked to address all issues, including tests already authorized. **Code owner:** primary agent; one read-only agent reviewer for compatibility risks. Follow the persistent-plans adapter; work in the active checkout without a new commit/reset/worktree.

**References:** [F01–F13 triage](../research/p4-research-bundle-assessment-2026-10-18.md), [checklist](../testing/p4-review-checklist.md), [six-package plan](2026-10-17-six-package-completion.md). Baseline HEAD `a82e2eee99bb79327f859f304f2f5d5939f07041` had 163 locally changed/new paths before this work. Preserve user changes.

## Design and boundaries

- Fix URL validation so invalid input returns 400 rather than an exception/500; retain HTTPS and the prohibition on credentials.
- New coverage rules consistently check pointers, dates, and follow-up. Notification/mitigation claims require scope; older baseline requests remain accepted with a conservative result and a reason explaining the missing scope. Do not recompute saved bundles.
- Use one helper to interpret calendar dates strictly; timestamps with offsets map to their UTC day, and MARS timestamps without offsets are treated as UTC. The resolver and assessment use the same helper.
- Add semantics to new bundles before hashing: whether the basis is metadata, human, or model, and that physical verification is not established by the application. The field may be absent in older bundles. A reviewer of a model result does not change its basis to an independent human assessment.
- UI, history, and brief show the meaning of results according to their basis, without unsupported claims of reviewer independence. Keep the public summary schema 1 projection and its historical hashes byte-identical; put added explanations in the display.
- DEMO data remains fictional; `fixture://` references are allowed only for DEMO evidence. Keep dataset, license, and publisher claims separate. Add no external notifications, provider, estimated emissions reductions, or deployment.
- P4 v1 becomes a historical snapshot. Create a v2 package bound to the new code/data; human results remain 0 until real reviewers are available. Do not mark the human-results checklist complete.

## Milestones and acceptance evidence

1. **Done — URL input.** Added schema and handler regressions for primary/follow-up references: malformed/blank, HTTP, credentials, and valid HTTPS. Ran red, fixed, then green. Files: shared index and API human-assessment tests.
2. **Done — coverage and time.** Added relevant M01–M18 regressions: missing/space-only pointer, missing scope, recipient trimming, UTC midnight, invalid calendar, follow-up/conflict. Files: shared evidence policy, audit/scoped-source, DEMO fixture, and conformance tests. Kept benchmark labels fixed; test calls use an explicit fixture scope.
3. **Done — semantics and compatibility.** Added a shared semantics helper for the API bundle builder and API/browser/CLI verifiers. Tested that old hashes remain valid, new fields are hash-bound, and false physical-verification claims are rejected. Do not change the schema 1 public-summary projection.
4. **Done — views and exports.** Applied the helper to verdict/report/history/brief/public views, separating reviewer assessment from physical verification. Ran component/export tests and focused browser checks, including mobile.
5. **Done — dispositions and v2 package.** Added a ledger disposition for every F01–F13: technically fixed, controlled, scope decision, or requiring an expert/primary evidence. Created a new case package, baseline, and hashes; preserved v1 and earlier evidence. Updated active status and the index.
6. **Done — engineering review and verification.** Ran affected API/web/verifier/typecheck/build suites, the full gate where cross-layer changes required it, and relevant E2E checks. A read-only reviewer checked concrete risks; recorded actual results and the source manifest in new evidence.

## Completion gate

Technical work is complete once relevant regression and integration checks pass, every finding has a reasoned disposition, and the v2 package is reproducible. P4 as a whole still requires independent experts, assessment results, rechecking material findings, and summary permission. Expert availability does not block technical fixes that can be made now.


## Execution results

- The full local gate passed: 193 API, 247 web, 37 verifier, 160 Python, and 4 contract tests; typecheck/build and the entry budget of 71,689/75,000 gzip bytes passed. Markdown briefs load dynamically during export to keep the entry within budget.
- Full browser invocations passed 14 + 9 application scenarios; four additional checks passed, including the v2 package reader, assessment results, comparison, and export/verifier. Desktop/mobile viewports and five P4 screenshots were inspected.
- Publication SIGKILL/restart tests and local Anvil integration each passed. No public deployment/transaction or real provider was used.
- The read-only code reviewer found four callers/compatibility issues, which were then fixed with regressions. The agent's final recheck was not completed because of usage limits; the primary agent inspected the changes and ran the gates. This is not expert review.
- The [F01–F13 ledger](../research/p4-research-remediation-2026-10-18.md) and [v2 package/evidence](../evidence/domain-review-remediation-2026-10-18/README.md) are the technical outputs. V1 retains 31 artifact hashes; the public summary schema 1 projection is byte-identical to the P3 source.

**The engineering work in this plan is complete locally.** Human domain review and ARG source questions remain open as recorded in the ledger; the five P4 human-results checklist items remain unchecked.
