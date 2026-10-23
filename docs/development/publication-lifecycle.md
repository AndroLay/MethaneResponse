# Public summary corrections and withdrawal

[User workflow](../product/user-workflow.md) · [API](../architecture/api-reference.md) · [P3 plan](../plans/2026-10-17-six-package-completion.md#5-p3--koreksi-dan-penarikan-publikasi)

## Scope

P3 governs redacted summaries for **human assessment schema 4**. The full bundle, exact claim, excerpts/URLs, rationale, and reviewer identity remain private. Baseline/legacy reports and reviewed AI schema 3 follow the existing access rules. Publication status is separate from the bundle hash and historical summary checksum.

## Corrections

1. Open the same source, claim, and scope in Evidence Auditor. Under **Human assessment**, enter a token with private access and select **Load latest human assessment**. The form asks for confirmation before replacing an unsaved draft. Selection matches the source, claim, scope, and dataset, and checks the digest; **Saved audit history** remains available for version comparison.
2. Correct the determination/reference/rationale, then confirm that the source was reviewed. Publication consent must be selected again for the new content.
3. **Save revised human determination** creates a new bundle and hash. The request uses `parentAuditId`; the parent must be the latest human revision for that scope/claim. A baseline audit created in between does not prevent a correction.
4. With consent, the new public revision and a `superseded` event for the previously active publication are stored atomically. Without consent, the new private revision does not change or reveal public status.
5. A stale form receives `409`. Load the latest human revision, compare the content, and decide whether to correct it; do not resubmit automatically.

By default, **Reports → Public transparency summaries** shows the latest public revision per scoped case/claim, including a `withdrawn` marker. **Show publication history** shows older public revisions. The download button rechecks server details/status before creating JSON; an old revision URL still shows its status and a replacement link when available.

## Withdrawal

1. Open **Reports → Public transparency summaries → Reviewer publication controls**.
2. Enter a reviewer token. The token stays in component memory, not local/session storage. Access requires the `review` scope and a current **`operator_attested` directory entry for the claim category**; legacy tokens follow the applicable reviewer compatibility configuration. The audit flag that allows unverified/expired reviewers does not enable withdrawal.
3. On a summary, select **Withdraw publication**, choose a standard reason, and confirm. Allowed reasons are `consent_withdrawn`, `published_in_error`, and `evidence_under_review`. There is no public free text, and identity is not taken from the request.
4. The server compares `expectedVersion`, rechecks permission inside the writer queue, then appends a `withdrawn` event. Stale/repeated requests are rejected with `409`; status is not automatically restored to active.
5. Select **Clear publication credential** when finished. If a request times out/fails, refresh status before taking another action. If refresh/status checking fails, the UI discards the list that can no longer be confirmed.

Withdrawal **marks the status**; the historical redacted summary remains available. It does not delete copies that were already downloaded, consent in an old bundle, or hashes/receipts already on the blockchain. To correct content after withdrawal, create a new revision with new consent.

## Verification

- `summaryHash` covers only `summary`, so the historical checksum remains the same after a correction or withdrawal.
- `publication` is the status/history reported by the server when read. Event actors are stored privately; the public receives only the version, time, status, standard reason, and public replacement ID.
- `GET /api/transparency/:id/verify` checks the source bundle and reports publication status at check time. It does not verify issuer identity, physical documents, or emissions reductions.
- `bun run verify:audit /path/to/summary.json` verifies the summary checksum offline and writes **`publication_status: NOT_CHECKED`**. A downloaded file may have stale status metadata; the offline checksum does not authenticate that metadata. `--require-chain` rejects a summary because it does not contain a public chain receipt.
- The UI provides **Check current publication status** and a live check for imported JSON. Reads use `no-store`. Status does not refresh automatically after the page has been left open; refresh to see subsequent changes.

## Storage and compatibility

Audit envelope **schemaVersion 2** contains required `audits`, `anchorIntents`, and `publicationEvents`. Events are added to the same file as the bundle using the single-writer queue, atomic rename, and file/directory `fsync` already used by P2. Existing bundle/hash values are unchanged. The `.initialized` marker remains compatible; it marks path initialization, not the envelope schema version.

Legacy audit arrays and version 1 envelopes without events remain readable. The reader builds genesis events from historical consent with the private origin `legacy_consent`, then marks earlier public revisions `superseded` by revision order. This projection does not write the file during a read; the next normal mutation stores a version 2 envelope. Corrupt, missing (in version 2), or incomplete event metadata, or two active publications for one scope, fails closed. Reconstructing legacy consent is a metadata migration, not new evidence that consent was given at migration time.

Before replacing the binary/operator state, stop the writer and make a private backup of the entire envelope, marker, and team state. **P2-era code cannot read the version 2 envelope.** Use roll-forward to fix code; do not remove `publicationEvents` or downgrade the file version because withdrawal/supersession information could be lost. Restoring an old backup can also restore an old public status and lose an intent/nonce. P1 casework backup tools do not include the complete audit envelope; the same limit is described in the [blockchain runbook](blockchain-recovery.md).

A single Linux process through the official launcher is still required; there is no multi-instance setup or failover. Server chronology is unsigned and cannot resist an operator deliberately replacing all state/backups. A single response reads from one audit+event snapshot; pagination across requests is not a frozen snapshot. If a publication changes during pagination, refresh from the start. Summary history does not expose intervening private revisions.

## Local checks

```sh
bun --no-env-file test apps/api/src/publication-api.test.ts apps/web/src/transparency.test.ts scripts/verify-audit.test.ts
bun run test:publication-operations
bun run test:e2e e2e/ai-review-workflow.spec.ts --grep 'DEMO (publication|human correction|withdrawal)'
```

The operations test uses a disposable API process and `SIGKILL`; the browser test uses DEMO, an active Chromium sandbox, and an isolated local server. No faucet or public transaction is needed. [P3 evidence from 18 October](../evidence/publication-lifecycle-2026-10-18/README.md) records the final result, screenshots, source manifest, and test limits.
