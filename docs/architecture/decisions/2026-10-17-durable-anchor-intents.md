# ADR: durable anchor intents in the file store

**Date:** 17 October 2026 · **Status:** accepted for a local single-writer prototype · **Package:** P2

## Konteks

The initial file store saved the audit array with a rename but no flush. The chain path broadcast before saving the transaction hash. There was no durable reservation/finalization implementation; writes were disabled. P1 provided a Linux `flock` launcher, allowing P2 to use a single-writer boundary without bringing back a database.

## Decision

Use the `{ schemaVersion: 1, audits, anchorIntents }` envelope at the same audit path. Read legacy arrays, preserve bundles/hashes, and migrate on write. Flush the file and parent directory before acknowledging; use a marker to detect missing state. One store mutex and the `flock` launcher protect the supported process. Concurrent writes from multiple directly instantiated stores are unsupported.

Prepare and sign EIP-1559 in memory, calculate the transaction hash, save a pending intent with the nonce, target, and expected version, then broadcast once without a transport retry. Signed bytes are not persisted. Pending intents lock all issuer operations; reservation also rejects a reused nonce and a stale case version. Completion accepts only a receipt matching the intent and atomically writes the receipt and confirmed state.

Read-only reconciliation checks the exact transaction hash, from/to/calldata/nonce, chain, registry event/case/bundle/issuer/version, status, canonical block, and minimum confirmations. A manually supplied receipt cannot replace the intent identity. Receipts from the local network use a separate configuration and chain 31337; the public default remains Sepolia 11155111. Signing is disabled by default until `ENABLE_CHAIN_WRITES=true`.

## Assets and trust boundaries

- Signer, admin/reviewer credentials, and RPC credentials remain on the server. Receipt/browser input is untrusted. Raw signed bytes are treated as replayable and are not returned to the client.
- An attacker without credentials cannot reserve/reconcile/check status. Anchor reviewers are limited to reviewed schema 3 and a current `operator_attested` directory attestation for the claim; the short interval between the last check and broadcast is not atomic. Private schema 4 and unreviewed schema 3 are rejected for both writes and recovery.
- The RPC node remains a network trust dependency. A separate verifier removes the audit-writing API from the verification path, but uses the same chain implementation; it is not a second independent cryptographic implementation.
- The dedicated issuer and writer lock are operational boundaries. Using keys outside the app, restoring old backups, chain forks, or remote volumes can violate assumptions; this is not multi-writer consensus.

## Consequences

 A crash before broadcast may leave a pending intent that cannot be recovered automatically; not finding it through RPC is not permission to resend. A confirmed revert allows an explicit new attempt. A previously confirmed receipt remains historical if a later reorg is detected; current verification may fail. There is no automatic cancellation/replacement, reorg watcher, public deployment, or finality guarantee.

Local guarantees were tested with the real FileAuditStore, disposable Anvil, process SIGKILL, and CLI verifier in a separate process. This evidence does not establish public Sepolia integration. Operating instructions are in the [P2 runbook](../../development/blockchain-recovery.md).

**Follow-up 18 October (P3):** the [publication-lifecycle ADR](2026-10-18-publication-lifecycle.md) upgrades the envelope to version 2 with required events, without changing bundles/intents. Older P2 binaries cannot read the new envelope; use roll-forward and a complete backup.
