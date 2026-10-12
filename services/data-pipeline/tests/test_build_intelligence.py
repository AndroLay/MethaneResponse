import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build_intelligence import inspect, load_records, build, CASEBOOK, FULL_SNAPSHOT, ROOT


def test_deduplication_and_no_forecast():
    r = inspect({'sourceId':'TEST','observations':[{'id':'x','date':'2025-01-01','fluxKgHr':500}, {'id':'x','date':'2025-01-01','fluxKgHr':900}]})
    assert r['observationCount'] == 1
    assert r['medianObservedFluxKgHr'] == 500
    assert r['forecast']['status'] == 'not_available'
    assert r['robustOutlierCount'] is None


def test_reproducible_casebook(tmp_path):
    first_path = tmp_path / 'intelligence.json'
    second_path = tmp_path / 'intelligence-again.json'
    result = build(CASEBOOK, first_path)
    repeated = build(CASEBOOK, second_path)
    assert result['sourceCount'] == 3
    assert result['modelVersion'] == 'transparent-priority-v3'
    assert not result['trainedModel']
    assert len(result['inputFileSha256']) == 64
    assert all(x['priorityType'] == 'heuristic_not_probability' for x in result['sources'])
    assert first_path.read_bytes() == second_path.read_bytes()
    assert result['generatedAt'] == '2026-10-11T16:29:31+00:00'
    assert result == repeated
    assert result['sources'][0]['observedPersistencyCategory'] in {'frequent', 'intermittent', 'rare', 'absent', None}


def test_null_observations_never_become_zero():
    r = inspect({'sourceId':'TEST','observations':[{'id':'a','date':'2026-01-01','fluxKgHr':None}]})
    assert r['medianObservedFluxKgHr'] is None
    assert r['priorityComponents']['magnitudeContribution'] is None
    assert r['measurementAvailability'] == 'no_numeric_flux'


def test_unique_observation_dates_ignore_time_of_day_but_keep_observation_count():
    r = inspect({'sourceId':'TEST','observations':[
        {'id':'a','date':'2026-01-01T08:10:00Z','fluxKgHr':500,'uncertaintyKgHr':90},
        {'id':'b','date':'2026-01-01T12:30:00Z','fluxKgHr':700,'uncertaintyKgHr':110},
        {'id':'c','date':'2026-01-02T00:00:00Z','fluxKgHr':None,'uncertaintyKgHr':None},
    ], 'persistency':0.67, 'persistencyStd':0.27, 'persistencyCategory':'frequent'})
    assert r['observationCount'] == 3
    assert r['observationIds'] == ['a', 'b', 'c']
    assert r['uniqueObservationDates'] == 2
    assert r['medianObservationUncertaintyKgHr'] == 100
    assert r['observedPersistency'] == 0.67
    assert r['observedPersistencyStd'] == 0.27
    assert r['observedPersistencyCategory'] == 'frequent'


def test_anomaly_screen_flags_a_traceable_extreme_observation():
    observations = [
        {'id': f'p-{i}', 'date': f'2026-01-{i + 1:02d}', 'fluxKgHr': value, 'uncertaintyKgHr': 2}
        for i, value in enumerate([100, 100, 100, 100, 100, 100, 100, 200])
    ]
    result = inspect({'sourceId': 'TEST', 'observations': observations})['anomalyAnalysis']
    assert result['status'] == 'potential_anomalies'
    assert result['methodVersion'] == 'mad-threshold-screen-v1'
    assert result['numericObservationCount'] == 8
    assert result['distinctNumericObservationDates'] == 8
    assert result['scaleBasis'] == 'median_reported_uncertainty_fallback'
    assert result['flaggedObservations'] == [{
        'id': 'p-7', 'date': '2026-01-08', 'fluxKgHr': 200, 'uncertaintyKgHr': 2,
        'deviationFromMedianKgHr': 100, 'thresholdKgHr': 7,
    }]
    assert 'not proof' in result['limitation'].lower()
    assert inspect({'sourceId': 'TEST', 'observations': observations})['robustOutlierCount'] == 1


def test_reported_uncertainty_raises_the_per_observation_screen_threshold():
    observations = [
        {'id': f'p-{i}', 'date': f'2026-02-{i + 1:02d}', 'fluxKgHr': value,
         'uncertaintyKgHr': 20 if i == 7 else 2}
        for i, value in enumerate([100, 100, 100, 100, 100, 100, 100, 130])
    ]
    result = inspect({'sourceId': 'TEST', 'observations': observations})['anomalyAnalysis']
    assert result['status'] == 'no_candidates_flagged'
    assert result['flaggedObservations'] == []
    assert result['thresholdRule'] == 'flag when absolute deviation exceeds max(3.5 × robust scale, 2 × reported observation uncertainty)'
    assert 'candidate' in result['limitation'].lower()


def test_anomaly_screen_abstains_for_insufficient_sample_coverage_or_scale():
    few = inspect({'sourceId': 'TEST', 'observations': [
        {'id': f'p-{i}', 'date': f'2026-03-{i + 1:02d}', 'fluxKgHr': 100} for i in range(7)
    ]})['anomalyAnalysis']
    assert few['status'] == 'insufficient_observations'
    assert few['flaggedObservations'] == []

    same_dates = inspect({'sourceId': 'TEST', 'observations': [
        {'id': f'p-{i}', 'date': f'2026-04-{i % 2 + 1:02d}', 'fluxKgHr': 100 + i} for i in range(8)
    ]})['anomalyAnalysis']
    assert same_dates['status'] == 'insufficient_temporal_coverage'

    no_scale = inspect({'sourceId': 'TEST', 'observations': [
        {'id': f'p-{i}', 'date': f'2026-05-{i + 1:02d}', 'fluxKgHr': 100} for i in range(8)
    ]})['anomalyAnalysis']
    assert no_scale['status'] == 'insufficient_scale'
    assert no_scale['scaleBasis'] == 'unavailable'
    assert no_scale['robustScaleKgHr'] is None
    assert inspect({'sourceId': 'TEST', 'observations': [
        {'id': f'p-{i}', 'date': f'2026-05-{i + 1:02d}', 'fluxKgHr': 100} for i in range(8)
    ]})['robustOutlierCount'] is None


def test_full_dataset_loader_joins_only_explicit_source_identifiers(tmp_path):
    import json
    path = tmp_path / 'mars-snapshot.json'
    raw = {
        'snapshotId': 'unep-mars-test',
        'provenance': {'retrievedAt': '2026-10-12T10:20:45+00:00', 'archiveSha256': 'a' * 64},
        'sources': [
            {'sourceId': 'SRC_A', 'detectedPlumeCount': 2, 'persistency': 0.5, 'persistencyStd': 0.2, 'persistencyCategory': 'intermittent', 'latestPlumeDate': '2026-01-02'},
            {'sourceId': 'SRC_B', 'detectedPlumeCount': 1, 'persistency': 0, 'persistencyStd': 0, 'persistencyCategory': 'absent', 'latestPlumeDate': None},
        ],
        'plumes': [
            {'plumeId': 'plume-a', 'sourceId': 'SRC_A', 'linkStatus': 'linked', 'tileDate': '2026-01-02T08:00:00Z', 'fluxKgHr': 500, 'fluxStdKgHr': 70, 'satellite': 'EMIT'},
            {'plumeId': 'plume-unlinked', 'sourceId': None, 'linkStatus': 'source_id_missing', 'tileDate': '2026-01-03', 'fluxKgHr': 900, 'fluxStdKgHr': None},
            {'plumeId': 'plume-orphan', 'sourceId': 'SRC_MISSING', 'linkStatus': 'linked', 'tileDate': '2026-01-04', 'fluxKgHr': 800, 'fluxStdKgHr': None},
        ],
    }
    path.write_text(json.dumps(raw), encoding='utf-8')
    records, archive_hash, generated_at, provenance = load_records(path)
    by_id = {row['sourceId']: row for row in records}
    assert archive_hash == 'a' * 64
    assert generated_at == '2026-10-12T10:20:45+00:00'
    assert provenance['archiveSha256'] == archive_hash
    assert by_id['SRC_A']['observations'] == [{
        'id': 'plume-a', 'date': '2026-01-02T08:00:00Z', 'fluxKgHr': 500,
        'uncertaintyKgHr': 70, 'satellite': 'EMIT',
    }]
    assert by_id['SRC_B']['observations'] == []


def test_pinned_global_snapshot_build_covers_all_sources_and_explicitly_linked_plumes(tmp_path):
    import json
    import hashlib
    manifest = json.loads((ROOT / 'apps/web/public/data/mars-snapshot-history.json').read_text(encoding='utf-8'))['snapshots'][-1]
    output = tmp_path / 'global-intelligence.json'
    second_output = tmp_path / 'global-intelligence-again.json'
    result = build(FULL_SNAPSHOT, output)
    repeated = build(FULL_SNAPSHOT, second_output)
    assert result['datasetSnapshotId'] == manifest['snapshotId']
    assert result['sourceCount'] == manifest['sources'] == 4211
    assert result['linkedObservationCount'] == manifest['linkedPlumes'] == 23785
    assert len({row['sourceId'] for row in result['sources']}) == result['sourceCount']
    assert result['inputFileSha256'] == hashlib.sha256(FULL_SNAPSHOT.read_bytes()).hexdigest()
    assert result['upstreamArchiveSha256'] == manifest['archiveSha256']
    assert result['datasetLicense'] == 'CC BY-NC-SA 4.0'
    assert result['catalogUrl'] == 'https://methanedata.unep.org/download-dataset'
    assert 'UNEP IMEO' in result['datasetAttribution']
    assert result['sourceProvenance']['downloadUrl'] == 'https://unepazeconomyadlsstorage.blob.core.windows.net/public/unep_methanedata_detected_plumes_csv.zip'
    assert result['sourceProvenance']['archiveSha256'] == manifest['archiveSha256']
    assert result['sourceProvenance']['snapshotId'] == manifest['snapshotId']
    assert result['sourceProvenance']['retrievedAt'] == result['generatedAt']
    assert all(row['priorityType'] == 'heuristic_not_probability' for row in result['sources'])
    assert output.stat().st_size > 0
    assert output.read_bytes() == second_output.read_bytes()
    assert result == repeated
