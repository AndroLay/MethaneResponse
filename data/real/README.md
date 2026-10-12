# UNEP MARS casebook sample

`mars_casebook_2026-10-11.json` is a small, traceable excerpt selected from the public UNEP IMEO Eye on Methane / MARS sources-and-plumes snapshot. It contains three source records and their linked plume records. It is intended to exercise evidence review, not to represent a complete or independently verified methane case file.

## Source and provenance

- Dataset catalog: [UNEP MARS data download](https://methanedata.unep.org/download-dataset)
- Data dictionary: [MARS methane plumes and sources](https://methanedata.unep.org/dict-mars-plumes)
- MARS overview and publication limitations: [UNEP MARS](https://methanedata.unep.org/methane-alert-response-system)
- Direct archive used: `https://unepazeconomyadlsstorage.blob.core.windows.net/public/unep_methanedata_detected_plumes_csv.zip`
- Retrieved: `2026-10-11T16:29:31Z`
- Archive SHA-256: `b4162c277bcb699154ccc068f5f9510e1d32f355093884de6c8029ea34a62742`
- Dataset license shown on the MARS download page and inside the archive: **CC BY-NC-SA 4.0**. This derived casebook is shared under the same data license. The general Eye on Methane terms page currently states CC BY-NC 4.0; this sample follows the more specific MARS dataset/archive license.
- Attribution: Contains data from the United Nations Environment Programme International Methane Emissions Observatory (UNEP IMEO), Eye on Methane / MARS. Changes: selected three source IDs and their linked plume rows, normalized the CSV values into JSON, and added case descriptions and explicit limitations.

## Selected cases

| Case | Source | Snapshot fields | Interpretation boundary |
|---|---|---|---|
| `MARS-REPORT-KAZ-S-159` | `KAZ_S_159`, Kazakhstan | 3 linked plume rows dated 2024-06-07, 2026-06-05, and 2026-07-11; source notification and feedback are `Yes`. | The linked [UNEP item](https://wedocs.unep.org/handle/20.500.11822/49949) is titled as a confirmed mitigation action. It is an official MARS record, not independent corroboration by this casebook. Item license: CC BY-NC-ND 3.0 IGO. |
| `MARS-REPORT-LBY-S-143` | `LBY_S_143`, Libya | 1 linked plume row dated 2025-12-23; source notification and feedback are `Yes`. | The linked [UNEP item](https://wedocs.unep.org/handle/20.500.11822/49430) is titled as a confirmed mitigation action. It is an official MARS record, not independent corroboration by this casebook. Item license: CC BY-NC-ND 3.0 IGO. |
| `MARS-REPORT-ARG-S-055` | `ARG_S_055`, Argentina | 2 linked plume rows dated 2023-01-29 and 2023-03-06; source notification and feedback are `Yes`. | The linked [UNEP item](https://wedocs.unep.org/handle/20.500.11822/44120) is titled as a confirmed mitigation action in Neuquén. The metadata page did not display an item-level license when reviewed on 2026-10-12, so rights status remains unverified. |

The MARS dictionary defines `source_name` as the source identifier and `id_plume` as the unique plume identifier. Feedback belongs to the source table; it is deliberately not copied onto individual plume rows. A plume observation or notification status is not proof of physical repair. Here the external UNEP items are linked as reports of confirmed mitigation; the underlying reports are not included or independently re-audited. A claim of `mitigation_confirmed` therefore remains unsupported by the MARS snapshot alone.

The selection is pinned to one archive hash. Re-select and review cases when the upstream snapshot changes. The casebook contains link metadata only for the external reports, not their PDFs, excerpts, or extracted content. Two linked item pages state CC BY-NC-ND 3.0 IGO; the Argentina item page did not show an item-level license at review time. Verify the applicable rights before any reproduction, adaptation, or redistribution.

## Reproduction

Download the archive to the ignored `data/raw/` directory, then run:

```bash
python services/data-pipeline/ingest_mars.py \
  --input data/raw/unep_mars_sources_plumes_2026-10-11.zip \
  --retrieved-at 2026-10-11T16:29:31Z \
  --output data/processed/mars_snapshot.json \
  --manifest data/processed/mars_snapshot.manifest.json

python services/data-pipeline/select_mars_cases.py \
  --snapshot data/processed/mars_snapshot.json \
  --selection data/real/mars_case_selection.json \
  --output data/real/mars_casebook_2026-10-11.json
```

Raw archives and full offline processed snapshots are excluded from Git. The selected casebook and a compact, attributed browser projection are bundled; the latter is described below.

## Full historical snapshot used by the dashboard

The dashboard also bundles a compact, gzip-compressed browser projection of the latest MARS source and plume tables at `apps/web/public/data/mars-snapshot.json.gz`. It is derived from the official archive retrieved at `2026-10-12T10:20:45Z`; the archive object reported `Last-Modified: 2026-10-12T03:01:28Z` and SHA-256 `e0721015e925c4d70012ca13e697f5638421bc7c2a42f7e3dce8edec6cee8481`.

This release contains **4,211 source rows and 30,319 plume rows**, with observation dates from **2020-10-29 through 2026-09-11**. Of the plume rows, 23,785 link to a source and 6,534 have no `source_name`; unresolved rows stay unresolved rather than being assigned to a nearby source. Another 1,043 rows do not provide a quantified flux. Missing flux is shown as unavailable, never as zero. The source and plume IDs, WGS84 coordinates, observation dates, flux and uncertainty fields, satellite, notification/actionability values, institutions, tile metadata, and update/insert timestamps are retained in the normalized snapshot. The original downloaded CSV values are retained in the local processed snapshot and source archive; the browser projection avoids duplicating those raw strings.

The compact browser projection is derived data under the archive's CC BY-NC-SA 4.0 license. Attribution and the exact snapshot ID/hash travel with the bundle. The complete two-release record for this workspace is in `mars_snapshot_history.json`; those are the snapshots actually downloaded here, not an inferred update schedule. The dashboard is historical and does not refresh itself from UNEP. See the [UNEP dataset catalog](https://methanedata.unep.org/download-dataset) and [MARS data dictionary](https://methanedata.unep.org/dict-mars-plumes) for source definitions and current upstream files.

To reproduce the 2026-10-12 browser bundle after downloading the same source archive:

```bash
python services/data-pipeline/ingest_mars.py \
  --input data/raw/unep_mars_sources_plumes_2026-10-12.zip \
  --retrieved-at 2026-10-12T10:20:45Z \
  --output data/processed/mars_snapshot_2026-10-12.json \
  --manifest data/processed/mars_snapshot_2026-10-12.manifest.json

python services/data-pipeline/build_web_snapshot.py \
  --input data/processed/mars_snapshot_2026-10-12.json \
  --output apps/web/public/data/mars-snapshot.json.gz
```

The browser map shows source locations by default and can switch to the historical plume locations. Each point is an observation record at its reported time; point-density styling is not a methane concentration surface or a plume footprint. A separate, opt-in layer displays the original UNEP publisher-supplied plume geometries by selected historical month; its exact source, hash, license, completeness, and scientific limits are documented in [`MARS_PUBLISHER_GEOMETRY.md`](../../docs/MARS_PUBLISHER_GEOMETRY.md). The dictionary does not define those polygons as a concentration field or verified physical boundary. Source-level `feedback` and notification metadata are not proof of operator notification or repair, and the MARS snapshot alone does not independently verify mitigation.
