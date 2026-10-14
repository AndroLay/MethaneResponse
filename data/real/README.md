# UNEP MARS versioned casebook and snapshot data

`mars_casebook_2026-10-14.json` is the active, traceable excerpt selected from the public UNEP IMEO Eye on Methane / MARS sources-and-plumes snapshot `unep-mars-675417694883`. It contains three source records and their explicitly linked plume records. It is intended to exercise evidence review, not to represent a complete or independently verified methane case file. The October 11 and October 13 casebooks and selection files remain available as historical inputs; the API now loads the October 14 casebook by default.

## Source and provenance

- Dataset catalog: [UNEP MARS data download](https://methanedata.unep.org/download-dataset)
- Data dictionary: [MARS methane plumes and sources](https://methanedata.unep.org/dict-mars-plumes)
- MARS overview and publication limitations: [UNEP MARS](https://methanedata.unep.org/methane-alert-response-system)
- Direct archive used: `https://unepazeconomyadlsstorage.blob.core.windows.net/public/unep_methanedata_detected_plumes_csv.zip`
- Active casebook archive retrieved: `2026-10-14T06:10:12Z`
- Active snapshot ID: `unep-mars-675417694883`
- Active archive SHA-256: `675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43`
- Active official archive `Last-Modified`: `2026-10-14T03:04:38Z`
- Active casebook SHA-256: `5010594d9de903ae38904e05e2a137c8701c4ded9fcc3ef433d322ec860dda94`
- Historical October 11 casebook archive SHA-256: `b4162c277bcb699154ccc068f5f9510e1d32f355093884de6c8029ea34a62742`
- Dataset license shown on the MARS download page and inside the archive: **CC BY-NC-SA 4.0**. This derived casebook is shared under the same data license. The general Eye on Methane terms page currently states CC BY-NC 4.0; this sample follows the more specific MARS dataset/archive license.
- Attribution: Contains data from the United Nations Environment Programme International Methane Emissions Observatory (UNEP IMEO), Eye on Methane / MARS. Changes: selected three source IDs and their linked plume rows, normalized the CSV values into JSON, and added case descriptions and explicit limitations.

## Selected cases

| Case | Source | Snapshot fields | Interpretation boundary |
|---|---|---|---|
| `MARS-REPORT-KAZ-S-159` | `KAZ_S_159`, Kazakhstan | 3 linked plume rows dated 2024-06-07, 2026-06-05, and 2026-07-11; source notification and feedback are `Yes`. | The linked [UNEP item](https://wedocs.unep.org/handle/20.500.11822/49949) is titled as a confirmed mitigation action. It is an official MARS record, not independent corroboration by this casebook. Item license: CC BY-NC-ND 3.0 IGO. |
| `MARS-REPORT-LBY-S-143` | `LBY_S_143`, Libya | 1 linked plume row dated 2025-12-23; source notification and feedback are `Yes`. | The linked [UNEP item](https://wedocs.unep.org/handle/20.500.11822/49430) is titled as a confirmed mitigation action. It is an official MARS record, not independent corroboration by this casebook. Item license: CC BY-NC-ND 3.0 IGO. |
| `MARS-REPORT-ARG-S-055` | `ARG_S_055`, Argentina | 2 linked plume rows dated 2023-01-29 and 2023-03-06; source notification and feedback are `Yes`. | The linked [UNEP item](https://wedocs.unep.org/handle/20.500.11822/44120) is titled as a confirmed mitigation action in Neuquén. The metadata page did not display an item-level license when reviewed on 2026-10-12, so rights status remains unverified. |

The MARS dictionary defines `source_name` as the source identifier and `id_plume` as the unique plume identifier. Feedback belongs to the source table; it is deliberately not copied onto individual plume rows. A plume observation or notification status is not proof of physical repair. Here the external UNEP items are linked as reports of confirmed mitigation; the underlying reports are not included or independently re-audited. A claim of `mitigation_confirmed` therefore remains unsupported by the MARS snapshot alone.

Each selection is pinned to one archive hash. Re-select and review cases when the upstream snapshot changes. The casebook contains link metadata only for the external reports, not their PDFs, excerpts, or extracted content. Two linked item pages state CC BY-NC-ND 3.0 IGO; the Argentina item page did not show an item-level license at review time. Verify the applicable rights before any reproduction, adaptation, or redistribution.

## Reproduction

To reproduce the active casebook, download the matching official archive to the ignored `data/raw/` directory, then run:

```bash
python services/data-pipeline/ingest_mars.py \
  --input data/raw/unep_mars_sources_plumes_2026-10-14.zip \
  --retrieved-at 2026-10-14T06:10:12Z \
  --output data/processed/mars_snapshot_2026-10-14.json \
  --manifest data/processed/mars_snapshot_2026-10-14.manifest.json

python services/data-pipeline/select_mars_cases.py \
  --snapshot data/processed/mars_snapshot_2026-10-14.json \
  --selection data/real/mars_case_selection_2026-10-14.json \
  --output data/real/mars_casebook_2026-10-14.json
```

Raw archives and full offline processed snapshots are excluded from Git. The selected casebook and a compact, attributed browser projection are bundled; the latter is described below.

## Full historical snapshot used by the dashboard

The dashboard bundles a compact, gzip-compressed browser projection of the latest locally verified MARS source and plume tables at `apps/web/public/data/mars-snapshot.json.gz`. The active release is derived from the official CSV archive retrieved at `2026-10-14T06:10:12Z`; the object reported `Last-Modified: 2026-10-14T03:04:38Z` and SHA-256 `675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43`. The browser bundle SHA-256 is `f27c21ab0932de3768a57029410c90677944e732f8be341e1d3abf4f36a91ae7` and decoded-content SHA-256 is `cb81f3fa991e00abb45f63b2e143251c3468556a41573d5fdc7f08db532eba70`.

This release contains **4,218 unique source rows and 30,414 unique plume rows**, with observation dates from **2020-10-29 through 2026-09-13**. Of the plume rows, 23,861 link to a source, 6,553 have no `source_name`, none with a non-empty source ID is orphaned, and 1,051 lack quantified flux. Unlinked rows remain unresolved rather than being assigned to a nearby source. Missing flux is shown as unavailable, never as zero. The source and plume IDs, WGS84 coordinates, observation timestamps, flux and uncertainty fields, satellite, notification/actionability values, institutions, tile metadata, and update/insert timestamps are retained in the normalized snapshot. The original downloaded CSV values and original archives remain in ignored local `data/processed/` and `data/raw/`; the compact browser projection preserves the fields required by the app.

The compact browser projection is derived data under the archive's CC BY-NC-SA 4.0 license. Attribution and the exact snapshot ID/hash travel with the bundle. `mars_snapshot_history.json` lists four archive releases actually downloaded and hashed by this project, including their cutoffs and provenance; it is not an inferred update schedule. October 11, 12, and 13 snapshots remain historical. The dashboard is historical and does not refresh itself from UNEP. See the [UNEP dataset catalog](https://methanedata.unep.org/download-dataset) and [MARS data dictionary](https://methanedata.unep.org/dict-mars-plumes) for source definitions and current upstream files.

To reproduce the active browser bundle after downloading the same source archive:

```bash
python services/data-pipeline/ingest_mars.py \
  --input data/raw/unep_mars_sources_plumes_2026-10-14.zip \
  --retrieved-at 2026-10-14T06:10:12Z \
  --output data/processed/mars_snapshot_2026-10-14.json \
  --manifest data/processed/mars_snapshot_2026-10-14.manifest.json

python services/data-pipeline/build_web_snapshot.py \
  --input data/processed/mars_snapshot_2026-10-14.json \
  --output /tmp/methane-response-mars-snapshot.json.gz \
  --manifest-output /tmp/methane-response-mars-snapshot-manifest.json \
  --progressive-output-dir /tmp/methane-response-mars-progressive

UV_CACHE_DIR=/tmp/methane-response-uv-cache uv run --project services/data-pipeline --locked --extra research \
  python services/data-pipeline/build_intelligence.py \
  --input /tmp/methane-response-mars-snapshot.json.gz \
  --output /tmp/methane-response-intelligence-snapshot.json \
  --recurrence-evaluation-output /tmp/methane-response-record-recurrence-evaluation.json
```

Promotion into active browser/API paths is performed only after manifest, geometry, and intelligence hashes agree and the snapshot regression suite passes. The 2026-10-14 release is bound in versioned history; earlier casebook files and their selection records are retained. The local raw archives and full normalized snapshot are ignored by Git, so a clean clone requires acquiring the archived source data again under the listed license before offline regeneration.

The browser map shows source locations by default and can switch to the historical plume locations. Each point is an observation record at its reported time; point-density styling is not a methane concentration surface or a plume footprint. A separate, opt-in layer displays the original UNEP publisher-supplied plume geometries by selected historical month; its exact source, hash, license, completeness, and scientific limits are documented in [`MARS_PUBLISHER_GEOMETRY.md`](../../docs/MARS_PUBLISHER_GEOMETRY.md). The dictionary does not define those polygons as a concentration field or verified physical boundary. Source-level `feedback` and notification metadata are not proof of operator notification or repair, and the MARS snapshot alone does not independently verify mitigation.
