# MethaneResponse Repository Design

> **Earlier repository proposal.** This document describes the initial research design, not the current code structure. See the [repository map](../repository-map.md), [active architecture](../architecture/overview.md), and [local-file ADR](../architecture/decisions/2026-10-15-local-prototype-no-database.md).

**Date:** 11 October 2026 (WITA)

**Status:** starter imported to repository root; synthetic demo foundation exists, runtime integration not verified

**Project workspace:** `/home/andro/dev/projects/Devpost/iEEE-Methane-response`

**Structure reference:** `/home/andro/dev/projects/Devpost/RevenueCat Shipaton 2026` (Evidrilo; an existing repository that was not modified)

## Summary

MethaneResponse is an evidence-audit prototype for methane observations. The MVP ingests a public MARS data snapshot, preserves its provenance and capture time, displays observations and case history, then allows an EVM contract to record and verify evidence-bundle hashes and status changes.

The project will not claim to detect leaks better than MARS, prove physical repair, or measure emissions avoided. MARS data containing feedback are evidence of the published feedback status; that alone does not confirm mitigation.

## Imported-starter status

- Starter ZIP was imported into `/home/andro/dev/projects/Devpost/iEEE-Methane-response`; local Git remained on branch `main`, with no initial commit.
- Starter contained UI/API with synthetic fixtures, a local CSV parser, rules baseline, contract, and target migrations. API still used an in-memory Map; migrations were not used by the API.
- Starter included no UNEP dataset, persistent database connection, Sepolia deployment, LLM, or ML model.
- Starter creator reported three passing Python tests and syntax checks on ten TypeScript files. No logs were included in the ZIP, and these results were not reproduced in this runtime.
- Bun was unavailable in this runtime; dependency install, web build, Bun test runner, and Foundry had not run.
- Static inspection found a hash-length mismatch between API (`0x` + 64 digits) and SQL migration (`CHAR(64)`). The starter migration was corrected to text with the `0x` + 64 hexadecimal digit format.

## Context and constraints

- The user selected React/Vite, TypeScript, Bun/Hono, PostgreSQL/PostGIS, Python for offline analysis, Solidity/Foundry/viem, and Cloudflare Pages + Render + Supabase deployment.
- Evidrilo was used as a reference for separation of responsibility and decision records. Its modules, workflows, and technologies were not copied.
- Public MARS data are snapshots/replays, not a real-time feed. The pipeline must record license, URL, UTC capture time, and source hash.
- Observation counts, label completeness, and data sufficiency for a model had not been profiled from the actual files to be used. Do not treat a model as proven before evaluation.
- The reference path already contained another application. The new project was set up separately in the IEEE workspace; writing to the reference path is outside this design.

## MVP goals

1. Import at least one MARS source-data snapshot whose use complies with its license.
2. Normalize observations into source, plume, and time schemas with traceable provenance.
3. Show a map, source details, ordered observations, and feedback status with clear source labels.
4. Build a deterministic evidence bundle, compute its digest, record a testnet commitment and case-status transition, and detect artifact changes.
5. Provide transparent prioritization. Enable a predictive model only if labels and a suitable evaluation split are available.
6. Distinguish original data, user-submitted data, synthetic demo data, and unsuccessful/pending transaction status.

## Not MVP goals

- Replace MARS/Carbon Mapper detection, facility attribution, or notification systems.
- Treat feedback status as evidence that a leak was repaired.
- Send operational real-time alerts or act as an emergency-response system.
- Issue carbon credits, tokens, NFTs, or emissions-reduction claims.
- Store raw documents or personal data on blockchain.
- Create microservices, separate workers, multi-organization authentication, or production deployment before a tested need exists.

## Architecture options

| Option | Shape | Trade-off |
|---|---|---|
| A — TypeScript API + Python batch (selected) | React/Vite, Hono/Bun, Postgres/PostGIS, offline Python pipeline, EVM contract | Fits the selected stack; needs a clear file/schema contract between pipeline and API. |
| B — Python main API | React/Vite, FastAPI, Postgres/PostGIS, Python pipeline/model, EVM contract | Simpler analytics boundary; replaces the selected TypeScript backend and combines API with pipeline. |
| C — Static dashboard | React/Vite reads local artifacts, EVM contract for demo | Smallest initial demo path; no shared case/API state or database queries. |

Option A was selected for the MVP. The API is a modular monolith; historical processing runs as a local batch command. Revisit this decision before adding a service if the model needs online inference or the Python batch cannot produce artifacts sufficient for the application.

## Architecture and ownership

| Unit | Responsibility | Technology | Data/interface ownership |
|---|---|---|---|
| `apps/web` | Map, filters, source/case details, timeline, audit status | React, Vite, TypeScript, TanStack Query, React Router, MapLibre, ECharts | Consumes versioned HTTP contracts; does not access DB or signer keys. |
| `apps/api` | REST API, request validation, case flow, DB access, digest verification, demo transaction submission | Bun, Hono, Zod, Drizzle, viem | Owns case state and DB/chain adapter composition. |
| `packages/shared` | Request/response schemas and types shared by web/API | TypeScript, Zod | Cross-app contract; not a place for database logic. |
| `services/data-pipeline` | Capture snapshot, validate schema, normalize, create features and evaluation reports | Python, pandas; scikit-learn if labels suffice | Writes versioned artifacts read by API; is not a second MVP API. |
| `contracts` | Publicly inspectable commitment registry and transition records | Solidity, Foundry | Stores hashes/pseudonymous IDs/event types; not detailed coordinates or file contents. |
| `platform/database` | Schema and migrations | PostgreSQL, PostGIS, Drizzle migrations | Application state and geometries/spatial indexes used by queries. |
| Supabase Storage (optional) | Serve larger evidence bundles for download | Object storage | Off-chain files; contract stores digest, not a secret URL or contents. |

Add Zustand only if shared UI state—such as map filters preserved across panels—cannot be handled simply with React. A hosted LLM would be an optional adapter for summaries based on verified facts/source references; LLM output would not determine case status or mitigation claims.

## Main data flow

```text
MARS CSV/GeoJSON
      │
      ▼
Python ingest ── save snapshot, URL, UTC time, license, SHA-256
      │
      ▼
schema validation + normalization + feature/evaluation artifacts
      │
      ▼
PostgreSQL/PostGIS ◄──── Hono API ───── React/Vite
      │                    │                 ├─ MapLibre
      │                    │                 └─ ECharts
      │                    └──── viem signer (key only in backend)
      │                                      │
      └─ evidence bundle off-chain           ▼
                                    EVM testnet registry
                                    hashes + case events
```

The pipeline stores the raw snapshot unchanged before normalization. Each output artifact must point to the snapshot/schema version that produced it. Spatial queries use explicit SRID and coordinate ordering; API data return validated GeoJSON/coordinates.

### AI and inference limits

- First establish a deterministic, explainable baseline, profile the data, and manually label a small set of claim/evidence examples.
- Baseline assesses support for a narrow claim based on explicit evidence references. `supported` means supported by the supplied evidence, not that the evidence itself proves physical state.
- Consider a model or LLM only if the baseline/data show a measurable need. Evaluation must separate sources between train/test and report errors and abstention.
- Do not predict physical repair from `feedback`, final status, or no later plume. Do not use current `persistency` to reconstruct historical features if it includes observations after the cutoff.
- If LLM summaries are later enabled, give them validated fields only, require validated JSON output, and list supporting observation IDs. Output is narrative assistance, not an audit decision.

### Ledger and evidence integrity

The canonical bundle contains public source identity, capture time, snapshot hash, normalization version, pseudonymous case ID, and transition type. The contract records bundle digest, previous-record digest, event type, chain time, and sender. Append-only events preserve auditable order.

The contract proves that the same digest was committed and can be matched again. It does not prove source-data truth, the identity of the organization behind a wallet, or field mitigation. Write keys stay in the API environment and never enter the frontend bundle. No personal data or sensitive report contents are recorded on-chain.

## Repository structure

```text
iEEE-Methane-response/
├── apps/
│   ├── web/                    # React/Vite SPA
│   └── api/                    # Hono modular monolith
├── services/
│   └── data-pipeline/          # offline Python ETL/evaluation
├── packages/
│   └── shared/                 # Zod schemas and types shared by web/API
├── contracts/
│   ├── src/                    # Solidity registry
│   ├── script/                 # deployment scripts
│   └── schemas/                # cross-runtime evidence-bundle schema
├── platform/
│   └── database/               # Drizzle config and Postgres/PostGIS migrations
├── data/
│   ├── raw/                    # downloaded files excluded from Git
│   ├── processed/              # large local artifacts excluded from Git
│   └── manifests/              # source metadata, license, and digest
├── docs/
│   ├── architecture/           # data flow and claim limits
│   ├── decisions/              # concise ADRs
│   └── operations/             # setup, configuration, demo fallback
├── scripts/                    # ingest/export commands actually used
├── AGENTS.md                   # data, claims, secrets, and verification limits
├── package.json                # Bun workspaces for TypeScript apps
├── pyproject.toml              # Python pipeline environment
├── foundry.toml                # EVM contract configuration
├── .env.example                # variable names only, no secret values
└── README.md
```

The tree follows `apps/`, `contracts/`, `platform/`, `docs/`, and `scripts/` patterns from the reference repo. Create only folders with real files/responsibilities; no empty modules or separate workers just to match the reference shape. Bun is the TypeScript package manager/workspace, `pyproject.toml` manages the Python pipeline, and Foundry manages contracts.

## Failure behavior and demo fallback

| Condition | Designed behavior |
|---|---|
| Data source unavailable | Read saved snapshot; show capture time and `cached` badge. |
| Schema changes/required field missing | Fail ingestion with missing-field report; do not write partial records as valid data. |
| Too little data for a model score | Show `insufficient evidence` or explain the rules baseline. |
| LLM/provider failure | Hide generative summary; map, timeline, and deterministic audit remain usable. |
| RPC/testnet failure | Show `not anchored`/`pending`; local verification may be shown but not called a public transaction. |
| Simulated operator response | Label simulation in UI, evidence bundle, and demo video. |

## Deployment and configuration

- `apps/web`: Cloudflare Pages as a static SPA, Vite `dist` output.
- `apps/api`: Render Bun runtime with pinned Bun version.
- Database: Supabase PostgreSQL; enable PostGIS only through documented migrations. Supabase Storage is optional.
- Contract: test locally with Foundry, then use Sepolia for a public demo transaction.
- Secrets: RPC URL and testnet/LLM private keys live in backend environment. No service-role key, database credential, or signer key in the Vite bundle.
- API restricts CORS to the demo domain. Local environment separates frontend/API/database URLs.

## Verification plan after implementation approval

- Python: ingest snapshot, schema validation, chronology/no-leakage, metric reproduction, license/provenance manifest.
- API: Zod request validation, allowed status flow, digest round trip, and dependency-failure behavior.
- Contract: Foundry checks access control, duplicates, illegal status, and commit/digest verification.
- Frontend: Vitest for components/data formatting; Playwright for one demo flow from source details to verification result.
- End-to-end: one original snapshot, one evidence bundle, one inspectable testnet transaction, and one clearly labeled tamper drill.

No final commands are listed because lockfile, package versions, migrations, and provider configuration were not yet created or run. This design document claims no build, test, ingestion, or deployment results. Details from the starter creator's report and their verification status are recorded in `docs/history/delivery-notes.md`.

## Vertical-slice acceptance criteria

1. From a clean checkout, README instructions explain local web/API/pipeline setup and execution.
2. One licensed MARS snapshot can be reprocessed to produce a manifest with URL, UTC time, license, and hash.
3. Source details show ordered observations with fields linked to provenance.
4. Evidence bundle produces a stable digest; changing one byte makes the verifier report a mismatch.
5. EVM testnet contract stores a commitment visible in an explorer; RPC failure is not shown as success.
6. UI distinguishes public data, cache, simulated input, model/baseline, and mitigation evidence.
7. No unsupported real-time or causal claim is made.

## Risks and undecided choices

- Access completeness, row count, actual schema, and license of every selected file still need proof before pipeline work.
- Keep PostGIS only if the map/query actually uses spatial operations; if it only displays points, start with plain Postgres.
- Cross-source need and user benefit have not been validated through interviews; the MVP is an audit demo, not organizational deployment.
- The size of a usable model dataset is unknown. Model selection remains conditional on profiling/evaluation.
- The new repo was proposed for the IEEE workspace. The Evidrilo path remains intact and is only a structural reference unless directed otherwise.
