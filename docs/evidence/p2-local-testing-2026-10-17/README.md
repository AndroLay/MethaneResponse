# P2 verification through local blockchain testing

[Implementation status](../../release/current-implementation-status.md) ·
[P2 plan](../../plans/2026-10-17-six-package-completion.md) ·
[Runbook](../../development/blockchain-recovery.md)

**17 October 2026:** local testing verified; public Sepolia transactions not run.
Following faucet difficulties, the integration was rerun without a faucet,
Mainnet wallet or purchased ETH. The real `EvidenceRegistry` contract was deployed
and executed on disposable Anvil chain **31337** with a random local signer.
Scenario data remains **DEMO**.

| Check | Recorded result | Scope |
|---|---|---|
| Seven API/chain/verifier files | **31 passed; zero failed; 128 assertions** | Fixture/mock RPC regressions, not Sepolia |
| `test:chain-integration --evidence <new-path>` | **One scenario passed; 22 assertions** | Real local contract, API child process, separate verifier CLI |
| Prior P2 implementation manifest | All hashes matched | 276 implementation files; production code unchanged for this testing alternative |

The integration deployed, anchored and verified a receipt through a separate CLI;
killed the server with `SIGKILL` before and after broadcast; recovered the same
mined transaction without rebroadcast; retained a pre-broadcast pending intent
with unused nonce and rejected a second request; and changed the first revision
from `VALID_LATEST` to `VALID_HISTORICAL` after revision two. Altered reports,
false issuers and wrong receipt versions were rejected. Reverted transactions did
not become anchored audits.

[Local receipt](local-chain-receipt.json), [focused tests](focused-tests.log),
[integration log](chain-integration.log), [artifact checksums](checksums.sha256).
The earlier [implementation manifest](../blockchain-recovery-2026-10-17/implementation-files.sha256)
and [full-gate results](../blockchain-recovery-2026-10-17/README.md) are separate
historical evidence, not additional runs.

## Reproduce without a faucet

From the repository root, with Bun, Forge, Anvil and loopback socket permission:

```sh
bun --no-env-file test apps/api/src/anchor-store.test.ts apps/api/src/anchor-intent.test.ts apps/api/src/anchor-idempotency.test.ts apps/api/src/anchor-authority.test.ts apps/api/src/chain-recovery.test.ts apps/api/src/chain.test.ts scripts/verify-audit.test.ts
bun run test:chain-integration
```

To retain a new receipt, use
`bun run test:chain-integration --evidence /tmp/methane-local-new-receipt.json`
with a previously unused path. The runner filters environment variables, disables
`.env`, creates temporary chain/signing state and cleans up only its own resources.
Private Sepolia configuration need not change.

## Limits

This completes only the local integration checks above. Public Sepolia remains
pending; [its preparation](../sepolia-preparation-2026-10-17/README.md) is retained.
The chain was stopped after testing; its disposable receipt has no Sepolia explorer
entry. Fixtures used one confirmation; the application defaults to two. Browser
and full gates were not rerun in this increment. Ethereum finality, public hosting,
physical repair and emissions reduction were not established. This does not
complete P3–P6.
