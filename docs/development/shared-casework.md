# Shared investigations: use and recovery

[Development](README.md) · [API](../architecture/api-reference.md) · [Design decision](../architecture/decisions/2026-10-17-shared-casework-single-writer.md)

P1 provides one workspace for a small team through one API process and a private file. Shared notes are separate from the audit bundle. Changing work status or assignee does not change the determination, send a notification, or prove field action. Implementation and testing in this repository were done **locally**, not through a remote deployment.

## 1. Set up access

1. Use Linux with Bun and `flock` from util-linux. The launcher fails if the lock is unavailable; a second process using the same state path is rejected. All writers and maintenance tasks must use the official launcher.
2. Set an **absolute `AUDIT_STORE_PATH`** in a private, writable directory on a local filesystem that supports rename/`fsync`/`flock`. The default remains `data/state/audits.json`. Existing directories are not automatically permission-restricted; the owner must limit access and keep backups outside the primary volume.
3. Configure `REVIEWER_AUTH_SECRET` and `REVIEWER_DIRECTORY_PATH` on the private server, following [configuration](configuration.md) and the [directory format](../product/trust-and-transparency.md). Do not place the secret/directory in web assets.
4. Enroll each reviewer with claim types, expiry, and a current operator attestation. `private_read` grants reading; **`private_read,review`** grants writing. P1 always requires `operator_attested` authority, even when `REQUIRE_ATTESTED_HUMAN_REVIEWERS` is disabled. A legacy shared token or admin token alone does not grant P1 access.
5. Issue short-lived tokens using the available tool, only in a private terminal. Do not copy tokens into logs, documentation, URLs, or `VITE_*`. Example identifiers are not real enrollments.
6. Run `bun run dev:api` from the root for development, or `bun run start` from `apps/api` without hot reload. The launcher holds the lock for the lifetime of the API. Use `/api/health` to check `caseWorkStorage.ready`; this does not prove durability on a remote host.

| File derived from audit path `A` | Contents |
|---|---|
| `A` | Audit JSON, frozen investigation decisions, and anchor intents; not covered by casework maintenance |
| `A.case-work.json` | All shared investigations with immutable history |
| `A.case-work.json.initialized` | Durable marker that state has been saved; do not remove it to bypass an error |
| `A.writer.lock` | Stable lock for API and maintenance; do not remove/rename it while in use |

New state/marker files use mode `0600`; new directories use `0700`. State or markers with overly broad permissions, symlinks, corrupt schemas, and loss of initialized state fail closed. Files are written through a private temp file, file `fsync`, rename, and directory `fsync` before a success response. If a response is lost, the server may already have saved the change: read the latest version before retrying.

## 2. Continue team work

1. Choose a source from a snapshot that matches the API, claim, and period. In **Analyst case work**, select **Open shared workspace** and enter a signed reviewer token. The UI shows the reviewer ID and read/write rights granted by the server.
2. Select **Shared investigations**, or **New shared investigation**. Fill in the question, status, next action, evidence requests, notes, assignee, and due date. The assignee must have active authority for the same claim. Assignment does not send a message or limit access to the assignee.
3. **Save shared work** sends the expected revision. The owner is taken from the token subject on the first revision; each revision records its author and server time. The owner remains fixed; the assignee may change. The claim/scope for a work ID stays fixed; create a new investigation for a different claim/scope.
4. A second member opens the same API origin with their own token and selects the investigation. Use **Refresh shared queue** to load changes; there is no real-time polling. The Cases page uses the server queue during the connected team session, with status and **Assigned to me** filters.
5. If the revision has changed, saving is rejected with `409` and the draft is retained. Select **Review latest revision**. You can load the latest revision, or review differences, copy any new fields that need to be preserved, check the confirmation box, then select **Keep my draft on this revision** and save again. This applies the entire draft; it is not an automatic merge. A new conflict may still occur and will be rejected again.
6. History shows every version and its actor. An assessment link must match the stored source/snapshot/claim/scope and audit hash. Notes are not included in that audit hash.

Queue, detail, and history are readable only for claims still permitted. Directory authorization is checked again before commit. Revoke access with `disabled: true` or expiry according to directory policy. The server cannot recall a copy already downloaded. A failed refresh disables saving and hides stale queue/history; the tab draft remains available until refresh succeeds.

## 3. Import browser notes and recover drafts

- Browser-local mode v1/v2 remains available. Select a local investigation, open the shared workspace, then choose **Preview browser import**. Inspect its contents before **Import as new shared investigation**. Import creates a new ID; it does not overwrite a server investigation or delete local notes.
- Choosing a mode/import does not automatically upload browser data. If the import response is uncertain, check the queue before retrying. This import is not two-way synchronization.
- The token exists only in page memory and is cleared on disconnect/reload. Dirty drafts are saved per tab in sessionStorage with identity, source, snapshot, and work ID; the token is not included. Reconnect with the same identity to restore the edit.
- Notes and recovery copies are **not encrypted**. The same browser user and scripts from the same origin can read them; use a trusted profile/device and do not put credentials or restricted report contents in notes. A new browser session does not automatically have the old tab's recovery copy. If browser storage fails, the UI asks the user to copy important work.

## 4. Backup, restore, and rollback

Stop the API first. A maintenance command obtains the same lock; it is rejected if a writer is still running. Use absolute paths and a new backup destination in a private directory. These commands use placeholders, not previously used user-data paths:

```bash
bun --no-env-file scripts/case-work-maintenance.ts backup /ABS/private/audits.json /ABS/private-backups/casework-2026-10-17.json
bun --no-env-file scripts/case-work-maintenance.ts restore /ABS/private/audits.json /ABS/private-backups/casework-2026-10-17.json --confirm-restore
```

Backup validates the schema/history, does not overwrite an existing destination, and copies the state bytes exactly with private permissions and file/directory flush. **The backup contains private notes.** Copy it to separate storage under the team's policy; the repository does not upload it automatically. Restore recreates the marker, so a valid JSON backup is sufficient for this restore procedure.

Restore validates the backup, saves the current state bytes as `A.case-work.json.before-restore-<uuid>` if present, then atomically replaces the state and ensures the marker. Audit file `A` and datasets are unchanged. Restore may return the queue to the backup revision and lose later changes; close/reload team sessions before reopening the API. Keep the before-restore copy for manual reconciliation. A corrupt marker should be investigated by an operator with the API stopped; do not remove the marker to create an empty state.

If the disk is full or a write fails: do not delete the old file to force a save. Stop the writer, check space/permissions, inspect the backup, restore if needed, run health checks, then read history and continue from the correct revision. Test first on a disposable copy. An application rollback may return to browser-local mode after casework backup; server data is not copied to the browser automatically.

## 5. Capacity and guarantees

- One project, one instance, and one cooperative writer on a local filesystem. This is not multi-tenant, multi-region, a transactional database, or a production availability guarantee. An OS operator who bypasses the launcher can violate the lock guarantee.
- At most 500 investigations, 100 revisions per investigation, 16 MiB per file, and 16 KiB per write request. Full capacity is rejected; there is no automatic pruning or history deletion.
- The marker detects state loss after a save, including process restarts. Loss of the **entire volume and marker** cannot be distinguished from a new installation; use a persistent volume and separate backup before claiming remote service durability.
- Tokens are capability-based; operator attestation is not external identity or competence verification. Members with the same claim authority can read all notes in that category.
- Use HTTPS before entering credentials into a remote origin. Remote origin/volume/backup have not been tested in this local P1 implementation.

## 6. Rerun checks

```bash
bun run check
bun run test:api
bun run test:web
bun run test:case-work-operations
bun run test:verifier
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e
bun run build:web
bun run check:web-bundle
```

The operations runner clears parent dotenv/credential/proxy variables and uses a private disposable fixture. It tests backup/restore, a second writer, API crash, restart, and rereading through local HTTP. Chromium must be available and the host must permit local processes/ports. [P1 evidence](../evidence/shared-casework-2026-10-17/README.md) records actual results and limits.

## Connected investigations

See [dossiers, evidence requests, and frozen decisions](connected-investigations.md) for the new workflow. Decisions are stored in the audit file (envelope 3), so a casework-only backup is insufficient. Continue to use a single writer and keep a full audit backup before code rollback.
