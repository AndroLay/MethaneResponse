# Testing and evidence

[Documentation home](../README.md) · [Local setup](../development/local-setup.md) · [Dated evidence](../evidence/README.md)

Run all commands from the repository root. Choose checks that match the change; this table explains how to test, not which commands were run for every documentation revision.

## Command matrix

| Command | What it checks | Prerequisites/limits |
|---|---|---|
| `bun run check` | TypeScript for API, web, and E2E | Bun dependencies; not a runtime/browser test |
| `bun run test:api` | Routes, baseline, private access, trust, revisions, and store | Local file/in-memory fixtures; no database |
| `bun run test:web` | Browser components and workflow/verifier logic | Not a physical-device rendering measurement |
| `bun run test:case-work-operations` | CLI backup/restore, writer lock, API crash/restart, and shared state over HTTP | Linux `flock`, local socket, private disposable fixture; parent environment is filtered |
| `bun run test:publication-operations` | Durable publication lifecycle over HTTP, `SIGKILL`, and API restart | Loopback, DEMO, one writer; not remote publication |
| `bun run test:integration-roles` | 13 role scenarios through an HTTPS fixture provider → local production API: consent/access, per-pass payload, failures, 40s deadline, privacy, and restart | OpenSSL/local socket; one integration test, not an external model/provider or public deployment |
| `bun run test:verifier` | Report verifier, AI benchmark tooling, frozen inputs, deployment/config, map helpers, and local-gate guards | Not a live AI/provider benchmark |
| `bun run test:e2e` | Chromium journeys with an isolated API and production/preview Vite build, including manual and mock-AI paths | Browser and local process/port permission; rebuild per phase; details in [E2E](end-to-end.md) |
| `bun test scripts/evidence-transport.test.ts` | Real HTTPS/TLS transport against a loopback fixture | OpenSSL and local socket; does not fetch external publisher reports |
| `bun run test:data` | Python pipeline/import/intelligence/evaluation | Python 3.11+, `uv`, locked research extras |
| `bun run evaluate:baseline` | Rules evaluator conformance | Small dataset; not general accuracy or an independent benchmark |
| `bun run test:contracts` | `EvidenceRegistry` invariants/behavior | Foundry; does not create public network transactions |
| `bun run build:web` | TypeScript/Vite build and pruning of uncleared assets | Does not run/deploy the API |
| `bun run check:web-bundle` | Entry gzip budget, lazy map, and route chunks | Run after build |
| `bun run check:all` | Install/check, API/web/verifier, build/bundle, Python, baseline, and Foundry | Full toolchain; **E2E, casework/publication operations, chain integration, and TLS transport are separate** |
| `bun run test:chain-integration` | Anvil loopback 31337, `SIGKILL` before/after broadcast, revert, revision, and separate verifier | Forge/Anvil, local socket; isolated environment; **not public Sepolia** |
| `bun run verify:audit path/to/report.json --require-context` | Bundle and application-export context checksum | Omit the flag for raw legacy audit; unsigned checksum, not issuer authentication/physical fact |
| `bun run measure:map-performance` | Configured browser/device measurements | Read script options and record GPU, network, revision, viewport, and tile conditions |
| `bun run verify:plan history.json --expected-head 0xTRUSTED_SHA256` | Reviewer revision chain, full policy replay, and plan journal head match | Obtain digest separately; not an identity signature, current status, or chain receipt |
| `bun run verify:investigation dossier.json --expected-digest 0xTRUSTED_SHA256` | Investigation history, exact plan revision, snapshot/assessment relationships, and canonical dossier digest | Private export ≤16 MiB; trusted digest must be separate; not reference authentication |
| `bun run verify:investigation-decision decision.json --expected-digest 0xTRUSTED_SHA256 --require-chain` | Frozen decision, dossier, hash, event/issuer/version, and current registry head | Requires a receipt and configured read-only RPC with the flag; without the flag local integrity still does not prove repair |
| `bun run prove:operations --output NEW_DIRECTORY` | Real snapshot 10→20, FilePlanStore reopen, and six CLI/tamper invocations | New directory; DEMO software reviewer, one snapshot, no AI provider or chain |
| `bun run prove:snapshot-transition --output NEW_DIRECTORY` | Full diff of two real snapshots, capacities 10/20, eight CLI processes including edit+rehash, and separate Python oracle | Both gzip files + pinned manifest; not live monitoring or physical accuracy |
| `bun run verify:snapshot-transition REPORT --before OLD.gz --after NEW.gz --expected-before SHA --expected-after SHA --expected-report 0xSHA` | Input hashes, report digest, and full deterministic replay from both original inputs | Expected hashes must be obtained separately; not publisher authentication |
| `bun run build:snapshot-transition --before OLD.gz --after NEW.gz --expected-before SHA --expected-after SHA --output NEW_DIRECTORY` | Builds an offline report/manifest with explicit input hashes | Rejects an existing directory; promoting active inputs is a separate step |

`check:all` uses temporary baseline output and refuses to overwrite an explicit report path that already exists. Existing data, audits, and evaluation results do not need to be deleted to run the checks. `test:integration-roles` runs separately, like casework/publication operations and chain integration.

## Choose checks by change

P2 additions: `bun run verify:evidence-overlap REPORT --expected-digest 0xSHA`
replays bounded input relationships; `bun run stage:snapshot` stages two
inputs and a full diff without activation. Downloader and source packager tests:
`python3 -m unittest discover -s scripts -p 'test_*.py'`.
[Guide, input bounds, and result meaning](../development/evidence-overlap-and-snapshot-intake.md).

- **Documentation only:** check paths/anchors, index navigation, commands/env against source, code fences, whitespace, and evidence preservation.
- **Shared contract/claim/scope:** typecheck, relevant API/web tests, verifier, and E2E if the user workflow is affected.
- **Privacy/trust/review:** API/web regressions and private/manual browser paths; check access limits in addition to the happy path.
- **Pipeline/data:** Python suite and reproducibility for the inputs/provenance; check that outputs are bound to API/browser.
- **Map/performance:** build/bundle and browser under recorded conditions; a mobile viewport does not replace a physical phone.
- **Contract/receipt:** relevant Foundry and verifier/chain integration; external transactions require separate authorization.

## Available results

[Implementation status](../release/current-implementation-status.md) summarizes the latest results; the [evidence index](../evidence/README.md) stores run details. Do not recount focused repeats or assume a historical suite was rerun for a docs-only change.

The [AI annotation protocol](ai-benchmark-annotation.md) governs independent labels, source separation, and citation/abstention scoring. The [target-user pilot protocol](../evidence/target-user-pilot-protocol.md) is a study design, not a result. A mock provider checks software integration; a checksum checks hashed content. Neither proves repair or climate impact.

[P5/P6 agent-scoped work is complete](../evidence/p5-p6-agent-completion-2026-10-18/README.md): paired manual/app results, authored metadata challenges, rules/agent comparison, and grounding replay/analysis. The [initial package](../evidence/p5-p6-agent-evaluation-2026-10-18/README.md) provides the task pack, private analyzer, and provider runbook. `bun run check:evaluation` checks freeze/runner/reproducer/diagnostic types and tests; it is included in `bun run check`. Python pilot/evaluator tests, `test_agent_metadata_diagnostic.py`, and `test_agent_diagnostic_bindings.py` are included in the data gate. All test fixtures are software checks, not participant data or an independent gold set; P6 agent results do not show additional AI benefit on that challenge.

For a check that requires network success, use `bun run verify:audit path/to/report.json --require-chain`. The [P2 runbook](../development/blockchain-recovery.md) explains pending status, confirmations, reorgs, and backup limits.

The [integration-role simulation](../evidence/integration-role-simulation-2026-10-18/README.md) adds real TLS evidence with a deterministic provider, a production API profile and local build serving, plus a lost RPC acknowledgement after a transaction was accepted by Anvil. All external-provider/public-hosting/Sepolia gates remain separate.

## Human method review

The [P4 protocol](domain-expert-review.md) and [ready-to-send package](../evidence/domain-review-preparation-2026-10-18/README.md) separate implementation preparation/testing from review by a domain expert. Expert results are not yet available.

## Product-value improvements — 18 October 2026

The [results package](../evidence/product-value-2026-10-18/README.md) records scope/draft regressions, strict verification in Reports, and 16 frozen functional-comparison cells. `bun test scripts/product-value-evaluation.test.ts` checks denominator/missing/duplicate scorer behavior. For a new replay, use `bun run evaluate:product-value prepare /tmp/NEW_DIRECTORY`, then `run` and `analyze` after supplying separate baseline results; do not overwrite the frozen evidence package. Focused browser command: `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e e2e/audit-workflow.spec.ts --grep "scope presets|unsaved work|historical MARS case|analyst case work resumes"`. The Chromium sandbox remains active.
