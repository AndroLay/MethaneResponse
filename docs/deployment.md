# Deployment plan and current limits

**Checked:** 2026-10-12 · **Deployment status:** not deployed. Provider accounts, credentials, DNS, and a remote database have not been configured here.

## Proposed no-cost demonstration setup

| Component | Candidate | Data/runtime fit | Free-plan limit to plan for |
|---|---|---|---|
| Static React app | Cloudflare Pages | Build `apps/web/dist`; set public `VITE_API_BASE_URL` to the API origin | Static delivery is a good fit; build/runtime quotas and plan terms can change |
| Bun/Hono API | Render Free web service | Render native JavaScript runtime supports Bun; use the repository's `render.yaml` | Free services can sleep after inactivity and have ephemeral local filesystems; expect cold starts |
| PostgreSQL/PostGIS | Neon Free project | Use `DATABASE_URL`; migrations require PostGIS and permission to create the extension | As checked 2026-10-12, 1 GB storage and 100 CU-hours per project/month; monitor usage |

This can be configured to cost $0 within current provider quotas, but it is not an always-on production service or a guaranteed permanent free tier. The API must use PostgreSQL in production because Render's local filesystem is ephemeral. Do not use Render's free Postgres plan for durable audit history: its current free database is time-limited. Check provider terms immediately before setup.

## Render API

The blueprint in [`render.yaml`](../render.yaml) uses the repository root, Bun 1.4.2, `bun install`, `cd apps/api && bun run start`, and `/api/health`. It declares `WEB_ORIGIN`, `DATABASE_URL`, and `RATE_LIMIT_HASH_SECRET` as values to configure in the Render dashboard. Set `WEB_ORIGIN` to the exact Pages origin; do not use `*`. Generate the rate-limit secret independently with at least 32 random characters and keep it identical across API replicas. The API also needs the tracked `apps/web/public/data/mars-snapshot.json.gz` and generated `data/processed/intelligence-snapshot.json` artifacts in its build image; if using a separate API artifact, set `INTELLIGENCE_INPUT_PATH` and `INTELLIGENCE_SNAPSHOT_PATH` to those files explicitly.

Before creating the service:

1. Connect the intended GitHub repository and branch in Render.
2. Create a PostgreSQL/PostGIS project on a provider that permits the migration statements. Use its pooled or direct URL as required by the provider; verify remote migrations and concurrent revision writes before the demo.
3. Set `DATABASE_URL`, `RATE_LIMIT_HASH_SECRET`, and the exact `WEB_ORIGIN`; check `/api/health` reports `storage.backend=postgres`, `storage.persistent=true`, `casebookReady=true`, and `rateLimits.shared=true` with `rateLimits.ready=true`.
4. Keep `ADMIN_API_TOKEN`, `SEPOLIA_RPC_URL`, `SEPOLIA_PRIVATE_KEY`, and `AUDIT_REGISTRY_ADDRESS` server-side. The private key is required only if a trusted operator enables writes to Sepolia; do not put any secret in Cloudflare Pages variables or `VITE_*` variables.
5. Exercise audit create/read/revision and restart persistence against the deployed API. A green health route alone does not prove the migration or audit journey.
6. PostgreSQL-backed API replicas use a shared database counter for audit writes (20/minute) and AI assessments (6/minute), keyed by an HMAC of the server-supplied socket address; raw addresses and bearer tokens are not stored. Production writes fail closed with HTTP 503 and health degrades if `RATE_LIMIT_HASH_SECRET` is missing/too short or the shared counter cannot be reached. In-memory/file development stores remain process-local. This application limit is not a substitute for ingress protection: a reverse proxy may make all users appear to have one socket address, and a distributed botnet can still create high-cardinality keys. Configure and verify a gateway limit plus the trusted client-IP path before public exposure. CORS does not stop direct clients from writing.
7. Migration `0006_shared_api_rate_limits.sql` is additive. An older API can roll back while leaving this unused table in place; do not drop it during rollback unless the shared counters are intentionally discarded. Rotating `RATE_LIMIT_HASH_SECRET` changes client pseudonyms and resets effective quotas, so rotate it deliberately and consistently on every replica.

The default local file store is useful for development but is not safe for horizontally scaled API instances. It serializes writes only inside one process.
For a local-only API bind, set `HOST=127.0.0.1`; the runtime defaults to `0.0.0.0` so hosted platforms can reach it.

## Cloudflare Pages

Configure a static Pages project with:

- Root directory: repository root.
- Build command: install the locked Bun workspace dependencies and run `bun run build:web`.
- Output directory: `apps/web/dist`.
- Build variable: `VITE_API_BASE_URL=https://<your-render-service>` (no `/api`, no trailing slash required).

The URL is public frontend configuration, not a credential. The SPA's `_redirects` file routes `/dashboard` back to the app shell. Verify dashboard navigation and API CORS from the deployed domain. Map basemap requests go directly to their providers and need working browser network access.

## Known availability and durability tradeoffs

- Render Free web services sleep after 15 minutes without traffic and may take about a minute to wake. A judge opening the app may see a cold start.
- Render's service filesystem is ephemeral, so local JSON audit files can disappear on restarts/deploys. Configure PostgreSQL before creating real hosted audit records.
- Neon Free has finite monthly compute and storage limits and may scale to zero. Confirm the PostGIS extension and migration permissions on the actual project; only local PostGIS has been integration-tested in this workspace.
- Render Free PostgreSQL has a 30-day lifetime and no backups. Do not treat it as durable production persistence.
- Map imagery and styles depend on OpenFreeMap/OSM and Esri services, terms, network conditions, and attribution.
- Free plan details and provider terms can change; there is no SLA or guarantee that this combination will remain free.

## Not yet completed

- No Cloudflare Pages, Render, or Neon account was configured or deployed from this workspace.
- No remote database migration, remote browser smoke, TLS/CORS verification, or cold-start timing has been performed.
- No Sepolia contract is deployed and no transaction has been created. The local contract and receipt verifier are testable, but on-chain claims must remain unanchored until an operator supplies an RPC URL, deploys and authorizes a registry issuer, and funds/approves the required transaction.
- The public source release commit is `37169eeb35de5ad4e3217f08ae2ab8d9ccffa48d`. Anonymous access was checked with global/system Git configuration and credential helpers disabled; GitHub Actions run [38569058427](https://github.com/AndroLay/MethaneResponse/actions/runs/38569058427) succeeded for that commit. The current app tree no longer contains the unlicensed bundled UI imagery, and the build prunes unapproved assets. Earlier Git history still contains previously tracked images; no history rewrite was performed. Eight supplied design mockups remain local-only and are excluded from the public release.

## Official provider references

- [Render native runtimes](https://render.com/docs/native-runtimes) and [Bun version selection](https://render.com/docs/bun-version) — Bun support and version pinning.
- [Render free services and databases](https://render.com/docs/free) — sleep behavior, ephemeral filesystem, and free database lifetime.
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/) — current static asset and function quotas.
- [Neon PostGIS extension](https://neon.com/docs/extensions/postgis) — enabling PostGIS on Neon.
- [Neon Free plan update (2026-10-02)](https://neon.com/blog/neon-free-plan-1-gb-per-project) — storage and compute allowance checked for this note.
