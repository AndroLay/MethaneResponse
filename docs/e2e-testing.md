# Browser E2E workflow

Run the repeatable browser journeys with:

```bash
bun install --frozen-lockfile
bun run check
bun run playwright install chromium
bun run test:e2e
```

The runner executes two isolated Playwright processes. Both start a dedicated API and Vite process on loopback, use a fresh temporary file store and empty Vite environment directory, and never reuse a developer's already-running app. The coordinator, test workers and server processes receive an explicit environment allowlist; Bun dotenv autoload is disabled for these processes. The AI phase adds only fresh, short-lived test credentials. External HTTP requests, including basemap tiles, are blocked.

To run only one journey, pass its file path; the runner routes it to the matching process:

```bash
bun run test:e2e -- e2e/audit-workflow.spec.ts
bun run test:e2e -- e2e/ai-review-workflow.spec.ts
```

The runner's environment filter and argument routing have focused regression tests, and both browser workers assert that caller credentials and `VITE_*` values are absent. These checks run automatically before the browser journeys.

The baseline journey pins `KAZ_S_159` from `unep-mars-675417694883`, checks dated observations, runs the deterministic mitigation-claim baseline, exports JSON, verifies its local SHA-256 digest, then modifies the report and expects the verifier to reject it. It runs with AI, database, reviewer, and Sepolia credentials unset.

The AI/reviewer journey starts a deterministic test-only OpenAI-compatible provider on loopback. Its runner creates fresh, short-lived assessment and reviewer credentials before Playwright starts the API and browser worker, then passes those same values to each process. The test submits an explicitly labeled synthetic excerpt against the historical MARS source, checks API authorization, exact quote forwarding, the skeptical second provider pass and abstention, records a distinct `needs_more_evidence` human-review revision, verifies private-report access rules, exports the bundle, and checks its SHA-256 digest. Provider counters assert that both model calls used the expected case, claim, and exact quote. The exported report omits the submitted excerpt.

This AI test verifies the application integration and security boundaries with a deterministic local stub. It does not assess real-model quality, validate the synthetic excerpt as evidence, authenticate a real document or reviewer, establish physical mitigation, test cloud persistence, issue a Sepolia transaction, or verify live imagery. No submitted test excerpt is transmitted outside localhost.

On this Linux development host, Chromium is already installed at `/usr/bin/chromium`; use `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e` to avoid downloading a browser. If the host's `/tmp` quota is exhausted and writable `/dev/shm` exists, the runner uses `/dev/shm` for Playwright's transient transform cache and its isolated audit store. GitHub Actions installs the managed Chromium build before running the same test.

The browser runs with software WebGL and no external tile access. These workflows prove local software behavior only; they do not establish operational readiness or climate impact.
