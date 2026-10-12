import gzip
import hashlib
import json
import sys
import zipfile
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build_plume_geometries import build_geometry_artifacts  # noqa: E402


ARCHIVE_HASH = 'a' * 64
SOURCE_HASH = 'b' * 64
SNAPSHOT_ID = f'unep-mars-{SOURCE_HASH[:12]}'


def polygon(lon, lat):
    ring = [[lon, lat], [lon + 0.1, lat], [lon + 0.1, lat + 0.1], [lon, lat + 0.1], [lon, lat]]
    return {'type': 'MultiPolygon', 'coordinates': [[ring]]}


def plume(plume_id, source_id, date, lat, lon, flux, geometry):
    return {
        'type': 'Feature',
        'properties': {
            'id_plume': plume_id, 'source_name': source_id, 'tile_date': date,
            'lat': lat, 'lon': lon, 'ch4_fluxrate': flux,
            'ch4_fluxrate_std': 25 if flux is not None else None,
            'satellite': 'Sentinel-2', 'sector': 'Oil and Gas',
            'country': 'Kazakhstan', 'notified': False, 'actionable': 'No',
        },
        'geometry': geometry,
    }


def write_inputs(tmp_path, *, mismatch=None):
    rows = [
        {'id': 'plume-a', 'sourceId': 'KAZ_S_159', 'date': '2025-10-12T10:00:00', 'lat': 43.0, 'lon': 52.0, 'fluxKgHr': 2400, 'uncertaintyKgHr': 25},
        {'id': 'plume-b', 'sourceId': 'KAZ_S_159', 'date': '2025-10-13T10:00:00', 'lat': 43.1, 'lon': 52.1, 'fluxKgHr': 99, 'uncertaintyKgHr': 25},
        {'id': 'plume-c', 'sourceId': None, 'date': '2025-11-01T10:00:00', 'lat': 44.0, 'lon': 53.0, 'fluxKgHr': None, 'uncertaintyKgHr': None},
    ]
    features = [
        plume('plume-a', 'KAZ_S_159', '2025-10-12T10:00:00', 43.0, 52.0, 2400, polygon(52.0, 43.0)),
        plume('plume-b', 'KAZ_S_159', '2025-10-13T10:00:00', 43.1, 52.1, 99, polygon(52.1, 43.1)),
        plume('plume-c', None, '2025-11-01T10:00:00', 44.0, 53.0, None, None),
    ]
    if mismatch == 'flux':
        features[0]['properties']['ch4_fluxrate'] = 2000
    if mismatch == 'id':
        features[0]['properties']['id_plume'] = 'wrong-id'
    if mismatch == 'coordinates':
        features[0]['geometry'] = polygon(181, 43.0)

    snapshot = {
        'schemaVersion': 1,
        'snapshotId': SNAPSHOT_ID,
        'provenance': {'archiveSha256': SOURCE_HASH, 'license': 'CC BY-NC-SA 4.0'},
        'sources': [{'sourceId': 'KAZ_S_159', 'observations': rows[:2]}],
        'unlinkedObservations': [rows[2]],
    }
    source_path = tmp_path / 'source-snapshot.json.gz'
    with gzip.open(source_path, 'wt', encoding='utf-8') as stream:
        json.dump(snapshot, stream, separators=(',', ':'))

    archive_path = tmp_path / 'mars-geojson.zip'
    with zipfile.ZipFile(archive_path, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('unep_methanedata_detected_plumes.geojson', json.dumps({
            'type': 'FeatureCollection', 'features': features,
        }, separators=(',', ':')))
    return archive_path, source_path


def test_geometry_shards_preserve_publisher_shapes_and_bind_to_the_exact_csv_snapshot(tmp_path):
    archive_path, source_path = write_inputs(tmp_path)
    output = tmp_path / 'out'

    manifest = build_geometry_artifacts(
        geojson_archive=archive_path,
        source_snapshot=source_path,
        output_dir=output,
        retrieved_at='2026-10-12T18:23:01.756954+00:00',
        upstream_last_modified_at='2026-10-12T03:01:29+00:00',
    )

    assert manifest['datasetId'] == SNAPSHOT_ID
    assert manifest['sourceArchiveSha256'] == SOURCE_HASH
    assert manifest['geometryFeatureCount'] == 2
    assert manifest['inputPlumeCount'] == 3
    assert manifest['withoutGeometryCount'] == 1
    assert manifest['months']['2025-10']['featureCount'] == 2
    assert manifest['months']['2025-11']['featureCount'] == 0
    assert manifest['months']['2025-11']['file'] is None

    shard_path = output / manifest['months']['2025-10']['file']
    decoded = gzip.decompress(shard_path.read_bytes())
    assert manifest['months']['2025-10']['uncompressedBytes'] == len(decoded)
    assert manifest['months']['2025-10']['uncompressedSha256'] == hashlib.sha256(decoded).hexdigest()
    with gzip.open(shard_path, 'rt', encoding='utf-8') as stream:
        collection = json.load(stream)
    assert collection['type'] == 'FeatureCollection'
    assert len(collection['features']) == 2
    assert collection['features'][0]['id'] == 'plume-b'
    assert collection['features'][0]['geometry'] == polygon(52.1, 43.1)
    assert collection['features'][0]['properties'] == {
        'plumeId': 'plume-b', 'sourceId': 'KAZ_S_159', 'observedAt': '2025-10-13T10:00:00',
        'latitude': 43.1, 'longitude': 52.1, 'reportedFluxKgHr': 99,
        'reportedUncertaintyKgHr': 25, 'satellite': 'Sentinel-2', 'sector': 'Oil and Gas',
        'country': 'Kazakhstan', 'notified': False, 'actionable': 'No',
    }


@pytest.mark.parametrize(('mismatch', 'message'), [
    ('id', 'plume IDs'),
    ('flux', 'ch4_fluxrate'),
    ('coordinates', 'WGS84'),
])
def test_builder_rejects_geometry_that_does_not_match_the_pinned_observation(mismatch, message, tmp_path):
    archive_path, source_path = write_inputs(tmp_path, mismatch=mismatch)

    with pytest.raises(ValueError, match=message):
        build_geometry_artifacts(
            geojson_archive=archive_path,
            source_snapshot=source_path,
            output_dir=tmp_path / 'out',
            retrieved_at='2026-10-12T18:23:01.756954+00:00',
        )

    assert not (tmp_path / 'out').exists()


def test_monthly_shards_are_byte_deterministic_for_the_same_pinned_inputs(tmp_path):
    archive_path, source_path = write_inputs(tmp_path)
    left = tmp_path / 'left'
    right = tmp_path / 'right'
    common = {
        'geojson_archive': archive_path,
        'source_snapshot': source_path,
        'retrieved_at': '2026-10-12T18:23:01.756954+00:00',
        'upstream_last_modified_at': '2026-10-12T03:01:29+00:00',
    }

    first = build_geometry_artifacts(output_dir=left, **common)
    second = build_geometry_artifacts(output_dir=right, **common)

    assert first == second
    assert (left / first['months']['2025-10']['file']).read_bytes() == (right / second['months']['2025-10']['file']).read_bytes()
    assert (left / 'index.json').read_bytes() == (right / 'index.json').read_bytes()
