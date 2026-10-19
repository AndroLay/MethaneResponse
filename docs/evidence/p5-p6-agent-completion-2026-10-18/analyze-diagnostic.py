"""Recompute the offline agent diagnostic without granting a research gate.

All quotes are first replayed through scripts/verify-agent-diagnostic.ts. Public
inputs here contain only licensed metadata and visibly authored DEMO probes.
"""
from collections import Counter
import hashlib
import json
from pathlib import Path
import sys

PACKET = Path(__file__).resolve().parent
ROOT = PACKET.parents[2]
sys.path.insert(0, str(ROOT / 'services/data-pipeline'))
from agent_metadata_diagnostic import compare_assessments
from agent_diagnostic_bindings import validate_grounding_binding
from evaluate_evidence_ai import _source_cluster_bootstrap


def read(name):
    return json.loads((PACKET / name).read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    freeze = read('diagnostic-freeze.json')
    for name, digest in freeze['materialsSha256'].items():
        if sha(PACKET / name) != digest:
            raise ValueError('Frozen material changed')
    if sha(ROOT / 'services/data-pipeline/agent_metadata_diagnostic.py') != freeze['baselineSha256']:
        raise ValueError('Frozen baseline changed')
    method = read('diagnostic-assessment-method.json')
    if sha(PACKET / method['promptFile']) != method['promptSha256']:
        raise ValueError('Assessment instructions changed')
    inputs = [r for r in read('diagnostic-inputs.json') if r['split'] == 'test']
    if inputs != read('diagnostic-test-inputs.json'):
        raise ValueError('Derived test inputs changed')
    gold = [r for r in read('diagnostic-reference.json') if r['split'] == 'test']
    rule_rows = read('diagnostic-rules-grounded.json')
    validate_grounding_binding(inputs, read('diagnostic-rules.json'), rule_rows)
    by_id = {r['claimId']: r for r in inputs}
    baseline = {r['claimId']: r for r in rule_rows}
    reports, agent_rows = {}, []
    for number in (1, 2):
        name = f'diagnostic-agent-{number}-grounded.json'
        predictions = read(name)
        validate_grounding_binding(inputs, read(f'diagnostic-agent-{number}.json'), predictions)
        for pred in predictions:
            original = baseline[pred['claimId']]
            for field in ('claimTextSha256', 'assessmentInputSha256'):
                if pred[field] != original[field]:
                    raise ValueError('Paired input hash mismatch')
        report = compare_assessments(gold, predictions, rule_rows)
        records, rule_records = [], []
        for ref in gold:
            cid = ref['claimId']
            proposed = next(p for p in predictions if p['claimId'] == cid)
            for destination, p in ((records, proposed), (rule_records, baseline[cid])):
                destination.append({'sourceId': ref['sourceId'], 'expected': ref['verdict'], 'predicted': p['verdict'],
                                    'claimType': by_id[cid]['input']['claimType'],
                                    'citedEvidenceIds': [q['documentId'] for q in p['citations']],
                                    'citationsSupplied': p['proposedCitationCount'],
                                    'citationsVerified': len(p['citations'])})
        bootstrap = _source_cluster_bootstrap(records, replicates=400, seed=20261018, baseline_records=rule_records)
        # Here 'verified' only means exact substrings, not semantic adjudication.
        if bootstrap['confidenceIntervals95']:
            bootstrap['confidenceIntervals95']['exactQuotationMatchRate'] = bootstrap['confidenceIntervals95'].pop('citationPrecision')
        report['sourceClusterIntervals'] = bootstrap
        supplied = sum(p['proposedCitationCount'] for p in predictions)
        rejected = sum(p['citationValidationFailures'] for p in predictions)
        report['quotations'] = {'proposed': supplied, 'exactMatches': supplied - rejected, 'rejected': rejected,
                                'exactMatchRate': (supplied - rejected) / supplied if supplied else None,
                                'semanticCitationPrecision': None}
        report['falseMitigationConfirmations'] = sum(r['claimType'] == 'mitigation_confirmed' and r['predicted'] == 'supported' and r['expected'] != 'supported' for r in records)
        report['operations'] = {'configuredAppProviderCalls': 0, 'agentAssessmentRuns': 1,
                                'perClaimLatencyMs': None, 'billedCostUsd': None, 'costAvailability': 'not_exposed'}
        reports[f'agent-{number}'] = report
        agent_rows.append({r['claimId']: r['verdict'] for r in predictions})
    left, right = agent_rows
    agreement = sum(left[cid] == right[cid] for cid in left) / len(left)
    lc, rc = Counter(left.values()), Counter(right.values())
    expected = sum(lc[label] * rc[label] for label in set(lc) | set(rc)) / len(left) ** 2
    disputes = [cid for cid in sorted(left) if left[cid] != right[cid]]
    result = {'schemaVersion': 1, 'scope': 'DEMO authored archive-record diagnostic; separate agent contexts, same model family',
              'referenceKind': 'authored_record_oracle_not_human_gold', 'reports': reports,
              'agentAgreement': {'claimCount': len(left), 'rawAgreement': agreement,
                                 'cohenKappa': (agreement - expected) / (1 - expected) if expected < 1 else None,
                                 'disputedClaimIds': disputes, 'humanAdjudications': 0,
                                 'meaning': 'Agreement of correlated agents does not establish truth or human agreement.'},
              'decision': 'retain_rules_for_this_structured_task; no demonstrated AI gain',
              'humanResearchGatePassed': False, 'providerBenchmarkCompleted': False, 'activationEligible': False,
              'inputSha256': sha(PACKET / 'diagnostic-inputs.json'),
              'bindingReplay': {'checkedAssessmentCount': len(inputs) * 3,
                                'inputDigestsRecomputed': True, 'rawToGroundedReplayed': True,
                                'helperSha256': sha(ROOT / 'services/data-pipeline/agent_diagnostic_bindings.py')},
              'assessmentArtifactsSha256': {name: sha(PACKET / name) for name in (
                  'p6-agent-instructions.md', 'diagnostic-assessment-method.json',
                  'diagnostic-agent-1.json', 'diagnostic-agent-2.json',
                  'diagnostic-agent-1-grounded.json', 'diagnostic-agent-2-grounded.json',
                  'diagnostic-rules.json', 'diagnostic-rules-grounded.json')},
              'reasonQualityScored': False,
              'limitations': ['Source disjointness is internal to this challenge; no statement about model pretraining exposure.',
                             'The rule grammar and authored templates are known before test execution; country/source separation does not remove template bias.',
                             'Only metadata was evaluated; event receipts, repair reports and follow-up measurement interpretation were not tested.',
                             'Both agents use the same model family and can share systematic errors.',
                             'Verdict metrics do not score rationale quality; raw reasons are retained for qualitative review.']}
    output = PACKET / 'diagnostic-analysis.json'
    with output.open('x') as out:
        out.write(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'claimsPerAgent': len(left), 'disputes': len(disputes), 'activationEligible': False}))


if __name__ == '__main__':
    main()
