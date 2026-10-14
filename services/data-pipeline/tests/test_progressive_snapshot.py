import gzip
import hashlib
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build_web_snapshot import (  # noqa: E402
    build_progressive_snapshot_artifacts,
    build_snapshot_manifest,
    build_web_snapshot,
)


def _web_snapshot():
    source = {
        'schemaVersion': 1,
        'snapshotId': 'unep-mars-progressive1234',
        'provenance': {'archiveSha256': 'a' * 64, 'retrievedAt': '2026-10-12T00:00:00Z'},
        'counts': {'sources': 2, 'plumes': 5, 'linkedPlumes': 3, 'sourceIdMissingPlumes': 1, 'sourceRecordMissingPlumes': 1},
        'sources': [
            {'sourceId': 'KAZ_S_136', 'lat': 50.01, 'lon': 67.04, 'country': 'Kazakhstan', 'sector': 'Oil and gas'},
            {'sourceId': 'ARG_S_001', 'lat': -38.47, 'lon': -69.04, 'country': 'Argentina', 'sector': 'Oil and gas'},
        ],
        'plumes': [
            {'plumeId': 'p-1', 'sourceId': 'KAZ_S_136', 'linkStatus': 'linked', 'tileDate': '2024-01-01', 'lat': 50.01, 'lon': 67.04, 'fluxKgHr': 2000, 'fluxStdKgHr': 200, 'satellite': 'Sentinel-2'},
            {'plumeId': 'p-2', 'sourceId': 'KAZ_S_136', 'linkStatus': 'linked', 'tileDate': '2025-01-01', 'lat': 50.01, 'lon': 67.04, 'fluxKgHr': None, 'fluxStdKgHr': None, 'satellite': 'Landsat'},
            {'plumeId': 'p-3', 'sourceId': 'ARG_S_001', 'linkStatus': 'linked', 'tileDate': '2026-01-01', 'lat': -38.47, 'lon': -69.04, 'fluxKgHr': 0, 'fluxStdKgHr': 0, 'satellite': 'Sentinel-2'},
            {'plumeId': 'p-4', 'sourceId': None, 'linkStatus': 'source_id_missing', 'tileDate': '2025-06-01', 'lat': 1, 'lon': 2, 'fluxKgHr': 500, 'fluxStdKgHr': 50},
            {'plumeId': 'p-5', 'sourceId': 'MISSING_S_001', 'linkStatus': 'source_record_missing', 'tileDate': '2025-07-01', 'lat': 3, 'lon': 4, 'fluxKgHr': None, 'fluxStdKgHr': None},
        ],
    }
    return build_web_snapshot(source)


def _full_manifest(snapshot):
    decoded = json.dumps(snapshot, separators=(',', ':'), ensure_ascii=False).encode()
    compressed = gzip.compress(decoded, compresslevel=9, mtime=0)
    return build_snapshot_manifest(snapshot, compressed, decoded)


def test_progressive_artifacts_reconstruct_every_linked_and_unlinked_row_exactly():
    snapshot = _web_snapshot()
    result = build_progressive_snapshot_artifacts(snapshot, _full_manifest(snapshot), bucket_count=4)

    catalog = json.loads(result['catalog_bytes'])
    assert len(catalog['sources']) == 2
    assert all('observations' not in source for source in catalog['sources'])
    assert catalog['sources'][0]['observationDates']
    for source in catalog['sources']:
        expected_bucket = f'{hashlib.sha256(source["sourceId"].encode()).digest()[0] % 4:03d}'
        assert source['historyBucketId'] == expected_bucket

    linked = []
    unlinked = []
    for bucket in result['observation_buckets'].values():
        decoded = json.loads(bucket['decoded_bytes'])
        for source in decoded['sources']:
            linked.extend(source['observations'])
            assert all(item['sourceId'] == source['sourceId'] for item in source['observations'])
        unlinked.extend(decoded['unlinkedObservations'])

    rows = linked + unlinked
    assert len(rows) == snapshot['plumeCount'] == 5
    assert len({row['id'] for row in rows}) == 5
    assert {row['id'] for row in rows} == {'p-1', 'p-2', 'p-3', 'p-4', 'p-5'}
    assert next(row for row in rows if row['id'] == 'p-2')['fluxKgHr'] is None
    assert next(row for row in rows if row['id'] == 'p-3')['fluxKgHr'] == 0
    assert {row['linkStatus'] for row in unlinked} == {'source_id_missing', 'source_record_missing'}


def test_progressive_artifacts_are_deterministic_and_bind_compressed_and_decoded_bytes():
    snapshot = _web_snapshot()
    full_manifest = _full_manifest(snapshot)
    first = build_progressive_snapshot_artifacts(snapshot, full_manifest, bucket_count=4)
    second = build_progressive_snapshot_artifacts(snapshot, full_manifest, bucket_count=4)

    assert first['catalog_gzip_bytes'] == second['catalog_gzip_bytes']
    assert first['manifest'] == second['manifest']
    assert first['observation_buckets'] == second['observation_buckets']
    assert first['manifest']['datasetSnapshotId'] == snapshot['snapshotId']
    assert first['manifest']['sourceArchiveSha256'] == full_manifest['sourceArchiveSha256']
    assert first['manifest']['inputFileSha256'] == full_manifest['inputFileSha256']
    assert first['manifest']['plumeCount'] == snapshot['plumeCount']
    assert first['manifest']['linkedObservationCount'] == 3
    assert first['manifest']['unlinkedObservationCount'] == 2

    catalog_entry = first['manifest']['catalog']
    assert hashlib.sha256(first['catalog_gzip_bytes']).hexdigest() == catalog_entry['compressedSha256']
    assert hashlib.sha256(first['catalog_bytes']).hexdigest() == catalog_entry['decodedSha256']
    assert gzip.decompress(first['catalog_gzip_bytes']) == first['catalog_bytes']

    for bucket_id, bucket in first['observation_buckets'].items():
        entry = next(item for item in first['manifest']['buckets'] if item['id'] == bucket_id)
        assert hashlib.sha256(bucket['gzip_bytes']).hexdigest() == entry['compressedSha256']
        assert hashlib.sha256(bucket['decoded_bytes']).hexdigest() == entry['decodedSha256']
        assert gzip.decompress(bucket['gzip_bytes']) == bucket['decoded_bytes']


def test_progressive_builder_rejects_bad_bucket_counts_and_a_manifest_for_another_snapshot():
    snapshot = _web_snapshot()
    manifest = _full_manifest(snapshot)

    with pytest.raises(ValueError, match='bucket count'):
        build_progressive_snapshot_artifacts(snapshot, manifest, bucket_count=0)
    with pytest.raises(ValueError, match='different dataset snapshot ID'):
        build_progressive_snapshot_artifacts(snapshot, {**manifest, 'datasetSnapshotId': 'unep-mars-other1234'}, bucket_count=4)


def test_pinned_mars_snapshot_partitions_all_rows_without_changing_ids_or_links():
    repository = Path(__file__).resolve().parents[3]
    data_root = repository / 'apps' / 'web' / 'public' / 'data'
    with gzip.open(data_root / 'mars-snapshot.json.gz', 'rt', encoding='utf-8') as handle:
        snapshot = json.load(handle)
    full_manifest = json.loads((data_root / 'mars-snapshot-manifest.json').read_text(encoding='utf-8'))

    result = build_progressive_snapshot_artifacts(snapshot, full_manifest, bucket_count=64)
    catalog = json.loads(result['catalog_bytes'])
    reconstructed_linked = []
    reconstructed_unlinked = []
    for bucket in result['observation_buckets'].values():
        payload = json.loads(bucket['decoded_bytes'])
        for source in payload['sources']:
            reconstructed_linked.extend(source['observations'])
        reconstructed_unlinked.extend(payload['unlinkedObservations'])

    expected_linked = [
        observation
        for source in snapshot['sources']
        for observation in source['observations']
    ]
    expected_unlinked = snapshot['unlinkedObservations']
    assert len(catalog['sources']) == full_manifest['sourceCount'] == 4218
    assert catalog['snapshotId'] == snapshot['snapshotId'] == result['manifest']['datasetSnapshotId']
    assert {item['id'] for item in reconstructed_linked} == {item['id'] for item in expected_linked}
    assert {item['id'] for item in reconstructed_unlinked} == {item['id'] for item in expected_unlinked}
    assert len(reconstructed_linked) == result['manifest']['linkedObservationCount'] == 23_861
    assert len(reconstructed_unlinked) == result['manifest']['unlinkedObservationCount'] == 6_553
    assert len(reconstructed_linked) + len(reconstructed_unlinked) == full_manifest['plumeCount'] == 30_414
