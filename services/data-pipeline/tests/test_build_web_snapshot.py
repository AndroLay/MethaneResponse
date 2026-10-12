import sys
import gzip
import hashlib
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build_web_snapshot import build_snapshot_manifest, build_web_snapshot  # noqa: E402


def test_web_snapshot_bundles_all_linked_history_and_separates_unlinked_observations():
    snapshot = {
        'schemaVersion': 1,
        'snapshotId': 'unep-mars-abc123456789',
        'provenance': {
            'dataset': 'Eye on Methane / MARS detected sources and plumes',
            'catalogUrl': 'https://methanedata.unep.org/download-dataset',
            'retrievedAt': '2026-10-12T10:20:45+00:00',
            'archiveSha256': 'a' * 64,
            'license': 'CC BY-NC-SA 4.0',
        },
        'counts': {'sources': 1, 'plumes': 3, 'linkedPlumes': 2, 'sourceIdMissingPlumes': 1},
        'plumeObservationDateRange': {'start': '2024-01-01', 'end': '2026-01-01'},
        'sources': [{
            'sourceId': 'KAZ_S_136', 'lon': 67.04, 'lat': 50.01, 'country': 'Kazakhstan',
            'sector': 'Oil and gas', 'sourceType': 'Oil field', 'persistency': 0.4,
            'persistencyStd': 0.1, 'persistencyCategory': 'Medium', 'detectedPlumeCount': 99,
            'latestPlumeId': 'p-2', 'latestPlumeDate': '2026-01-01',
            'notified': 'Yes', 'feedback': 'Yes', 'feedbackOperator': 'No',
            'feedbackGovernment': 'No', 'feedbackScope': 'source', 'mitigationConfirmed': None,
            'synthetic': False, 'raw': {'source_name': 'KAZ_S_136'},
        }],
        'plumes': [
            {'plumeId': 'p-1', 'sourceId': 'KAZ_S_136', 'linkStatus': 'linked', 'tileDate': '2024-01-01', 'lat': 50.01, 'lon': 67.04, 'satellite': 'Sentinel-2', 'actionable': 'yes', 'notified': True, 'fluxKgHr': 2000.0, 'fluxStdKgHr': 200.0, 'totalEmissionTonnes': 1.2, 'totalEmissionStdTonnes': 0.2, 'windU': 1.5, 'windV': -2.5, 'windSpeed': 2.9, 'lastUpdate': '2024-01-02T00:00:00Z', 'insertDate': '2024-01-03T00:00:00Z', 'tileBackground': 'S2B_MSIL1C_scene', 'fluxUnit': 'kg/h', 'raw': {'ch4_fluxrate_std': '200'}, 'synthetic': False},
            {'plumeId': 'p-2', 'sourceId': 'KAZ_S_136', 'linkStatus': 'linked', 'tileDate': '2026-01-01', 'lat': 50.01, 'lon': 67.04, 'satellite': 'Sentinel-2', 'actionable': 'no', 'notified': False, 'fluxKgHr': None, 'fluxStdKgHr': None, 'synthetic': False},
            {'plumeId': 'p-3', 'sourceId': None, 'linkStatus': 'source_id_missing', 'tileDate': '2025-01-01', 'lat': 48.0, 'lon': 69.0, 'satellite': 'Landsat', 'actionable': None, 'notified': False, 'fluxKgHr': 500.0, 'fluxStdKgHr': 50.0, 'synthetic': False},
        ],
    }

    result = build_web_snapshot(snapshot)

    assert result['snapshotId'] == 'unep-mars-abc123456789'
    assert result['originalSourceCount'] == 1
    assert result['plumeCount'] == 3
    assert len(result['sources'][0]['observations']) == 2
    assert result['sources'][0]['observations'][0]['uncertaintyKgHr'] == 200.0
    assert result['sources'][0]['observations'][0]['lastUpdate'] == '2024-01-02T00:00:00Z'
    assert result['sources'][0]['observations'][0]['tileBackground'] == 'S2B_MSIL1C_scene'
    assert result['sources'][0]['observations'][1]['fluxKgHr'] is None
    assert result['unlinkedObservations'][0]['id'] == 'p-3'
    assert result['sources'][0]['evidence'] == []
    assert result['sources'][0]['mitigationConfirmed'] is None


def test_snapshot_manifest_binds_gzip_input_and_decoded_browser_content():
    snapshot = {
        'snapshotId': 'unep-mars-test123456',
        'provenance': {'archiveSha256': 'a' * 64},
    }
    decoded_object = {
        **snapshot,
        'sources': [{'sourceId': 'KAZ_S_159'}],
        'plumeCount': 3,
    }
    decoded = json.dumps(decoded_object, separators=(',', ':')).encode()
    compressed = gzip.compress(decoded, compresslevel=9, mtime=0)

    manifest = build_snapshot_manifest(snapshot, compressed, decoded)

    assert manifest == {
        'schemaVersion': 1,
        'datasetSnapshotId': 'unep-mars-test123456',
        'sourceArchiveSha256': 'a' * 64,
        'inputFileSha256': hashlib.sha256(compressed).hexdigest(),
        'decodedContentSha256': hashlib.sha256(decoded).hexdigest(),
        'sourceCount': 1,
        'plumeCount': 3,
    }
