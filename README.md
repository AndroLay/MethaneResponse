# MethaneResponse — Independent Methane Evidence Audit

> **STATUS: INTERACTIVE MAP + OPTIONAL IMPORTED MARS SNAPSHOT; AUDIT ENGINE STILL DEMO-ONLY.** The dashboard can display a locally imported UNEP MARS snapshot. It is a periodic historical satellite dataset, not a live feed. The API audit baseline accepts synthetic fixtures only; persistent storage, AI review of real operator documents, and testnet anchoring for MARS cases are not implemented.

## Purpose

Evaluate whether claims about methane emissions detection, notification and mitigation are backed by specific traceable evidence. A lack of evidence produces **insufficient evidence**, not a claim of physical non-mitigation. The simple deterministic baseline is intended to be tested before any hosted-LLM enrichment.

## Stack

- **Web:** React + Vite + TypeScript + Tailwind, TanStack Query, MapLibre
- **API:** Bun + Hono + Zod; synthetic fixtures + deterministic evidence-coverage baseline
- **Data pipeline:** Python + uv + pytest; local CSV parser/manifest with source field configured explicitly
- **Database target:** PostgreSQL/PostGIS (`platform/database/migrations`), **not yet connected to the API**
- **Blockchain target:** Solidity + Foundry + viem, Sepolia; **requires deployment and explicit admin configuration**
- **Storage:** deferred; no object storage required for the initial demo

## Quick start (Bun required)

The landing page is at `/`; open the interactive dashboard at `/dashboard`. The MapLibre explorer and data import steps are documented in [`docs/REAL_MAP_IMPLEMENTATION.md`](docs/REAL_MAP_IMPLEMENTATION.md). The UI limitations are documented in [`docs/UI_IMPLEMENTATION.md`](docs/UI_IMPLEMENTATION.md). A package-free structural preview is available at [`ui-preview/index.html`](ui-preview/index.html).

```bash
bun install
cp .env.example apps/api/.env
# terminal 1:
bun run dev:api
# terminal 2:
bun run dev:web
```

Open http://localhost:5173 for the landing page or http://localhost:5173/dashboard for the dashboard. Frontend proxies `/api` to http://localhost:3001. By default the dashboard shows **two fictitious sources** on an interactive basemap; their coordinates and case narratives are synthetic and must never be represented as UNEP observations.

### API smoke checks

```bash
curl -s http://localhost:3001/api/health
curl -s http://localhost:3001/api/sources
curl -s -X POST http://localhost:3001/api/audits \
  -H 'content-type: application/json' \
  -d '{"sourceId":"DEMO-001","claimType":"mitigation_confirmed"}'
```

The last example must return `insufficient_evidence`. It must not silently equate notification with mitigation. Default `anchored` is false.

### Run tests

```bash
bun run test:api
cd services/data-pipeline && uv run pytest
cd ../../contracts && forge test
```

The automated API, importer, and Foundry test suites have not been run in the current integration session. Bun typechecks, the Vite production build, and the interactive browser checks were run; see [`docs/UI_IMPLEMENTATION.md`](docs/UI_IMPLEMENTATION.md) for their results and limits.

### Local CSV ingestion

```bash
cd services/data-pipeline
uv run python ingest.py \
  --input ../../data/fixtures/mars_synthetic.csv \
  --source-column source_id \
  --output ../../data/processed/demo.json \
  --manifest ../../data/processed/demo.manifest.json
```

For the current MARS source/plume snapshot, `source_name` is the documented source ID and `id_plume` is the unique observation ID. Use the [official MARS dataset page](https://methanedata.unep.org/download-dataset) and latest [data dictionary](https://methanedata.unep.org/dict-mars-plumes), and preserve the exact retrieval time, archive hash, and dataset-specific license.

### Real-data sample

`data/real/` contains a small, attributed three-source excerpt from one official MARS snapshot plus a reproducible selection file. The raw archive and full normalized snapshot are ignored by Git. This casebook is **not automatically wired into the API or UI**; map data is imported through the documented MARS snapshot workflow. See [`data/real/README.md`](data/real/README.md) for provenance, license, case limitations, and reproduction commands.

### Interactive map and MARS import

The dashboard uses MapLibre with OpenFreeMap and Esri basemap tiles. Without a dataset, it shows visibly synthetic demo markers. To load official historical observations, download the MARS source/plume CSV or GeoJSON from the [UNEP dataset page](https://methanedata.unep.org/download-dataset). The dashboard accepts an extracted GeoJSON file; the standard-library Python importer also accepts the official ZIP and writes an ignored local snapshot:

```bash
python3 services/data-pipeline/import_mars_map.py ~/Downloads/unep_methanedata_detected_plumes_csv.zip
```

Review [`docs/REAL_MAP_IMPLEMENTATION.md`](docs/REAL_MAP_IMPLEMENTATION.md) for supported formats, attribution, and limitations. The imported snapshot is not shipped, refreshed, or independently authenticated by the app. MARS observations are periodic detections; feedback is not proof of mitigation, and the map density shading is illustrative rather than methane concentration or plume shape. The real-source audit control stays disabled because the API baseline handles demo fixtures only.

### Optional chain anchoring

An on-chain receipt is **not created** by the normal audit button. First deploy `contracts/src/EvidenceRegistry.sol` to Sepolia and authorize the signer as issuer (owner is issuer by default). Configure private RPC, signer and contract address in the API environment. Then, only from a trusted terminal:

```bash
curl -s -X POST http://localhost:3001/api/audits/<ID>/anchor \
  -H "authorization: Bearer $ADMIN_API_TOKEN"
```

The endpoint requires a configured admin token; never put this token in the browser. Read-only verification is available at `/api/audits/:id/verify` after anchoring. **The current audit store is process-local and not durable; move it to PostgreSQL before any real deployment.**

## Repository organization

```text
apps/web                    React SPA and map/audit UI
apps/api                    Hono API and rule baseline
packages/shared             shared Zod contracts and synthetic records
services/data-pipeline      CSV ingestion, manifest, unit tests
contracts                   Foundry contract and security tests
platform/database/migrations PostgreSQL/PostGIS target schema
data/fixtures               explicitly synthetic test data
data/raw, data/processed     ignored local datasets
scripts                     developer checks
docs                        architecture, methodology, roadmap, licensing
```

Project notes and the consolidated hackathon research archive are indexed in [`docs/README.md`](docs/README.md).

## Deployment

See `docs/deployment.md` and `render.yaml`. Production requires public `VITE_API_BASE_URL` (Cloudflare Pages frontend to Render API) and private `WEB_ORIGIN` CORS configuration in API. No deployment has been performed.

## Source restrictions

The MARS download page and archive license the dataset under **CC BY-NC-SA 4.0**. This repository contains only the attributed three-source excerpt in `data/real/`; it does not contain MARS case reports. The broader Eye on Methane terms page currently states CC BY-NC 4.0, so follow the dataset/archive-specific license for this excerpt and recheck terms before adding data. See `docs/data-and-claims.md`.

