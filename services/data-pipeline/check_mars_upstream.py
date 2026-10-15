"""Compare official UNEP MARS archive headers and optional bytes with the pinned snapshot."""

import argparse
import base64
from datetime import timezone
from email.utils import parsedate_to_datetime
import hashlib
import json
from pathlib import Path
from typing import Callable, Mapping
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_HISTORY = ROOT / 'data/real/mars_snapshot_history.json'
DEFAULT_MAX_CONTENT_BYTES = 256 * 1024 * 1024
CONTENT_CHUNK_BYTES = 1024 * 1024
ARCHIVES = (
    {
        'kind': 'csv',
        'url': 'https://unepazeconomyadlsstorage.blob.core.windows.net/public/unep_methanedata_detected_plumes_csv.zip',
        'expected': {
            'etag': 'archiveEtag',
            'contentLength': 'archiveByteLength',
            'contentMd5Base64': 'archiveContentMd5Base64',
            'lastModifiedAt': 'archiveLastModifiedAt',
        },
        'sha256Key': 'archiveSha256',
        'headers': {
            'etag': 'ETag',
            'contentLength': 'Content-Length',
            'contentMd5Base64': 'Content-MD5',
            'lastModifiedAt': 'Last-Modified',
        },
    },
    {
        'kind': 'geojson',
        'url': 'https://unepazeconomyadlsstorage.blob.core.windows.net/public/unep_methanedata_detected_plumes_geojson.zip',
        'expected': {
            'etag': 'geometryArchiveEtag',
            'contentLength': 'geometryArchiveByteLength',
            'contentMd5Base64': 'geometryArchiveContentMd5Base64',
            'lastModifiedAt': 'geometryArchiveLastModifiedAt',
        },
        'sha256Key': 'geometryArchiveSha256',
        'headers': {
            'etag': 'ETag',
            'contentLength': 'Content-Length',
            'contentMd5Base64': 'Content-MD5',
            'lastModifiedAt': 'Last-Modified',
        },
    },
)


def _header_value(headers: Mapping[str, object], name: str) -> str | None:
    target = name.lower()
    for key, value in headers.items():
        if str(key).lower() == target and value is not None:
            return str(value).strip()
    return None


def _normalize_header(field: str, value: str) -> str | int:
    if field == 'etag':
        return value.strip('"')
    if field == 'contentLength':
        return int(value)
    if field == 'lastModifiedAt':
        parsed = parsedate_to_datetime(value)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc).isoformat(timespec='seconds')
    return value


def request_headers(url: str, _kind: str) -> Mapping[str, object]:
    request = Request(url, method='HEAD', headers={'User-Agent': 'MethaneResponse-MARS-freshness-check/1.0'})
    with urlopen(request, timeout=15) as response:
        if not 200 <= response.status < 300:
            raise OSError(f'HTTP {response.status}')
        return dict(response.headers.items())


def request_content(url: str, _kind: str):
    request = Request(url, headers={
        'User-Agent': 'MethaneResponse-MARS-content-verification/1.0',
        'Accept-Encoding': 'identity',
    })
    return urlopen(request, timeout=120)


def _stream_archive_digest(response, max_content_bytes: int) -> dict[str, object]:
    sha256 = hashlib.sha256()
    md5 = hashlib.md5(usedforsecurity=False)
    byte_length = 0
    while True:
        remaining = max_content_bytes - byte_length
        chunk = response.read(min(CONTENT_CHUNK_BYTES, remaining + 1))
        if not chunk:
            break
        byte_length += len(chunk)
        if byte_length > max_content_bytes:
            raise ValueError(f'Archive exceeds configured maximum of {max_content_bytes} bytes')
        sha256.update(chunk)
        md5.update(chunk)
    return {
        'sha256': sha256.hexdigest(),
        'byteLength': byte_length,
        'contentMd5Base64': base64.b64encode(md5.digest()).decode('ascii'),
    }


def verify_archive_content(
    snapshot: Mapping[str, object],
    archive: Mapping[str, object],
    content_request: Callable[[str, str], object],
    max_content_bytes: int,
) -> dict[str, object]:
    expected_metadata = archive['expected']
    assert isinstance(expected_metadata, Mapping)
    expected = {
        'sha256': snapshot.get(archive['sha256Key']),
        'byteLength': snapshot.get(expected_metadata['contentLength']),
        'contentMd5Base64': snapshot.get(expected_metadata['contentMd5Base64']),
    }
    if (
        not isinstance(expected['sha256'], str)
        or len(expected['sha256']) != 64
        or not isinstance(expected['byteLength'], int)
        or expected['byteLength'] < 0
        or not isinstance(expected['contentMd5Base64'], str)
    ):
        return {
            'status': 'unavailable',
            'expected': expected,
            'observed': {},
            'differences': {},
            'error': 'Pinned snapshot is missing valid archive hash metadata',
        }
    if max_content_bytes <= 0:
        return {
            'status': 'unavailable',
            'expected': expected,
            'observed': {},
            'differences': {},
            'error': 'Configured maximum content size must be positive',
        }
    if expected['byteLength'] > max_content_bytes:
        return {
            'status': 'unavailable',
            'expected': expected,
            'observed': {},
            'differences': {},
            'error': f"Pinned archive size exceeds configured maximum of {max_content_bytes} bytes",
        }

    try:
        with content_request(str(archive['url']), str(archive['kind'])) as response:
            status = getattr(response, 'status', 200)
            if not isinstance(status, int) or not 200 <= status < 300:
                raise OSError(f'HTTP {status}')
            observed = _stream_archive_digest(response, max_content_bytes)
    except Exception as error:  # network, TLS, timeout, HTTP, or size failure
        return {
            'status': 'unavailable',
            'expected': expected,
            'observed': {},
            'differences': {},
            'error': str(error),
        }

    differences = {
        field: {'expected': expected[field], 'observed': observed[field]}
        for field in expected
        if expected[field] != observed[field]
    }
    return {
        'status': 'changed' if differences else 'matched',
        'expected': expected,
        'observed': observed,
        'differences': differences,
    }


def check_snapshot(
    snapshot: Mapping[str, object],
    head_request: Callable[[str, str], Mapping[str, object]] = request_headers,
    content_request: Callable[[str, str], object] = request_content,
    verify_content: bool = False,
    max_content_bytes: int = DEFAULT_MAX_CONTENT_BYTES,
) -> dict[str, object]:
    archive_results = []
    for archive in ARCHIVES:
        kind = archive['kind']
        result: dict[str, object] = {
            'kind': kind,
            'url': archive['url'],
            'status': 'unchanged',
            'expected': {},
            'observed': {},
            'differences': {},
            'missingHeaders': [],
        }
        try:
            raw_headers = head_request(archive['url'], kind)
        except Exception as error:  # network, TLS, timeout, or HTTP failure
            result['status'] = 'unavailable'
            result['error'] = str(error)
            archive_results.append(result)
            continue

        expected_values = {
            field: snapshot.get(snapshot_key)
            for field, snapshot_key in archive['expected'].items()
        }
        observed_values: dict[str, str | int] = {}
        missing_headers = []
        parse_errors = []
        for field, header_name in archive['headers'].items():
            raw_value = _header_value(raw_headers, header_name)
            if raw_value is None or raw_value == '':
                missing_headers.append(field)
                continue
            try:
                observed_values[field] = _normalize_header(field, raw_value)
            except (TypeError, ValueError, OverflowError) as error:
                parse_errors.append(f'{field}: {error}')

        result['expected'] = expected_values
        result['observed'] = observed_values
        result['missingHeaders'] = missing_headers
        if missing_headers or parse_errors or any(value is None for value in expected_values.values()):
            result['status'] = 'unavailable'
            if parse_errors:
                result['error'] = '; '.join(parse_errors)
            elif any(value is None for value in expected_values.values()):
                result['error'] = 'Pinned snapshot is missing required archive metadata'
            archive_results.append(result)
            continue

        differences = {
            field: {'expected': expected_values[field], 'observed': observed_values[field]}
            for field in expected_values
            if expected_values[field] != observed_values.get(field)
        }
        result['differences'] = differences
        if differences:
            result['status'] = 'changed'
        if verify_content:
            content_result = verify_archive_content(snapshot, archive, content_request, max_content_bytes)
            result['contentVerification'] = content_result
            if content_result['status'] == 'unavailable':
                result['status'] = 'unavailable'
                result['error'] = content_result['error']
            elif content_result['status'] == 'changed':
                result['status'] = 'changed'
        archive_results.append(result)

    statuses = [archive['status'] for archive in archive_results]
    if 'unavailable' in statuses:
        overall_status = 'unavailable'
    elif 'changed' in statuses:
        overall_status = 'changed'
    else:
        overall_status = 'unchanged'
    return {
        'snapshotId': snapshot.get('snapshotId'),
        'status': overall_status,
        'scope': (
            'read-only HTTP HEAD metadata and streamed archive SHA-256/length/MD5 verification'
            if verify_content
            else 'read-only HTTP HEAD metadata comparison; archive bytes were not downloaded or hashed'
        ),
        'archives': archive_results,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--history', type=Path, default=DEFAULT_HISTORY, help='Versioned MARS snapshot history JSON')
    parser.add_argument(
        '--verify-content', action='store_true',
        help='Stream both upstream archives and compare their SHA-256, byte length, and MD5 to the pinned snapshot',
    )
    parser.add_argument(
        '--max-content-bytes', type=int, default=DEFAULT_MAX_CONTENT_BYTES,
        help=f'Maximum bytes to read from either archive with --verify-content (default: {DEFAULT_MAX_CONTENT_BYTES})',
    )
    args = parser.parse_args()
    history = json.loads(args.history.read_text(encoding='utf-8'))
    snapshots = history.get('snapshots')
    if not isinstance(snapshots, list) or not snapshots:
        parser.error('History file has no snapshots')
    report = check_snapshot(snapshots[-1], verify_content=args.verify_content, max_content_bytes=args.max_content_bytes)
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return {'unchanged': 0, 'changed': 2, 'unavailable': 3}[report['status']]


if __name__ == '__main__':
    raise SystemExit(main())
