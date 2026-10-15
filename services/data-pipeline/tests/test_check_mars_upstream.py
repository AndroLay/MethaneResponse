import base64
import hashlib
import io
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from check_mars_upstream import check_snapshot  # noqa: E402


SNAPSHOT = {
    'snapshotId': 'unep-mars-675417694883',
    'archiveEtag': '0x8DF299FE24DC1F8',
    'archiveByteLength': 10_795_938,
    'archiveContentMd5Base64': 'qpQF/ugHPKCoPv7MFuh38A==',
    'archiveLastModifiedAt': '2026-10-14T03:04:38+00:00',
    'geometryArchiveEtag': '0x8DF299FE29EBB2C',
    'geometryArchiveByteLength': 55_446_778,
    'geometryArchiveContentMd5Base64': 'R/3XbiPLmcy32d7fGmOfsA==',
    'geometryArchiveLastModifiedAt': '2026-10-14T03:04:38+00:00',
}

CSV_HEADERS = {
    'ETag': '0x8DF299FE24DC1F8',
    'Content-Length': '10795938',
    'Content-MD5': 'qpQF/ugHPKCoPv7MFuh38A==',
    'Last-Modified': 'Wed, 14 Oct 2026 03:04:38 GMT',
}
GEOJSON_HEADERS = {
    'ETag': '"0x8DF299FE29EBB2C"',
    'Content-Length': '55446778',
    'Content-MD5': 'R/3XbiPLmcy32d7fGmOfsA==',
    'Last-Modified': 'Wed, 14 Oct 2026 03:04:38 GMT',
}


def test_reports_unchanged_when_both_official_archive_headers_match():
    responses = {
        'csv': CSV_HEADERS,
        'geojson': GEOJSON_HEADERS,
    }
    report = check_snapshot(SNAPSHOT, lambda _url, kind: responses[kind])

    assert report['status'] == 'unchanged'
    assert report['snapshotId'] == 'unep-mars-675417694883'
    assert [archive['status'] for archive in report['archives']] == ['unchanged', 'unchanged']


def test_reports_changed_when_upstream_etag_differs_from_pinned_snapshot():
    responses = {
        'csv': {**CSV_HEADERS, 'ETag': '0xNEWARCHIVE'},
        'geojson': GEOJSON_HEADERS,
    }
    report = check_snapshot(SNAPSHOT, lambda _url, kind: responses[kind])

    assert report['status'] == 'changed'
    assert report['archives'][0]['status'] == 'changed'
    assert report['archives'][0]['differences']['etag'] == {
        'expected': '0x8DF299FE24DC1F8',
        'observed': '0xNEWARCHIVE',
    }


def test_reports_unavailable_when_required_metadata_is_missing():
    responses = {
        'csv': {key: value for key, value in CSV_HEADERS.items() if key != 'Content-MD5'},
        'geojson': GEOJSON_HEADERS,
    }
    report = check_snapshot(SNAPSHOT, lambda _url, kind: responses[kind])

    assert report['status'] == 'unavailable'
    assert report['archives'][0]['status'] == 'unavailable'
    assert 'contentMd5Base64' in report['archives'][0]['missingHeaders']


def test_reports_unavailable_when_head_request_fails():
    def fail_request(_url, _kind):
        raise OSError('network unavailable')

    report = check_snapshot(SNAPSHOT, fail_request)

    assert report['status'] == 'unavailable'
    assert [archive['status'] for archive in report['archives']] == ['unavailable', 'unavailable']
    assert all(archive['error'] == 'network unavailable' for archive in report['archives'])


class FakeResponse(io.BytesIO):
    status = 200

    def __init__(self, content: bytes):
        super().__init__(content)
        self.bytes_read = 0

    def read(self, size=-1):
        chunk = super().read(size)
        self.bytes_read += len(chunk)
        return chunk

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        self.close()


def _snapshot_for_content(csv_bytes: bytes, geometry_bytes: bytes):
    snapshot = dict(SNAPSHOT)
    fields = {
        'csv': ('archiveSha256', 'archiveByteLength', 'archiveContentMd5Base64'),
        'geometry': ('geometryArchiveSha256', 'geometryArchiveByteLength', 'geometryArchiveContentMd5Base64'),
    }
    for kind, content in (('csv', csv_bytes), ('geometry', geometry_bytes)):
        sha_key, length_key, md5_key = fields[kind]
        snapshot[sha_key] = hashlib.sha256(content).hexdigest()
        snapshot[length_key] = len(content)
        snapshot[md5_key] = base64.b64encode(hashlib.md5(content, usedforsecurity=False).digest()).decode('ascii')
    return snapshot


def _headers_for_content(csv_bytes: bytes, geometry_bytes: bytes):
    headers = {}
    for kind, content in (('csv', csv_bytes), ('geojson', geometry_bytes)):
        expected = CSV_HEADERS if kind == 'csv' else GEOJSON_HEADERS
        headers[kind] = {
            **expected,
            'Content-Length': str(len(content)),
            'Content-MD5': base64.b64encode(hashlib.md5(content, usedforsecurity=False).digest()).decode('ascii'),
        }
    return headers


def test_metadata_check_does_not_download_archive_bytes_by_default():
    calls = []

    report = check_snapshot(
        SNAPSHOT,
        lambda _url, kind: CSV_HEADERS if kind == 'csv' else GEOJSON_HEADERS,
        content_request=lambda url, kind: calls.append((url, kind)),
    )

    assert report['status'] == 'unchanged'
    assert calls == []
    assert all('contentVerification' not in archive for archive in report['archives'])


def test_streaming_content_verification_matches_pinned_archive_hashes():
    csv_bytes = b'csv archive bytes'
    geometry_bytes = b'geojson archive bytes'
    content = {'csv': csv_bytes, 'geojson': geometry_bytes}
    headers = _headers_for_content(csv_bytes, geometry_bytes)

    report = check_snapshot(
        _snapshot_for_content(csv_bytes, geometry_bytes),
        lambda _url, kind: headers[kind],
        content_request=lambda _url, kind: FakeResponse(content[kind]),
        verify_content=True,
    )

    assert report['status'] == 'unchanged'
    assert report['scope'] == 'read-only HTTP HEAD metadata and streamed archive SHA-256/length/MD5 verification'
    assert [archive['contentVerification']['status'] for archive in report['archives']] == ['matched', 'matched']
    assert report['archives'][0]['contentVerification']['observed']['sha256'] == hashlib.sha256(csv_bytes).hexdigest()


def test_streaming_content_verification_reports_changed_bytes():
    csv_bytes = b'current csv archive bytes'
    geometry_bytes = b'current geometry archive bytes'
    snapshot = _snapshot_for_content(csv_bytes, geometry_bytes)
    snapshot['archiveSha256'] = 'f' * 64
    headers = _headers_for_content(csv_bytes, geometry_bytes)
    content = {'csv': csv_bytes, 'geojson': geometry_bytes}

    report = check_snapshot(
        snapshot,
        lambda _url, kind: headers[kind],
        content_request=lambda _url, kind: FakeResponse(content[kind]),
        verify_content=True,
    )

    assert report['status'] == 'changed'
    assert report['archives'][0]['status'] == 'changed'
    assert report['archives'][0]['contentVerification']['differences']['sha256'] == {
        'expected': 'f' * 64,
        'observed': hashlib.sha256(csv_bytes).hexdigest(),
    }


def test_streaming_content_verification_aborts_above_configured_byte_limit():
    csv_bytes = b'too large'
    geometry_bytes = b'geojson'
    snapshot = _snapshot_for_content(csv_bytes, geometry_bytes)
    snapshot['archiveByteLength'] = 3
    headers = _headers_for_content(csv_bytes, geometry_bytes)
    content = {'csv': csv_bytes, 'geojson': geometry_bytes}
    responses = []

    def content_request(_url, kind):
        response = FakeResponse(content[kind])
        responses.append(response)
        return response

    report = check_snapshot(
        snapshot,
        lambda _url, kind: headers[kind],
        content_request=content_request,
        verify_content=True,
        max_content_bytes=3,
    )

    assert report['status'] == 'unavailable'
    assert report['archives'][0]['contentVerification']['status'] == 'unavailable'
    assert 'configured maximum' in report['archives'][0]['contentVerification']['error']
    assert responses[0].bytes_read == 4


def test_streaming_content_verification_is_unavailable_without_pinned_sha256():
    csv_bytes = b'csv archive bytes'
    geometry_bytes = b'geojson archive bytes'
    snapshot = _snapshot_for_content(csv_bytes, geometry_bytes)
    snapshot.pop('archiveSha256')
    headers = _headers_for_content(csv_bytes, geometry_bytes)
    calls = []

    report = check_snapshot(
        snapshot,
        lambda _url, kind: headers[kind],
        content_request=lambda url, kind: calls.append((url, kind)),
        verify_content=True,
    )

    assert report['status'] == 'unavailable'
    assert report['archives'][0]['contentVerification']['status'] == 'unavailable'
    assert 'missing valid archive hash metadata' in report['archives'][0]['contentVerification']['error']
    assert calls == [('https://unepazeconomyadlsstorage.blob.core.windows.net/public/unep_methanedata_detected_plumes_geojson.zip', 'geojson')]


def test_streaming_content_verification_reports_transport_failure():
    csv_bytes = b'csv archive bytes'
    geometry_bytes = b'geojson archive bytes'
    snapshot = _snapshot_for_content(csv_bytes, geometry_bytes)
    headers = _headers_for_content(csv_bytes, geometry_bytes)

    def fail_request(url, kind):
        if kind == 'csv':
            raise OSError('download unavailable')
        return FakeResponse(geometry_bytes)

    report = check_snapshot(
        snapshot,
        lambda _url, kind: headers[kind],
        content_request=fail_request,
        verify_content=True,
    )

    assert report['status'] == 'unavailable'
    assert report['archives'][0]['contentVerification']['status'] == 'unavailable'
    assert report['archives'][0]['contentVerification']['error'] == 'download unavailable'
