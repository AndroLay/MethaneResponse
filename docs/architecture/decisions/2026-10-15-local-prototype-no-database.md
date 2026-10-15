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

## Consequences

- Local audit history works across API restarts as long as the same JSON file remains available.
- This is a single-process prototype store, not shared multi-instance or hosted durable persistence. A hosted preview can lose its file on restart or redeploy.
- API write-rate limits are process-local and reset when the process restarts.
- The existing Postgres-backed anchor reservation and recovery path is removed. API anchoring/reconciliation is unavailable with the local file store; Solidity contracts, receipt-verification code, and local report digest verification remain available as separate prototype components.
- Earlier database tests, migrations, scripts, and deployment setup are removed from the active project. Dated records of previous PostGIS experiments are retained as historical evidence and are not current implementation instructions.
- No MARS snapshots, casebook records, audit bundle schemas, or historical blockchain receipts are intentionally rewritten by this decision.

## Reconsideration trigger

Revisit database-backed persistence only if a defined judging or user workflow demonstrably requires shared multi-user audit history across service restarts, and after the project owner explicitly approves the new infrastructure scope. Until then, local file storage is the sole API persistence path.
