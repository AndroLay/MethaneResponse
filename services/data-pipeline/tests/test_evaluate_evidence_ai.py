from __future__ import annotations

import hashlib
import json
from pathlib import Path
import sys

import pytest

from evaluate_evidence_ai import evaluate, main

QUOTE = 'The independent field inspection was completed.'
DIGEST = hashlib.sha256(QUOTE.encode()).hexdigest()
RIGHTS_REVIEW_DIGEST = 'a' * 64


def baseline_row(claim_id, verdict):
    return {'claimId': claim_id, 'verdict': verdict, 'claimTextSha256': 'c' * 64,
            'assessmentInputSha256': 'd' * 64, 'rightsReviewSha256': RIGHTS_REVIEW_DIGEST,
            'baselineVersion': 'test-document-rules-v1', 'basis': 'document_assessment'}


def row(claim_id='one', source='KAZ_S_159', split='test', label='supported', rights='cleared', claim='source_detected', document_id=None):
    document_id = document_id or f'report-{claim_id}'
    return {'claimId': claim_id, 'sourceId': source, 'split': split, 'claimType': claim, 'goldLabel': label,
            'claimTextSha256': 'c' * 64, 'assessmentInputSha256': 'd' * 64,
            'synthetic': False, 'review': {'reviewerId': 'reviewer-1', 'reviewedAt': '2026-10-13', 'sourceInspected': True,
                                           'rightsStatus': rights, 'rightsReviewSha256': RIGHTS_REVIEW_DIGEST},
            'documentIds': [document_id],
            'acceptedCitationHashes': [{'documentId': document_id, 'sha256': DIGEST}]}


def prediction(claim_id='one', label='supported', quote=QUOTE, document_id=None):
    document_id = document_id or f'report-{claim_id}'
    return {'claimId': claim_id, 'verdict': label, 'citations': [{'documentId': document_id, 'quote': quote}],
            'execution': {'status': 'completed', 'elapsedMs': 20, 'costUsd': None},
            'modelVersion': 'provider-model-1', 'promptVersion': 'claim-evidence-v2',
            'claimTextSha256': 'c' * 64, 'assessmentInputSha256': 'd' * 64,
            'rightsReviewSha256': RIGHTS_REVIEW_DIGEST}


def test_valid_evaluation_hashes_citations_and_counts_missing_classes_as_zero():
    report = evaluate([row()], [prediction()], min_test_claims=1, min_test_sources=1)
    assert report['metrics']['macroF1'] == 0.3333
    assert report['metrics']['citationPrecision'] == 1.0
    assert report['metrics']['fullyGroundedCorrectlySupported'] == 1
    assert not report['releaseEligible']


def test_bad_quote_is_not_a_correct_citation():
    report = evaluate([row()], [prediction(quote='Different assertion.')], min_test_claims=1, min_test_sources=1)
    assert report['metrics']['citationPrecision'] == 0
    assert report['metrics']['fullyGroundedCorrectlySupported'] == 0


def test_refuses_source_overlap_across_splits_and_incomplete_holdout():
    with pytest.raises(ValueError, match='Source-disjoint'):
        evaluate([row(), row(claim_id='two', split='train')], [prediction()], min_test_claims=1, min_test_sources=1)
    with pytest.raises(ValueError, match='complete held-out test'):
        evaluate([row(), row(claim_id='two', source='OTHER')], [prediction()], min_test_claims=1, min_test_sources=1)


def test_refuses_document_overlap_across_source_disjoint_splits():
    labels = [row(claim_id='train-a', source='A', split='train', document_id='shared-report'),
              row(claim_id='test-b', source='B', split='test', document_id='shared-report')]
    with pytest.raises(ValueError, match='Document-disjoint'):
        evaluate(labels, [prediction(claim_id='test-b', document_id='shared-report')],
                 min_test_claims=1, min_test_sources=1)


def test_rejects_gold_citation_for_document_absent_from_claim_inputs():
    label = row(document_id='input-report')
    label['acceptedCitationHashes'][0]['documentId'] = 'other-report'
    with pytest.raises(ValueError, match='citation document is not in documentIds'):
        evaluate([label], [prediction(document_id='input-report')], min_test_claims=1, min_test_sources=1)


def test_blocks_synthetic_or_unreviewed_gold_and_unlicensed_release():
    synthetic = row(); synthetic['synthetic'] = True
    with pytest.raises(ValueError, match='Synthetic'):
        evaluate([synthetic], [prediction()])
    unreviewed = row(); unreviewed['review']['sourceInspected'] = False
    with pytest.raises(ValueError, match='source inspection'):
        evaluate([unreviewed], [prediction()])
    report = evaluate([row(rights='unverified')], [prediction()], min_test_claims=1, min_test_sources=1)
    assert any('Rights not cleared' in blocker for blocker in report['releaseBlockers'])


def test_binds_provider_predictions_to_the_exact_adjudicated_rights_review():
    label = row()
    label['review']['rightsReviewSha256'] = 'b' * 64
    with pytest.raises(ValueError, match='rights review digest mismatch'):
        evaluate([label], [prediction()], min_test_claims=1, min_test_sources=1)

    malformed = row()
    malformed['review']['rightsReviewSha256'] = 'not-a-digest'
    with pytest.raises(ValueError, match='rightsReviewSha256'):
        evaluate([malformed], [prediction()], min_test_claims=1, min_test_sources=1)


def test_binds_provider_predictions_to_the_exact_adjudicated_claim_and_document_input():
    label = row()
    changed = prediction()
    changed['assessmentInputSha256'] = 'e' * 64
    with pytest.raises(ValueError, match='assessment input digest mismatch'):
        evaluate([label], [changed], min_test_claims=1, min_test_sources=1)


def test_false_mitigation_confirmation_is_flagged():
    report = evaluate([row(label='insufficient_evidence', claim='mitigation_confirmed')],
                      [prediction()], min_test_claims=1, min_test_sources=1)
    assert report['metrics']['falseMitigationConfirmations'] == 1
    assert report['metrics']['falseSupported'] == 1


def test_complete_multiclass_heldout_set_can_pass_configurable_gate():
    labels = [row(claim_id='a', source='A'), row(claim_id='b', source='B', label='contradicted'),
              row(claim_id='c', source='C', label='insufficient_evidence')]
    predictions = [prediction(claim_id='a'), prediction(claim_id='b', label='contradicted'),
                   prediction(claim_id='c', label='insufficient_evidence')]
    report = evaluate(labels, predictions, min_test_claims=3, min_test_sources=3)
    assert report['releaseEligible']
    assert report['metrics']['macroF1'] == 1


def test_low_macro_f1_blocks_release_even_when_citations_are_valid():
    labels = [row(claim_id='a', source='A', label='supported'),
              row(claim_id='b', source='B', label='contradicted'),
              row(claim_id='c', source='C', label='insufficient_evidence')]
    predictions = [prediction(claim_id='a', label='supported'),
                   prediction(claim_id='b', label='insufficient_evidence'),
                   prediction(claim_id='c', label='insufficient_evidence')]
    report = evaluate(labels, predictions, min_test_claims=3, min_test_sources=3)
    assert report['metrics']['macroF1'] == 0.5556
    assert report['metrics']['citationPrecision'] == 1.0
    assert report['metrics']['fullyGroundedCorrectlySupported'] == 1
    assert not report['releaseEligible']
    assert any('Macro-F1 below release threshold' in blocker for blocker in report['releaseBlockers'])


def test_duplicate_predictions_are_rejected():
    with pytest.raises(ValueError, match='Duplicate prediction'):
        evaluate([row()], [prediction(), prediction()])


def test_compares_ai_and_rules_baseline_on_identical_heldout_claims():
    labels = [row(claim_id='a', source='A'), row(claim_id='b', source='B', label='contradicted'),
              row(claim_id='c', source='C', label='insufficient_evidence')]
    ai = [prediction(claim_id='a'), prediction(claim_id='b', label='contradicted'),
          prediction(claim_id='c', label='insufficient_evidence')]
    baseline = [baseline_row('a', 'insufficient_evidence'), baseline_row('b', 'contradicted'),
                baseline_row('c', 'insufficient_evidence')]
    report = evaluate(labels, ai, baseline_predictions=baseline, min_test_claims=3, min_test_sources=3)
    assert report['rulesBaselineComparison']['sameHeldoutClaims'] == 3
    assert report['rulesBaselineComparison']['aiMacroF1'] > report['rulesBaselineComparison']['rulesBaselineMacroF1']
    with pytest.raises(ValueError, match='complete held-out test'):
        evaluate(labels, ai, baseline_predictions=baseline[:2], min_test_claims=3, min_test_sources=3)


def test_reports_reproducible_source_cluster_intervals_and_paired_baseline():
    labels = [row(claim_id='a', source='A'), row(claim_id='b', source='B', label='contradicted'),
              row(claim_id='c', source='C', label='insufficient_evidence')]
    predictions = [prediction(claim_id='a'), prediction(claim_id='b', label='contradicted'),
                   prediction(claim_id='c', label='insufficient_evidence')]
    baseline = [baseline_row('a', 'supported'), baseline_row('b', 'contradicted'),
                baseline_row('c', 'insufficient_evidence')]

    report = evaluate(labels, predictions, baseline_predictions=baseline,
                      min_test_claims=3, min_test_sources=3,
                      bootstrap_replicates=40, bootstrap_seed=71)
    uncertainty = report['uncertainty']
    assert uncertainty['status'] == 'estimated'
    assert uncertainty['resamplingUnit'] == 'sourceId'
    assert uncertainty['replicatesCompleted'] == 40
    assert uncertainty['seed'] == 71
    assert uncertainty['confidenceIntervals95']['macroF1'] == {'lower': 0.3333, 'upper': 1.0}
    assert uncertainty['confidenceIntervals95']['citationPrecision'] == {'lower': 1.0, 'upper': 1.0}
    repeated = evaluate(labels, predictions, baseline_predictions=baseline,
                        min_test_claims=3, min_test_sources=3,
                        bootstrap_replicates=40, bootstrap_seed=71)
    assert repeated['uncertainty']['confidenceIntervals95'] == uncertainty['confidenceIntervals95']
    assert report['rulesBaselineComparison']['aiMinusRulesMacroF1ConfidenceInterval95'] == {
        'lower': 0.0, 'upper': 0.0,
    }


def test_does_not_claim_bootstrap_precision_from_one_source_cluster():
    labels = [row(claim_id='a', source='ONLY', label='supported'),
              row(claim_id='b', source='ONLY', label='contradicted'),
              row(claim_id='c', source='ONLY', label='insufficient_evidence')]
    predictions = [prediction(claim_id='a'), prediction(claim_id='b', label='contradicted'),
                   prediction(claim_id='c', label='insufficient_evidence')]
    report = evaluate(labels, predictions, min_test_claims=3, min_test_sources=1,
                      bootstrap_replicates=40, bootstrap_seed=71)
    assert report['uncertainty']['status'] == 'insufficient_source_clusters'
    assert report['uncertainty']['confidenceIntervals95'] is None


@pytest.mark.parametrize('field', ['claimTextSha256', 'assessmentInputSha256', 'rightsReviewSha256'])
def test_baseline_must_bind_exact_same_input_and_rights(field):
    baseline = baseline_row('one', 'supported')
    baseline[field] = 'e' * 64
    with pytest.raises(ValueError, match='Baseline.*digest mismatch'):
        evaluate([row()], [prediction()], baseline_predictions=[baseline])


def test_metadata_coverage_comparison_does_not_claim_document_ai_benefit():
    baseline = baseline_row('one', 'insufficient_evidence')
    baseline['basis'] = 'metadata_coverage'
    report = evaluate([row()], [prediction()], baseline_predictions=[baseline])
    assert not report['aiBenefit']['supported']
    assert report['aiBenefit']['status'] == 'incomparable_assessment_basis'
    assert not report['activationEligible']


def test_absolute_pass_does_not_activate_ai_without_paired_added_benefit():
    labels = [row('a', 'A'), row('b', 'B', label='contradicted'), row('c', 'C', label='insufficient_evidence')]
    predictions = [prediction('a'), prediction('b', 'contradicted'), prediction('c', 'insufficient_evidence')]
    baseline = [baseline_row('a', 'supported'), baseline_row('b', 'contradicted'), baseline_row('c', 'insufficient_evidence')]
    report = evaluate(labels, predictions, baseline_predictions=baseline, min_test_claims=3, min_test_sources=3)
    assert report['releaseEligible']
    assert report['aiBenefit']['status'] == 'no_demonstrated_gain'
    assert not report['activationEligible']


def test_provider_failure_is_counted_as_error_not_a_correct_insufficient_prediction():
    failure = prediction('one', 'insufficient_evidence')
    failure.update(verdict=None, citations=[], execution={'status': 'provider_failure', 'elapsedMs': 40000,
                                                        'errorCode': 'timeout', 'costUsd': None})
    report = evaluate([row(label='insufficient_evidence')], [failure], min_test_claims=1, min_test_sources=1)
    assert report['metrics']['perLabel']['insufficient_evidence']['recall'] == 0
    assert report['operations']['providerFailureCount'] == 1
    assert report['operations']['assessmentAbstentionCount'] == 0
    assert report['operations']['latencyMs']['median'] == 40000
    assert report['operations']['costUsd'] is None
    assert not report['activationEligible']


def test_legacy_predictions_keep_scores_but_report_missing_telemetry():
    legacy = prediction()
    legacy.pop('execution')
    report = evaluate([row()], [legacy])
    assert report['operations']['telemetryMissingCount'] == 1
    assert report['operations']['latencyMs'] is None
    assert not report['releaseEligible']
    assert any('telemetry' in reason.lower() for reason in report['releaseBlockers'])


def test_failure_cannot_carry_a_success_verdict_or_quote():
    failure = prediction()
    failure['execution'] = {'status': 'provider_failure', 'elapsedMs': 1, 'errorCode': 'provider_error', 'costUsd': None}
    with pytest.raises(ValueError, match='failure'):
        evaluate([row()], [failure])


def test_positive_paired_gain_and_complete_telemetry_allow_separate_activation_gate():
    labels, ai, baseline = [], [], []
    for source in ('A', 'B', 'C'):
        for label in ('supported', 'contradicted', 'insufficient_evidence'):
            claim_id = f'{source}-{label}'
            labels.append(row(claim_id, source, label=label))
            output = prediction(claim_id, label)
            output['execution'] = {'status': 'completed', 'elapsedMs': 20, 'costUsd': None}
            ai.append(output)
            baseline.append(baseline_row(claim_id, 'insufficient_evidence'))
    report = evaluate(labels, ai, baseline_predictions=baseline, min_test_claims=9, min_test_sources=3)
    assert report['releaseEligible']
    assert report['aiBenefit']['supported']
    assert report['activationEligible']
    assert report['operations']['costUsd'] is None


def test_cli_enforces_private_no_overwrite_and_quiet_output(tmp_path, monkeypatch, capsys):
    gold_path, prediction_path = tmp_path / 'gold.jsonl', tmp_path / 'predictions.jsonl'
    for path, data in ((gold_path, row()), (prediction_path, prediction())):
        path.write_text(json.dumps(data) + '\n')
        path.chmod(0o600)
    output = tmp_path / 'report.json'
    monkeypatch.setattr(sys, 'argv', ['evaluate_evidence_ai.py', '--gold', str(gold_path),
        '--predictions', str(prediction_path), '--out', str(output)])
    main()
    assert json.loads(capsys.readouterr().out) == {'privateReportWritten': True, 'releaseEligible': False, 'activationEligible': False}
    assert output.stat().st_mode & 0o777 == 0o600
    with pytest.raises(ValueError, match='overwrite'):
        main()


def test_mixed_model_versions_do_not_pass_absolute_gate():
    labels = [row('a', 'A'), row('b', 'B', label='contradicted'), row('c', 'C', label='insufficient_evidence')]
    predictions = [prediction('a'), prediction('b', 'contradicted'), prediction('c', 'insufficient_evidence')]
    predictions[1]['modelVersion'] = 'other-version'
    report = evaluate(labels, predictions, min_test_claims=3, min_test_sources=3)
    assert not report['releaseEligible']
    assert any('Mixed model' in reason for reason in report['releaseBlockers'])
