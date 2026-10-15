import io
import base64
import hashlib
import json
import sys
import zipfile
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build_publisher_indicators import build_files, build_indicators, parse_response_archive, parse_top50_archive


TOP_FIELDS = [
    'Country', 'Sector', 'Potential Source Type', 'Source ID', 'Latitude', 'Longitude',
    'Number of Plumes Detected\n(2024-Present)', 'Plumes Notified\n(Y/N)',
    'Feedback Received\n(Y/N)', 'Average Half-Year\nFlux Rate (t/h)',
    'Average Half-Year\nFlux Rate Std. Dev. (t/h)', 'Average Annual\nFlux Rate (t/h)',
    'Average Annual\nFlux Rate Std. Dev. (t/h)', 'Date of Last\nPlume Detected',
    'Half-Year\nPersistency Category', 'Half-Year\nEmission Persistency',
    'Half-Year\nPersistency Std. Dev.', 'Annual\nPersistency Category',
    'Annual\nEmission Persistency', 'Annual\nPersistency Std. Dev.',
    'Estimated Half-Year\nCH4 Emissions (t)', 'Estimated Annual\nCH4 Emissions (t)',
]


def zip_with(items):
    target = io.BytesIO()
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name, content in items.items():
            archive.writestr(name, content)
    return target.getvalue()


def top_row(source_id='MEX_S_003', latitude='19.56611', flux='36.9'):
    values = ['Mexico', 'Oil and gas', 'Production offshore', source_id, latitude, '-92.237',
              '84', 'Y', 'Y', '37.28', '8.78', flux, '3.2', '2026-09-10', 'Frequent',
              '0.8', '0.1', 'Frequent', '0.75', '0.12', '1200.5', '2400.75']
    return dict(zip(TOP_FIELDS, values))


def top_rows():
    return [top_row('MEX_S_003' if index == 0 else f'TEST_S_{index:03d}') for index in range(50)]


def top_archive(rows):
    import csv
    text = io.StringIO(newline='')
    writer = csv.DictWriter(text, fieldnames=TOP_FIELDS)
    writer.writeheader()
    writer.writerows(rows)
    return zip_with({'2026-09/topemitter_sources_2026-09.csv': text.getvalue()})


def response_archive(rate='1', notified='166', feedback='1', dates=('2025-08-01', '2026-07-31')):
    import csv
    fields = ['country', 'notification_date_from', 'notification_date_until', 'n_sources_notified',
              'n_sources_notified_feedback', 'response_rate (%)']
    text = io.StringIO(newline='')
    writer = csv.DictWriter(text, fieldnames=fields)
    writer.writeheader()
    writer.writerow(dict(zip(fields, ['Algeria', dates[0], dates[1], notified, feedback, rate])))
    return zip_with({'unep_methanedata_responserate/LATEST/2025-08-01_2026-07-31_Response_Rates.csv': text.getvalue()})


def archive_metadata(payload, url, retrieved_at, modified, etag):
    return {
        'sourceUrl': url,
        'retrievedAt': retrieved_at,
        'lastModified': modified,
        'etag': etag,
        'contentMd5': base64.b64encode(hashlib.md5(payload, usedforsecurity=False).digest()).decode('ascii'),
        'sha256': hashlib.sha256(payload).hexdigest(),
        'bytes': len(payload),
    }


def test_top50_preserves_published_units_nulls_and_multiline_column_names():
    rows = top_rows()
    row = rows[0]
    row['Average Annual\nFlux Rate (t/h)'] = ''
    rows[1]['Average Half-Year\nFlux Rate (t/h)'] = '999'
    result = parse_top50_archive(top_archive(rows))
    assert result[0]['period'] == '2026-09'
    assert result[0]['rows'][0]['publisherRowOrder'] == 1
    assert result[0]['rows'][0]['sourceId'] == 'MEX_S_003'
    assert result[0]['rows'][0]['averageAnnualFluxRateTHr'] is None
    assert result[0]['rows'][0]['averageHalfYearFluxRateTHr'] == 37.28
    assert result[0]['rows'][0]['estimatedAnnualMethaneEmissionsT'] == 2400.75
    assert result[0]['rows'][0]['publisherFeedbackFlag'] is True
    assert result[0]['rows'][1]['publisherRowOrder'] == 2
    assert result[0]['rows'][1]['averageHalfYearFluxRateTHr'] == 999


def test_top50_rejects_duplicate_ids_and_invalid_coordinates():
    rows = top_rows()
    rows[1]['Source ID'] = rows[0]['Source ID']
    with pytest.raises(ValueError, match='duplicate'):
        parse_top50_archive(top_archive(rows))
    rows = top_rows()
    rows[0]['Latitude'] = '95'
    with pytest.raises(ValueError, match='latitude'):
        parse_top50_archive(top_archive(rows))


def test_response_history_keeps_published_period_and_denominator_and_null_rate():
    data = parse_response_archive(response_archive(rate='NA', notified='0', feedback='0'))
    row = data[0]['rows'][0]
    assert (data[0]['periodStart'], data[0]['periodEnd']) == ('2025-08-01', '2026-07-31')
    assert row['notifiedSourceCount'] == 0
    assert row['notifiedWithFeedbackCount'] == 0
    assert row['publishedResponseRatePercent'] is None
    assert row['country'] == 'Algeria'


def test_response_archive_rejects_period_disagreement_and_impossible_counts():
    with pytest.raises(ValueError, match='period'):
        parse_response_archive(response_archive(dates=('2025-07-01', '2026-06-30')))
    with pytest.raises(ValueError, match='feedback'):
        parse_response_archive(response_archive(notified='2', feedback='3'))


def test_builder_is_deterministic_and_binds_exact_source_ids():
    snapshot = {'snapshotId': 'mars-test', 'sources': [{'sourceId': 'MEX_S_003'}, {'sourceId': 'ARG_S_999'}], 'provenance': {'archiveSha256': 'c' * 64}}
    top_bytes = top_archive(top_rows())
    response_bytes = response_archive()
    metadata = {
        'retrievedAt': '2026-10-15T08:42:24Z',
        'archives': {
            'top50': archive_metadata(top_bytes, 'https://example.test/top50.zip', '2026-10-15T08:42:24Z', '2026-09-16T10:38:28Z', 'tag-top'),
            'responseRates': archive_metadata(response_bytes, 'https://example.test/response.zip', '2026-10-15T08:42:22Z', '2026-09-17T14:11:42Z', 'tag-response'),
        },
        'mitigationSnapshotReference': {
            'title': 'MARS Snapshot September 2026', 'period': '2026-09',
            'publisherUrl': 'https://example.test/report', 'publisherHandle': 'https://example.test/handle/1',
            'license': 'CC BY-NC-ND 3.0 IGO', 'checkedAt': '2026-10-15T08:43:00Z',
            'handling': 'official-link-only; report content not downloaded, copied, or parsed',
        },
    }
    args = (top_bytes, response_bytes, snapshot, metadata)
    first = build_indicators(*args)
    second = build_indicators(*args)
    assert json.dumps(first, sort_keys=True, separators=(',', ':')) == json.dumps(second, sort_keys=True, separators=(',', ':'))
    latest = first['top50Snapshots'][-1]
    assert latest['matchedSourceCount'] == 1
    assert len(latest['unmatchedSourceIds']) == 49
    assert first['marsSnapshotId'] == 'mars-test'
    assert first['marsSnapshotProvenance']['archiveSha256'] == 'c' * 64
    assert first['responseRateSnapshots'][0]['rows'][0]['publishedResponseRatePercent'] == 1


def test_committed_official_releases_rebuild_as_complete_snapshot_bound_data(tmp_path):
    root = Path(__file__).resolve().parents[3]
    output, manifest = tmp_path / 'indicators.json', tmp_path / 'indicators.manifest.json'
    first = build_files(
        root / 'data/real/mars_publisher_archives/releases/2026-10-15/top50_monthly.zip',
        root / 'data/real/mars_publisher_archives/releases/2026-10-15/country_response_rates.zip',
        root / 'apps/web/public/data/mars-snapshot.json.gz',
        root / 'data/real/mars_publisher_archives/releases/2026-10-15/retrieval-provenance.json',
        output,
        manifest,
    )
    first_bytes = output.read_bytes()
    second = build_files(
        root / 'data/real/mars_publisher_archives/releases/2026-10-15/top50_monthly.zip',
        root / 'data/real/mars_publisher_archives/releases/2026-10-15/country_response_rates.zip',
        root / 'apps/web/public/data/mars-snapshot.json.gz',
        root / 'data/real/mars_publisher_archives/releases/2026-10-15/retrieval-provenance.json',
        output,
        manifest,
    )
    data = json.loads(first_bytes)
    assert first == second
    assert output.read_bytes() == first_bytes
    assert first['dataFileSha256'] == hashlib.sha256(first_bytes).hexdigest()
    assert first['marsSnapshotId'] == 'unep-mars-675417694883'
    assert first['top50ReleaseCount'] == 9 and first['top50RowCount'] == 450
    assert first['responseRateReleaseCount'] == 8 and first['responseRateRowCount'] == 278
    assert all(release['rowCount'] == 50 for release in data['top50Snapshots'])
    assert [release['period'] for release in data['top50Snapshots']] == [f'2026-{month:02d}' for month in range(1, 10)]
    assert all(release['matchedSourceCount'] == 50 and not release['unmatchedSourceIds'] for release in data['top50Snapshots'])
    assert data['responseRateSnapshots'][-1]['periodEnd'] == '2026-07-31'
