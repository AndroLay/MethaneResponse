# Repository state and decisions in force

**Inspection baseline:** `main` / `a82e2eee99bb79327f859f304f2f5d5939f07041`, 16 October 2026 WITA. The working tree was clean before these demo materials were added. Local `origin/main` matched; no remote fetch was performed during this documentation pass.

## What the product actually contains

MethaneResponse is a research prototype for tracing historical methane sources, checking whether evidence supports a specific claim, and carrying the assessment in a report that can be verified locally. It is not a monitoring authority or a repair certificate.

| Area | Responsibility |
|---|---|
| `apps/web` | React/Vite/TypeScript; MapLibre, sources and observations, Indicators, staged audits, reports, and a browser verifier |
| `apps/api` | Bun/Hono; sources from a pinned snapshot, rules baseline, audit versions, review and export; atomic JSON file store |
| `packages/shared` | Data contracts/Zod and synthetic fixtures that must remain labeled DEMO |
| `services/data-pipeline` | Python/uv; import, normalization, provenance validation, rules evaluation, and recurrence research |
| `data/real` | Publisher archives, historical casebook, and provenance/license information; separate from synthetic fixtures |
| `contracts` | Solidity/Foundry; registry and receipt semantics; this does not mean API anchoring is active |
| `scripts` | Standalone verifier, local gate, benchmark, map/bundle checks, and utilities |
| `docs` | ADRs, benchmark/pilot protocols, dated evidence, active status, and presentation materials |

Active flow: **publisher archive → validation and local snapshot → UI/API → claim and evidence references → rules baseline → versioned JSON audit → export → local verifier**.

## Decisions to preserve

| Decision | Reason / practical consequence |
|---|---|
| MARS first, local files, no database service | ADR accepted on 15 October. Do not revive PostgreSQL/PostGIS/Supabase or migrations for this demo. |
| Separate the public snapshot from audit state | The dataset and its derivations have version/hash/provenance; audits use `AUDIT_STORE_PATH`, defaulting to `data/state/audits.json`. |
| One process for local state | History survives a restart when using the same file; this is not multi-instance or hosted durability. The optional preview uses ephemeral filesystem storage. |
| Make claims specific and run rules first | `source_detected`, `operator_notified`, and `mitigation_confirmed` require different evidence types. Conflicts or missing evidence lead to abstention. |
| Do not elevate metadata into physical truth | Feedback, notification metadata, report titles, and absent follow-up observations do not prove repair or zero emissions. |
| Require exact source IDs for Indicators | No fuzzy join; do not rank by CSV order. Top 50 units in t/h differ from plume kg/h. |
| Preserve rights and provenance | Data is CC BY-NC-SA 4.0; third-party reports are link-only. The software's MIT license does not change the dataset license. |
| Keep AI optional and bounded | Document/quote/human-review paths exist; no provider is configured for the demo. There is no independent benchmark yet. |
| Distinguish digests from receipts | A local hash checks consistency; a receipt proves integrity/version order. Neither proves physical mitigation. API anchoring with the file store is inactive. |

Reopen the database ADR only if a concrete workflow needs shared state across restarts and the owner approves the added infrastructure scope.

## Active data inventory

- Snapshot `unep-mars-675417694883`: **4,218 sources, 30,414 plumes**; 23,861 plumes are linked to a source ID and 6,553 have no source ID. Date range: 29 October 2020–13 September 2026.
- Curated casebook: **4 cases, 7 observations**. This is a subset; source audits are not limited to those four cases because the API can load sources from the pinned global snapshot.
- Indicators: **9 Top 50 releases / 450 rows** and **8 country response periods / 278 country-period rows**. The latest Top 50 release is September 2026; the latest country period is August 2025–July 2026.
- The trained logistic model estimates whether a linked archive record appears within 365 days. This differs from heuristic priority/anomaly scoring and is not an emissions forecast. Retrospective evaluation has been inspected during development; the prospective ledger is waiting for outcomes.

## Quality evidence and what remains unproven

The complete gate, browser E2E, and latest CI for implementation `9ab1daf` are recorded for 15 October. Commits after that through the baseline above changed documentation/evidence only. Historical counts and results are not presented as tests rerun for this document package.

This presentation pass checked the core flow in a local browser and package integrity; detailed results are in the README and capture manifest. No product code changed.

Still open: an independent AI benchmark using documents with clear rights, a real-user pilot, physical-device measurements, a deployment accessible to judges if needed, a chain transaction if retained and authorized, and the final video. None should be treated as complete based on screenshots or a script.

## Pointers for continuing without reopening settled decisions

- Active status: `docs/release/current-implementation-status.md`.
- Scope decision: `docs/architecture/decisions/2026-10-15-local-prototype-no-database.md`.
- Provenance and dataset limits: `data/real/README.md`, `data/real/mars_publisher_archives/README.md`.
- Claim-rule evidence: `apps/api/src/audit.ts`, `apps/api/src/audit.test.ts`.
- Existing main flow: `e2e/audit-workflow.spec.ts`.
- AI benchmark: `docs/testing/ai-benchmark-annotation.md`.
- Pilot: `docs/evidence/target-user-pilot-protocol.md`.

Older roadmaps/checkpoints remain records of their original revisions. The older database decision and historical status header do not supersede the ADR and active status above.
