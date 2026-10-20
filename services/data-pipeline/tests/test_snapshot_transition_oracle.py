import copy
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from snapshot_transition_oracle import difference, expected_changes, read_input, verify_report

ROOT = Path(__file__).resolve().parents[3]
BEFORE = 'a29a892e6c8aed4d6389313ffbc311df0bfe4e59aa78cce2b1b2cdbfb65ee72d'
AFTER = 'f27c21ab0932de3768a57029410c90677944e732f8be341e1d3abf4f36a91ae7'


def test_oracle_null_zero_removed_and_source_relinking_stay_distinct():
    rows = difference({'DEMO-a': {'flux': None}, 'DEMO-b': {'sourceId': 'DEMO-old'}, 'DEMO-remove': {'flux': 5}},
                      {'DEMO-a': {'flux': 0}, 'DEMO-b': {'sourceId': 'DEMO-new'}})
    assert rows[0]['before'] == {'flux': None} and rows[0]['after'] == {'flux': 0}
    assert rows[1]['changedFields'] == ['sourceId']
    assert rows[2]['kind'] == 'removed' and rows[2]['after'] is None


def test_independent_real_release_replay_checks_every_source_and_plume_change():
    before = read_input(ROOT / 'data/real/snapshot-projections/unep-mars-e0721015e925.json.gz', BEFORE)
    after = read_input(ROOT / 'apps/web/public/data/mars-snapshot.json.gz', AFTER)
    report = json.loads((ROOT / 'data/processed/snapshot-transition/report.json').read_text())
    verify_report(report, before, after, BEFORE, AFTER, report['digest'])
    expected = expected_changes(before, after)
    assert expected['summary'] == {'addedSources': 7, 'removedSources': 0, 'changedSources': 170, 'addedObservations': 95,
                                   'removedObservations': 0, 'changedObservations': 3, 'laterDatedAdditions': 82,
                                   'historicalBackfillAdditions': 13, 'reassignedObservations': 0}
    assert len(expected['affectedSourceIds']) == 178
    edited = copy.deepcopy(report)
    edited['observationChanges'][0]['after']['fluxKgHr'] = 123456
    with pytest.raises(ValueError, match='independent'):
        verify_report(edited, before, after, BEFORE, AFTER, report['digest'])
    with pytest.raises(ValueError, match='identity'):
        verify_report(report, before, after, BEFORE, AFTER, '0x' + 'f' * 64)


def test_changed_input_cannot_be_trusted_by_its_filename():
    with pytest.raises(ValueError, match='hash'):
        read_input(ROOT / 'data/real/snapshot-projections/unep-mars-e0721015e925.json.gz', 'f' * 64)


def test_backfill_boundary_uses_utc_instead_of_the_timestamp_text_prefix():
    before = {'sources': [], 'unmappedSources': [], 'unlinkedObservations': [], 'originalSourceCount': 0,
              'plumeCount': 0, 'truncated': False, 'plumeObservationDateRange': {'end': '2025-01-01'}}
    after = copy.deepcopy(before)
    after['plumeCount'] = 1
    after['unlinkedObservations'] = [{'id': 'DEMO-offset', 'sourceId': None, 'linkStatus': 'source_id_missing', 'date': '2025-01-01T23:30:00-02:00'}]
    result = expected_changes(before, after)
    assert result['summary']['laterDatedAdditions'] == 1
    assert result['summary']['historicalBackfillAdditions'] == 0
