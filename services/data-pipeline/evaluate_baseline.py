"""Evaluate the deterministic evidence-coverage rules on a small reviewed set.

This is a conformance check against annotations derived from the pinned casebook,
not an independent or generalizable estimate of real-world audit accuracy.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
DEFAULT_BENCHMARK = ROOT / "data" / "mars_claim_benchmark.jsonl"
DEFAULT_CASEBOOK = ROOT.parent.parent / "data" / "real" / "mars_casebook_2026-10-11.json"
LABELS = ("supported", "insufficient_evidence", "contradicted")
SUPPORT_KIND = {
    "source_detected": "detection",
    "operator_notified": "notification",
    "mitigation_confirmed": "mitigation_confirmation",
}


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for line_number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not raw.strip():
            continue
        try:
            row = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSON at {path}:{line_number}: {exc}") from exc
        if not isinstance(row, dict):
            raise ValueError(f"Expected an object at {path}:{line_number}")
        rows.append(row)
    return rows


def evidence_for_real_case(case: dict[str, Any]) -> list[dict[str, Any]]:
    source_id = case["sourceId"]
    evidence = [
        {"id": plume["plumeId"], "kind": "detection"}
        for plume in case["plumes"]
    ]
    if str(case["source"]["notified"]).strip().lower() == "yes":
        evidence.append({"id": f"{source_id}:notification-status", "kind": "notification"})
    # A linked report title is deliberately not treated as reviewed evidence.
    return evidence


def load_benchmark(
    benchmark_path: Path = DEFAULT_BENCHMARK,
    casebook_path: Path = DEFAULT_CASEBOOK,
) -> list[dict[str, Any]]:
    casebook = json.loads(casebook_path.read_text(encoding="utf-8"))
    cases_by_source = {case["sourceId"]: case for case in casebook["cases"]}
    rows = read_jsonl(benchmark_path)
    seen: set[str] = set()

    for row in rows:
        required = {"id", "sourceId", "claimType", "expected", "synthetic", "rationale"}
        missing = required - row.keys()
        if missing:
            raise ValueError(f"Benchmark row is missing fields: {', '.join(sorted(missing))}")
        if row["id"] in seen:
            raise ValueError(f"Duplicate benchmark ID: {row['id']}")
        seen.add(row["id"])
        if row["claimType"] not in SUPPORT_KIND:
            raise ValueError(f"Unsupported claim type in row {row['id']}")
        if row["expected"] not in LABELS:
            raise ValueError(f"Unsupported expected label in row {row['id']}")

        if row["synthetic"] is False:
            case = cases_by_source.get(row["sourceId"])
            if case is None or case["caseId"] != row.get("caseId"):
                raise ValueError(f"Row {row['id']} does not resolve to its pinned real case")
            row["evidence"] = evidence_for_real_case(case)
        elif row["synthetic"] is True:
            if not isinstance(row.get("evidence"), list):
                raise ValueError(f"Synthetic row {row['id']} must include explicit fixture evidence")
        else:
            raise ValueError(f"Row {row['id']} must declare a boolean synthetic flag")
    return rows


def classify(claim_type: str, evidence: list[dict[str, Any]]) -> tuple[str, list[str]]:
    if claim_type not in SUPPORT_KIND:
        raise ValueError(f"Unsupported claim type: {claim_type}")
    contradictions = [
        item for item in evidence
        if item.get("kind") == "contradiction" and item.get("claimType") == claim_type
    ]
    supporting = [item for item in evidence if item.get("kind") == SUPPORT_KIND[claim_type]]
    citations = sorted({str(item["id"]) for item in contradictions + supporting if item.get("id")})
    if contradictions and supporting:
        return "insufficient_evidence", citations
    if contradictions:
        return "contradicted", citations
    if supporting:
        return "supported", citations
    return "insufficient_evidence", []


def _rounded(value: float) -> float:
    return round(value, 4)


def summarize(rows: list[dict[str, Any]]) -> dict[str, Any]:
    per_label: dict[str, dict[str, float | int]] = {}
    f1_values: list[float] = []
    for label in LABELS:
        tp = sum(row["predicted"] == label and row["expected"] == label for row in rows)
        fp = sum(row["predicted"] == label and row["expected"] != label for row in rows)
        fn = sum(row["predicted"] != label and row["expected"] == label for row in rows)
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        per_label[label] = {
            "precision": _rounded(precision),
            "recall": _rounded(recall),
            "f1": _rounded(f1),
            "support": int(tp + fn),
        }
        f1_values.append(f1)

    supported = [row for row in rows if row["predicted"] == "supported"]
    cited_supported = [row for row in supported if row["citedEvidenceIds"]]
    false_mitigation = sum(
        row["claimType"] == "mitigation_confirmed"
        and row["predicted"] == "supported"
        and row["expected"] != "supported"
        for row in rows
    )
    return {
        "sampleSize": len(rows),
        "macroF1": _rounded(sum(f1_values) / len(LABELS)),
        "perLabel": per_label,
        "falseMitigationConfirmations": int(false_mitigation),
        "citationCoverage": {
            "supportedPredictions": len(supported),
            "supportedWithCitation": len(cited_supported),
            "ratio": _rounded(len(cited_supported) / len(supported)) if supported else 0.0,
        },
    }


def evaluate_rows(rows: list[dict[str, Any]], casebook_path: Path = DEFAULT_CASEBOOK) -> dict[str, Any]:
    predictions = []
    for row in rows:
        predicted, citations = classify(row["claimType"], row["evidence"])
        predictions.append({
            "id": row["id"],
            "caseId": row.get("caseId"),
            "sourceId": row["sourceId"],
            "claimType": row["claimType"],
            "expected": row["expected"],
            "predicted": predicted,
            "citedEvidenceIds": citations,
            "synthetic": row["synthetic"],
            "rationale": row["rationale"],
        })

    real = [row for row in predictions if not row["synthetic"]]
    synthetic = [row for row in predictions if row["synthetic"]]
    summary = summarize(predictions)
    return {
        "method": "deterministic evidence coverage rules",
        "casebookArchiveSha256": json.loads(casebook_path.read_text(encoding="utf-8"))["provenance"]["archiveSha256"],
        "sampleSize": summary["sampleSize"],
        "realExampleCount": len(real),
        "syntheticExampleCount": len(synthetic),
        "macroF1": summary["macroF1"],
        "perLabel": summary["perLabel"],
        "falseMitigationConfirmations": summary["falseMitigationConfirmations"],
        "citationCoverage": summary["citationCoverage"],
        "subsets": {"realCasebook": summarize(real), "syntheticFixtures": summarize(synthetic)},
        "limitations": [
            "This small, casebook-derived conformance set is not a generalizable estimate of real-world performance.",
            "Expected labels encode the stated evidence policy for three MARS sources and synthetic rule fixtures; they do not independently establish physical methane outcomes.",
            "The three real mitigation examples abstain because linked report content was not included or independently reviewed.",
        ],
        "predictions": predictions,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--benchmark", type=Path, default=DEFAULT_BENCHMARK)
    parser.add_argument("--casebook", type=Path, default=DEFAULT_CASEBOOK)
    parser.add_argument("--output", type=Path, help="Write the JSON report to this path instead of stdout")
    args = parser.parse_args()
    report = evaluate_rows(load_benchmark(args.benchmark, args.casebook), args.casebook)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print(f"wrote {args.output}")
    else:
        print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
