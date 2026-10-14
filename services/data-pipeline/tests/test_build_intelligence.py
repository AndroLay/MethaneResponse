import sys
from pathlib import Path
from datetime import date, timedelta
import pytest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build_intelligence import inspect, load_records, build, FULL_SNAPSHOT, ROOT


def test_deduplication_and_no_forecast():
    r = inspect({'sourceId':'TEST','observations':[{'id':'x','date':'2025-01-01','fluxKgHr':500}, {'id':'x','date':'2025-01-01','fluxKgHr':900}]})
    assert r['observationCount'] == 1
    assert r['medianObservedFluxKgHr'] == 500
    assert 'forecast' not in r
    assert r['observedFluxTrend']['status'] == 'insufficient_observations'
    assert r['robustOutlierCount'] is None


def test_observed_flux_trend_uses_theil_sen_slope_without_extrapolating():
    start = date(2025, 1, 1)
    observations = [
        {'id': f'p-{index}', 'date': (start + timedelta(days=90 * index)).isoformat(),
         'fluxKgHr': 100 + 30 * index, 'uncertaintyKgHr': 8}
        for index in range(4)
    ]
    result = inspect({'sourceId': 'TREND', 'observations': observations})
    trend = result['observedFluxTrend']

    assert trend['status'] == 'descriptive_trend'
    assert trend['numericObservationDates'] == 4
    assert trend['spanDays'] == 270
    assert trend['slopeKgHrPer30Days'] == pytest.approx(10)
    assert trend['firstObservationDate'] == observations[0]['date']
    assert trend['lastObservationDate'] == observations[-1]['date']
    assert trend['firstObservedMedianFluxKgHr'] == 100
    assert trend['lastObservedMedianFluxKgHr'] == 190


def test_observed_trend_aggregates_same_day_detections_and_abstains_on_short_coverage():
    start = date(2025, 1, 1)
    observations = [
        {'id': 'same-low', 'date': start.isoformat(), 'fluxKgHr': 100, 'uncertaintyKgHr': 10},
        {'id': 'same-high', 'date': start.isoformat(), 'fluxKgHr': 1000, 'uncertaintyKgHr': 20},
        *[
            {'id': f'p-{index}', 'date': (start + timedelta(days=20 * index)).isoformat(),
             'fluxKgHr': 200 + 10 * index, 'uncertaintyKgHr': None}
            for index in range(1, 4)
        ],
    ]
    trend = inspect({'sourceId': 'SHORT', 'observations': observations})['observedFluxTrend']

    assert trend['status'] == 'insufficient_temporal_coverage'
    assert trend['numericObservationDates'] == 4
    assert trend['firstObservedMedianFluxKgHr'] == 550
    assert trend['slopeKgHrPer30Days'] is None


def test_missing_flux_never_becomes_a_zero_trend_point():
    result = inspect({'sourceId': 'MISSING', 'observations': [
        {'id': 'missing', 'date': '2025-01-01', 'fluxKgHr': None},
    ]})

    assert result['observedFluxTrend']['numericObservationDates'] == 0
    assert result['observedFluxTrend']['firstObservationDate'] is None
    assert result['observedFluxTrend']['slopeKgHrPer30Days'] is None
    assert result['medianObservedFluxKgHr'] is None


def test_reproducible_casebook(tmp_path):
    first_path = tmp_path / 'intelligence.json'
    second_path = tmp_path / 'intelligence-again.json'
    active_casebook = ROOT / 'data/real/mars_casebook_2026-10-14.json'
    result = build(active_casebook, first_path)
    repeated = build(active_casebook, second_path)
    assert active_casebook.name == 'mars_casebook_2026-10-14.json'
    assert result['sourceCount'] == 3
    assert result['modelVersion'] == 'transparent-priority-v5'
    assert result['datasetSnapshotId'] == 'unep-mars-675417694883'
    assert result['sourceProvenance']['archiveSha256'] == '675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43'
    assert result['forecastReadiness']['status'] == 'not_available'
    assert result['forecastReadiness']['missingRequirements'] == [
        'complete_observation_opportunities', 'independent_future_outcome_labels', 'held_out_temporal_validation'
    ]
    assert result['observedTrendMethod']['minimumNumericObservationDates'] == 4
    assert result['observedTrendMethod']['minimumSpanDays'] == 90
    assert 'forecast' not in result['sources'][0]
    assert not result['trainedModel']
    assert len(result['inputFileSha256']) == 64
    assert all(x['priorityType'] == 'heuristic_not_probability' for x in result['sources'])
    assert first_path.read_bytes() == second_path.read_bytes()
    assert result['generatedAt'] == '2026-10-14T06:10:12+00:00'
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
            {'sourceId': 'SRC_A', 'country': 'Country A', 'synthetic': False, 'detectedPlumeCount': 2, 'persistency': 0.5, 'persistencyStd': 0.2, 'persistencyCategory': 'intermittent', 'latestPlumeDate': '2026-01-02'},
            {'sourceId': 'SRC_B', 'country': 'Country B', 'synthetic': False, 'detectedPlumeCount': 1, 'persistency': 0, 'persistencyStd': 0, 'persistencyCategory': 'absent', 'latestPlumeDate': None},
        ],
        'plumes': [
            {'plumeId': 'plume-a', 'sourceId': 'SRC_A', 'linkStatus': 'linked', 'synthetic': False, 'tileDate': '2026-01-02T08:00:00Z', 'fluxKgHr': 500, 'fluxStdKgHr': 70, 'satellite': 'EMIT'},
            {'plumeId': 'plume-unlinked', 'sourceId': None, 'linkStatus': 'source_id_missing', 'synthetic': False, 'tileDate': '2026-01-03', 'fluxKgHr': 900, 'fluxStdKgHr': None},
            {'plumeId': 'plume-orphan', 'sourceId': 'SRC_MISSING', 'linkStatus': 'linked', 'synthetic': False, 'tileDate': '2026-01-04', 'fluxKgHr': 800, 'fluxStdKgHr': None},
        ],
    }
    path.write_text(json.dumps(raw), encoding='utf-8')
    records, archive_hash, generated_at, provenance = load_records(path)
    by_id = {row['sourceId']: row for row in records}
    assert archive_hash == 'a' * 64
    assert generated_at == '2026-10-12T10:20:45+00:00'
    assert provenance['archiveSha256'] == archive_hash
    assert by_id['SRC_A']['country'] == 'Country A'
    assert by_id['SRC_A']['observations'] == [{
        'id': 'plume-a', 'sourceId': 'SRC_A', 'linkStatus': 'linked', 'synthetic': False,
        'date': '2026-01-02T08:00:00Z', 'fluxKgHr': 500, 'uncertaintyKgHr': 70, 'satellite': 'EMIT',
    }]
    assert by_id['SRC_B']['observations'] == []


def test_pinned_global_snapshot_build_covers_all_sources_and_explicitly_linked_plumes(tmp_path):
    import json
    import hashlib
    manifest = json.loads((ROOT / 'apps/web/public/data/mars-snapshot-history.json').read_text(encoding='utf-8'))['snapshots'][-1]
    output = tmp_path / 'global-intelligence.json'
    second_output = tmp_path / 'global-intelligence-again.json'
    evaluation = tmp_path / 'record-recurrence-evaluation.json'
    second_evaluation = tmp_path / 'record-recurrence-evaluation-again.json'
    result = build(FULL_SNAPSHOT, output, evaluation, bootstrap_replicates=400)
    repeated = build(FULL_SNAPSHOT, second_output, second_evaluation, bootstrap_replicates=400)
    assert result['schemaVersion'] == 3
    assert result['modelVersion'] == 'transparent-priority-v5'
    assert result['datasetSnapshotId'] == manifest['snapshotId']
    assert result['sourceCount'] == manifest['sources'] == 4218
    assert result['linkedObservationCount'] == manifest['linkedPlumes'] == 23861
    trend_status = {status: sum(row['observedFluxTrend']['status'] == status for row in result['sources']) for status in (
        'descriptive_trend', 'insufficient_temporal_coverage', 'insufficient_observations'
    )}
    assert trend_status == {
        'descriptive_trend': 1259,
        'insufficient_temporal_coverage': 60,
        'insufficient_observations': 2899,
    }
    assert result['forecastReadiness']['status'] == 'not_available'
    assert all('forecast' not in row for row in result['sources'])
    assert result['recordRecurrenceModel']['status'] == 'historical_backtest_passed'
    assert result['recordRecurrenceModel']['target'] == 'at_least_one_future_linked_mars_detection_record'
    test_metrics = result['recordRecurrenceModel']['testCohort']
    assert test_metrics['sourceCount'] == 3131
    assert test_metrics['positiveCount'] == 1251
    assert test_metrics['rocAuc'] == pytest.approx(0.80810118, abs=0.00000001)
    assert test_metrics['expectedCalibrationError10'] < 0.10
    assert result['recordRecurrenceModel']['testBrierReference']['brierSkillScore'] > 0.10
    recurrence_model = result['recordRecurrenceModel']
    assert recurrence_model['bootstrap']['resamplingUnit'] == 'country_cluster'
    assert recurrence_model['bootstrap']['clusterCount'] == 79
    assert recurrence_model['bootstrap']['replicatesRequested'] == 400
    assert recurrence_model['confidenceIntervals95']['brierSkill']['lower95'] > 0.10
    assert recurrence_model['confidenceIntervals95']['expectedCalibrationError10']['upper95'] < 0.15
    assert recurrence_model['confidenceIntervals95']['rocAucDeltaVsBaseline']['lower95'] > 0
    assert recurrence_model['baselineComparison']['name'] == 'recent_365_day_linked_detection_dates'
    assert recurrence_model['evaluationRole'].startswith('retrospective_temporal_development_holdout')
    assert all(result['recordRecurrenceModel']['releaseGateResults'].values())
    publisher_comparison = result['publisherIndicatorComparison']
    assert publisher_comparison['status'] == 'available'
    assert publisher_comparison['datasetSnapshotId'] == manifest['snapshotId']
    assert publisher_comparison['inputFileSha256'] == result['inputFileSha256']
    assert publisher_comparison['asOfDate'] == result['recordRecurrenceModel']['datasetLastObservedDate']
    assert publisher_comparison['target'] == recurrence_model['target']
    assert publisher_comparison['horizonDays'] == 365
    assert publisher_comparison['realSourceCount'] == manifest['sources']
    assert publisher_comparison['persistencyCoverage'] == {
        'numericReportedCount': 3059,
        'missingCount': 1159,
        'invalidCount': 0,
        'categoryReportedCount': 4218,
        'categoryMissingCount': 0,
        'emissionStatusReportedCount': 0,
        'emissionStatusMissingCount': 4218,
    }
    assert publisher_comparison['numericPersistencyComparison']['status'] == 'available'
    assert publisher_comparison['numericPersistencyComparison']['matchedSourceCount'] > 1000
    assert publisher_comparison['numericPersistencyComparison']['topDecileAgreement']['selectedPerRanking'] > 0
    assert any('not ground truth' in item.lower() for item in publisher_comparison['limitations'])
    dza = next(row for row in result['sources'] if row['sourceId'] == 'DZA_S_012')
    assert dza['recordRecurrenceForecast']['asOfDate'] == '2026-09-13'
    assert dza['recordRecurrenceForecast']['horizonDays'] == 365
    assert dza['recordRecurrenceForecast']['probability'] == pytest.approx(0.918307, abs=0.000001)
    assert dza['recordRecurrenceForecast']['target'] == 'at_least_one_future_linked_mars_detection_record'
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
    assert evaluation.stat().st_size > 0
    assert output.read_bytes() == second_output.read_bytes()
    assert evaluation.read_bytes() == second_evaluation.read_bytes()
    assert result == repeated
