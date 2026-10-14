# Browser E2E workflow

Run the repeatable local MARS → audit → report → verifier journey with:

```bash
bun install --frozen-lockfile
bun run check
bun run playwright install chromium
bun run test:e2e
```

The Playwright configuration starts a dedicated API and Vite process on loopback, uses a fresh temporary file store, and leaves AI, database, reviewer, and Sepolia credentials unset. It never reuses a developer's already-running app. The test pins `KAZ_S_159` from `unep-mars-675417694883`, checks its dated observations, runs the deterministic mitigation-claim baseline, exports JSON, verifies its local SHA-256 digest, then modifies the report and expects the verifier to reject it. External HTTP requests, including basemap tiles, are blocked so the test does not depend on imagery availability or transmit test input.

On this Linux development host, Chromium is already installed at `/usr/bin/chromium`; use `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e` to avoid downloading a browser. If the host's `/tmp` quota is exhausted and writable `/dev/shm` exists, the runner uses `/dev/shm` for Playwright's transient transform cache and its isolated audit store. GitHub Actions installs the managed Chromium build before running the same test.

This test proves the software path using a real historical MARS snapshot and a deterministic baseline. It does not test AI-provider quality, a human reviewer identity, cloud persistence, live imagery, a Sepolia transaction, physical mitigation, or mobile-device performance. The browser runs with software WebGL and no external tile access.
