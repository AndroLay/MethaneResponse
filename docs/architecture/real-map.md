# MethaneResponse — interactive world map and genuine UNEP observation mode

> **Current implementation note (2026-10-13):** This document originated with the supplied map UI package. The dashboard loads a hash-pinned full MARS observation snapshot for exploration and keeps document/audit review constrained to evidence-backed cases. For current acceptance and deployment status, use [`UI_IMPLEMENTATION.md`](../development/ui-implementation.md), [`delivery-notes.md`](../history/delivery-notes.md), and [`next-steps.md`](../history/next-steps.md).

## What this version actually does

- Replaces the static `atlas-demo.webp` dashboard map with **MapLibre GL JS**. Basemap tiles come from OpenFreeMap (Dark/Street) or Esri (Satellite). All underlying geographic features and pan/zoom gestures are handled by the map, not by moving a decorative image.
- Supports dragging, scroll/pinch zoom, clustered source markers, expanding clusters, choosing a source, fly-to navigation, and a fullscreen map.
- Defers MapLibre initialization until the map enters a 96 px viewport margin, keeping the map slot reserved while off-screen; browsers without `IntersectionObserver` mount it immediately. Once activated, the renderer stays available for the dashboard session. A 390×600 browser check confirmed no canvas before scrolling and one canvas after the map entered view.
- Offers natural-color satellite, adjustable grayscale satellite, street, and dark basemaps, plus flat/globe projection. Software WebGL uses a reduced rendering tier but may still use globe mode; if a browser lacks WebGL or loses its context while drawing the globe, the dashboard restores a fresh flat map and reports the fallback.
- When a genuine UNEP dataset is loaded, renders its `source_name`, WGS84 `lat`/`lon`, `country`, `sector`, last observation time, reported feedback/notified metadata, and per-plume `ch4_fluxrate` in **kg/h**.
- Uses the imported observations to display a discrete point plot, *not a continuous real-time sensor series*.
- The source-density heatmap is **source-location density**, not a geophysical methane concentration field. The historical flux overlay uses per-record values or low-power cell medians. Neither renders a continuous concentration field.
- The dashboard loads the pinned full MARS snapshot for exploration. The three-case casebook and authorized document excerpts remain the basis of the deterministic audit workflow; map metadata alone does not make a source a reviewed evidence case.
- A dedicated **MARS plume geometry · selected month** layer lazily loads publisher GeoJSON shapes for the selected historical month. Normal/Quality render tiers use flux-weighted historical observation color at global scale and the available polygons at close zoom; Eco uses clustered and individual flux-colored record points without fetching polygons. Each monthly shard is hash-checked and tied to the active MARS snapshot. See [`MARS_PUBLISHER_GEOMETRY.md`](mars-publisher-geometry.md) for source matching, attribution, missing-geometry counts and scientific limitations.
- **Globe overview** switches MapLibre to its globe projection and frames the active data. Optional Mapterhorn DEM terrain activates at nearby zoom levels, with a flat fallback. NASA GIBS date-pinned MODIS and AIRS context overlays are optional; they are not live weather or MARS case evidence. The globe does not provide photogrammetric buildings.
- The [God's Eye View repository](https://github.com/bilawalsidhu/gods-eye-view) documents Esri/OSM as its keyless map path and Cesium ion or Google Photorealistic 3D as optional enhanced imagery. MethaneResponse does not use either photogrammetry path. Cesium Community is currently limited to eligible personal, non-commercial use and has quotas; check [current Cesium plan terms](https://cesium.com/platform/cesium-ion/pricing/) before enabling it for a public competition demo.
- `/` is the landing page; `/dashboard` is the interactive dashboard.

## Load authentic UNEP source/plume data (two ways)

Official data: https://methanedata.unep.org/download-dataset

Official data dictionary: https://methanedata.unep.org/dict-mars-plumes

### Method 1: Python importer, handles official ZIP archives (recommended)

1. Download the **Sources and plumes (CSV)** or **GeoJSON** ZIP from UNEP.
2. Run this from the repository root:

```bash
python3 services/data-pipeline/import_mars_map.py ~/Downloads/unep_methanedata_detected_plumes_csv.zip
```

or for GeoJSON ZIP:

```bash
python3 services/data-pipeline/import_mars_map.py ~/Downloads/unep_methanedata_detected_plumes_geojson.zip
```

The script creates `apps/web/public/data/mars-snapshot.json`, which the dashboard automatically loads on startup. It uses Python's standard library, has zero additional dependencies, and does not fabricate records. Default map snapshot includes up to 8,000 most recently observed sources; use `--max-sources 20000` if appropriate for your device. The output is excluded from version control (see `.gitignore`), as it is a third-party dataset.

### Method 2: browser upload

Unzip the UNEP GeoJSON archive locally and open `/dashboard`. Click **Import UNEP GeoJSON**. The browser reads the source/plume FeatureCollection and groups observations by `source_name`.

Note: A compressed ZIP cannot be uploaded directly through the browser UI in this version; use the Python ZIP importer instead. Browser import is limited to 90 MB to avoid unreasonable memory use.

### Synthetic demo mode

The separate **Synthetic demo** mode shows two invented fixtures on the same movable world map. It is marked synthetic and is not a live methane alert map. An interactive basemap is not itself observational data.

## Data interpretation and cautions

- UNEP MARS publishes updates periodically (typically monthly); the public export is **not a live feed**. The dashboard shows the last observation date it has, plus its import timestamp in the JSON snapshot.
- `feedback=Yes` means an operator/government responded at source level. It is **not evidence that a specific emission was physically mitigated**.
- `notified=Yes` means some plume at the source was notified, not necessarily every plume.
- One or more detections do not establish continuously flowing methane emissions between satellite passes; one non-detection does not prove successful mitigation.
- The point chart shows satellite detection estimates, including uncertainties where available, never hourly continuous emissions.
- Source-location heat color counts source records, not methane concentration. The separate flux overlay uses historical, per-plume reported kg/h values; low-power rendering shows approximate 1° cell medians. Neither rendering is a continuous methane field or a measured plume boundary.
- The grayscale control changes only the underlying satellite raster; source markers retain their evidence colors. Globe view changes projection, not terrain elevation.
- `ch4_fluxrate` is a per-observation **kg/h** rate; do not infer tonnes reduced without appropriate temporal integration and counterfactual controls.
- Satellites and quantification methods have coverage, detection threshold, wind and uncertainty limitations; see UNEP methodology.
- The UI does not include an automatic MARS ingestion scheduler or signed receipts for UNEP source data. The deterministic baseline and optional server-side document excerpt assessment are separate from global-map exploration; AI output requires human review and does not establish physical mitigation. Live MARS monitoring is not available, and the interface keeps `LIVE FEED OFF` visible.
- To update, download a new official snapshot and rerun the importer. Automated refresh and provenance signatures require separate backend work.

## Licenses & attribution

UNEP International Methane Emissions Observatory — Eye on Methane / MARS, **CC BY-NC-SA 4.0**, changes: aggregation by source, browser visualization, and sampling of most recent sources. The data may not be used commercially under the cited license without suitable permissions. The downloaded UNEP ZIP and transformed JSON are not shipped with this code package; obtain them independently from the official source.

Basemap attribution is displayed by MapLibre controls: OpenFreeMap / OpenStreetMap and, when Satellite is selected, Esri imagery attribution. Do not remove these attributions.

## Run the project

```bash
bun install
bun run dev:api
# second terminal
bun run dev:web
```

- Landing: `http://localhost:5173/`
- Dashboard: `http://localhost:5173/dashboard`

The map uses third-party tile services, so internet access is needed for map imagery. UI and metadata load even when tiles cannot be fetched, but background map may remain blank. To self-host tiles, replace the MapLibre style URLs in `apps/web/src/MapPanel.tsx`.

## Historical packaging-environment checks

- The earlier supplied ZIP check covered `test_import_mars_map.py` and a TypeScript syntax-only check; it did not test current dashboard behavior.
- Current typecheck, web/API tests, production build, local PostGIS integration, and hardware-browser map results are recorded in [`delivery-notes.md`](../history/delivery-notes.md). Remote provider deployment and Sepolia transactions remain untested.

For the later local integration run, the dependency check, API/web typechecks, Vite build, and browser map rendering results are recorded in [`UI_IMPLEMENTATION.md`](../development/ui-implementation.md). No MARS export was imported during that run; the displayed default source points remained synthetic.
