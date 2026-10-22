# Same-take TKM proof for the v15 / v16 film

**Prepared local evidence, not a public-chain deployment or an uploaded video.**
This bundle closes the *local* traceability gap between the film and its exact
TKM decision. GitHub availability depends on publishing this directory and the
referenced source. Earlier KAZ proofs remain separate historical examples.

## What is linked

| Artifact | Meaning |
|---|---|
| `browser-export.json` | Unchanged take2 browser export, TKM_S_021, decision revision 1, frozen work revision 5 |
| `trusted-digest.json` | Pin separately recorded from the authorized DEMO reviewer UI before downloading the export |
| `decision-with-receipt.json` | That exact decision plus its retained local receipt |
| `anvil-proof.json` | Full original local proof: source, scope, exact input checksum, transaction, event/CLI checks, authorization checks and restart |
| `anvil-state.json` | Retained Anvil state, chain 31337; contains local ledger state, no signing keys |
| `manifest.json` | Checksums of explicitly allowlisted inputs |
| `verified-facts.json` | Snapshot populations, one real historical observation and the separate DEMO AI quote |
| `retained-state-verification.json` | New local verification of the archived state, original and tampered files |
| `verification-summary.json` | Actual v16 MP4 hash, duration, cadence, caption policy and review limits |
| `technical-video-audit.json` | Technical audit of that exact MP4; not an artistic certification |

Primary source: **TKM_S_021**, snapshot `unep-mars-675417694883`, archive SHA-256
`675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43`.
Claim type `mitigation_confirmed` is the **question under review**, not a finding.
UTC scope: **2020-10-29 to 2026-09-13**.
Actual disposition: **request_more_evidence**. Reviewer and response records are
explicit software DEMO fixtures; no operator response or human pilot is asserted.

## Exact retained commitment

- Trusted digest: `0xd65ec689ebe7dc5a85f4c77845d4a30fa675b3ea16a3cfe8515f7f662e8bbcf7`.
- Transaction: `0x8925069744d341c31a9538c8ea811a8488db1e0f889ae250b20349bf8fbb021d`.
- Registry: `0x617b0327bb8331627ed7637c62439d6efcbcaf1f`.
- Anvil chain **31337**, block **2**, registry version **1**.

These identifiers describe a **local chain**. There is no Etherscan/Sepolia link.
A local ledger and a pin supplied by the project are inspectable test evidence,
not independently witnessed public notarization. The manifest proves consistency
of these files relative to its hashes, not the identity or honesty of its author.

## Reproduce the recorded receipt locally

Prerequisites: the repository-pinned Bun dependencies, Python 3, Foundry `anvil`.
Run from the repository root. No model, signing key or public RPC is needed:

```sh
bun install --frozen-lockfile
python3 docs/demo/delivery-2026-10-22-final-v16/verify_evidence.py \
  --expected-digest 0xd65ec689ebe7dc5a85f4c77845d4a30fa675b3ea16a3cfe8515f7f662e8bbcf7 \
  --output delivery-output/tkm-retained-recheck.json
```

The verifier checks all manifest hashes and same-take equality, restores the
recorded state into a disposable **127.0.0.1** Anvil, and calls the real CLI with
`--require-chain`. It never sends a transaction. Required exit codes:

1. Original decision: **0**, event/receipt verified.
2. Altered rationale against the original pin: **1**, rejected.
3. Altered rationale with its digest recalculated: **1**, chain event mismatch.
4. Original restored: **0**, verified again.

The temporary process is stopped on success or failure. Use a new output path
for another run; the script preserves prior reports. Anvil state restoration is
an explicit local test operation; no public network is contacted.

For a *fresh* full 34-assertion API/authorization/restart test, use the existing
isolated wrapper with this exact browser export and pin:

```sh
bun --no-env-file scripts/run-retained-decision-proof.ts \
  --decision docs/evidence/video-v16-2026-10-22/browser-export.json \
  --trusted-digest 0xd65ec689ebe7dc5a85f4c77845d4a30fa675b3ea16a3cfe8515f7f662e8bbcf7 \
  --evidence delivery-output/tkm-fresh-local-proof.json
```

That optional test deploys a new contract **only to disposable loopback Anvil**.
Its transaction/address will differ from the film; do not replace the retained
receipt or call the new transaction the one recorded in the video.

## Other evidence and scientific boundaries

The film's AI segment is a **separate recorded KAZ_S_159** backend integration,
not a TKM inference. Its project-authored quote's SHA-256 is
`167d54ef9ee7952847bd9c88b12a513f181bf609a91bc2e3af8c25b31cabd0eb`,
matching the archived screenshot. It does not establish field mitigation.

The dataset contains **30,414 plume records**, **23,861 linked** to source IDs
and **6,553 unlinked**. The planner's linked-record total is a subset, not a
contradictory dataset. The displayed TKM observation is **2021-05-09 07:06:21 UTC**,
flux **22,926 kg/h**, reported standard deviation **7,969 kg/h**. This is one
satellite estimate, not continuous flow, an annual total or a repair outcome.

Data attribution: UNEP IMEO Eye on Methane / MARS, retrieved historical snapshot,
[dataset portal](https://methanedata.unep.org/download-dataset),
CC BY-NC-SA 4.0 (license included). Changes: normalized metadata, derived planning
and visualized excerpts. No third-party report body or satellite image is bundled
as proof of physical repair. No UNEP endorsement is claimed.

Frozen agent r12 stays **0/48 task completion under its frozen scorer**. The new
verification is software conformance, not a replacement agent study or measured
productivity. Feedback is not repair; missing observations are not zero emissions;
a hash/receipt verifies integrity and chronology, not physical truth.
