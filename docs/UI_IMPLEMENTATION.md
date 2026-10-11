# MethaneResponse — UI implementation (12 October 2026)

## Integrated experience

The React 19 + Vite + TypeScript interface now has two routes:

- `/` — product landing page with methodology and limitations.
- `/dashboard` — interactive evidence workspace.

The dashboard combines a responsive dark layout, source selection and filters, source details, observation timeline, evidence panel, deterministic audit baseline for demo fixtures, report export, and receipt verification UI. It does not call a hosted AI model. Its normal demo audit is backed by the existing API and synthetic fixtures only.

## Interactive map and data

`MapPanel.tsx` uses MapLibre GL JS with draggable/zoomable OpenFreeMap basemaps and an Esri satellite option. Source markers can be selected, clusters expanded, and the map opened full-screen. Basemap attribution is displayed by MapLibre. Density shading visualizes source locations only; it is not methane concentration or plume geometry.

With no local dataset, the dashboard visibly identifies **Synthetic demo mode** and uses two synthetic source fixtures. Users can import an extracted UNEP MARS GeoJSON file in the browser, or create a local snapshot from an official CSV, GeoJSON, or ZIP archive with `services/data-pipeline/import_mars_map.py`. Imported data shows historical source/plume observations and flux values, but is not a live feed. The import file is not included in the repository. See [`REAL_MAP_IMPLEMENTATION.md`](REAL_MAP_IMPLEMENTATION.md) for provenance, format, and license notes.

For imported real-source data, the independent mitigation audit action is disabled. Satellite observations and operator feedback do not establish that equipment was repaired or emissions stopped. The API's deterministic audit endpoint still accepts only the synthetic demo fixtures.

The landing page's Earth illustration is decorative artwork. It does not depict methane detections. Dashboard charts, evidence records, and summary metrics remain clearly labeled as illustrative while in demo mode.

## Map rendering controls

- The map opens on Esri World Imagery in natural color. OpenFreeMap street and dark basemaps remain available.
- **Satellite · grayscale** uses a 0–100% slider to adjust saturation on the satellite raster layer only. At 100%, the imagery is monochrome; methane source markers keep their teal/orange evidence colors.
- **Flat / Globe** switches MapLibre between Mercator and globe projection. Globe mode renders a spherical map view; it does not add elevation or 3D terrain.
- Globe is disabled when WebGL identifies a software renderer such as SwiftShader or llvmpipe, since the globe shader can exceed those renderers' graphics capacity. If an otherwise supported browser loses its WebGL context, the map is recreated in flat mode and a dismissible notice explains the fallback.
- Imagery clarity depends on the upstream tile coverage, zoom level, and network. Satellite tiles are not methane detections or live monitoring.

## Other interface behavior

- Evidence Auditor submits `POST /api/audits` for the deterministic fixture baseline and reports backend errors instead of inventing an API result.
- Blockchain UI shows “Not anchored” unless an actual receipt is returned. It does not submit a transaction from the public UI. Receipts establish bundle integrity and chronology, not physical mitigation.
- Audit report preview and JSON export include whether the data is synthetic or imported and state relevant limitations.
- Layouts support mobile widths, visible keyboard focus, and reduced-motion preferences.

## Run locally

Requires Bun >= 1.2.0. From the repository root:

```bash
bun install
cp .env.example apps/api/.env
# terminal 1
bun run dev:api
# terminal 2
bun run dev:web
```

Open `http://localhost:5173/` for the landing page or `http://localhost:5173/dashboard` for the app. The dashboard map needs access to its third-party tile services. The app shell and data labels can still load if those services are unavailable.

## Current integration verification

- `bun install --frozen-lockfile`: passed; checked 137 installs across 210 packages, no changes.
- `bun run check`: passed for API and web TypeScript typechecks.
- `bun run build:web`: passed. Vite emitted non-fatal Zod annotation notices and a bundle-size warning (main JS bundle is above 500 kB).
- `bun run test:web`: passed, 7 tests and 30 assertions across MARS import and map rendering checks.
- `bun run check`: passed for API and web TypeScript typechecks.
- `bun run build:web`: passed. Vite emitted non-fatal Zod annotation notices and a bundle-size warning (main JS bundle is about 1.48 MB, 418 kB gzipped).
- Local Chromium rendered natural-color satellite and full grayscale imagery with the source marker colors preserved. Keyboard slider input changed grayscale from 100% to 45% and back to 100%.
- Local Chromium reports SwiftShader as its WebGL renderer, so the globe control was disabled before activating its unsupported shader and the dashboard showed a dismissible explanation. Globe rendering on a hardware-accelerated browser was not verified in this environment.
- At a 390×844 mobile viewport, the map canvas measured 352 px wide and both document and body stayed at 390 px; no horizontal overflow was present. Mobile screenshot: `.playwright-cli/page-2026-10-11T20-01-55-853Z.png`.
- Several Esri tile requests returned `ERR_INSUFFICIENT_RESOURCES` in the local browser, but the natural-color and grayscale screenshots still showed clear imagery, labels, and source markers. Tile completeness depends on the browser and network environment.
- API health reported `mode: synthetic-demo`, `persistentStore: false`, and `chainConfigured: false` during the recorded browser session.
- No MARS snapshot was imported. Python importer, Foundry, live UNEP integration, blockchain, and end-to-end suites were outside this map-focused verification.

## Remaining work before submission

1. Obtain and preserve provenance/license information for a MARS export; import it and document the exact version/hash and retrieval time.
2. Connect real observation records and independently sourced documents to durable PostGIS/object storage with source-level provenance.
3. Build a human-reviewed claim benchmark; measure the deterministic baseline before considering a model-assisted path.
4. Add reproducible tests for import parsing, claim decisions, persistence, and tamper/authorization behavior.
5. Deploy and independently verify a testnet receipt flow; keep its claim limited to evidence-bundle integrity.
6. Validate deployment from a clean browser and document operating limits before public submission.
