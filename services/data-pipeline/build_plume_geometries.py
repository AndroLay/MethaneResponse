#!/usr/bin/env python3
"""Build hash-bound, monthly MARS GeoJSON geometry shards for the map.

The output keeps the official GeoJSON geometry and links every plume ID to the
already pinned MARS CSV-derived browser snapshot. It is historical data, not a
live feed or a methane concentration surface.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import math
import os
import pathlib
import re
import sys
import zipfile
from collections import defaultdict
from datetime import datetime
from typing import Any

CATALOG_URL = 'https://methanedata.unep.org/download-dataset'
DOWNLOAD_URL = 'https://unepazeconomyadlsstorage.blob.core.windows.net/public/unep_methanedata_detected_plumes_geojson.zip'
PLUMES_FILENAME = 'unep_methanedata_detected_plumes.geojson'
MAX_GEOJSON_BYTES = 100_000_000
LICENSE = 'CC BY-NC-SA 4.0'
ATTRIBUTION = (
    'Contains data from UNEP IMEO Eye on Methane / MARS, licensed CC BY-NC-SA 4.0. '
    'Changes: retained publisher-provided MultiPolygon geometries and selected plume properties, '
    'partitioned records by UTC observation month, and linked each plume ID to the pinned CSV snapshot.'
)
GEOMETRY_LIMITATION = (
    'Geometry is copied from the publisher GeoJSON. The MARS data dictionary does not define these '
    'shapes as a continuous methane concentration surface or a verified physical plume boundary.'
)


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def parse_timestamp(value: Any, field_name: str) -> datetime:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f'{field_name} must be an ISO 8601 timestamp')
    normalized = value.strip().replace('Z', '+00:00')
    try:
        return datetime.fromisoformat(normalized)
    except ValueError as error:
        raise ValueError(f'{field_name} must be an ISO 8601 timestamp') from error


def load_source_snapshot(path: pathlib.Path) -> dict[str, Any]:
    raw = path.read_bytes()
    if raw.startswith(b'\x1f\x8b'):
        raw = gzip.decompress(raw)
    snapshot = json.loads(raw)
    if not isinstance(snapshot, dict):
        raise ValueError('Source snapshot must be a JSON object')
    snapshot_id = snapshot.get('snapshotId')
    archive_sha = ((snapshot.get('provenance') or {}).get('archiveSha256'))
    if not isinstance(archive_sha, str) or not re.fullmatch(r'[a-f0-9]{64}', archive_sha):
        raise ValueError('Source snapshot has no valid provenance archive SHA-256')
    if snapshot_id != f'unep-mars-{archive_sha[:12]}':
        raise ValueError('Source snapshot ID does not bind to its archive SHA-256')
    return snapshot


def observations_by_id(snapshot: dict[str, Any]) -> dict[str, dict[str, Any]]:
    observations: dict[str, dict[str, Any]] = {}
    sources = snapshot.get('sources')
    unlinked = snapshot.get('unlinkedObservations')
    if not isinstance(sources, list) or not isinstance(unlinked, list):
        raise ValueError('Source snapshot must contain sources and unlinkedObservations arrays')
    rows = [
        observation
        for source in sources
        if isinstance(source, dict)
        for observation in (source.get('observations') or [])
        if isinstance(observation, dict)
    ] + [row for row in unlinked if isinstance(row, dict)]
    for observation in rows:
        plume_id = observation.get('id')
        if not isinstance(plume_id, str) or not plume_id:
            raise ValueError('Source snapshot includes a plume without an ID')
        if plume_id in observations:
            raise ValueError(f'Source snapshot contains duplicate plume ID {plume_id}')
        observations[plume_id] = observation
    return observations


def same_number(left: Any, right: Any) -> bool:
    if left is None or right is None:
        return left is None and right is None
    try:
        return math.isclose(float(left), float(right), rel_tol=0.0, abs_tol=1e-8)
    except (TypeError, ValueError):
        return False


def validate_geometry(geometry: Any, plume_id: str) -> None:
    if geometry is None:
        return
    if not isinstance(geometry, dict) or geometry.get('type') != 'MultiPolygon':
        raise ValueError(f'Plume {plume_id} geometry must be MultiPolygon or null')
    coordinates = geometry.get('coordinates')
    if not isinstance(coordinates, list) or not coordinates:
        raise ValueError(f'Plume {plume_id} has an empty MultiPolygon')
    positions = 0

    def visit(value: Any) -> None:
        nonlocal positions
        if isinstance(value, list) and len(value) >= 2 and all(isinstance(item, (int, float)) for item in value[:2]):
            lon, lat = value[:2]
            if not math.isfinite(lon) or not math.isfinite(lat) or not (-180 <= lon <= 180 and -90 <= lat <= 90):
                raise ValueError(f'Plume {plume_id} geometry coordinate is outside WGS84')
            positions += 1
            return
        if isinstance(value, list):
            for child in value:
                visit(child)
            return
        raise ValueError(f'Plume {plume_id} geometry contains an invalid coordinate')

    visit(coordinates)
    if positions < 4:
        raise ValueError(f'Plume {plume_id} MultiPolygon has too few WGS84 coordinates')


def validate_feature(feature: Any, expected: dict[str, Any]) -> tuple[str, dict[str, Any] | None]:
    if not isinstance(feature, dict) or feature.get('type') != 'Feature':
        raise ValueError('GeoJSON plume list contains a non-Feature record')
    properties = feature.get('properties')
    if not isinstance(properties, dict):
        raise ValueError('GeoJSON plume Feature has no properties object')
    plume_id = properties.get('id_plume')
    if not isinstance(plume_id, str) or not plume_id:
        raise ValueError('GeoJSON plume Feature has no id_plume')
    if plume_id != expected.get('id'):
        raise ValueError(f'GeoJSON plume IDs do not match the pinned snapshot: {plume_id}')
    if properties.get('source_name') != expected.get('sourceId'):
        raise ValueError(f'GeoJSON source_name does not match the pinned snapshot for {plume_id}')
    if str(properties.get('tile_date') or '').strip() != str(expected.get('date') or '').strip():
        raise ValueError(f'GeoJSON tile_date does not match the pinned snapshot for {plume_id}')
    for geo_key, snapshot_key in (
        ('lat', 'lat'), ('lon', 'lon'), ('ch4_fluxrate', 'fluxKgHr'),
        ('ch4_fluxrate_std', 'uncertaintyKgHr'),
    ):
        if not same_number(properties.get(geo_key), expected.get(snapshot_key)):
            raise ValueError(f'GeoJSON {geo_key} does not match the pinned snapshot for {plume_id}')
    if not properties.get('tile_date'):
        raise ValueError(f'GeoJSON plume {plume_id} has no observation timestamp')
    observed = parse_timestamp(properties['tile_date'], f'GeoJSON tile_date for {plume_id}')
    month = observed.strftime('%Y-%m')
    geometry = feature.get('geometry')
    validate_geometry(geometry, plume_id)
    if geometry is None:
        return month, None

    output_feature = {
        'type': 'Feature',
        'id': plume_id,
        'geometry': geometry,
        'properties': {
            'plumeId': plume_id,
            'sourceId': properties.get('source_name'),
            'observedAt': properties.get('tile_date'),
            'latitude': properties.get('lat'),
            'longitude': properties.get('lon'),
            'reportedFluxKgHr': properties.get('ch4_fluxrate'),
            'reportedUncertaintyKgHr': properties.get('ch4_fluxrate_std'),
            'satellite': properties.get('satellite'),
            'sector': properties.get('sector'),
            'country': properties.get('country'),
            'notified': properties.get('notified'),
            'actionable': properties.get('actionable'),
        },
    }
    return month, output_feature


def load_geojson_features(path: pathlib.Path) -> tuple[list[dict[str, Any]], str]:
    with zipfile.ZipFile(path) as archive:
        try:
            info = archive.getinfo(PLUMES_FILENAME)
        except KeyError as error:
            raise ValueError(f'GeoJSON archive is missing {PLUMES_FILENAME}') from error
        if info.file_size > MAX_GEOJSON_BYTES:
            raise ValueError('MARS GeoJSON payload exceeds the 100 MB safety limit')
        document = json.loads(archive.read(info))
    if not isinstance(document, dict) or document.get('type') != 'FeatureCollection':
        raise ValueError('MARS plume GeoJSON must be a FeatureCollection')
    features = document.get('features')
    if not isinstance(features, list):
        raise ValueError('MARS plume GeoJSON has no features array')
    return features, sha256_bytes(path.read_bytes())


def write_atomic(path: pathlib.Path, content: bytes) -> None:
    temporary = path.with_name(f'.{path.name}.tmp')
    temporary.write_bytes(content)
    os.replace(temporary, path)


def build_geometry_artifacts(
    *,
    geojson_archive: pathlib.Path,
    source_snapshot: pathlib.Path,
    output_dir: pathlib.Path,
    retrieved_at: str,
    upstream_last_modified_at: str | None = None,
) -> dict[str, Any]:
    retrieved = parse_timestamp(retrieved_at, 'retrieved_at')
    last_modified = parse_timestamp(upstream_last_modified_at, 'upstream_last_modified_at') if upstream_last_modified_at else None
    snapshot = load_source_snapshot(source_snapshot)
    expected = observations_by_id(snapshot)
    features, geometry_archive_sha = load_geojson_features(geojson_archive)
    feature_ids = [
        (feature.get('properties') or {}).get('id_plume')
        if isinstance(feature, dict) and isinstance(feature.get('properties'), dict) else None
        for feature in features
    ]
    if any(not isinstance(plume_id, str) or not plume_id for plume_id in feature_ids):
        raise ValueError('MARS GeoJSON has a plume without id_plume')
    if len(feature_ids) != len(set(feature_ids)):
        raise ValueError('MARS GeoJSON contains duplicate plume IDs')
    if set(feature_ids) != set(expected):
        raise ValueError('MARS GeoJSON plume IDs do not match the pinned source snapshot')

    monthly: dict[str, list[dict[str, Any]]] = defaultdict(list)
    month_records: dict[str, int] = defaultdict(int)
    month_without_geometry: dict[str, int] = defaultdict(int)
    for feature in features:
        plume_id = feature['properties']['id_plume']
        month, output_feature = validate_feature(feature, expected[plume_id])
        month_records[month] += 1
        if output_feature is None:
            month_without_geometry[month] += 1
        else:
            monthly[month].append(output_feature)

    generated: dict[str, bytes] = {}
    months: dict[str, dict[str, Any]] = {}
    for month in sorted(month_records):
        month_features = sorted(
            monthly[month],
            key=lambda feature: (
                feature['properties']['reportedFluxKgHr'] is not None,
                feature['properties']['reportedFluxKgHr'] or 0,
                feature['properties']['plumeId'],
            ),
        )
        file_name = f'{month}.geojson.gz' if month_features else None
        digest = None
        compressed_size = 0
        uncompressed_digest = None
        uncompressed_size = 0
        if file_name:
            collection = {'type': 'FeatureCollection', 'features': month_features}
            raw = json.dumps(collection, separators=(',', ':'), ensure_ascii=False, allow_nan=False, sort_keys=True).encode('utf-8')
            compressed = gzip.compress(raw, compresslevel=9, mtime=0)
            generated[file_name] = compressed
            digest = sha256_bytes(compressed)
            compressed_size = len(compressed)
            uncompressed_digest = sha256_bytes(raw)
            uncompressed_size = len(raw)
        months[month] = {
            'file': file_name,
            'sha256': digest,
            'uncompressedSha256': uncompressed_digest,
            'featureCount': len(month_features),
            'plumeRecordCount': month_records[month],
            'withoutGeometryCount': month_without_geometry[month],
            'compressedBytes': compressed_size,
            'uncompressedBytes': uncompressed_size,
        }

    provenance = snapshot.get('provenance') or {}
    manifest = {
        'schemaVersion': 1,
        'datasetId': snapshot['snapshotId'],
        'sourceArchiveSha256': provenance['archiveSha256'],
        'sourceRetrievedAt': provenance.get('retrievedAt'),
        'geometryArchiveSha256': geometry_archive_sha,
        'retrievedAt': retrieved.isoformat(),
        'upstreamLastModifiedAt': last_modified.isoformat() if last_modified else None,
        'catalogUrl': CATALOG_URL,
        'downloadUrl': DOWNLOAD_URL,
        'license': provenance.get('license') or LICENSE,
        'attribution': ATTRIBUTION,
        'geometryLimitation': GEOMETRY_LIMITATION,
        'inputPlumeCount': len(features),
        'geometryFeatureCount': sum(month['featureCount'] for month in months.values()),
        'withoutGeometryCount': sum(month['withoutGeometryCount'] for month in months.values()),
        'observationMonths': sorted(months),
        'months': months,
    }

    index_path = output_dir / 'index.json'
    if output_dir.exists():
        existing_entries = list(output_dir.iterdir())
        if index_path.exists():
            old_manifest = json.loads(index_path.read_text(encoding='utf-8'))
            if (old_manifest.get('datasetId') != manifest['datasetId']
                    or old_manifest.get('sourceArchiveSha256') != manifest['sourceArchiveSha256']
                    or old_manifest.get('geometryArchiveSha256') != manifest['geometryArchiveSha256']):
                raise FileExistsError('Output directory contains a different geometry snapshot; use a new output directory')
        elif existing_entries:
            raise FileExistsError('Output directory is not empty and has no recognized geometry index')
    output_dir.mkdir(parents=True, exist_ok=True)
    for name, content in generated.items():
        write_atomic(output_dir / name, content)
    index_bytes = (json.dumps(manifest, separators=(',', ':'), ensure_ascii=False, allow_nan=False, sort_keys=True) + '\n').encode('utf-8')
    write_atomic(index_path, index_bytes)
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--geojson-archive', type=pathlib.Path, required=True)
    parser.add_argument('--source-snapshot', type=pathlib.Path, required=True, help='Pinned MARS browser snapshot JSON or gzip JSON')
    parser.add_argument('--output-dir', type=pathlib.Path, required=True)
    parser.add_argument('--retrieved-at', required=True, help='UTC/offset ISO 8601 download timestamp')
    parser.add_argument('--upstream-last-modified-at', help='Optional upstream HTTP Last-Modified timestamp')
    args = parser.parse_args()
    try:
        manifest = build_geometry_artifacts(
            geojson_archive=args.geojson_archive,
            source_snapshot=args.source_snapshot,
            output_dir=args.output_dir,
            retrieved_at=args.retrieved_at,
            upstream_last_modified_at=args.upstream_last_modified_at,
        )
    except (OSError, ValueError, json.JSONDecodeError, zipfile.BadZipFile) as error:
        sys.exit(f'Geometry build failed: {error}')
    print(
        f"dataset={manifest['datasetId']} records={manifest['inputPlumeCount']:,} "
        f"geometries={manifest['geometryFeatureCount']:,} without_geometry={manifest['withoutGeometryCount']:,} "
        f"months={len(manifest['months'])} archive_sha256={manifest['geometryArchiveSha256']}"
    )
    print(f"Output: {args.output_dir}")
    print('Publisher-supplied historical geometry only; not a live methane feed or a concentration surface.')


if __name__ == '__main__':
    main()
