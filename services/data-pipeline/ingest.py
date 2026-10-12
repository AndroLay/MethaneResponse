"""Conservative local CSV ingest. No network, repair inference, or automatic license assumption."""
import argparse
import csv
import hashlib
import io
import json
import math
import zipfile
from datetime import datetime, timezone
from pathlib import Path


REQUIRED_COLUMNS = {'id_plume', 'tile_date'}
MARS_SOURCE_MEMBER = 'unep_methanedata_detected_sources.csv'
MARS_PLUME_MEMBER = 'unep_methanedata_detected_plumes.csv'
MARS_LICENSE_MEMBER = 'LICENSE-CC-BY-NC-SA.txt'
MARS_DATASET_PAGE = 'https://methanedata.unep.org/download-dataset'
MARS_CSV_DOWNLOAD_URL = 'https://unepazeconomyadlsstorage.blob.core.windows.net/public/unep_methanedata_detected_plumes_csv.zip'
MARS_LICENSE = 'CC BY-NC-SA 4.0'


def ingest_csv(input_path: Path, source_column: str) -> tuple[list[dict], dict]:
    blob = input_path.read_bytes()
    sha256 = hashlib.sha256(blob).hexdigest()
    with input_path.open('r', encoding='utf-8-sig', newline='') as handle:
        reader = csv.DictReader(handle)
        fields = set(reader.fieldnames or [])
        missing = (REQUIRED_COLUMNS | {source_column}) - fields
        if missing:
            raise ValueError(f'Missing required columns: {sorted(missing)}')
        results = []
        skipped = 0
        for row in reader:
            source_id = (row.get(source_column) or '').strip()
            plume_id = (row.get('id_plume') or '').strip()
            date = (row.get('tile_date') or '').strip()
            if not (source_id and plume_id and date):
                skipped += 1
                continue
            flux = row.get('ch4_fluxrate', '').strip()
            std = row.get('ch4_fluxrate_std', '').strip()
            results.append({
                'sourceId': source_id,
                'plumeId': plume_id,
                'tileDate': date,
                'fluxKgHr': float(flux) if flux else None,
                'fluxStdKgHr': float(std) if std else None,
                'feedbackRaw': (row.get('feedback') or '').strip(),
                'mitigationConfirmed': None,  # DO NOT infer this from feedback or a missing later plume
            })
    manifest = {
        'schemaVersion': 1,
        'localFileName': input_path.name,
        'sha256': sha256,
        'processedAt': datetime.now(timezone.utc).isoformat(),
        'originalDatasetUrl': None,
        'sourceRetrievedAt': None,  # must be recorded separately when downloaded
        'sourceColumn': source_column,
        'parsedCount': len(results),
        'skippedCount': skipped,
        'license': 'REQUIRES SOURCE-SPECIFIC VERIFICATION; UNEP MARS download states CC BY-NC-SA 4.0',
    }
    return results, manifest


def _read_mars_member(archive: zipfile.ZipFile, member: str, required_columns: set[str]) -> list[dict[str, str]]:
    try:
        raw = archive.open(member)
    except KeyError as error:
        raise ValueError(f'Missing required MARS archive member: {member}') from error

    with raw, io.TextIOWrapper(raw, encoding='utf-8-sig', newline='') as handle:
        reader = csv.DictReader(handle)
        fields = set(reader.fieldnames or [])
        missing = required_columns - fields
        if missing:
            raise ValueError(f'MARS member {member} is missing required columns: {sorted(missing)}')
        return list(reader)


def _text(value: str | None) -> str | None:
    text = (value or '').strip()
    return text or None


def _optional_number(value: str | None, context: str) -> float | None:
    text = _text(value)
    if text is None or text.lower() in {'na', 'n/a', 'nan', 'null', 'none'}:
        return None
    try:
        number = float(text)
    except ValueError as error:
        raise ValueError(f'Invalid numeric value in {context}: {text!r}') from error
    return number if math.isfinite(number) else None


def _optional_integer(value: str | None, context: str) -> int | None:
    number = _optional_number(value, context)
    if number is None:
        return None
    if not number.is_integer():
        raise ValueError(f'Expected an integer in {context}: {number!r}')
    return int(number)


def _optional_boolean(value: str | None, context: str) -> bool | None:
    text = _text(value)
    if text is None:
        return None
    normalized = text.lower()
    if normalized in {'true', 'yes'}:
        return True
    if normalized in {'false', 'no'}:
        return False
    raise ValueError(f'Invalid boolean value in {context}: {text!r}')


def _source_record(row: dict[str, str]) -> dict:
    source_id = _text(row.get('source_name'))
    if not source_id:
        raise ValueError('MARS source record is missing source_name')
    return {
        'sourceId': source_id,
        'lon': _optional_number(row.get('lon'), f'{source_id}.lon'),
        'lat': _optional_number(row.get('lat'), f'{source_id}.lat'),
        'country': _text(row.get('country')),
        'sector': _text(row.get('sector')),
        'sourceType': _text(row.get('source_type')),
        'persistency': _optional_number(row.get('persistency'), f'{source_id}.persistency'),
        'persistencyStd': _optional_number(row.get('persistency_std'), f'{source_id}.persistency_std'),
        'persistencyCategory': _text(row.get('persistency_category')),
        'detectedPlumeCount': _optional_integer(row.get('n_plumes_detected'), f'{source_id}.n_plumes_detected'),
        'latestPlumeId': _text(row.get('id_last_plume')),
        'latestPlumeDate': _text(row.get('last_plume_date')),
        'notified': _text(row.get('notified')),
        'feedback': _text(row.get('feedback')),
        'feedbackOperator': _text(row.get('feedback_operator')),
        'feedbackGovernment': _text(row.get('feedback_government')),
        'feedbackScope': 'source',
        # The public source table records whether feedback was received, not verified repair.
        'mitigationConfirmed': None,
        'synthetic': False,
        # Preserve source columns as published so future normalizers can recover fields
        # without silently losing the original value or column spelling.
        'raw': dict(row),
    }


def _plume_record(row: dict[str, str], source_ids: set[str]) -> dict:
    plume_id = _text(row.get('id_plume'))
    if not plume_id:
        raise ValueError('MARS plume record is missing id_plume')
    source_id = _text(row.get('source_name'))
    if source_id is None:
        link_status = 'source_id_missing'
    elif source_id in source_ids:
        link_status = 'linked'
    else:
        link_status = 'source_record_missing'

    return {
        'plumeId': plume_id,
        'sourceId': source_id,
        'linkStatus': link_status,
        'satellite': _text(row.get('satellite')),
        'tileDate': _text(row.get('tile_date')),
        'lat': _optional_number(row.get('lat'), f'{plume_id}.lat'),
        'lon': _optional_number(row.get('lon'), f'{plume_id}.lon'),
        'actionable': _text(row.get('actionable')),
        'notified': _optional_boolean(row.get('notified'), f'{plume_id}.notified'),
        'country': _text(row.get('country')),
        'sector': _text(row.get('sector')),
        'detectionInstitution': _text(row.get('detection_institution')),
        'quantificationInstitution': _text(row.get('quantification_institution')),
        'tile': _text(row.get('tile')),
        'fluxKgHr': _optional_number(row.get('ch4_fluxrate'), f'{plume_id}.ch4_fluxrate'),
        'fluxStdKgHr': _optional_number(row.get('ch4_fluxrate_std'), f'{plume_id}.ch4_fluxrate_std'),
        'totalEmissionTonnes': _optional_number(row.get('total_emission'), f'{plume_id}.total_emission'),
        'totalEmissionStdTonnes': _optional_number(row.get('total_emission_std'), f'{plume_id}.total_emission_std'),
        'windU': _optional_number(row.get('wind_u'), f'{plume_id}.wind_u'),
        'windV': _optional_number(row.get('wind_v'), f'{plume_id}.wind_v'),
        'windSpeed': _optional_number(row.get('wind_speed'), f'{plume_id}.wind_speed'),
        'lastUpdate': _text(row.get('last_update')),
        'insertDate': _text(row.get('insert_date')),
        # Published values are product identifiers (for example Sentinel scene IDs),
        # not a numeric background-emissions measurement.
        'tileBackground': _text(row.get('tile_background')),
        'fluxUnit': 'kg/h',
        'synthetic': False,
        # Typed fields above are convenient for analysis; retain all published CSV values
        # verbatim for provenance and later reprocessing.
        'raw': dict(row),
    }


def ingest_mars_archive(input_path: Path, retrieved_at: str) -> tuple[dict, dict]:
    """Parse the official two-table MARS ZIP without joining source feedback onto plumes."""
    try:
        retrieved = datetime.fromisoformat(retrieved_at.replace('Z', '+00:00'))
    except ValueError as error:
        raise ValueError('retrieved_at must be an ISO 8601 timestamp') from error
    if retrieved.tzinfo is None:
        raise ValueError('retrieved_at must include a timezone')

    archive_bytes = input_path.read_bytes()
    archive_sha256 = hashlib.sha256(archive_bytes).hexdigest()
    try:
        archive = zipfile.ZipFile(io.BytesIO(archive_bytes))
    except zipfile.BadZipFile as error:
        raise ValueError('Input is not a valid MARS ZIP archive') from error

    with archive:
        bad_member = archive.testzip()
        if bad_member:
            raise ValueError(f'Corrupt MARS archive member: {bad_member}')
        members = set(archive.namelist())
        license_text = archive.read(MARS_LICENSE_MEMBER).decode('utf-8', 'replace') if MARS_LICENSE_MEMBER in members else ''
        if 'Attribution-NonCommercial-ShareAlike 4.0 International' not in license_text:
            raise ValueError('MARS archive is missing its CC BY-NC-SA 4.0 license text')

        source_rows = _read_mars_member(archive, MARS_SOURCE_MEMBER, {
            'source_name', 'lon', 'lat', 'country', 'sector', 'feedback',
            'feedback_operator', 'feedback_government',
        })
        plume_rows = _read_mars_member(archive, MARS_PLUME_MEMBER, {
            'id_plume', 'source_name', 'tile_date', 'lat', 'lon', 'notified',
        })

    sources = [_source_record(row) for row in source_rows]
    source_ids = [source['sourceId'] for source in sources]
    if len(source_ids) != len(set(source_ids)):
        raise ValueError('MARS archive contains duplicate source IDs')

    source_id_set = set(source_ids)
    plumes = [_plume_record(row, source_id_set) for row in plume_rows]
    plume_ids = [plume['plumeId'] for plume in plumes]
    if len(plume_ids) != len(set(plume_ids)):
        raise ValueError('MARS archive contains duplicate plume IDs')

    link_counts = {
        'linkedPlumes': sum(plume['linkStatus'] == 'linked' for plume in plumes),
        'sourceIdMissingPlumes': sum(plume['linkStatus'] == 'source_id_missing' for plume in plumes),
        'sourceRecordMissingPlumes': sum(plume['linkStatus'] == 'source_record_missing' for plume in plumes),
    }
    dates = sorted(plume['tileDate'][:10] for plume in plumes if plume['tileDate'])
    provenance = {
        'provider': 'UNEP International Methane Emissions Observatory (IMEO)',
        'dataset': 'Eye on Methane / MARS detected sources and plumes',
        'localFileName': input_path.name,
        'catalogUrl': MARS_DATASET_PAGE,
        'downloadUrl': MARS_CSV_DOWNLOAD_URL,
        'retrievedAt': retrieved.isoformat(),
        'archiveSha256': archive_sha256,
        'snapshotId': f'unep-mars-{archive_sha256[:12]}',
        'license': MARS_LICENSE,
        'attribution': 'Contains data from UNEP IMEO Eye on Methane / MARS, licensed CC BY-NC-SA 4.0. Changes: normalized the source and plume CSV tables into JSON; source feedback remains source-level; unresolved plume links are retained; no mitigation confirmation is inferred.',
    }
    counts = {
        'sources': len(sources),
        'plumes': len(plumes),
        **link_counts,
        'uniqueSourceIds': len(source_id_set),
        'uniquePlumeIds': len(set(plume_ids)),
    }
    date_range = {'start': dates[0] if dates else None, 'end': dates[-1] if dates else None}
    manifest = {
        'schemaVersion': 1,
        'snapshotId': provenance['snapshotId'],
        'processedAt': datetime.now(timezone.utc).isoformat(),
        'provenance': provenance,
        'counts': counts,
        'plumeObservationDateRange': date_range,
    }
    snapshot = {
        'schemaVersion': 1,
        'snapshotId': provenance['snapshotId'],
        'provenance': provenance,
        'counts': counts,
        'plumeObservationDateRange': date_range,
        'sources': sources,
        'plumes': plumes,
    }
    return snapshot, manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--source-column', required=True, help='Unique source identifier: inspect dataset dictionary first')
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--manifest', type=Path, required=True)
    args = parser.parse_args()
    parsed, manifest = ingest_csv(args.input, args.source_column)
    for target, payload in [(args.output, parsed), (args.manifest, manifest)]:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f"parsed={manifest['parsedCount']} skipped={manifest['skippedCount']} sha256={manifest['sha256']}")


if __name__ == '__main__':
    main()

