# MethaneResponse — Independent Methane Evidence Audit

**Track:** Climate Data & Environmental Monitoring · **Status:** locally runnable MVP, not a methane-monitoring authority.

MethaneResponse helps a reviewer check whether a narrowly stated methane claim is supported by traceable records. It does not replace UNEP's Methane Alert and Response System (MARS), detect methane, or certify physical repairs.

## What works

- The dashboard loads the full, attributed UNEP MARS browser snapshot: 4,211 source rows and 30,319 plume rows from 2020-10-29 through 2026-09-11. It retains all 6,534 plume rows without a source ID as unresolved records. The deterministic rules audit remains tied to the curated casebook; optional document assessment can resolve any exact source ID in the validated full snapshot. Synthetic demo sources remain separate.
- The Documents page lists source-linked official report metadata and records the two locally captured dataset releases with hashes and date coverage. Neither the dashboard nor API treats a metadata link, feedback field, or gap in observations as verified physical mitigation.
- The source explorer offers Esri natural-color satellite imagery, adjustable grayscale, OpenFreeMap street/dark styles, clustering, and flat/globe projections. Globe is the default where supported; software-only WebGL uses a reduced-cost flat map, and unavailable WebGL leaves the case review usable.
- The API returns case/source records, evaluates typed claims with a deterministic evidence-coverage baseline, returns citations and provenance, and stores immutable audit revisions.
- Local runs persist to an atomic JSON file under `data/state/`. Configured PostgreSQL/PostGIS runs apply migrations and seed the pinned casebook; first use of an otherwise-unseeded pinned source registers its minimal provenance row in the same audit transaction. Production refuses to start without `DATABASE_URL`.
- The audit bundle has a canonical SHA-256 digest. The receipt panel can record and verify a Sepolia registry transaction when an administrator configures the API. `bun run verify:audit <report.json>` verifies an exported bundle locally and checks an on-chain event when read-only RPC settings are present.
- The Verification Center can verify a downloaded v2/v3 audit JSON locally in the browser without uploading it. The check covers the canonical audit bundle and matching summary fields; export-wrapper context is outside that digest, and receipt metadata still needs the CLI/RPC verifier for on-chain event validation.
- A 15-claim baseline conformance set covers the three casebook sources and separate synthetic adversarial fixtures. It is a small rule-behavior check, not a generalizable accuracy estimate or an AI benchmark.
- The offline intelligence pipeline publishes a reproducible, hash-bound snapshot for all 4,211 sources and 23,785 explicitly linked observations in the pinned MARS release. It exposes historical priority and anomaly-screen results across the global map; both are uncalibrated investigation aids, never future probabilities or proof of mitigation.
- An optional server-side document assessment path validates exact excerpt quotations and binds full-snapshot reports to dataset/input/analysis hashes plus plume ID–timestamp pairs. A distinct authenticated reviewer can create a new immutable v3 revision; approval requires an explicit source-inspection attestation and at least one exact validated quotation. Assessment stays disabled until provider and reviewer configuration is supplied; no model accuracy is claimed.

## Evidence boundaries

- Detection observations support only a detection claim. MARS's source-level `notified` field is retained as metadata; by itself it does not identify whether the operator received a notice or when.
- Source-level feedback does not prove equipment repair or reduced emissions. A later observation gap is not proof of zero methane.
- Linked UNEP report items are link-only metadata. Their contents have not been included or independently reviewed, so all three real `mitigation_confirmed` audits abstain with `insufficient_evidence`.
- A synthetic fixture may exercise a supported or contradicted rule, but its result is always marked synthetic.
- A blockchain receipt proves the committed bundle hash and version chronology; it does not prove physical methane mitigation.
- The pinned MARS casebook is a historical snapshot, not a live feed. Its specific attribution, archive hash and CC BY-NC-SA 4.0 terms are in [`data/real/README.md`](data/real/README.md). Interface image redistribution rights still need confirmation; see [`NOTICE`](NOTICE).

## Run locally

Requirements: Bun 1.4.2 (pinned in `.bun-version`), Python 3.11+ with `uv`, and Foundry for contract tests.

```bash
bun install --frozen-lockfile
# Copy only if apps/api/.env does not already exist.
cp .env.example apps/api/.env
```

Terminal 1:

```bash
bun run dev:api
```

Terminal 2:

```bash
bun run dev:web
```

Open <http://localhost:5173>. The API is at <http://localhost:3001>; the Vite development server proxies `/api` to it. If `DATABASE_URL` is unset, the API uses the local file store. The example `.env` uses paths relative to `apps/api/` and leaves optional database/chain settings unset.

The API health route is <http://localhost:3001/api/health>. It checks casebook and store availability and identifies the actual storage backend. With a database, configure a PostgreSQL/PostGIS URL; the database user must be allowed to run the bundled migrations, including `CREATE EXTENSION postgis`.

## Main routes and commands

| Route / command | Purpose |
|---|---|
| `GET /api/cases` and `/api/cases/:id` | Read the pinned real casebook and provenance |
| `GET /api/sources` | Read the real casebook sources |
| `GET /api/sources?mode=demo` | Read explicitly synthetic fixtures |
| `POST /api/audits` | Evaluate one typed claim and persist a version |
| `GET /api/intelligence/insights?sourceId=...` | Read historical analysis for any source in the hash-bound pinned MARS snapshot |
| `POST /api/intelligence/assessments` | Optional, consent-gated server-side assessment of authorized excerpts |
| `POST /api/audits/:id/review` | Create an authenticated, immutable human-review revision for a v3 draft |
| `GET /api/audits?sourceId=...&claimType=...` | Read audit history |
| `GET /api/audits/:id/verify` | Verify local digest and, if configured, the exact registry transaction |
| `POST /api/audits/:id/anchor` | Privileged write; v3 drafts require human review, plus configured server-side signer and explicit action |
| `bun run verify:audit report.json` | Independently check an exported local report and optional chain receipt |

Run the full local gates from the repository root:

```bash
bun run check:all
```

In restricted environments, if `uv` cannot write to its default cache, set `UV_CACHE_DIR` to a writable directory, for example `/tmp/methane-response-uv-cache`.

To write the reproducible benchmark report:

```bash
cd services/data-pipeline
uv run python evaluate_baseline.py --output reports/baseline-evaluation.json
```

Read [`docs/data-and-claims.md`](docs/data-and-claims.md) for methodology and [`docs/deployment.md`](docs/deployment.md) for deployment limits and setup.
See [`docs/AI_BLOCKCHAIN_IMPLEMENTATION_2026-10-12.md`](docs/AI_BLOCKCHAIN_IMPLEMENTATION_2026-10-12.md) for the document-review, snapshot-hash, reviewer-token, v2/v3 compatibility, and remaining validation boundaries.

## Deployment and competition status

No external deployment, Sepolia transaction, video, Devpost registration, or submission has been performed. A possible no-cost setup is Cloudflare Pages for static files, a free Render web service for the API, and a free Neon Postgres project. It is not an always-on or durable free production service: Render free services can sleep and their local filesystem is ephemeral; Neon has per-project storage and compute quotas. Configure and test an owned account before treating it as available. See the dated provider notes in [`docs/deployment.md`](docs/deployment.md).

The GitHub repository remains private as previously requested. The event's published submission checklist asks for a public source-code repository and a 3–5 minute demo video; resolving repository visibility, image rights, account setup, event eligibility and conflicting time instructions remains external work. See [`docs/research/event.md`](docs/research/event.md).

## Repository map

```text
apps/web                         React dashboard, MapLibre explorer and audit UI
apps/api                         Hono API, rules baseline, optional AI review, persistence and chain verifier
packages/shared                  Zod contracts and synthetic demo fixtures
services/data-pipeline           MARS importer, intelligence snapshot, training gate and baseline evaluation
data/real                        Attributed three-source audit casebook and snapshot history
data/processed/intelligence-snapshot.json
                                 Reproducible all-source investigation analysis
platform/database/migrations     PostgreSQL/PostGIS schema and audit revisions
contracts                        Solidity receipt registry and Foundry tests
scripts                          Local report verifier and verification helpers
docs                             Architecture, provenance, deployment and delivery status
```
