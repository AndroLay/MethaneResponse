# Increment review

Root was the sole repository writer. Two Luna max agents helped design cases/comparisons and ran the manual baseline in fresh contexts; one Sol high agent performed read-only review of code and artifacts. This was software/simulation review, not methane-expert review or human research.

## Findings and closure

| Finding | Action / evidence |
|---|---|
| Draft scope could be lost when navigating between pages | Save four allowlisted fields per context/tab; clear them after a scope change is accepted; show storage failure. Browser check navigated to Reports and back before Apply |
| Suspected stale scope inputs after resume | Withdrawn after inspecting `key={contextKey}`, which remounts the workflow based on source/work/claim/scope; not a proven bug |
| Legacy verifier-helper default differs from strict UI | Preserve helper compatibility; UI passes `requireExportContext:true`; difference documented |
| Five manual cells had different data types | Preserve raw 11/16 exact result, mark prompt format as incomplete, add post-hoc sensitivity analysis mapping only the five booleans. Do not claim app is more accurate |
| Overclaim metric did not read all text | State that the count is limited to two booleans; root reviewed free text and case studies separately |
| Casebook hash recorded but not checked during routine replay | Root checked hash at closure; replay did use the frozen input copy |
| README referenced closure artifacts that were not available in initial review | Logs and verification were created; source archive/manifest/checksums were created after review. Final hash/link checks ran after the freeze |

The reviewer found no material contradiction in the parity conclusion or the facts in the three cases. Observation/uncertainty values, flags, and dates were checked against the casebook; action summaries remain attributed to the UNEP catalog page. No earlier P4/P5/P6/integration package was changed; 204 checksums matched.

## Review limits

The reviewer did not rerun all tests. Root ran the full local gate and four Chromium scenarios; results are in logs and `verification.json`. The reviewer read-only checked 118 production-file bindings, inputs/protocol/rubric/harness, and cases. Source/packet hashes bind files; they do not certify the publisher or establish field evidence.
