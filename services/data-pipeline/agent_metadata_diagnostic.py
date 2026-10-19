"""Narrow offline diagnostic of authored claims about supplied archive records.

This is NOT the application's coverage baseline or a physical methane verifier.
The supported grammar is frozen with the challenge; it is intentionally a strong,
transparent comparator for this structured task, not a general document model.
Agent/reference-derived labels never authorize model activation or human claims.
"""
from collections import Counter, defaultdict
from decimal import Decimal
import json
import random
import re
from statistics import mean

LABELS = ("supported", "contradicted", "insufficient_evidence")
BASELINE_VERSION = "archive-record-rules-v1"


def assess_record(row):
    inp = row["input"]
    docs = inp["documents"]
    result = {"claimId": row["claimId"], "verdict": "insufficient_evidence",
              "reason": "The supported record grammar cannot establish this proposition; missing event evidence is not contradiction.",
              "citations": [], "baselineVersion": BASELINE_VERSION, "basis": "document_assessment"}
    if len(docs) != 1:
        return result
    doc = docs[0]
    try:
        record = json.loads(doc["text"])
        obs = record["observation"]
        if record["sourceId"] != inp["sourceId"]:
            return result
        match = re.fullmatch(r"For observation ([A-Za-z0-9_-]+), the supplied archive record lists (source|timestamp|flux) ([^.]+)\.", inp["claimText"])
        # Timestamps have no decimal point; fractional flux is handled below.
        if match is None:
            match = re.fullmatch(r"For observation ([A-Za-z0-9_-]+), the supplied archive record lists (flux) ([0-9]+(?:\.[0-9]+)? kg/h)\.", inp["claimText"])
        if match and match[1] == obs["id"]:
            field, asserted = match[2], match[3]
            if field == "source":
                key, agrees = "sourceId", asserted == record["sourceId"]
            elif field == "timestamp":
                key, agrees = "date", asserted == obs["date"]
            else:
                value = re.fullmatch(r"([0-9]+(?:\.[0-9]+)?) kg/h", asserted)
                if value is None or obs.get("fluxKgHr") is None or obs.get("fluxUnit") != "kg/h":
                    return result
                key, agrees = "fluxKgHr", Decimal(value[1]) == Decimal(str(obs["fluxKgHr"]))
            result["verdict"] = "supported" if agrees else "contradicted"
            result["reason"] = "Explicit equality/conflict in the supplied archive record; no inference about physical truth."
            # Include the observation identity as well as the compared field.
            keys = {"id", key}
            result["citations"] = [{"documentId": doc["id"], "quote": line.strip()}
                                   for line in doc["text"].splitlines()
                                   if any(line.strip().startswith(json.dumps(k) + ":") for k in keys)]
        else:
            result["citations"] = [{"documentId": doc["id"], "quote": line.strip()}
                                   for line in doc["text"].splitlines() if line.strip().startswith('"limits":')]
    except (ValueError, KeyError, TypeError):
        return result
    return result


def _index(rows):
    indexed = {}
    for row in rows:
        key = row["claimId"]
        if key in indexed:
            raise ValueError("Duplicate claim ID")
        if row.get("verdict") is not None and row["verdict"] not in LABELS:
            raise ValueError("Unknown verdict")
        indexed[key] = row
    return indexed


def compare_assessments(reference, predictions, baseline):
    gold, pred, rules = _index(reference), _index(predictions), _index(baseline)
    if not gold or set(gold) != set(pred) or set(gold) != set(rules):
        raise ValueError("Exact nonempty claim sets required")
    if any(g.get("verdict") not in LABELS for g in gold.values()):
        raise ValueError("Invalid reference label")
    confusion = {actual: {p: 0 for p in (*LABELS, "failure")} for actual in LABELS}
    differences = defaultdict(list)
    for cid, g in gold.items():
        verdict = pred[cid].get("verdict")
        confusion[g["verdict"]][verdict or "failure"] += 1
        differences[g["sourceId"]].append(int(verdict == g["verdict"]) - int(rules[cid].get("verdict") == g["verdict"]))
    per_class = {}
    for label in LABELS:
        tp = confusion[label][label]
        fn = sum(confusion[label].values()) - tp
        fp = sum(confusion[other][label] for other in LABELS if other != label)
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        per_class[label] = {"precision": precision, "recall": recall,
                            "f1": 2 * precision * recall / (precision + recall) if precision + recall else 0.0,
                            "support": tp + fn}
    rng, clusters = random.Random(20261018), sorted(differences)
    bootstrap = []
    for _ in range(400):
        sampled = [d for source in rng.choices(clusters, k=len(clusters)) for d in differences[source]]
        bootstrap.append(mean(sampled))
    bootstrap.sort()
    lower, upper = bootstrap[9], bootstrap[389]
    gain = mean([v for values in differences.values() for v in values])
    false_support = sum(1 for cid, g in gold.items() if g["verdict"] != "supported" and pred[cid].get("verdict") == "supported")
    counts = Counter(p.get("verdict") or "failure" for p in pred.values())
    return {"schemaVersion": 1, "referenceKind": "authored_record_oracle_not_human_gold",
            "claimCount": len(gold), "sourceCount": len(clusters), "referenceLabels": dict(Counter(g["verdict"] for g in gold.values())),
            "confusionMatrix": confusion, "perClass": per_class,
            "accuracy": sum(confusion[l][l] for l in LABELS) / len(gold),
            "macroF1": mean(v["f1"] for v in per_class.values()), "falseSupportedCount": false_support,
            "assessmentAbstentionCount": counts["insufficient_evidence"], "failedOrMissingVerdictCount": counts["failure"],
            "pairedAccuracyGain": {"mean": gain, "ci95": [lower, upper], "bootstrapReplicates": 400, "seed": 20261018, "unit": "source"},
            "benefitDecision": "positive_paired_gain" if lower > 0 else "no_demonstrated_gain" if upper <= 0 else "inconclusive_paired_gain",
            "humanResearchGatePassed": False, "providerBenchmarkCompleted": False, "activationEligible": False,
            "limitations": ["Authored record probes and a template-aware comparator; not naturally occurring third-party claims.",
                            "Reference labels come from explicit record comparisons, not independent human adjudication.",
                            "Agent calls are not the configured application's provider or its two-pass inference path."]}
