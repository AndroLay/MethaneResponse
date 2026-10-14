"""Describe agreement between recurrence scores and UNEP source indicators.

This is a same-snapshot diagnostic, not an outcome label or model validation.
Missing publisher values remain missing and never become zero.
"""
from __future__ import annotations

from collections import defaultdict
from math import ceil, isfinite, sqrt
from statistics import median
from typing import Mapping, Sequence


TARGET = 'at_least_one_future_linked_mars_detection_record'
HORIZON_DAYS = 365


def _valid_number(value) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and isfinite(value)


def _average_ranks(values: Sequence[float]) -> list[float]:
    ordered = sorted(range(len(values)), key=lambda index: (values[index], index))
    ranks = [0.0] * len(values)
    start = 0
    while start < len(ordered):
        end = start + 1
        while end < len(ordered) and values[ordered[end]] == values[ordered[start]]:
            end += 1
        average_rank = ((start + 1) + end) / 2
        for position in range(start, end):
            ranks[ordered[position]] = average_rank
        start = end
    return ranks


def _pearson(left: Sequence[float], right: Sequence[float]) -> float | None:
    if len(left) != len(right) or len(left) < 2:
        return None
    left_mean = sum(left) / len(left)
    right_mean = sum(right) / len(right)
    left_centered = [value - left_mean for value in left]
    right_centered = [value - right_mean for value in right]
    left_sum = sum(value * value for value in left_centered)
    right_sum = sum(value * value for value in right_centered)
    if left_sum == 0 or right_sum == 0:
        return None
    return sum(a * b for a, b in zip(left_centered, right_centered)) / sqrt(left_sum * right_sum)


def _unavailable_numeric_comparison(reason: str) -> dict:
    return {
        'status': 'not_available',
        'reason': reason,
        'method': 'spearman_rank_correlation_with_average_ties',
        'matchedSourceCount': 0,
        'spearmanRho': None,
        'topDecileAgreement': None,
    }


def _valid_forecast(forecast, model: Mapping) -> bool:
    return (
        isinstance(forecast, Mapping)
        and forecast.get('status') == 'available'
        and forecast.get('modelVersion') == model.get('modelVersion')
        and forecast.get('target') == TARGET
        and model.get('target') == TARGET
        and forecast.get('asOfDate') == model.get('datasetLastObservedDate')
        and isinstance(forecast.get('horizonDays'), int)
        and not isinstance(forecast.get('horizonDays'), bool)
        and forecast.get('horizonDays') == HORIZON_DAYS
        and model.get('horizonDays') == HORIZON_DAYS
        and _valid_number(forecast.get('probability'))
        and 0 <= forecast['probability'] <= 1
    )


def build_publisher_indicator_comparison(
    sources: Sequence[Mapping],
    predictions_by_source_id: Mapping[str, Mapping],
    recurrence_model: Mapping,
) -> dict:
    """Build snapshot-bound, descriptive comparison metrics for real MARS sources."""
    real_sources = []
    seen_ids = set()
    for source in sources:
        if not isinstance(source, Mapping) or source.get('synthetic') is not False:
            continue
        source_id = source.get('sourceId')
        if not isinstance(source_id, str) or not source_id.strip():
            raise ValueError('A real MARS source in the publisher comparison needs its original sourceId')
        if source_id in seen_ids:
            raise ValueError(f'Duplicate sourceId in publisher comparison: {source_id}')
        seen_ids.add(source_id)
        real_sources.append(source)

    model_is_available = (
        recurrence_model.get('status') == 'historical_backtest_passed'
        and recurrence_model.get('target') == TARGET
        and recurrence_model.get('horizonDays') == HORIZON_DAYS
        and isinstance(recurrence_model.get('datasetSnapshotId'), str)
        and bool(recurrence_model.get('datasetSnapshotId'))
        and isinstance(recurrence_model.get('inputFileSha256'), str)
        and len(recurrence_model.get('inputFileSha256', '')) == 64
        and isinstance(recurrence_model.get('datasetLastObservedDate'), str)
    )

    scored_by_id: dict[str, float] = {}
    invalid_prediction_count = 0
    for source in real_sources:
        source_id = source['sourceId']
        forecast = predictions_by_source_id.get(source_id)
        if forecast is None:
            continue
        if model_is_available and _valid_forecast(forecast, recurrence_model):
            scored_by_id[source_id] = float(forecast['probability'])
        else:
            invalid_prediction_count += 1

    persistency_numeric_count = 0
    persistency_missing_count = 0
    persistency_invalid_count = 0
    category_missing_count = 0
    emission_status_reported_count = 0
    categories: dict[str, list[tuple[str, float | None]]] = defaultdict(list)
    ranked_rows: list[tuple[str, float, float]] = []

    for source in real_sources:
        source_id = source['sourceId']
        raw_persistency = source.get('persistency')
        persistency = None
        if raw_persistency is None:
            persistency_missing_count += 1
        elif _valid_number(raw_persistency) and 0 <= raw_persistency <= 1:
            persistency = float(raw_persistency)
            persistency_numeric_count += 1
        else:
            persistency_invalid_count += 1

        raw_category = source.get('persistencyCategory')
        category = raw_category.strip() if isinstance(raw_category, str) else ''
        if not category:
            category_missing_count += 1
        else:
            categories[category].append((source_id, scored_by_id.get(source_id)))

        raw_emission_status = source.get('emissionStatus')
        if isinstance(raw_emission_status, str) and raw_emission_status.strip():
            emission_status_reported_count += 1

        probability = scored_by_id.get(source_id)
        if persistency is not None and probability is not None:
            ranked_rows.append((source_id, probability, persistency))

    category_rows = []
    for category in sorted(categories, key=lambda item: (item.casefold(), item)):
        entries = categories[category]
        probabilities = [probability for _, probability in entries if probability is not None]
        category_rows.append({
            'category': category,
            'sourceCount': len(entries),
            'scoredSourceCount': len(probabilities),
            'medianProbability': round(median(probabilities), 6) if probabilities else None,
        })

    if not model_is_available or not scored_by_id:
        numeric_comparison = _unavailable_numeric_comparison(
            'No source-matched recurrence estimate passed the pinned model, target, and cutoff checks.'
        )
    elif len(ranked_rows) < 2:
        numeric_comparison = _unavailable_numeric_comparison(
            'At least two sources with both a valid estimate and numeric publisher persistency are required.'
        )
    else:
        probabilities = [row[1] for row in ranked_rows]
        persistencies = [row[2] for row in ranked_rows]
        rho = _pearson(_average_ranks(probabilities), _average_ranks(persistencies))
        if rho is None:
            numeric_comparison = _unavailable_numeric_comparison(
                'Rank association is undefined because one or both numeric rankings have no variation.'
            )
            numeric_comparison['matchedSourceCount'] = len(ranked_rows)
        else:
            selected_count = max(1, ceil(len(ranked_rows) * 0.10))
            recurrence_top = {
                row[0] for row in sorted(ranked_rows, key=lambda row: (-row[1], row[0]))[:selected_count]
            }
            persistency_top = {
                row[0] for row in sorted(ranked_rows, key=lambda row: (-row[2], row[0]))[:selected_count]
            }
            overlap = recurrence_top & persistency_top
            numeric_comparison = {
                'status': 'available',
                'reason': None,
                'method': 'spearman_rank_correlation_with_average_ties',
                'matchedSourceCount': len(ranked_rows),
                'spearmanRho': round(rho, 6),
                'topDecileAgreement': {
                    'fraction': 0.10,
                    'comparedSourceCount': len(ranked_rows),
                    'selectedPerRanking': selected_count,
                    'overlapCount': len(overlap),
                    'recurrenceOnlyCount': len(recurrence_top - persistency_top),
                    'persistencyOnlyCount': len(persistency_top - recurrence_top),
                    'tieBreak': 'sourceId_ascending',
                },
            }

    status = 'available' if model_is_available and scored_by_id else 'not_available'
    limitations = [
        'This is a descriptive comparison within one pinned MARS snapshot, not independent model validation or a physical-emissions outcome.',
        'UNEP persistency is publisher metadata, not ground truth for a future leak, methane flux, repair, or mitigation.',
        'Missing or invalid persistency is excluded from rank comparisons; missing emission status is unknown, not zero emissions.',
        'The current snapshot does not provide point-in-time persistency values or a complete observation-opportunity panel for prospective validation.',
    ]
    if status == 'not_available':
        limitations.append('No usable recurrence estimate is available for this snapshot comparison.')

    return {
        'schemaVersion': 1,
        'status': status,
        'datasetSnapshotId': recurrence_model.get('datasetSnapshotId'),
        'inputFileSha256': recurrence_model.get('inputFileSha256'),
        'asOfDate': recurrence_model.get('datasetLastObservedDate'),
        'target': recurrence_model.get('target', TARGET),
        'horizonDays': recurrence_model.get('horizonDays', HORIZON_DAYS),
        'modelVersion': recurrence_model.get('modelVersion'),
        'realSourceCount': len(real_sources),
        'recurrencePredictionCount': len(scored_by_id),
        'invalidPredictionCount': invalid_prediction_count,
        'persistencyCoverage': {
            'numericReportedCount': persistency_numeric_count,
            'missingCount': persistency_missing_count,
            'invalidCount': persistency_invalid_count,
            'categoryReportedCount': len(real_sources) - category_missing_count,
            'categoryMissingCount': category_missing_count,
            'emissionStatusReportedCount': emission_status_reported_count,
            'emissionStatusMissingCount': len(real_sources) - emission_status_reported_count,
        },
        'probabilityByPersistencyCategory': category_rows,
        'numericPersistencyComparison': numeric_comparison,
        'limitations': limitations,
    }
