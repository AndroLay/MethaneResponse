# MethaneResponse prototype scope: no database service

- **Status:** Accepted
- **Decision date:** 2026-10-15
- **Scope:** Hackathon prototype and local demonstration

## Decision

Focus development on extracting more value from the public UNEP MARS data and making the investigation workflow clear. Do not build, configure, or require PostgreSQL, PostGIS, Supabase, or another database service for this prototype.

Use reproducible, versioned files for public MARS source data and derived browser snapshots. Store local audit revisions in the API's atomic JSON file store at `AUDIT_STORE_PATH`; use the in-memory store in tests. Keep MARS source archives, snapshot history, hashes, and provenance separate from audit storage.

## MARS product priorities

1. Keep the existing full source/plume snapshot and progressive browser loading as the base.
2. Integrate official monthly Top 50, country response-rate, and mitigation snapshot material as separately versioned local data when the publisher provides a usable source and exact period metadata.
3. Keep official Top 50 criteria distinct from PWF visualization values; do not create a project score and label it as an official MARS metric.
4. Show response numerator, denominator, and reporting period. Compare source records only through exact MARS identifiers and preserve the source URL, retrieval time, license, and SHA-256 for each imported release.
5. Add historical comparisons only where both dated releases are retained. Do not call the data live or infer a repair from missing later observations.

These items are the product direction; they are not all implemented merely by recording this decision.

## Implementation update — 2026-10-15

- The Top 50 and country response-rate portions of priority 2 are implemented from the UNEP catalog-linked archives in `data/real/mars_publisher_archives/releases/2026-10-15/`. Nine Top 50 months and eight country-period releases are normalized into a hash-manifested browser snapshot and lazy-loaded by the MARS Indicators workspace.
- Exact MARS source IDs bind each Top 50 monthly release to `unep-mars-675417694883`; no coordinate/fuzzy join is used. Country response numerator, denominator, percentage, and exact dates are retained.
- Priority 3 is enforced: the CSV does not include an explicit rank field, so the app does not infer rank changes from source row order. It compares only publisher-list membership.
- Priority 4 and 5 are enforced in the display and tests: feedback remains an administrative engagement measure; no missing observations are changed to zero, and no repair is inferred.
- The September 2026 mitigation snapshot has exact period metadata, but its UNEP WeDocs item lists CC BY-NC-ND 3.0 IGO. MethaneResponse adds a versioned link-only reference and does not bundle, parse, or adapt the report. A local machine-readable mitigation dataset remains out of scope until UNEP publishes a clearly licensed reusable source or rights are otherwise confirmed.
- Rebuild steps, archive and output hashes, periods, and bounds are documented in `data/real/mars_publisher_archives/README.md` and `docs/release/current-implementation-status.md`.

## Consequences

- Local audit history works across API restarts as long as the same JSON file remains available.
- This is a single-process prototype store, not shared multi-instance or hosted durable persistence. A hosted preview can lose its file on restart or redeploy.
- API write-rate limits are process-local and reset when the process restarts.
- The existing Postgres-backed anchor reservation and recovery path is removed. API anchoring/reconciliation is unavailable with the local file store; Solidity contracts, receipt-verification code, and local report digest verification remain available as separate prototype components.
- Earlier database tests, migrations, scripts, and deployment setup are removed from the active project. Dated records of previous PostGIS experiments are retained as historical evidence and are not current implementation instructions.
- No MARS snapshots, casebook records, audit bundle schemas, or historical blockchain receipts are intentionally rewritten by this decision.

## Reconsideration trigger

Revisit database-backed persistence only if a defined judging or user workflow demonstrably requires shared multi-user audit history across service restarts, and after the project owner explicitly approves the new infrastructure scope. Until then, local file storage is the sole API persistence path.
