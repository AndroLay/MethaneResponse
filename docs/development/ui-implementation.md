# Dashboard implementation

**Updated:** 2026-10-13 · See the root [README](../../README.md) for current run commands.

## Routes and data states

- `/` is the product landing page; `/dashboard` is the review workspace.
- The map and source explorer load the active full UNEP MARS snapshot `unep-mars-675417694883` (4,218 source rows, 30,414 plume rows; 6,553 remain unresolved without a source ID, through 2026-09-13 UTC). The baseline auditor accepts any source from the server-pinned snapshot; for non-curated sources it cites at most one latest linked plume record for a detection claim. Notification and mitigation claims still abstain without attributable evidence. The active casebook and full map snapshot remain separate.
- **Synthetic demo** is a separate mode with two fictitious sources and clearly marked fixtures. It is useful for testing positive and contradiction rule paths.
- **Import full MARS GeoJSON** loads a user-provided historical map snapshot in the browser. The file is not uploaded. Baseline and document assessments remain limited to sources independently found in the server-pinned snapshot or curated casebook; mismatched imported IDs receive a clear API error.
- The dashboard never presents imported or pinned snapshot data as live monitoring. Missing later plume records are not presented as proof of zero methane.

## Review journey

The reviewer can select a source, filter by region/sector/observation age, inspect plume dates and flux/uncertainty values, open official external links, run the deterministic API baseline, and inspect exact citations and limitations. A separately configured server-side model path accepts authorized excerpts, validates quotations against the submitted text, and requires an authenticated human decision before publication or anchoring. Provider execution and independent model accuracy have not been verified; a model response is not proof of physical mitigation. JSON export and local bundle digest verification remain available.

The Evidence Auditor loads three adjacent Esri World Imagery tiles from the same tile template used by MapLibre, centered on the selected source coordinates; no per-case image files are stored or downloaded into the repository. It links to the existing interactive globe for higher-detail inspection. The basemap is explicitly labeled as location context: its capture date can differ from the MARS detection and it is not the plume image. The source-specific timeline uses the selected UNEP MARS snapshot rows, preserves reported uncertainty, and separates records without a flux value from zero-flux observations. The local public snapshot contains product IDs and observation metadata rather than plume-image files; the official MARS map is linked for original plume imagery. The provenance panel also links the UNEP MARS data dictionary so reviewers can inspect field definitions, units, notification/feedback semantics and coordinate limitations. These methodology links are not counted as case evidence. Synthetic fixtures never receive a real imagery backdrop.

The deterministic tile-view test covers every coordinate-bearing source in its pinned browser snapshot without creating case-specific image assets. Browser QA confirmed three 256×256 tiles for `SEN_S_001`; this samples provider availability rather than checking network coverage for every global coordinate. At 390 px and 320 px viewports, the image panel follows the available width without horizontal overflow. See [`workflow-verification-2026-10-13.md`](../history/workflow-verification-2026-10-13.md) for dated browser evidence; that report's 4,211-source counts refer to the earlier `unep-mars-e0721015e925` release.

The blockchain panel only reports a receipt returned from an anchored API record. The public dashboard cannot submit chain transactions. A configured API verifier checks exact receipt metadata and the corresponding registry event; the UI text limits the result to hash integrity and version chronology.

## Map and visual states

`MapPanel.tsx` is code-split from the dashboard shell and renders a MapLibre map with OpenFreeMap dark/street styles or Esri satellite imagery. Source density, historical reported-flux overlay, heuristic investigation-priority coloring, dated NASA context, and selected-month MARS publisher geometry are distinct layers with separate legends. See [`MARS_PUBLISHER_GEOMETRY.md`](../architecture/mars-publisher-geometry.md) for dataset identity, integrity checks, attribution, completeness and geometry limitations. Map attribution remains visible.

- Satellite grayscale uses a 0–100% saturation slider; it affects the raster imagery only and preserves teal/orange source-marker colors.
- Flat/globe switches Mercator and globe projection. Optional Mapterhorn DEM terrain loads only near the selected region and falls back to a flat surface on failure. Terrain, solar shading and dated NASA overlays are visual context, not methane evidence or live weather.
- Auto/Eco/Balanced/Quality adapt pixel ratio, terrain and geometry requests. At low power, MARS polygons and global blended heat are skipped; observation records remain inspectable as points.
- The map continues to show `LIVE FEED OFF`. MARS observations and priority/anomaly calculations use versioned historical data; no calibrated future leak forecast is currently available.
- The dashboard probes WebGL before initializing MapLibre. Software WebGL uses the low-power tier and can still render the globe; environments without WebGL and actual context/shader failures fall back while source, evidence, and auditor panels remain usable.
- The Evidence Auditor no longer uses generated plume/source artwork. It uses the same source-linked Esri World Imagery tiles as the globe and labels them as location context, not MARS plume evidence. The selected case requests only a small three-tile mosaic; it does not store or download a separate image for every source. If detailed tiles fail, the panel retries progressively broader zooms (16, 13, 10, 7) before showing an unavailable state. Coverage still depends on Esri tile availability and browser network access; fallback zoom generation does not prove live imagery coverage at every coordinate.
- Auditor-to-map focus preserves the selected source ID and coordinates and starts at zoom 11, above the source marker cluster threshold of zoom 9, so nearby source markers become individually inspectable. A higher existing zoom is preserved when focusing another source.
- On 2026-10-12 the map was visually checked in headed Chromium on AMD Radeon 680M hardware WebGL: natural-color Esri satellite, a centered globe overview, fullscreen sizing, and 50%/100% grayscale rendered. At a 1280×800 viewport, the 1219×679 fullscreen map rendered the sphere at zoom 1.7 and filled most of the map height. The map browser had zero console errors; repeated non-fatal MapLibre buffer-readback performance warnings appeared during redraws. The globe is a satellite-textured sphere, not elevated terrain or photogrammetric buildings.

The source image rights are not documented in the supplied UI package; the images are excluded from the project-code license in [`NOTICE`](../../NOTICE). Confirm permission or replace them before public redistribution.

## Local run

Install once with `bun install --frozen-lockfile`, copy `.env.example` to `apps/api/.env` only if that file does not already exist, then run `bun run dev:api` and `bun run dev:web` in separate terminals. The Vite dev server proxies `/api` to the API. Third-party basemap tiles require browser network access.

## Automated checks

- `bun run test:web` covers GeoJSON import grouping and validation plus map render helper behavior.
- `bun run test:api` covers real casebook routes, evidence mapping/abstention, API failures and audit persistence contracts.
- `bun run test:verifier` covers valid and modified exported bundles.
- `bun run check:all` is the complete local suite, including Python pipeline/evaluation, Foundry and production web build.

Earlier local Chromium acceptance passed for the real casebook view, source switching, demo separation, detection citation, mitigation `insufficient_evidence`, JSON export, regional filtering, API fallback and a narrow viewport. That browser evidence predates the selected-month publisher-geometry layer. On 2026-10-13, the pinned September 2026 geometry manifest and 326-feature shard passed the runtime loader test. A later browser run rendered the updated MARS source imagery/timeline and focused the same source on the MapLibre globe; those screenshots do not substitute for testing the publisher-geometry layer on physical mobile hardware. No FPS or hosted-browser claim is made.

To repeat the manual browser acceptance, start the API and web using the root README commands, open `http://localhost:5173/dashboard`, choose the Argentina source from Latest recorded observations, switch to Synthetic demo and back to UNEP cases, run `source_detected` then `mitigation_confirmed` in the auditor, export the JSON report, open Filters and select Kazakhstan, then narrow the browser to 390 px. In software WebGL, confirm the low-power globe is usable; with WebGL unavailable or a real context failure, confirm the case and auditor panels remain interactive after map fallback.

## Guided investigation and observation semantics (2026-10-15)

- Cases, Evidence Auditor, Reports and Blockchain share a visible four-stage navigation bar. Route changes retain the selected `sourceId`; statuses describe the current in-memory assessment and verifier result, not a durable workflow record.
- Evidence Auditor presents Overview, Observations, Document AI and Review stages. Only the selected stage is visible; hidden stages stay mounted so an authorized excerpt or review form is not cleared when moving between stages. Selecting a different source resets the stage to Overview.
- Historical flux is drawn as independent observation points with reported uncertainty. The chart does not connect dates: MARS rows are discrete satellite overpasses, and a line between them could suggest continuous measurements that are not available. Rows with no flux remain distinct from reported zero.
- Collapsed sidebar navigation exposes labels on pointer hover and keyboard focus. Auditor descriptions, statuses, chart labels and actions use larger text and visible focus treatment than the previous compact layout. At mobile widths, both progress navigators become 2×2 grids so all four stages remain visible without horizontal scrolling; the local 390 px browser check found no page-level overflow.
- AI remains optional and server-configured. The flow keeps the deterministic baseline available when no model provider is configured; screenshots or local browser tests do not establish model accuracy, reviewer identity, physical mitigation, or user impact. The progress bar is not persisted across reloads, and reports are still exported as JSON rather than PDF.
