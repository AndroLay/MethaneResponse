import csv
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ingest import ingest_csv, ingest_mars_archive  # noqa: E402


FIXTURE = Path(__file__).resolve().parents[3] / 'data' / 'fixtures' / 'mars_synthetic.csv'


def test_synthetic_plumes_are_parsed_without_repair_assertions():
    records, manifest = ingest_csv(FIXTURE, 'source_id')
    assert manifest['parsedCount'] == 2
    assert records[0]['sourceId'] == 'DEMO-001'
    assert records[0]['feedbackRaw'] == 'Yes'
    assert records[0]['mitigationConfirmed'] is None
    assert len(manifest['sha256']) == 64


def test_wrong_source_id_column_is_rejected():
    with pytest.raises(ValueError, match='Missing required columns'):
        ingest_csv(FIXTURE, 'nonexistent_column')


def test_missing_plume_is_skipped(tmp_path):
    path = tmp_path / 'test.csv'
    with path.open('w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(['source_id', 'id_plume', 'tile_date'])
        writer.writerow(['A', '', '2026-01-01'])
    rows, manifest = ingest_csv(path, 'source_id')
    assert rows == []
    assert manifest['skippedCount'] == 1


def test_official_mars_archive_keeps_full_observation_history_and_raw_time_fields(tmp_path):
    import io
    import zipfile

    archive_path = tmp_path / 'mars.zip'
    source_csv = (
        'source_name,lon,lat,country,sector,source_type,persistency,persistency_std,'
        'persistency_category,n_plumes_detected,id_last_plume,last_plume_date,notified,'
        'feedback,feedback_operator,feedback_government\n'
        'KAZ_S_136,67.04,50.01,Kazakhstan,Oil and gas,Oil field,0.4,0.1,Medium,1,p-1,2026-04-01,Yes,No,No,No\n'
    )
    plume_csv = (
        'id_plume,source_name,satellite,tile_date,lat,lon,actionable,notified,country,sector,'
        'detection_institution,quantification_institution,tile,ch4_fluxrate,ch4_fluxrate_std,'
        'wind_u,wind_v,total_emission,total_emission_std,wind_speed,last_update,insert_date,tile_background\n'
        'p-1,KAZ_S_136,Sentinel-2,2026-04-01,50.01,67.04,yes,true,Kazakhstan,Oil and gas,UNEP,UNEP,abc,2000,200,1.5,-2.5,1.2,0.2,2.9,2026-04-02T00:00:00Z,2026-04-03T00:00:00Z,S2B_MSIL1C_product-id\n'
        'p-2,,Sentinel-2,2026-05-01,51.01,68.04,no,false,Kazakhstan,Oil and gas,UNEP,UNEP,def,1800,180,-1.5,2.5,1.1,0.1,2.9,2026-05-02T00:00:00Z,2026-05-03T00:00:00Z,S2A_MSIL1C_product-id\n'
    )
    with zipfile.ZipFile(archive_path, 'w') as archive:
        archive.writestr('LICENSE-CC-BY-NC-SA.txt', 'Attribution-NonCommercial-ShareAlike 4.0 International')
        archive.writestr('unep_methanedata_detected_sources.csv', source_csv)
        archive.writestr('unep_methanedata_detected_plumes.csv', plume_csv)

    snapshot, manifest = ingest_mars_archive(archive_path, retrieved_at='2026-10-12T10:20:45Z')

    assert manifest['counts']['sources'] == 1
    assert manifest['counts']['plumes'] == 2
    assert manifest['counts']['sourceIdMissingPlumes'] == 1
    assert snapshot['snapshotId'] == f"unep-mars-{manifest['provenance']['archiveSha256'][:12]}"
    assert snapshot['sources'][0]['sourceType'] == 'Oil field'
    assert snapshot['plumes'][0]['windU'] == 1.5
    assert snapshot['plumes'][0]['windV'] == -2.5
    assert snapshot['plumes'][0]['windSpeed'] == 2.9
    assert snapshot['plumes'][0]['lastUpdate'] == '2026-04-02T00:00:00Z'
    assert snapshot['plumes'][0]['insertDate'] == '2026-04-03T00:00:00Z'
    assert snapshot['plumes'][0]['tileBackground'] == 'S2B_MSIL1C_product-id'
    assert snapshot['plumes'][0]['raw']['ch4_fluxrate_std'] == '200'
    assert snapshot['plumes'][1]['sourceId'] is None
    assert snapshot['plumes'][1]['linkStatus'] == 'source_id_missing'

