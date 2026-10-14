# UNEP MARS publisher geometry layer

**Snapshot:** `unep-mars-675417694883`

**CSV archive SHA-256:** `675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43`

**GeoJSON archive SHA-256:** `42315a8803a51e0daf880b95f0723c6d54ec0fd7c1f4600c0ca5e07838f7c26c`
**Tracked monthly index SHA-256:** `1316e00636ccf2f6915e0987ec4f592292e2d7a83a4beb21920dd0e62470e13d`

## What is included

The browser assets in `apps/web/public/data/mars-plume-geometries/` are derived from UNEP's official MARS GeoJSON ZIP retrieved on 2026-10-14T06:10:12Z. The upstream object was 55,446,778 bytes and reported `Last-Modified: 2026-10-14T03:04:38Z` (ETag `0x8DF299FE29EBB2C`; Content-MD5 `R/3XbiPLmcy32d7fGmOfsA==`). Its SHA-256 and content length were checked before the archive was parsed. The archive includes the dataset-specific CC BY-NC-SA 4.0 license notice.

The offline builder joined the publisher's GeoJSON to the pinned CSV snapshot by `id_plume` and checked every ID, source ID, timestamp, coordinate, reported flux, and reported uncertainty. All 30,414 plume IDs matched exactly. The archive contains 29,207 publisher MultiPolygon geometries and 1,207 rows with `geometry: null`; all 23,861 source-linked records have a publisher geometry. None of the missing shapes is filled in or inferred. Coordinates are WGS84 and preserve the publisher record location. Data spans October 2020 through September 2026 in 66 calendar-month partitions based on the publisher timestamp.

Only the selected month is fetched when the map's **MARS plume geometry** layer is active and the rendering tier is Medium or High. The Evidence Auditor also loads the selected record's shared month shard on demand; it does not fetch or store one image per source/case. The 66 compressed geometry shards total 9,824,779 bytes; the latest September 2026 shard is 119,701 bytes and the largest month shard is 456,145 bytes. The manifest itself is pinned by SHA-256. Each shard has both a compressed SHA-256 and an uncompressed JSON SHA-256. The browser checks whichever representation the static host returns: some hosts expose gzip bytes, while others mark `.gz` as HTTP `Content-Encoding: gzip` and Fetch transparently returns the decoded JSON. Auto/Eco low-power map rendering does not fetch global polygon layers; the already loaded snapshot can still show colored monthly observation points. If the dataset ID, source archive hash, selected observation metadata, or representation hash does not match, polygons are withheld. An explicit retry is available for network or integrity errors.

## Case imagery coverage

All 4,218 real source records in this pinned snapshot have valid WGS84 coordinates. The case dialog derives a location-context view from the same Esri World Imagery service used by the map, centered on the selected source. It requests a small three-tile mosaic at zoom 16 and falls back through zoom 13, 10, and 7 if tile requests fail. These are shared remote map tiles; the application does not store or download one image per case. The image appears when a case is opened, shows an accessible loading status until its center tile decodes, and marks the source coordinate. The same coordinate opens in the interactive MapLibre globe, initially focused at zoom 11 so the UI retains regional context while staying above source-marker clustering. The browser regression test walks all 4,218 source coordinates and verifies the four-level tile fallback can be derived for each one. A production-preview run for `SEN_S_001` verified the three 256×256 zoom-16 tiles loaded, the coordinate label matched the case row, and the map opened at `14.805°, -17.311° · z11.0` on desktop and 390 px mobile.

The contextual imagery is geographic background only: its acquisition dates vary and it is not the satellite product image from the MARS overpass. For source-linked observations, the Auditor separately loads the corresponding UNEP publisher geometry from its dated monthly shard; all 23,861 linked plume records in this snapshot have matching official geometry. If a publisher record has no shape, or if external imagery cannot be reached, the UI says so and retains the observation metadata instead of fabricating an image or plume boundary. The source point and available official geometry are distinct visual layers and are labeled accordingly. A browser inspection also found dark, jagged coastal mosaic patches already present inside an HTTP-200 Esri JPEG tile; these are provider imagery content, not plume geometry or map-marker placement. The basemap offers grayscale, street, and dark alternatives, but Esri tile availability, capture date, resolution, mosaic seams, and terms remain external-provider constraints.

The **Cases → View → Evidence** dialog uses the same shared Esri location tiles and verified geometry loader as the Auditor. It defaults to the most recent valid timestamp, offers a deterministic latest-first selector for older overpasses, and requests only the selected observation's month shard. The checked archive index and geometry shard must match the source snapshot ID, source CSV archive SHA-256, source ID, plume ID, timestamp, coordinates, flux, and uncertainty. The all-source regression additionally confirms that each of the 4,218 snapshot sources has geometry for its latest valid linked observation. Loading, unavailable history, snapshot mismatch, synthetic demo, and a genuinely missing publisher polygon are shown as distinct states; the UI does not draw an inferred fallback. Documents and external references remain a separate list because a plume outline is detection provenance, not mitigation evidence.

At zoom levels below 4, medium/high tiers blend selected-month observation locations into a flux-weighted historical density overlay; low-power Eco uses clustered and individual points instead. At closer zooms, records with publisher polygons draw those geometries colored by their associated per-record flux in kg/h: `<100`, `100–499`, `500–1,999`, `2,000–4,999`, and `≥5,000`. Rows with no visible polygon remain individually outlined points colored by their own flux. Missing flux is neutral; zero is retained as a real reported zero and is not converted to missing or positive emissions.

The time slider chooses a single month for this layer. Playback is disabled for geometry so that scrubbing does not trigger automatic downloads of every month. The map keeps `LIVE FEED OFF` visible: this is a historical archive, not a live methane feed. NASA cloud context remains an optional, date-selected visualization layer and is not live weather.

## Scientific limitations

The MARS dictionary describes a plume record as an observation from a satellite overpass and documents its date, coordinates, flux, and uncertainty. It does not define the published GeoJSON geometry as a continuous concentration surface or as a verified physical plume boundary. The map therefore calls these **publisher-supplied geometries**. Polygon color is the associated record's reported flux; the global blend is flux-weighted observation density. Neither is an atmospheric concentration value. Map styling, outline, opacity, and blending are cartographic choices. These geometries do not independently confirm notification, repair, or mitigation.

In the Evidence Auditor the selected outline is from that exact source-linked plume ID after the selected monthly shard passes integrity checks. Esri World Imagery remains a separate, date-variable location backdrop. It is not presented as raw pixels from the selected satellite product; the observation's satellite/product IDs, timestamp, reported flux, and standard deviation remain visible alongside the publisher shape.

The GeoJSON archive is available from UNEP's [MARS dataset catalog](https://methanedata.unep.org/download-dataset); definitions are in the [MARS data dictionary](https://methanedata.unep.org/dict-mars-plumes). Keep attribution and CC BY-NC-SA 4.0 terms with redistributed adaptations. Do not bundle third-party evidence reports without verifying their separate rights.

## Rebuild the browser shards

Download the official GeoJSON archive into the ignored `data/raw/` directory, then run from the repository root:

```bash
uv run --project services/data-pipeline python services/data-pipeline/build_plume_geometries.py \
  --geojson-archive data/raw/unep_mars_sources_plumes_geojson_2026-10-14.zip \
  --source-snapshot apps/web/public/data/mars-snapshot.json.gz \
  --output-dir /tmp/mars-plume-geometries-2026-10-14 \
  --retrieved-at 2026-10-14T06:10:12Z \
  --upstream-last-modified-at 2026-10-14T03:04:38Z
```

The builder is standard-library Python. It refuses to overwrite an output directory pinned to a different source or geometry archive; generate to a fresh staging directory and promote only after the snapshot and geometry tests pass. Tests are in `services/data-pipeline/tests/test_build_plume_geometries.py`; browser-loader and geometry semantics tests are in `apps/web/src/plume-geometries.test.ts`.
