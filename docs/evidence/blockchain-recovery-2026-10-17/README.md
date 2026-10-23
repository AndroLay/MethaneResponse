# P2 evidence: durable anchor intents and recovery

**17 October 2026 — locally verified; public Sepolia integration pending.**
[P2 plan](../../plans/2026-10-17-six-package-completion.md) ·
[Runbook](../../development/blockchain-recovery.md) ·
[ADR](../../architecture/decisions/2026-10-17-durable-anchor-intents.md) · [Manifest](manifest.json)

## Verified behavior

`FileAuditStore` persists audits and intents in one envelope. Intent, transaction
hash, nonce and target are flushed **before** broadcast; receipt and confirmed intent
complete atomically. Legacy arrays retain their bundles/hashes. Missing previously
initialized state or a damaged marker fails closed. Pending reservations block
other issuer/revision writes; stale nonces/versions are rejected. A timeout never
causes rebroadcast. Matching completion is idempotent; replacing a confirmed receipt
is rejected. Receipt identity must match audit, case, claim, bundle, chain, registry,
issuer and expected version.

The real Solidity contract ran on disposable **Anvil 31337** with a random signer.
`SIGKILL` before/after broadcast tested durable pending state and mined-transaction
recovery without rebroadcast. Reverted transactions were not anchored. A separate
CLI verified events/receipts: original `VALID_LATEST`, then `VALID_HISTORICAL` after a
new revision; altered bundle/issuer rejected. `--require-chain` fails without
receipt/configuration. The [receipt](local-chain-receipt.json) records a stopped
local chain, not a Sepolia explorer entry.

Verification checks chain, emitter, issuer, case, hash, version, transaction status,
canonical block and minimum confirmations. Default is two; Anvil fixtures used one.
RPC regressions reject target/event/hash/block mismatch, insufficient confirmations
and reorg. Baseline anchoring requires admin authorization; reviewers need current
claim-scoped `operator_attested` status. Revoked, expired or unauthorized actors,
private schema 4 and unreviewed AI are rejected. Revocation during broadcast prevents
returning the full private audit.

Verification Center binds target checks to requests, exposes target/confirmation
and read-only reconciliation, disables writes while pending and invalidates stale
readiness after target-read failure. Credentials remain tab-memory-only. Browser
responses are DEMO fixtures, separate from actual Anvil transactions.

## Recorded checks

| Check | Result and boundary |
|---|---|
|Full local gate|151 API, 236 web, 35 verifier, 160 Python, 4 Foundry; TypeScript/build/bundle/baseline passed; no live provider/Sepolia|
|Chain integration|One scenario, 22 assertions; disposable 31337, SIGKILL, revert, separate CLI; filtered environment, no dotenv|
|Casework operations|Two passed, 17 assertions; P1 backup/crash/lock regression after envelope change|
|Browser phases|14 main+5 private/manual/shared/mock AI=19 passed; sandboxed Chromium, local fixtures|
|Focused browser repeats|Target check, dismissal, keyboard, stale target, pending, no retry, credential storage, desktop/mobile; not added to scenario totals|
|Public-baseline candidate|Hash VALID, receipt ABSENT; neither operationally persisted nor authorized for public broadcast|

There were 589 distinct non-browser checks including separate integration/operations.
App entry was 74,704 gzip bytes against 75,000; lazy MapPanel size advisory remained.
No dependency was added. The tested working tree included earlier user changes;
HEAD alone did not represent it. This increment did not commit or push.

Read-only implementation review found missing reviewer-directory enforcement,
replaceable confirmed completion and missing pre-submit target display. Regressions
failed before fixes and passed afterward; rereview found no further high/medium
blocker in scope. Visual review also reproduced stale readiness after failed refresh
and prompted invalidation before refresh. Chromium socket permission initially
failed; authorized local execution retained Chromium sandboxing.

## Captures and limits

[Desktop](DEMO-chain-controls-desktop.png) · [Mobile](DEMO-chain-controls-mobile.png).
Masked credentials and DEMO pending/target labels were inspected at 1600×1000 and
390×844 with no horizontal overflow. This is not physical-device, screen-reader or
comprehensive accessibility testing. Raw credential-bearing traces were excluded.

Public Sepolia remained unavailable; writes default off. See the
[candidate operation](sepolia-operation-review.md). Pre-broadcast crashes may leave
an unresolved intent that blocks the issuer; no automatic cancellation/replacement
or inference from transaction-not-found is allowed. Local fsync, one cooperative
writer and a dedicated issuer remain assumptions. Full-volume loss, power failure,
remote filesystems, backup rollback, multi-instance failover and atomic revocation
against an external directory were not tested. Verification checks canonicality
on demand, not continuous finality, and trusts the RPC/implementation. P1 backup is
not a complete P2 envelope/intent backup. P3–P6, human review, pilots and provider
benchmarks are outside this increment. Integrity/chronology do not establish repair.

Historical artifact/source checksums remain in `checksums.sha256` and
`implementation-files.sha256`. Later documentation translation changes current
prose bytes; original records are retained at Git revision `9d38ad2`. Never rewrite
historical checksums to imply a new run.
