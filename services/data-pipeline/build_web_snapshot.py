#!/usr/bin/env python3
"""Build a compact, deterministic browser bundle from an ingested UNEP MARS snapshot.

The source/plume tables stay versioned in the offline pipeline. The browser bundle
contains every mapped source, every linked observation and every unresolved plume,
but omits duplicated raw CSV strings (the archive hash and original download remain
the provenance reference). Synthetic measurements and mitigation outcomes are never
added.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path
from typing import Any

DEFAULT_INPUT = Path('data/processed/mars_snapshot_2026-10-12.json')
DEFAULT_OUTPUT = Path('apps/web/public/data/mars-snapshot.json.gz')
DATASET_URL = 'https://methanedata.unep.org/download-dataset'


def _number(value: Any) -> float | None:
    if value is None or value == '':
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _observation(plume: dict[str, Any]) -> dict[str, Any]:
    result = {
        'id': plume['plumeId'],
        'sourceId': plume.get('sourceId'),
        'linkStatus': plume.get('linkStatus'),
        'date': plume.get('tileDate'),
        'fluxKgHr': _number(plume.get('fluxKgHr')),
        'uncertaintyKgHr': _number(plume.get('fluxStdKgHr')),
        'fluxUnit': 'kg/h',
        'satellite': plume.get('satellite'),
        'country': plume.get('country'),
        'sector': plume.get('sector'),
        'actionable': plume.get('actionable'),
        'notified': plume.get('notified'),
        'tile': plume.get('tile'),
        'detectionInstitution': plume.get('detectionInstitution'),
        'quantificationInstitution': plume.get('quantificationInstitution'),
        'totalEmissionTonnes': _number(plume.get('totalEmissionTonnes')),
        'totalEmissionStdTonnes': _number(plume.get('totalEmissionStdTonnes')),
        'windU': _number(plume.get('windU')),
        'windV': _number(plume.get('windV')),
        'windSpeed': _number(plume.get('windSpeed')),
        'lastUpdate': plume.get('lastUpdate'),
        'insertDate': plume.get('insertDate'),
        'tileBackground': plume.get('tileBackground'),
        'synthetic': False,
    }
    if plume.get('lat') is not None:
        result['lat'] = _number(plume.get('lat'))
    if plume.get('lon') is not None:
        result['lon'] = _number(plume.get('lon'))
    return result


def build_web_snapshot(snapshot: dict[str, Any]) -> dict[str, Any]:
    """Project all ingested source and plume rows into the browser's stable schema."""
    provenance = snapshot.get('provenance') or {}
    snapshot_id = snapshot.get('snapshotId') or provenance.get('snapshotId')
    if not snapshot_id or not provenance.get('archiveSha256'):
        raise ValueError('Snapshot must have a version ID and source archive SHA-256.')
    raw_sources = snapshot.get('sources')
    raw_plumes = snapshot.get('plumes')
    if not isinstance(raw_sources, list) or not isinstance(raw_plumes, list):
        raise ValueError('Snapshot must contain source and plume tables.')

    by_id: dict[str, dict[str, Any]] = {}
    unmapped_sources: list[dict[str, Any]] = []
    for item in raw_sources:
        source_id = item.get('sourceId')
        lat = _number(item.get('lat'))
        lon = _number(item.get('lon'))
        if not source_id or lat is None or lon is None or not -90 <= lat <= 90 or not -180 <= lon <= 180:
            # Keep the full row visible as unlocated metadata instead of discarding it.
            unmapped_sources.append(item)
            continue
        source = {
            'sourceId': source_id,
            'name': source_id,
            'region': item.get('country') or 'Region not specified',
            'lat': lat,
            'lon': lon,
            'country': item.get('country'),
            'sector': item.get('sector'),
            'sourceType': item.get('sourceType'),
            'synthetic': False,
            'evidence': [],  # plume metadata is not a mitigation document
            'observations': [],
            'plumeCount': 0,
            'detectedPlumeCount': item.get('detectedPlumeCount'),
            'lastObserved': item.get('latestPlumeDate'),
            'latestPlumeId': item.get('latestPlumeId'),
            'latestPlumeDate': item.get('latestPlumeDate'),
            'persistency': _number(item.get('persistency')),
            'persistencyStd': _number(item.get('persistencyStd')),
            'persistencyCategory': item.get('persistencyCategory'),
            'notified': item.get('notified'),
            'feedback': item.get('feedback'),
            'feedbackOperator': item.get('feedbackOperator'),
            'feedbackGovernment': item.get('feedbackGovernment'),
            'feedbackScope': 'source',
            'mitigationConfirmed': None,
        }
        by_id[source_id] = source

    unresolved: list[dict[str, Any]] = []
    observed_dates: list[str] = []
    duplicate_ids: set[str] = set()
    seen_ids: set[str] = set()
    for plume in raw_plumes:
        plume_id = plume.get('plumeId')
        if not plume_id:
            raise ValueError('Plume row without an original MARS plume ID.')
        if plume_id in seen_ids:
            duplicate_ids.add(plume_id)
        seen_ids.add(plume_id)
        date = plume.get('tileDate')
        if date:
            observed_dates.append(str(date)[:10])
        observation = _observation(plume)
        source_id = plume.get('sourceId')
        source = by_id.get(source_id) if source_id else None
        if plume.get('linkStatus') == 'linked' and source is not None:
            source['observations'].append(observation)
            source['plumeCount'] += 1
            if date and (not source['lastObserved'] or date > source['lastObserved']):
                source['lastObserved'] = date
        else:
            if plume.get('linkStatus') == 'linked' and source_id:
                observation['linkStatus'] = 'source_record_missing'
            elif not source_id:
                observation['linkStatus'] = 'source_id_missing'
            unresolved.append(observation)

    if duplicate_ids:
        raise ValueError(f'Duplicate MARS plume identifiers: {len(duplicate_ids)}')

    for source in by_id.values():
        source['observations'].sort(key=lambda item: (item.get('date') or '', item['id']))
        fluxes = [item['fluxKgHr'] for item in source['observations'] if item['fluxKgHr'] is not None]
        source['maxFluxKgHr'] = max(fluxes) if fluxes else None
    sources = sorted(by_id.values(), key=lambda item: item['sourceId'])
    unresolved.sort(key=lambda item: (item.get('date') or '', item['id']))

    original_counts = snapshot.get('counts') or {}
    counts = {
        'sources': len(raw_sources),
        'mappedSources': len(sources),
        'unmappedSources': len(unmapped_sources),
        'plumes': len(raw_plumes),
        'linkedPlumes': sum(source['plumeCount'] for source in sources),
        'unlinkedPlumes': len(unresolved),
        'sourceIdMissingPlumes': sum(item.get('linkStatus') == 'source_id_missing' for item in unresolved),
        'sourceRecordMissingPlumes': sum(item.get('linkStatus') == 'source_record_missing' for item in unresolved),
        'unquantifiedPlumes': sum(item.get('fluxKgHr') is None for source in sources for item in source['observations']) + sum(item.get('fluxKgHr') is None for item in unresolved),
    }
    # Fail closed if projection would silently lose rows or change linking semantics.
    if counts['plumes'] != counts['linkedPlumes'] + counts['unlinkedPlumes']:
        raise ValueError('Browser projection did not preserve all plume rows.')
    for key in ('linkedPlumes', 'sourceIdMissingPlumes', 'sourceRecordMissingPlumes'):
        if key in original_counts and counts[key] != original_counts[key]:
            raise ValueError(f'Browser projection changed the source manifest count for {key}.')

    date_range = snapshot.get('plumeObservationDateRange') or {
        'start': min(observed_dates) if observed_dates else None,
        'end': max(observed_dates) if observed_dates else None,
    }
    return {
        'dataset': 'UNEP MARS',
        'schemaVersion': 1,
        'snapshotId': snapshot_id,
        'sourceUrl': provenance.get('catalogUrl') or DATASET_URL,
        'license': provenance.get('license') or 'CC BY-NC-SA 4.0',
        'importedAt': provenance.get('retrievedAt'),
        'lastObserved': date_range.get('end'),
        'originalSourceCount': len(raw_sources),
        'plumeCount': len(raw_plumes),
        'counts': counts,
        'plumeObservationDateRange': date_range,
        'provenance': provenance,
        'observationSemantics': 'Historical satellite plume detections at observation times. They are not continuous measurements; an absent record is not zero emissions. Notification or feedback fields do not verify mitigation.',
        'truncated': False,
        'sources': sources,
        'unlinkedObservations': unresolved,
        'unmappedSources': unmapped_sources,
    }


def build_snapshot_manifest(snapshot: dict[str, Any], compressed: bytes, decoded: bytes | None = None) -> dict[str, Any]:
    """Describe both HTTP-decoded browser bytes and the pinned gzip input bytes."""
    decoded_bytes = decoded if decoded is not None else gzip.decompress(compressed)
    decoded_snapshot = json.loads(decoded_bytes.decode('utf-8'))
    provenance = snapshot.get('provenance') or {}
    if decoded_snapshot.get('snapshotId') != snapshot.get('snapshotId'):
        raise ValueError('Snapshot manifest input has a different dataset snapshot ID.')
    if (decoded_snapshot.get('provenance') or {}).get('archiveSha256') != provenance.get('archiveSha256'):
        raise ValueError('Snapshot manifest input has different source archive provenance.')
    return {
        'schemaVersion': 1,
        'datasetSnapshotId': snapshot['snapshotId'],
        'sourceArchiveSha256': provenance['archiveSha256'],
        'inputFileSha256': hashlib.sha256(compressed).hexdigest(),
        'decodedContentSha256': hashlib.sha256(decoded_bytes).hexdigest(),
        'sourceCount': len(decoded_snapshot.get('sources') or []),
        'plumeCount': decoded_snapshot.get('plumeCount'),
    }


def _stable_json_bytes(value: Any) -> bytes:
    return json.dumps(value, separators=(',', ':'), ensure_ascii=False, allow_nan=False, sort_keys=True).encode('utf-8')


def _hashed_gzip_artifact(value: Any) -> tuple[bytes, bytes, dict[str, Any]]:
    decoded = _stable_json_bytes(value)
    compressed = gzip.compress(decoded, compresslevel=9, mtime=0)
    return compressed, decoded, {
        'compressedSha256': hashlib.sha256(compressed).hexdigest(),
        'decodedSha256': hashlib.sha256(decoded).hexdigest(),
        'compressedBytes': len(compressed),
        'decodedBytes': len(decoded),
    }


def _history_bucket_id(record_id: str, bucket_count: int) -> str:
    digest_first_byte = hashlib.sha256(record_id.encode('utf-8')).digest()[0]
    return f'{digest_first_byte % bucket_count:03d}'


def build_progressive_snapshot_artifacts(
    snapshot: dict[str, Any],
    full_manifest: dict[str, Any],
    bucket_count: int = 64,
) -> dict[str, Any]:
    """Create a compact source catalog and hash-bucketed exact observation history.

    The existing full snapshot remains the canonical source of truth. This projection
    only changes delivery boundaries: each source's original observation objects and
    every unresolved plume row are copied intact into exactly one history bucket.
    """
    if isinstance(bucket_count, bool) or not isinstance(bucket_count, int) or not 1 <= bucket_count <= 256:
        raise ValueError('Progressive snapshot bucket count must be an integer from 1 to 256.')

    snapshot_id = snapshot.get('snapshotId')
    archive_sha = (snapshot.get('provenance') or {}).get('archiveSha256')
    if not snapshot_id or not isinstance(archive_sha, str) or len(archive_sha) != 64:
        raise ValueError('Progressive snapshot requires a version ID and source archive SHA-256.')
    if full_manifest.get('datasetSnapshotId') != snapshot_id:
        raise ValueError('Full snapshot manifest has a different dataset snapshot ID.')
    if full_manifest.get('sourceArchiveSha256') != archive_sha:
        raise ValueError('Full snapshot manifest has a different source archive SHA-256.')

    sources = snapshot.get('sources')
    unresolved = snapshot.get('unlinkedObservations')
    if not isinstance(sources, list) or not isinstance(unresolved, list):
        raise ValueError('Progressive snapshot requires source and unlinked observation arrays.')
    if full_manifest.get('sourceCount') != len(sources):
        raise ValueError('Full snapshot manifest source count does not match the snapshot.')

    buckets: dict[str, dict[str, Any]] = {
        f'{index:03d}': {'sources': {}, 'unlinkedObservations': []}
        for index in range(bucket_count)
    }
    seen_source_ids: set[str] = set()
    seen_plume_ids: set[str] = set()
    observation_years: dict[str, int] = {}
    linked_count = 0
    for source in sources:
        source_id = source.get('sourceId') if isinstance(source, dict) else None
        if not isinstance(source_id, str) or not source_id or source_id in seen_source_ids:
            raise ValueError('Progressive snapshot contains a missing or duplicate source ID.')
        seen_source_ids.add(source_id)
        observations = source.get('observations')
        if not isinstance(observations, list):
            raise ValueError(f'Progressive source {source_id} has no observation array.')
        history_bucket = buckets[_history_bucket_id(source_id, bucket_count)]
        for observation in observations:
            if not isinstance(observation, dict):
                raise ValueError(f'Progressive source {source_id} contains a malformed observation.')
            plume_id = observation.get('id')
            if not isinstance(plume_id, str) or not plume_id or plume_id in seen_plume_ids:
                raise ValueError('Progressive snapshot contains a missing or duplicate plume ID.')
            if observation.get('sourceId') != source_id or observation.get('linkStatus') != 'linked':
                raise ValueError(f'Progressive observation {plume_id} has a mismatched source link.')
            seen_plume_ids.add(plume_id)
            linked_count += 1
            year = str(observation.get('date') or '')[:4]
            if len(year) == 4 and year.isdigit():
                observation_years[year] = observation_years.get(year, 0) + 1
        if observations:
            history_bucket['sources'][source_id] = observations

    for observation in unresolved:
        if not isinstance(observation, dict):
            raise ValueError('Progressive snapshot contains a malformed unlinked observation.')
        plume_id = observation.get('id')
        if not isinstance(plume_id, str) or not plume_id or plume_id in seen_plume_ids:
            raise ValueError('Progressive snapshot contains a missing or duplicate plume ID.')
        if observation.get('linkStatus') == 'linked':
            raise ValueError(f'Progressive unresolved observation {plume_id} is marked linked.')
        seen_plume_ids.add(plume_id)
        bucket_id = _history_bucket_id(plume_id, bucket_count)
        buckets[bucket_id]['unlinkedObservations'].append(observation)
        year = str(observation.get('date') or '')[:4]
        if len(year) == 4 and year.isdigit():
            observation_years[year] = observation_years.get(year, 0) + 1

    plume_count = snapshot.get('plumeCount')
    unlinked_count = len(unresolved)
    if not isinstance(plume_count, int) or linked_count + unlinked_count != plume_count:
        raise ValueError('Progressive observation rows do not match the full snapshot plume count.')
    if full_manifest.get('plumeCount') != plume_count:
        raise ValueError('Full snapshot manifest plume count does not match the snapshot.')
    counts = snapshot.get('counts') or {}
    if counts.get('linkedPlumes') is not None and counts['linkedPlumes'] != linked_count:
        raise ValueError('Progressive linked observation count changed from the source manifest.')
    if counts.get('unlinkedPlumes') is not None and counts['unlinkedPlumes'] != unlinked_count:
        raise ValueError('Progressive unlinked observation count changed from the source manifest.')

    catalog = {key: value for key, value in snapshot.items() if key not in ('sources', 'unlinkedObservations')}
    catalog['sources'] = []
    for source in sources:
        catalog_source = {key: value for key, value in source.items() if key != 'observations'}
        catalog_source['historyBucketId'] = _history_bucket_id(source['sourceId'], bucket_count)
        catalog_source['observationDates'] = sorted({
            str(item['date'])[:10]
            for item in source['observations']
            if isinstance(item.get('date'), str) and len(item['date']) >= 10
        })
        catalog['sources'].append(catalog_source)
    catalog['unlinkedObservations'] = []
    catalog['unlinkedObservationCount'] = unlinked_count
    catalog['observationsByYear'] = dict(sorted(observation_years.items()))
    catalog_gzip, catalog_bytes, catalog_hashes = _hashed_gzip_artifact(catalog)

    bucket_files: dict[str, dict[str, bytes]] = {}
    bucket_manifest: list[dict[str, Any]] = []
    for bucket_id, data in buckets.items():
        bucket_sources = [
            {'sourceId': source_id, 'observations': observations}
            for source_id, observations in sorted(data['sources'].items())
        ]
        bucket_unlinked = sorted(data['unlinkedObservations'], key=lambda item: (str(item.get('date') or ''), item['id']))
        bucket_observation_count = sum(len(source['observations']) for source in bucket_sources)
        payload = {
            'dataset': snapshot.get('dataset', 'UNEP MARS'),
            'schemaVersion': 1,
            'snapshotId': snapshot_id,
            'sourceArchiveSha256': archive_sha,
            'bucketId': bucket_id,
            'sources': bucket_sources,
            'unlinkedObservations': bucket_unlinked,
            'counts': {
                'sources': len(bucket_sources),
                'linkedPlumes': bucket_observation_count,
                'unlinkedPlumes': len(bucket_unlinked),
                'plumes': bucket_observation_count + len(bucket_unlinked),
            },
        }
        compressed, decoded, hashes = _hashed_gzip_artifact(payload)
        bucket_files[bucket_id] = {'decoded_bytes': decoded, 'gzip_bytes': compressed}
        bucket_manifest.append({
            'id': bucket_id,
            'file': f'mars-observation-buckets/{bucket_id}.json.gz',
            'sourceCount': len(bucket_sources),
            'linkedObservationCount': bucket_observation_count,
            'unlinkedObservationCount': len(bucket_unlinked),
            **hashes,
        })

    manifest = {
        'schemaVersion': 1,
        'datasetSnapshotId': snapshot_id,
        'sourceArchiveSha256': archive_sha,
        'inputFileSha256': full_manifest['inputFileSha256'],
        'decodedContentSha256': full_manifest['decodedContentSha256'],
        'sourceCount': len(sources),
        'plumeCount': plume_count,
        'linkedObservationCount': linked_count,
        'unlinkedObservationCount': unlinked_count,
        'observationsByYear': dict(sorted(observation_years.items())),
        'bucketAlgorithm': 'sha256-first-byte-modulo',
        'bucketCount': bucket_count,
        'catalog': {
            'file': 'mars-source-catalog.json.gz',
            'sourceCount': len(sources),
            'unlinkedObservationCount': unlinked_count,
            **catalog_hashes,
        },
        'buckets': bucket_manifest,
    }
    return {
        'catalog_bytes': catalog_bytes,
        'catalog_gzip_bytes': catalog_gzip,
        'manifest': manifest,
        'observation_buckets': bucket_files,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, default=DEFAULT_INPUT)
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument('--manifest-output', type=Path)
    parser.add_argument('--progressive-output-dir', type=Path, help='Directory for the hash-verified source catalog and history buckets (defaults beside --output).')
    parser.add_argument('--bucket-count', type=int, default=64)
    args = parser.parse_args()
    snapshot = json.loads(args.input.read_text(encoding='utf-8'))
    result = build_web_snapshot(snapshot)
    content = json.dumps(result, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    compressed = gzip.compress(content, compresslevel=9, mtime=0)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(compressed)
    manifest = build_snapshot_manifest(result, compressed, content)
    manifest_output = args.manifest_output or args.output.with_name('mars-snapshot-manifest.json')
    manifest_output.parent.mkdir(parents=True, exist_ok=True)
    manifest_output.write_text(json.dumps(manifest, separators=(',', ':'), sort_keys=True) + '\n', encoding='utf-8')
    progressive_dir = args.progressive_output_dir or args.output.parent
    progressive = build_progressive_snapshot_artifacts(result, manifest, args.bucket_count)
    progressive_dir.mkdir(parents=True, exist_ok=True)
    (progressive_dir / 'mars-source-catalog.json.gz').write_bytes(progressive['catalog_gzip_bytes'])
    (progressive_dir / 'mars-progressive-manifest.json').write_text(
        json.dumps(progressive['manifest'], separators=(',', ':'), sort_keys=True) + '\n', encoding='utf-8',
    )
    bucket_dir = progressive_dir / 'mars-observation-buckets'
    bucket_dir.mkdir(parents=True, exist_ok=True)
    for bucket_id, artifacts in progressive['observation_buckets'].items():
        (bucket_dir / f'{bucket_id}.json.gz').write_bytes(artifacts['gzip_bytes'])
    print(
        f"snapshot={result['snapshotId']} sources={result['counts']['mappedSources']}/"
        f"{result['counts']['sources']} plumes={result['counts']['plumes']} "
        f"linked={result['counts']['linkedPlumes']} unresolved={result['counts']['unlinkedPlumes']} "
        f"json_bytes={len(content)} gzip_bytes={len(compressed)} output={args.output} manifest={manifest_output} "
        f"progressive={progressive_dir} buckets={progressive['manifest']['bucketCount']}"
    )


if __name__ == '__main__':
    main()
