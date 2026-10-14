"""Freeze and evaluate a future MARS linked-record recurrence cohort.

This workflow predicts subsequent linked MARS observation dates for known
sources. It never labels an absent record as zero methane or confirmed repair.
The frozen ledger contains no future outcome labels and refuses replacement.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import math
import os
import tempfile
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Mapping, Sequence

from record_recurrence import (
    BOOTSTRAP_REPLICATES,
    BOOTSTRAP_SEED,
    CALIBRATION_METHOD,
    CALIBRATION_REGULARIZATION,
    FEATURE_NAMES,
    FEATURE_VERSION,
    HORIZON_DAYS,
    MIN_TEST_RELEASE_LAG_DAYS,
    MODEL_OPTIMIZER,
    MODEL_VERSION,
    RELEASE_GATES,
    TARGET,
    extract_source_event_days,
    extract_source_clusters,
    predict_probability,
    source_bootstrap_intervals,
    summarize_binary_predictions,
)


ROOT = Path(__file__).resolve().parents[2]
LEDGER_KIND = 'prospective_mars_record_recurrence_ledger'
EVALUATION_KIND = 'prospective_mars_record_recurrence_evaluation'
BASELINE_NAME = 'recent_365_day_linked_detection_dates'
CODE_HASH_KEYS = ('recordRecurrence', 'buildIntelligence', 'prospectiveRecurrence')


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _require_sha256(value, field: str) -> str:
    if not isinstance(value, str) or len(value) != 64 or any(character not in '0123456789abcdef' for character in value):
        raise ValueError(f'{field} must be a lowercase SHA-256 digest')
    return value


def _canonical_bytes(value) -> bytes:
    try:
        return json.dumps(
            value,
            sort_keys=True,
            separators=(',', ':'),
            ensure_ascii=False,
            allow_nan=False,
        ).encode('utf-8')
    except (TypeError, ValueError) as error:
        raise ValueError(f'Value cannot be canonically serialized: {error}') from error


def _timestamp_date(value, field: str) -> date:
    if not isinstance(value, str) or not value:
        raise ValueError(f'{field} must be a timezone-aware ISO timestamp')
    try:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError as error:
        raise ValueError(f'{field} must be a timezone-aware ISO timestamp') from error
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError(f'{field} must include a timezone offset')
    return parsed.astimezone(timezone.utc).date()


def _snapshot_bytes(raw_bytes: bytes) -> dict:
    try:
        decoded = gzip.decompress(raw_bytes) if raw_bytes[:2] == b'\x1f\x8b' else raw_bytes
        payload = json.loads(decoded.decode('utf-8'))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError(f'Snapshot must be valid JSON or gzip-compressed JSON: {error}') from error
    if not isinstance(payload, dict):
        raise ValueError('Snapshot root must be a JSON object')
    return payload


def _source_context(snapshot: Mapping) -> tuple[dict[str, Mapping], dict[str, tuple[date, ...]], dict[str, str]]:
    sources = snapshot.get('sources')
    if not isinstance(sources, list):
        raise ValueError('Snapshot must contain a sources array')
    source_by_id: dict[str, Mapping] = {}
    event_records = []
    for source in sources:
        if not isinstance(source, Mapping):
            raise ValueError('Every snapshot source must be an object')
        source_id = source.get('sourceId')
        if not isinstance(source_id, str) or not source_id.strip():
            raise ValueError('Every snapshot source must preserve a non-empty sourceId')
        if source_id in source_by_id:
            raise ValueError(f'Snapshot contains duplicate sourceId {source_id}')
        if source.get('synthetic') is not False:
            raise ValueError(f'Source {source_id} must be explicitly marked non-synthetic')
        source_by_id[source_id] = source
        observations = source.get('observations')
        if not isinstance(observations, list):
            raise ValueError(f'Observations for {source_id} must be an array')
        linked = []
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
            identifier = observation.get('id') or observation.get('plumeId')
            if not isinstance(identifier, str) or not identifier.strip():
                raise ValueError(f'Linked observation for {source_id} is missing its original identifier')
            observed_source_id = observation.get('sourceId')
            if observed_source_id != source_id:
                raise ValueError(f'Linked observation for {source_id} is missing or has a mismatched sourceId')
            raw_date = observation.get('date') or observation.get('tileDate')
            if not isinstance(raw_date, str) or len(raw_date) < 10:
                raise ValueError(f'Linked observation for {source_id} is missing its original date')
            try:
                date.fromisoformat(raw_date[:10])
            except ValueError as error:
                raise ValueError(f'Linked observation for {source_id} has an invalid date') from error
            linked.append(observation)
        event_records.append({
            'sourceId': source_id,
            'country': source.get('country'),
            'synthetic': False,
            'observations': linked,
        })
    return (
        source_by_id,
        extract_source_event_days(event_records),
        extract_source_clusters(event_records),
    )


def _finite_metric(value, field: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f'{field} must be a finite numeric metric')
    return float(value)


def _integer_metric(value, field: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise ValueError(f'{field} must be a non-negative integer metric')
    return value


def _bounded_metric(value, field: str, lower: float, upper: float) -> float:
    metric = _finite_metric(value, field)
    if not lower <= metric <= upper:
        label = {
            'testCohort.rocAuc': 'Historical ROC AUC',
            'testCohort.expectedCalibrationError10': 'Historical calibration error (ECE10)',
        }.get(field, field)
        raise ValueError(f'{label} must be within [{lower}, {upper}]')
    return metric


def _validate_interval(
    confidence_intervals: Mapping,
    metric: str,
    *,
    lower_bound: float,
    upper_bound: float,
    point_estimate: float,
) -> tuple[float, float]:
    label = {
        'rocAuc': 'ROC AUC',
        'expectedCalibrationError10': 'calibration error (ECE10)',
        'brierSkill': 'Brier skill',
        'liftAtTopDecile': 'top-decile lift',
        'rocAucDeltaVsBaseline': 'ROC AUC baseline delta',
        'brierScore': 'Brier score',
        'precisionAtTopDecile': 'top-decile precision',
    }.get(metric, metric)
    interval = confidence_intervals.get(metric)
    if not isinstance(interval, Mapping):
        raise ValueError(f'Historical confidence interval for {metric} is required')
    lower = _finite_metric(interval.get('lower95'), f'confidenceIntervals95.{metric}.lower95')
    upper = _finite_metric(interval.get('upper95'), f'confidenceIntervals95.{metric}.upper95')
    if not lower_bound <= lower <= upper_bound or not lower_bound <= upper <= upper_bound:
        raise ValueError(f'Historical {label} interval is outside its valid domain')
    if lower > upper:
        raise ValueError(f'Historical confidence interval bounds for {label} are reversed')
    if point_estimate < lower - 1e-6 or point_estimate > upper + 1e-6:
        raise ValueError(f'Historical confidence interval bounds for {label} do not contain the point estimate')
    return lower, upper


def _validate_historical_model_evidence(report: Mapping) -> dict:
    if report.get('modelVersion') != MODEL_VERSION:
        raise ValueError('Historical report model version does not match the registered implementation')
    if report.get('featureVersion') != FEATURE_VERSION:
        raise ValueError('Historical report feature version does not match the registered implementation')
    expected_feature_names = list(FEATURE_NAMES)
    if report.get('featureNames') != expected_feature_names:
        raise ValueError('Historical report feature names do not match the registered implementation')

    model_parameters = report.get('modelParameters')
    if not isinstance(model_parameters, Mapping):
        raise ValueError('Frozen model parameters are required for reproducibility')
    if (
        model_parameters.get('modelVersion') != MODEL_VERSION
        or model_parameters.get('featureVersion') != FEATURE_VERSION
        or model_parameters.get('featureNames') != expected_feature_names
    ):
        raise ValueError('Historical report model parameters do not match the registered model and features')
    optimizer = model_parameters.get('optimizer')
    if not isinstance(optimizer, Mapping) or dict(optimizer) != MODEL_OPTIMIZER:
        raise ValueError('Historical report model optimizer settings do not match the registered implementation')
    for field in ('means', 'scales', 'coefficients'):
        values = model_parameters.get(field)
        if not isinstance(values, list) or len(values) != len(FEATURE_NAMES):
            raise ValueError(f'Model parameter {field} must match the registered feature count')
        for index, value in enumerate(values):
            _finite_metric(value, f'modelParameters.{field}[{index}]')
    if any(value <= 0 for value in model_parameters['scales']):
        raise ValueError('Model feature scales must be positive')
    if any(value < 0 or value > 50 for value in model_parameters['means']):
        raise ValueError('Model feature means are outside the registered feature domain')
    if (
        any(value > 50 for value in model_parameters['scales'])
        or model_parameters['means'][2] > 3
        or model_parameters['scales'][2] > 1.5
    ):
        raise ValueError('Model feature scales are outside the registered feature domain')
    if any(abs(value) > 100 for value in model_parameters['coefficients']):
        raise ValueError('Model coefficients are outside the supported numeric domain')
    _bounded_metric(model_parameters.get('intercept'), 'modelParameters.intercept', -100, 100)
    training_count = _integer_metric(report.get('trainingSourceOriginRows'), 'trainingSourceOriginRows')
    training_positive = _integer_metric(report.get('trainingPositiveLabels'), 'trainingPositiveLabels')
    if training_count <= 0 or not 0 < training_positive < training_count:
        raise ValueError('Historical training counts must include positive and negative labels')
    if (
        model_parameters.get('trainingSourceOriginRows') != training_count
        or model_parameters.get('trainingPositiveLabels') != training_positive
    ):
        raise ValueError('Historical model training counts do not match the report training counts')

    calibration = report.get('calibrationMethod')
    if not isinstance(calibration, Mapping):
        raise ValueError('Frozen calibration metadata is required for reproducibility')
    if calibration.get('method') != CALIBRATION_METHOD:
        raise ValueError('Historical calibration method does not match the registered implementation')
    if calibration.get('regularization') != CALIBRATION_REGULARIZATION:
        raise ValueError('Historical calibration regularization does not match the registered implementation')
    calibration_count = _integer_metric(report.get('calibrationSourceCount'), 'calibrationSourceCount')
    calibration_positive = _integer_metric(report.get('calibrationPositiveLabels'), 'calibrationPositiveLabels')
    embedded_calibration_count = _integer_metric(
        calibration.get('calibrationSourceOriginRows'), 'calibrationMethod.calibrationSourceOriginRows'
    )
    embedded_calibration_positive = _integer_metric(
        calibration.get('calibrationPositiveLabels'), 'calibrationMethod.calibrationPositiveLabels'
    )
    if (
        calibration_count <= 0
        or not 0 < calibration_positive < calibration_count
        or embedded_calibration_count != calibration_count
        or embedded_calibration_positive != calibration_positive
    ):
        raise ValueError('Historical calibration counts do not match or include both outcome labels')
    _finite_metric(calibration.get('intercept'), 'calibrationMethod.intercept')
    calibration_slope = _finite_metric(calibration.get('slope'), 'calibrationMethod.slope')
    if calibration_slope <= 0:
        raise ValueError('Historical calibration slope must be positive')

    expected_role = 'retrospective_temporal_development_holdout; a prospective follow-up is still required before operational use'
    if report.get('evaluationRole') != expected_role:
        raise ValueError('Historical evaluation role must remain explicitly retrospective')

    release_gates = report.get('releaseGates')
    if not isinstance(release_gates, Mapping) or dict(release_gates) != RELEASE_GATES:
        raise ValueError('Historical release gates do not match the preregistered thresholds')
    test_cohort = report.get('testCohort')
    if not isinstance(test_cohort, Mapping):
        raise ValueError('Historical release-gate test metrics are required')
    source_count = _integer_metric(test_cohort.get('sourceCount'), 'testCohort.sourceCount')
    positive_count = _integer_metric(test_cohort.get('positiveCount'), 'testCohort.positiveCount')
    if source_count <= 0 or not 0 < positive_count < source_count:
        raise ValueError('Historical test cohort must contain positive and negative outcomes')
    prevalence = _bounded_metric(test_cohort.get('prevalence'), 'testCohort.prevalence', 0, 1)
    if abs(prevalence - positive_count / source_count) > 1e-6:
        raise ValueError('Historical test prevalence does not match the reported outcome counts')
    roc_auc = _bounded_metric(test_cohort.get('rocAuc'), 'testCohort.rocAuc', 0, 1)
    brier_score = _bounded_metric(test_cohort.get('brierScore'), 'testCohort.brierScore', 0, 1)
    ece = _bounded_metric(test_cohort.get('expectedCalibrationError10'), 'testCohort.expectedCalibrationError10', 0, 1)
    precision = _bounded_metric(test_cohort.get('precisionAtTopDecile'), 'testCohort.precisionAtTopDecile', 0, 1)
    recall = _bounded_metric(test_cohort.get('recallAtTopDecile'), 'testCohort.recallAtTopDecile', 0, 1)
    maximum_lift = min(10.0, 1 / prevalence)
    lift = _bounded_metric(test_cohort.get('liftAtTopDecile'), 'testCohort.liftAtTopDecile', 0, maximum_lift)
    if abs(lift - precision / prevalence) > 1e-6:
        raise ValueError('Historical top-decile lift does not match precision and prevalence')
    expected_recall = precision * math.ceil(source_count * 0.10) / positive_count
    if abs(recall - expected_recall) > 1e-6:
        raise ValueError('Historical top-decile recall does not match precision and cohort counts')

    calibration_prevalence = calibration_positive / calibration_count
    brier_reference = report.get('testBrierReference')
    if not isinstance(brier_reference, Mapping):
        raise ValueError('Historical Brier reference metrics are required')
    reference_probability = _bounded_metric(
        brier_reference.get('probabilityFromCalibrationCohort'),
        'testBrierReference.probabilityFromCalibrationCohort', 0, 1,
    )
    if abs(reference_probability - calibration_prevalence) > 1e-6:
        raise ValueError('Historical Brier reference probability does not match calibration prevalence')
    expected_reference_brier = (
        reference_probability ** 2 * (1 - prevalence)
        + (1 - reference_probability) ** 2 * prevalence
    )
    recorded_reference_brier = _bounded_metric(
        brier_reference.get('brierScore'), 'testBrierReference.brierScore', 0, 1,
    )
    if abs(recorded_reference_brier - expected_reference_brier) > 1e-6:
        raise ValueError('Historical Brier reference score does not match test outcomes and calibration prevalence')
    brier_skill = _finite_metric(brier_reference.get('brierSkillScore'), 'testBrierReference.brierSkillScore')
    expected_brier_skill = 1 - brier_score / recorded_reference_brier if recorded_reference_brier > 0 else None
    if expected_brier_skill is None or abs(brier_skill - expected_brier_skill) > 1e-6:
        raise ValueError('Historical Brier skill does not match model and reference Brier scores')

    baseline = report.get('baselineComparison')
    if not isinstance(baseline, Mapping) or baseline.get('name') != BASELINE_NAME:
        raise ValueError('Historical comparison must identify the registered rules baseline')
    baseline_auc = _bounded_metric(baseline.get('rocAuc'), 'baselineComparison.rocAuc', 0, 1)
    _bounded_metric(baseline.get('precisionAtTopDecile'), 'baselineComparison.precisionAtTopDecile', 0, 1)
    confidence_intervals = report.get('confidenceIntervals95')
    if not isinstance(confidence_intervals, Mapping):
        raise ValueError('Historical confidence intervals are required to verify release gates')

    roc_auc_interval = _validate_interval(
        confidence_intervals, 'rocAuc', lower_bound=0, upper_bound=1, point_estimate=roc_auc,
    )
    ece_interval = _validate_interval(
        confidence_intervals, 'expectedCalibrationError10', lower_bound=0, upper_bound=1, point_estimate=ece,
    )
    brier_skill_interval = _validate_interval(
        confidence_intervals,
        'brierSkill',
        lower_bound=1 - 1 / recorded_reference_brier,
        upper_bound=1,
        point_estimate=brier_skill,
    )
    lift_interval = _validate_interval(
        confidence_intervals, 'liftAtTopDecile', lower_bound=0, upper_bound=10, point_estimate=lift,
    )
    auc_delta = roc_auc - baseline_auc
    auc_delta_interval = _validate_interval(
        confidence_intervals, 'rocAucDeltaVsBaseline', lower_bound=-1, upper_bound=1, point_estimate=auc_delta,
    )
    _validate_interval(
        confidence_intervals, 'brierScore', lower_bound=0, upper_bound=1,
        point_estimate=brier_score,
    )
    _validate_interval(
        confidence_intervals, 'precisionAtTopDecile', lower_bound=0, upper_bound=1,
        point_estimate=precision,
    )

    bootstrap = report.get('bootstrap')
    if not isinstance(bootstrap, Mapping):
        raise ValueError('Historical bootstrap metadata is required to verify release gates')
    requested_replicates = _integer_metric(bootstrap.get('replicatesRequested'), 'bootstrap.replicatesRequested')
    cluster_count = _integer_metric(bootstrap.get('clusterCount'), 'bootstrap.clusterCount')
    bootstrap_seed = _integer_metric(bootstrap.get('seed'), 'bootstrap.seed')
    if bootstrap_seed != BOOTSTRAP_SEED:
        raise ValueError('Historical bootstrap seed does not match the registered bootstrap seed')
    if not 1 <= cluster_count <= source_count:
        raise ValueError('Historical bootstrap cluster count must be between one and the test source count')
    if bootstrap.get('method') != 'percentile_cluster_bootstrap' or bootstrap.get('resamplingUnit') != 'country_cluster':
        raise ValueError('Historical bootstrap method and resampling unit must match the registered evaluation')
    expected_results = {
        'minimumTestCohort': source_count >= RELEASE_GATES['minimumTestSources'],
        'minimumPositiveAndNegativeTestLabels': (
            positive_count >= RELEASE_GATES['minimumTestPositiveLabels']
            and source_count - positive_count >= RELEASE_GATES['minimumTestNegativeLabels']
        ),
        'rocAucLower95': roc_auc_interval[0] >= RELEASE_GATES['minimumRocAucLower95'],
        'calibrationEce10': ece <= RELEASE_GATES['maximumExpectedCalibrationError10'],
        'calibrationEceUpper95': ece_interval[1] <= RELEASE_GATES['maximumExpectedCalibrationError10Upper95'],
        'brierSkillLower95': brier_skill_interval[0] >= RELEASE_GATES['minimumBrierSkillLower95'],
        'topDecileLiftLower95': lift_interval[0] >= RELEASE_GATES['minimumTopDecileLiftLower95'],
        'baselineAucDeltaLower95': auc_delta_interval[0] > RELEASE_GATES['baselineAucDeltaLower95'],
        'minimumBootstrapReplicates': requested_replicates >= RELEASE_GATES['minimumBootstrapReplicates'],
        'minimumCountryClusters': cluster_count >= RELEASE_GATES['minimumCountryClusters'],
    }
    recorded_results = report.get('releaseGateResults')
    if not isinstance(recorded_results, Mapping) or dict(recorded_results) != expected_results:
        raise ValueError('Historical release-gate results do not match the reported metrics and thresholds')
    if not all(expected_results.values()):
        raise ValueError('Historical release-gate metrics do not pass every preregistered threshold')
    return dict(expected_results)


def _snapshot_provenance(snapshot: Mapping) -> dict:
    provenance = snapshot.get('provenance')
    if not isinstance(provenance, Mapping):
        raise ValueError('Snapshot must preserve publisher provenance')
    snapshot_id = snapshot.get('snapshotId')
    if not isinstance(snapshot_id, str) or not snapshot_id:
        raise ValueError('Snapshot must contain a stable snapshotId')
    if provenance.get('snapshotId') != snapshot_id:
        raise ValueError('Top-level and provenance snapshotId values do not match')
    archive_sha256 = _require_sha256(provenance.get('archiveSha256'), 'provenance.archiveSha256')
    retrieved_at = provenance.get('retrievedAt')
    retrieved_date = _timestamp_date(retrieved_at, 'provenance.retrievedAt')
    provider = provenance.get('provider')
    dataset = provenance.get('dataset')
    if not isinstance(provider, str) or not provider or not isinstance(dataset, str) or not dataset:
        raise ValueError('Publisher provider and dataset provenance are required')
    return {
        'snapshotId': snapshot_id,
        'archiveSha256': archive_sha256,
        'retrievedAt': retrieved_at,
        'retrievedDate': retrieved_date,
        'provider': provider,
        'dataset': dataset,
        'license': provenance.get('license'),
    }


def build_frozen_ledger(
    snapshot_bytes: bytes,
    intelligence: Mapping,
    *,
    registered_at: str,
    code_sha256: Mapping[str, str],
) -> dict:
    """Create a label-free prospective ledger bound to exact inputs and code."""
    if not isinstance(snapshot_bytes, bytes) or not snapshot_bytes:
        raise ValueError('snapshot_bytes must be non-empty bytes')
    if not isinstance(intelligence, Mapping):
        raise ValueError('intelligence must be a JSON object')
    if not isinstance(code_sha256, Mapping) or set(code_sha256) != set(CODE_HASH_KEYS):
        raise ValueError(f'code_sha256 must contain exactly: {", ".join(CODE_HASH_KEYS)}')
    code_hashes = {key: _require_sha256(code_sha256[key], f'code_sha256.{key}') for key in CODE_HASH_KEYS}
    registered_date = _timestamp_date(registered_at, 'registered_at')
    input_sha256 = _sha256(snapshot_bytes)
    report = intelligence.get('recordRecurrenceModel')
    if not isinstance(report, Mapping):
        raise ValueError('Intelligence artifact has no recurrence model report')
    if input_sha256 != intelligence.get('inputFileSha256') or input_sha256 != report.get('inputFileSha256'):
        raise ValueError('Snapshot SHA-256 does not match the intelligence input hash')
    snapshot = _snapshot_bytes(snapshot_bytes)
    if snapshot.get('truncated') is not False:
        raise ValueError('Only a complete, explicitly non-truncated MARS snapshot can be frozen')
    provenance = _snapshot_provenance(snapshot)
    source_provenance = intelligence.get('sourceProvenance')
    if not isinstance(source_provenance, Mapping) or dict(source_provenance) != dict(snapshot.get('provenance', {})):
        raise ValueError('Intelligence source provenance does not match the pinned snapshot provenance')
    if provenance['provider'] != 'UNEP International Methane Emissions Observatory (IMEO)':
        raise ValueError('Only publisher-attributed UNEP IMEO MARS snapshots can be frozen')
    if registered_date < provenance['retrievedDate']:
        raise ValueError('registered_at cannot precede the pinned snapshot retrieval date')
    if intelligence.get('generatedAt') != provenance['retrievedAt']:
        raise ValueError('Intelligence generatedAt must match the pinned snapshot retrieval timestamp')

    if intelligence.get('datasetSnapshotId') != provenance['snapshotId'] or report.get('datasetSnapshotId') != provenance['snapshotId']:
        raise ValueError('Snapshot IDs do not match the intelligence model binding')
    if intelligence.get('upstreamArchiveSha256') != provenance['archiveSha256']:
        raise ValueError('Publisher archive hash does not match the intelligence provenance')
    if report.get('retrievedAt') != provenance['retrievedAt']:
        raise ValueError('Model retrieval timestamp does not match the publisher snapshot')
    if report.get('status') != 'historical_backtest_passed' or report.get('target') != TARGET:
        raise ValueError('Only a historically gated archive-record recurrence model can be frozen')
    if report.get('horizonDays') != HORIZON_DAYS:
        raise ValueError('Model horizon does not match the registered recurrence horizon')
    gate_results = _validate_historical_model_evidence(report)
    if not isinstance(report.get('calibrationMethod'), Mapping):
        raise ValueError('Frozen calibration metadata is required for reproducibility')

    source_by_id, events_by_source, clusters = _source_context(snapshot)
    if _integer_metric(intelligence.get('sourceCount'), 'intelligence.sourceCount') != len(source_by_id):
        raise ValueError('Intelligence source count does not match the pinned snapshot source count')
    if not events_by_source:
        raise ValueError('Snapshot has no explicitly linked real source observation dates')
    as_of_date = max(max(days) for days in events_by_source.values())
    if report.get('datasetLastObservedDate') != as_of_date.isoformat():
        raise ValueError('Model as-of date does not match the latest linked observation in the snapshot')
    if report.get('predictionsScoredAsOfDate') != as_of_date.isoformat():
        raise ValueError('Model predictions were not scored at the registered as-of date')

    intelligence_sources = intelligence.get('sources')
    if not isinstance(intelligence_sources, list):
        raise ValueError('Intelligence artifact must contain source predictions')
    if len(intelligence_sources) != len(source_by_id):
        raise ValueError('Intelligence source rows do not match the pinned snapshot source count')
    predictions_by_id: dict[str, Mapping] = {}
    intelligence_source_ids = set()
    for item in intelligence_sources:
        if not isinstance(item, Mapping):
            raise ValueError('Every intelligence source row must be an object')
        source_id = item.get('sourceId')
        if not isinstance(source_id, str) or source_id not in source_by_id or source_id in intelligence_source_ids:
            raise ValueError('Intelligence source IDs must match the pinned snapshot without duplicates')
        intelligence_source_ids.add(source_id)
        forecast = item.get('recordRecurrenceForecast')
        if forecast is None:
            continue
        if not isinstance(source_id, str) or not isinstance(forecast, Mapping):
            raise ValueError('Every recurrence prediction must preserve its sourceId')
        if source_id in predictions_by_id:
            raise ValueError(f'Intelligence artifact contains duplicate prediction for {source_id}')
        predictions_by_id[source_id] = forecast
    if intelligence_source_ids != set(source_by_id):
        raise ValueError('Intelligence source IDs do not exactly match the pinned snapshot')
    if set(predictions_by_id) != set(events_by_source):
        raise ValueError('Predicted source IDs do not exactly match sources with linked observation history')
    if report.get('predictionSourceCount') != len(predictions_by_id):
        raise ValueError('Prediction count does not match the recurrence report')

    recent_start = as_of_date - timedelta(days=HORIZON_DAYS)
    predictions = []
    for source_id in sorted(events_by_source):
        forecast = predictions_by_id[source_id]
        if forecast.get('status') != 'available' or forecast.get('target') != TARGET:
            raise ValueError(f'Prediction for {source_id} is not an available archive-record recurrence estimate')
        if forecast.get('modelVersion') != report.get('modelVersion'):
            raise ValueError(f'Prediction for {source_id} uses a different model version')
        if forecast.get('asOfDate') != as_of_date.isoformat():
            raise ValueError(f'Prediction cutoff for {source_id} does not match the registered as-of date')
        if forecast.get('horizonDays') != HORIZON_DAYS:
            raise ValueError(f'Prediction horizon for {source_id} does not match the registered horizon')
        probability = forecast.get('probability')
        if isinstance(probability, bool) or not isinstance(probability, (int, float)) or not math.isfinite(probability) or not 0 <= probability <= 1:
            raise ValueError(f'Prediction probability for {source_id} is not finite within [0, 1]')
        source_days = events_by_source[source_id]
        recent_date_count = sum(recent_start < observed_day <= as_of_date for observed_day in source_days)
        features = (
            float(recent_date_count),
            float(len(source_days)),
            float((as_of_date - source_days[-1]).days),
        )
        expected_probability = round(
            predict_probability(features, report['modelParameters'], report['calibrationMethod']), 6
        )
        if round(float(probability), 6) != expected_probability:
            raise ValueError(f'Prediction for {source_id} does not match the frozen model and calibrator')
        predictions.append({
            'sourceId': source_id,
            'countryCluster': clusters.get(source_id) or source_id,
            'probability': expected_probability,
            'baselineRecentDetectionDateCount': recent_date_count,
        })

    calibration_count = report.get('calibrationSourceCount')
    calibration_positive = report.get('calibrationPositiveLabels')
    if not isinstance(calibration_count, int) or calibration_count <= 0 or not isinstance(calibration_positive, int) or not 0 <= calibration_positive <= calibration_count:
        raise ValueError('Calibration prevalence cannot be reconstructed from the historical report')
    model_specification = {
        'modelVersion': report['modelVersion'],
        'target': TARGET,
        'featureVersion': report['featureVersion'],
        'featureNames': report['featureNames'],
        'horizonDays': HORIZON_DAYS,
        'modelParameters': report['modelParameters'],
        'calibrationMethod': report['calibrationMethod'],
        'calibrationPrevalence': round(calibration_positive / calibration_count, 8),
        'baselineName': BASELINE_NAME,
        'historicalEvaluation': {
            'role': report.get('evaluationRole'),
            'testOrigin': report.get('testOrigin'),
            'testWindowEnd': report.get('testWindowEnd'),
            'testCohort': report.get('testCohort'),
            'releaseGates': report.get('releaseGates'),
            'releaseGateResults': gate_results,
        },
        'codeSha256': code_hashes,
    }
    model_specification_sha256 = _sha256(_canonical_bytes(model_specification))
    predictions_sha256 = _sha256(_canonical_bytes(predictions))
    return {
        'schemaVersion': 1,
        'kind': LEDGER_KIND,
        'state': 'frozen_pending_outcomes',
        'registeredAt': registered_at,
        'target': TARGET,
        'targetDefinition': 'At least one explicitly linked MARS source detection date is present after the as-of date and within the next 365 days in a later complete publisher snapshot.',
        'interpretation': 'The outcome is a later linked archive observation for a known source. It is not a methane-presence, leak, flux, repair, mitigation, or emissions-reduction outcome.',
        'baseline': {
            'provider': provenance['provider'],
            'dataset': provenance['dataset'],
            'license': provenance['license'],
            'datasetSnapshotId': provenance['snapshotId'],
            'publisherArchiveSha256': provenance['archiveSha256'],
            'inputSnapshotSha256': input_sha256,
            'retrievedAt': provenance['retrievedAt'],
            'datasetLastObservedDate': as_of_date.isoformat(),
        },
        'modelSpecification': model_specification,
        'modelSpecificationSha256': model_specification_sha256,
        'forecastWindow': {
            'startExclusive': as_of_date.isoformat(),
            'endInclusive': (as_of_date + timedelta(days=HORIZON_DAYS)).isoformat(),
            'horizonDays': HORIZON_DAYS,
        },
        'predictionCount': len(predictions),
        'predictions': predictions,
        'predictionsSha256': predictions_sha256,
        'limitations': [
            'This registration preserves a prospective evaluation cohort; it does not establish predictive accuracy.',
            'MARS does not provide a complete per-source observation-opportunity denominator, so no future archive record is not evidence of zero methane.',
            'Sources absent from a later snapshot are unknown and must not be scored as negative outcomes.',
            'Backfilled records dated on or before the frozen as-of date are excluded from the prospective outcome window.',
            'The historical development holdout uses the same publisher dataset and is not an independent prospective result.',
        ],
    }


def _serialize_ledger(value: Mapping) -> bytes:
    return (json.dumps(value, sort_keys=True, indent=2, ensure_ascii=False, allow_nan=False) + '\n').encode('utf-8')


def write_immutable_json(target: Path, value: Mapping) -> str:
    """Atomically create a JSON artifact without replacing a frozen revision."""
    target = Path(target)
    payload = _serialize_ledger(value)
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        if target.read_bytes() == payload:
            return 'already_identical'
        raise FileExistsError(f'Refusing to replace immutable JSON artifact at {target}; use a new versioned path')
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(mode='wb', dir=target.parent, prefix=f'.{target.name}.', suffix='.tmp', delete=False) as stream:
            temporary_path = Path(stream.name)
            stream.write(payload)
            stream.flush()
            os.fsync(stream.fileno())
        try:
            os.link(temporary_path, target)
        except FileExistsError:
            if target.read_bytes() == payload:
                return 'already_identical'
            raise FileExistsError(f'Refusing to replace immutable JSON artifact at {target}; use a new versioned path')
        return 'created'
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)


def _validate_ledger(ledger: Mapping) -> tuple[date, date, list[Mapping]]:
    if ledger.get('schemaVersion') != 1 or ledger.get('kind') != LEDGER_KIND or ledger.get('state') != 'frozen_pending_outcomes':
        raise ValueError('Input is not a frozen prospective recurrence ledger')
    if ledger.get('target') != TARGET:
        raise ValueError('Frozen ledger target is not the registered MARS archive-record outcome')
    baseline = ledger.get('baseline')
    if not isinstance(baseline, Mapping):
        raise ValueError('Frozen ledger baseline provenance is missing')
    if not isinstance(baseline.get('datasetSnapshotId'), str) or not baseline['datasetSnapshotId']:
        raise ValueError('Frozen ledger baseline snapshot ID is missing')
    _require_sha256(baseline.get('inputSnapshotSha256'), 'baseline.inputSnapshotSha256')
    _require_sha256(baseline.get('publisherArchiveSha256'), 'baseline.publisherArchiveSha256')
    model = ledger.get('modelSpecification')
    if not isinstance(model, Mapping):
        raise ValueError('Frozen model specification is missing')
    if _sha256(_canonical_bytes(model)) != ledger.get('modelSpecificationSha256'):
        raise ValueError('Frozen model specification digest does not match')
    _require_sha256(ledger.get('predictionsSha256'), 'predictionsSha256')
    predictions = ledger.get('predictions')
    if not isinstance(predictions, list) or _sha256(_canonical_bytes(predictions)) != ledger.get('predictionsSha256'):
        raise ValueError('Frozen predictions digest does not match')
    if ledger.get('predictionCount') != len(predictions) or not predictions:
        raise ValueError('Frozen prediction count is empty or inconsistent')
    source_ids = set()
    for row in predictions:
        if not isinstance(row, Mapping):
            raise ValueError('Frozen prediction row must be an object')
        source_id = row.get('sourceId')
        if not isinstance(source_id, str) or not source_id or source_id in source_ids:
            raise ValueError('Frozen prediction source IDs must be unique and non-empty')
        source_ids.add(source_id)
        probability = row.get('probability')
        if isinstance(probability, bool) or not isinstance(probability, (int, float)) or not math.isfinite(probability) or not 0 <= probability <= 1:
            raise ValueError(f'Frozen probability for {source_id} is invalid')
        if not isinstance(row.get('countryCluster'), str) or not row['countryCluster']:
            raise ValueError(f'Frozen country cluster for {source_id} is missing')
        recent_dates = row.get('baselineRecentDetectionDateCount')
        if isinstance(recent_dates, bool) or not isinstance(recent_dates, int) or recent_dates < 0:
            raise ValueError(f'Frozen baseline detection-date count for {source_id} is invalid')
    window = ledger.get('forecastWindow')
    if not isinstance(window, Mapping) or window.get('horizonDays') != HORIZON_DAYS:
        raise ValueError('Frozen forecast window is invalid')
    if not isinstance(window.get('startExclusive'), str) or not isinstance(window.get('endInclusive'), str):
        raise ValueError('Frozen forecast dates must be ISO calendar dates')
    try:
        as_of = date.fromisoformat(window['startExclusive'])
        end = date.fromisoformat(window['endInclusive'])
    except ValueError as error:
        raise ValueError('Frozen forecast dates must be ISO calendar dates') from error
    if end != as_of + timedelta(days=HORIZON_DAYS):
        raise ValueError('Frozen forecast end date does not match the registered horizon')
    if baseline.get('datasetLastObservedDate') != as_of.isoformat():
        raise ValueError('Frozen forecast cutoff does not match the baseline snapshot date')
    if model.get('modelVersion') is None or model.get('target') != TARGET:
        raise ValueError('Frozen model target or version is invalid')
    if model.get('horizonDays') != HORIZON_DAYS or model.get('featureVersion') is None:
        raise ValueError('Frozen model horizon or feature version is invalid')
    code_hashes = model.get('codeSha256')
    if not isinstance(code_hashes, Mapping) or set(code_hashes) != set(CODE_HASH_KEYS):
        raise ValueError('Frozen model code provenance is incomplete')
    for key, value in code_hashes.items():
        _require_sha256(value, f'modelSpecification.codeSha256.{key}')
    return as_of, end, predictions


def _not_available(
    reason: str,
    *,
    baseline: Mapping,
    evaluation_code_sha256: str,
    followup: Mapping | None = None,
    followup_sha256: str | None = None,
) -> dict:
    return {
        'schemaVersion': 1,
        'kind': EVALUATION_KIND,
        'status': 'not_available',
        'target': TARGET,
        'evaluationCodeSha256': evaluation_code_sha256,
        'reason': reason,
        'baselineSnapshotId': baseline.get('datasetSnapshotId'),
        'followupSnapshotId': followup.get('snapshotId') if followup else None,
        'followupInputSnapshotSha256': followup_sha256,
        'labeledSourceCount': 0,
        'unknownSourceCount': 0,
        'outcomes': [],
        'limitations': ['An unavailable evaluation does not label unobserved sources as negative and makes no claim about methane absence.'],
    }


def evaluate_frozen_ledger(
    ledger: Mapping,
    followup_snapshot_bytes: bytes,
    *,
    bootstrap_replicates: int = BOOTSTRAP_REPLICATES,
) -> dict:
    """Score only after the full future window and publisher-release buffer pass."""
    as_of, window_end, predictions = _validate_ledger(ledger)
    if not isinstance(followup_snapshot_bytes, bytes) or not followup_snapshot_bytes:
        raise ValueError('followup_snapshot_bytes must be non-empty bytes')
    evaluation_code_sha256 = _file_sha256(Path(__file__))
    followup_hash = _sha256(followup_snapshot_bytes)
    snapshot = _snapshot_bytes(followup_snapshot_bytes)
    baseline = ledger['baseline']
    if snapshot.get('truncated') is not False:
        return _not_available('The follow-up snapshot is truncated or does not declare complete coverage.', baseline=baseline, evaluation_code_sha256=evaluation_code_sha256, followup_sha256=followup_hash)
    provenance = _snapshot_provenance(snapshot)
    if provenance['provider'] != baseline.get('provider') or provenance['dataset'] != baseline.get('dataset'):
        raise ValueError('Follow-up snapshot publisher and dataset do not match the frozen baseline')
    if provenance['snapshotId'] == baseline.get('datasetSnapshotId') or provenance['archiveSha256'] == baseline.get('publisherArchiveSha256'):
        return _not_available('A distinct later publisher snapshot is required for prospective evaluation.', baseline=baseline, evaluation_code_sha256=evaluation_code_sha256, followup=provenance, followup_sha256=followup_hash)
    if provenance['retrievedDate'] < window_end + timedelta(days=MIN_TEST_RELEASE_LAG_DAYS):
        return _not_available('The complete forecast horizon has not passed the minimum 30-day public-release buffer.', baseline=baseline, evaluation_code_sha256=evaluation_code_sha256, followup=provenance, followup_sha256=followup_hash)

    source_by_id, events_by_source, _ = _source_context(snapshot)
    observed_through = max((max(days) for days in events_by_source.values()), default=None)
    if observed_through is None or observed_through < window_end:
        return _not_available(
            f'The follow-up snapshot has linked observations through {observed_through}; the registered horizon ends {window_end}.',
            baseline=baseline,
            evaluation_code_sha256=evaluation_code_sha256,
            followup=provenance,
            followup_sha256=followup_hash,
        )

    model_specification = ledger['modelSpecification']
    outcomes = []
    unknown_source_ids = []
    labels = []
    probabilities = []
    baseline_scores = []
    cluster_ids = []
    for prediction in predictions:
        source_id = prediction['sourceId']
        if source_id not in source_by_id:
            unknown_source_ids.append(source_id)
            continue
        future_days = tuple(day for day in events_by_source.get(source_id, ()) if as_of < day <= window_end)
        label = int(bool(future_days))
        row = {
            'sourceId': source_id,
            'probability': prediction['probability'],
            'baselineRecentDetectionDateCount': prediction['baselineRecentDetectionDateCount'],
            'futureLinkedDetectionDateCount': len(future_days),
            'label': label,
            'labelSemantics': 'at least one linked MARS source detection date in the frozen future window',
        }
        outcomes.append(row)
        labels.append(label)
        probabilities.append(float(prediction['probability']))
        baseline_scores.append(float(prediction['baselineRecentDetectionDateCount']))
        cluster_ids.append(prediction['countryCluster'])

    metrics = summarize_binary_predictions(labels, probabilities) if labels else None
    baseline_metrics = None
    intervals = {}
    bootstrap = None
    calibration_prevalence = float(model_specification['calibrationPrevalence'])
    if labels:
        baseline_summary = summarize_binary_predictions(
            labels,
            [calibration_prevalence] * len(labels),
            baseline_scores,
        )
        baseline_metrics = {
            'name': BASELINE_NAME,
            'rankingBasis': 'count of unique linked observation dates in the preceding 365 days',
            'sourceCount': baseline_summary['sourceCount'],
            'positiveCount': baseline_summary['positiveCount'],
            'rocAuc': baseline_summary['rocAuc'],
            'precisionAtTopDecile': baseline_summary['precisionAtTopDecile'],
            'recallAtTopDecile': baseline_summary['recallAtTopDecile'],
            'liftAtTopDecile': baseline_summary['liftAtTopDecile'],
        }
        if len(labels) >= 20 and len(set(labels)) == 2:
            bootstrap = source_bootstrap_intervals(
                labels,
                probabilities,
                probabilities,
                cluster_ids=cluster_ids,
                baseline_scores=baseline_scores,
                reference_probability=calibration_prevalence,
                replicates=bootstrap_replicates,
            )
            intervals = bootstrap['confidenceIntervals95']

    release_gates = model_specification.get('historicalEvaluation', {}).get('releaseGates')
    if not isinstance(release_gates, Mapping):
        raise ValueError('Frozen ledger does not include its preregistered release gates')
    positive_count = sum(labels)
    negative_count = len(labels) - positive_count
    cluster_count = len(set(cluster_ids))
    brier_reference = (
        sum((calibration_prevalence - label) ** 2 for label in labels) / len(labels)
        if labels else None
    )
    brier_skill = (
        1.0 - metrics['brierScore'] / brier_reference
        if metrics and brier_reference and brier_reference > 0 else None
    )
    skill_interval = intervals.get('brierSkill', {})
    gates = {
        'minimumTestCohort': len(labels) >= release_gates['minimumTestSources'],
        'minimumPositiveAndNegativeTestLabels': (
            positive_count >= release_gates['minimumTestPositiveLabels']
            and negative_count >= release_gates['minimumTestNegativeLabels']
        ),
        'rocAucLower95': intervals.get('rocAuc', {}).get('lower95') is not None
        and intervals['rocAuc']['lower95'] >= release_gates['minimumRocAucLower95'],
        'calibrationEce10': metrics is not None
        and metrics['expectedCalibrationError10'] <= release_gates['maximumExpectedCalibrationError10'],
        'calibrationEceUpper95': intervals.get('expectedCalibrationError10', {}).get('upper95') is not None
        and intervals['expectedCalibrationError10']['upper95'] <= release_gates['maximumExpectedCalibrationError10Upper95'],
        'brierSkillLower95': skill_interval.get('lower95') is not None
        and skill_interval['lower95'] >= release_gates['minimumBrierSkillLower95'],
        'topDecileLiftLower95': intervals.get('liftAtTopDecile', {}).get('lower95') is not None
        and intervals['liftAtTopDecile']['lower95'] >= release_gates['minimumTopDecileLiftLower95'],
        'baselineAucDeltaLower95': intervals.get('rocAucDeltaVsBaseline', {}).get('lower95') is not None
        and intervals['rocAucDeltaVsBaseline']['lower95'] > release_gates['baselineAucDeltaLower95'],
        'minimumBootstrapReplicates': bootstrap is not None
        and bootstrap['metadata']['replicatesRequested'] >= release_gates['minimumBootstrapReplicates'],
        'minimumCountryClusters': cluster_count >= release_gates['minimumCountryClusters'],
    }
    sample_ready = (
        len(labels) >= release_gates['minimumTestSources']
        and positive_count >= release_gates['minimumTestPositiveLabels']
        and negative_count >= release_gates['minimumTestNegativeLabels']
    )
    status = (
        'insufficient_evaluable_cohort' if not sample_ready
        else 'prospective_snapshot_gates_passed' if all(gates.values())
        else 'prospective_snapshot_gates_not_met'
    )
    return {
        'schemaVersion': 1,
        'kind': EVALUATION_KIND,
        'status': status,
        'target': TARGET,
        'evaluationCodeSha256': evaluation_code_sha256,
        'targetDefinition': ledger['targetDefinition'],
        'baselineSnapshotId': baseline['datasetSnapshotId'],
        'baselineInputSnapshotSha256': baseline['inputSnapshotSha256'],
        'followupSnapshotId': provenance['snapshotId'],
        'followupPublisherArchiveSha256': provenance['archiveSha256'],
        'followupInputSnapshotSha256': followup_hash,
        'followupRetrievedAt': provenance['retrievedAt'],
        'followupObservedThrough': observed_through.isoformat(),
        'asOfDate': as_of.isoformat(),
        'windowEndInclusive': window_end.isoformat(),
        'horizonDays': HORIZON_DAYS,
        'targetOutcomeInterpretation': 'The label records whether a known source has at least one linked MARS detection date in the frozen window. A negative label means no such archive record was present in a later complete snapshot; it does not indicate zero methane, no leak, or mitigation.',
        'predictionCount': len(predictions),
        'labeledSourceCount': len(outcomes),
        'unknownSourceCount': len(unknown_source_ids),
        'unobservedSourceIds': sorted(unknown_source_ids),
        'positiveCount': positive_count,
        'negativeCount': negative_count,
        'metrics': metrics,
        'baselineMetrics': baseline_metrics,
        'baselineName': BASELINE_NAME,
        'brierReference': {
            'calibrationCohortPrevalence': round(calibration_prevalence, 8),
            'brierScore': round(brier_reference, 8) if brier_reference is not None else None,
            'brierSkillScore': round(brier_skill, 8) if brier_skill is not None else None,
        },
        'confidenceIntervals95': intervals,
        'bootstrap': bootstrap['metadata'] if bootstrap else None,
        'releaseGates': release_gates,
        'releaseGateResults': gates,
        'outcomes': outcomes,
        'limitations': [
            'The evaluation covers one prospective snapshot window; it is not sufficient by itself to establish transportability or operational fitness.',
            'The prediction target is a later linked archive observation, not methane presence, future flux, physical leak, repair, or emissions reduction.',
            'MARS does not expose a complete observation-opportunity denominator; a negative archive-record label is not a negative methane outcome.',
            'Sources absent from the follow-up archive remain unknown and are excluded rather than labeled zero.',
            'Backfilled detection dates at or before the frozen cutoff are excluded from future labels.',
        ],
    }


def _file_sha256(path: Path) -> str:
    return _sha256(path.read_bytes())


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot', type=Path, default=ROOT / 'apps/web/public/data/mars-snapshot.json.gz')
    parser.add_argument('--intelligence', type=Path, default=ROOT / 'data/processed/intelligence-snapshot.json')
    parser.add_argument('--output', type=Path, help='New versioned path for an immutable frozen ledger; required when registering predictions.')
    parser.add_argument('--registered-at', help='Explicit timezone-aware ISO timestamp for reproducible registration.')
    parser.add_argument('--ledger', type=Path, help='Frozen ledger to evaluate against a later publisher snapshot.')
    parser.add_argument('--followup-snapshot', type=Path, help='Later complete MARS snapshot to score against the frozen ledger.')
    parser.add_argument('--evaluation-output', type=Path, default=ROOT / 'data/processed/prospective/record-recurrence-evaluation.json')
    parser.add_argument('--bootstrap-replicates', type=int, default=BOOTSTRAP_REPLICATES)
    args = parser.parse_args(argv)
    if args.ledger or args.followup_snapshot:
        if not args.ledger or not args.followup_snapshot:
            parser.error('--ledger and --followup-snapshot must be supplied together')
        ledger = json.loads(args.ledger.read_text(encoding='utf-8'))
        evaluation = evaluate_frozen_ledger(
            ledger,
            args.followup_snapshot.read_bytes(),
            bootstrap_replicates=args.bootstrap_replicates,
        )
        outcome = write_immutable_json(args.evaluation_output, evaluation)
        digest = _sha256(_serialize_ledger(evaluation))
        print(f"{outcome}: {evaluation['status']}; labeled sources={evaluation['labeledSourceCount']}; evaluation sha256={digest}")
        return 0
    if args.output is None:
        parser.error('--output is required when freezing predictions; use a new versioned path and never reuse an existing ledger path')
    if not args.registered_at:
        parser.error('--registered-at is required when creating a frozen prediction ledger')
    intelligence = json.loads(args.intelligence.read_text(encoding='utf-8'))
    code_sha256 = {
        'recordRecurrence': _file_sha256(ROOT / 'services/data-pipeline/record_recurrence.py'),
        'buildIntelligence': _file_sha256(ROOT / 'services/data-pipeline/build_intelligence.py'),
        'prospectiveRecurrence': _file_sha256(Path(__file__)),
    }
    ledger = build_frozen_ledger(
        args.snapshot.read_bytes(),
        intelligence,
        registered_at=args.registered_at,
        code_sha256=code_sha256,
    )
    outcome = write_immutable_json(args.output, ledger)
    digest = _sha256(_serialize_ledger(ledger))
    print(f"{outcome}: {ledger['predictionCount']} source predictions; {ledger['baseline']['datasetSnapshotId']}; ledger sha256={digest}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
