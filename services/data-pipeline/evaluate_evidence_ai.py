"""Evaluate a document-evidence model against independently adjudicated claims.

This tool makes no provider calls and does not train a model. Human reviewers
must supply source-disjoint labels and accepted citation digests. Evaluation
does not establish physical methane mitigation or document authenticity.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
import re
from collections import Counter
from datetime import date
from pathlib import Path
from statistics import median
from typing import Any

from evaluate_baseline import LABELS, summarize

HASH = re.compile(r'^[0-9a-f]{64}$')
CLAIM_TYPES = {'source_detected', 'operator_notified', 'mitigation_confirmed'}
SPLITS = {'train', 'dev', 'test'}
DEFAULT_BOOTSTRAP_REPLICATES = 400
DEFAULT_BOOTSTRAP_SEED = 20261014
MIN_BOOTSTRAP_REPLICATES = 20
MAX_BOOTSTRAP_REPLICATES = 10_000
DEFAULT_MIN_MACRO_F1 = 0.80


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows = []
    for number, raw in enumerate(path.read_text(encoding='utf-8').splitlines(), 1):
        if not raw.strip():
            continue
        try:
            item = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ValueError(f'Invalid JSON line {number} in {path.name}') from exc
        if not isinstance(item, dict):
            raise ValueError(f'JSONL line {number} must contain an object')
        rows.append(item)
    return rows


def _nonempty(value: object, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f'Missing or empty {label}')
    return value.strip()


def _labelset(labels: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    by_id: dict[str, dict[str, Any]] = {}
    split_by_source: dict[str, str] = {}
    split_by_document: dict[str, str] = {}
    for row in labels:
        claim_id = _nonempty(row.get('claimId'), 'claimId')
        source_id = _nonempty(row.get('sourceId'), 'sourceId')
        if claim_id in by_id:
            raise ValueError(f'Duplicate gold claim ID: {claim_id}')
        split = row.get('split')
        if split not in SPLITS:
            raise ValueError(f'Invalid split for {claim_id}')
        if source_id in split_by_source and split_by_source[source_id] != split:
            raise ValueError(f'Source-disjoint split violation: {source_id}')
        split_by_source[source_id] = split
        document_ids = row.get('documentIds')
        if not isinstance(document_ids, list) or not document_ids:
            raise ValueError(f'At least one documentId is required for {claim_id}')
        normalized_document_ids = [_nonempty(document_id, 'documentId') for document_id in document_ids]
        if len(normalized_document_ids) != len(set(normalized_document_ids)):
            raise ValueError(f'Duplicate documentId in {claim_id}')
        for document_id in normalized_document_ids:
            if document_id in split_by_document and split_by_document[document_id] != split:
                raise ValueError(f'Document-disjoint split violation: {document_id}')
            split_by_document[document_id] = split
        if row.get('goldLabel') not in LABELS or row.get('claimType') not in CLAIM_TYPES:
            raise ValueError(f'Invalid label or claim type for {claim_id}')
        for field in ('claimTextSha256', 'assessmentInputSha256'):
            if not HASH.fullmatch(str(row.get(field, ''))):
                raise ValueError(f'Invalid frozen {field} for {claim_id}')
        if row.get('synthetic') is not False:
            raise ValueError(f'Synthetic or unmarked ground truth prohibited: {claim_id}')
        review = row.get('review')
        if not isinstance(review, dict):
            raise ValueError(f'Human adjudication missing for {claim_id}')
        _nonempty(review.get('reviewerId'), 'reviewerId')
        if not HASH.fullmatch(str(review.get('rightsReviewSha256', ''))):
            raise ValueError(f'Invalid rightsReviewSha256 for {claim_id}')
        if review.get('sourceInspected') is not True:
            raise ValueError(f'Original source inspection required: {claim_id}')
        if review.get('rightsStatus') not in {'cleared', 'link_only', 'unverified'}:
            raise ValueError(f'Explicit rightsStatus required: {claim_id}')
        try:
            date.fromisoformat(_nonempty(review.get('reviewedAt'), 'reviewedAt')[:10])
        except ValueError as exc:
            raise ValueError(f'Invalid reviewedAt for {claim_id}') from exc
        citations = row.get('acceptedCitationHashes', [])
        if not isinstance(citations, list):
            raise ValueError(f'acceptedCitationHashes must be an array: {claim_id}')
        for citation in citations:
            if (not isinstance(citation, dict) or not isinstance(citation.get('documentId'), str)
                    or not HASH.fullmatch(str(citation.get('sha256', '')))):
                raise ValueError(f'Bad gold citation digest: {claim_id}')
            if citation['documentId'] not in normalized_document_ids:
                raise ValueError(f'Accepted citation document is not in documentIds: {claim_id}')
        by_id[claim_id] = row
    return by_id


def _predictions(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    by_id = {}
    for row in rows:
        claim_id = _nonempty(row.get('claimId'), 'prediction.claimId')
        if claim_id in by_id:
            raise ValueError(f'Duplicate prediction: {claim_id}')
        execution = row.get('execution')
        if execution is not None:
            if not isinstance(execution, dict) or execution.get('status') not in {'completed', 'provider_failure'}:
                raise ValueError(f'Invalid execution status: {claim_id}')
            elapsed = execution.get('elapsedMs')
            if type(elapsed) not in (int, float) or not math.isfinite(elapsed) or elapsed < 0:
                raise ValueError(f'Invalid execution elapsedMs: {claim_id}')
            cost = execution.get('costUsd')
            if cost is not None and (type(cost) not in (int, float) or not math.isfinite(cost) or cost < 0):
                raise ValueError(f'Invalid execution costUsd: {claim_id}')
        failure = execution is not None and execution['status'] == 'provider_failure'
        if failure and (row.get('verdict') is not None or row.get('citations') != []):
            raise ValueError(f'Provider failure cannot supply a model verdict or citations: {claim_id}')
        if not failure and row.get('verdict') not in LABELS:
            raise ValueError(f'Invalid predicted verdict: {claim_id}')
        citations = row.get('citations', [])
        if not isinstance(citations, list):
            raise ValueError(f'Citations must be a list: {claim_id}')
        _nonempty(row.get('modelVersion'), 'modelVersion')
        _nonempty(row.get('promptVersion'), 'promptVersion')
        if not HASH.fullmatch(str(row.get('rightsReviewSha256', ''))):
            raise ValueError(f'Invalid rightsReviewSha256 for {claim_id}')
        for field in ('claimTextSha256', 'assessmentInputSha256'):
            if not HASH.fullmatch(str(row.get(field, ''))):
                raise ValueError(f'Invalid prediction {field} for {claim_id}')
        for citation in citations:
            if not isinstance(citation, dict):
                raise ValueError(f'Invalid citation item: {claim_id}')
            _nonempty(citation.get('documentId'), 'citation.documentId')
            _nonempty(citation.get('quote'), 'citation.quote')
        by_id[claim_id] = row
    return by_id


def _baseline_predictions(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    by_id = {}
    for row in rows:
        claim_id = _nonempty(row.get('claimId'), 'baseline.claimId')
        if claim_id in by_id:
            raise ValueError(f'Duplicate baseline prediction: {claim_id}')
        if row.get('verdict') not in LABELS:
            raise ValueError(f'Invalid baseline verdict: {claim_id}')
        for field in ('claimTextSha256', 'assessmentInputSha256', 'rightsReviewSha256'):
            if not HASH.fullmatch(str(row.get(field, ''))):
                raise ValueError(f'Invalid baseline {field}: {claim_id}')
        _nonempty(row.get('baselineVersion'), 'baselineVersion')
        if row.get('basis') not in {'document_assessment', 'metadata_coverage'}:
            raise ValueError(f'Explicit baseline assessment basis required: {claim_id}')
        by_id[claim_id] = row
    return by_id


def _percentile(values: list[float], probability: float) -> float:
    ordered = sorted(values)
    position = (len(ordered) - 1) * probability
    lower = int(position)
    upper = min(lower + 1, len(ordered) - 1)
    fraction = position - lower
    return round(ordered[lower] * (1 - fraction) + ordered[upper] * fraction, 4)


def _macro_f1_unrounded(rows: list[dict[str, Any]]) -> float:
    values = []
    for label in LABELS:
        true_positive = sum(row['predicted'] == label and row['expected'] == label for row in rows)
        false_positive = sum(row['predicted'] == label and row['expected'] != label for row in rows)
        false_negative = sum(row['predicted'] != label and row['expected'] == label for row in rows)
        precision = true_positive / (true_positive + false_positive) if true_positive + false_positive else 0.0
        recall = true_positive / (true_positive + false_negative) if true_positive + false_negative else 0.0
        values.append(2 * precision * recall / (precision + recall) if precision + recall else 0.0)
    return sum(values) / len(LABELS)


def _record_metrics(rows: list[dict[str, Any]]) -> tuple[float, float]:
    macro_f1 = float(summarize(rows)['macroF1'])
    supplied = sum(int(row['citationsSupplied']) for row in rows)
    verified = sum(int(row['citationsVerified']) for row in rows)
    citation_precision = verified / supplied if supplied else 0.0
    return macro_f1, citation_precision


def _source_cluster_bootstrap(
    records: list[dict[str, Any]], *, replicates: int, seed: int,
    baseline_records: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for row in records:
        grouped.setdefault(row['sourceId'], []).append(row)
    clusters = sorted(grouped)
    result: dict[str, Any] = {
        'method': 'percentile_cluster_bootstrap',
        'confidenceLevel': 0.95,
        'resamplingUnit': 'sourceId',
        'seed': seed,
        'replicatesRequested': replicates,
        'replicatesCompleted': 0,
        'clusterCount': len(clusters),
        'status': 'insufficient_source_clusters',
        'confidenceIntervals95': None,
    }
    if len(clusters) < 2:
        return result

    baseline_by_source: dict[str, list[dict[str, Any]]] | None = None
    if baseline_records is not None:
        baseline_by_source = {}
        for row in baseline_records:
            baseline_by_source.setdefault(row['sourceId'], []).append(row)
        if set(baseline_by_source) != set(clusters):
            raise ValueError('Baseline source clusters must match AI test source clusters')

    rng = random.Random(seed)
    macro_f1_values: list[float] = []
    citation_precision_values: list[float] = []
    baseline_delta_values: list[float] = []
    for _ in range(replicates):
        sampled_clusters = rng.choices(clusters, k=len(clusters))
        sample = [row for source_id in sampled_clusters for row in grouped[source_id]]
        macro_f1, citation_precision = _record_metrics(sample)
        macro_f1_values.append(macro_f1)
        citation_precision_values.append(citation_precision)
        if baseline_by_source is not None:
            baseline_sample = [row for source_id in sampled_clusters for row in baseline_by_source[source_id]]
            baseline_macro_f1 = float(summarize(baseline_sample)['macroF1'])
            baseline_delta_values.append(macro_f1 - baseline_macro_f1)

    result.update({
        'replicatesCompleted': replicates,
        'status': 'estimated',
        'confidenceIntervals95': {
            'macroF1': {'lower': _percentile(macro_f1_values, 0.025), 'upper': _percentile(macro_f1_values, 0.975)},
            'citationPrecision': {'lower': _percentile(citation_precision_values, 0.025), 'upper': _percentile(citation_precision_values, 0.975)},
        },
        'limitations': [
            'Intervals resample held-out source IDs and retain all claims for each sampled source.',
            'With few source clusters, intervals are unstable and do not establish performance on new documents or organizations.',
            'Zero observed false mitigation confirmations is a sample result, not proof of zero real-world risk.',
        ],
    })
    if baseline_delta_values:
        result['aiMinusRulesBaselineMacroF1ConfidenceInterval95'] = {
            'lower': _percentile(baseline_delta_values, 0.025),
            'upper': _percentile(baseline_delta_values, 0.975),
        }
    return result


def evaluate(labels: list[dict[str, Any]], predictions: list[dict[str, Any]], *,
             baseline_predictions: list[dict[str, Any]] | None = None,
             min_test_claims: int = 40, min_test_sources: int = 10,
             min_citation_precision: float = 0.9,
             bootstrap_replicates: int = DEFAULT_BOOTSTRAP_REPLICATES,
             bootstrap_seed: int = DEFAULT_BOOTSTRAP_SEED) -> dict[str, Any]:
    if (not isinstance(bootstrap_replicates, int) or isinstance(bootstrap_replicates, bool)
            or not MIN_BOOTSTRAP_REPLICATES <= bootstrap_replicates <= MAX_BOOTSTRAP_REPLICATES):
        raise ValueError(f'bootstrap_replicates must be between {MIN_BOOTSTRAP_REPLICATES} and {MAX_BOOTSTRAP_REPLICATES}')
    if not isinstance(bootstrap_seed, int) or isinstance(bootstrap_seed, bool) or abs(bootstrap_seed) > 2**32 - 1:
        raise ValueError('bootstrap_seed must be an integer within the supported 32-bit range')
    gold = _labelset(labels)
    predicted = _predictions(predictions)
    eligible_ids = {claim_id for claim_id, row in gold.items() if row['split'] == 'test'}
    if set(predicted) != eligible_ids:
        missing = sorted(eligible_ids - set(predicted))
        extra = sorted(set(predicted) - eligible_ids)
        raise ValueError(f'Predictions must match the complete held-out test only (missing={missing[:5]}, unexpected={extra[:5]})')
    if not eligible_ids:
        raise ValueError('No held-out test claims')
    records = []
    true_citations = supplied_citations = fully_grounded_supported = false_supported = 0
    rights_not_cleared = []
    for claim_id in sorted(eligible_ids):
        label = gold[claim_id]
        prediction = predicted[claim_id]
        if (prediction['claimTextSha256'] != label['claimTextSha256']
                or prediction['assessmentInputSha256'] != label['assessmentInputSha256']):
            raise ValueError(f'Provider prediction assessment input digest mismatch: {claim_id}')
        if prediction['rightsReviewSha256'] != label['review']['rightsReviewSha256']:
            raise ValueError(f'Provider prediction rights review digest mismatch: {claim_id}')
        approved = {(item['documentId'], item['sha256']) for item in label.get('acceptedCitationHashes', [])}
        cited = {(item['documentId'], hashlib.sha256(item['quote'].encode('utf-8')).hexdigest()) for item in prediction.get('citations', [])}
        supplied_citations += len(cited)
        true_citations += len(cited & approved)
        if label['review']['rightsStatus'] != 'cleared':
            rights_not_cleared.append(claim_id)
        if prediction['verdict'] == 'supported' and label['goldLabel'] != 'supported':
            false_supported += 1
        if (prediction['verdict'] == 'supported' and label['goldLabel'] == 'supported'
                and bool(cited) and cited <= approved):
            fully_grounded_supported += 1
        records.append({
            'id': claim_id, 'sourceId': label['sourceId'], 'claimType': label['claimType'],
            'expected': label['goldLabel'], 'predicted': prediction['verdict'] if prediction['verdict'] is not None else 'provider_failure',
            'citedEvidenceIds': [f'{document}:{digest}' for document, digest in cited],
            'citationsSupplied': len(cited),
            'citationsVerified': len(cited & approved),
            'synthetic': False,
        })
    summary = summarize(records)
    source_count = len({row['sourceId'] for row in records})
    label_counts = Counter(row['expected'] for row in records)
    citation_precision = true_citations / supplied_citations if supplied_citations else 0.0
    blockers = []
    if len(records) < min_test_claims:
        blockers.append(f'Insufficient held-out claims: {len(records)} < {min_test_claims}')
    if source_count < min_test_sources:
        blockers.append(f'Insufficient held-out sources: {source_count} < {min_test_sources}')
    if _macro_f1_unrounded(records) < DEFAULT_MIN_MACRO_F1:
        blockers.append(f'Macro-F1 below release threshold: {summary["macroF1"]} < {DEFAULT_MIN_MACRO_F1}')
    if set(label_counts) != set(LABELS):
        blockers.append('Gold test set does not cover all three verdict classes')
    if rights_not_cleared:
        blockers.append(f'Rights not cleared for {len(rights_not_cleared)} tested claims')
    if citation_precision < min_citation_precision:
        blockers.append('Citation precision below release threshold')
    if false_supported > 0:
        blockers.append('False-supported claims must be investigated before release')
    if fully_grounded_supported == 0:
        blockers.append('No correctly supported claim with independently accepted citations')

    comparison = None
    if baseline_predictions is not None:
        baseline = _baseline_predictions(baseline_predictions)
        if set(baseline) != eligible_ids:
            raise ValueError('Baseline predictions must match the complete held-out test')
        for claim_id in sorted(eligible_ids):
            label = gold[claim_id]
            for field in ('claimTextSha256', 'assessmentInputSha256'):
                if baseline[claim_id][field] != label[field]:
                    raise ValueError(f'Baseline assessment input digest mismatch: {claim_id}')
            if baseline[claim_id]['rightsReviewSha256'] != label['review']['rightsReviewSha256']:
                raise ValueError(f'Baseline rights review digest mismatch: {claim_id}')
        baseline_records = [{
            'id': claim_id, 'sourceId': gold[claim_id]['sourceId'],
            'claimType': gold[claim_id]['claimType'], 'expected': gold[claim_id]['goldLabel'],
            'predicted': baseline[claim_id]['verdict'], 'citedEvidenceIds': [], 'synthetic': False,
        } for claim_id in sorted(eligible_ids)]
        baseline_metrics = summarize(baseline_records)
        ai_false_supported = summary['falseMitigationConfirmations']
        baseline_comparison_false_mitigation = baseline_metrics['falseMitigationConfirmations']
        comparison = {
            'sameHeldoutClaims': len(eligible_ids),
            'aiMacroF1': summary['macroF1'],
            'rulesBaselineMacroF1': baseline_metrics['macroF1'],
            'aiFalseMitigationConfirmations': ai_false_supported,
            'rulesBaselineFalseMitigationConfirmations': baseline_comparison_false_mitigation,
            'aiSource': 'provider predictions included in this evaluation',
            'baselineSource': 'independently exported deterministic rules predictions',
            'baselineVersions': sorted({row['baselineVersion'] for row in baseline.values()}),
            'baselineAssessmentBases': sorted({row['basis'] for row in baseline.values()}),
            'sameFrozenInputsAndRights': True,
        }

    uncertainty = _source_cluster_bootstrap(
        records, replicates=bootstrap_replicates, seed=bootstrap_seed,
        baseline_records=baseline_records if baseline_predictions is not None else None,
    )
    if comparison is not None and 'aiMinusRulesBaselineMacroF1ConfidenceInterval95' in uncertainty:
        comparison['aiMinusRulesMacroF1ConfidenceInterval95'] = uncertainty['aiMinusRulesBaselineMacroF1ConfidenceInterval95']

    executions = [row.get('execution') for row in predicted.values()]
    known = [item for item in executions if item is not None]
    failures = sum(item['status'] == 'provider_failure' for item in known)
    abstentions = sum(row['verdict'] == 'insufficient_evidence' for row in predicted.values())
    latencies = [item['elapsedMs'] for item in known]
    costs = [item.get('costUsd') for item in known]
    operations = {
        'attemptedClaims': len(predicted), 'providerFailureCount': failures,
        'providerFailureRate': round(failures / len(predicted), 4),
        'assessmentAbstentionCount': abstentions, 'assessmentAbstentionRate': round(abstentions / len(predicted), 4),
        'telemetryMissingCount': len(predicted) - len(known),
        'latencyMs': {'count': len(latencies), 'median': median(latencies), 'min': min(latencies), 'max': max(latencies)} if latencies else None,
        'costUsd': sum(costs) if len(costs) == len(predicted) and all(cost is not None for cost in costs) else None,
        'costAvailability': 'recorded' if len(costs) == len(predicted) and all(cost is not None for cost in costs) else 'unavailable_or_incomplete',
    }
    benefit_status = 'paired_baseline_required'
    if comparison is not None:
        interval = comparison.get('aiMinusRulesMacroF1ConfidenceInterval95')
        if comparison['baselineAssessmentBases'] != ['document_assessment']:
            benefit_status = 'incomparable_assessment_basis'
        elif len(comparison['baselineVersions']) != 1:
            benefit_status = 'mixed_baseline_versions'
        elif interval is None:
            benefit_status = 'insufficient_source_clusters'
        elif interval['lower'] > 0 and comparison['aiFalseMitigationConfirmations'] <= comparison['rulesBaselineFalseMitigationConfirmations']:
            benefit_status = 'positive_paired_gain'
        elif interval['upper'] <= 0:
            benefit_status = 'no_demonstrated_gain'
        else:
            benefit_status = 'inconclusive_paired_gain'
    benefit = {'supported': benefit_status == 'positive_paired_gain', 'status': benefit_status,
               'criterion': 'Source-cluster paired macro-F1 interval lower bound > 0, document-assessment basis, no worse false mitigation count',
               'scope': 'Only the named frozen comparator and held-out corpus; not superiority to all rules or other submissions'}

    manifest = hashlib.sha256('\n'.join(json.dumps(row, sort_keys=True, ensure_ascii=False) for row in labels).encode()).hexdigest()
    model_versions = sorted({(row['modelVersion'], row['promptVersion']) for row in predicted.values()})
    if len(model_versions) != 1:
        blockers.append('Mixed model/prompt versions must be evaluated separately')
    if failures:
        blockers.append('Provider failures require investigation; all failed attempts remain in scoring denominators')
    if operations['telemetryMissingCount']:
        blockers.append('Execution telemetry is missing; provider success/failure is not established for all attempts')
    return {
        'status': 'release_gate_passed' if not blockers else 'evaluation_only_not_release_ready',
        'releaseEligible': not blockers, 'releaseBlockers': blockers,
        'activationEligible': not blockers and benefit['supported'] and operations['telemetryMissingCount'] == 0,
        'aiBenefit': benefit,
        'operations': operations,
        'releaseThresholds': {
            'minimumTestClaims': min_test_claims,
            'minimumTestSources': min_test_sources,
            'minimumMacroF1': DEFAULT_MIN_MACRO_F1,
            'minimumCitationPrecision': min_citation_precision,
            'requiredLabels': sorted(LABELS),
            'maximumFalseSupported': 0,
        },
        'benchmark': {'goldRows': len(gold), 'testClaims': len(records), 'testSources': source_count,
                      'testLabelCounts': dict(label_counts), 'goldManifestSha256': manifest,
                      'rightsReviewDigests': sorted({gold[claim_id]['review']['rightsReviewSha256'] for claim_id in eligible_ids}),
                      'humanAdjudicationSuppliedNotIndependentlyVerifiedByThisScript': True},
        'models': [{'modelVersion': model, 'promptVersion': prompt} for model, prompt in model_versions],
        'metrics': {'macroF1': summary['macroF1'], 'perLabel': summary['perLabel'],
                    'falseSupported': false_supported,
                    'falseMitigationConfirmations': summary['falseMitigationConfirmations'],
                    'citationPrecision': round(citation_precision, 4), 'citationsAssessed': supplied_citations,
                    'verifiedGoldCitationMatches': true_citations,
                    'fullyGroundedCorrectlySupported': fully_grounded_supported},
        'rulesBaselineComparison': comparison,
        'uncertainty': uncertainty,
        'limitations': [
            'Ground-truth authenticity and source licensing remain reviewer responsibilities.',
            'Citation digests match reviewer-supplied quote hashes, not independent document authenticity.',
            'This evaluates document-claim assessment, not physical methane leak status or forecast performance.',
        ],
    }


def main() -> None:
    from annotator_agreement import _resolve_private_input, write_private_report
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--gold', type=Path, required=True, help='Human-adjudicated JSONL with source-disjoint train/dev/test splits')
    parser.add_argument('--predictions', type=Path, required=True, help='Predictions for every held-out test claim')
    parser.add_argument('--baseline-predictions', type=Path, help='Optional deterministic-rules predictions for the exact same held-out claims')
    parser.add_argument('--bootstrap-replicates', type=int, default=DEFAULT_BOOTSTRAP_REPLICATES)
    parser.add_argument('--bootstrap-seed', type=int, default=DEFAULT_BOOTSTRAP_SEED)
    parser.add_argument('--out', type=Path, required=True, help='New owner-only report outside the repository')
    parser.add_argument('--strict', action='store_true', help='Exit nonzero when evidence release gates are not met')
    args = parser.parse_args()
    gold_path = _resolve_private_input(args.gold)
    predictions_path = _resolve_private_input(args.predictions)
    baseline_path = _resolve_private_input(args.baseline_predictions) if args.baseline_predictions else None
    report = evaluate(read_jsonl(gold_path), read_jsonl(predictions_path),
                      baseline_predictions=read_jsonl(baseline_path) if baseline_path else None,
                      bootstrap_replicates=args.bootstrap_replicates, bootstrap_seed=args.bootstrap_seed)
    report['publicReleaseApproved'] = False
    report['inputSha256'] = {name: hashlib.sha256(path.read_bytes()).hexdigest()
                            for name, path in (('gold', gold_path), ('predictions', predictions_path), ('baseline', baseline_path)) if path}
    write_private_report(args.out, report)
    print(json.dumps({'privateReportWritten': True, 'releaseEligible': report['releaseEligible'],
                      'activationEligible': report['activationEligible']}))
    if args.strict and not report['releaseEligible']:
        raise SystemExit(2)


if __name__ == '__main__':
    main()
