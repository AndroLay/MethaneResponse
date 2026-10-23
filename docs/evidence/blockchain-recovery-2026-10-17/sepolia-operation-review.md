# Candidate Sepolia operation — not authorized or broadcast in this record

**Historical status:** awaiting target and authorization; no public transaction
resulted from this work. Later preparation is recorded separately.

| Field | Value / condition |
|---|---|
| Proposed operation | One `EvidenceRegistry.anchor(bytes32 caseId, bytes32 bundleHash)` call on an approved registry |
| Network | Sepolia `11155111`; not Anvil `31337` |
| Candidate audit | `e789857f-0118-48cb-915b-76f69ff58131` |
| Source / case | `KAZ_S_159` / `MARS-REPORT-KAZ-S-159`, historical UNEP MARS metadata |
| Claim | `source_detected`, not `mitigation_confirmed` |
| Bundle SHA-256 | `0xcde93cec8864aac5a9f190e19153388ec4a6024ed885afd165720ac84eb9ae20` |
| File | [public-baseline-candidate.json](public-baseline-candidate.json): offline checksum VALID; receipt ABSENT |
| Registry / public issuer | Not supplied or configured |
| RPC read/write target | Not supplied or configured; RPC credentials remain server-only |
| Signer | Not configured; never send private keys through chat or source control |
| Confirmations | Minimum two blocks by default; canonical block rechecked on verification, without a finality guarantee |
| Cost | Test ETH; estimation requires matching target, RPC and signer |
| Deployment | Separate from this anchor operation; a new registry requires deployment authorization |

The candidate was not persisted to the operational audit store. The API does not
accept arbitrary imports that replace stored records or hashes. Once a target is
available, prepare the operational audit with reviewed source and claim, then pin
its actual ID/hash and gas estimate before approval and broadcast. A changed hash
is not covered by authorization for the earlier candidate.

Sequence: inspect target, issuer, bytecode and gas read-only → approve exact
operation and audit/hash → anchor once through durable intent → run CLI
`--require-chain` in another process → retain dated receipt and tamper checks.
Record transaction hash, chain, registry, public issuer, bundle hash, expected and
actual versions, block/hash and confirmation policy. Configuration or Anvil
receipts do not complete public Sepolia integration.

Approval follows **AGENTS.md** for deployment/external mutations and the
[P2 plan](../../plans/2026-10-17-six-package-completion.md), which requires an
approved target and operation. At this point local implementation was reviewable,
but the public target was not determined.
