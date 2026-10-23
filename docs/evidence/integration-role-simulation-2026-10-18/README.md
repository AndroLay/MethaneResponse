# Agent role simulation for three integrations

**18 October 2026 — engineering simulation scope completed.** External AI providers, public hosting, and Sepolia receipts remain unverified. All provider requests in this package target a local HTTPS fixture; all transactions target Anvil 31337.

## Who did what

Three supporting agents worked under root coordination: two `gpt-6-luna` agents for provider and operator/chain design and execution, and one `gpt-6-sol` agent for critical review. They played seven roles: analyst, skeptical reviewer, faulty provider, unauthorized visitor, service operator, issuer, and verifier. The number of roles is not the number of people/experts or an independent assessment of methane truth. [Assignments](role-roster.json) and the [plan](../../plans/2026-10-18-integration-role-simulation.md) record these limits.

## What actually ran

| Area | Result | Limit |
|---|---|---|
| Provider → API | [13 scenarios](provider.json), one integration test/116 assertions; real TLS to fixture, two passes, fake quote, HTTP 429/503, redirect, malformed JSON/schema, oversized response, and stalled body **40,198 ms** | Model responses are fixture-defined; no external call/model or quality benchmark |
| Local deployment profile | API used `NODE_ENV=production`, access/consent/rights checks, CORS, private 0600 file mode, and SIGKILL/restart; [four production-preview HTTP checks](preview.json) matched HTML, entry JS, and manifest to build bytes | API and preview were checked separately; this is not browser rendering, public DNS/TLS, reverse proxy, cloud volume, or Render target |
| Chain | [One Anvil integration test](chain.json), including an RPC that accepts a transaction and then replaces the acknowledgment with 502; retry 409, durable pending state, matching hash reconciled, and only one nonce used | Disposable chain 31337; no Sepolia receipt or public explorer |
| State operations | [Two casework tests](logs/case-work.log) and [one publication test](logs/publication.log): backup/restore, writer lock, and process crash/restart | One writer and the same local file/volume; does not establish hosting persistence |
| Related checks | [34 focused tests](logs/focused-unit.log), [typecheck](logs/typecheck.log), [production build](logs/build.log), and [bundle gate](logs/bundle.log) exited 0; app 71,689 gzip bytes | Not a rerun of all 708 tests or all browser E2E from the P5/P6 package |

Final logs are available for [provider](logs/provider.log) and [chain](logs/chain.log); agent reports are [provider](provider-agent-review.json), [operator/chain](operator-agent-review.json), and [final review](review.md). The test commands recorded in this increment total 39 tests: 34 focused + one provider + one chain + two casework + one publication. The 13 provider scenarios are subcases in **one** integration test.

## Findings and changes

1. Deployment guidance that still said the file store had no anchor intent was corrected to match the P2 implementation.
2. Added an RPC regression where acknowledgment fails after transaction acceptance. That branch reopens the store/app within the same test process; a separate SIGKILL branch uses a child process. The verifier CLI runs as another process, using the same verifier implementation and local node.
3. Added a provider runner that filters the environment and uses temporary certificates and DEMO data/token. Review strengthened the second-pass payload checks and the anchor-rejection reason. Two initial fixture/helper mistakes are recorded in [findings](findings.md), not counted as application success.

**Limit deliberately exposed:** both provider passes can be wrong even when the quote matches exactly. Such a fixture returns `supported` as an **AI suggestion/unreviewed**, remains private, sets physical verification to `not_established_by_application`, and rejects anchoring with a human-review reason. This tests the product boundary; it does not prove that prompt injection has been semantically solved. `modelVersion` is a configuration alias, not a provider-verified model version identity.

## Rerun

From the repository root with dependencies/toolchains already installed:

```bash
bun run test:integration-roles --evidence /tmp/NEW-provider.json
bun run test:chain-integration --evidence /tmp/NEW-chain.json
bun run test:case-work-operations
bun run test:publication-operations
bun run check
bun run build:web
bun run check:web-bundle
bun --no-env-file docs/evidence/integration-role-simulation-2026-10-18/production-preview-smoke.ts /tmp/NEW-preview.json
```

Choose output paths that do not already exist. The runner does not load `.env` or forward provider/signer/operator-state credentials. The preview helper filters the proxy for loopback fetch and uses an empty environment for Vite config. The final run used the API PID directly, confirmed health stopped after SIGKILL, and waited for its own process to exit. The provider test takes about 40 seconds to exercise the actual deadline.

## Status of the three external targets

| Actual target | What remains |
|---|---|
| External AI provider | Approved provider/server credential, scope and cost limits, and permitted inputs; run the real provider. Model eligibility still follows P6; protocol tests do not change the activation decision. |
| Public deployment | Approved hosting account/target, HTTPS/origin, access, `flock`, durable private volume, and recovery on that target; check frontend/API end to end at the public URL. |
| Sepolia receipt | Fund approved issuer with test ETH, deploy registry, anchor, and verify a public-network receipt; the earlier P2 operations approval still applies, and the old faucet is not retried. |

No credentials were changed, funding was purchased, external message sent, public deployment made, or Sepolia transaction submitted in this increment. The [manifest](manifest.json) and [checksums](checksums.sha256) bind results to their sources. The historical P1–P6 packages remain preserved; receipts/hashes bind integrity and version order, not physical repair or emissions reduction.
