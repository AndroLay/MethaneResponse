import json
import stat
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import annotator_agreement  # noqa: E402
from annotator_agreement import _resolve_private_input, compare_annotations, main, write_private_report  # noqa: E402


def annotation_row(claim_id, source_id, label, *, reviewer, split='test', document='doc-1', quote_hash='a' * 64):
    return {
        'claimId': claim_id,
        'sourceId': source_id,
        'documentIds': [document],
        'split': split,
        'claimType': 'source_detected',
        'claimTextSha256': 'f' * 64,
        'assessmentInputSha256': 'd' * 64,
        'label': label,
        'synthetic': False,
        'review': {
            'reviewerId': reviewer,
            'reviewedAt': '2026-10-15',
            'sourceInspected': True,
            'rightsStatus': 'cleared',
            'rightsReviewSha256': 'b' * 64,
        },
        'acceptedCitationHashes': [{'documentId': document, 'sha256': quote_hash}],
    }


def annotations(reviewer):
    return [
        annotation_row('claim-a', 'source-a', 'supported', reviewer=reviewer, document='doc-a', quote_hash='1' * 64),
        annotation_row('claim-b', 'source-b', 'insufficient_evidence', reviewer=reviewer, document='doc-b', quote_hash='2' * 64),
        annotation_row('claim-c', 'source-c', 'contradicted', reviewer=reviewer, document='doc-c', quote_hash='3' * 64),
    ]


def test_identical_independent_labels_and_citation_hashes_have_perfect_agreement_without_finalizing_gold():
    report = compare_annotations(annotations('reviewer-a'), annotations('reviewer-b'))

    assert report['inputSummary'] == {
        'reviewerCount': 2,
        'claimCount': 3,
        'sourceCount': 3,
        'documentCount': 3,
        'rightsStatus': 'cleared',
        'splitCounts': {'test': 3},
    }
    assert report['metrics']['rawLabelAgreement'] == 1.0
    assert report['metrics']['cohensKappa'] == 1.0
    assert report['metrics']['exactCitationSetAgreement'] == 1.0
    assert report['metrics']['adjudicationRequiredCount'] == 0
    assert report['adjudicationQueue'] == []
    assert report['goldLabelsCreated'] is False


def test_label_or_citation_conflicts_are_queued_without_copying_raw_review_text():
    reviewer_a = [annotation_row('claim-a', 'source-a', 'supported', reviewer='reviewer-a')]
    reviewer_b = [annotation_row('claim-a', 'source-a', 'insufficient_evidence', reviewer='reviewer-b', quote_hash='c' * 64)]
    reviewer_a[0]['privateRationale'] = 'PRIVATE_REVIEW_TEXT_SHOULD_NOT_APPEAR_IN_REPORT'
    reviewer_b[0]['privateRationale'] = 'PRIVATE_REVIEW_TEXT_SHOULD_NOT_APPEAR_IN_REPORT'

    report = compare_annotations(reviewer_a, reviewer_b)

    assert report['metrics']['rawLabelAgreement'] == 0.0
    assert report['metrics']['cohensKappa'] == 0.0
    assert report['metrics']['labelDisagreementCount'] == 1
    assert report['metrics']['citationDisagreementCount'] == 1
    assert report['metrics']['adjudicationRequiredCount'] == 1
    assert report['adjudicationQueue'] == [{
        'claimId': 'claim-a',
        'sourceId': 'source-a',
        'split': 'test',
        'claimType': 'source_detected',
        'labelDisagreement': True,
        'citationDisagreement': True,
        'reviewerALabel': 'supported',
        'reviewerBLabel': 'insufficient_evidence',
    }]
    assert 'PRIVATE_REVIEW_TEXT_SHOULD_NOT_APPEAR_IN_REPORT' not in json.dumps(report)
    assert 'a' * 64 not in json.dumps(report)
    assert 'c' * 64 not in json.dumps(report)


def test_reviewers_must_annotate_the_same_frozen_claim_wording_and_inputs():
    reviewer_a = annotations('reviewer-a')
    reviewer_b = annotations('reviewer-b')
    reviewer_b[0]['claimTextSha256'] = 'e' * 64

    with pytest.raises(ValueError, match='Frozen claim/input mismatch'):
        compare_annotations(reviewer_a, reviewer_b)


def test_reviewers_must_inspect_the_exact_same_document_excerpt_input():
    reviewer_a = annotations('reviewer-a')
    reviewer_b = annotations('reviewer-b')
    reviewer_b[0]['assessmentInputSha256'] = 'e' * 64

    with pytest.raises(ValueError, match='Frozen claim/input mismatch'):
        compare_annotations(reviewer_a, reviewer_b)


def test_noncleared_rights_synthetic_rows_and_uninspected_sources_are_rejected():
    for field, value, message in [
        ('rightsStatus', 'unverified', 'Rights are not cleared'),
        ('sourceInspected', False, 'Source inspection is required'),
    ]:
        reviewer_a = annotations('reviewer-a')
        reviewer_b = annotations('reviewer-b')
        reviewer_a[0]['review'][field] = value
        with pytest.raises(ValueError, match=message):
            compare_annotations(reviewer_a, reviewer_b)

    synthetic = annotations('reviewer-a')
    synthetic[0]['synthetic'] = True
    with pytest.raises(ValueError, match='Synthetic annotation prohibited'):
        compare_annotations(synthetic, annotations('reviewer-b'))


def test_one_source_or_document_cannot_cross_annotation_splits():
    reviewer_a = [
        annotation_row('claim-a', 'source-a', 'supported', reviewer='reviewer-a', split='train', document='doc-a'),
        annotation_row('claim-b', 'source-a', 'contradicted', reviewer='reviewer-a', split='test', document='doc-b'),
    ]
    reviewer_b = [
        annotation_row('claim-a', 'source-a', 'supported', reviewer='reviewer-b', split='train', document='doc-a'),
        annotation_row('claim-b', 'source-a', 'contradicted', reviewer='reviewer-b', split='test', document='doc-b'),
    ]

    with pytest.raises(ValueError, match='Source-disjoint split violation'):
        compare_annotations(reviewer_a, reviewer_b)

    reviewer_a[0]['sourceId'] = 'source-a'
    reviewer_a[1]['sourceId'] = 'source-b'
    reviewer_b[0]['sourceId'] = 'source-a'
    reviewer_b[1]['sourceId'] = 'source-b'
    reviewer_a[1]['documentIds'] = ['doc-a']
    reviewer_b[1]['documentIds'] = ['doc-a']
    reviewer_a[1]['acceptedCitationHashes'][0]['documentId'] = 'doc-a'
    reviewer_b[1]['acceptedCitationHashes'][0]['documentId'] = 'doc-a'

    with pytest.raises(ValueError, match='Document-disjoint split violation'):
        compare_annotations(reviewer_a, reviewer_b)


def test_single_class_agreement_does_not_report_kappa_as_perfect_evidence():
    row_a = annotation_row('claim-a', 'source-a', 'supported', reviewer='reviewer-a')
    row_b = annotation_row('claim-a', 'source-a', 'supported', reviewer='reviewer-b')

    report = compare_annotations([row_a], [row_b])

    assert report['metrics']['rawLabelAgreement'] == 1.0
    assert report['metrics']['cohensKappa'] is None
    assert report['metrics']['cohensKappaStatus'] == 'undefined_expected_agreement_is_one'


@pytest.mark.parametrize('field,value', [
    ('split', []),
    ('claimType', {}),
    ('label', []),
])
def test_malformed_enum_values_fail_closed_with_validation_errors(field, value):
    reviewer_a = annotations('reviewer-a')
    reviewer_b = annotations('reviewer-b')
    reviewer_a[0][field] = value
    reviewer_b[0][field] = value

    with pytest.raises(ValueError, match='Invalid'):
        compare_annotations(reviewer_a, reviewer_b)


def test_private_input_path_inside_repository_is_rejected():
    with pytest.raises(ValueError, match='outside the repository'):
        _resolve_private_input(Path(__file__).resolve())


def test_private_input_file_with_group_permissions_is_rejected(tmp_path):
    annotation_path = tmp_path / 'review.jsonl'
    annotation_path.write_text('{}\n')
    annotation_path.chmod(0o640)

    with pytest.raises(ValueError, match='owner-only permissions'):
        _resolve_private_input(annotation_path)


def test_private_input_in_shared_directory_is_rejected(tmp_path):
    shared_directory = tmp_path / 'shared'
    shared_directory.mkdir()
    shared_directory.chmod(0o755)
    annotation_path = shared_directory / 'review.jsonl'
    annotation_path.write_text('{}\n')
    annotation_path.chmod(0o600)

    with pytest.raises(ValueError, match='owner-only permissions'):
        _resolve_private_input(annotation_path)


def test_report_is_private_and_never_overwrites_existing_file(tmp_path):
    report_path = tmp_path / 'agreement.json'
    report = {'goldLabelsCreated': False}

    write_private_report(report_path, report)

    assert stat.S_IMODE(report_path.stat().st_mode) == 0o600
    assert json.loads(report_path.read_text()) == report
    with pytest.raises(ValueError, match='Refusing to overwrite'):
        write_private_report(report_path, {'goldLabelsCreated': True})
    assert json.loads(report_path.read_text()) == report


def test_report_in_shared_directory_is_rejected(tmp_path):
    shared_directory = tmp_path / 'shared'
    shared_directory.mkdir()
    shared_directory.chmod(0o755)

    with pytest.raises(ValueError, match='owner-only permissions'):
        write_private_report(shared_directory / 'agreement.json', {'goldLabelsCreated': False})


def test_cli_processes_private_files_without_echoing_the_private_path(tmp_path, monkeypatch, capsys):
    private_directory = tmp_path / 'restricted'
    private_directory.mkdir()
    private_directory.chmod(0o700)
    reviewer_a_path = private_directory / 'review-a.jsonl'
    reviewer_b_path = private_directory / 'review-b.jsonl'
    output_path = private_directory / 'agreement.json'
    reviewer_a_path.write_text('\n'.join(json.dumps(row) for row in annotations('reviewer-a')) + '\n')
    reviewer_b_path.write_text('\n'.join(json.dumps(row) for row in annotations('reviewer-b')) + '\n')
    reviewer_a_path.chmod(0o600)
    reviewer_b_path.chmod(0o600)
    monkeypatch.setattr(sys, 'argv', [
        'annotator_agreement.py',
        '--reviewer-a', str(reviewer_a_path),
        '--reviewer-b', str(reviewer_b_path),
        '--output', str(output_path),
    ])

    main()

    cli_result = capsys.readouterr().out
    assert private_directory.as_posix() not in cli_result
    assert json.loads(cli_result) == {
        'status': 'pre_adjudication_report_written',
        'outputWritten': True,
        'claimCount': 3,
        'adjudicationRequiredCount': 0,
        'goldLabelsCreated': False,
    }
    report = json.loads(output_path.read_text())
    assert report['inputSummary']['claimCount'] == 3
    assert stat.S_IMODE(output_path.stat().st_mode) == 0o600
    assert 'reviewer-a' not in json.dumps(report)
    assert 'reviewer-b' not in json.dumps(report)


def test_report_path_inside_repository_is_rejected_even_when_repo_directory_is_group_readable(tmp_path, monkeypatch):
    repository_root = tmp_path / 'repo'
    repository_root.mkdir()
    repository_root.chmod(0o755)
    monkeypatch.setattr(annotator_agreement, 'ROOT', repository_root)

    with pytest.raises(ValueError, match='outside the repository'):
        write_private_report(repository_root / 'annotator-agreement-test-report.json', {'goldLabelsCreated': False})
