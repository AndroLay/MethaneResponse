import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from observation_check_oracle import corpus_rows, expected_query


def record(identifier, date, flux):
    return {"id": identifier, "date": date, "fluxKgHr": flux}


def test_oracle_utc_window_and_numeric_missing_are_distinct():
    records = [record("a", "2026-06-09T23:00:00-02:00", 100), record("b", "2026-06-11T00:00:00Z", None)]
    query = {"kind": "reported_flux_at_most", "startDate": "2026-06-10", "endDate": "2026-06-10", "thresholdKgHr": 100}
    result = expected_query(records, query, "2026-01-01", "2026-06-30")
    assert result["status"] == "no_counterexample_in_archive"
    assert result["counterexampleIds"] == []
    assert result["summary"]["outsideWindow"] == 1
    query["endDate"] = "2026-06-11"
    assert expected_query(records, query, "2026-01-01", "2026-06-30")["status"] == "incomplete_flux"


def test_oracle_empty_window_never_means_repair_and_bounds_remain_explicit():
    for records in [[], [record("a", "2026-06-10", 0)]]:
        query = {"kind": "physical_mitigation", "startDate": "2026-06-01", "endDate": "2026-06-30"}
        assert expected_query(records, query, "2026-01-01", "2026-06-30")["status"] == "requires_document_review"
    query = {"kind": "no_linked_detections", "startDate": "2026-07-01", "endDate": "2026-07-31"}
    assert expected_query([], query, "2026-01-01", "2026-06-30")["status"] == "incomplete_window"
    query["startDate"], query["endDate"] = "2026-06-01", "2026-06-30"
    assert expected_query([], query, "2026-01-01", "2026-06-30")["status"] == "no_observations"


def test_oracle_corpus_keeps_exact_threshold_witnesses_and_zero_values():
    snapshot = {"sources": [{"sourceId": "DEMO-b", "observations": [record("above", "2026-06-10", 1001), record("equal", "2026-06-10", 1000), record("zero", "2026-06-10", 0), record("missing", "2026-06-10", None)]}, {"sourceId": "DEMO-a", "observations": []}]}
    result = corpus_rows(snapshot)
    assert result[0]["sourceId"] == "DEMO-a"
    assert result[1] == {"sourceId": "DEMO-b", "total": 4, "missingFlux": 1, "over1000": ["above"]}
