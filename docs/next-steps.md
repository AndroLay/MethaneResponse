# Implementation priorities (not yet complete)

## Progress update — 2026-10-12

- Downloaded and hashed one official MARS sources-and-plumes archive. Raw data and the complete normalized snapshot remain under Git-ignored `data/raw/` and `data/processed/`.
- Added a standard-library importer that keeps source feedback separate from plume observations and records unlinked plume rows instead of guessing source assignments.
- Validated 4,210 unique source IDs, 30,289 unique plume IDs, 23,770 linked plumes, 6,519 plumes without a source ID, and zero non-empty plume source IDs without a matching source record. Source plume counts and latest plume IDs match the linked rows in this snapshot.
- Added an attributed, archive-hash-pinned casebook for three real sources. Each case links to an official UNEP item whose metadata describes a confirmed mitigation action; the reports and their underlying evidence are not copied into the casebook or independently re-audited. The Argentina item page did not show an item-level license at review time. The casebook is not yet connected to the app.
- The 12–14 October foundation gate is **partially complete**: data provenance and source/plume relationships are established; document evidence, a labeled claim benchmark, and proof of a product gap beyond MARS remain open.

### Next gate by 2026-10-14

1. Find traceable, licensed public documents for claims tied to the selected real cases. If none are available, keep mitigation claims at `insufficient_evidence` and make the source-data-only scope explicit.
2. Manually define a small claim set before implementing model-assisted extraction; do not score the 3-case demo as the requested 40–80 claim benchmark.
3. Confirm the target user action that the audit supports and document where existing MARS data does not provide it.

1. **P0 (partial):** snapshot acquired, source ID mapping checked, and local provenance casebook generated; load the records into PostgreSQL with provenance during the API/database phase.
2. **P0:** collect a small manually annotated set of real confirmed cases and unsupported/adversarial claims; measure rule baseline and citation accuracy.
3. **P0:** replace in-memory fixtures/audits with persistence and authorization; use durable audit revision IDs.
4. **P1:** integrate link-based source documents, citation viewer and source-disjoint evaluations.
5. **P1:** deploy Sepolia registry and perform the end-to-end chain verification test.
6. **P1:** deploy frontend/API with startup monitoring and check judge-accessible URLs; create 3–5 minute demo.
7. **P2:** only if baseline is inadequate, test optional hosted LLM extraction with strict citation schemas; measure error/abstention.
8. **P2:** add object storage, state libraries, workers or advanced charting only when a concrete feature needs them.

Scope decisions for hackathon: no NestJS; no Quasar; no FastAPI background server; no custom satellite plume-detection model; no LLM assertion of physical repair.

