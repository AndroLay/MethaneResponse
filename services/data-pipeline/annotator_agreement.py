"""Compare two private, independently completed evidence annotations.

The report contains agreement metrics and conflict IDs only. It never emits
claim wording, excerpts, rationale, reviewer IDs, or final gold labels.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import stat
from collections import Counter
from datetime import date
from pathlib import Path
from typing import Any

from evaluate_baseline import LABELS

ROOT = Path(__file__).resolve().parents[2]
HASH = re.compile(r'^[0-9a-f]{64}$')
CLAIM_TYPES = {'source_detected', 'operator_notified', 'mitigation_confirmed'}
SPLITS = {'train', 'dev', 'test'}
MAX_ANNOTATION_BYTES = 5_000_000
MAX_ANNOTATION_ROWS = 10_000


def _required_text(value: object, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f'Missing or empty {field}')
    return value.strip()


def _validate_annotations(rows: list[dict[str, Any]], reviewer_slot: str) -> tuple[str, dict[str, dict[str, Any]]]:
    if not rows or len(rows) > MAX_ANNOTATION_ROWS:
        raise ValueError(f'{reviewer_slot} must contain 1 to {MAX_ANNOTATION_ROWS} rows')

    by_claim: dict[str, dict[str, Any]] = {}
    reviewer_ids: set[str] = set()
    source_splits: dict[str, str] = {}
    document_splits: dict[str, str] = {}

    for row in rows:
        if not isinstance(row, dict):
            raise ValueError(f'{reviewer_slot} rows must be JSON objects')
        claim_id = _required_text(row.get('claimId'), 'claimId')
        if claim_id in by_claim:
            raise ValueError(f'Duplicate claimId in {reviewer_slot}: {claim_id}')
        source_id = _required_text(row.get('sourceId'), 'sourceId')
        split = row.get('split')
        if not isinstance(split, str) or split not in SPLITS:
            raise ValueError(f'Invalid split for {claim_id}')
        if source_id in source_splits and source_splits[source_id] != split:
            raise ValueError(f'Source-disjoint split violation: {source_id}')
        source_splits[source_id] = split

        document_ids = row.get('documentIds')
        if not isinstance(document_ids, list) or not document_ids:
            raise ValueError(f'At least one documentId is required for {claim_id}')
        normalized_documents = [_required_text(item, 'documentId') for item in document_ids]
        if len(normalized_documents) != len(set(normalized_documents)):
            raise ValueError(f'Duplicate documentId in {claim_id}')
        for document_id in normalized_documents:
            if document_id in document_splits and document_splits[document_id] != split:
                raise ValueError(f'Document-disjoint split violation: {document_id}')
            document_splits[document_id] = split

        claim_type = row.get('claimType')
        if not isinstance(claim_type, str) or claim_type not in CLAIM_TYPES:
            raise ValueError(f'Invalid claimType for {claim_id}')
        label = row.get('label')
        if not isinstance(label, str) or label not in LABELS:
            raise ValueError(f'Invalid annotation label for {claim_id}')
        claim_text_sha256 = str(row.get('claimTextSha256', ''))
        if not HASH.fullmatch(claim_text_sha256):
            raise ValueError(f'Invalid frozen claimTextSha256 for {claim_id}')
        assessment_input_sha256 = str(row.get('assessmentInputSha256', ''))
        if not HASH.fullmatch(assessment_input_sha256):
            raise ValueError(f'Invalid frozen assessmentInputSha256 for {claim_id}')
        if row.get('synthetic') is not False:
            raise ValueError(f'Synthetic annotation prohibited: {claim_id}')

        review = row.get('review')
        if not isinstance(review, dict):
            raise ValueError(f'Human review is required for {claim_id}')
        reviewer_id = _required_text(review.get('reviewerId'), 'reviewerId')
        reviewer_ids.add(reviewer_id)
        if review.get('sourceInspected') is not True:
            raise ValueError(f'Source inspection is required for {claim_id}')
        if review.get('rightsStatus') != 'cleared':
            raise ValueError(f'Rights are not cleared for {claim_id}')
        rights_digest = str(review.get('rightsReviewSha256', ''))
        if not HASH.fullmatch(rights_digest):
            raise ValueError(f'Invalid rightsReviewSha256 for {claim_id}')
        reviewed_at = _required_text(review.get('reviewedAt'), 'reviewedAt')
        try:
            date.fromisoformat(reviewed_at[:10])
        except ValueError as exc:
            raise ValueError(f'Invalid reviewedAt for {claim_id}') from exc

        citations = row.get('acceptedCitationHashes', [])
        if not isinstance(citations, list):
            raise ValueError(f'acceptedCitationHashes must be an array for {claim_id}')
        citation_hashes: set[tuple[str, str]] = set()
        for citation in citations:
            if not isinstance(citation, dict):
                raise ValueError(f'Invalid citation digest for {claim_id}')
            document_id = _required_text(citation.get('documentId'), 'citation documentId')
            digest = str(citation.get('sha256', ''))
            if document_id not in normalized_documents or not HASH.fullmatch(digest):
                raise ValueError(f'Invalid or unbound citation digest for {claim_id}')
            key = (document_id, digest)
            if key in citation_hashes:
                raise ValueError(f'Duplicate citation digest for {claim_id}')
            citation_hashes.add(key)

        by_claim[claim_id] = {
            'sourceId': source_id,
            'documentIds': tuple(sorted(normalized_documents)),
            'split': split,
            'claimType': claim_type,
            'claimTextSha256': claim_text_sha256,
            'assessmentInputSha256': assessment_input_sha256,
            'label': label,
            'rightsReviewSha256': rights_digest,
            'citationHashes': frozenset(citation_hashes),
        }

    if len(reviewer_ids) != 1:
        raise ValueError(f'{reviewer_slot} must use exactly one opaque reviewerId')
    return next(iter(reviewer_ids)), by_claim


def compare_annotations(reviewer_a_rows: list[dict[str, Any]], reviewer_b_rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Return pre-adjudication agreement metrics without creating gold labels."""
    a_reviewer_id, reviewer_a = _validate_annotations(reviewer_a_rows, 'reviewer A')
    b_reviewer_id, reviewer_b = _validate_annotations(reviewer_b_rows, 'reviewer B')
    if a_reviewer_id == b_reviewer_id:
        raise ValueError('Reviewer IDs must be distinct')
    if set(reviewer_a) != set(reviewer_b):
        missing = sorted(set(reviewer_a) - set(reviewer_b))
        extra = sorted(set(reviewer_b) - set(reviewer_a))
        raise ValueError(f'Reviewer claim sets differ (missing={missing[:5]}, extra={extra[:5]})')

    claim_ids = sorted(reviewer_a)
    confusion = {a: {b: 0 for b in LABELS} for a in LABELS}
    a_counts: Counter[str] = Counter()
    b_counts: Counter[str] = Counter()
    label_matches = citation_matches = label_disagreements = citation_disagreements = 0
    queue: list[dict[str, Any]] = []
    split_counts: Counter[str] = Counter()
    source_ids: set[str] = set()
    document_ids: set[str] = set()

    bound_fields = ('sourceId', 'documentIds', 'split', 'claimType', 'claimTextSha256', 'assessmentInputSha256', 'rightsReviewSha256')
    for claim_id in claim_ids:
        a = reviewer_a[claim_id]
        b = reviewer_b[claim_id]
        if any(a[field] != b[field] for field in bound_fields):
            raise ValueError(f'Frozen claim/input mismatch for {claim_id}')
        source_ids.add(a['sourceId'])
        document_ids.update(a['documentIds'])
        split_counts[a['split']] += 1
        confusion[a['label']][b['label']] += 1
        a_counts[a['label']] += 1
        b_counts[b['label']] += 1

        label_disagreement = a['label'] != b['label']
        citation_disagreement = a['citationHashes'] != b['citationHashes']
        label_matches += int(not label_disagreement)
        citation_matches += int(not citation_disagreement)
        label_disagreements += int(label_disagreement)
        citation_disagreements += int(citation_disagreement)
        if label_disagreement or citation_disagreement:
            queue.append({
                'claimId': claim_id,
                'sourceId': a['sourceId'],
                'split': a['split'],
                'claimType': a['claimType'],
                'labelDisagreement': label_disagreement,
                'citationDisagreement': citation_disagreement,
                'reviewerALabel': a['label'],
                'reviewerBLabel': b['label'],
            })

    count = len(claim_ids)
    observed = label_matches / count
    expected = sum((a_counts[label] / count) * (b_counts[label] / count) for label in LABELS)
    if expected == 1.0:
        kappa = None
        kappa_status = 'undefined_expected_agreement_is_one'
    else:
        kappa = round((observed - expected) / (1 - expected), 6)
        kappa_status = 'estimated'

    return {
        'schemaVersion': 1,
        'analysis': 'two_reviewer_pre_adjudication',
        'goldLabelsCreated': False,
        'inputSummary': {
            'reviewerCount': 2,
            'claimCount': count,
            'sourceCount': len(source_ids),
            'documentCount': len(document_ids),
            'rightsStatus': 'cleared',
            'splitCounts': {split: split_counts[split] for split in sorted(SPLITS) if split_counts[split]},
        },
        'metrics': {
            'rawLabelAgreement': round(observed, 6),
            'cohensKappa': kappa,
            'cohensKappaStatus': kappa_status,
            'confusionMatrixReviewerAByReviewerB': confusion,
            'exactCitationSetAgreement': round(citation_matches / count, 6),
            'labelDisagreementCount': label_disagreements,
            'citationDisagreementCount': citation_disagreements,
            'adjudicationRequiredCount': len(queue),
        },
        'adjudicationQueue': queue,
        'limitations': [
            'Agreement is descriptive for these reviewed claims and does not establish independent accuracy or methane outcomes.',
            'Reviewer IDs are distinct labels in input data; this tool cannot authenticate reviewer identity or independence.',
            'A third adjudicator must resolve disagreements; this report never creates or publishes final gold labels.',
            'Citation agreement compares exact document-bound quote hashes and does not assess quote relevance or document authenticity.',
        ],
    }


def _is_inside(path: Path, directory: Path) -> bool:
    try:
        path.relative_to(directory)
        return True
    except ValueError:
        return False


def _require_owner_only_permissions(path: Path, kind: str) -> None:
    if os.name == 'posix' and stat.S_IMODE(path.stat().st_mode) & 0o077:
        raise ValueError(f'Private {kind} must have owner-only permissions')


def _resolve_private_input(path: Path) -> Path:
    resolved = path.resolve(strict=True)
    if _is_inside(resolved, ROOT):
        raise ValueError('Private annotation inputs must be outside the repository')
    if not resolved.is_file():
        raise ValueError(f'Annotation input is not a regular file: {path.name}')
    _require_owner_only_permissions(resolved.parent, 'annotation directory')
    _require_owner_only_permissions(resolved, 'annotation input')
    if resolved.stat().st_size > MAX_ANNOTATION_BYTES:
        raise ValueError(f'Annotation input exceeds {MAX_ANNOTATION_BYTES} bytes: {path.name}')
    return resolved


def _read_jsonl(path: Path) -> tuple[list[dict[str, Any]], str]:
    raw = path.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    rows = []
    for line_number, text in enumerate(raw.decode('utf-8').splitlines(), 1):
        if not text.strip():
            continue
        try:
            row = json.loads(text)
        except json.JSONDecodeError as exc:
            raise ValueError(f'Invalid JSON line {line_number} in {path.name}') from exc
        if not isinstance(row, dict):
            raise ValueError(f'JSON line {line_number} in {path.name} must be an object')
        rows.append(row)
        if len(rows) > MAX_ANNOTATION_ROWS:
            raise ValueError(f'Annotation input exceeds {MAX_ANNOTATION_ROWS} rows: {path.name}')
    return rows, digest


def write_private_report(path: Path, report: dict[str, Any]) -> None:
    parent = path.parent.resolve(strict=True)
    target = parent / path.name
    if _is_inside(target, ROOT):
        raise ValueError('Private agreement reports must be written outside the repository')
    _require_owner_only_permissions(parent, 'report directory')
    if target.exists():
        raise ValueError('Refusing to overwrite an existing private report')
    payload = (json.dumps(report, ensure_ascii=False, sort_keys=True, separators=(',', ':')) + '\n').encode('utf-8')
    descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, stat.S_IRUSR | stat.S_IWUSR)
    try:
        with os.fdopen(descriptor, 'wb') as stream:
            stream.write(payload)
            stream.flush()
            os.fsync(stream.fileno())
    except Exception:
        try:
            target.unlink()
        except OSError:
            pass
        raise


def main() -> None:
    parser = argparse.ArgumentParser(description='Compare two private evidence annotation files without creating gold labels.')
    parser.add_argument('--reviewer-a', type=Path, required=True)
    parser.add_argument('--reviewer-b', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()

    try:
        reviewer_a_path = _resolve_private_input(args.reviewer_a)
        reviewer_b_path = _resolve_private_input(args.reviewer_b)
        reviewer_a_rows, reviewer_a_digest = _read_jsonl(reviewer_a_path)
        reviewer_b_rows, reviewer_b_digest = _read_jsonl(reviewer_b_path)
        report = compare_annotations(reviewer_a_rows, reviewer_b_rows)
        report['inputSha256'] = {'reviewerA': reviewer_a_digest, 'reviewerB': reviewer_b_digest}
        write_private_report(args.output, report)
    except (OSError, UnicodeDecodeError, ValueError) as exc:
        raise SystemExit(f'annotation agreement refused: {exc}') from exc

    print(json.dumps({
        'status': 'pre_adjudication_report_written',
        'outputWritten': True,
        'claimCount': report['inputSummary']['claimCount'],
        'adjudicationRequiredCount': report['metrics']['adjudicationRequiredCount'],
        'goldLabelsCreated': False,
    }, separators=(',', ':')))


if __name__ == '__main__':
    main()
