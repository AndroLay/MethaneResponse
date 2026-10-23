# P1: shared casework —17 October 2026

[Status](../../release/current-implementation-status.md) ·
[P1 plan](../../plans/2026-10-17-six-package-completion.md) ·
[Runbook](../../development/shared-casework.md)

**Locally verified implementation/integration.** One small team uses one Bun/Hono
writer and private files. No deployment, human enrollment, publication, transaction
or external-provider call occurred in this increment. P2–P6 are separate work.
Base HEAD `a82e2eee99bb79327f859f304f2f5d5939f07041` plus existing user changes is
identified by [manifest](manifest.json) and [source hashes](implementation-files.sha256),
not HEAD alone. No commit/push occurred during that run.

## Acceptance behavior

- Shared schemas bind context, snapshot, archive, work ID, fixed claim/scope, expected
  revision, owner, actor, assignee, due date, status, next action and immutable history.
  Server-derived actor/time reject spoofing.
- Read requires signed `private_read`; write requires `private_read,review` plus
  current claim-scoped `operator_attested` status. Expired, legacy, unscoped,
  unenrolled, foreign-claim, expired-directory and revoked access is rejected.
  Private responses use `no-store`.
- Concurrent writes against one revision yield one save and one 409. Two browser
  contexts retain the second draft, inspect current history and rebase explicitly.
  Revisions 1–3 record actors and assignment handoff.
- In-process write queue and kernel `flock` cover API lifetime. A real second writer
  exits 73; backup/restore refuse an active lock. Bootstrap requires the launcher.
- Browser-local v1/v2 remains readable. Import previews then creates a new work ID;
  local notes survive import/reload. No automatic upload or server overwrite.
- Two DEMO identities resume the same work across sessions. Queue/filter, reconnect,
  assignment and due date persist. HTTP state survives actual API subprocess
  `SIGKILL` and restart against the same file.
- Invalid/schema-forged/open-permission state fails closed. Injected ENOSPC and
  pre-commit revocation do not acknowledge writes. A durable marker prevents silent
  reset after acknowledged state disappears. Validated backup/restore refuses
  overwrite, retains a pre-restore copy and does not modify audit records.
- Failed 503 refresh clears queue/history and disables save while retaining the
  tab draft. Successful refresh restores access. Tokens were absent from browser
  localStorage/sessionStorage. Revision capacity preserves complete history.

## Review and recorded checks

| Historical check | Recorded result |
|---|---|
| `bun run check:all` | Exit 0; frozen install unchanged; API/web/E2E/operations TypeScript passed |
| API | 138 passed, 25 files, 826 assertions |
| Web | 234 passed, 48 files, 164,923 assertions |
| Verifier/tooling | 34 passed, six files, 142 assertions |
| Production build/bundle | App 74,537 gzip bytes below 75,000; eight required route chunks; lazy MapPanel 1,122,953 raw bytes |
| Python | 160 passed with project Python 3.12.13 |
| Rules conformance | 15 matching expected/predicted labels: nine real-casebook and six DEMO cases; [output](baseline-conformance.json). Not an AI or field-accuracy benchmark. |
| Foundry | Four passed, no failures/skips or network transactions |
| Casework operations | Two passed, 17 assertions; backup/restore/lock and actual API crash/restart |
| Evidence transport | One passed, ten assertions; local HTTPS/TLS fixture, no actual publisher retrieval |
| Chromium E2E | 13 main + five private/manual/shared/mock-AI = 18 passed in one invocation; approximately 1.6 + 1.1 minutes by phase |
| Runner helpers | Three passed, six assertions; separate from scenario counts |

The listed nonbrowser suites total **573 tests** (138 + 234 + 34 + 160 + 4 + 2 + 1), excluding three runner helpers and focused repeats. Runtime: Bun 1.4.3 (repository pin 1.4.2), Node 24.18.0, Chromium 153.0.8010.52 with sandbox, util-linux `flock` 2.42.4, uv 0.13.0, and Forge 1.8.5. `check:all` used project Python 3.12.13, not the host shell default. MapPanel >500 kB and Zod-comment advisories remained; build/compressed budget passed. No new dependency.

Exact command results and source bindings remain in [manifest](manifest.json) and
artifact logs. Reproduce with the commands below; historical results are not new
runs against translated documentation. Read-only review reproduced two material
bugs: ENOENT could reset acknowledged state, and failed refresh left stale queue
rows. Durable markers and separate server/draft availability fixed them. Another
browser regression held automatic responses, including StrictMode effects, and
reproduced revision 2→1 rollback after manual review; shared request-generation
tracking plus save invalidation fixed it. The final full suite followed these fixes.

Initial browser executable/socket and loopback proxy failures are separate
operating-environment failures. The final run used `/usr/bin/chromium` with its
sandbox active, authorized local sockets, filtered runner environment and no dotenv.
No assertion was removed to hide a failure.

[Desktop history](shared-casework-history-desktop.png) and
[mobile workspace](shared-casework-mobile.png) show DEMO revisions 1–3 on historical
KAZ_S_159. The final browser captures were visually inspected; mobile 390×844 had
vertical scrolling without horizontal overflow. Tokens remained memory-only and
outside captures. This was not real enrollment, field research or physical-phone
verification. Tests used temporary state and loopback mock AI; credential-bearing
traces, private directories and operational files were excluded.

## Remaining boundaries

One cooperative Linux writer on local storage is not multi-instance/multi-tenant
hosting or an SLA. State/drafts are unencrypted; assignment is not per-record
access control. Actual power loss, full disk, network filesystems, remote volume,
off-host backup and remote restore were not tested; ENOSPC was injected. Whole
volume/marker loss still requires durable storage and independent backup. Lost
acknowledgment may leave a committed version: read/compare before retry. No automatic
retry, polling or merge. Limits are 500 work items, 100 revisions/item and 16 MiB; full
capacity rejects further writes without archival/pruning UI. Snapshots have separate
namespaces. P1 did not add P2 anchor intents or establish repair/zero emissions.

## Reproduction

```bash
bun run check:all
bun run test:case-work-operations
bun test scripts/evidence-transport.test.ts
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e
sha256sum -c docs/evidence/shared-casework-2026-10-17/implementation-files.sha256
git diff --check
```

Dependencies, Linux `flock`, local sockets and an installed browser are prerequisites;
E2E does not install/download them automatically. Historical source/document hashes
refer to their recorded revision, available before this English translation at
`9d38ad2`; do not revise old manifests to claim fresh verification.
