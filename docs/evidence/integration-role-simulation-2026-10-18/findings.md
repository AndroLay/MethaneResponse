# Findings and follow-up

| ID | Finding | Action and evidence |
|---|---|---|
| R01 | Deployment guidance said anchor intent was not implemented | Updated the guidance to match P2; application runtime was not changed |
| R02 | A crash test after broadcast did not prove RPC acknowledgment loss | Loopback proxy forwarded the transaction to Anvil, then returned 502. Intent/hash were retained, retry returned 409, and exact-hash recovery with nonce +1 passed |
| R03 | Initial reviewer-directory fixture had a space in `checkedBy` | Matched the fixture identifier to the schema. The 401 rejection is a working application control, not an authentication defect |
| R04 | Provider fixture initially stopped at the server's 10-second idle timeout | Set fixture to 60 seconds and asserted 39–48 seconds elapsed. Final run reached 40,198 ms; the earlier run is not used as deadline evidence |
| R05 | Test payload could accept full documents on both passes; anchor 409 did not check its reason | Reviewer requested checks based on pass order and the exact error body. Final run passed 13 scenarios/116 assertions |
| R06 | Initial preview helper inherited a proxy for parent fetch and misspelled the manifest name | Filtered proxy settings in the transient helper process and used `mars-snapshot-manifest.json`. Four final byte/status checks passed; user/app environment was not changed |
| R07 | Both provider passes can wrongly support a physical outcome claim without evidence, despite an exact quote | Retained as a semantic limitation, not claimed as resolved. Fixture demonstrates unreviewed/private/physical-not-established labels and blocks anchoring before review; it does not establish whether repair actually occurred in the world |
| R08 | `modelVersion` stores a configuration alias | State the provenance limit; do not claim that the provider-served model version was verified |
| R09 | Stopping the launcher could make restart evidence ambiguous | Final fixture used `flock -F` directly on the API, a canonical path, and health-down after SIGKILL before restart; readiness checked child exit before/after health. It does not rely on a wrapper that may leave a listener behind |
| R10 | Initial claim only described investigation, so `supported` did not prove false support for a physical claim | Final claim explicitly requires repair, independent post-action measurement, and sustained reduction; the excerpt contains investigation/no measurement only. Final run used that input; it does not claim real-world repair is impossible |

No new application runtime defect was found in this review. Code changes added tests/runner, while API, web, and shared sources match the P5/P6 source freeze. Intentionally faulty fixture results are not a human gold set/benchmark or a measure of AI quality.
