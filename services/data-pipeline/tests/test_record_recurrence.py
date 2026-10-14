import sys
from datetime import date, timedelta
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from record_recurrence import (
    ForecastExample,
    base_logit,
    cohort_at_origin,
    extract_source_clusters,
    extract_source_event_days,
    evaluate_record_recurrence,
    fit_logistic_model,
    fit_platt_calibrator,
    predict_probability,
    source_bootstrap_intervals,
    summarize_binary_predictions,
)


def test_source_event_days_keep_only_deduplicated_real_source_linked_dates():
    records = [
        {
            'sourceId': 'MARS_A',
            'synthetic': False,
            'country': 'Algeria',
            'observations': [
                {'id': 'p-1', 'sourceId': 'MARS_A', 'linkStatus': 'linked', 'synthetic': False, 'date': '2025-01-01T10:00:00Z'},
                {'id': 'p-1', 'sourceId': 'MARS_A', 'linkStatus': 'linked', 'synthetic': False, 'date': '2025-01-01T10:00:00Z'},
                {'id': 'p-2', 'sourceId': 'MARS_A', 'linkStatus': 'linked', 'synthetic': False, 'date': '2025-01-01T15:00:00Z'},
                {'id': 'p-3', 'sourceId': 'MARS_A', 'linkStatus': 'linked', 'synthetic': False, 'date': '2025-04-01T09:00:00Z'},
            ],
        },
        {'sourceId': 'DEMO', 'synthetic': True, 'observations': [{'id': 'demo', 'date': '2025-01-01'}]},
        {'sourceId': '', 'observations': [{'id': 'orphan', 'date': '2025-01-01'}]},
    ]

    assert extract_source_event_days(records) == {
        'MARS_A': (date(2025, 1, 1), date(2025, 4, 1)),
    }
    assert extract_source_clusters(records) == {'MARS_A': 'Algeria'}


def test_source_event_days_require_explicit_linked_and_well_formed_observations():
    records = [{
        'sourceId': 'MARS_A',
        'synthetic': False,
        'country': 'Algeria',
        'observations': [
            {'id': 'linked', 'sourceId': 'MARS_A', 'linkStatus': 'linked', 'synthetic': False, 'date': '2025-01-01'},
            {'id': 'unlinked', 'sourceId': None, 'linkStatus': 'unlinked', 'synthetic': False, 'date': '2025-01-02'},
        ],
    }]
    assert extract_source_event_days(records) == {'MARS_A': (date(2025, 1, 1),)}

    for invalid in (
        {'id': 'missing-status', 'sourceId': 'MARS_A', 'synthetic': False, 'date': '2025-01-03'},
        {'sourceId': 'MARS_A', 'linkStatus': 'linked', 'synthetic': False, 'date': '2025-01-03'},
        {'id': 'bad-date', 'sourceId': 'MARS_A', 'linkStatus': 'linked', 'synthetic': False, 'date': 'not-a-date'},
        {'id': 'wrong-source', 'sourceId': 'OTHER', 'linkStatus': 'linked', 'synthetic': False, 'date': '2025-01-03'},
    ):
        with pytest.raises(ValueError):
            extract_source_event_days([{
                'sourceId': 'MARS_A',
                'synthetic': False,
                'country': 'Algeria',
                'observations': [invalid],
            }])


def test_cohort_labels_only_the_following_horizon_and_uses_prior_features():
    origin = date(2025, 1, 1)
    events = {
        'RECURRED': (
            origin - timedelta(days=400),
            origin - timedelta(days=100),
            origin,
            origin + timedelta(days=365),
            origin + timedelta(days=366),
        ),
        'NO_FUTURE_RECORD': (origin - timedelta(days=200),),
        'NOT_YET_KNOWN': (origin + timedelta(days=20),),
    }

    cohort = cohort_at_origin(events, origin, horizon_days=365)

    assert [(item.source_id, item.label) for item in cohort] == [
        ('NO_FUTURE_RECORD', 0),
        ('RECURRED', 1),
    ]
    recurred = next(item for item in cohort if item.source_id == 'RECURRED')
    assert recurred.features == (2.0, 3.0, 0.0)


def test_logistic_fit_and_validation_calibration_return_bounded_probabilities():
    origin = date(2025, 1, 1)
    examples = []
    for index in range(80):
        recent = float(index % 5)
        history = float(1 + index % 9)
        recency = float((index * 37) % 365)
        examples.append(ForecastExample(
            source_id=f'S-{index}',
            origin_date=origin,
            features=(recent, history, recency),
            label=int(recent >= 2 or (recent == 1 and recency < 100)),
        ))

    model = fit_logistic_model(examples)
    raw_logits = [base_logit(item.features, model) for item in examples]
    calibrator = fit_platt_calibrator(raw_logits, [item.label for item in examples])
    low = predict_probability((0.0, 1.0, 300.0), model, calibrator)
    high = predict_probability((4.0, 8.0, 10.0), model, calibrator)

    assert 0.0 < low < 1.0
    assert 0.0 < high < 1.0
    assert high > low
    assert model['featureVersion'] == 'mars-linked-record-features-v1'
    assert calibrator['method'] == 'platt_scaling'


def test_binary_metrics_are_explicit_and_ties_do_not_inflate_auc():
    metrics = summarize_binary_predictions(
        [0, 0, 1, 1],
        [0.1, 0.2, 0.8, 0.9],
        [0.0, 1.0, 2.0, 3.0],
    )

    assert metrics['rocAuc'] == pytest.approx(1.0)
    assert metrics['brierScore'] == pytest.approx(0.025)
    assert metrics['precisionAtTopDecile'] == pytest.approx(1.0)
    assert metrics['positiveCount'] == 2

    tied = summarize_binary_predictions([0, 1], [0.5, 0.5], [1.0, 1.0])
    assert tied['rocAuc'] == pytest.approx(0.5)


def test_source_bootstrap_intervals_are_seeded_and_bound_the_estimate():
    labels = [0, 0, 1, 1, 0, 1]
    probabilities = [0.1, 0.2, 0.8, 0.9, 0.3, 0.7]
    scores = [1, 2, 8, 9, 3, 7]

    clusters = ['A', 'A', 'B', 'C', 'D', 'D']
    first = source_bootstrap_intervals(labels, probabilities, scores, cluster_ids=clusters, reference_probability=0.5, replicates=60, seed=177)
    second = source_bootstrap_intervals(labels, probabilities, scores, cluster_ids=clusters, reference_probability=0.5, replicates=60, seed=177)

    assert first == second
    assert first['metadata']['resamplingUnit'] == 'country_cluster'
    assert first['metadata']['clusterCount'] == 4
    assert first['confidenceIntervals95']['rocAuc']['lower95'] <= 1.0 <= first['confidenceIntervals95']['rocAuc']['upper95']
    assert 0.0 <= first['confidenceIntervals95']['precisionAtTopDecile']['lower95'] <= 1.0
    assert first['confidenceIntervals95']['brierSkill']['lower95'] <= first['confidenceIntervals95']['brierSkill']['upper95']


def test_incomplete_final_observation_horizon_abstains_without_source_estimates():
    result = evaluate_record_recurrence(
        [{'sourceId': 'MARS_A', 'synthetic': False, 'country': 'Example', 'observations': [{'id': 'p-1', 'sourceId': 'MARS_A', 'linkStatus': 'linked', 'synthetic': False, 'date': '2026-09-10'}]}],
        retrieved_at='2026-10-12T00:00:00Z',
        input_sha256='a' * 64,
        dataset_snapshot_id='mars-test-snapshot',
    )

    assert result['report']['status'] == 'not_available'
    assert 'complete final test horizon' in result['report']['reason']
    assert result['predictionsBySourceId'] == {}
