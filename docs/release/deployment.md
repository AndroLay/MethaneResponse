# Runtime and deployment status

**Updated:** 2026-10-21 · **Target:** local hackathon prototype and optional free preview

**21 October update:** [Render preview is live](https://methaneresponse-preview.onrender.com/dashboard)
on source `98b25ca0af1e3e2df7ca9084c1569db1b6712a1e`, Free plan, Singapore,
automatic branch deploys off. DeepSeek V4.1 Flash 1017 is configured in the backend;
one actual browser assessment, exact citation and bundle hash passed publicly.
Three additional local live-provider DEMO scenarios passed. These are integration
smokes, not an independent benchmark. [Public-target proof and preview limits](../evidence/render-preview-2026-10-21/README.md).
The user explicitly approved creation after being told workspace cost controls
could not be read; Free compute is verified, total Rp0 is not guaranteed.
The sections below describe the current local/preview boundaries.

MethaneResponse runs from the bundled MARS snapshot and the Bun/Hono API, locally or on the restricted preview above. The current product scope deliberately excludes PostgreSQL, PostGIS, Supabase, database migrations, and cloud database setup. See the [accepted prototype scope decision](../architecture/decisions/2026-10-15-local-prototype-no-database.md).

## Local run

Install the locked dependencies, then run the API and web app in separate terminals:

```bash
bun install --frozen-lockfile
bun run dev:api
bun run dev:web
```

The API stores audit revisions in the atomic JSON file at `AUDIT_STORE_PATH`; if unset, it uses the ignored local path `data/state/audits.json`. Existing MARS source archives and browser snapshots remain versioned local data artifacts with separate manifests and hashes. They are not loaded into an application database.

The local file store supports one API process and preserves revisions when that same file is available after a process restart. API rate limits are process-local. Do not run multiple API replicas against one JSON path or treat a hosted preview's filesystem as durable storage.

P1 adds private shared casework for a small team through that one writer, separately from audit bundles. Official start commands now hold a Linux util-linux `flock` for the API lifetime. The derived `.case-work.json` and `.initialized` files need the same persistent private volume; backup/restore is offline under that lock. See the [P1 runbook](../development/shared-casework.md). The Render build checks `flock`; the deployed launcher and HTTP health endpoint were verified on the public target.

## Optional hosted preview

The root `render.yaml` is a convenience preview configuration, not a durability or production guarantee. It writes audits to `/tmp/methane-response-preview/audits.json`; hosted temporary files may disappear on restart, redeploy, or instance replacement. Use the local workflow for repeatable audit-history demonstrations. Do not describe the hosted preview as having durable audit storage.

The active target is `methaneresponse-preview` in **Andro's workspace**,
Singapore, `free` plan, `main` branch and automatic branch deploys off. It uses
public preview mode, a backend-only provider key and a separate assessment
access token. There is no private reviewer directory, signer, RPC secret,
database or paid disk. Free compute is confirmed; shared workspace billing
controls were not readable and no total-cost guarantee is made. The user
explicitly approved creation after this limitation was explained.

The service was created through the connector with its default TCP health check;
`/api/health` was separately verified over HTTPS. The Blueprint HTTP check in
`render.yaml` is not currently applied to that service. See the
[actual deployment proof](../evidence/render-preview-2026-10-21/README.md).
Rollback: suspend this dedicated service or redeploy an approved earlier code
revision; preserve local audit backups. Never change Evidrilo.

The static frontend and API may be hosted separately if needed for a judge-accessible visual preview. The API still uses its file store; hosting does not add a durable volume, shared rate limits, or a database. P1 local two-session tests do not verify remote persistence. Before any authorized remote setup, verify HTTPS, actual origin, signed reviewer authority, filesystem lock support, private permissions, volume lifetime and backup recovery on that target.

## External integrations

- DeepSeek document assessment is configured on this preview behind a separate assessment token and consent. Local use requires loading the ignored private environment file. Human review and blockchain writes remain disabled on the public preview.
- API blockchain anchoring and reconciliation use durable transaction intents in the current file store. The local Anvil profile is tested, including process crashes and independent receipt verification; a public Sepolia receipt is still pending. Writes require explicit server opt-in, a configured dedicated signer and approved target. See the [P2 runbook](../development/blockchain-recovery.md).
- No provider credentials, signing key, database connection, or deployment transaction should be committed to the repository or exposed through `VITE_*` variables.
