"""Predict recurrence of a linked MARS archive record, not future methane emissions.

The public MARS snapshot contains positive detection records, not a complete
sensor-opportunity panel. The target is therefore deliberately limited to
whether an already observed source receives another linked archive record.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
import math
import random
from statistics import mean, pstdev
from typing import Iterable, Mapping, Sequence


MODEL_VERSION = 'mars-linked-record-recurrence-logistic-v1'
FEATURE_VERSION = 'mars-linked-record-features-v1'
TARGET = 'at_least_one_future_linked_mars_detection_record'
HORIZON_DAYS = 365
TRAIN_ORIGINS = (date(2021, 9, 11), date(2022, 9, 11), date(2023, 9, 11))
CALIBRATION_ORIGIN = date(2024, 9, 11)
TEST_ORIGIN = date(2025, 9, 11)
MIN_TEST_RELEASE_LAG_DAYS = 30
BOOTSTRAP_REPLICATES = 400
BOOTSTRAP_SEED = 177
FEATURE_NAMES = (
    'log1p_linked_detection_dates_previous_365d',
    'log1p_linked_detection_dates_all_prior_history',
    'days_since_latest_linked_detection_capped_at_1095_over_365',
)
MODEL_OPTIMIZER = {
    'algorithm': 'batch_logistic_gradient_descent',
    'epochs': 1_800,
    'learningRate': 0.08,
    'l2Penalty': 0.03,
}
CALIBRATION_METHOD = 'platt_scaling'
CALIBRATION_REGULARIZATION = 'slope shrunk toward 1.0 with coefficient 0.01'
RELEASE_GATES = {
    'minimumTestSources': 500,
    'minimumTestPositiveLabels': 100,
    'minimumTestNegativeLabels': 100,
    'minimumRocAucLower95': 0.75,
    'maximumExpectedCalibrationError10': 0.10,
    'maximumExpectedCalibrationError10Upper95': 0.15,
    'minimumBrierSkillLower95': 0.10,
    'minimumTopDecileLiftLower95': 1.50,
    'baselineAucDeltaLower95': 0.0,
    'minimumBootstrapReplicates': 400,
    'minimumCountryClusters': 30,
}


@dataclass(frozen=True)
class ForecastExample:
    source_id: str
    origin_date: date
    features: tuple[float, float, float]
    label: int
    cluster_id: str = ''


def _as_date(value: date | str) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        return date.fromisoformat(value[:10])
    raise ValueError('Expected a date or ISO date string')


def extract_source_event_days(records: Iterable[Mapping]) -> dict[str, tuple[date, ...]]:
    """Return deduplicated UTC event dates from explicitly linked real sources."""
    result: dict[str, tuple[date, ...]] = {}
    for source in records:
        if not isinstance(source, Mapping):
            raise ValueError('Every recurrence source must be an object')
        source_id = source.get('sourceId')
        if not isinstance(source_id, str) or not source_id.strip():
            continue
        if source.get('synthetic') is True:
            continue
        if source.get('synthetic') is not False:
            raise ValueError(f'Source {source_id} must be explicitly marked non-synthetic')
        observations = source.get('observations')
        if not isinstance(observations, list):
            raise ValueError(f'Observations for {source_id} must be an array')
        seen_ids: dict[str, date] = {}
        days: set[date] = set()
        for observation in observations:
            if not isinstance(observation, Mapping):
                raise ValueError(f'Every observation for {source_id} must be an object')
            link_status = observation.get('linkStatus')
            if link_status == 'unlinked':
                continue
            if link_status != 'linked':
                raise ValueError(f'Observation for {source_id} must have an explicit linked or unlinked status')
            if observation.get('synthetic') is not False:
                raise ValueError(f'Linked observation for {source_id} must be explicitly non-synthetic')
            observed_source_id = observation.get('sourceId')
            if observed_source_id != source_id:
                raise ValueError(f'Linked observation for {source_id} is missing or has a mismatched sourceId')
            observation_id = observation.get('id') or observation.get('plumeId')
            raw_date = observation.get('date') or observation.get('tileDate')
            if not isinstance(observation_id, str) or not observation_id.strip():
                raise ValueError(f'Linked observation for {source_id} is missing its original identifier')
            if not isinstance(raw_date, str) or len(raw_date) < 10:
                raise ValueError(f'Linked observation for {source_id} is missing its original date')
            try:
                observed_day = date.fromisoformat(raw_date[:10])
            except ValueError as error:
                raise ValueError(f'Linked observation for {source_id} has an invalid date') from error
            if observation_id in seen_ids:
                if seen_ids[observation_id] != observed_day:
                    raise ValueError(f'Observation ID {observation_id} has conflicting detection dates')
                continue
            seen_ids[observation_id] = observed_day
            days.add(observed_day)
        if days:
            result[source_id] = tuple(sorted(days))
    return result


def extract_source_clusters(records: Iterable[Mapping]) -> dict[str, str]:
    """Use the reported country as a resampling cluster, never a model feature."""
    result = {}
    for source in records:
        source_id = source.get('sourceId')
        if source.get('synthetic') is True or not isinstance(source_id, str) or not source_id.strip():
            continue
        country = source.get('country')
        result[source_id] = country.strip() if isinstance(country, str) and country.strip() else source_id
    return result


def cohort_at_origin(
    events_by_source: Mapping[str, Sequence[date]],
    origin: date | str,
    horizon_days: int = HORIZON_DAYS,
    cluster_by_source: Mapping[str, str] | None = None,
) -> list[ForecastExample]:
    """Build point-in-time examples; future dates can affect labels only."""
    origin_date = _as_date(origin)
    if not isinstance(horizon_days, int) or horizon_days < 1:
        raise ValueError('horizon_days must be a positive integer')
    horizon_end = origin_date + timedelta(days=horizon_days)
    lookback_start = origin_date - timedelta(days=horizon_days)
    examples = []
    for source_id in sorted(events_by_source):
        days = tuple(sorted({_as_date(day) for day in events_by_source[source_id]}))
        prior = tuple(day for day in days if day <= origin_date)
        if not prior:
            continue
        recent_count = sum(lookback_start < day <= origin_date for day in prior)
        latest_gap = (origin_date - prior[-1]).days
        label = int(any(origin_date < day <= horizon_end for day in days))
        examples.append(ForecastExample(
            source_id=source_id,
            origin_date=origin_date,
            features=(float(recent_count), float(len(prior)), float(latest_gap)),
            label=label,
            cluster_id=(cluster_by_source or {}).get(source_id, source_id),
        ))
    return examples


def _transformed_features(features: Sequence[float]) -> tuple[float, float, float]:
    if len(features) != 3:
        raise ValueError('The recurrence model requires exactly three versioned features')
    recent, history, days_since = (float(value) for value in features)
    if not all(math.isfinite(value) for value in (recent, history, days_since)) or min(recent, history, days_since) < 0:
        raise ValueError('Recurrence features must be finite, non-negative values')
    return math.log1p(recent), math.log1p(history), min(days_since / 365.0, 3.0)


def _sigmoid(value: float) -> float:
    if value >= 35:
        return 1.0 - 1e-15
    if value <= -35:
        return 1e-15
    return 1.0 / (1.0 + math.exp(-value))


def fit_logistic_model(
    examples: Sequence[ForecastExample],
    *,
    epochs: int = MODEL_OPTIMIZER['epochs'],
    learning_rate: float = MODEL_OPTIMIZER['learningRate'],
    l2_penalty: float = MODEL_OPTIMIZER['l2Penalty'],
) -> dict:
    """Fit deterministic, regularized logistic regression using standard Python."""
    labels = [int(example.label) for example in examples]
    if len(examples) < 4 or set(labels) != {0, 1}:
        raise ValueError('Training requires at least four examples and both outcome classes')
    if epochs < 1 or learning_rate <= 0 or l2_penalty < 0:
        raise ValueError('Invalid logistic optimization settings')
    transformed = [_transformed_features(example.features) for example in examples]
    means = [mean(row[index] for row in transformed) for index in range(3)]
    scales = [pstdev(row[index] for row in transformed) or 1.0 for index in range(3)]
    design = [[1.0] + [(row[index] - means[index]) / scales[index] for index in range(3)] for row in transformed]
    coefficients = [0.0, 0.0, 0.0, 0.0]
    count = len(examples)
    for _ in range(epochs):
        gradient = [0.0, 0.0, 0.0, 0.0]
        for row, label in zip(design, labels):
            error = _sigmoid(sum(weight * value for weight, value in zip(coefficients, row))) - label
            for index, value in enumerate(row):
                gradient[index] += error * value
        coefficients[0] -= learning_rate * gradient[0] / count
        for index in range(1, 4):
            coefficients[index] -= learning_rate * (gradient[index] / count + l2_penalty * coefficients[index])
    return {
        'modelVersion': MODEL_VERSION,
        'featureVersion': FEATURE_VERSION,
        'featureNames': list(FEATURE_NAMES),
        'means': [round(value, 12) for value in means],
        'scales': [round(value, 12) for value in scales],
        'intercept': round(coefficients[0], 12),
        'coefficients': [round(value, 12) for value in coefficients[1:]],
        'trainingSourceOriginRows': count,
        'trainingPositiveLabels': sum(labels),
        'optimizer': {
            'algorithm': MODEL_OPTIMIZER['algorithm'],
            'epochs': epochs,
            'learningRate': learning_rate,
            'l2Penalty': l2_penalty,
        },
    }


def base_logit(features: Sequence[float], model: Mapping) -> float:
    transformed = _transformed_features(features)
    return float(model['intercept']) + sum(
        float(coefficient) * ((value - float(center)) / float(scale))
        for coefficient, value, center, scale in zip(
            model['coefficients'], transformed, model['means'], model['scales']
        )
    )


def fit_platt_calibrator(logits: Sequence[float], labels: Sequence[int]) -> dict:
    """Fit a two-parameter logistic calibration map on a separate cohort."""
    if len(logits) != len(labels) or len(logits) < 4 or set(labels) != {0, 1}:
        raise ValueError('Calibration requires matching logits, at least four rows, and both outcome classes')
    if any(not math.isfinite(float(value)) for value in logits):
        raise ValueError('Calibration logits must be finite')
    intercept, slope = 0.0, 1.0
    for _ in range(3_000):
        intercept_gradient = 0.0
        slope_gradient = 0.0
        for logit, label in zip(logits, labels):
            error = _sigmoid(intercept + slope * float(logit)) - int(label)
            intercept_gradient += error
            slope_gradient += error * float(logit)
        size = len(labels)
        learning_rate = 0.03
        intercept -= learning_rate * intercept_gradient / size
        slope -= learning_rate * (slope_gradient / size + 0.01 * (slope - 1.0))
    if slope <= 0:
        raise ValueError('Calibration would reverse the risk ordering')
    return {
        'method': CALIBRATION_METHOD,
        'intercept': round(intercept, 12),
        'slope': round(slope, 12),
        'calibrationSourceOriginRows': len(labels),
        'calibrationPositiveLabels': sum(labels),
        'regularization': CALIBRATION_REGULARIZATION,
    }


def predict_probability(features: Sequence[float], model: Mapping, calibrator: Mapping) -> float:
    probability = _sigmoid(float(calibrator['intercept']) + float(calibrator['slope']) * base_logit(features, model))
    return min(1.0 - 1e-9, max(1e-9, probability))


def _roc_auc(labels: Sequence[int], scores: Sequence[float]) -> float:
    if len(labels) != len(scores) or not labels:
        raise ValueError('AUC requires equally sized, non-empty labels and scores')
    positives = sum(int(value) for value in labels)
    negatives = len(labels) - positives
    if positives == 0 or negatives == 0:
        return 0.5
    ordered = sorted(zip(scores, labels), key=lambda item: item[0])
    positive_rank_sum = 0.0
    index = 0
    while index < len(ordered):
        end = index + 1
        while end < len(ordered) and ordered[end][0] == ordered[index][0]:
            end += 1
        average_rank = ((index + 1) + end) / 2.0
        positive_rank_sum += sum(int(label) for _, label in ordered[index:end]) * average_rank
        index = end
    return (positive_rank_sum - positives * (positives + 1) / 2.0) / (positives * negatives)


def _precision_at_fraction(labels: Sequence[int], scores: Sequence[float], fraction: float = 0.10) -> tuple[float, float]:
    if len(labels) != len(scores) or not labels or not 0 < fraction <= 1:
        raise ValueError('Top-fraction precision requires matching non-empty inputs and a fraction in (0, 1]')
    requested = max(1, math.ceil(len(labels) * fraction))
    threshold = sorted(scores, reverse=True)[requested - 1]
    above = [index for index, score in enumerate(scores) if score > threshold]
    tied = [index for index, score in enumerate(scores) if score == threshold]
    tie_slots = requested - len(above)
    selected_positive = sum(int(labels[index]) for index in above)
    if tied:
        selected_positive += tie_slots * sum(int(labels[index]) for index in tied) / len(tied)
    precision = selected_positive / requested
    total_positive = sum(int(value) for value in labels)
    recall = selected_positive / total_positive if total_positive else 0.0
    return precision, recall


def summarize_binary_predictions(
    labels: Sequence[int],
    probabilities: Sequence[float],
    ranking_scores: Sequence[float] | None = None,
) -> dict:
    if len(labels) != len(probabilities) or not labels:
        raise ValueError('Metrics require equally sized, non-empty labels and probabilities')
    normalized_labels = [int(value) for value in labels]
    if any(value not in (0, 1) for value in normalized_labels):
        raise ValueError('Labels must be binary')
    normalized_probabilities = [float(value) for value in probabilities]
    if any(not math.isfinite(value) or not 0 <= value <= 1 for value in normalized_probabilities):
        raise ValueError('Probabilities must be finite and within [0, 1]')
    if ranking_scores is not None and len(ranking_scores) != len(labels):
        raise ValueError('Ranking score count must match labels')
    scores = normalized_probabilities if ranking_scores is None else [float(value) for value in ranking_scores]
    if any(not math.isfinite(value) for value in scores):
        raise ValueError('Ranking scores must be finite')
    prevalence = sum(normalized_labels) / len(normalized_labels)
    brier = mean((probability - label) ** 2 for probability, label in zip(normalized_probabilities, normalized_labels))
    order = sorted(range(len(labels)), key=lambda index: normalized_probabilities[index])
    ece = 0.0
    for bucket in range(10):
        indices = order[bucket * len(order) // 10:(bucket + 1) * len(order) // 10]
        if not indices:
            continue
        predicted = mean(normalized_probabilities[index] for index in indices)
        observed = mean(normalized_labels[index] for index in indices)
        ece += len(indices) / len(order) * abs(predicted - observed)
    precision, recall = _precision_at_fraction(normalized_labels, scores)
    return {
        'sourceCount': len(normalized_labels),
        'positiveCount': sum(normalized_labels),
        'prevalence': round(prevalence, 8),
        'rocAuc': round(_roc_auc(normalized_labels, scores), 8),
        'brierScore': round(brier, 8),
        'expectedCalibrationError10': round(ece, 8),
        'precisionAtTopDecile': round(precision, 8),
        'recallAtTopDecile': round(recall, 8),
        'liftAtTopDecile': round(precision / prevalence, 8) if prevalence else None,
    }


def _percentile_interval(values: Sequence[float]) -> dict:
    if not values:
        return {'lower95': None, 'upper95': None}
    ordered = sorted(values)
    lower = ordered[math.floor(0.025 * (len(ordered) - 1))]
    upper = ordered[math.ceil(0.975 * (len(ordered) - 1))]
    return {'lower95': round(lower, 8), 'upper95': round(upper, 8)}


def source_bootstrap_intervals(
    labels: Sequence[int],
    probabilities: Sequence[float],
    ranking_scores: Sequence[float],
    *,
    cluster_ids: Sequence[str] | None = None,
    baseline_scores: Sequence[float] | None = None,
    reference_probability: float | None = None,
    replicates: int = BOOTSTRAP_REPLICATES,
    seed: int = BOOTSTRAP_SEED,
) -> dict:
    """Percentile intervals from a seeded source-row or country-cluster bootstrap."""
    size = len(labels)
    if size == 0 or len(probabilities) != size or len(ranking_scores) != size:
        raise ValueError('Bootstrap inputs must have the same non-zero row count')
    if baseline_scores is not None and len(baseline_scores) != size:
        raise ValueError('Baseline score count must match labels')
    if reference_probability is not None and (not math.isfinite(reference_probability) or not 0 <= reference_probability <= 1):
        raise ValueError('Reference probability must be finite and within [0, 1]')
    if cluster_ids is not None and len(cluster_ids) != size:
        raise ValueError('Cluster ID count must match labels')
    if replicates < 20:
        raise ValueError('At least 20 bootstrap replicates are required')
    rng = random.Random(seed)
    values = {
        'rocAuc': [], 'brierScore': [], 'expectedCalibrationError10': [], 'precisionAtTopDecile': [],
        'liftAtTopDecile': [], 'rocAucDeltaVsBaseline': [], 'brierSkill': [],
    }
    if cluster_ids is None:
        clusters = {str(index): [index] for index in range(size)}
        resampling_unit = 'source_row'
    else:
        clusters: dict[str, list[int]] = {}
        for index, cluster_id in enumerate(cluster_ids):
            clusters.setdefault(str(cluster_id), []).append(index)
        resampling_unit = 'country_cluster'
    cluster_keys = sorted(clusters)
    if not cluster_keys:
        raise ValueError('Bootstrap requires at least one source cluster')
    for _ in range(replicates):
        selected_clusters = [cluster_keys[rng.randrange(len(cluster_keys))] for _ in range(len(cluster_keys))]
        indices = [index for cluster in selected_clusters for index in clusters[cluster]]
        sample_labels = [int(labels[index]) for index in indices]
        sample_probabilities = [float(probabilities[index]) for index in indices]
        sample_scores = [float(ranking_scores[index]) for index in indices]
        summary = summarize_binary_predictions(sample_labels, sample_probabilities, sample_scores)
        if 0 < summary['positiveCount'] < len(sample_labels):
            values['rocAuc'].append(summary['rocAuc'])
        values['brierScore'].append(summary['brierScore'])
        values['expectedCalibrationError10'].append(summary['expectedCalibrationError10'])
        values['precisionAtTopDecile'].append(summary['precisionAtTopDecile'])
        if summary['liftAtTopDecile'] is not None:
            values['liftAtTopDecile'].append(summary['liftAtTopDecile'])
        if baseline_scores is not None and 0 < summary['positiveCount'] < len(sample_labels):
            baseline = [float(baseline_scores[index]) for index in indices]
            values['rocAucDeltaVsBaseline'].append(summary['rocAuc'] - _roc_auc(sample_labels, baseline))
        if reference_probability is not None:
            reference_brier = mean((reference_probability - label) ** 2 for label in sample_labels)
            if reference_brier > 0:
                values['brierSkill'].append(1.0 - summary['brierScore'] / reference_brier)
    return {
        'metadata': {
            'method': 'percentile_cluster_bootstrap',
            'resamplingUnit': resampling_unit,
            'clusterCount': len(cluster_keys),
            'replicatesRequested': replicates,
            'seed': seed,
        },
        'confidenceIntervals95': {name: _percentile_interval(samples) for name, samples in values.items() if samples},
    }


def _unavailable(reason: str, metadata: Mapping) -> dict:
    return {
        'report': {
            'schemaVersion': 1,
            'modelVersion': MODEL_VERSION,
            'status': 'not_available',
            'target': TARGET,
            'horizonDays': HORIZON_DAYS,
            'reason': reason,
            **metadata,
        },
        'predictionsBySourceId': {},
    }


def evaluate_record_recurrence(
    records: Sequence[Mapping],
    *,
    retrieved_at: str,
    input_sha256: str,
    dataset_snapshot_id: str | None,
    bootstrap_replicates: int = BOOTSTRAP_REPLICATES,
) -> dict:
    """Train, calibrate, backtest, gate, and score one pinned real snapshot."""
    if len(input_sha256) != 64 or any(character not in '0123456789abcdef' for character in input_sha256):
        raise ValueError('input_sha256 must be a lowercase SHA-256 digest')
    retrieved_date = _as_date(retrieved_at)
    events = extract_source_event_days(records)
    cluster_by_source = extract_source_clusters(records)
    if not events:
        return _unavailable('The pinned snapshot has no linked real source-event dates.', {
            'datasetSnapshotId': dataset_snapshot_id,
            'inputFileSha256': input_sha256,
        })
    latest_event_date = max(max(days) for days in events.values())
    validation_end = CALIBRATION_ORIGIN + timedelta(days=HORIZON_DAYS)
    test_end = TEST_ORIGIN + timedelta(days=HORIZON_DAYS)
    metadata = {
        'datasetSnapshotId': dataset_snapshot_id,
        'inputFileSha256': input_sha256,
        'datasetLastObservedDate': latest_event_date.isoformat(),
        'retrievedAt': retrieved_at,
        'targetDefinition': 'At least one additional linked source detection date appears in the pinned MARS archive during (origin, origin + 365 days].',
        'observationSemantics': 'This is a prediction of archive-record recurrence, not methane presence, flux, a leak, a repair outcome, or emissions reduction.',
    }
    if latest_event_date < test_end:
        return _unavailable(f'The snapshot ends on {latest_event_date}; the complete final test horizon ends on {test_end}.', metadata)
    if retrieved_date < test_end + timedelta(days=MIN_TEST_RELEASE_LAG_DAYS):
        return _unavailable('The complete final test horizon has not passed the minimum 30-day public-release buffer.', metadata)

    training = [example for origin in TRAIN_ORIGINS for example in cohort_at_origin(events, origin, cluster_by_source=cluster_by_source)]
    validation = cohort_at_origin(events, CALIBRATION_ORIGIN, cluster_by_source=cluster_by_source)
    test = cohort_at_origin(events, TEST_ORIGIN, cluster_by_source=cluster_by_source)
    if len(training) < 300 or len(validation) < 500 or len(test) < RELEASE_GATES['minimumTestSources']:
        return _unavailable('One or more fixed temporal cohorts are too small for the registered model evaluation.', {
            **metadata,
            'cohortCounts': {'training': len(training), 'calibration': len(validation), 'test': len(test)},
        })
    if any({example.label for example in cohort} != {0, 1} for cohort in (training, validation, test)):
        return _unavailable('Each fixed temporal cohort must contain both recurrence outcomes.', metadata)

    model = fit_logistic_model(training)
    validation_logits = [base_logit(example.features, model) for example in validation]
    calibrator = fit_platt_calibrator(validation_logits, [example.label for example in validation])
    test_probabilities = [predict_probability(example.features, model, calibrator) for example in test]
    test_labels = [example.label for example in test]
    recent_baseline = [example.features[0] for example in test]
    test_metrics = summarize_binary_predictions(test_labels, test_probabilities)
    baseline_metrics = {
        'name': 'recent_365_day_linked_detection_dates',
        'rocAuc': round(_roc_auc(test_labels, recent_baseline), 8),
        'precisionAtTopDecile': round(_precision_at_fraction(test_labels, recent_baseline)[0], 8),
    }
    bootstrap = source_bootstrap_intervals(
        test_labels,
        test_probabilities,
        test_probabilities,
        cluster_ids=[example.cluster_id for example in test],
        baseline_scores=recent_baseline,
        reference_probability=sum(example.label for example in validation) / len(validation),
        replicates=bootstrap_replicates,
    )
    intervals = bootstrap['confidenceIntervals95']
    validation_prevalence = sum(example.label for example in validation) / len(validation)
    test_reference_brier = mean((validation_prevalence - label) ** 2 for label in test_labels)
    brier_skill = 1.0 - test_metrics['brierScore'] / test_reference_brier if test_reference_brier > 0 else None
    minimum_positive = RELEASE_GATES['minimumTestPositiveLabels']
    minimum_negative = RELEASE_GATES['minimumTestNegativeLabels']
    gates = {
        'minimumTestCohort': test_metrics['sourceCount'] >= RELEASE_GATES['minimumTestSources'],
        'minimumPositiveAndNegativeTestLabels': test_metrics['positiveCount'] >= minimum_positive and test_metrics['sourceCount'] - test_metrics['positiveCount'] >= minimum_negative,
        'rocAucLower95': intervals['rocAuc']['lower95'] >= RELEASE_GATES['minimumRocAucLower95'],
        'calibrationEce10': test_metrics['expectedCalibrationError10'] <= RELEASE_GATES['maximumExpectedCalibrationError10'],
        'calibrationEceUpper95': intervals['expectedCalibrationError10']['upper95'] <= RELEASE_GATES['maximumExpectedCalibrationError10Upper95'],
        'brierSkillLower95': intervals['brierSkill']['lower95'] >= RELEASE_GATES['minimumBrierSkillLower95'],
        'topDecileLiftLower95': intervals['liftAtTopDecile']['lower95'] >= RELEASE_GATES['minimumTopDecileLiftLower95'],
        'baselineAucDeltaLower95': intervals['rocAucDeltaVsBaseline']['lower95'] > RELEASE_GATES['baselineAucDeltaLower95'],
        'minimumBootstrapReplicates': bootstrap['metadata']['replicatesRequested'] >= RELEASE_GATES['minimumBootstrapReplicates'],
        'minimumCountryClusters': bootstrap['metadata']['clusterCount'] >= RELEASE_GATES['minimumCountryClusters'],
    }
    available = all(gates.values())
    predictions = {}
    if available:
        as_of_date = latest_event_date
        for source_id, days in events.items():
            prior = tuple(day for day in days if day <= as_of_date)
            if not prior:
                continue
            start = as_of_date - timedelta(days=HORIZON_DAYS)
            features = (
                float(sum(start < day <= as_of_date for day in prior)),
                float(len(prior)),
                float((as_of_date - prior[-1]).days),
            )
            predictions[source_id] = {
                'status': 'available',
                'modelVersion': MODEL_VERSION,
                'target': TARGET,
                'asOfDate': as_of_date.isoformat(),
                'horizonDays': HORIZON_DAYS,
                'probability': round(predict_probability(features, model, calibrator), 6),
            }
    report = {
        'schemaVersion': 1,
        'modelVersion': MODEL_VERSION,
        'status': 'historical_backtest_passed' if available else 'not_available',
        'target': TARGET,
        'horizonDays': HORIZON_DAYS,
        'featureVersion': FEATURE_VERSION,
        'featureNames': list(FEATURE_NAMES),
        'datasetSnapshotId': dataset_snapshot_id,
        'inputFileSha256': input_sha256,
        'datasetLastObservedDate': latest_event_date.isoformat(),
        'retrievedAt': retrieved_at,
        'trainingOrigins': [origin.isoformat() for origin in TRAIN_ORIGINS],
        'trainingSourceOriginRows': len(training),
        'trainingPositiveLabels': sum(example.label for example in training),
        'calibrationOrigin': CALIBRATION_ORIGIN.isoformat(),
        'calibrationWindowEnd': validation_end.isoformat(),
        'calibrationSourceCount': len(validation),
        'calibrationPositiveLabels': sum(example.label for example in validation),
        'calibrationMethod': calibrator,
        'testOrigin': TEST_ORIGIN.isoformat(),
        'testWindowEnd': test_end.isoformat(),
        'testCohort': test_metrics,
        'testBrierReference': {
            'probabilityFromCalibrationCohort': round(validation_prevalence, 8),
            'brierScore': round(test_reference_brier, 8),
            'brierSkillScore': round(brier_skill, 8) if brier_skill is not None else None,
        },
        'confidenceIntervals95': intervals,
        'bootstrap': bootstrap['metadata'],
        'baselineComparison': baseline_metrics,
        'releaseGates': RELEASE_GATES,
        'releaseGateResults': gates,
        'evaluationRole': 'retrospective_temporal_development_holdout; a prospective follow-up is still required before operational use',
        'modelParameters': model,
        'limitations': [
            'The target is another linked MARS archive record for a known source, not active methane, future flux, leak recurrence, repair, or mitigation.',
            'MARS does not publish a complete per-source sensor-opportunity panel in this snapshot; no-record periods may reflect acquisition, cloud, daylight, detectability, attribution, or publication limits.',
            'A future archive record is not proof that the source emitted methane continuously between observations.',
            'The final temporal fold is a retrospective development holdout from the same UNEP MARS snapshot, not an external dataset or prospective evaluation.',
            'The score is suitable only as research triage context; a human must inspect current evidence before action.',
        ],
        'predictionsScoredAsOfDate': latest_event_date.isoformat() if available else None,
        'predictionSourceCount': len(predictions),
    }
    return {'report': report, 'predictionsBySourceId': predictions}
