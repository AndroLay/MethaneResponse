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
