# MethaneResponse performance changes — 13 October 2026

> **Arsip perubahan dan pengukuran 13–14 Oktober 2026.** Angka, snapshot, database, dan kalimat status dalam bagian asli di bawah berlaku pada revisi asal. Untuk ukuran/batas terbaru lihat [status aktif](../release/current-implementation-status.md); untuk pemuatan saat ini lihat [peta](../architecture/real-map.md).

This change reduces work and transfer on initial navigation and audit-history requests while preserving the pinned MARS snapshot, observation history, evidence provenance, and map layer quality. It does not cap or discard source or plume rows. The 13 October update moves snapshot verification/parsing to a Web Worker and returns complete records in bounded batches so one large structured clone does not block the UI.

**Snapshot scope:** the transfer sizes and browser performance observations in this dated report use `unep-mars-e0721015e925` (4,211 sources, 30,319 plume rows, through 2026-09-11). The active dataset is now `unep-mars-ccd8267c55ee`; do not read the older byte counts as current release sizes. Current progressive artifact sizes are recorded in [`next-steps.md`](../history/next-steps.md) and active provenance in [`data-and-claims.md`](../product/data-and-claims.md).

## What changed

### Web application and map

- The landing page and dashboard are separate dynamic imports. MapLibre CSS is loaded with the map component, rather than on the landing page.
- Map source and observation GeoJSON are built only for layers that display them. Flux grids, priority overlays, and history aggregation are memoized and reused when the map style reloads.
- When observation history is not selected, the map skips its monthly-history aggregation. Date bounds use a single scan rather than allocating and sorting an intermediate date array.
- The source and plume datasets remain complete. Layer selection changes when a derived rendering representation is computed; it does not change the underlying evidence or history.
- The MARS snapshot worker applies the same SHA-256, snapshot-ID, archive-hash, and row-count checks as the previous main-thread path. It transfers a copy of fetched bytes so fallback parsing still has the original buffer; invalid-data errors remain hard failures.
- Worker results are sent in ordered batches of up to 64 sources / 512 linked observations and 512 unlinked observations. The loader checks offsets and final counts before publishing the snapshot. Worker construction/runtime failure falls back to the same verified parser; route cleanup aborts and terminates active worker work.
- Evidence imagery uses a shared tile service for location context plus the official, source-linked MARS plume geometry archive; no image file is fetched or stored for each case. The selected month shard is loaded on demand. The complete pinned snapshot has verified publisher geometries for all 23,785 linked observations across 4,211 sources; the 1,207 publisher records with null geometry remain explicitly unavailable. See [MARS publisher geometry](../architecture/mars-publisher-geometry.md) for provenance, integrity checks, and scientific limits.

### API, persistence, and audit history

- Audit history supports keyset pagination (`limit` and opaque `cursor`), newest first, with a stable timestamp and audit-ID tie-breaker. Page size is limited to 100; the web UI requests 50 at a time and loads earlier revisions on demand.
- The existing `GET /api/audits` response shape remains available when pagination parameters are omitted. Private history stays authorization-scoped and returns `Cache-Control: no-store`.
- PostgreSQL filters public visibility and applies the cursor before `LIMIT`, avoiding loading the complete history for a page. Migration `0005_audit_history_pagination.sql` adds indexes for source, claim type, and global history order.
- The local JSON store caches parsed records until the file's device/inode/size/mtime/ctime signature changes. Writes remain atomic and update the cache only after rename succeeds. This is a local development store; production still requires PostgreSQL.

## Measured build impact

Production build output after the change:

| Asset | Compressed build size (gzip) | Load timing |
|---|---:|---|
| Initial entry JavaScript | 78.76 kB | Landing route |
| Landing page JavaScript | 9.16 kB | Landing route |
| Dashboard App JavaScript | 81.83 kB | Dashboard route |
| Map panel JavaScript | 306.50 kB | Map route |
| Initial entry CSS | 36.82 kB | Landing route |
| Landing page CSS | 8.74 kB | Landing route |
| MapLibre-related map CSS | 10.17 kB | Map route |
| Snapshot worker | 11.58 kB (3.86 kB gzip) | First full-snapshot load |
| Snapshot integrity chunk | 1.67 kB (0.69 kB gzip) | First full-snapshot load |
| Publisher geometry loader | 8.04 kB (2.82 kB gzip) | Evidence selection / map geometry layer |

These figures describe Vite build assets, not measured network transfer sizes. The MapPanel chunk is 1,121.25 kB before gzip, above Vite's 500 kB advisory threshold, and loads only when the map route opens. Vendor source comments in the installed Zod package produce a Rollup annotation warning; the build completes and Rollup removes those comments.

## Validation evidence

- `bun run check`: passed; API and web TypeScript checks.
- `bun run test:api` with a temporary PostGIS 17 database bound to loopback: 92 passed, 0 failed, 532 expectations, 0 skipped. The container used tmpfs and was removed after the run.
- `bun run test:api` without `TEST_DATABASE_URL`: 85 passed, 9 PostGIS tests skipped, 502 expectations.
- `bun run test:web`: 138 passed, 0 failed, 164,210 expectations after strengthening all-source imagery coordinate coverage.
- `bun run test:verifier`: 3 passed, 0 failed, 21 expectations.
- `UV_CACHE_DIR=/tmp/methaneresponse-uv-cache bun run test:data`: 58 passed.
- `bun run test:contracts`: 4 passed, 0 failed.
- `bun run build:web`: passed; current bundle sizes are recorded above, with the large lazy MapPanel chunk and two non-fatal upstream Zod annotation notices.
- Browser inspection on the local production preview confirmed the landing route did not request the dashboard or map chunks. Opening the dashboard then fetched the map chunk and rendered the historical MARS layer. The inspected snapshot contained 4,211 sources and 30,319 plume rows; the complete snapshot remained loaded.
- Desktop and 390 px mobile screenshots were inspected. Mobile content stayed within 390 px, the map canvas rendered at 340 × 363 px, and the page had no alert state or horizontal overflow.
- Same-browser controlled check on 13 October used the decoded snapshot response (24,515,159 bytes), the same browser, route and viewport. Main-thread parse took 102 ms and registered a 102 ms long task; the worker path took 187 ms end-to-end and registered no long task. Both returned snapshot `unep-mars-e0721015e925`, 4,211 sources, 30,319 plume rows and the expected manifest-bound input hash. Three repeated worker runs took 156–188 ms and returned the same counts. This establishes lower observed UI-thread blocking in this Chromium run, not a faster total load on every device.
- The dashboard route rendered one MapLibre canvas at 660 × 534 on desktop and 338 × 438 at a 390 × 844 viewport. The mobile document width remained 390 px; the pinned snapshot and selected `KAZ_S_159` record remained available. Chromium console reported zero errors. The browser used software WebGL, so this does not verify accelerated rendering or phone FPS.
- On `/dashboard/audit?sourceId=KAZ_S_159`, Chromium showed three 256 × 256 Esri tiles labeled as location context and the exact selected UNEP publisher geometry marked `VERIFIED`: plume `941806b5-2afe-46ac-baac-a0230880cede`, timestamp 2026-07-11T08:12:14Z, reported flux 496 kg/h, reported standard deviation 226 kg/h. Selecting a different timeline point changed the displayed geometry and metadata to that exact record. The 390 px mobile document had no horizontal overflow and the browser console had zero errors. Local archive regression checks cover all 66 monthly shards and all 23,785 linked observations; live imagery service availability is not established for every source location.
- A second browser pass added a 2.2-second delay to Esri tile responses. The status “Loading satellite location imagery…” appeared before the tile decoded; after load, the publisher shape remained `VERIFIED`. Fully loaded desktop and mobile captures are `/tmp/methane-evidence-auditor-final-loaded.png` and `/tmp/methane-evidence-auditor-mobile.png`. This confirms the loading UX and the available sample location, not live tile coverage at every point or device.

The PostgreSQL result above is from a disposable local PostGIS container, not a cloud database. No live database, external AI provider, or blockchain network was used for this performance validation. The browser ran with a software WebGL renderer and emitted GPU readback performance warnings; this is not a measurement of physical-device FPS.

## Limits and next performance steps

- The map chunk remains substantial because it includes MapLibre and map rendering code. Further reduction should be based on a browser network profile and avoid removing terrain, history, or detail from a selected scientific layer.
- Before the 14 October progressive-loading update, the default bundled map fetched the complete gzip snapshot: about 2.7 MB compressed and 24,515,159 decoded bytes. That full snapshot remains the canonical import/fallback artifact. The default bundled route now starts from a hash-bound source catalog and requests source history only for detail-dependent workflows; complete-history layers fetch every bound shard before rendering. See the 14 October measurements below.
- In-memory and JSON-file pagination must scan the local records; large shared deployments should use PostgreSQL's keyset query.
- A physical low-end Android/iOS profile and PostgreSQL `EXPLAIN (ANALYZE, BUFFERS)` are still needed to assess device frame time and index selection. No FPS or cloud-database latency guarantee is made.

## Follow-up: route chunk split and production browser measurement

The dashboard workspace was split into eight independently loaded route/overlay chunks (`CasesWorkspace`, `IntelligencePanel`, `EvidenceObservationPanel`, `CaseDetailsDialog`, `AuditHistoryPanel`, `ImportedAuditVerifier`, `OperatorsWorkspace`, and `SettingsWorkspace`). Each route has an accessible loading fallback. The case dialog chunk is requested only when a case is actually opened. `scripts/check-web-bundle.ts` is now part of `scripts/check-local.sh`; it fails if a route chunk is missing, MapPanel ceases to be a separate lazy chunk, or the App entry exceeds 75,000 gzip bytes.

The App entry fell from 81.83 kB gzip to 56.85 kB gzip (about 30.5% smaller). This is an entry-chunk reduction, not a reduction in the map implementation. MapPanel remains about 306.5 kB gzip and retains its existing map quality.

One cold production-preview browser run after this split produced the following measurements:

| Viewport | DOM content loaded | Map canvas ready | Map canvas | Document overflow | App transfer | MapPanel transfer | Initial workspace chunks | Browser errors |
|---|---:|---:|---:|---|---:|---:|---:|---:|
| 1280 × 900 | 52 ms | 2,078 ms | 660 × 601 | None | 57,148 B | 306,830 B | 0 | 0 |
| 390 × 844 | 54 ms | 1,992 ms | 338 × 438 | None | 57,148 B | 306,830 B | 0 | 0 |

Both runs used the pinned full snapshot (2,825,128 transferred bytes / 24,515,159 decoded bytes), observed network idle, and requested no unrelated workspace chunks on initial map navigation. Same-origin resources totaled about 3.50 MB. The browser observed 12 Esri location-context tile requests on desktop and 6 on mobile; the final tile responses ended at 1,290 ms and 1,239 ms respectively. Cross-origin image bytes are not included in same-origin transfer totals because the provider response does not expose timing/size data to this page.

These are single headless Chromium cold runs with software WebGL, on one host and one external imagery connection. They are reproducible spot checks, not a performance distribution or a real-device test. They showed four long tasks, with the longest observed at 263 ms desktop and 248 ms mobile, plus software-renderer console warnings. The route split reduces JS requested by the App entry and prevents unused workspaces loading upfront; the measurements do not establish a frame-rate improvement or a universal map-ready time. A physical low-end phone profile and a repeated/controlled network benchmark remain open.

## Follow-up: snapshot-bound progressive MARS loading and real case imagery (14 October)

The default browser route no longer needs to transfer and parse all 30,319 plume rows just to display the 4,211 source locations. The Python builder emits a deterministic catalog plus 64 source-ID/plume-ID buckets, all bound to `unep-mars-e0721015e925` and the pinned source archive. The full snapshot and manifest remain unchanged and continue to support user-imported archives and the existing fallback path. The browser checks manifest binding, compressed or decoded length, and SHA-256 before exposing each catalog or bucket.

| Browser/data path | Compressed artifact bytes | Browser transfer observed | Decoded bytes | Content verified |
|---|---:|---:|---:|---|
| Catalog only | 339,632 B | 339,932 B | 3,143,936 B | 4,211 source rows and historical date summaries |
| Catalog + selected `SEN_S_001` history | 396,831 B | 397,431 B for those two requests | 3,571,322 B | Selected 17 plume records from bucket `003` |
| All 64 history buckets, after choosing a full-history layer | 2,992,913 B | 3,012,113 B | 21,974,755 B | 23,785 linked + 6,534 unlinked = 30,319 rows |

The browser loaded the complete-history map layer with at most four bucket requests in flight. An injected network failure for bucket `005` displayed “Historical map layer could not be verified” and kept the layer at `0 historical observations`; after the retry, the map showed `30,319 historical observations`. Browser performance entries contained all 64 unique bucket URLs. The same two-directory CLI regeneration produced identical SHA-256 digests for all 68 generated artifacts. This full-history mode transfers slightly more compressed data than the single full gzip snapshot because of per-bucket envelopes; the gain is avoiding that download and decoded snapshot on the default source-density route, not reducing bytes when the entire archive is explicitly requested.

The case dialog uses three shared Esri World Imagery tiles centered on the selected real source; it does not download or retain one image file per source. All 4,211 valid source coordinates produce a zoom 16 tile view and broader fallback options in a regression check. Chromium loaded all three 256×256 tiles for `SEN_S_001`, displayed its recorded `14.80445° N, 17.31093° W` position, and opened the same coordinate in Map Explorer at zoom 11. The 390×844 browser viewport stayed at 390 px document width with a 338×438 map canvas. An inspection of the actual HTTP-200 Esri JPEG payload confirmed that dark jagged coastal patches in the map screenshot are present in the provider image itself; the application does not draw them as methane evidence. Imagery dates, availability, resolution, and mosaicking remain external-provider properties.

The browser ran with Chromium software WebGL. It emitted GPU readback/performance warnings and this test establishes neither hardware-accelerated rendering nor mobile frame rate. No universal tile coverage claim is made. The map's data source count, focused coordinate, and full-history loading are verified locally; cloud services, a judge-network path, physical phones, and Esri availability at every point are not.

The Evidence Auditor was switched from `SEN_S_001` to `KAZ_S_159` in Chromium. Its image and metadata updated to `43.41337° N, 52.91829° E`; all three 256×256 Esri tiles loaded; the timeline showed three records; and the selected 2026-07-11 observation matched its hash-verified UNEP publisher geometry at 496 kg/h with standard deviation 226 kg/h. This ties a real map-context image, dated observation, source ID, flux, uncertainty, and official geometry together without presenting the context tile as the original MARS satellite measurement. Screenshot: `/tmp/methaneresponse-evidence-auditor-kaz-s-159.png`.

The complete local gate `bash scripts/check-local.sh` passed with an ephemeral loopback-only PostGIS 17 database: frozen Bun install, typechecks, API 92/0/538, web 146/0/164,236, verifier 3/0/21, Python 62 passed, production build, bundle budget, baseline evaluation, and Foundry 4 passed. The evaluator result was verified byte-identical before the gate rewrote it, and Git reported no new tracked-file changes from the gate. Follow-up progressive-loader, disclosure-dialog, and cited-research changes were verified separately: the focused loader suite passed 7 tests, and the latest full web suite passed 149/0/164,255; `bun run check` and `bun run build:web` also passed. The temporary database was stopped and removed. The production build still reports non-fatal upstream Zod annotation warnings and a 1.12 MB raw / 306.52 kB gzip MapPanel chunk.

### Case imagery fallback check (14 October)

The case dialog's shared on-demand imagery path was checked in Chromium with browser-only mocked `503` responses. Failing all three zoom-16 Esri requests switched the case to zoom 13, where the three fallback tiles loaded at 256×256 each; the source marker remained attached to `SEN_S_001` and the recorded coordinates. The visual capture is `/tmp/methaneresponse-esri-z13-fallback.png`. When zoom 16, 13, 10, and 7 were all mocked unavailable, the dialog showed `Satellite context unavailable`, retained the source metadata, and exposed `Open source in globe`; that action navigated to `/dashboard/map?sourceId=SEN_S_001`.

The three and eighteen browser console errors in these runs correspond to the deliberately failed image requests at each zoom, not to API or application exceptions. These tests prove fallback and recovery behavior for the sampled source. The 4,211-coordinate regression proves tile URL derivation, not external Esri coverage or quality at every coordinate. No case-specific image files are downloaded or stored. Esri imagery remains a date-variable geographic backdrop, separate from hash-verified UNEP publisher geometry and observation metadata.

At that earlier route-chunk gate, `bash scripts/check-local.sh` passed frozen install, typechecks, API/web/verifier suites, production build, bundle budget, Python tests and baseline evaluation, and Foundry tests. The API run then had 85 passed, 9 PostGIS cases skipped because `TEST_DATABASE_URL` was not set, 0 failed (508 expectations); the web suite had 138 passed, 0 failed (164,210 expectations). This gate did not include cloud services or the later separate temporary-PostGIS integration run. The later aggregate and follow-up counts are recorded below.

## Single-context globe startup — 20 October 2026

A public CI timing experiment recorded the plan caption in the DOM ~0.44 s after
Locate and a 20.715 s main-thread task immediately afterward; the MapPanel module
completed in ~90 ms. This was a graphics-initialization stall, not a missing plan
or a slow module download. A separate regression counted two allocated WebGL
contexts: a detached capability probe followed by the real MapLibre canvas.
The increment removes the probe, reuses the actual renderer and retains the
MapLibre-construction error fallback. The same browser regression changes from
2 contexts to 1; no timeout, assertion or sandbox policy was weakened.

Bootstrap pixel ratio is capped at 1 until the existing quality effect applies
the selected tier. The configured canvas ceiling, tile-cache zoom limit and fade
remain those of the preferred tier, so starting small does not permanently cap
Quality rendering. Low-tier devices still start with 2048 / cache 1 / fade 0.
An auto-high device later identified as a software renderer lowers pixel ratio
and effects, but retains the preferred constructor-only cache/fade/canvas limits
(4096 / cache 5 / fade 180). This differs from the former throwaway-probe path;
MapLibre 5.24 has no public setter for those limits. It is a known resource tradeoff
on large software-rendered viewports, not a measured physical-phone FPS gain.

Only the public regression fixture counts context allocations and records bounded
readiness timing. It does not replace native WebGL methods or contact an AI
provider. Check the exact pushed revision's CI separately from local results;
prior diagnostic runs and frozen evidence remain historical records.
