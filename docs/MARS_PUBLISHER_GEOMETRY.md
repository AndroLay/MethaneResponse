# UNEP MARS publisher geometry layer

**Snapshot:** `unep-mars-e0721015e925`

**CSV archive SHA-256:** `e0721015e925c4d70012ca13e697f5638421bc7c2a42f7e3dce8edec6cee8481`

**GeoJSON archive SHA-256:** `7a40d97d784f662cb134b12668307c3280e07b8319a6289fa9026f275c191eef`
**Tracked monthly index SHA-256:** `81484a5461799b4e8e13b06fd808948b627131c2d027834293ae82677fbdc1be`

## What is included

The browser assets in `apps/web/public/data/mars-plume-geometries/` are derived from UNEP's official MARS GeoJSON ZIP retrieved on 2026-10-12. The upstream object was 55,274,880 bytes and reported `Last-Modified: 2026-10-12T03:01:29Z`. The archive includes the dataset-specific CC BY-NC-SA 4.0 license notice.

The offline builder joined the publisher's GeoJSON to the already pinned CSV snapshot by `id_plume` and checked every ID, source ID, timestamp, coordinate, reported flux, and reported uncertainty. All 30,319 plume IDs matched exactly. The archive contains 29,112 MultiPolygon geometries and 1,207 rows with `geometry: null`; none of the missing shapes is filled in or inferred. Coordinates are WGS84 and preserve the publisher record location. Data spans October 2020 through September 2026 in 66 calendar-month partitions based on the publisher timestamp.

Only the selected month is fetched when the map's **MARS plume geometry** layer is active and the rendering tier is Medium or High. The 66 compressed geometry shards total 9,793,139 bytes; the latest September 2026 shard is 93,768 bytes and the largest month shard is 455,431 bytes. The manifest itself is pinned by SHA-256. Each shard has both a compressed SHA-256 and an uncompressed JSON SHA-256. The browser checks whichever representation the static host returns: some hosts expose gzip bytes, while others mark `.gz` as HTTP `Content-Encoding: gzip` and Fetch transparently returns the decoded JSON. Auto/Eco low-power mode does not fetch polygon shards; the already loaded snapshot can still show colored monthly observation points. If the dataset ID, source archive hash, or representation hash does not match, polygons are withheld. An explicit retry is available for network or integrity errors.

At zoom levels below 4, medium/high tiers blend selected-month observation locations into a flux-weighted historical density overlay; low-power Eco uses clustered and individual points instead. At closer zooms, records with publisher polygons draw those geometries colored by their associated per-record flux in kg/h: `<100`, `100–499`, `500–1,999`, `2,000–4,999`, and `≥5,000`. Rows with no visible polygon remain individually outlined points colored by their own flux. Missing flux is neutral; zero is retained as a real reported zero and is not converted to missing or positive emissions.

The time slider chooses a single month for this layer. Playback is disabled for geometry so that scrubbing does not trigger automatic downloads of every month. The map keeps `LIVE FEED OFF` visible: this is a historical archive, not a live methane feed. NASA cloud context remains an optional, date-selected visualization layer and is not live weather.

## Scientific limitations

The MARS dictionary describes a plume record as an observation from a satellite overpass and documents its date, coordinates, flux, and uncertainty. It does not define the published GeoJSON geometry as a continuous concentration surface or as a verified physical plume boundary. The map therefore calls these **publisher-supplied geometries**. Polygon color is the associated record's reported flux; the global blend is flux-weighted observation density. Neither is an atmospheric concentration value. Map styling, outline, opacity, and blending are cartographic choices. These geometries do not independently confirm notification, repair, or mitigation.

The GeoJSON archive is available from UNEP's [MARS dataset catalog](https://methanedata.unep.org/download-dataset); definitions are in the [MARS data dictionary](https://methanedata.unep.org/dict-mars-plumes). Keep attribution and CC BY-NC-SA 4.0 terms with redistributed adaptations. Do not bundle third-party evidence reports without verifying their separate rights.

## Rebuild the browser shards

Download the official GeoJSON archive into the ignored `data/raw/` directory, then run from the repository root:

```bash
uv run --project services/data-pipeline python services/data-pipeline/build_plume_geometries.py \
  --geojson-archive data/raw/unep_mars_sources_plumes_geojson_2026-10-12.zip \
  --source-snapshot apps/web/public/data/mars-snapshot.json.gz \
  --output-dir apps/web/public/data/mars-plume-geometries \
  --retrieved-at 2026-10-12T10:20:45Z \
  --upstream-last-modified-at 2026-10-12T03:01:29Z
```

The builder is standard-library Python. It refuses to overwrite an output directory pinned to a different source or geometry archive. Tests are in `services/data-pipeline/tests/test_build_plume_geometries.py`; browser-loader and geometry semantics tests are in `apps/web/src/plume-geometries.test.ts`.
