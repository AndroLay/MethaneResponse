# MethaneResponse — interactive world map and genuine UNEP observation mode

## What this version actually does

- Replaces the static `atlas-demo.webp` dashboard map with **MapLibre GL JS**. Basemap tiles come from OpenFreeMap (Dark/Street) or Esri (Satellite). All underlying geographic features and pan/zoom gestures are handled by the map, not by moving a decorative image.
- Supports dragging, scroll/pinch zoom, clustered source markers, expanding clusters, choosing a source, fly-to navigation, and a fullscreen map.
- Offers natural-color satellite, adjustable grayscale satellite, street, and dark basemaps, plus flat/globe projection. Known software WebGL renderers are not offered globe mode; if a supported browser loses its context while drawing the globe, the dashboard restores a fresh flat map and reports the fallback.
- When a genuine UNEP dataset is loaded, renders its `source_name`, WGS84 `lat`/`lon`, `country`, `sector`, last observation time, reported feedback/notified metadata, and per-plume `ch4_fluxrate` in **kg/h**.
- Uses the imported observations to display a discrete point plot, *not a continuous real-time sensor series*.
- The visual heatmap is **source-density illustration**, not a geophysical methane concentration field or atmospheric plume polygon. Data source legend distinguishes actual observations from visual effects.
- When genuine data is used, the *audit claim* button is disabled until authentic independent operator/mitigation evidence and a real audit pipeline exist. Feedback status is never treated as repair confirmation.
- Keeps the existing landing page and demo workflow. `/` is the landing page; `/dashboard` is the interactive dashboard.

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

### Demo mode

When no UNEP data has been loaded, the dashboard explicitly says **Synthetic demo mode** and shows two invented fixtures on a real movable world map. This is not a live methane alert map. An interactive basemap is not itself observational data.

## Data interpretation and cautions

- UNEP MARS publishes updates periodically (typically monthly); the public export is **not a live feed**. The dashboard shows the last observation date it has, plus its import timestamp in the JSON snapshot.
- `feedback=Yes` means an operator/government responded at source level. It is **not evidence that a specific emission was physically mitigated**.
- `notified=Yes` means some plume at the source was notified, not necessarily every plume.
- One or more detections do not establish continuously flowing methane emissions between satellite passes; one non-detection does not prove successful mitigation.
- The point chart shows satellite detection estimates, including uncertainties where available, never hourly continuous emissions.
- The map's heat layer is illustrative density, not measured methane column or actual plume shape.
- The grayscale control changes only the underlying satellite raster; source markers retain their evidence colors. Globe view changes projection, not terrain elevation.
- `ch4_fluxrate` is a per-observation **kg/h** rate; do not infer tonnes reduced without appropriate temporal integration and counterfactual controls.
- Satellites and quantification methods have coverage, detection threshold, wind and uncertainty limitations; see UNEP methodology.
- The current UI does not include a trusted operator-document audit pipeline, signed case receipts for UNEP observations, or an automatic MARS ingestion scheduler. The legacy demo backend only audits synthetic fixtures.
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

## Testing results in packaging environment

- `python3 -m unittest discover -s services/data-pipeline -p 'test_import_mars_map.py' -v`: PASS (2 tests).
- TypeScript `transpileModule` syntax check: PASS for changed TSX and TS modules.
- Full Bun/Vite production build, actual browser/tile rendering, integration with live UNEP export and blockchain were **not** executed here. They require dependencies, tile network and official data access that were unavailable in the build environment. Do not claim those tests have passed.

For the later local integration run, the dependency check, API/web typechecks, Vite build, and browser map rendering results are recorded in [`UI_IMPLEMENTATION.md`](UI_IMPLEMENTATION.md). No MARS export was imported during that run; the displayed default source points remained synthetic.
