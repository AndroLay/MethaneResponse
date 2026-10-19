# Trust and transparency evidence — 17 October 2026

This record covers the local trust increment on the existing dirty `main` checkout based at `a82e2eee99bb79327f859f304f2f5d5939f07041`. It does not certify factual correctness, physical mitigation, independently vetted real reviewers or a public remote service. Earlier evidence directories remain historical snapshots.

## Implemented behavior

- Optional official-publisher HTTPS origin/byte checks with a fixed host allowlist, public DNS checks/pinning, hostname validation, no redirects, bounded size/time, main/follow-up digests and optional declared-digest comparison. Mismatch prevents a decisive human result. No report body is retained.
- Server-owned reviewer attestations and category authority with expiry, explicit revocation and fail-closed unavailable configuration. Directory status is derived by the server and bound into the immutable human revision. Private read/history/verify and legacy review paths honor explicit revocation; private history filters categories before pagination. Strict mode is documented; compatibility mode permits token-authenticated unverified/expired reviewers with missing-assurance labels. Conflicts are separately self-reported.
- Per-revision opt-in public summaries with a closed redacted projection and separate digest, anonymous pagination/detail/download, browser digest checking and tamper rejection. Full human bundles remain private. Reports makes private preview/JSON disclosure explicit.

## Checks

| Check | Result |
|---|---|
| API suite | 129 passed in 23 files |
| Web suite | 230 passed in 47 files |
| Existing verifier suite | 34 passed in 6 files |
| Real local TLS transport regression | 1 passed, 10 assertions |
| API/web/E2E TypeScript | Passed |
| Production web build | Passed |
| Existing web bundle budget | Passed: App 73,946 gzip bytes, unchanged 75,000-byte limit, 8 required route chunks |
| New DEMO browser flow, focused run | 1 passed; runner environment regressions 3 passed |

Complete browser runs passed: **13/13 main scenarios** in 1.8 minutes and **4/4 private/manual/mock-AI scenarios** in 54.6 seconds, each with 3/3 runner environment regressions. The 393 API/web/verifier tests plus one TLS regression total **394 distinct non-browser tests**. Focused repetitions are not additional distinct cases.

The TLS test creates a temporary self-signed fixture CA/key and loopback TLS server. A deliberately nonresolvable fixture hostname reaches the explicitly pinned local address, the content digest matches independently computed bytes, a mismatched certificate hostname is rejected, an oversized response is rejected, an incomplete streaming response times out, and a redirect target is never visited. The temporary key/certificate/server are removed. This tests actual Bun HTTPS transport, rather than an injected HTTP response alone. It does not contact a real report publisher.

The focused browser test exercises the real server directory loader using an ephemeral **DEMO** enrollment record, optional checking of an unlisted fixture URL (left unchecked), explicit summary consent, consent reset, anonymous redacted read, protected full read, public download/checksum and changed-content rejection. It asserts no external AI call, browser exception or mobile horizontal overflow. Two screenshots show fictional synthetic assessments, never real reviewer enrollment or mitigation evidence.

## Review

One independent read-only reviewer examined the privacy, authority and HTTPS boundaries. Findings fixed: directory revocation had not covered private reads/legacy reviews, and Reports needed explicit private preview/JSON labels. Re-review confirmed those fixes. The review identified compatibility-mode expiry/deletion semantics; operation documentation now explains `disabled: true` revocation and strict mode. The reviewer did not run tests or certify external identity.

## Reproduce

```sh
bun run test:api
bun run test:web
bun run test:verifier
bun --no-env-file test scripts/evidence-transport.test.ts
bun run check
bun run build:web
bun run check:web-bundle
env PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e e2e/audit-workflow.spec.ts
env PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e e2e/ai-review-workflow.spec.ts
git diff --check
```

Use the repository's isolated browser runner. The TLS regression needs OpenSSL and loopback socket permission; Chromium needs permission for its sockets and localhost servers. No dependency or browser installation is implied. Bun was 1.4.3. API data is isolated to a disposable JSON store; browser credentials are generated for the test and excluded from retained screenshots.

## Captures and limits

- `trust-transparency-desktop.png`: 1280 × 2343 full page.
- `trust-transparency-mobile.png`: 390 × 3962 full page, viewport emulation.
- Both were visually inspected. The invalid-upload message is expected: each capture follows an intentional tamper rejection. Private preview text is visibly labeled and consists only of fictional DEMO notes. Reviewer tokens were cleared before capture.
- `implementation-files.sha256` binds the listed source/test/docs files to this checkout. `SHA256SUMS` covers evidence artifacts. These are unsigned comparison checksums, not third-party or blockchain attestations.
- Directory operator attestation requires actual identity/authority checks outside this code; conflict independence is not independently verified. There is no real reviewer enrollment or external issuer signature verification.
- Publisher retrieval supports only the fixed hosts and available direct public URLs. A successful fetch or expected-digest match proves no document truth; inaccessible/unlisted URLs remain unchecked. No real external reference retrieval was used to establish accuracy.
- Public summaries hide evidence and reasoning; their private commitment cannot be fully checked by an anonymous reader. Summary hashes detect edits against supplied digests, not issuer identity or publication time. Summary consent is revision-specific and prior public summaries are not withdrawn.
- Local JSON remains single-instance persistence. No shared hosting, target-user study, external model call, physical-device study, chain transaction, Notion mutation, external messaging or deployment was performed. Python/data and Foundry suites were not rerun for this increment.
- Existing MapPanel raw-size advisory remains; the configured gzip/route budget passed.

## Intermediate failure

One combined browser invocation passed its first seven main cases, then its Vite development server exited with SIGTERM/code 143. The next case could not load its route and remaining cases reported `ERR_CONNECTION_REFUSED`; the private/manual phase did not start. That interrupted invocation is not a passing run. Phases were re-run separately with no application-code workaround or weakened assertion.
