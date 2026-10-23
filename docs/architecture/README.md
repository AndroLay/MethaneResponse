# Architecture

[Documentation index](../README.md) · [Repository map](../repository-map.md)

## Active design

| Guide | Contents |
|---|---|
| [System architecture](overview.md) | Components, three assessment paths, storage, access, and key decisions |
| [Data flow and audit](data-flow.md) | Archive → snapshot → investigation → audit → export; hash and privacy layers |
| [API reference](api-reference.md) | Routes, inputs, capabilities, pagination, and failure responses |
| [No-database decision](decisions/2026-10-15-local-prototype-no-database.md) | Accepted ADR: local snapshots/files and single-process limits |
| [Shared casework with a single writer](decisions/2026-10-17-shared-casework-single-writer.md) | P1 ADR: private team state, CAS/history, process lock, and local recovery |
| [Publication lifecycle](decisions/2026-10-18-publication-lifecycle.md) | P3 ADR: immutable consent, corrections/withdrawals, version 2 envelope, and migration/rollback limits |
| [Historical MARS map](real-map.md) | Progressive loading, layers, browser import, and fallback |
| [Earth rendering](earth-rendering.md) | Rendering notes and 12–13 October history; sizes/results are tied to their original revision |
| [Publisher geometry](mars-publisher-geometry.md) | Matching, provenance, integrity, and MARS geometry limits |
| [Publisher indicators](../../data/real/mars_publisher_archives/README.md) | Top 50/country-response archives, manifest, and rebuild instructions |

## Historical design notes

| Document | Status |
|---|---|
| [AI and blockchain, 12 October](ai-blockchain-implementation.md) | Early design snapshot; data volume, reviewers, and some assumptions have changed |
| [Grounded evidence and anchor recovery](grounded-evidence-and-anchor-recovery.md) | Earlier Postgres/anchor-intent design; adapters/migrations have been removed, so it is not current operating guidance |

Use the active overview to understand the current system. Database setup and transactional anchor recovery described in archives are not prerequisites for running the prototype. Field meanings and scientific limits are explained in [data and claims](../product/data-and-claims.md); current capabilities are listed in [implementation status](../release/current-implementation-status.md).

Active P2 decision: [durable single-writer intents](decisions/2026-10-17-durable-anchor-intents.md), with the [recovery runbook](../development/blockchain-recovery.md). Local evidence is distinguished from public Sepolia transactions.
