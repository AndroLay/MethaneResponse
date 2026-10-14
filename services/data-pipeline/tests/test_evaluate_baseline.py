import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from evaluate_baseline import DEFAULT_BENCHMARK, DEFAULT_CASEBOOK, classify, evaluate_rows, load_benchmark  # noqa: E402


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
    assert DEFAULT_CASEBOOK.name == "mars_casebook_2026-10-14.json"
    assert report["casebookArchiveSha256"] == "675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43"
    assert report["inputProvenance"] == {
        "benchmarkSha256": "6cfa7c19ec47d994e937a5ec6a8d3cc82d8c03b0e11f1ce2a63df379cc762cb8",
        "casebookFileSha256": "5010594d9de903ae38904e05e2a137c8701c4ded9fcc3ef433d322ec860dda94",
        "datasetName": "Eye on Methane / MARS detected sources and plumes",
        "datasetProvider": "UNEP International Methane Emissions Observatory (IMEO)",
        "datasetSnapshotId": "unep-mars-675417694883",
        "datasetArchiveSha256": "675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43",
        "datasetRetrievedAt": "2026-10-14T06:10:12+00:00",
        "datasetCatalogUrl": "https://methanedata.unep.org/download-dataset",
        "datasetLicense": "CC BY-NC-SA 4.0",
    }
    assert DEFAULT_BENCHMARK.name == "mars_claim_benchmark.jsonl"
    canonical_report = DEFAULT_BENCHMARK.parent.parent / "reports" / "baseline-evaluation.json"
    assert canonical_report.read_text(encoding="utf-8") == json.dumps(report, indent=2) + "\n"
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


def test_source_level_notified_metadata_does_not_support_operator_notification():
    report = evaluate_rows(load_benchmark())
    real_notifications = [
        prediction for prediction in report["predictions"]
        if not prediction["synthetic"] and prediction["claimType"] == "operator_notified"
    ]
    assert len(real_notifications) == 3
    assert all(item["predicted"] == "insufficient_evidence" for item in real_notifications)
    assert all(not item["citedEvidenceIds"] for item in real_notifications)
