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


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, default=DEFAULT_INPUT)
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument('--manifest-output', type=Path)
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
    print(
        f"snapshot={result['snapshotId']} sources={result['counts']['mappedSources']}/"
        f"{result['counts']['sources']} plumes={result['counts']['plumes']} "
        f"linked={result['counts']['linkedPlumes']} unresolved={result['counts']['unlinkedPlumes']} "
        f"json_bytes={len(content)} gzip_bytes={len(compressed)} output={args.output} manifest={manifest_output}"
    )


if __name__ == '__main__':
    main()
