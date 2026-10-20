# Runtime and deployment status

**Updated:** 2026-10-20 · **Target:** local hackathon prototype and optional free preview

MethaneResponse is designed to run locally from the bundled MARS snapshot and the Bun/Hono API. This workspace has not deployed a live service. The current product scope deliberately excludes PostgreSQL, PostGIS, Supabase, database migrations, and cloud database setup. See the [accepted prototype scope decision](../architecture/decisions/2026-10-15-local-prototype-no-database.md).

## Local run

Install the locked dependencies, then run the API and web app in separate terminals:

```bash
bun install --frozen-lockfile
bun run dev:api
bun run dev:web
```

The API stores audit revisions in the atomic JSON file at `AUDIT_STORE_PATH`; if unset, it uses the ignored local path `data/state/audits.json`. Existing MARS source archives and browser snapshots remain versioned local data artifacts with separate manifests and hashes. They are not loaded into an application database.

The local file store supports one API process and preserves revisions when that same file is available after a process restart. API rate limits are process-local. Do not run multiple API replicas against one JSON path or treat a hosted preview's filesystem as durable storage.

P1 adds private shared casework for a small team through that one writer, separately from audit bundles. Official start commands now hold a Linux util-linux `flock` for the API lifetime. The derived `.case-work.json` and `.initialized` files need the same persistent private volume; backup/restore is offline under that lock. See the [P1 runbook](../development/shared-casework.md). The preview image must provide `flock` before it can run the launcher; this has not been verified on a remote target.

## Optional hosted preview

The root `render.yaml` is a convenience preview configuration, not a durability or production guarantee. It writes audits to `/tmp/methane-response-preview/audits.json`; hosted temporary files may disappear on restart, redeploy, or instance replacement. Use the local workflow for repeatable audit-history demonstrations. Do not describe the hosted preview as having durable audit storage.

The proposed target is a **new** `methaneresponse-preview` web service in
**Andro's workspace**, Singapore, `free` plan, `main` branch and automatic deploys
off. Public preview mode is required: no private reviewer workspace, model
credentials, signer, RPC secret, database or paid disk. Check the workspace's
existing shared free allowance and billing/spend limits before creation. The
free plan alone does not establish that all workspace usage has zero cost.
Rollback: disable/suspend this dedicated service and return to the preceding
reviewed Git revision; preserve local audit backups. Never change Evidrilo.

The static frontend and API may be hosted separately if needed for a judge-accessible visual preview. The API still uses its file store; hosting does not add a durable volume, shared rate limits, or a database. P1 local two-session tests do not verify remote persistence. Before any authorized remote setup, verify HTTPS, actual origin, signed reviewer authority, filesystem lock support, private permissions, volume lifetime and backup recovery on that target.

## External integrations

- AI document assessment remains disabled until an operator configures a server-side provider and authorized excerpt workflow.
- API blockchain anchoring and reconciliation use durable transaction intents in the current file store. The local Anvil profile is tested, including process crashes and independent receipt verification; a public Sepolia receipt is still pending. Writes require explicit server opt-in, a configured dedicated signer and approved target. See the [P2 runbook](../development/blockchain-recovery.md).
- No provider credentials, signing key, database connection, or deployment transaction should be committed to the repository or exposed through `VITE_*` variables.
