"""Independent-language conformance scan of the SAME normalized MARS input.

This is not an independently labeled scientific benchmark or an operator allegation.
No network, model, database or chain calls. Never infer zero emissions from missing rows.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


def utc_day(value):
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed.replace(tzinfo=parsed.tzinfo or timezone.utc).astimezone(timezone.utc).date().isoformat()


def corpus_rows(snapshot):
    return sorted([
        {"sourceId": source["sourceId"], "total": len(source["observations"]),
         "missingFlux": sum(row.get("fluxKgHr") is None for row in source["observations"]),
         "over1000": sorted(row["id"] for row in source["observations"] if row.get("fluxKgHr") is not None and row["fluxKgHr"] > 1000)}
        for source in snapshot["sources"]
    ], key=lambda row: row["sourceId"])


def expected_query(records, query, archive_start, archive_end):
    inside = [row for row in records if query["startDate"] <= utc_day(row["date"]) <= query["endDate"]]
    missing = sum(row.get("fluxKgHr") is None for row in inside)
    witnesses = []
    if query["kind"] == "no_linked_detections":
        witnesses = inside
    elif query["kind"] == "reported_flux_at_most":
        witnesses = [row for row in inside if row.get("fluxKgHr") is not None and row["fluxKgHr"] > query["thresholdKgHr"]]
    elif query["kind"] != "physical_mitigation":
        raise ValueError("Unknown query type")
    if query["kind"] == "physical_mitigation":
        status = "requires_document_review"
    elif witnesses:
        status = "counterexample_found"
    elif query["startDate"] < archive_start or query["endDate"] > archive_end:
        status = "incomplete_window"
    elif not inside:
        status = "no_observations"
    elif missing:
        status = "incomplete_flux"
    else:
        status = "no_counterexample_in_archive"
    return {"status": status, "counterexampleIds": [row["id"] for row in sorted(witnesses, key=lambda row: (utc_day(row["date"]), row["id"]))],
            "summary": {"total": len(records), "inWindow": len(inside), "outsideWindow": len(records) - len(inside),
                        "numericFlux": len(inside) - missing, "missingFlux": missing, "counterexamples": len(witnesses)}}


def verify(directory, snapshot_path):
    metadata = json.loads((directory / "verification.json").read_text())
    compressed = snapshot_path.read_bytes()
    if hashlib.sha256(compressed).hexdigest() != metadata["inputFileSha256"]:
        raise ValueError("Normalized input hash mismatch")
    snapshot = json.loads(gzip.decompress(compressed))
    if snapshot["snapshotId"] != metadata["datasetSnapshotId"] or snapshot["provenance"]["archiveSha256"] != metadata["upstreamArchiveSha256"]:
        raise ValueError("Snapshot provenance mismatch")
    corpus = corpus_rows(snapshot)
    commitment = hashlib.sha256(json.dumps(corpus, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()
    if commitment != metadata["corpus"]["canonicalSha256"]:
        raise ValueError("Exhaustive source/record/threshold conformance mismatch")
    by_source = {source["sourceId"]: source["observations"] for source in snapshot["sources"]}
    start, end = snapshot["plumeObservationDateRange"]["start"], snapshot["plumeObservationDateRange"]["end"]
    for item in metadata["examples"]:
        # A generated filename is a basename, never a caller-controlled path outside the proof directory.
        if Path(item["file"]).name != item["file"]:
            raise ValueError("Invalid proof filename")
        report = json.loads((directory / item["file"]).read_text())
        if report["input"]["sourceId"] != item["sourceId"] or report["input"]["query"] != item["query"]:
            raise ValueError("Example context mismatch")
        records = by_source[item["sourceId"]]
        expected = expected_query(records, item["query"], start, end)
        for field, value in expected.items():
            if report[field] != value:
                raise ValueError("Example result mismatch: " + field)
        if report["physicalMitigationEstablished"] is not False or report["input"]["synthetic"] is not False:
            raise ValueError("Invalid scientific scope")
        originals = {row["id"]: row for row in records}
        if len(report["trace"]) != len(originals) or {item["record"]["id"] for item in report["trace"]} != set(originals):
            raise ValueError("Trace coverage mismatch")
        for trace in report["trace"]:
            original = originals[trace["record"]["id"]]
            for field, value in trace["record"].items():
                if value != original.get(field):
                    raise ValueError("Original observation field changed: " + field)
            if trace["utcDay"] != utc_day(original["date"]):
                raise ValueError("UTC day mismatch")
    return {"scope": "Independent-language implementation consistency on the same normalized input; not scientific validation",
            "datasetSnapshotId": metadata["datasetSnapshotId"], "inputFileSha256": metadata["inputFileSha256"],
            "sources": len(corpus), "linkedRecords": sum(row["total"] for row in corpus), "sourceQueries": len(corpus) * 2,
            "corpusCanonicalSha256": commitment, "historicalExamplesVerified": len(metadata["examples"]), "status": "PASS"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    parser.add_argument("--snapshot", type=Path, default=Path(__file__).resolve().parents[2] / "apps/web/public/data/mars-snapshot.json.gz")
    parser.add_argument("--output", type=Path)
    arguments = parser.parse_args()
    result = verify(arguments.directory, arguments.snapshot)
    if arguments.output:
        with arguments.output.open("x") as output:
            json.dump(result, output, indent=2)
            output.write("\n")
    print(json.dumps(result, separators=(",", ":")))
