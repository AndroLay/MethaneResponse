"""This diagnostic must never be promoted to independent human evidence."""
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from agent_metadata_diagnostic import assess_record, compare_assessments


def row(claim):
    return {"claimId": "c1", "sourceId": "S_1", "input": {
        "sourceId": "S_1", "claimText": claim, "documents": [{"id": "doc-S_1", "text": json.dumps({
            "sourceId": "S_1", "observation": {"id": "obs-1", "date": "2026-01-02T03:04:05", "fluxKgHr": 123.0, "fluxUnit": "kg/h"},
            "limits": "Historical metadata; no report body or event-level receipt is included."
        }, indent=2)}]}}


@pytest.mark.parametrize("claim,expected", [
    ("For observation obs-1, the supplied archive record lists source S_1.", "supported"),
    ("For observation obs-1, the supplied archive record lists source S_2.", "contradicted"),
    ("For observation obs-1, the supplied archive record lists timestamp 2026-01-02T03:04:05.", "supported"),
    ("For observation obs-1, the supplied archive record lists timestamp 2026-01-03T03:04:05.", "contradicted"),
    ("For observation obs-1, the supplied archive record lists flux 123 kg/h.", "supported"),
    ("For observation obs-1, the supplied archive record lists flux 124 kg/h.", "contradicted"),
    ("For observation missing, the supplied archive record lists flux 123 kg/h.", "insufficient_evidence"),
    ("The operator received an event-specific notification.", "insufficient_evidence"),
    ("This source was physically repaired and follow-up measurements confirmed methane reduction.", "insufficient_evidence"),
])
def test_record_rules(claim, expected):
    result = assess_record(row(claim))
    assert result["verdict"] == expected
    assert all(q["quote"] in row(claim)["input"]["documents"][0]["text"] for q in result["citations"])


def test_unsupported_document_format_abstains():
    item = row("For observation obs-1, the supplied archive record lists flux 123 kg/h.")
    item["input"]["documents"][0]["text"] = "Unstructured text about a methane source."
    assert assess_record(item)["verdict"] == "insufficient_evidence"


def test_missing_and_duplicate_predictions_are_errors():
    gold = [{"claimId": "c1", "sourceId": "S_1", "verdict": "supported"}]
    with pytest.raises(ValueError):
        compare_assessments(gold, [], [])
    with pytest.raises(ValueError):
        compare_assessments(gold, [{"claimId": "c1", "verdict": "supported"}] * 2, [])


def test_diagnostic_never_opens_human_or_activation_gate():
    gold = [{"claimId": "c1", "sourceId": "S_1", "verdict": "supported"}]
    predictions = [{"claimId": "c1", "verdict": "supported"}]
    report = compare_assessments(gold, predictions, predictions)
    assert report["accuracy"] == 1
    assert report["humanResearchGatePassed"] is False
    assert report["providerBenchmarkCompleted"] is False
    assert report["activationEligible"] is False
    assert report["pairedAccuracyGain"]["ci95"] == [0, 0]
    assert report["benefitDecision"] == "no_demonstrated_gain"


def test_failure_and_false_support_remain_in_denominator():
    gold = [{"claimId": "c1", "sourceId": "S_1", "verdict": "contradicted"},
            {"claimId": "c2", "sourceId": "S_2", "verdict": "insufficient_evidence"}]
    predictions = [{"claimId": "c1", "verdict": "supported"}, {"claimId": "c2", "verdict": None}]
    baseline = [{"claimId": g["claimId"], "verdict": g["verdict"]} for g in gold]
    report = compare_assessments(gold, predictions, baseline)
    assert report["accuracy"] == 0
    assert report["falseSupportedCount"] == 1
    assert report["failedOrMissingVerdictCount"] == 1
    assert report["claimCount"] == 2
