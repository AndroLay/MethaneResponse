# Runtime and deployment status

**Updated:** 2026-10-15 · **Target:** local hackathon prototype

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

## Optional hosted preview

The root `render.yaml` is a convenience preview configuration, not a durability or production guarantee. It writes audits to `/tmp/methane-response-audits.json`; hosted temporary files may disappear on restart, redeploy, or instance replacement. Use the local workflow for repeatable audit-history demonstrations. Do not describe the hosted preview as having durable audit storage.

The static frontend and API may be hosted separately if needed for a judge-accessible visual preview. The API still uses its file store; hosting does not add multi-user persistence, shared rate limits, or a database. Verify the actual deployed origin and workflow before claiming a live deployment.

## External integrations

- AI document assessment remains disabled until an operator configures a server-side provider and authorized excerpt workflow.
- API blockchain anchoring and reconciliation are unavailable with the current file store because no transactional anchor-intent store is included. Local report digest verification and the Solidity/Foundry contract project remain available independently.
- No provider credentials, signing key, database connection, or deployment transaction should be committed to the repository or exposed through `VITE_*` variables.
