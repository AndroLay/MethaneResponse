# Architecture documentation

| Guide | Purpose |
|---|---|
| [System overview](overview.md) | Service boundaries, data flow, persistence, and API structure |
| [Prototype scope decision](decisions/2026-10-15-local-prototype-no-database.md) | MARS-centered prototype priorities and removal of database services |
| [AI and blockchain implementation](ai-blockchain-implementation.md) | Evidence assessments, audit bundles, hashes, reviewer flow, and chain integration |
| [Grounded evidence and anchor recovery](grounded-evidence-and-anchor-recovery.md) | Exact citation validation, reviewer scopes, durable intents, and transaction reconciliation |
| [Real methane map](real-map.md) | Snapshot loading, source/plume records, interactions, and map layers |
| [Earth rendering](earth-rendering.md) | MapLibre projection, terrain, lighting, quality profiles, and fallbacks |
| [Publisher geometry](mars-publisher-geometry.md) | MARS geometry source, matching, provenance, and interpretation limits |
| [MARS publisher-indicator archives](../../data/real/mars_publisher_archives/README.md) | Versioned monthly Top 50 and country response-rate releases, hashes, rebuild steps and limits |

The prior Postgres-backed anchor reservation/recovery path has been removed. The dated [anchor recovery implementation note](grounded-evidence-and-anchor-recovery.md) is retained as historical design evidence; it is not the active storage architecture.

For field definitions and data limitations, use the [product data guide](../product/data-and-claims.md) and [active casebook provenance](../../data/real/README.md).
