# MethaneResponse Workflow Verification Report — 13 October 2026

This document records the latest checks on the local checkout and running application. The results demonstrate software behavior in local tests, not methane mitigation outcomes or production service performance.

## Summary

- Frozen installation, typecheck, all UI/API/verifier/data tests, contracts, and web build passed.
- Nine PostgreSQL integration tests passed against a temporary PostGIS container without a volume; the container was removed after the run.
- Map, source history, auditor, cases, reports, and verifier workflows were checked in Chromium. A temporary audit file verified successfully and an altered file was rejected.
- No test audit was saved to the application's file store. The temporary database container was removed after testing.
- The AI provider, reviewer authentication, and Sepolia transactions were inactive in the inspected application. They were tested through local unit/integration tests, not live services.

## Evidence by workflow

| Workflow | Checks and evidence from this session | Status and limits |
|---|---|---|
| 1. Explore MARS observations and sources | The browser opened `/dashboard/map?sourceId=KAZ_S_159`. The map showed snapshot `unep-mars-e0721015e925`, 4,211 sources, 30,319 plume rows, 6,534 rows without source IDs, range 2020-10-29—2026-09-11, and historical/not-live labels. The source panel showed 3 linked observations, dates, flux, and uncertainty. The Documents page showed two snapshot versions with their hashes and counts. | **Checked in desktop browser and 390×844 viewport.** On mobile, document width was 390 px; map 342×410 px and canvas 340×408 px. The archived snapshot is not a real-time feed. |
| 2. Historical analysis and investigation priority | Local endpoint `/api/intelligence/insights?sourceId=KAZ_S_159` was bound to the same snapshot, contained 3 observation opportunities, and reported forecast `not_available`. The MEX audit page showed observation counts/dates, flux/uncertainty range, anomaly screening, and limitations. API tests checked source ranking and forecast abstention; Python tests checked intelligence construction and redetection. | **Analysis and heuristics tested.** Priority score is not leak probability. No trained forecast model or prediction claim. |
| 3. Claim and document audit | The browser opened `/dashboard/audit?sourceId=MEX_S_003`: the UI showed notification/response metadata as available but did not treat it as mitigation evidence; the linked official-evidence inventory count was 0. API tests checked a detection claim with observation citations, a non-curated snapshot claim, and rejection of mitigation inference from feedback/notification/report titles. AI tests checked exact-quote validation, abstention, response limits, consent, and provider failures. | **Rules baseline and mock AI path tested.** Live status `documentModelConfigured=false`; no document or request was sent to an AI provider. |
| 4. Human review and revisions | Reviewer-token/API tests checked scope, expiry, tampering, publication permission, and separation of read/review/anchor access. File-store and PostgreSQL tests checked immutable revisions after reconnect; Postgres tests also checked durable anchor reservation. | **Authorization/revision behavior tested locally.** Local service has `humanReviewConfigured=false`; there is no external human reviewer or decision on a real case. |
| 5. Reports and integrity checks | The Reports page showed JSON export disabled before an audit was saved. The Verification Center imported a temporary test fixture based on MARS source `KAZ_S_159`, showed a mitigation claim with `insufficient_evidence`, then displayed a matching digest. A second fixture altered the bundle without updating its hash; the UI rejected it with “Audit summary fields do not match the hashed bundle.” Web and CLI tests also cover export, context checksums, v3 revisions, and content changes. | **Local hash and tamper rejection demonstrated in the browser.** Fixtures existed only in `/tmp`; they are not human-review reports. The currently supported product export is JSON, not PDF. |
| 6. Receipt and blockchain verification | Verification Center showed 0 receipts and “No public transaction”. API tests checked the authentication guard, idempotency, intent recovery, and transaction/event matching. Foundry tests checked issuer authorization, rejection of empty hashes, revisions, and unauthorized accounts. | **Contract and local integration tested; no live chain.** `chainConfigured=false` and `chainWriteConfigured=false`; no Sepolia/mainnet transaction was sent. A receipt proves hash/revision ordering, not physical repair. |

## Test gates run

| Command | Result |
|---|---|
| `bun install --frozen-lockfile` | Passed; lockfile unchanged. |
| `bun run check` | Passed; API and web typecheck. |
| `bun run test:api` with `TEST_DATABASE_URL` pointing to temporary PostGIS | **92 passed, 0 failed, 532 assertions, 0 skipped.** Nine PostGIS tests cover migrations, persistence, pagination, evidence rows, revisions, and anchor intent; the volume-free database was removed afterward. |
| `bun run test:web` | **138 passed, 0 failed, 67,356 assertions.** |
| `bun run test:verifier` | 3 passed, 0 failed, 21 assertions. |
| `UV_CACHE_DIR=/tmp/methane-response-uv-cache bun run test:data` | **58 lulus.** |
| `UV_CACHE_DIR=/tmp/methane-response-uv-cache uv run python evaluate_baseline.py --output /tmp/methaneresponse-baseline-evaluation-2026-10-13.json` | Passed; report was written to `/tmp`, not used to replace the repository evaluation artifact. |
| `bun run test:contracts` | 4 passed, 0 failed. |
| `bun run build:web` | Passed. Zod dependency annotation notices and the `MapPanel` chunk (1,121.25 kB raw / 306.50 kB gzip) exceeded the 500 kB pre-gzip threshold. |
| `git diff --check` | Passed for tracked changes; the new report also passed a Python trailing-whitespace check. |

Execution note: `bash scripts/check-local.sh` completed successfully for frozen install, typecheck, default suite, build, Python, baseline evaluation, and Foundry. Afterwards, the UI loading state was retested with `bun run check` and the current web suite. The default API run without `TEST_DATABASE_URL` produced 85 passes and skipped 9 PostGIS scenarios; a separate run against temporary PostGIS completed 92 tests with no failures or skips. The database used tmpfs and `listen_addresses=127.0.0.1`; the container was automatically removed and left no listener. Baseline evaluation regenerated tracked artifacts; a separate run to `/tmp` produced the same JSON values. The change adds conservative abstention for MARS notification metadata.

## Baseline evaluation and interpretation limits

The deterministic evaluation contains 15 examples: 9 real casebook examples and 6 `DEMO` fixtures. After the semantic update, three real `operator_notified` examples sourced from MARS flags are now classified as `insufficient_evidence` without citations because the flags do not establish the notification recipient and time. The real subset has 3 `supported`, 6 `insufficient_evidence`, and 0 `contradicted`; real macro-F1 is 0.6667. The combined score of 1.00 includes synthetic fixtures. There were 0 false mitigation confirmations in this small sample; this is not AI accuracy or a generalization estimate.

## Runtime and visual checks

- `/api/health`: `status=ok`, casebook ready, storage `backend=file`, `persistent=true`; this is local file storage, not cloud PostgreSQL.
- `/api/intelligence/status`: document model, reviewer, and chain are all inactive; mode is `deterministic-baseline-only`.
- API and UI use snapshot `unep-mars-e0721015e925`; forecast is `not_available` because observation-opportunity labels and independent validation are insufficient.
- Chromium reported 0 JavaScript/page errors on the map. The test renderer emitted WebGL/GPU readback warnings; FPS on a physical phone was not measured.
- In the Evidence Auditor, a 2.2-second Esri tile delay made `Loading satellite location imagery…` visible; after the center tile decoded, the status disappeared and the selected geometry became `VERIFIED`. Screenshot after all three tiles loaded: `/tmp/methane-evidence-auditor-final-loaded.png`; mobile evidence: `/tmp/methane-evidence-auditor-mobile.png`.
- Screenshots came from actual application pages. Files were not added to the repository because the basemap includes third-party imagery.

Visual artifacts from this session:

- Desktop map: `/tmp/methaneresponse-workflow-map-desktop-2026-10-13.png` (temporary capture, not included in the repository).
- Mobile map viewport: `/tmp/methaneresponse-workflow-map-mobile-2026-10-13.png` (temporary capture, not included in the repository).
- Mobile globe canvas: `/tmp/methaneresponse-globe-mobile-2026-10-13.png` (temporary capture, not included in the repository).
- Verifier after bundle matched: `/tmp/methaneresponse-verifier-valid-2026-10-13.png` (temporary capture, not included in the repository).
- Desktop Evidence Auditor: `/tmp/methane-evidence-auditor-final-loaded.png` (temporary capture, not included in the repository).
- Mobile Evidence Auditor: `/tmp/methane-evidence-auditor-mobile.png` (temporary capture, not included in the repository).

## Unproven items and next priorities

1. Test a real AI provider using an authorized corpus, source-independent split, and adequate benchmark; measure false mitigation confirmation, citations, abstention, and baseline on the same claims.
2. Test the project's cloud Postgres through migrations and application restart; the PostGIS tests above prove only local behavior with a temporary container.
3. Test a Sepolia receipt with a configured, authorized contract/RPC/signer; an independent verifier must check the transaction event/hash.
4. Measure map usability and performance on a physical mobile device; a Chromium viewport is not a substitute for a real device.
5. Split the large `MapPanel` chunk, then repeat build and measurement under comparable conditions. This route is already lazy-loaded; the build still reports 1,121.25 kB (306.50 kB gzip).
6. Run a measured pilot with researchers/auditors to measure task time, errors, investigation decisions, and transparency benefit. There is no evidence that this product has caused mitigation or emissions reduction.

## Addendum — Auditor imagery and source-to-verifier workflow

### Implemented and checked

- The Evidence Auditor no longer uses generative plume/source images as substitute evidence. For real MARS sources with coordinates, the app requests three adjacent Esri tiles from the same imagery template used by MapLibre, marks the source coordinates, and notes that imagery is location context whose capture date may differ from the MARS observation. An accessible loading status remains visible until the center tile in the active mosaic is decoded. If a tile fails, the panel retries the full mosaic at zoom 13, then 10, then 7; after all four zoom levels fail, it shows an unavailable status and a globe link. No per-case image file is downloaded or stored in the repository. Synthetic fixtures do not receive a real basemap.
- Deterministic tests generated four mosaic options (zoom 16/13/10/7) for all **4,211** coordinate-bearing sources in the local snapshot; this proves URL-generation coverage and fallback behavior, not live imagery availability at every location. Chromium loaded three 256×256 tiles for samples `SEN_S_001` (Africa), `ARG_S_001` (South America), and `KAZ_S_159` (Central Asia). For Argentina, the panel showed 38.47007° S, 69.04720° W and one linked historical record; Kazakhstan showed three historical records. The original plume imagery remains linked to the official MARS map.
- **Evidence Auditor imagery/shape, 13 October:** case `KAZ_S_159` loaded three Esri tiles as location context, then verified and displayed official MARS geometry for plume `941806b5-2afe-46ac-baac-a0230880cede` (2026-07-11T08:12:14; 496 kg/h; standard deviation 226 kg/h). The selected record was matched to snapshot ID, archive hash, source ID, date, coordinates, flux, and uncertainty. Chromium showed `VERIFIED`; at a 390 px viewport the document stayed 390 px wide and the console had no errors. Regression tests checked 66 shards and confirmed publisher geometry for all **23,785/23,785** linked observations across **4,211** sources. This official shape is static and historical, not raw satellite pixels or continuous concentration. Location imagery remains the contextual path when a record has no polygon.
- Browser workflow: select `SEN_S_001` → `Examine evidence` → `Run evidence audit`. The “source detected” claim returns one dated MARS-record citation. The “emissions mitigated” claim returns `insufficient_evidence` because no mitigation document is linked. From the Auditor button, the map switches to `sourceId=SEN_S_001`; the panel and marker show the same source coordinates.
- The local report was saved as revision 1. Verification Center showed a valid local SHA-256, `Not anchored`, and “no on-chain verification”; no receipt or physical repair was claimed.
- At 390 px wide the imagery panel measured 366×122 px, and at 320 px it measured 296×99 px. Document width matched the viewport; all three tiles and both research links remained loaded. Temporary screenshots not included in the repository: desktop panel `/tmp/methane-evidence-final.png`, 320 px panel `/tmp/methane-evidence-panel-mobile-final.png`, globe `/tmp/methane-map-focus.png`, and Evidence Auditor `/tmp/methane-evidence-auditor-loaded.png`.
- Timeline keyboard QA: all 17 points use `role=button` and `tabIndex=0`; pressing Enter on the first point selects the 5 March 2023 record with unreported flux and updates selected details without turning it into zero.

### Gates rerun

| Check | Result on this checkout |
|---|---|
| `bun install --frozen-lockfile` | Passed; 138 installs checked, no lockfile/dependency changes. |
| `bun run check` | Passed; API and web typecheck. |
| `bun run test:web` | **138 passed, 0 failed, 67,356 assertions.** |
| `bun run test:api` with temporary PostGIS | **92 passed, 0 failed, 532 assertions, 0 skipped.** This is not a cloud database. |
| `bun run test:verifier` | 3 passed, 0 failed, 21 assertions. |
| `UV_CACHE_DIR=/tmp/methane-uv-cache bun run test:data` | 58 passed. Cache was directed to `/tmp` because the default account cache location is read-only. |
| `evaluate_baseline.py` | Report written to a temporary directory, not a repository artifact: 15 examples (9 real casebook, 6 `DEMO`), combined macro-F1 1.00, real subset macro-F1 0.6667, zero `contradicted` support in the real subset, and 0 false mitigation confirmations in this small sample. This is not an AI evaluation result or generalization estimate. |
| `bun run test:contracts` | 4 passed, 0 failed. |
| `bun run build:web` | Passed. `MapPanel` remains lazy-loaded, but the map chunk at 1,121.25 kB (306.50 kB gzip) triggers Rollup's warning for exceeding 500 kB before gzip; Zod dependencies also emit two non-blocking annotation warnings. |

## Addendum — Imagery fallback and source-marker focus

- Regressions were written first for four imagery zoom levels (16/13/10/7), keeping the source point centered, stale tile failures, and imagery loading status. At the initial fallback checkpoint, 121 web tests passed; the current suite has 138 tests / 67,356 assertions.
- At `ARG_S_001`, three Esri zoom-16 tiles loaded. With a simulated 503 response for zoom 16, the browser switched to zoom 13 and loaded three 256×256 fallback tiles. When all Esri requests were blocked at `KAZ_S_159`, an unavailable message that referenced the still-available case data appeared; the three-record timeline, case selector, and globe button continued to work. After removing the mock, zoom 16 recovered. Errors in the outage-run log came from intentionally injected 503 responses.
- Map centering now starts at zoom 11—above source `clusterMaxZoom` 9—so the selected source marker is not stuck in a cluster. The browser opened case `ARG_S_001` from Auditor to Map Explorer; ID and coordinates 38.47007° S, 69.04720° W remained the same. Browser captures at 3 km scale were saved temporarily to `/tmp/methane-argentina-source-focus-desktop.png` and `/tmp/methane-argentina-source-focus-mobile.png`; these files are not in the repository.
- At a 390 px viewport, document width was 390 px and the imagery panel 366×122 px; all three tiles loaded without horizontal overflow. Temporary capture: `/tmp/methane-evidence-panel-mobile-fallback-final.png` (not included in the repository). Fresh Chromium reported 0 JavaScript errors and 10 MapLibre/WebGL warnings; this is not an FPS measurement or physical-phone test.
- The full API suite with nine PostGIS tests ran against a volume-free container: 92 passed, 532 assertions, 0 skipped. The container was removed after testing. The current build still passes, with `MapPanel` at 1,121.25 kB (306.50 kB gzip) and two Zod annotation warnings.

### Visible runtime limits

- QA backend `/api/health` was healthy and the casebook ready with an isolated file store in `/tmp`; AI provider, reviewer authentication, RPC, registry, and signer were not configured. No AI call or chain transaction occurred.
- Browser checks confirmed live imagery tiles at three sample sources in Africa, South America, and Central Asia. This does not validate all locations: providers may have different coverage at each coordinate; fallback is available and preserves access to the MARS timeline. These tiles are not MARS plume products.
- A manual probe to `/api/sources/SEN_S_001` returned 404 because this detail route serves only the curated casebook; the full-snapshot workflow uses hash-bound browser data and intelligence/audit endpoints that support that ID. The 404 came from the probe, not a user action in the inspected workflow.
- MapLibre ran at tier `AUTO · low` in test Chromium and emitted GPU readback-driver warnings. No FPS was measured, and a browser viewport is not a physical-phone test.
- A direct check of the public MARS map through QA Chromium returned HTTP 403/a challenge page. Because the local snapshot has only product IDs `tile`/`tile_background`, I did not infer or use an undocumented image endpoint. The MARS dictionary defines these values as product IDs; the UNEP FAQ says visual data is available on the public platform after 30 days, while the secured INSIGHTS portal provides plume imagery to authorized government users.
- Research supporting the design, claim limits, and rubric is in `docs/research/`, `docs/product/data-and-claims.md`, `docs/architecture/mars-publisher-geometry.md`, and the judge evidence matrix. There has been no user study, live AI provider, impact pilot, cloud deployment, or Sepolia transaction. This local testing does not support claims of an 18/20 competition score or 100% industry readiness.

## Addendum — private response caching

AI assessment, human review, anchoring, and reconciliation endpoints now set `Cache-Control: no-store` and `Vary: Authorization`, including authentication-failure or conflict responses. This complements protection for private history/detail/verifier because workflow responses can contain quotations or private audit context. Regressions check successful/unauthorized assessment, review, and anchor rejection. After this change, the default API suite had **85 passes, 9 skipped PostGIS tests, 0 failures, 508 assertions**; API/web typecheck and `git diff --check` passed. The last 92-test PostGIS integration run occurred before this header change, so it was not rerun at the latest checkpoint.

### Addendum — lazy route loading and full bundle gate

The dashboard loads eight workspaces as separate chunks; the new-case dialog loads when opened. Production browser checks showed 0 additional workspace chunks on a cold map load, App transfer of 57,148 B, and canvas readiness of 2,078 ms desktop / 1,992 ms at a 390×844 viewport. There were no page errors or horizontal overflow. This was one cold run per viewport size with software WebGL; four long tasks remained visible, maximum 263 ms desktop / 248 ms mobile.

After adding the bundle-budget gate to `scripts/check-local.sh`, the full script ran and passed: frozen install, typechecks, API/web/verifier, production build, bundle budget, Python, baseline evaluation, and Foundry. The build reported App at 56,831 B gzip, eight route chunks, and MapPanel at 1,121,285 B raw / 306,520 B gzip. Default API: 85 passed / 9 PostGIS tests skipped / 508 assertions; web: 138 passed / 164,210 assertions; verifier: 3 passed / 21 assertions. PostGIS tests still require `TEST_DATABASE_URL`; AI, cloud, and Sepolia services were not enabled.
