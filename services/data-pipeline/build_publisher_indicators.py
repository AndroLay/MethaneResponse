#!/usr/bin/env python3
"""Build a deterministic, provenance-bound local projection of UNEP MARS releases."""

from __future__ import annotations

import argparse
import base64
import csv
import gzip
import hashlib
import io
import json
import math
import re
import zipfile
from datetime import date, datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
PUBLISHER_RELEASE = ROOT / 'data/real/mars_publisher_archives/releases/2026-10-15'
TOP50_ARCHIVE = PUBLISHER_RELEASE / 'top50_monthly.zip'
RESPONSE_ARCHIVE = PUBLISHER_RELEASE / 'country_response_rates.zip'
SNAPSHOT = ROOT / 'apps/web/public/data/mars-snapshot.json.gz'
METADATA = PUBLISHER_RELEASE / 'retrieval-provenance.json'
OUTPUT = ROOT / 'apps/web/public/data/mars-publisher-indicators.json'
MANIFEST = ROOT / 'apps/web/public/data/mars-publisher-indicators.manifest.json'

TOP50_REQUIRED = {
    'Country', 'Sector', 'Potential Source Type', 'Source ID', 'Latitude', 'Longitude',
    'Number of Plumes Detected\n(2024-Present)', 'Plumes Notified\n(Y/N)',
    'Feedback Received\n(Y/N)', 'Average Half-Year\nFlux Rate (t/h)',
    'Average Half-Year\nFlux Rate Std. Dev. (t/h)', 'Average Annual\nFlux Rate (t/h)',
    'Average Annual\nFlux Rate Std. Dev. (t/h)', 'Date of Last\nPlume Detected',
    'Half-Year\nPersistency Category', 'Half-Year\nEmission Persistency',
    'Half-Year\nPersistency Std. Dev.', 'Annual\nPersistency Category',
    'Annual\nEmission Persistency', 'Annual\nPersistency Std. Dev.',
    'Estimated Half-Year\nCH4 Emissions (t)', 'Estimated Annual\nCH4 Emissions (t)',
}
RESPONSE_REQUIRED = {
    'country', 'notification_date_from', 'notification_date_until',
    'n_sources_notified', 'n_sources_notified_feedback', 'response_rate (%)',
}
NULLS = {'', 'na', 'n/a', 'null', 'none', '-', '--', '—'}
TOP_FILE = re.compile(r'(?P<period>\d{4}-\d{2})/topemitter_sources_(?P=period)\.csv$')
RESPONSE_FILE = re.compile(r'(?P<start>\d{4}-\d{2}-\d{2})_(?P<end>\d{4}-\d{2}-\d{2})_Response_Rates\.csv$')
LICENSE = 'CC BY-NC-SA 4.0'


def sha256(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def validate_archive_metadata(payload: bytes, item: dict[str, Any], label: str) -> None:
    required = ('sourceUrl', 'retrievedAt', 'lastModified', 'etag', 'contentMd5', 'sha256', 'bytes')
    if any(key not in item for key in required):
        raise ValueError(f'{label} retrieval provenance is incomplete')
    if not isinstance(item['sourceUrl'], str) or not item['sourceUrl'].startswith('https://'):
        raise ValueError(f'{label} publisher source URL must use HTTPS')
    if not isinstance(item['etag'], str) or not item['etag']:
        raise ValueError(f'{label} publisher ETag is missing')
    for key in ('retrievedAt', 'lastModified'):
        value = item[key]
        if not isinstance(value, str):
            raise ValueError(f'{label} {key} timestamp is missing')
        try:
            datetime.fromisoformat(value.replace('Z', '+00:00'))
        except ValueError as error:
            raise ValueError(f'{label} {key} timestamp is invalid') from error
    if item['bytes'] != len(payload):
        raise ValueError(f'{label} archive byte length differs from retrieval provenance')
    if item['sha256'] != sha256(payload):
        raise ValueError(f'{label} archive SHA-256 differs from retrieval provenance')
    md5 = base64.b64encode(hashlib.md5(payload, usedforsecurity=False).digest()).decode('ascii')
    if item['contentMd5'] != md5:
        raise ValueError(f'{label} archive Content-MD5 differs from retrieval provenance')


def _zip_csvs(payload: bytes, kind: str) -> list[tuple[str, list[dict[str, str]]]]:
    try:
        archive = zipfile.ZipFile(io.BytesIO(payload))
        bad_member = archive.testzip()
        if bad_member:
            raise ValueError(f'{kind} ZIP CRC failed for {bad_member}')
    except (zipfile.BadZipFile, OSError) as error:
        raise ValueError(f'{kind} archive is not a valid ZIP') from error
    found: list[tuple[str, list[dict[str, str]]]] = []
    pattern = TOP_FILE if kind == 'Top 50' else RESPONSE_FILE
    for name in sorted(archive.namelist()):
        if not name.lower().endswith('.csv'):
            continue
        match_name = name
        if kind == 'Response rates':
            match_name = name.rsplit('/', 1)[-1]
        if not pattern.fullmatch(match_name):
            continue
        raw = archive.read(name)
        try:
            text = raw.decode('utf-8-sig')
        except UnicodeDecodeError as error:
            raise ValueError(f'{kind} CSV is not UTF-8: {name}') from error
        reader = csv.DictReader(io.StringIO(text, newline=''))
        headers = set(reader.fieldnames or [])
        required = TOP50_REQUIRED if kind == 'Top 50' else RESPONSE_REQUIRED
        if not required.issubset(headers):
            missing = ', '.join(sorted(required - headers))
            raise ValueError(f'{kind} CSV has missing columns in {name}: {missing}')
        rows: list[dict[str, str]] = []
        for row_number, row in enumerate(reader, start=2):
            if None in row or any(value is None for value in row.values()):
                raise ValueError(f'{kind} CSV has malformed row {row_number} in {name}')
            rows.append(row)
        found.append((name, rows))
    if not found:
        raise ValueError(f'{kind} archive contains no recognized CSV release')
    return found


def _number(value: str | None, label: str, *, minimum: float | None = None, maximum: float | None = None) -> float | None:
    if value is None or value.strip().lower() in NULLS:
        return None
    try:
        parsed = float(value.strip().replace(',', '').replace('%', ''))
    except ValueError as error:
        raise ValueError(f'{label} is not numeric: {value!r}') from error
    if not math.isfinite(parsed):
        raise ValueError(f'{label} must be finite')
    if minimum is not None and parsed < minimum:
        raise ValueError(f'{label} is below {minimum}')
    if maximum is not None and parsed > maximum:
        raise ValueError(f'{label} is above {maximum}')
    return parsed


def _integer(value: str | None, label: str, *, minimum: int = 0) -> int | None:
    number = _number(value, label, minimum=minimum)
    if number is None:
        return None
    if not number.is_integer():
        raise ValueError(f'{label} must be an integer')
    return int(number)


def _yes_no(value: str | None, label: str) -> bool | None:
    if value is None or value.strip().lower() in NULLS:
        return None
    normalized = value.strip().lower()
    if normalized in {'y', 'yes', 'true'}:
        return True
    if normalized in {'n', 'no', 'false'}:
        return False
    raise ValueError(f'{label} must be Y, N, or missing')


def parse_top50_archive(payload: bytes) -> list[dict[str, Any]]:
    releases = []
    seen_periods: set[str] = set()
    for name, input_rows in _zip_csvs(payload, 'Top 50'):
        match = TOP_FILE.fullmatch(name)
        assert match
        period = match.group('period')
        if period in seen_periods:
            raise ValueError(f'duplicate Top 50 period {period}')
        seen_periods.add(period)
        if len(input_rows) != 50:
            raise ValueError(f'Top 50 release {period} must contain exactly 50 rows; found {len(input_rows)}')
        seen_ids: set[str] = set()
        rows = []
        for rank, source in enumerate(input_rows, start=1):
            source_id = source['Source ID'].strip()
            if not source_id:
                raise ValueError(f'Top 50 release {period} contains an empty source ID')
            if source_id in seen_ids:
                raise ValueError(f'duplicate source ID {source_id} in Top 50 release {period}')
            seen_ids.add(source_id)
            latitude = _number(source['Latitude'], f'{source_id} latitude', minimum=-90, maximum=90)
            longitude = _number(source['Longitude'], f'{source_id} longitude', minimum=-180, maximum=180)
            last_date = source['Date of Last\nPlume Detected'].strip() or None
            if last_date:
                try:
                    date.fromisoformat(last_date) if len(last_date) == 10 else datetime.fromisoformat(last_date.replace('Z', '+00:00'))
                except ValueError as error:
                    raise ValueError(f'{source_id} last plume date is invalid') from error
            rows.append({
                'publisherRowOrder': rank,
                'country': source['Country'].strip(),
                'sector': source['Sector'].strip() or None,
                'potentialSourceType': source['Potential Source Type'].strip() or None,
                'sourceId': source_id,
                'latitude': latitude,
                'longitude': longitude,
                'plumesDetectedSince2024': _integer(source['Number of Plumes Detected\n(2024-Present)'], f'{source_id} plume count'),
                'publisherNotificationFlag': _yes_no(source['Plumes Notified\n(Y/N)'], f'{source_id} notification flag'),
                'publisherFeedbackFlag': _yes_no(source['Feedback Received\n(Y/N)'], f'{source_id} feedback flag'),
                'averageHalfYearFluxRateTHr': _number(source['Average Half-Year\nFlux Rate (t/h)'], f'{source_id} half-year flux', minimum=0),
                'averageHalfYearFluxStdDevTHr': _number(source['Average Half-Year\nFlux Rate Std. Dev. (t/h)'], f'{source_id} half-year flux standard deviation', minimum=0),
                'averageAnnualFluxRateTHr': _number(source['Average Annual\nFlux Rate (t/h)'], f'{source_id} annual flux', minimum=0),
                'averageAnnualFluxStdDevTHr': _number(source['Average Annual\nFlux Rate Std. Dev. (t/h)'], f'{source_id} annual flux standard deviation', minimum=0),
                'lastPlumeDate': last_date,
                'halfYearPersistencyCategory': source['Half-Year\nPersistency Category'].strip() or None,
                'halfYearEmissionPersistency': _number(source['Half-Year\nEmission Persistency'], f'{source_id} half-year persistency', minimum=0, maximum=1),
                'halfYearPersistencyStdDev': _number(source['Half-Year\nPersistency Std. Dev.'], f'{source_id} half-year persistency standard deviation', minimum=0),
                'annualPersistencyCategory': source['Annual\nPersistency Category'].strip() or None,
                'annualEmissionPersistency': _number(source['Annual\nEmission Persistency'], f'{source_id} annual persistency', minimum=0, maximum=1),
                'annualPersistencyStdDev': _number(source['Annual\nPersistency Std. Dev.'], f'{source_id} annual persistency standard deviation', minimum=0),
                'estimatedHalfYearMethaneEmissionsT': _number(source['Estimated Half-Year\nCH4 Emissions (t)'], f'{source_id} half-year methane emissions', minimum=0),
                'estimatedAnnualMethaneEmissionsT': _number(source['Estimated Annual\nCH4 Emissions (t)'], f'{source_id} annual methane emissions', minimum=0),
            })
        releases.append({'period': period, 'sourceFile': name, 'rowCount': len(rows), 'rows': rows})
    return sorted(releases, key=lambda item: item['period'])


def parse_response_archive(payload: bytes) -> list[dict[str, Any]]:
    releases = []
    seen_periods: set[tuple[str, str]] = set()
    for name, input_rows in _zip_csvs(payload, 'Response rates'):
        match = RESPONSE_FILE.fullmatch(name.rsplit('/', 1)[-1])
        assert match
        start, end = match.group('start'), match.group('end')
        try:
            date.fromisoformat(start)
            date.fromisoformat(end)
        except ValueError as error:
            raise ValueError(f'Response-rate release has an invalid date range: {name}') from error
        if start > end:
            raise ValueError(f'Response-rate release start is after end: {name}')
        period = (start, end)
        if period in seen_periods:
            raise ValueError(f'duplicate response-rate period {start} to {end}')
        seen_periods.add(period)
        rows = []
        seen_countries: set[str] = set()
        for source in input_rows:
            country = source['country'].strip()
            if not country or country in seen_countries:
                raise ValueError(f'duplicate or empty country in response-rate period {start} to {end}')
            seen_countries.add(country)
            if source['notification_date_from'].strip() != start or source['notification_date_until'].strip() != end:
                raise ValueError(f'Response-rate CSV row period disagrees with filename for {country}')
            notified = _integer(source['n_sources_notified'], f'{country} notified-source count')
            feedback = _integer(source['n_sources_notified_feedback'], f'{country} feedback-source count')
            if notified is not None and feedback is not None and feedback > notified:
                raise ValueError(f'{country} feedback count exceeds notified-source denominator')
            rate = _number(source['response_rate (%)'], f'{country} published response rate', minimum=0, maximum=100)
            rows.append({
                'country': country,
                'notifiedSourceCount': notified,
                'notifiedWithFeedbackCount': feedback,
                'publishedResponseRatePercent': rate,
            })
        releases.append({
            'periodStart': start,
            'periodEnd': end,
            'sourceFile': name,
            'rowCount': len(rows),
            'rows': rows,
        })
    return sorted(releases, key=lambda item: item['periodStart'])


def build_indicators(top50_bytes: bytes, response_bytes: bytes, mars_snapshot: dict[str, Any], metadata: dict[str, Any]) -> dict[str, Any]:
    snapshot_id = mars_snapshot.get('snapshotId')
    if not isinstance(snapshot_id, str) or not snapshot_id:
        raise ValueError('MARS snapshot has no snapshot ID')
    sources = mars_snapshot.get('sources')
    if not isinstance(sources, list):
        raise ValueError('MARS snapshot has no source array')
    mars_source_ids = {item.get('sourceId') for item in sources if isinstance(item, dict) and isinstance(item.get('sourceId'), str)}
    mars_provenance = mars_snapshot.get('provenance')
    if not isinstance(mars_provenance, dict) or not isinstance(mars_provenance.get('archiveSha256'), str):
        raise ValueError('MARS source snapshot archive provenance is missing')
    if not re.fullmatch(r'[a-f0-9]{64}', mars_provenance['archiveSha256']):
        raise ValueError('MARS source snapshot archive SHA-256 is malformed')
    top_releases = parse_top50_archive(top50_bytes)
    for release in top_releases:
        source_ids = {row['sourceId'] for row in release['rows']}
        release['matchedSourceCount'] = len(source_ids & mars_source_ids)
        release['unmatchedSourceIds'] = sorted(source_ids - mars_source_ids)
    top_meta = metadata.get('archives', {}).get('top50')
    response_meta = metadata.get('archives', {}).get('responseRates')
    if not isinstance(top_meta, dict) or not isinstance(response_meta, dict):
        raise ValueError('Retrieval provenance must describe both publisher archives')
    validate_archive_metadata(top50_bytes, top_meta, 'Top 50')
    validate_archive_metadata(response_bytes, response_meta, 'Response-rate')
    license_name = metadata.get('license', LICENSE)
    if license_name != LICENSE:
        raise ValueError('Publisher MARS data license differs from the recorded dataset-specific license')
    mitigation_reference = metadata.get('mitigationSnapshotReference')
    required_reference = ('title', 'period', 'publisherUrl', 'publisherHandle', 'license', 'checkedAt', 'handling')
    if not isinstance(mitigation_reference, dict) or any(key not in mitigation_reference for key in required_reference):
        raise ValueError('The official mitigation snapshot must be recorded as a link-only reference with period and item license')
    if not str(mitigation_reference['publisherUrl']).startswith('https://') or 'not downloaded' not in str(mitigation_reference['handling']):
        raise ValueError('The mitigation snapshot reference must stay HTTPS link-only; do not reproduce report content')
    return {
        'schemaVersion': 1,
        'datasetId': 'unep-mars-publisher-indicators',
        'generatedBy': 'build-publisher-indicators-v1',
        'retrievedAt': metadata.get('retrievedAt'),
        'license': LICENSE,
        'attribution': 'UNEP International Methane Emissions Observatory (IMEO), Methane Alert and Response System (MARS)',
        'marsSnapshotId': snapshot_id,
        'marsSourceCount': len(mars_source_ids),
        'marsSnapshotProvenance': {
            'archiveSha256': mars_provenance['archiveSha256'],
            'retrievedAt': mars_provenance.get('retrievedAt'),
            'lastObserved': mars_snapshot.get('lastObserved'),
            'observationDateRange': mars_snapshot.get('plumeObservationDateRange'),
            'catalogUrl': mars_provenance.get('catalogUrl'),
            'license': mars_provenance.get('license'),
        },
        'top50Snapshots': top_releases,
        'responseRateSnapshots': parse_response_archive(response_bytes),
        'mitigationSnapshotReference': mitigation_reference,
        'provenance': {
            'top50': {
                **top_meta,
                'archiveFile': str(TOP50_ARCHIVE.relative_to(ROOT)),
                'archiveSha256': sha256(top50_bytes),
                'archiveBytes': len(top50_bytes),
                'datasetDictionaryUrl': 'https://methanedata.unep.org/dict-top-emitters',
            },
            'responseRates': {
                **response_meta,
                'archiveFile': str(RESPONSE_ARCHIVE.relative_to(ROOT)),
                'archiveSha256': sha256(response_bytes),
                'archiveBytes': len(response_bytes),
                'datasetDictionaryUrl': 'https://methanedata.unep.org/dict-mars-response-rates',
            },
            'catalogUrl': 'https://methanedata.unep.org/download-dataset',
            'license': LICENSE,
        },
        'limitations': [
            'Historical publisher release snapshots; this application does not poll UNEP and these records are not a live feed.',
            'Top 50 ranks, persistency and flux estimates are publisher-derived values with method-specific uncertainty; they are not continuous monitoring.',
            'Notification and feedback fields are publisher metadata and do not prove receipt, physical repair, or methane reduction.',
            'Country response rates are aggregate administrative engagement for the displayed period; they are not source-level repair evidence.',
            'Exact MARS source IDs are used for cross-dataset joins. Unmatched identifiers remain visible in the release data and are not inferred.',
        ],
    }


def _load_snapshot(path: Path) -> dict[str, Any]:
    opener = gzip.open if path.suffix == '.gz' else open
    with opener(path, 'rt', encoding='utf-8') as stream:
        data = json.load(stream)
    if not isinstance(data, dict):
        raise ValueError('MARS snapshot root must be a JSON object')
    return data


def build_files(top_path: Path, response_path: Path, snapshot_path: Path, metadata_path: Path, output: Path, manifest: Path) -> dict[str, Any]:
    top_bytes = top_path.read_bytes()
    response_bytes = response_path.read_bytes()
    metadata = json.loads(metadata_path.read_text(encoding='utf-8'))
    result = build_indicators(top_bytes, response_bytes, _load_snapshot(snapshot_path), metadata)
    canonical = (json.dumps(result, ensure_ascii=False, sort_keys=True, separators=(',', ':')) + '\n').encode('utf-8')
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(canonical)
    manifest_data = {
        'schemaVersion': 1,
        'datasetId': result['datasetId'],
        'dataFile': output.name,
        'dataFileSha256': sha256(canonical),
        'dataFileBytes': len(canonical),
        'marsSnapshotId': result['marsSnapshotId'],
        'marsSnapshotArchiveSha256': result['marsSnapshotProvenance']['archiveSha256'],
        'top50ReleaseCount': len(result['top50Snapshots']),
        'top50RowCount': sum(item['rowCount'] for item in result['top50Snapshots']),
        'responseRateReleaseCount': len(result['responseRateSnapshots']),
        'responseRateRowCount': sum(item['rowCount'] for item in result['responseRateSnapshots']),
        'top50ArchiveSha256': result['provenance']['top50']['archiveSha256'],
        'responseRatesArchiveSha256': result['provenance']['responseRates']['archiveSha256'],
    }
    manifest.parent.mkdir(parents=True, exist_ok=True)
    manifest.write_text(json.dumps(manifest_data, sort_keys=True, separators=(',', ':')) + '\n', encoding='utf-8')
    return manifest_data


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--top50', type=Path, default=TOP50_ARCHIVE)
    parser.add_argument('--response-rates', type=Path, default=RESPONSE_ARCHIVE)
    parser.add_argument('--snapshot', type=Path, default=SNAPSHOT)
    parser.add_argument('--metadata', type=Path, default=METADATA)
    parser.add_argument('--output', type=Path, default=OUTPUT)
    parser.add_argument('--manifest', type=Path, default=MANIFEST)
    args = parser.parse_args()
    result = build_files(args.top50, args.response_rates, args.snapshot, args.metadata, args.output, args.manifest)
    print(json.dumps(result, sort_keys=True))


if __name__ == '__main__':
    main()
