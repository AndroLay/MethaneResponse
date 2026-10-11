import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from evaluate_baseline import classify, evaluate_rows, load_benchmark  # noqa: E402


def test_typed_evidence_keeps_notifications_separate_from_mitigation():
    assert classify(
        "operator_notified",
        [{"id": "notice-1", "kind": "notification"}],
    )[0] == "supported"
    assert classify(
        "mitigation_confirmed",
        [{"id": "notice-1", "kind": "notification"}],
    )[0] == "insufficient_evidence"


def test_conflicting_evidence_abstains_and_explicit_contradiction_is_scoped():
    conflict = [
        {"id": "yes", "kind": "notification"},
        {"id": "no", "kind": "contradiction", "claimType": "operator_notified"},
    ]
    assert classify("operator_notified", conflict) == ("insufficient_evidence", ["no", "yes"])
    assert classify("source_detected", conflict) == ("insufficient_evidence", [])


def test_reviewed_benchmark_is_hash_pinned_to_casebook_and_reports_limits():
    rows = load_benchmark()
    report = evaluate_rows(rows)
    assert report["sampleSize"] == 15
    assert report["realExampleCount"] == 9
    assert report["syntheticExampleCount"] == 6
    assert report["falseMitigationConfirmations"] == 0
    assert report["citationCoverage"]["supportedWithCitation"] == report["citationCoverage"]["supportedPredictions"]
    assert "not a generalizable estimate" in report["limitations"][0]


def test_real_mitigation_examples_never_use_report_titles_as_decision_evidence():
    report = evaluate_rows(load_benchmark())
    real_mitigation = [
        prediction for prediction in report["predictions"]
        if not prediction["synthetic"] and prediction["claimType"] == "mitigation_confirmed"
    ]
    assert len(real_mitigation) == 3
    assert all(item["predicted"] == "insufficient_evidence" for item in real_mitigation)
    assert all(not item["citedEvidenceIds"] for item in real_mitigation)
