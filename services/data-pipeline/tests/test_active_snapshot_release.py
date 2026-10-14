import gzip
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
CURRENT_SNAPSHOT_ID = 'unep-mars-675417694883'
CURRENT_ARCHIVE_SHA256 = '675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43'
CURRENT_BROWSER_INPUT_SHA256 = 'f27c21ab0932de3768a57029410c90677944e732f8be341e1d3abf4f36a91ae7'
CURRENT_BROWSER_DECODED_SHA256 = 'cb81f3fa991e00abb45f63b2e143251c3468556a41573d5fdc7f08db532eba70'
CURRENT_GEOMETRY_ARCHIVE_SHA256 = '42315a8803a51e0daf880b95f0723c6d54ec0fd7c1f4600c0ca5e07838f7c26c'
CURRENT_GEOMETRY_INDEX_SHA256 = '1316e00636ccf2f6915e0987ec4f592292e2d7a83a4beb21920dd0e62470e13d'
CURRENT_INTELLIGENCE_SHA256 = '40095bdf6963ab8f29f8188787de37e54620e7858d95982700a350187c1e7049'
CURRENT_CATALOG_SHA256 = '7ab9e4c3d2bec09b1710646f6d68cb5786e187839080b5c1fdd3a94a5ecd79fc'
CURRENT_LEDGER_SHA256 = 'f6038d156bfa408af568cf76df449c864069f454995edef5fb9ec2d262d825ff'
CURRENT_LEDGER_PREDICTIONS_SHA256 = '696aa3af6dc8ce9b235ec454853b72253eed0820e3bc469b4660d760b95cbb7b'
CURRENT_LEDGER_EVALUATION_SHA256 = '39e79be1f3316079674ea4c788ab0e09a62554ae014cbe79dc8e141a894c7158'


def read_json(path: Path):
    return json.loads(path.read_text(encoding='utf-8'))


def sha256(path: Path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def test_active_mars_release_is_bound_across_history_map_geometry_intelligence_and_ledger():
    history_path = ROOT / 'data/real/mars_snapshot_history.json'
    history = read_json(history_path)
    browser_history_path = ROOT / 'apps/web/public/data/mars-snapshot-history.json'
    browser_manifest = read_json(ROOT / 'apps/web/public/data/mars-snapshot-manifest.json')
    progressive_manifest = read_json(ROOT / 'apps/web/public/data/mars-progressive-manifest.json')
    geometry_index_path = ROOT / 'apps/web/public/data/mars-plume-geometries/index.json'
    geometry_manifest = read_json(geometry_index_path)
    intelligence_path = ROOT / 'data/processed/intelligence-snapshot.json'
    intelligence = read_json(intelligence_path)
    browser_snapshot_path = ROOT / 'apps/web/public/data/mars-snapshot.json.gz'
    browser_snapshot = json.loads(gzip.decompress(browser_snapshot_path.read_bytes()))
    catalog_path = ROOT / 'apps/web/public/data/mars-source-catalog.json.gz'
    ledger_path = ROOT / 'data/processed/prospective/record-recurrence-ledger-2026-10-14-v6.json'
    ledger = read_json(ledger_path)
    ledger_evaluation = read_json(
        ROOT / 'data/processed/prospective/record-recurrence-evaluation-2026-10-14-v6-baseline.json'
    )
    casebook_path = ROOT / 'data/real/mars_casebook_2026-10-14.json'
    selection_path = ROOT / 'data/real/mars_case_selection_2026-10-14.json'
    casebook = read_json(casebook_path)

    snapshots = history['snapshots']
    current = snapshots[-1]
    assert len(snapshots) == 4
    assert snapshots[-2]['snapshotId'] == 'unep-mars-ccd8267c55ee'
    assert current['snapshotId'] == CURRENT_SNAPSHOT_ID
    assert current['archiveSha256'] == CURRENT_ARCHIVE_SHA256
    assert current['retrievedAt'] == '2026-10-14T06:10:12+00:00'
    assert current['archiveLastModifiedAt'] == '2026-10-14T03:04:38+00:00'
    assert current['normalizedSnapshotSha256'] == '1f45789b123d244c15b062cbe419120ccd017f39735ce2de5d69ed7abdb1cfca'
    assert current['browserInputSha256'] == CURRENT_BROWSER_INPUT_SHA256
    assert current['browserDecodedContentSha256'] == CURRENT_BROWSER_DECODED_SHA256
    assert current['sources'] == 4_218
    assert current['plumes'] == 30_414
    assert current['linkedPlumes'] == 23_861
    assert current['sourceIdMissingPlumes'] == 6_553
    assert current['sourceRecordMissingPlumes'] == 0
    assert current['unquantifiedPlumes'] == 1_051
    assert current['observationDateRange'] == {'start': '2020-10-29', 'end': '2026-09-13'}
    assert current['geometryArchiveSha256'] == CURRENT_GEOMETRY_ARCHIVE_SHA256
    assert current['geometryIndexSha256'] == CURRENT_GEOMETRY_INDEX_SHA256
    assert current['intelligenceSnapshotSha256'] == CURRENT_INTELLIGENCE_SHA256
    assert current['casebookSha256'] == '5010594d9de903ae38904e05e2a137c8701c4ded9fcc3ef433d322ec860dda94'
    assert current['caseSelectionSha256'] == '77ec68cfd9e0302a755d36d38fa0d942abe3d2004221bcddf366e0f92f42e15f'
    assert history_path.read_bytes() == browser_history_path.read_bytes()

    assert sha256(browser_snapshot_path) == CURRENT_BROWSER_INPUT_SHA256
    assert browser_manifest['datasetSnapshotId'] == CURRENT_SNAPSHOT_ID
    assert browser_manifest['sourceArchiveSha256'] == CURRENT_ARCHIVE_SHA256
    assert browser_manifest['inputFileSha256'] == CURRENT_BROWSER_INPUT_SHA256
    assert browser_manifest['decodedContentSha256'] == CURRENT_BROWSER_DECODED_SHA256
    assert (browser_manifest['sourceCount'], browser_manifest['plumeCount']) == (4_218, 30_414)
    assert progressive_manifest['datasetSnapshotId'] == CURRENT_SNAPSHOT_ID
    assert progressive_manifest['sourceArchiveSha256'] == CURRENT_ARCHIVE_SHA256
    assert (progressive_manifest['sourceCount'], progressive_manifest['plumeCount']) == (4_218, 30_414)
    assert (progressive_manifest['linkedObservationCount'], progressive_manifest['unlinkedObservationCount']) == (23_861, 6_553)
    assert progressive_manifest['catalog']['compressedSha256'] == CURRENT_CATALOG_SHA256
    assert sha256(catalog_path) == CURRENT_CATALOG_SHA256
    assert hashlib.sha256(gzip.decompress(catalog_path.read_bytes())).hexdigest() == progressive_manifest['catalog']['decodedSha256']

    source_ids = [source['sourceId'] for source in browser_snapshot['sources']]
    linked = [observation for source in browser_snapshot['sources'] for observation in source['observations']]
    unlinked = browser_snapshot['unlinkedObservations']
    observation_ids = [item['id'] for item in [*linked, *unlinked]]
    assert browser_snapshot['snapshotId'] == CURRENT_SNAPSHOT_ID
    assert browser_snapshot['truncated'] is False
    assert len(source_ids) == len(set(source_ids)) == 4_218
    assert len(linked) == 23_861
    assert len(unlinked) == 6_553
    assert len(observation_ids) == len(set(observation_ids)) == 30_414
    assert all(item['sourceId'] == source['sourceId'] for source in browser_snapshot['sources'] for item in source['observations'])
    assert all(item['linkStatus'] == 'linked' and item['synthetic'] is False for item in linked)
    assert all(item['linkStatus'] == 'source_id_missing' and item['sourceId'] is None for item in unlinked)
    assert sum(item.get('fluxKgHr') is None for item in [*linked, *unlinked]) == 1_051
    assert all(-90 <= source['lat'] <= 90 and -180 <= source['lon'] <= 180 for source in browser_snapshot['sources'])

    assert geometry_manifest['datasetId'] == CURRENT_SNAPSHOT_ID
    assert geometry_manifest['sourceArchiveSha256'] == CURRENT_ARCHIVE_SHA256
    assert geometry_manifest['geometryArchiveSha256'] == CURRENT_GEOMETRY_ARCHIVE_SHA256
    assert geometry_manifest['inputPlumeCount'] == 30_414
    assert geometry_manifest['geometryFeatureCount'] == 29_207
    assert geometry_manifest['withoutGeometryCount'] == 1_207
    assert len(geometry_manifest['observationMonths']) == 66
    assert sha256(geometry_index_path) == CURRENT_GEOMETRY_INDEX_SHA256

    assert sha256(intelligence_path) == CURRENT_INTELLIGENCE_SHA256
    assert intelligence['datasetSnapshotId'] == CURRENT_SNAPSHOT_ID
    assert intelligence['upstreamArchiveSha256'] == CURRENT_ARCHIVE_SHA256
    assert intelligence['inputFileSha256'] == CURRENT_BROWSER_INPUT_SHA256
    assert intelligence['sourceCount'] == 4_218
    assert intelligence['linkedObservationCount'] == 23_861
    assert intelligence['publisherIndicatorComparison']['datasetSnapshotId'] == CURRENT_SNAPSHOT_ID

    assert sha256(ledger_path) == CURRENT_LEDGER_SHA256
    assert sha256(ROOT / 'data/processed/prospective/record-recurrence-evaluation-2026-10-14-v6-baseline.json') == CURRENT_LEDGER_EVALUATION_SHA256
    assert ledger['baseline']['datasetSnapshotId'] == CURRENT_SNAPSHOT_ID
    assert ledger['baseline']['publisherArchiveSha256'] == CURRENT_ARCHIVE_SHA256
    assert ledger['baseline']['inputSnapshotSha256'] == CURRENT_BROWSER_INPUT_SHA256
    assert ledger['predictionCount'] == 4_218
    assert ledger['predictionsSha256'] == CURRENT_LEDGER_PREDICTIONS_SHA256
    assert ledger['baseline']['datasetLastObservedDate'] == '2026-09-13'
    assert ledger['forecastWindow'] == {
        'startExclusive': '2026-09-13', 'endInclusive': '2027-09-13', 'horizonDays': 365,
    }
    assert ledger_evaluation['status'] == 'not_available'
    assert ledger_evaluation['labeledSourceCount'] == 0
    assert ledger_evaluation['followupSnapshotId'] == CURRENT_SNAPSHOT_ID

    assert casebook['provenance']['snapshotId'] == CURRENT_SNAPSHOT_ID
    assert casebook['provenance']['archiveSha256'] == CURRENT_ARCHIVE_SHA256
    assert sha256(casebook_path) == current['casebookSha256']
    assert sha256(selection_path) == current['caseSelectionSha256']
