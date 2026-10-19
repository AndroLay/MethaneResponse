# MARS publisher indicators — local integration

> **Arsip rencana 2026-10-15.** Pekerjaan dan instruksi di bawah merekam revisi asal. Untuk kondisi sekarang gunakan [status aktif](../../release/current-implementation-status.md) dan [arsitektur](../../architecture/overview.md); asumsi database digantikan [ADR file lokal](../../architecture/decisions/2026-10-15-local-prototype-no-database.md). [Indeks rencana](README.md).

## Goal

Complete the accepted 15 October prototype-scope decision by adding the official monthly UNEP MARS Top 50 source releases and country response-rate releases to the local, database-free application. The work must be attributable, hash-bound, reproducible, navigable to the existing source map, and explicit about what each indicator does not prove.

## Scope and guardrails

- Preserve the upstream ZIP bytes and dataset-specific CC BY-NC-SA 4.0 attribution.
- Retain all monthly Top 50 releases and all response-rate periods present in the retrieved publisher archives.
- Normalize only for application use; keep exact source IDs, exact published values/units, missing values as `null`, source paths, archive hashes and retrieval metadata.
- Join source rows only by exact MARS source ID. Never infer notification delivery or physical mitigation from feedback.
- Load the new view and its data only when the workspace is opened. No database, AI provider, blockchain transaction, or other external service is introduced.
- Update current status documents while retaining older checkpoints as historical evidence.

## Steps and acceptance

1. **Reproducible ingestion (tests first):** unit-test ZIP integrity, CSV schemas, monthly Top 50 row counts and uniqueness, coordinate/number validation, period consistency, null semantics, deterministic output, and exact-ID joins. Implement a standard-library-only builder and retain source archives plus immutable retrieval provenance. Re-running with the same inputs must produce byte-identical JSON and manifest.
2. **Snapshot binding:** compare each available publisher source ID with the pinned local MARS source snapshot by exact ID, report matched/unmatched IDs without inventing records, and bind outputs to that snapshot. Browser validation must reject a data file whose SHA-256 differs from its manifest.
3. **Lazy user workflow:** add a MARS Indicators workspace with a paginated monthly Top 50 table, an eight-period country response history, source search, accurate units and numerator/denominator, and a one-click exact-source handoff to Map Explorer. Clearly label country feedback rate as engagement/response metadata, never mitigation. On mobile, keep tables inside their scroll regions, make those regions keyboard-focusable, and explain horizontal scrolling.
4. **Documentation:** link the current execution status and decision record, document the two releases, periods, hashes, license, transformation and limitations, and mark only locally completed work done. Keep participant eligibility, cleared third-party report rights, live AI evaluation, user pilot, physical-device tests and contest submission as explicit external gates.
5. **Verification:** run importer-focused and full Python tests, frontend unit tests/type checks, production build, local browser checks where available, and `git diff --check`. Record exact results and failures.

## Completion record

- [x] Ingestion tests and builder
- [x] Official source archives and provenance
- [x] Snapshot-bound normalized releases and browser hash verification
- [x] Lazy MARS Indicators workflow and regression tests
- [x] Current plan/status documentation reconciled
- [x] Verification evidence recorded

## Verification record — 2026-10-15

- `bun install --frozen-lockfile`: passed; lockfile unchanged.
- `bun run check:all`: passed, including API (104 tests), web (193 tests), verifier (34 tests), 160 Python tests, 4 Foundry tests, production build, and web-bundle budget check.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e e2e/audit-workflow.spec.ts`: full browser workflow passed 6/6. The focused MARS Indicators workflow was rerun after adding explicit country-period assertions and passed.
- Browser checks covered lazy loading, all retained publisher periods, Algeria's period-specific counts (2025-07: 2/135; 2025-08: 1/166), page-size changes, exact source navigation, mobile page width and keyboard-accessible table scrolling.
- Desktop and mobile full-page screenshots are preserved in [`docs/evidence/mars-publisher-indicators-2026-10-15/`](../../evidence/mars-publisher-indicators-2026-10-15/README.md).
- One intermediate full-suite browser run timed out on an existing lazy-loading route; that test passed isolated and in subsequent complete 6/6 runs. No application exception appeared in the failed run's error context.
- `git diff --check`: passed after the final documentation and test edits.

## Limits

The bundled publisher releases are dated historical snapshots, not a live feed. Top 50 membership and flux estimates remain publisher-derived and method-specific. Country response rates are aggregate administrative engagement, not source-level repair confirmation or emission reduction. A release comparison does not measure causal climate impact.
