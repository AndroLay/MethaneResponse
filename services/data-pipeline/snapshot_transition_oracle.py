"""Independent normalized-record delta oracle. No import from the TypeScript implementation.

This checks archived record identity and fields, not scientific mitigation truth.
Expected file/report hashes must be recorded separately from the supplied report.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import io
from datetime import datetime, timezone
from pathlib import Path

SOURCE_FIELDS = ('lat lon country sector sourceType detectedPlumeCount latestPlumeId latestPlumeDate '
                 'persistency persistencyStd persistencyCategory notified feedback feedbackOperator '
                 'feedbackGovernment feedbackScope mitigationConfirmed').split()
OBSERVATION_FIELDS = ('sourceId linkStatus date fluxKgHr uncertaintyKgHr fluxUnit satellite country sector '
                      'actionable notified tile detectionInstitution quantificationInstitution totalEmissionTonnes '
                      'totalEmissionStdTonnes windU windV windSpeed lastUpdate insertDate tileBackground lat lon').split()


def read_input(path: Path, expected_sha256: str) -> dict:
    if path.stat().st_size > 16_000_000:
        raise ValueError('Compressed snapshot exceeds bounds')
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != expected_sha256:
        raise ValueError('Separately expected snapshot hash does not match')
    with gzip.GzipFile(fileobj=io.BytesIO(data)) as handle:
        decoded = handle.read(128_000_001)
    if len(decoded) > 128_000_000:
        raise ValueError('Decoded snapshot exceeds bounds')
    return json.loads(decoded)


def inventories(snapshot: dict) -> tuple[dict, dict]:
    sources, observations = {}, {}
    for source in snapshot['sources'] + snapshot['unmappedSources']:
        identifier = source['sourceId']
        if identifier in sources:
            raise ValueError('Duplicate source')
        sources[identifier] = {key: source.get(key) for key in SOURCE_FIELDS}
        for row in source['observations']:
            if row['sourceId'] != identifier or row['linkStatus'] != 'linked':
                raise ValueError('Incorrect linked source')
            if row['id'] in observations:
                raise ValueError('Duplicate observation')
            observations[row['id']] = {key: row.get(key) for key in OBSERVATION_FIELDS}
    for row in snapshot['unlinkedObservations']:
        if row['id'] in observations or row['linkStatus'] not in ('source_id_missing', 'source_record_missing'):
            raise ValueError('Invalid unresolved observation')
        observations[row['id']] = {key: row.get(key) for key in OBSERVATION_FIELDS}
    if len(sources) != snapshot['originalSourceCount'] or len(observations) != snapshot['plumeCount'] or snapshot['truncated']:
        raise ValueError('Incomplete snapshot')
    return sources, observations


def difference(old: dict, new: dict) -> list[dict]:
    results = []
    for identifier in sorted(old.keys() | new.keys()):
        left, right = old.get(identifier), new.get(identifier)
        if left is None or right is None:
            fields = sorted((left if left is not None else right).keys())
        else:
            fields = sorted(key for key in left if left[key] != right[key])
        if fields:
            results.append({'id': identifier, 'kind': 'added' if left is None else 'removed' if right is None else 'changed',
                            'before': left, 'after': right, 'changedFields': fields})
    return results


def expected_changes(before: dict, after: dict) -> dict:
    old_sources, old_observations = inventories(before)
    new_sources, new_observations = inventories(after)
    source_changes = difference(old_sources, new_sources)
    observation_changes = difference(old_observations, new_observations)
    affected = {row['id'] for row in source_changes}
    for change in observation_changes:
        for side in ('before', 'after'):
            source_id = (change[side] or {}).get('sourceId')
            if source_id in old_sources or source_id in new_sources:
                affected.add(source_id)
    count = lambda rows, kind: sum(row['kind'] == kind for row in rows)
    additions = [row for row in observation_changes if row['kind'] == 'added']
    def utc_day(value: str) -> str:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return parsed.replace(tzinfo=timezone.utc).date().isoformat() if parsed.tzinfo is None else parsed.astimezone(timezone.utc).date().isoformat()
    later = sum(utc_day(row['after']['date']) > before['plumeObservationDateRange']['end'] for row in additions)
    return {'sourceChanges': source_changes, 'observationChanges': observation_changes, 'affectedSourceIds': sorted(affected),
            'summary': {'addedSources': count(source_changes, 'added'), 'removedSources': count(source_changes, 'removed'),
                        'changedSources': count(source_changes, 'changed'), 'addedObservations': len(additions),
                        'removedObservations': count(observation_changes, 'removed'), 'changedObservations': count(observation_changes, 'changed'),
                        'laterDatedAdditions': later, 'historicalBackfillAdditions': len(additions) - later,
                        'reassignedObservations': sum(row['kind'] == 'changed' and any(row['before'][key] != row['after'][key] for key in ('sourceId', 'linkStatus')) for row in observation_changes)}}


def verify_report(report: dict, before: dict, after: dict, before_hash: str, after_hash: str, expected_report: str) -> None:
    if report.get('digest') != expected_report or report.get('schemaVersion') != 1 or report.get('policyVersion') != 'mars-normalized-record-delta/1' or report.get('physicalOutcomeEstablished') is not False:
        raise ValueError('Report identity or physical claim mismatch')
    for name, original, expected in [('before', before, before_hash), ('after', after, after_hash)]:
        descriptor = report[name]
        if descriptor['inputFileSha256'] != expected or descriptor['datasetSnapshotId'] != original['snapshotId'] or descriptor['provenance'] != original['provenance']:
            raise ValueError('Report input provenance mismatch')
        sources, observations = inventories(original)
        linked = sum(row['linkStatus'] == 'linked' for row in observations.values())
        if (descriptor['sourceCount'], descriptor['observationCount'], descriptor['linkedObservationCount'], descriptor['unresolvedObservationCount']) != (len(sources), len(observations), linked, len(observations) - linked):
            raise ValueError('Report inventory mismatch')
        if descriptor['archiveStartDate'] != original['plumeObservationDateRange']['start'] or descriptor['archiveEndDate'] != original['plumeObservationDateRange']['end']:
            raise ValueError('Report coverage mismatch')
    expected = expected_changes(before, after)
    if any(report.get(key) != value for key, value in expected.items()):
        raise ValueError('Report differs from independent exact-record comparison')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for field in ('report', 'before', 'after', 'expected-before', 'expected-after', 'expected-report'):
        parser.add_argument('--' + field, required=True)
    args = parser.parse_args()
    before = read_input(Path(args.before), args.expected_before)
    after = read_input(Path(args.after), args.expected_after)
    report_path = Path(args.report)
    if report_path.stat().st_size > 16_000_000:
        raise ValueError('Report exceeds bounds')
    report = json.loads(report_path.read_text())
    verify_report(report, before, after, args.expected_before, args.expected_after, args.expected_report)
    print(json.dumps({'independentRecordReplay': True, 'sourceRecordsCompared': before['originalSourceCount'] + after['originalSourceCount'],
                      'observationsCompared': before['plumeCount'] + after['plumeCount'], 'summary': report['summary'],
                      'limitation': 'Independent semantic comparison. Canonical SHA-256 replay is checked separately by the TypeScript verifier; neither establishes physical mitigation.'}))
