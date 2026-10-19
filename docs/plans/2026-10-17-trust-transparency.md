# Trust and transparency implementation

Execution follows the adaptive-engineering persistent-plans adapter. Owner: root; one writer in the existing dirty checkout. Preserve all prior workflow work. No deploy, real reviewer enrollment, credential changes or external publication in this task.

## Goal and decisions

Strengthen reference provenance, reviewer accountability and public transparency without claiming document truth, independently verified identities, or physical methane mitigation. Existing schema 2/3/4 exports remain compatible. Full human assessments stay private.

- Public reference checking is explicit and server controlled: HTTPS, exact publisher allowlist, public DNS addresses pinned to the TLS request, no redirects, credentials, cookies, full-document storage or reproduction. Record retrieval status, time, content digest, optional expected digest comparison. A successful retrieval attests origin/bytes only. Unsupported/private links stay unchecked.
- A server-owned reviewer directory supplies time-bounded operator attestations, allowed claim categories and revocation. Tokens cannot self-assign a directory identity or authority. A separate conflict declaration is explicitly self-reported. Default is unverified; no real identity is invented or enrolled.
- An explicit consent creates a separately hashed public summary in the private immutable bundle. Only a fixed field allowlist leaves the private boundary: source/category/outcome, period, dataset commitment, counts, assurance statuses, chronology, limitations. No claim wording, recipient, URLs, notes, locators, names or report content. Public endpoints expose only summaries whose private audit passes integrity. Complete private audit endpoints remain protected.

## Milestones and checks

- [x] Reference checks: shared schemas, `apps/api/src/evidence-check.ts`, isolated transport/DNS tests, opt-in assessment integration. Reject SSRF, redirects, oversized bodies, timeouts, digest mismatches; failures do not become verified results.
- [x] Reviewer assurance: `apps/api/src/reviewer-directory.ts`, server-only directory loader and private current-reviewer endpoint. Test missing, malformed, expired, disabled, unsupported claim, forged input and safe defaults. Bind assurance into hashed audit.
- [x] Public summaries: shared strict projection, API list/detail, browser download/check, assessment consent and saved assurance display. Test explicit opt-in, no private field leakage, tampering and file restart; public hash describes summary only, not external certification.
- [x] Verify focused then complete API/web/verifier/type checks, build and bundle budget. Browser test the visible manual flow and public summary round trip with isolated DEMO fixtures. Independent read-only review if it can improve privacy/security decisions.
- [x] Document operation, configuration and residual limits; update current status with exact evidence.

## Baseline

Starting tree has earlier uncommitted API, web, shared, test and documentation changes. Previous evidence (379 unit/integration and 16 browser cases) predates this increment; it is not acceptance evidence for these changes.

## Completion evidence

All milestones verified locally: 129 API, 230 web, 34 verifier and 1 real loopback TLS transport test (394 distinct non-browser tests), TypeScript API/web/E2E, build, App gzip budget 73,946/75,000, 13 main and 4 private/manual/mock-AI browser cases in complete separate runs, with runner 3/3 regressions per invocation. A focused DEMO browser repeat is not counted twice. Independent read-only review found revocation/read and private-sharing-label gaps; both were fixed and re-reviewed. Compatibility-mode expiry/deletion semantics are documented.

The first combined browser run was interrupted by Vite SIGTERM/code 143, causing connection failures after seven main passes. The separate full runs passed without weakened assertions or an application workaround. See docs/evidence/trust-transparency-2026-10-17/README.md for commands, captures, checksums and limits.

No external reviewer identity was enrolled, no real publisher document was fetched to claim factual accuracy, and no external publication, credential change, model call, transaction or deployment was performed. The task strengthens mechanisms; operational identity vetting and physical follow-up evidence remain external prerequisites.
