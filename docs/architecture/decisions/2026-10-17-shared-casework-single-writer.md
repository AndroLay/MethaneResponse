# Shared casework for a small team with one writer

- **Status:** Accepted for the local P1 implementation requested by the project owner on 17 October 2026.
- **Continues:** [No-database ADR](2026-10-15-local-prototype-no-database.md).
- **Scope:** one team project, one API process, private file storage; no database service or new deployment.

## Decision

Shared casework is stored separately from immutable audit bundles. Each change uses an expected revision, records the actor from the signed reviewer token, and appends a history version. The `private_read` token is required for reading; writes require both `private_read` and `review`. The directory must still grant `operator_attested` authority for the claim type on every operation. Legacy reviewer tokens do not grant access to shared casework.

The casework file is stored beside `AUDIT_STORE_PATH`. The API launcher holds a kernel `flock` on a stable path for the API's entire lifetime, so a second API process using the same state is rejected. The lock file is not deleted or renamed. In-process mutations are serialized; snapshots are written to a private temporary file, flushed, renamed, and followed by a directory flush. Read/parse failures are not treated as empty state.

The browser continues to support local casework. Importing into the shared workspace is an explicit create action with a preview; it does not delete the local source or overwrite a server investigation. Tokens remain in memory only; recovery drafts do not store tokens. A server conflict preserves the draft and requires the user to review the latest version before applying changes.

The first save also persists a durable initialization marker before ACK. Missing state after that is rejected, including after a restart, until an explicit restore. Loss of the entire volume, including the marker, remains indistinguishable from a new installation. A failed UI refresh hides stale server data and disables save while preserving the tab draft.

## Threats and limits

- Members without authority, expired/revoked tokens, and writers that supply their own actor identity must be rejected by the server. List/detail/history endpoints must not reveal claim types outside the caller's authority.
- CAS prevents lost updates with one writer. Processes that bypass the launcher, network filesystems, multiple instances, and operators directly editing state are outside this contract.
- Notes are stored privately with OS permissions; they are not encrypted at rest. HTTPS and a truly persistent volume are required before remote use. Localhost success does not prove a deployment or host-volume durability.
- Backups/restores run with the API stopped and under the same lock. Restore validates the schema/history; it does not delete audits or change the MARS dataset.
- P1 does not enable anchoring or new publication. New infrastructure/costs/deployments still require separate authorization.

## Compatibility

Audit JSON and all older bundles/hashes remain intact. Browser data v1/v2 remains readable. New shared state has its own schema; after backing it up, rollback can return to browser mode without changing older browser data.

[Runbook](../../development/shared-casework.md) · [Local P1 evidence](../../evidence/shared-casework-2026-10-17/README.md).
