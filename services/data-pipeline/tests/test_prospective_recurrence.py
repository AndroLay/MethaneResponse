import copy
import hashlib
import json
import sys
from datetime import date, timedelta
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import prospective_recurrence as prospective_module
from prospective_recurrence import (
    build_frozen_ledger,
    evaluate_frozen_ledger,
    main,
    write_immutable_json,
)
from record_recurrence import FEATURE_NAMES, FEATURE_VERSION, MODEL_VERSION, RELEASE_GATES, TARGET, predict_probability


AS_OF = '2026-09-12'
FROZEN_AT = '2026-10-14T00:00:00Z'
PASSING_GATE_RESULTS = {
    'minimumTestCohort': True,
    'minimumPositiveAndNegativeTestLabels': True,
    'rocAucLower95': True,
    'calibrationEce10': True,
    'calibrationEceUpper95': True,
    'brierSkillLower95': True,
    'topDecileLiftLower95': True,
    'baselineAucDeltaLower95': True,
    'minimumBootstrapReplicates': True,
    'minimumCountryClusters': True,
}


def _observation(source_id, identifier, observed_at):
    return {
        'id': identifier,
        'sourceId': source_id,
        'linkStatus': 'linked',
        'synthetic': False,
        'date': f'{observed_at}T12:00:00Z',
    }


def _snapshot(snapshot_id, retrieved_at, source_events, *, last_observed=None):
    sources = []
    for source_id, country, events in source_events:
        sources.append({
            'sourceId': source_id,
            'country': country,
            'synthetic': False,
            'observations': [
                _observation(source_id, identifier, day)
                for identifier, day in events
            ],
        })
    return {
        'schemaVersion': 3,
        'snapshotId': snapshot_id,
        'truncated': False,
        'lastObserved': last_observed or max(
            (day for _, _, events in source_events for _, day in events),
            default=None,
        ),
        'provenance': {
            'provider': 'UNEP International Methane Emissions Observatory (IMEO)',
            'dataset': 'Eye on Methane / MARS detected sources and plumes',
            'retrievedAt': retrieved_at,
            'snapshotId': snapshot_id,
            'archiveSha256': hashlib.sha256(snapshot_id.encode()).hexdigest(),
            'license': 'CC BY-NC-SA 4.0',
        },
        'sources': sources,
    }


def _base_case():
    snapshot = _snapshot(
        'mars-base',
        '2026-10-13T21:14:04Z',
        [
            ('SRC_A', 'Country A', [('a-1', '2026-09-12')]),
            ('SRC_B', 'Country B', [('b-1', '2026-09-10')]),
            ('SRC_C', 'Country C', [('c-1', '2026-08-10')]),
        ],
        last_observed=AS_OF,
    )
    snapshot_bytes = json.dumps(snapshot, sort_keys=True, separators=(',', ':')).encode()
    source_hash = hashlib.sha256(snapshot_bytes).hexdigest()
    intelligence_sources = []
    for source_id, probability in [('SRC_A', 0.8), ('SRC_B', 0.3), ('SRC_C', 0.6)]:
        intelligence_sources.append({
            'sourceId': source_id,
            'recordRecurrenceForecast': {
                'status': 'available',
                'modelVersion': MODEL_VERSION,
                'target': TARGET,
                'asOfDate': AS_OF,
                'horizonDays': 365,
                'probability': probability,
            },
        })
    intelligence = {
        'schemaVersion': 3,
        'kind': 'observational_investigation_ranking',
        'datasetSnapshotId': 'mars-base',
        'inputFileSha256': source_hash,
        'upstreamArchiveSha256': snapshot['provenance']['archiveSha256'],
        'generatedAt': snapshot['provenance']['retrievedAt'],
        'sourceCount': 3,
        'sourceProvenance': snapshot['provenance'],
        'sources': intelligence_sources,
        'recordRecurrenceModel': {
            'schemaVersion': 1,
            'modelVersion': MODEL_VERSION,
            'status': 'historical_backtest_passed',
            'target': TARGET,
            'horizonDays': 365,
            'featureVersion': FEATURE_VERSION,
            'featureNames': list(FEATURE_NAMES),
            'datasetSnapshotId': 'mars-base',
            'inputFileSha256': source_hash,
            'retrievedAt': snapshot['provenance']['retrievedAt'],
            'datasetLastObservedDate': AS_OF,
            'predictionsScoredAsOfDate': AS_OF,
            'predictionSourceCount': 3,
            'evaluationRole': 'retrospective_temporal_development_holdout; a prospective follow-up is still required before operational use',
            'modelParameters': {
                'modelVersion': MODEL_VERSION,
                'featureVersion': FEATURE_VERSION,
                'featureNames': list(FEATURE_NAMES),
                'means': [0.0, 0.0, 0.0],
                'scales': [1.0, 1.0, 1.0],
                'coefficients': [0.1, 0.2, -0.3],
                'intercept': 0.05,
                'trainingSourceOriginRows': 20,
                'trainingPositiveLabels': 10,
                'optimizer': {
                    'algorithm': 'batch_logistic_gradient_descent',
                    'epochs': 1800,
                    'learningRate': 0.08,
                    'l2Penalty': 0.03,
                },
            },
            'trainingSourceOriginRows': 20,
            'trainingPositiveLabels': 10,
            'calibrationMethod': {
                'method': 'platt_scaling', 'intercept': 0.0, 'slope': 1.0,
                'calibrationSourceOriginRows': 100, 'calibrationPositiveLabels': 40,
                'regularization': 'slope shrunk toward 1.0 with coefficient 0.01',
            },
            'calibrationSourceCount': 100,
            'calibrationPositiveLabels': 40,
            'testCohort': {
                'sourceCount': 1000, 'positiveCount': 500, 'prevalence': 0.5,
                'rocAuc': 0.9, 'brierScore': 0.2,
                'expectedCalibrationError10': 0.05,
                'precisionAtTopDecile': 0.8, 'recallAtTopDecile': 0.16,
                'liftAtTopDecile': 1.6,
            },
            'testBrierReference': {
                'probabilityFromCalibrationCohort': 0.4,
                'brierScore': 0.26, 'brierSkillScore': 1 - 0.2 / 0.26,
            },
            'baselineComparison': {'name': 'recent_365_day_linked_detection_dates', 'rocAuc': 0.7, 'precisionAtTopDecile': 0.7},
            'confidenceIntervals95': {
                'rocAuc': {'lower95': 0.8, 'upper95': 0.95},
                'brierScore': {'lower95': 0.15, 'upper95': 0.24},
                'expectedCalibrationError10': {'lower95': 0.02, 'upper95': 0.1},
                'precisionAtTopDecile': {'lower95': 0.7, 'upper95': 0.9},
                'brierSkill': {'lower95': 0.2, 'upper95': 0.3},
                'liftAtTopDecile': {'lower95': 1.5, 'upper95': 1.9},
                'rocAucDeltaVsBaseline': {'lower95': 0.01, 'upper95': 0.3},
            },
            'bootstrap': {
                'method': 'percentile_cluster_bootstrap', 'resamplingUnit': 'country_cluster',
                'replicatesRequested': 400, 'clusterCount': 40, 'seed': 177,
            },
            'releaseGates': RELEASE_GATES,
            'releaseGateResults': PASSING_GATE_RESULTS,
        },
    }
    model = intelligence['recordRecurrenceModel']['modelParameters']
    calibrator = intelligence['recordRecurrenceModel']['calibrationMethod']
    as_of = date.fromisoformat(AS_OF)
    for item in intelligence_sources:
        observations = next(source for source in snapshot['sources'] if source['sourceId'] == item['sourceId'])['observations']
        days = sorted(date.fromisoformat(row['date'][:10]) for row in observations)
        recent_count = sum(as_of - timedelta(days=365) < day <= as_of for day in days)
        features = (float(recent_count), float(len(days)), float((as_of - days[-1]).days))
        item['recordRecurrenceForecast']['probability'] = round(predict_probability(features, model, calibrator), 6)
    return snapshot, snapshot_bytes, intelligence


def test_freeze_binds_exact_snapshot_model_and_unlabeled_future_window():
    _, snapshot_bytes, intelligence = _base_case()

    ledger = build_frozen_ledger(
        snapshot_bytes,
        intelligence,
        registered_at=FROZEN_AT,
        code_sha256={
            'recordRecurrence': 'a' * 64,
            'buildIntelligence': 'b' * 64,
            'prospectiveRecurrence': 'c' * 64,
        },
    )

    assert ledger['state'] == 'frozen_pending_outcomes'
    assert ledger['baseline']['datasetSnapshotId'] == 'mars-base'
    assert ledger['baseline']['inputSnapshotSha256'] == hashlib.sha256(snapshot_bytes).hexdigest()
    assert ledger['forecastWindow'] == {
        'startExclusive': AS_OF,
        'endInclusive': '2027-09-12',
        'horizonDays': 365,
    }
    assert ledger['predictionCount'] == 3
    assert ledger['predictions'][0]['sourceId'] == 'SRC_A'
    assert ledger['predictions'][0]['probability'] == intelligence['sources'][0]['recordRecurrenceForecast']['probability']
    assert ledger['predictions'][0]['baselineRecentDetectionDateCount'] == 1


    assert ledger['predictionsSha256'] == hashlib.sha256(
        json.dumps(ledger['predictions'], sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()
    ).hexdigest()
    assert all('label' not in row for row in ledger['predictions'])
    gate_results = ledger['modelSpecification']['historicalEvaluation']['releaseGateResults']
    assert gate_results == PASSING_GATE_RESULTS
    assert all(type(result) is bool for result in gate_results.values())


def test_freezing_requires_an_explicit_versioned_output_path(tmp_path, monkeypatch):
    _, snapshot_bytes, intelligence = _base_case()
    snapshot_path = tmp_path / 'snapshot.json'
    intelligence_path = tmp_path / 'intelligence.json'
    snapshot_path.write_bytes(snapshot_bytes)
    intelligence_path.write_text(json.dumps(intelligence), encoding='utf-8')

    for filename in ('record_recurrence.py', 'build_intelligence.py', 'prospective_recurrence.py'):
        code_path = tmp_path / 'services' / 'data-pipeline' / filename
        code_path.parent.mkdir(parents=True, exist_ok=True)
        code_path.write_text(filename, encoding='utf-8')

    monkeypatch.setattr(prospective_module, 'ROOT', tmp_path)

    with pytest.raises(SystemExit) as error:
        main([
            '--snapshot', str(snapshot_path),
            '--intelligence', str(intelligence_path),
            '--registered-at', FROZEN_AT,
        ])

    assert error.value.code == 2
    assert not (tmp_path / 'data/processed/prospective/record-recurrence-ledger-2026-10-14.json').exists()


def test_freezing_writes_to_the_explicit_versioned_output_path(tmp_path, monkeypatch):
    _, snapshot_bytes, intelligence = _base_case()
    snapshot_path = tmp_path / 'snapshot.json'
    intelligence_path = tmp_path / 'intelligence.json'
    output_path = tmp_path / 'versions' / 'record-recurrence-ledger-test-v2.json'
    snapshot_path.write_bytes(snapshot_bytes)
    intelligence_path.write_text(json.dumps(intelligence), encoding='utf-8')

    for filename in ('record_recurrence.py', 'build_intelligence.py', 'prospective_recurrence.py'):
        code_path = tmp_path / 'services' / 'data-pipeline' / filename
        code_path.parent.mkdir(parents=True, exist_ok=True)
        code_path.write_text(filename, encoding='utf-8')

    monkeypatch.setattr(prospective_module, 'ROOT', tmp_path)

    result = main([
        '--snapshot', str(snapshot_path),
        '--intelligence', str(intelligence_path),
        '--registered-at', FROZEN_AT,
        '--output', str(output_path),
    ])

    assert result == 0
    assert json.loads(output_path.read_text(encoding='utf-8'))['predictionCount'] == 3
    assert not (tmp_path / 'data/processed/prospective/record-recurrence-ledger-2026-10-14.json').exists()


def test_evaluating_frozen_ledger_does_not_need_registration_output(tmp_path):
    _, snapshot_bytes, intelligence = _base_case()
    ledger = build_frozen_ledger(
        snapshot_bytes,
        intelligence,
        registered_at=FROZEN_AT,
        code_sha256={
            'recordRecurrence': 'a' * 64,
            'buildIntelligence': 'b' * 64,
            'prospectiveRecurrence': 'c' * 64,
        },
    )
    ledger_path = tmp_path / 'ledger.json'
    followup_path = tmp_path / 'followup.json'
    evaluation_path = tmp_path / 'evaluation.json'
    ledger_path.write_text(json.dumps(ledger), encoding='utf-8')
    followup_path.write_bytes(snapshot_bytes)

    result = main([
        '--ledger', str(ledger_path),
        '--followup-snapshot', str(followup_path),
        '--evaluation-output', str(evaluation_path),
    ])

    assert result == 0
    assert json.loads(evaluation_path.read_text(encoding='utf-8'))['status'] == 'not_available'


@pytest.mark.parametrize(
    'mutate',
    [
        lambda intelligence: intelligence['recordRecurrenceModel']['modelParameters']['coefficients'].__setitem__(0, 0.2),
        lambda intelligence: intelligence['recordRecurrenceModel']['calibrationMethod'].update(intercept=0.1),
        lambda intelligence: intelligence['sources'][0]['recordRecurrenceForecast'].update(probability=0.999),
    ],
)
def test_freeze_rejects_predictions_not_reproducible_from_snapshot_model_and_calibrator(mutate):
    _, snapshot_bytes, intelligence = _base_case()
    intelligence = copy.deepcopy(intelligence)
    mutate(intelligence)

    with pytest.raises(ValueError, match='does not match the frozen model and calibrator'):
        build_frozen_ledger(
            snapshot_bytes,
            intelligence,
            registered_at=FROZEN_AT,
            code_sha256={
                'recordRecurrence': 'a' * 64,
                'buildIntelligence': 'b' * 64,
                'prospectiveRecurrence': 'c' * 64,
            },
        )


def test_freeze_rejects_a_snapshot_changed_after_the_model_was_scored():
    _, snapshot_bytes, intelligence = _base_case()
    changed = bytearray(snapshot_bytes)
    changed[-1] ^= 1

    with pytest.raises(ValueError, match='does not match the intelligence input hash'):
        build_frozen_ledger(
            bytes(changed),
            intelligence,
            registered_at=FROZEN_AT,
            code_sha256={
                'recordRecurrence': 'a' * 64,
                'buildIntelligence': 'b' * 64,
                'prospectiveRecurrence': 'c' * 64,
            },
        )


def test_freeze_rejects_misaligned_prediction_cutoffs():
    _, snapshot_bytes, intelligence = _base_case()
    intelligence = copy.deepcopy(intelligence)
    intelligence['sources'][0]['recordRecurrenceForecast']['asOfDate'] = '2026-09-11'

    with pytest.raises(ValueError, match='does not match the registered as-of date'):
        build_frozen_ledger(
            snapshot_bytes,
            intelligence,
            registered_at=FROZEN_AT,
            code_sha256={
                'recordRecurrence': 'a' * 64,
                'buildIntelligence': 'b' * 64,
                'prospectiveRecurrence': 'c' * 64,
            },
        )


@pytest.mark.parametrize(
    ('mutate', 'message'),
    [
        (lambda intelligence: intelligence.update(sourceCount=999), 'source count does not match'),
        (lambda intelligence: intelligence['sourceProvenance'].update(snapshotId='other'), 'provenance does not match'),
        (lambda intelligence: intelligence['recordRecurrenceModel'].update(modelVersion='made-up-v99'), 'model version'),
        (lambda intelligence: intelligence['recordRecurrenceModel'].update(featureVersion='made-up-features'), 'feature version'),
        (lambda intelligence: intelligence['recordRecurrenceModel'].update(featureNames=['made_up']), 'feature names'),
        (lambda intelligence: intelligence['recordRecurrenceModel']['modelParameters'].update(modelVersion='made-up-v99'), 'model parameters'),
        (lambda intelligence: intelligence['recordRecurrenceModel'].update(releaseGates={**RELEASE_GATES, 'minimumTestSources': 1}), 'release gates'),
        (lambda intelligence: intelligence['recordRecurrenceModel']['testCohort'].update(sourceCount=150, positiveCount=75), 'release-gate results'),
    ],
)
def test_freeze_rejects_inconsistent_source_model_provenance_and_gate_evidence(mutate, message):
    _, snapshot_bytes, intelligence = _base_case()
    intelligence = copy.deepcopy(intelligence)
    mutate(intelligence)

    with pytest.raises(ValueError, match=message):
        build_frozen_ledger(
            snapshot_bytes,
            intelligence,
            registered_at=FROZEN_AT,
            code_sha256={
                'recordRecurrence': 'a' * 64,
                'buildIntelligence': 'b' * 64,
                'prospectiveRecurrence': 'c' * 64,
            },
        )


@pytest.mark.parametrize(
    'mutate',
    [
        lambda snapshot: snapshot['sources'][0]['observations'][0].pop('linkStatus'),
        lambda snapshot: snapshot['sources'][0]['observations'][0].pop('id'),
        lambda snapshot: snapshot['sources'][0]['observations'][0].update(sourceId='SRC_OTHER'),
        lambda snapshot: snapshot['sources'][0].update(observations=[None]),
        lambda snapshot: snapshot['sources'][0].pop('observations'),
    ],
)
def test_freeze_rejects_malformed_observation_rows_instead_of_silently_changing_cohort(mutate):
    snapshot, _, intelligence = _base_case()
    snapshot = copy.deepcopy(snapshot)
    mutate(snapshot)
    snapshot_bytes = json.dumps(snapshot, sort_keys=True, separators=(',', ':')).encode()
    intelligence = copy.deepcopy(intelligence)
    intelligence['inputFileSha256'] = hashlib.sha256(snapshot_bytes).hexdigest()
    intelligence['recordRecurrenceModel']['inputFileSha256'] = intelligence['inputFileSha256']

    with pytest.raises(ValueError, match='[Oo]bservation|Observations'):
        build_frozen_ledger(
            snapshot_bytes,
            intelligence,
            registered_at=FROZEN_AT,
            code_sha256={
                'recordRecurrence': 'a' * 64,
                'buildIntelligence': 'b' * 64,
                'prospectiveRecurrence': 'c' * 64,
            },
        )


@pytest.mark.parametrize(
    ('mutate', 'message'),
    [
        (lambda report: report['calibrationMethod'].clear(), 'calibration'),
        (lambda report: report['modelParameters']['optimizer'].clear(), 'optimizer'),
        (lambda report: report['testCohort'].update(expectedCalibrationError10=-0.1), 'calibration error'),
        (lambda report: report['testCohort'].update(rocAuc=1.2), 'ROC AUC'),
        (lambda report: report['confidenceIntervals95']['rocAuc'].update(lower95=2.0), 'ROC AUC interval'),
        (lambda report: report['confidenceIntervals95']['rocAuc'].update(lower95=0.96), 'interval bounds'),
        (lambda report: report['calibrationMethod'].update(calibrationSourceOriginRows=99), 'calibration counts'),
        (lambda report: report['modelParameters'].update(trainingSourceOriginRows=999), 'model training counts'),
        (lambda report: report['modelParameters']['optimizer'].update(epochs=10), 'optimizer settings'),
        (lambda report: report['calibrationMethod'].update(slope=0), 'slope must be positive'),
        (lambda report: report['testCohort'].update(prevalence=0.2), 'prevalence does not match'),
        (lambda report: report['testCohort'].update(recallAtTopDecile=0.5), 'recall does not match'),
        (lambda report: report['testBrierReference'].update(brierScore=0.3), 'Brier reference score'),
        (lambda report: report['baselineComparison'].update(name='unregistered'), 'registered rules baseline'),
        (lambda report: report['confidenceIntervals95']['rocAucDeltaVsBaseline'].update(lower95=0.25, upper95=0.3), 'interval bounds'),
        (lambda report: report['bootstrap'].update(resamplingUnit='source'), 'resampling unit'),
        (lambda report: report['bootstrap'].update(seed=999), 'registered bootstrap seed'),
        (lambda report: report['bootstrap'].update(clusterCount=99999), 'bootstrap cluster count'),
        (lambda report: report['bootstrap'].update(clusterCount=0), 'bootstrap cluster count'),
        (lambda report: report['modelParameters']['scales'].__setitem__(1, 0.0), 'feature scales'),
        (lambda report: report['modelParameters']['scales'].__setitem__(1, 51.0), 'feature scales are outside'),
        (lambda report: report['modelParameters']['coefficients'].__setitem__(0, 101.0), 'coefficients are outside'),
        (lambda report: report['modelParameters']['coefficients'].__setitem__(0, float('nan')), 'finite numeric'),
    ],
)
def test_freeze_rejects_incomplete_calibration_optimizer_and_impossible_metrics(mutate, message):
    _, snapshot_bytes, intelligence = _base_case()
    intelligence = copy.deepcopy(intelligence)
    mutate(intelligence['recordRecurrenceModel'])

    with pytest.raises(ValueError, match=message):
        build_frozen_ledger(
            snapshot_bytes,
            intelligence,
            registered_at=FROZEN_AT,
            code_sha256={
                'recordRecurrence': 'a' * 64,
                'buildIntelligence': 'b' * 64,
                'prospectiveRecurrence': 'c' * 64,
            },
        )


def test_immutable_ledger_write_is_idempotent_and_refuses_replacement(tmp_path):
    target = tmp_path / 'ledger.json'
    first = {'state': 'frozen_pending_outcomes', 'predictionCount': 3}
    assert write_immutable_json(target, first) == 'created'
    assert write_immutable_json(target, first) == 'already_identical'

    with pytest.raises(FileExistsError, match='Refusing to replace immutable JSON artifact'):
        write_immutable_json(target, {'state': 'rewritten', 'predictionCount': 0})


def test_future_evaluation_abstains_until_full_observation_horizon_and_release_buffer():
    _, snapshot_bytes, intelligence = _base_case()
    ledger = build_frozen_ledger(
        snapshot_bytes,
        intelligence,
        registered_at=FROZEN_AT,
        code_sha256={
            'recordRecurrence': 'a' * 64,
            'buildIntelligence': 'b' * 64,
            'prospectiveRecurrence': 'c' * 64,
        },
    )
    early_snapshot = _snapshot(
        'mars-followup-early',
        '2027-10-11T00:00:00Z',
        [('SRC_A', 'Country A', [('a-1', '2026-09-12'), ('a-new', '2027-09-12')])],
        last_observed='2027-09-12',
    )
    followup_bytes = json.dumps(early_snapshot, sort_keys=True, separators=(',', ':')).encode()

    result = evaluate_frozen_ledger(ledger, followup_bytes)

    assert result['status'] == 'not_available'
    assert '30-day public-release buffer' in result['reason']
    assert result['labeledSourceCount'] == 0


def test_future_evaluation_ignores_backfills_and_does_not_turn_missing_sources_into_negatives():
    _, snapshot_bytes, intelligence = _base_case()
    ledger = build_frozen_ledger(
        snapshot_bytes,
        intelligence,
        registered_at=FROZEN_AT,
        code_sha256={
            'recordRecurrence': 'a' * 64,
            'buildIntelligence': 'b' * 64,
            'prospectiveRecurrence': 'c' * 64,
        },
    )
    followup = _snapshot(
        'mars-followup',
        '2027-10-12T00:00:00Z',
        [
            ('SRC_A', 'Country A', [
                ('a-old', '2026-09-11'),
                ('a-within-window', '2027-02-01'),
                ('a-after-window', '2027-09-13'),
            ]),
            ('SRC_B', 'Country B', [('b-old', '2026-09-10')]),
            ('OTHER', 'Country D', [('other-endpoint', '2027-09-12')]),
        ],
    )
    followup_bytes = json.dumps(followup, sort_keys=True, separators=(',', ':')).encode()

    result = evaluate_frozen_ledger(ledger, followup_bytes, bootstrap_replicates=20)
    rows = {row['sourceId']: row for row in result['outcomes']}

    assert rows['SRC_A']['label'] == 1
    assert rows['SRC_B']['label'] == 0
    assert result['unobservedSourceIds'] == ['SRC_C']
    assert result['labeledSourceCount'] == 2
    assert result['unknownSourceCount'] == 1
    assert result['metrics']['positiveCount'] == 1
    assert result['metrics']['sourceCount'] == 2
    assert result['baselineMetrics']['rocAuc'] == pytest.approx(0.5)
    assert result['baselineMetrics']['precisionAtTopDecile'] is not None
    assert 'brierScore' not in result['baselineMetrics']
    assert 'expectedCalibrationError10' not in result['baselineMetrics']
    assert result['brierReference']['brierScore'] is not None
    assert result['status'] == 'insufficient_evaluable_cohort'
    assert len(result['evaluationCodeSha256']) == 64


@pytest.mark.parametrize(
    'mutate',
    [
        lambda observation: observation.pop('linkStatus'),
        lambda observation: observation.pop('id'),
    ],
)
def test_future_evaluation_rejects_malformed_linked_observation_before_labeling(mutate):
    _, snapshot_bytes, intelligence = _base_case()
    ledger = build_frozen_ledger(
        snapshot_bytes,
        intelligence,
        registered_at=FROZEN_AT,
        code_sha256={
            'recordRecurrence': 'a' * 64,
            'buildIntelligence': 'b' * 64,
            'prospectiveRecurrence': 'c' * 64,
        },
    )
    followup = _snapshot(
        'mars-followup-malformed',
        '2027-10-13T00:00:00Z',
        [('SRC_A', 'Country A', [('a-future', '2027-09-12')])],
        last_observed='2027-09-12',
    )
    mutate(followup['sources'][0]['observations'][0])
    followup_bytes = json.dumps(followup, sort_keys=True, separators=(',', ':')).encode()

    with pytest.raises(ValueError, match='[Oo]bservation'):
        evaluate_frozen_ledger(ledger, followup_bytes)
