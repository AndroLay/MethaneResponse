# MethaneResponse Tech Stack

> **Earlier stack-selection research.** The recommendations below record options considered at the time. The stack actually used is documented in the [repository map](../repository-map.md) and [active architecture](../architecture/overview.md); the current prototype does not include a database.

**Decision date:** 11 October 2026
**Stage:** architecture recommendation for a hackathon MVP; not yet implemented or tested.

## Decision

Use a modular monolith with one web UI, one Python API/data service, one EVM contract, and local file storage for analytical data. This stack supports a source map, plume/feedback timeline, triage model, and on-chain commitment verification.

| Area | Choice |
|---|---|
| UI | Next.js App Router, TypeScript, Tailwind CSS |
| Map | MapLibre GL JS; show GeoJSON points and source clusters |
| Wallet/EVM UI | wagmi + viem, only to send or read demo transactions |
| API | Python + FastAPI + Pydantic |
| Data ingestion | Python `httpx`; save original CSV/GeoJSON responses as snapshots before normalization |
| Analytics | Parquet + DuckDB |
| Application state | SQLite for cases, user-entered evidence metadata, and demo status |
| AI | scikit-learn; simple baseline first, classification model only if historical labels are sufficient |
| Smart contract | Solidity + OpenZeppelin AccessControl, Foundry for local build/deployment, Sepolia for public evidence |
| Local packaging | Optional Docker Compose to run UI and API together |

## Why this stack fits

- Python keeps ingestion, tabular processing, and model evaluation in one runtime. FastAPI provides an OpenAPI contract for UI/API integration.
- MapLibre suits interactive point/GeoJSON maps. The MARS dataset planned for the MVP does not require raster processing or a heavy GIS server.
- Parquet/DuckDB simplify snapshot and time-series analysis of open data without an analytical database server. SQLite is sufficient for hackathon application state.
- Next.js provides a clean UI path for maps, filters, source-detail pages, case timelines, and an audit panel.
- The contract acts only as a public registry of commitments and status changes. Raw files and supporting documents remain off-chain.

## AI model limits

A reasonable MVP target is the **chance of another public plume observation within a defined time horizon**, based on observation history available before the prediction date. This is not a prediction of an actual leak or successful mitigation.

Build a transparent baseline first. If dataset size and label variation are adequate, test a scikit-learn model with forward-in-time splits and features computed only from observations before the cutoff. Do not use `persistency` from the latest snapshot to reconstruct historical features when that value includes post-cutoff observations. If labels are too sparse or the model does not beat the baseline, show rule-based prioritization and explain the method; do not display an AI score as if it were validated.

## Ledger limits

The `EvidenceRegistry` contract need only record the source-snapshot hash, case-bundle hash, previous-record hash, event type/status, and sender wallet address. The event log forms an append-only timeline. Use separate ingester and auditor roles if the demo actually shows two actors.

Do not store detailed coordinates, files, personal information, or operator messages on-chain. A hash proves that an artifact matches a commitment and transaction time; a wallet address alone does not prove organizational identity, satellite origin, or report truth. Operator input not sourced from UNEP must be labeled as simulated.

## Data and storage limits

1. Store downloaded UNEP files unchanged, with source URL, UTC download time, license, and SHA-256.
2. Normalize plume and source records to Parquet; use DuckDB to build summaries, timelines, and feature data.
3. Use SQLite only for demo state: case, actor wallet, off-chain evidence notes, and transaction references.
4. Use GeoJSON coordinates for the map. Add PostgreSQL/PostGIS only if the product grows into a multi-user application that needs spatial/volume queries.
5. UNEP says public MARS data are generally delayed about 30 days and are licensed CC BY-NC-SA 4.0. Treat ingestion as snapshot/replay, not real-time alerting; include attribution and license limits in the repo/demo.

## One end-to-end demo flow

`UNEP snapshot → hash and schema validation → source timeline + triage → map/case details → commit hash to Sepolia → change one byte in a copy → verifier reports mismatch`.

The UI must distinguish MARS observations, UNEP feedback status, user-entered information, and simulated data. Display `Potentially ceased` as a UNEP source status, not proof that a particular action stopped emissions.

## Suggested repository structure

```text
iEEE-Methane-response/
├── apps/web/                 # Next.js, MapLibre, wagmi/viem
├── services/api/             # FastAPI, ingestion, query, triage
├── contracts/                # Solidity, Foundry, deployment metadata
├── data/
│   ├── raw/                  # original snapshots, read-only after recording
│   ├── processed/            # Parquet
│   └── manifests/            # source URL, capture time, hash, license
├── models/                   # model and version manifest
└── docs/                     # methods, claim limits, demo setup
```

## Main technical risks

- **Data before UI development:** row counts and label distribution in the UNEP CSV/GeoJSON archive to be used have not been verified. Retrieve and profile the actual files first.
- **AI:** future-plume labels measure published detections, not emissions that actually occurred at all times. Satellite observations have detection limits and depend on viewing conditions.
- **Product claims:** MARS already handles detection, attribution, notification, and monitoring. MethaneResponse differentiation must come from independent snapshots and evidence-change verification, not recreating a detector.
- **Ledger:** if a single team wallet writes every record, multi-actor value is limited. Demo testing must explain the actors and authentication limits.
- **Map/RPC connection:** prepare locally stored example data and a previously committed transaction view for demos when the network is unavailable; label cached/demo content clearly.

## Technical and data documentation sources

- [Next.js App Router](https://nextjs.org/docs/app)
- [FastAPI OpenAPI](https://fastapi.tiangolo.com/tutorial/first-steps/)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)
- [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview)
- [scikit-learn TimeSeriesSplit](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection/TimeSeriesSplit.html) — temporal split documentation; use a calendar-specific split if observations are irregularly spaced.
- [Wagmi](https://wagmi.sh/core/getting-started)
- [OpenZeppelin AccessControl](https://docs.openzeppelin.com/contracts/5.x/access-control)
- [Ethereum: testing smart contracts](https://ethereum.org/developers/docs/smart-contracts/testing/)
- [Ethereum networks: Sepolia](https://ethereum.org/developers/docs/networks/)
- [UNEP plume/source data dictionary](https://methanedata.unep.org/dict-mars-plumes)
- [MARS data-sharing policy](https://methanedata.unep.org/methane-alert-response-system)
