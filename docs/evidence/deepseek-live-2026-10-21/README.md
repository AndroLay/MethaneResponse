# DeepSeek live-provider smoke test — 21 October 2026

**Result:** all three DEMO scenarios passed through Hono and the real provider.
Five provider calls returned HTTP 200 and `deepseek-v4.1-flash-1017`.
See [smoke-summary.json](smoke-summary.json).

| Project-authored DEMO document | Stored verdict | Total assessment time |
|---|---|---:|
| Explicit source detection | `supported` | 7,420 ms |
| Administrative response without mitigation verification | `insufficient_evidence` | 3,538 ms |
| Ledger explicitly contradicting notification on the claimed date | `contradicted` | 4,268 ms |

All three API responses returned HTTP 201 with valid bundle hashes and envelopes.
Strong verdicts passed a second assessment by the same provider and exact-quotation
validation. This is not independent validation. The private report is
`delivery-output/deepseek-live-2026-10-21/live-smoke.json`; its checksum is recorded
in the summary. The run used a modified working tree based on `b3f96a0`, not the
unchanged commit. Reproduction: [integration guide](../../development/deepseek-integration.md).

## Software verification recorded for this run

- `bun run check`: API, web, browser and evaluation TypeScript checks passed.
- API: 301 passed, zero failed; verifier: 66 passed, zero failed.
- The API count includes 11 provider/profile regressions, including rejection of
  truncated responses after adding an output limit. The verifier count includes
  three live-probe guards and two deployment-configuration checks.
- The browser/schema workflow passed 12 checks: 11 browser journeys and one
  schema check, using Chromium headless shell 156 and Playwright 1.64.1. Assertions,
  timeouts and sandboxing were unchanged. These used an isolated mock provider;
  they were not 12 live-provider evaluations. The runner also built Vite.
- The first attempt lacked the default browser executable. System Chromium 153
  produced seven passes and five failures, including a response-body protocol
  error. Downloading into `/tmp` hit its write quota; the ignored `.playwright-cli/`
  cache then supplied pinned Chromium 156, which passed all 12 checks.

## Interpretation and cost

The provider reported 2,407 tokens and USD 0.001001436 for five calls. These are
response metadata, not an invoice audit or a promise of future free calls.
Render had not been deployed during this work because its workspace-wide zero-cost
limit could not be verified. This work triggered no Render charge.

The documents were authored by this project, labeled DEMO and held in a temporary
in-memory store. KAZ_S_159 binds the real route and historical provenance; DEMO
sentences do not become observational or notification evidence. This demonstrates
transport and workflow compatibility on three examples, not accuracy, superiority
over rules, human usefulness, equipment repair or emissions reduction.
