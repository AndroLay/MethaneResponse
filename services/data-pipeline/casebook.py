"""Build a small, provenance-bound casebook from a normalized MARS snapshot."""


def _external_evidence(selection: dict, case_id: str) -> list[dict]:
    references = selection.get('externalEvidence', [])
    if not isinstance(references, list):
        raise ValueError(f'External evidence for {case_id} must be a list of link-only references')

    allowed_fields = {'title', 'url', 'license', 'contentIncluded', 'publisher', 'reportDate'}
    required_fields = {'title', 'url', 'license', 'contentIncluded'}
    normalized = []
    for reference in references:
        if not isinstance(reference, dict):
            raise ValueError(f'External evidence for {case_id} must be link-only metadata')
        unsupported = set(reference) - allowed_fields
        if unsupported:
            raise ValueError(f'Unsupported external evidence field: {sorted(unsupported)[0]}')
        missing = required_fields - set(reference)
        if missing:
            raise ValueError(f'External evidence for {case_id} is missing required metadata: {sorted(missing)[0]}')
        if reference['contentIncluded'] is not False:
            raise ValueError(f'External evidence must be link-only for {case_id}; report content cannot be included')
        for field in ('title', 'url', 'license'):
            value = reference[field]
            if not isinstance(value, str) or not value.strip():
                raise ValueError(f'External evidence {field} must be a non-empty string')
        if not reference['url'].startswith('https://'):
            raise ValueError('External evidence URLs must use HTTPS')
        normalized.append(dict(reference))
    return normalized


def build_casebook(snapshot: dict, selections: list[dict], expected_archive_sha256: str) -> dict:
    provenance = snapshot.get('provenance') or {}
    actual_hash = provenance.get('archiveSha256')
    if actual_hash != expected_archive_sha256:
        raise ValueError('MARS snapshot SHA-256 does not match the reviewed case selection')

    source_by_id = {source['sourceId']: source for source in snapshot.get('sources', [])}
    plumes_by_source: dict[str, list[dict]] = {}
    for plume in snapshot.get('plumes', []):
        if plume.get('linkStatus') == 'linked' and plume.get('sourceId'):
            plumes_by_source.setdefault(plume['sourceId'], []).append(plume)

    case_ids: set[str] = set()
    selected_source_ids: set[str] = set()
    cases = []
    for selection in selections:
        case_id = (selection.get('caseId') or '').strip()
        source_id = (selection.get('sourceId') or '').strip()
        purpose = (selection.get('purpose') or '').strip()
        if not case_id or not source_id or not purpose:
            raise ValueError('Each case selection requires caseId, sourceId, and purpose')
        if case_id in case_ids:
            raise ValueError(f'Duplicate case ID in selection: {case_id}')
        if source_id in selected_source_ids:
            raise ValueError(f'Duplicate source ID in selection: {source_id}')
        case_ids.add(case_id)
        selected_source_ids.add(source_id)

        source = source_by_id.get(source_id)
        if source is None:
            raise ValueError(f'Selected source {source_id} is not present in the snapshot')
        if source.get('synthetic') is not False:
            raise ValueError(f'Selected source {source_id} is not marked as real source data')
        linked_plumes = sorted(plumes_by_source.get(source_id, []), key=lambda plume: (plume.get('tileDate') or '', plume['plumeId']))
        if not linked_plumes:
            raise ValueError(f'Selected source {source_id} has no linked plume records in the snapshot')
        external_evidence = _external_evidence(selection, case_id)
        cases.append({
            'caseId': case_id,
            'sourceId': source_id,
            'purpose': purpose,
            'source': source,
            'plumes': linked_plumes,
            'externalEvidence': external_evidence,
        })

    return {
        'schemaVersion': 1,
        'provenance': provenance,
        'limitations': [
            'This casebook contains only the selected source and linked plume rows from the cited MARS snapshot.',
            'Feedback fields are source-level and indicate receipt status; they do not contain the underlying response documents.',
            'Feedback, notification, and a later plume-free observation do not by themselves prove physical mitigation.',
            'Unlinked plume rows are excluded from source-specific cases, not assigned to a guessed source.',
            'External evidence entries are link-only references; report content is not copied into this casebook.',
        ],
        'cases': cases,
    }
