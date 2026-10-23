# E2E browser testing

[Testing](README.md) · [Local setup](../development/local-setup.md) · [Run evidence](../evidence/README.md)

The [scripts/run-e2e.sh](../../scripts/run-e2e.sh) runner coordinates two isolated Playwright processes: the main workflow and the private/manual/mock-AI workflow. Run it from the repository root:

```bash
bun install --frozen-lockfile
bun run check
bun run playwright install chromium
bun run test:e2e
```

Chromium needs to be installed once if a managed browser is unavailable. On a host with Chromium, select its executable without downloading a browser:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e
```

The executable path must be correct for the host being used; the example does not mean that browser is always installed.

## Run one phase

```bash
bun run test:e2e -- e2e/audit-workflow.spec.ts
bun run test:e2e -- e2e/ai-review-workflow.spec.ts
```

The runner routes each file to its corresponding phase. Each phase runs regression checks for environment filtering/argument routing before opening the browser. A focused repeat is not counted as a new scenario in the coverage summary.

## Runtime isolation

- A dedicated API and Vite preview run on loopback, with a temporary audit file and Vite environment directory. Each phase sets `NODE_ENV=production` and rebuilds the frontend before opening the browser, so checked assets match the source at run time. The user's development server is not reused. The build updates `apps/web/dist/`; run phases sequentially.
- The coordinator, workers, and subprocesses receive an explicit environment allowlist; Bun dotenv autoload is disabled. Credentials from the caller's environment are not inherited.
- The private/manual/mock-AI phase uses a short-lived test token created by the runner; the deterministic provider also runs on loopback.
- The API uses the launcher with a kernel writer lock. The Chromium sandbox remains active locally and in CI that is not identified as GitHub-hosted; an exception applies only when `CI=true`, `GITHUB_ACTIONS=true`, and `RUNNER_ENVIRONMENT=github-hosted` are all set. The local host must permit the browser sandbox and local sockets.
- Workers confirm that caller credentials and `VITE_*` are not passed through. External HTTP requests, including tile/imagery requests, are blocked.
- Software WebGL is used for workflow checks. This does not measure a physical GPU/device or live imagery quality.
- If the host's `/tmp` quota is exhausted and `/dev/shm` is writable, the runner has a fallback temporary cache/store there. Development audit data is not used as a fixture.

## Journey coverage

| Phase | What it checks |
|---|---|
| Main historical workflow | Historical snapshot/source, map/case/auditor navigation, publisher indicators, baseline, history/report, checksum/tamper detection, and responsive/keyboard interactions defined by the spec |
| Investigation planner | Four allocations under the same limits, replay/export, pagination and unmet quotas, cancellation of stale responses, error/retry, and source-ID handoff that clears hidden filters and respects drafts |
| Investigation operations | Exact ordered queue 10→20, map/auditor ring handoff, delayed activation strategy guard, scope restore, expected digest for import, and parameter/snapshot comparison |
| Snapshot Change Watch | Two real releases, three affected selected source IDs, original field values, complete diff download, disjoint source pages, evidence handoff, stale strategy response and explicit error/retry; desktop/mobile captures with a panel-width limit |
| Plan reviewer history | Signed memory-only access, append/export/replay, CAS conflict preserving the draft, explicit load latest, and recovery draft separation by reviewer; decisions use DEMO fixtures |
| Connected investigation | Accepted allocation → exact source/scope → evidence request → authorized response with month precision → human assessment → immutable decision → revisit on new response; separate digest, private cross-origin header, desktop/mobile layout, and stale-response guard |
| Private/manual workflow | Scope, human determination without AI, private access, revised assessment, browser work/draft continuity, trust controls, and redacted public summary as defined in the spec |
| Shared team workflow | Two separate browser contexts, signed reviewer token per member, preview/import without deleting local notes, assignee/due date, CAS conflicts, explicit compare/rebase, rejection of old response history after latest review, Cases queue, reconnect, and retained draft when refresh fails |
| Public publication lifecycle | Correction/withdrawal, renewed consent, keyboard/cancel, reload/503, history pagination, human parent after baseline, and latest list after concurrent corrections |
| Mock document AI | Authorized synthetic excerpt, exact quote forwarding, skeptical provider pass, abstention, review revision, privacy, and exported bundle digest |

Specs and assertions are the exact coverage reference; scenario counts may change. [Active status](../release/current-implementation-status.md) points to the latest recorded run, while evidence records failures/reruns, snapshot, working tree, and limits.

The baseline example uses real source `KAZ_S_159` on snapshot `unep-mars-675417694883`. Bundled data does not prove mitigation; a modified report must be rejected by the verifier. The mock-AI excerpt is labeled synthetic and is not evidence for a real source. No test excerpt is sent to an external provider.

## Result limits

Passing tests demonstrate software behavior in the test environment. They do not measure real-model quality, authenticate real documents/reviewers, prove repair/zero emissions, test cloud durability, create a Sepolia transaction, or verify public tiles. Local TLS transport tests are separate from E2E, as recorded in the [command matrix](README.md).
