import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from publisher_indicator_comparison import build_publisher_indicator_comparison


MODEL = {
    'status': 'historical_backtest_passed',
    'modelVersion': 'mars-linked-record-recurrence-logistic-v1',
    'datasetSnapshotId': 'unep-mars-test123456',
    'inputFileSha256': 'a' * 64,
    'datasetLastObservedDate': '2026-09-12',
    'target': 'at_least_one_future_linked_mars_detection_record',
    'horizonDays': 365,
}


def _source(source_id, persistency, category, emission_status=None, synthetic=False):
    return {
        'sourceId': source_id,
        'synthetic': synthetic,
        'persistency': persistency,
        'persistencyCategory': category,
        'emissionStatus': emission_status,
    }


def _forecast(probability, *, source_date='2026-09-12'):
    return {
        'status': 'available',
        'modelVersion': MODEL['modelVersion'],
        'target': MODEL['target'],
        'asOfDate': source_date,
        'horizonDays': 365,
        'probability': probability,
    }


def test_comparison_is_snapshot_bound_and_keeps_missing_and_invalid_indicators_out_of_ranks():
    sources = [
        _source('A', 0.1, 'absent'),
        _source('B', 0.8, 'frequent'),
        _source('C', 0.4, 'sporadic'),
        _source('D', None, 'Undetermined'),
        _source('E', 0.6, 'frequent'),
        _source('G', 1.5, 'persistent'),
        _source('DEMO', 0.99, 'persistent', synthetic=True),
    ]
    probabilities = {'A': 0.9, 'B': 0.7, 'C': 0.5, 'D': 0.3, 'E': 0.1, 'G': 0.2, 'DEMO': 0.99}
    forecasts = {source_id: _forecast(value) for source_id, value in probabilities.items()}

    result = build_publisher_indicator_comparison(sources, forecasts, MODEL)

    assert result['status'] == 'available'
    assert result['datasetSnapshotId'] == 'unep-mars-test123456'
    assert result['inputFileSha256'] == 'a' * 64
    assert result['asOfDate'] == '2026-09-12'
    assert result['target'] == 'at_least_one_future_linked_mars_detection_record'
    assert result['horizonDays'] == 365
    assert result['realSourceCount'] == 6
    assert result['recurrencePredictionCount'] == 6
    assert result['persistencyCoverage'] == {
        'numericReportedCount': 4,
        'missingCount': 1,
        'invalidCount': 1,
        'categoryReportedCount': 6,
        'categoryMissingCount': 0,
        'emissionStatusReportedCount': 0,
        'emissionStatusMissingCount': 6,
    }

    by_category = {row['category']: row for row in result['probabilityByPersistencyCategory']}
    assert by_category['frequent'] == {
        'category': 'frequent', 'sourceCount': 2, 'scoredSourceCount': 2, 'medianProbability': 0.4,
    }
    assert by_category['Undetermined']['medianProbability'] == 0.3

    comparison = result['numericPersistencyComparison']
    assert comparison['status'] == 'available'
    assert comparison['matchedSourceCount'] == 4
    assert comparison['spearmanRho'] == pytest.approx(-0.4)
    assert comparison['topDecileAgreement'] == {
        'fraction': 0.1,
        'comparedSourceCount': 4,
        'selectedPerRanking': 1,
        'overlapCount': 0,
        'recurrenceOnlyCount': 1,
        'persistencyOnlyCount': 1,
        'tieBreak': 'sourceId_ascending',
    }
    assert any('not ground truth' in item.lower() for item in result['limitations'])


def test_comparison_abstains_when_recurrence_estimates_do_not_match_the_pinned_model_cutoff():
    sources = [_source('A', 0.5, 'sporadic')]
    mismatched_forecasts = {'A': _forecast(0.8, source_date='2026-09-11')}

    result = build_publisher_indicator_comparison(sources, mismatched_forecasts, MODEL)

    assert result['status'] == 'not_available'
    assert result['recurrencePredictionCount'] == 0
    assert result['invalidPredictionCount'] == 1
    assert result['numericPersistencyComparison']['status'] == 'not_available'
    assert result['numericPersistencyComparison']['spearmanRho'] is None
    assert result['probabilityByPersistencyCategory'][0]['medianProbability'] is None
    assert 'pinned model' in result['numericPersistencyComparison']['reason']
