# Dashboard implementation

**Updated:** 2026-10-13 · See the root [README](../README.md) for current run commands.

## Routes and data states

- `/` is the product landing page; `/dashboard` is the review workspace.
- The map and source explorer load the full pinned UNEP MARS snapshot (4,211 sources, 30,319 plume rows; 6,534 remain unresolved without a source ID). The audit workspace keeps baseline/document claims limited to the three curated cases. Other real map sources can receive hash-bound historical priority/anomaly analysis, but cannot be presented as fully audited evidence cases solely from map metadata.
- **Synthetic demo** is a separate mode with two fictitious sources and clearly marked fixtures. It is useful for testing positive and contradiction rule paths.
- **Import full MARS GeoJSON** loads a user-provided historical map snapshot in the browser. The file is not uploaded. It is not promoted to a reviewed API case, so the audit action remains disabled for sources outside the pinned casebook.
- The dashboard never presents imported or pinned snapshot data as live monitoring. Missing later plume records are not presented as proof of zero methane.

## Review journey

The reviewer can select a source, filter by region/sector/observation age, inspect plume dates and flux/uncertainty values, open official external links, run the deterministic API baseline, and inspect exact citations and limitations. A separately configured server-side model path accepts authorized excerpts, validates quotations against the submitted text, and requires an authenticated human decision before publication or anchoring. Provider execution and independent model accuracy have not been verified; a model response is not proof of physical mitigation. JSON export and local bundle digest verification remain available.

The blockchain panel only reports a receipt returned from an anchored API record. The public dashboard cannot submit chain transactions. A configured API verifier checks exact receipt metadata and the corresponding registry event; the UI text limits the result to hash integrity and version chronology.

## Map and visual states

`MapPanel.tsx` is code-split from the dashboard shell and renders a MapLibre map with OpenFreeMap dark/street styles or Esri satellite imagery. Source density, historical reported-flux overlay, heuristic investigation-priority coloring, dated NASA context, and selected-month MARS publisher geometry are distinct layers with separate legends. See [`MARS_PUBLISHER_GEOMETRY.md`](MARS_PUBLISHER_GEOMETRY.md) for dataset identity, integrity checks, attribution, completeness and geometry limitations. Map attribution remains visible.

- Satellite grayscale uses a 0–100% saturation slider; it affects the raster imagery only and preserves teal/orange source-marker colors.
- Flat/globe switches Mercator and globe projection. Optional Mapterhorn DEM terrain loads only near the selected region and falls back to a flat surface on failure. Terrain, solar shading and dated NASA overlays are visual context, not methane evidence or live weather.
- Auto/Eco/Balanced/Quality adapt pixel ratio, terrain and geometry requests. At low power, MARS polygons and global blended heat are skipped; observation records remain inspectable as points.
- The map continues to show `LIVE FEED OFF`. MARS observations and priority/anomaly calculations use versioned historical data; no calibrated future leak forecast is currently available.
- The dashboard probes WebGL before initializing MapLibre. Software WebGL uses the low-power tier and can still render the globe; environments without WebGL and actual context/shader failures fall back while source, evidence, and auditor panels remain usable.
- The source illustration and synthetic trend/gallery assets are labeled as artwork or illustrative data. Basemap tile completeness depends on provider coverage and browser network access.
- On 2026-10-12 the map was visually checked in headed Chromium on AMD Radeon 680M hardware WebGL: natural-color Esri satellite, a centered globe overview, fullscreen sizing, and 50%/100% grayscale rendered. At a 1280×800 viewport, the 1219×679 fullscreen map rendered the sphere at zoom 1.7 and filled most of the map height. The map browser had zero console errors; repeated non-fatal MapLibre buffer-readback performance warnings appeared during redraws. The globe is a satellite-textured sphere, not elevated terrain or photogrammetric buildings.

The source image rights are not documented in the supplied UI package; the images are excluded from the project-code license in [`NOTICE`](../NOTICE). Confirm permission or replace them before public redistribution.

## Local run

Install once with `bun install --frozen-lockfile`, copy `.env.example` to `apps/api/.env` only if that file does not already exist, then run `bun run dev:api` and `bun run dev:web` in separate terminals. The Vite dev server proxies `/api` to the API. Third-party basemap tiles require browser network access.

## Automated checks

- `bun run test:web` covers GeoJSON import grouping and validation plus map render helper behavior.
- `bun run test:api` covers real casebook routes, evidence mapping/abstention, API failures and audit persistence contracts.
- `bun run test:verifier` covers valid and modified exported bundles.
- `bun run check:all` is the complete local suite, including Python pipeline/evaluation, Foundry and production web build.

Earlier local Chromium acceptance passed for the real casebook view, source switching, demo separation, detection citation, mitigation `insufficient_evidence`, JSON export, regional filtering, API fallback and a narrow viewport. That browser evidence predates the selected-month publisher-geometry layer and is not a screenshot of that new layer. On 2026-10-13, the pinned September 2026 geometry manifest and 326-feature shard passed the runtime loader test; an attempted new dashboard browser run timed out and a fresh Chromium process exited `SIGTRAP`. Therefore new-layer visual acceptance and device performance remain unverified; no FPS or hosted browser claim is made.

To repeat the manual browser acceptance, start the API and web using the root README commands, open `http://localhost:5173/dashboard`, choose the Argentina source from Latest recorded observations, switch to Synthetic demo and back to UNEP cases, run `source_detected` then `mitigation_confirmed` in the auditor, export the JSON report, open Filters and select Kazakhstan, then narrow the browser to 390 px. In software WebGL, confirm the low-power globe is usable; with WebGL unavailable or a real context failure, confirm the case and auditor panels remain interactive after map fallback.
