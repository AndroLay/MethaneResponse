# Progressive, Snapshot-Bound MARS Loading Plan

> **Execution:** Inline implementation is authorized by the active full-integration request. Work in the current checkout; do not stage, commit, reset, deploy, or touch other repositories.

**Goal:** Reduce initial browser transfer and memory while preserving every MARS source, linked and unlinked plume, original field, historical date, and snapshot binding.

**Architecture:** Keep the existing full gzip snapshot as the canonical browser import/test artifact and backend input. Add a compact source catalog plus deterministic, hash-verified observation buckets; load the catalog first, one source bucket for case history, and all observation buckets only when a view requires the complete archive. Never render a partial archive as a complete flux or plume overlay.

**Tech Stack:** Existing Python standard-library snapshot builder, React/Vite/TypeScript, Web Crypto SHA-256, existing Bun tests and Playwright workflow. No dependency or database schema change.

**Spec:** `AGENTS.md`, `docs/product/data-and-claims.md`, `docs/architecture/mars-publisher-geometry.md`, and `docs/development/performance-optimization.md`.

## Global Constraints

- Preserve the original full snapshot, schema compatibility, dataset ID, source archive SHA-256, all row IDs, coordinates, dates, units, uncertainty, and license/provenance.
- Keep unresolved source IDs unresolved; missing values remain missing and zero remains zero.
- Keep imported user snapshots and DEMO fixtures on their existing path.
- Verify compressed or HTTP-decoded bytes against the matching manifest digest before exposing catalog or observation rows.
- A partial source catalog may power source-density views; complete-history views must wait for all required buckets or show an explicit error.
- Preserve all existing uncommitted repository edits and use only repository-local changes.
- No remote provider call, deployment, blockchain transaction, or dependency installation is in scope.

---

## Baseline and target

Current pinned snapshot: `unep-mars-e0721015e925`; 4,211 sources, 23,785 linked observations, and 6,534 unlinked observations. The existing full browser snapshot is 2,824,828 compressed bytes and 24,515,159 decoded bytes. The generated source catalog with date summaries is 339,632 compressed bytes. The `SEN_S_001` bucket is 57,199 bytes and the `KAZ_S_159` bucket is 49,359 bytes. All 64 history buckets, including unlinked rows and artifact envelopes, total 2,992,913 compressed bytes; median bucket is 43,445 bytes and maximum is 85,602 bytes. Catalog plus the browser-verified `SEN_S_001` bucket is 396,831 compressed bytes. The production preview transferred 339,932 bytes for the catalog and 57,499 bytes for the selected bucket, including HTTP overhead.

Acceptance target for the pinned snapshot: initial source catalog plus the selected source's required history transfers less than 450,000 bytes compressed, all 30,319 plume rows can be reconstructed exactly on demand, and no global complete-history overlay appears until the archive is fully verified.

## Task 1 — Deterministic progressive artifacts

**Files:**
- Modify `services/data-pipeline/build_web_snapshot.py` to add `build_progressive_snapshot_artifacts(snapshot, full_manifest, bucket_count=64)` without changing `build_web_snapshot` output.
- Modify `services/data-pipeline/tests/test_build_web_snapshot.py` with fixture coverage for the new artifact builder.
- Create `services/data-pipeline/tests/test_progressive_snapshot.py` for bucket partition, byte determinism, and complete reconstruction tests.

**Artifact interface:** Return `{catalog_bytes, catalog_gzip_bytes, manifest, observation_buckets}`. Catalog sources retain all source metadata and add sorted `observationDates`; source histories are omitted from catalog rows. Each bucket stores linked observations grouped by source and unlinked observations grouped by their original plume ID hash. Root metadata binds every artifact to the existing full snapshot manifest's snapshot ID, source-archive hash, full-input SHA-256, source count, and plume count. Each file entry records compressed SHA-256, decoded SHA-256, byte sizes, and row counts.

- [x] Write a fixture test proving each source's observations and every unlinked observation occur in exactly one deterministic bucket.
- [x] Run that test and confirm it fails because the progressive artifact builder is not implemented. It failed at collection with the expected missing-builder `ImportError`.
- [x] Implement deterministic canonical JSON and gzip (`compresslevel=9`, `mtime=0`) output; reject invalid bucket counts, missing/duplicate IDs, mismatched source links, count mismatch, and a manifest for another snapshot.
- [x] Run fixture tests for deterministic bytes, hash verification metadata, linkage preservation, and full reconstruction.
- [x] Run `UV_CACHE_DIR=/tmp/methaneresponse-uv-cache uv run pytest tests/test_progressive_snapshot.py tests/test_build_web_snapshot.py -q` from `services/data-pipeline`: 5 passed. The pinned 4,211-source/30,319-plume partition regression separately passed in 2.06 seconds.

## Task 2 — Browser artifact verifier and bucket loader

**Status:** Implemented and locally verified. The full-snapshot manifest remains the root of trust; the browser verifies the progressive catalog and each requested bucket against the same snapshot binding before exposing records.

**Files:**
- Create `apps/web/src/progressive-mars-loader.ts` for manifest-bound catalog/bucket loading, cancellation, and per-snapshot bucket cache.
- Create `apps/web/src/progressive-mars-loader.test.ts` for valid and altered catalog/shard cases.
- Extend `apps/web/src/mars.ts` only with types needed for catalog metadata; preserve `MarsSnapshot` behavior.

**Interface:** `loadVerifiedMarsCatalog(fetcher, basePath, fullManifest, signal)` returns `{catalog, progressiveManifest}`. `loadVerifiedObservationBucket(fetcher, basePath, fullManifest, progressiveManifest, bucketId, signal)` returns `{sources: Map<sourceId, MarsObservation[]>, unlinkedObservations}`. Both verify bytes before parsing; loaded observations must match snapshot ID, archive SHA, original source/plume counts, bucket ID, source IDs, links, and exact expected row counts. The cache key includes the snapshot ID and bucket digest and never returns a partially verified bucket.

- [x] Add tests for valid compressed and server-decoded assets, snapshot-binding mismatch, tampered bytes, omitted rows, oversized manifests, and oversized artifact bodies.
- [x] Implement bounded fetch/body reads from manifest byte lengths and validate compressed or decoded SHA-256 before parsing.
- [x] Re-run loader tests, snapshot-integrity tests, and plume-geometry tests as part of the web suite.
- [x] Run `bun run check` and the focused changed-file gates.
- [x] Add explicit browser-loader cancellation coverage; the focused test verifies an in-flight manifest request receives the abort signal and rejects with `AbortError`.

## Task 3 — Progressive application workflow

**Files:**
- Modify `apps/web/src/App.tsx` to initialize the verified catalog, hydrate the selected source on detail-dependent routes, and hydrate the complete archive only for map modes requiring all records.
- Modify `apps/web/src/CasesWorkspace.tsx`, `apps/web/src/CaseDetailsDialog.tsx`, and `apps/web/src/EvidenceObservationPanel.tsx` only where explicit loading/error/retry states are required.
- Modify `apps/web/src/MapPanel.tsx` only to prevent complete-history layers from showing while history is partial.
- Extend existing web tests for filters, case details, map record modes, and selected-source navigation.

- [x] Add regression tests for catalog-only source-density loading and selected-source versus full-archive load decisions.
- [x] Hydrate the selected history only for detail-dependent workflows. Retain selected source ID and query string during loading/retry.
- [x] Load all buckets only for complete-history map modes; wait for every verified result and show retry/error instead of publishing a partial archive.
- [x] Preserve user-imported full snapshots, the legacy parser, API audit shape, export checksums, source metadata, and no-data/unknown/zero distinctions.
- [x] Run the focused web tests and `bun run check`.
- [x] Verify a complete-history layer and deliberate single-bucket failure in the production browser. The first attempt failed on injected bucket `005` and showed `0 historical observations`; after removing the fault and retrying, all 64 buckets loaded and the map showed `30,319 historical observations`.

## Task 4 — Rebuild, browser proof, and report

**Files:**
- Add deterministic artifact write options to `services/data-pipeline/build_web_snapshot.py` CLI and write the pinned catalog/buckets under `apps/web/public/data/`.
- Update `scripts/check-local.sh` only if artifact reproducibility becomes part of the established local gate.
- Update `docs/development/performance-optimization.md`, `docs/architecture/mars-publisher-geometry.md`, and `docs/history/next-steps.md` with measured new transfer, integrity checks, fallbacks, and limitations.

- [x] Regenerate progressive assets deterministically in separate temporary directories; the full snapshot and its manifest remained byte-identical to the tracked versions.
- [x] Run `bash scripts/check-local.sh` with the full PostGIS suite enabled. The evaluator output was regenerated in `/tmp` and confirmed byte-identical to the already-dirty working report before the aggregate run; the gate then reported no tracked-file changes.
- [x] Use production Chromium to measure catalog and selected-bucket transfers and inspect desktop/mobile case-to-map navigation. The selected-source sample transferred 339,932 B of catalog and 57,499 B of bucket data; the full 64-bucket history was not downloaded on the source-density route.
- [x] Inspect a real MARS source's case dialog: three 256×256 Esri World Imagery tiles at zoom 16 loaded; the map opened at the source's recorded coordinates, focused at zoom 11, and showed the selected source. The imagery is location context, not the MARS overpass image or mitigation proof.
- [x] Record provider and renderer limits. Esri tile requests returned HTTP 200 in the local run, while some raw provider JPEGs showed dark, jagged coastal mosaic patches. Chromium used software WebGL and emitted GPU readback warnings; neither indicates accelerated-device FPS or universal tile coverage.
- [x] Inspect Evidence Auditor source switching in the browser. Switching from `SEN_S_001` to `KAZ_S_159` updated the selected case, source coordinates, all three 256×256 context tiles, and its three observation records; its selected 2026-07-11 record matched the verified UNEP publisher geometry, reported flux, standard deviation, satellite, and source ID.
- [x] Retry a deliberately failed selected-source history request in the browser. Blocking bucket `003` showed `History unavailable` and no observation; the Auditor's Retry loaded 17 records for `SEN_S_001` from the same pinned snapshot.
- [x] Inject provider tile failures in the case dialog. Three mocked zoom-16 503 responses selected zoom 13 and loaded all three lower-zoom tiles; mocked 503s for zoom 16/13/10/7 rendered the explicit unavailable state, whose “Open source in globe” action still navigated to the selected `SEN_S_001` coordinates.

## Unresolved by local implementation

This change cannot establish Esri coverage at every coordinate, cloud persistence, live AI-provider quality, per-user identity, Sepolia transaction availability, physical-device performance, or user-pilot usefulness. Those remain separate readiness gates in `docs/history/next-steps.md`.

## Execution update — 2026-10-14

The progressive catalog and all 64 buckets are checked into the existing browser data directory. The pinned full snapshot and manifest were not rewritten. Python reconstruction tests verify all 4,211 source IDs and all 30,319 original plume IDs, including 23,785 linked rows and 6,534 unlinked rows. The browser verifies per-artifact hashes and snapshot binding before exposing source or history rows. On the default source-density route, history buckets are not fetched; opening `SEN_S_001` fetched only bucket `003`.

Production-preview browser evidence: desktop source navigation reached `/dashboard/map?sourceId=SEN_S_001`; the displayed center was `14.805°, -17.311° · z11.0`, canvas 660×534, with 4,211 source records. The 390×844 viewport retained a 390 px document width and a 338×438 map canvas, with the same source centered and selected. A real source dialog displayed its recorded location, dataset metadata, and Esri World Imagery location context; all three 256×256 tiles loaded. With mocked 503s on zoom-16 tiles, the panel fell back to zoom 13 and loaded three tiles; screenshot: `/tmp/methaneresponse-esri-z13-fallback.png`. With mocked failures at zooms 16/13/10/7, the dialog displayed “Satellite context unavailable”, then “Open source in globe” navigated to the exact case. These errors were deliberate browser-only Esri request mocks, not app/API failures. A second focused map inspection confirmed an Esri JPEG itself contains the visible dark/jagged coastal patches, so those artifacts are provider image content rather than an incorrectly plotted source marker. The location context is not methane or mitigation evidence.

The complete-history map path was also exercised in Chromium: an injected failure of bucket `005` produced the explicit verification error and a zero-count historical layer; retry recovered all 64 buckets and rendered `30,319 historical observations`. Performance entries recorded 64 unique bucket files, 2,992,913 compressed artifact bytes, 21,974,755 decoded bytes, and 3,012,113 browser transfer bytes including request overhead; the failed and retried request made 66 requests total. The Evidence Auditor was switched from `SEN_S_001` to `KAZ_S_159`; it displayed the new coordinate, all three 256×256 Esri context tiles, three history records, and the matching `VERIFIED` publisher shape for the selected 2026-07-11 record (496 kg/h, standard deviation 226 kg/h). A deliberately failed `SEN_S_001` history request displayed `History unavailable` with no records, then retry restored all 17 snapshot rows. The captured KAZ panel is `/tmp/methaneresponse-evidence-auditor-kaz-s-159.png`. Local case-to-map, full-history, and selected-history loading/error/retry paths have now been exercised. External imagery coverage, judge-network reachability, physical-device rendering, and GPU performance remain unverified.

The full `bash scripts/check-local.sh` gate passed with a disposable loopback-only PostGIS 17 instance: frozen install, API 92 pass / 0 fail / 538 expectations, web 146 pass / 0 fail / 164,236 expectations, verifier 3 pass / 21 expectations, Python 62 pass, production build, bundle budget, baseline evaluation, and Foundry 4 pass. Follow-up loader, disclosure-dialog, and research-source changes were verified separately: the focused progressive-loader suite passed 7/7; the latest full web suite passed 149 / 0 / 164,255; `bun run check` and `bun run build:web` passed. The temporary database stopped and removed itself after the aggregate run. Vite emits non-fatal upstream Zod annotation warnings and the lazy MapPanel chunk remains about 1.12 MB raw / 306.52 kB gzip.
