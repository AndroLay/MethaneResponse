import csv
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ingest import ingest_csv  # noqa: E402


FIXTURE = Path(__file__).resolve().parents[3] / 'data' / 'fixtures' / 'mars_synthetic.csv'


def test_synthetic_plumes_are_parsed_without_repair_assertions():
    records, manifest = ingest_csv(FIXTURE, 'source_id')
    assert manifest['parsedCount'] == 2
    assert records[0]['sourceId'] == 'DEMO-001'
    assert records[0]['feedbackRaw'] == 'Yes'
    assert records[0]['mitigationConfirmed'] is None
    assert len(manifest['sha256']) == 64


def test_wrong_source_id_column_is_rejected():
    with pytest.raises(ValueError, match='Missing required columns'):
        ingest_csv(FIXTURE, 'nonexistent_column')


def test_missing_plume_is_skipped(tmp_path):
    path = tmp_path / 'test.csv'
    with path.open('w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(['source_id', 'id_plume', 'tile_date'])
        writer.writerow(['A', '', '2026-01-01'])
    rows, manifest = ingest_csv(path, 'source_id')
    assert rows == []
    assert manifest['skippedCount'] == 1

