"""Build reproducible observational priorities and bounded record-recurrence estimates.

Input is a pinned MARS casebook or normalized source snapshot. Missing or
non-numeric plume flux is retained as missing; it is never converted to zero.
Priority is an uncalibrated investigation aid. The separate calibrated model
predicts MARS archive-record recurrence only, never future methane emissions.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import math
from datetime import date
from pathlib import Path
from statistics import median
from record_recurrence import BOOTSTRAP_REPLICATES, evaluate_record_recurrence
from publisher_indicator_comparison import build_publisher_indicator_comparison

ROOT = Path(__file__).resolve().parents[2]
CASEBOOK = ROOT / 'data/real/mars_casebook_2026-10-11.json'
FULL_SNAPSHOT = ROOT / 'apps/web/public/data/mars-snapshot.json.gz'
OUTPUT = ROOT / 'data/processed/intelligence-snapshot.json'
RECURRENCE_EVALUATION = ROOT / 'data/processed/record-recurrence-evaluation.json'
TREND_METHOD_VERSION = 'theil-sen-event-trend-v1'
TREND_MIN_NUMERIC_DATES = 4
TREND_MIN_SPAN_DAYS = 90
TREND_RATE_PERIOD_DAYS = 30
OBSERVED_TREND_METHOD = {
    'methodVersion': TREND_METHOD_VERSION,
    'minimumNumericObservationDates': TREND_MIN_NUMERIC_DATES,
    'minimumSpanDays': TREND_MIN_SPAN_DAYS,
    'ratePeriodDays': TREND_RATE_PERIOD_DAYS,
    'limitation': (
        'This summarizes reported numeric flux at discrete satellite detection dates. '
        'The observations are sampled and non-continuous; this is not a forecast and the slope is not projected into the future, '
        'does not describe unobserved days, and does not prove leak persistence, repair, or emission reduction.'
    ),
}
FORECAST_READINESS = {
    'status': 'not_available',
    'reason': 'The pinned MARS snapshot lacks complete sensor-opportunity denominators and independent physical-emissions outcomes; no methane-emissions forecast is produced. A separate model estimates archive-record recurrence only.',
    'missingRequirements': [
        'complete_observation_opportunities',
        'independent_future_outcome_labels',
        'held_out_temporal_validation',
    ],
}


def numeric(value):
    if value is None or isinstance(value, bool):
        return None
    try:
        parsed = float(value)
        return parsed if math.isfinite(parsed) and parsed >= 0 else None
    except (ValueError, TypeError):
        return None


def analyze_observed_flux_trend(observed):
    """Describe flux across sampled detection dates; never extrapolate a forecast."""
    by_day: dict[str, list[dict]] = {}
    for item in observed:
        if item['flux'] is None:
            continue
        by_day.setdefault(item['day'], []).append(item)

    points = []
    for day in sorted(by_day):
        daily = by_day[day]
        fluxes = [item['flux'] for item in daily]
        uncertainties = [item['uncertainty'] for item in daily if item['uncertainty'] is not None]
        points.append({
            'date': day,
            'medianFluxKgHr': median(fluxes),
            'medianReportedUncertaintyKgHr': median(uncertainties) if uncertainties else None,
            'observationCount': len(daily),
        })

    date_count = len(points)
    span_days = (
        (date.fromisoformat(points[-1]['date']) - date.fromisoformat(points[0]['date'])).days
        if date_count > 1 else 0
    )
    slopes = []
    if date_count < TREND_MIN_NUMERIC_DATES:
        status = 'insufficient_observations'
    elif span_days < TREND_MIN_SPAN_DAYS:
        status = 'insufficient_temporal_coverage'
    else:
        day_numbers = [date.fromisoformat(point['date']).toordinal() for point in points]
        for left in range(date_count - 1):
            for right in range(left + 1, date_count):
                elapsed_days = day_numbers[right] - day_numbers[left]
                slopes.append(
                    (points[right]['medianFluxKgHr'] - points[left]['medianFluxKgHr'])
                    / elapsed_days * TREND_RATE_PERIOD_DAYS
                )
        status = 'descriptive_trend'

    slope = median(slopes) if slopes else None
    reported_uncertainties = [
        point['medianReportedUncertaintyKgHr']
        for point in points if point['medianReportedUncertaintyKgHr'] is not None
    ]
    return {
        'status': status,
        'numericObservationDates': date_count,
        'spanDays': span_days,
        'pairwiseSlopeCount': len(slopes),
        'slopeKgHrPer30Days': round(slope, 6) if slope is not None else None,
        'positivePairwiseSlopeShare': round(sum(value > 0 for value in slopes) / len(slopes), 6) if slopes else None,
        'firstObservationDate': points[0]['date'] if points else None,
        'lastObservationDate': points[-1]['date'] if points else None,
        'firstObservedMedianFluxKgHr': points[0]['medianFluxKgHr'] if points else None,
        'lastObservedMedianFluxKgHr': points[-1]['medianFluxKgHr'] if points else None,
        'medianReportedUncertaintyKgHr': median(reported_uncertainties) if reported_uncertainties else None,
    }


def load_records(path: Path, input_bytes: bytes | None = None):
    raw_bytes = input_bytes if input_bytes is not None else path.read_bytes()
    if raw_bytes[:2] == b'\x1f\x8b':
        raw_bytes = gzip.decompress(raw_bytes)
    raw = json.loads(raw_bytes.decode('utf-8'))
    if 'cases' in raw:
        records = []
        for case in raw['cases']:
            source = case['source']
            source_id = case.get('sourceId')
            if source.get('synthetic') is not False or source.get('sourceId') != source_id:
                raise ValueError(f'Casebook source {source_id} is not an explicitly linked real MARS source')
            observations = []
            for plume in case['plumes']:
                if (
                    not isinstance(plume, dict)
                    or plume.get('linkStatus') != 'linked'
                    or plume.get('sourceId') != source_id
                    or plume.get('synthetic') is not False
                ):
                    raise ValueError(f'Casebook plume is not an explicitly linked real observation for {source_id}')
                observations.append({
                    'id': plume.get('plumeId'),
                    'sourceId': source_id,
                    'linkStatus': 'linked',
                    'synthetic': False,
                    'date': plume.get('tileDate'),
                    'fluxKgHr': plume.get('fluxKgHr'),
                    'uncertaintyKgHr': plume.get('fluxStdKgHr'),
                    'satellite': plume.get('satellite'),
                })
            records.append({
                'sourceId': source_id,
                'synthetic': source.get('synthetic'),
                'observations': observations,
                'totalPlumeCount': source.get('detectedPlumeCount'),
                'lastObserved': source.get('latestPlumeDate'),
                'persistency': source.get('persistency'),
                'persistencyStd': source.get('persistencyStd'),
                'persistencyCategory': source.get('persistencyCategory'),
                'emissionStatus': source.get('emissionStatus'),
            })
        provenance = raw.get('provenance') or {}
        source_hash = provenance.get('archiveSha256')
        generated_at = provenance.get('retrievedAt')
    elif 'sources' in raw and isinstance(raw.get('plumes'), list):
        # The complete normalized MARS snapshot stores source and plume tables
        # separately. Join only on the source identifier explicitly present in
        # a linked plume; unknown/unlinked observations are never guessed.
        by_source_id = {
            item.get('sourceId'): item for item in raw['sources']
            if isinstance(item, dict) and isinstance(item.get('sourceId'), str) and item.get('sourceId')
        }
        observations_by_source: dict[str, list[dict]] = {source_id: [] for source_id in by_source_id}
        for plume in raw['plumes']:
            if not isinstance(plume, dict):
                continue
            source_id = plume.get('sourceId')
            if plume.get('linkStatus') != 'linked' or source_id not in observations_by_source:
                continue
            if plume.get('synthetic') is not False:
                raise ValueError(f'Linked plume for {source_id} must be explicitly marked non-synthetic')
            observations_by_source[source_id].append({
                'id': plume.get('plumeId'),
                'sourceId': source_id,
                'linkStatus': 'linked',
                'synthetic': plume.get('synthetic'),
                'date': plume.get('tileDate'),
                'fluxKgHr': plume.get('fluxKgHr'),
                'uncertaintyKgHr': plume.get('fluxStdKgHr'),
                'satellite': plume.get('satellite'),
            })
        records = []
        for source_id, source in by_source_id.items():
            records.append({
                'sourceId': source_id,
                'country': source.get('country'),
                'synthetic': source.get('synthetic'),
                'observations': observations_by_source[source_id],
                'totalPlumeCount': source.get('detectedPlumeCount'),
                'lastObserved': source.get('latestPlumeDate'),
                'persistency': source.get('persistency'),
                'persistencyStd': source.get('persistencyStd'),
                'persistencyCategory': source.get('persistencyCategory'),
                'emissionStatus': source.get('emissionStatus'),
            })
        provenance = raw.get('provenance') or {}
        source_hash = provenance.get('archiveSha256')
        generated_at = provenance.get('retrievedAt')
    elif 'sources' in raw:
        records = raw['sources']
        provenance = raw.get('provenance') or {}
        source_hash = raw.get('archiveSha256') or provenance.get('archiveSha256')
        generated_at = raw.get('generatedAt') or provenance.get('retrievedAt')
    else:
        raise ValueError('Expected a casebook or browser source snapshot')
    if not isinstance(generated_at, str) or not generated_at:
        raise ValueError('Input must include a stable generatedAt or provenance.retrievedAt timestamp')
    return records, source_hash, generated_at, provenance


def inspect(source):
    """Summarize distinct, identified observations with explicit missingness."""
    seen_ids = set()
    observed = []
    for item in source.get('observations', []):
        identifier = item.get('id') or item.get('plumeId')
        timestamp = item.get('date') or item.get('tileDate')
        if not isinstance(identifier, str) or not identifier.strip() or identifier in seen_ids:
            continue
        if not isinstance(timestamp, str) or len(timestamp) < 10:
            continue
        try:
            observation_day = date.fromisoformat(timestamp[:10]).isoformat()
        except ValueError:
            continue
        seen_ids.add(identifier)
        observed.append({
            'id': identifier,
            'timestamp': timestamp,
            'day': observation_day,
            'flux': numeric(item.get('fluxKgHr')),
            'uncertainty': numeric(item.get('uncertaintyKgHr')),
        })
    observed.sort(key=lambda value: (value['timestamp'], value['id']))

    fluxes = [value['flux'] for value in observed if value['flux'] is not None]
    uncertainties = [value['uncertainty'] for value in observed if value['uncertainty'] is not None]
    days = sorted({value['day'] for value in observed})
    med = median(fluxes) if fluxes else None
    mad = median([abs(value - med) for value in fluxes]) if med is not None else None
    anomaly_analysis = analyze_anomalies(observed)
    observed_flux_trend = analyze_observed_flux_trend(observed)
    outliers = len(anomaly_analysis['flaggedObservations']) if anomaly_analysis['status'] in {
        'potential_anomalies', 'no_candidates_flagged'
    } else None

    recurrence_contribution = min(45.0, 15.0 * math.log1p(len(days))) if days else 0.0
    magnitude_contribution = min(35.0, 7.0 * math.log1p(med / 100.0)) if med is not None else None
    score = round(min(80.0, recurrence_contribution + (magnitude_contribution or 0.0)), 1)
    reported_count = numeric(source.get('totalPlumeCount', source.get('plumeCount')))
    reported_persistency = numeric(source.get('persistency'))
    reported_persistency_std = numeric(source.get('persistencyStd'))

    return {
        'sourceId': source['sourceId'],
        'priorityScore': score,
        'priorityBand': 'high' if score >= 50 else 'medium' if score >= 25 else 'low',
        'priorityType': 'heuristic_not_probability',
        'priorityComponents': {
            'recurrenceContribution': round(recurrence_contribution, 2),
            'magnitudeContribution': round(magnitude_contribution, 2) if magnitude_contribution is not None else None,
            'magnitudeBasis': 'median numeric observed flux (kg/h)' if med is not None else 'unavailable',
        },
        'observationCount': len(observed),
        'sourceReportedPlumeCount': int(reported_count) if reported_count is not None else len(observed),
        'uniqueObservationDates': len(days),
        'observationIds': [value['id'] for value in observed],
        'observationDates': days,
        'observationTimestamps': [value['timestamp'] for value in observed],
        'numericFluxObservationCount': len(fluxes),
        'missingFluxObservationCount': len(observed) - len(fluxes),
        'measurementAvailability': 'numeric_flux_available' if fluxes else 'no_numeric_flux',
        'medianObservedFluxKgHr': med,
        'medianObservationUncertaintyKgHr': median(uncertainties) if uncertainties else None,
        'medianAbsoluteDeviationKgHr': mad,
        'robustOutlierCount': outliers,
        'anomalyAnalysis': anomaly_analysis,
        'observedFluxTrend': observed_flux_trend,
        'lastObserved': observed[-1]['timestamp'] if observed else source.get('lastObserved'),
        'dataSufficiency': 'limited' if len(observed) < 8 else 'observational',
        'observedPersistency': reported_persistency,
        'observedPersistencyStd': reported_persistency_std,
        'observedPersistencyCategory': source.get('persistencyCategory'),
        'emissionStatus': source.get('emissionStatus'),
        'indicatorComparison': 'UNEP source indicators are retained as context; this heuristic is not independently validated against them.',
        'reasons': [
            f'{len(days)} distinct calendar observation date(s) in the pinned sample',
            'Numeric flux and uncertainty summaries use reported values only' if fluxes else 'No numeric flux estimates are available; missing values were not treated as zero',
            'UNEP persistency and emission-status fields are shown as source metadata, not mitigation outcomes',
        ],
    }


ANOMALY_METHOD_VERSION = 'mad-threshold-screen-v1'
ANOMALY_MIN_OBSERVATIONS = 8
ANOMALY_MIN_DATES = 4
ANOMALY_THRESHOLD_RULE = 'flag when absolute deviation exceeds max(3.5 × robust scale, 2 × reported observation uncertainty)'
ANOMALY_LIMITATION = (
    'Flagged points are candidates for investigation, not proof of methane presence, source continuity, '
    'repair, or emission reduction. A point not flagged, or an observation that is missing, does not '
    'establish zero emissions.'
)


def analyze_anomalies(observed):
    """Screen dated observations for unusual flux values; this is not a validated detector."""
    eligible = [value for value in observed if value['flux'] is not None]
    values = [value['flux'] for value in eligible]
    baseline = median(values) if values else None
    deviations = [abs(value - baseline) for value in values] if baseline is not None else []
    mad = median(deviations) if deviations else None
    uncertainty_values = [value['uncertainty'] for value in eligible
                          if value['uncertainty'] is not None and value['uncertainty'] > 0]

    robust_scale = 1.4826 * mad if mad is not None and mad > 0 else None
    scale_basis = 'scaled_mad' if robust_scale is not None else 'unavailable'
    if robust_scale is None and uncertainty_values:
        # A conservative non-zero scale allows screening in tied/small samples;
        # the result remains heuristic and each reported uncertainty also raises
        # that observation's own flag threshold.
        robust_scale = median(uncertainty_values)
        scale_basis = 'median_reported_uncertainty_fallback'

    numeric_days = len({value['day'] for value in eligible})
    status = 'potential_anomalies'
    reason = ''
    if len(eligible) < ANOMALY_MIN_OBSERVATIONS:
        status = 'insufficient_observations'
        reason = f'{len(eligible)} numeric observations are available; at least {ANOMALY_MIN_OBSERVATIONS} are required for this screen.'
    elif numeric_days < ANOMALY_MIN_DATES:
        status = 'insufficient_temporal_coverage'
        reason = f'Numeric observations span {numeric_days} distinct dates; at least {ANOMALY_MIN_DATES} are required.'
    elif robust_scale is None or robust_scale <= 0:
        status = 'insufficient_scale'
        reason = 'The robust spread is zero and no positive reported uncertainty is available as a fallback scale.'

    flagged = []
    if status == 'potential_anomalies':
        for value in eligible:
            deviation = abs(value['flux'] - baseline)
            threshold = max(
                3.5 * robust_scale,
                2 * value['uncertainty'] if value['uncertainty'] is not None else 0,
            )
            if deviation > threshold:
                flagged.append({
                    'id': value['id'],
                    'date': value['day'],
                    'fluxKgHr': value['flux'],
                    'uncertaintyKgHr': value['uncertainty'],
                    'deviationFromMedianKgHr': deviation,
                    'thresholdKgHr': threshold,
                })
        if not flagged:
            status = 'no_candidates_flagged'
            reason = 'No observation crossed its screening threshold; this does not establish zero emissions or prove that no anomaly occurred.'
        else:
            reason = f'{len(flagged)} observation(s) crossed the stated screening threshold and should be reviewed in source context.'

    return {
        'methodVersion': ANOMALY_METHOD_VERSION,
        'status': status,
        'reason': reason,
        'minimumNumericObservations': ANOMALY_MIN_OBSERVATIONS,
        'minimumDistinctObservationDates': ANOMALY_MIN_DATES,
        'numericObservationCount': len(eligible),
        'distinctNumericObservationDates': numeric_days,
        'baselineMedianFluxKgHr': baseline,
        'medianAbsoluteDeviationKgHr': mad,
        'robustScaleKgHr': robust_scale,
        'scaleBasis': scale_basis,
        'thresholdRule': ANOMALY_THRESHOLD_RULE,
        'flaggedObservations': flagged,
        'limitation': ANOMALY_LIMITATION,
    }


def build(
    path: Path,
    output: Path,
    recurrence_evaluation_output: Path | None = None,
    bootstrap_replicates: int = BOOTSTRAP_REPLICATES,
):
    input_bytes = path.read_bytes()
    records, archive_hash, generated_at, provenance = load_records(path, input_bytes)
    seen = set()
    results = []
    for source in records:
        identifier = source.get('sourceId')
        if not isinstance(identifier, str) or not identifier or identifier in seen:
            continue
        seen.add(identifier)
        results.append(inspect(source))
    results.sort(key=lambda value: (-value['priorityScore'], value['sourceId']))
    input_sha256 = hashlib.sha256(input_bytes).hexdigest()
    dataset_snapshot_id = f'unep-mars-{archive_hash[:12]}' if isinstance(archive_hash, str) and len(archive_hash) >= 12 else None
    recurrence = evaluate_record_recurrence(
        records,
        retrieved_at=generated_at,
        input_sha256=input_sha256,
        dataset_snapshot_id=dataset_snapshot_id,
        bootstrap_replicates=bootstrap_replicates,
    )
    recurrence_predictions = recurrence['predictionsBySourceId']
    for result in results:
        forecast = recurrence_predictions.get(result['sourceId'])
        if forecast:
            result['recordRecurrenceForecast'] = forecast
    publisher_indicator_comparison = build_publisher_indicator_comparison(
        records, recurrence_predictions, recurrence['report'],
    )
    payload = {
        'schemaVersion': 3,
        'kind': 'observational_investigation_ranking',
        'modelVersion': 'transparent-priority-v5',
        'datasetSnapshotId': dataset_snapshot_id,
        'sourceDataset': provenance.get('dataset'),
        'sourceProvider': provenance.get('provider'),
        'datasetLicense': provenance.get('license'),
        'catalogUrl': provenance.get('catalogUrl'),
        'datasetAttribution': provenance.get('attribution'),
        'sourceProvenance': provenance,
        'trainedModel': False,
        'calibratedProbability': False,
        'observedTrendMethod': OBSERVED_TREND_METHOD,
        'forecastReadiness': FORECAST_READINESS,
        'recordRecurrenceModel': recurrence['report'],
        'publisherIndicatorComparison': publisher_indicator_comparison,
        'generatedAt': generated_at,
        'inputFileSha256': input_sha256,
        'upstreamArchiveSha256': archive_hash,
        'sourceCount': len(results),
        'linkedObservationCount': sum(result['observationCount'] for result in results),
        'method': 'Distinct dated detections, observed median flux, and a Theil–Sen descriptive slope over sampled detection dates; source status remains contextual. No non-detections, repairs, or future outcomes are inferred.',
        'limitations': [
            'Priority is an uncalibrated investigation aid, not a physical leak likelihood or future-flux forecast.',
            'The calibrated recurrence estimate predicts another linked MARS archive record within 365 days for a source already observed; it does not predict methane presence, emissions, repair, or mitigation.',
            'The observed flux trend summarizes discrete detection dates only; it is not extrapolated and is not a future forecast.',
            'A descriptive trend is emitted only with four or more numeric dates spanning at least 90 days; the method summarizes dated flux with a median pairwise Theil–Sen slope.',
            'Observation coverage varies by sensor, revisit schedule, geography, and cloud conditions; missing observations do not mean zero emissions.',
            'Source notification and feedback metadata do not verify recipient, repair, or emissions reduction.',
            'This small curated casebook has not been independently validated as a predictive model.',
        ],
        'sources': results,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2, allow_nan=False) + '\n', encoding='utf-8')
    if recurrence_evaluation_output is not None:
        recurrence_evaluation_output.parent.mkdir(parents=True, exist_ok=True)
        recurrence_evaluation_output.write_text(json.dumps(recurrence['report'], indent=2, allow_nan=False) + '\n', encoding='utf-8')
    return payload


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=Path, default=FULL_SNAPSHOT)
    parser.add_argument('--output', type=Path, default=OUTPUT)
    parser.add_argument('--recurrence-evaluation-output', type=Path, default=RECURRENCE_EVALUATION)
    parser.add_argument('--bootstrap-replicates', type=int, default=BOOTSTRAP_REPLICATES)
    args = parser.parse_args()
    result = build(args.input, args.output, args.recurrence_evaluation_output, args.bootstrap_replicates)
    print(f"{result['sourceCount']} sources -> {args.output}; recurrence model: {result['recordRecurrenceModel']['status']}")
