"""Freeze authored DEMO probes about real licensed archive metadata, locally.

No third-party report bodies, secrets, web calls or provider execution. Existing
outputs are refused. These probes do not satisfy the original real-claim corpus.
"""
from datetime import datetime, timedelta, timezone
import gzip
import hashlib
import json
from pathlib import Path
import sys

PACKET = Path(__file__).resolve().parent
ROOT = PACKET.parents[2]
sys.path.insert(0, str(ROOT / 'services/data-pipeline'))
from agent_metadata_diagnostic import assess_record


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    names = ['diagnostic-inputs.json', 'diagnostic-reference.json', 'diagnostic-rules.json',
             'diagnostic-agent-pack.json', 'diagnostic-freeze.json']
    if any((PACKET / name).exists() for name in names):
        raise ValueError('Refusing to replace frozen diagnostic')
    asset = ROOT / 'apps/web/public/data/mars-snapshot.json.gz'
    snapshot = json.loads(gzip.decompress(asset.read_bytes()))
    excluded = {'KAZ_S_159', 'LBY_S_143', 'ARG_S_055', 'CAN_S_002'}
    countries, selected = set(), []
    for source in sorted(snapshot['sources'], key=lambda item: item['sourceId']):
        if source['sourceId'] in excluded or source.get('synthetic') or source.get('country') in countries:
            continue
        observations = [o for o in source.get('observations', []) if o.get('fluxKgHr') is not None
                        and o.get('date') and o.get('sourceId') == source['sourceId'] and not o.get('synthetic')]
        if not observations:
            continue
        countries.add(source.get('country'))
        selected.append((source, sorted(observations, key=lambda item: (item['date'], item['id']))[-1]))
        if len(selected) == 16:
            break
    if len(selected) != 16:
        raise ValueError('Insufficient distinct-country records')
    rows, references, documents, agent_claims = [], [], [], []
    for i, (source, observation) in enumerate(selected):
        split = 'train' if i < 2 else 'dev' if i < 4 else 'test'
        sid, oid = source['sourceId'], observation['id']
        record = {'dataset': snapshot['dataset'], 'snapshotId': snapshot['snapshotId'],
                  'sourceId': sid, 'country': source['country'],
                  'observation': {k: observation[k] for k in ('id', 'sourceId', 'date', 'fluxKgHr', 'uncertaintyKgHr', 'fluxUnit', 'satellite')},
                  'sourceNotifiedFlag': source.get('notified'), 'sourceFeedbackFlag': source.get('feedback'),
                  'limits': 'Historical metadata only; no report body, recipient-specific event receipt, repair record or post-action measurement series is included in this excerpt.'}
        doc = {'id': f'record-{sid}', 'title': f'MARS archive metadata excerpt {sid}',
               'text': json.dumps(record, indent=2, ensure_ascii=False),
               'rightsDeclared': 'open_license', 'sourceUrl': snapshot['provenance']['catalogUrl'],
               'licenseName': 'CC BY-NC-SA 4.0', 'licenseUrl': 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
               'attribution': 'UNEP IMEO: MARS. Selection and formatting of historical archive metadata for a noncommercial authored challenge.',
               'licenseScopeConfirmed': True}
        wrong_date = (datetime.fromisoformat(observation['date']) + timedelta(days=1)).isoformat()
        flux = f"{observation['fluxKgHr']:g}"
        wrong_flux = f"{observation['fluxKgHr'] + 100:g}"
        probes = [
            ('source_detected', f'For observation {oid}, the supplied archive record lists source {sid}.', 'supported'),
            ('source_detected', f'For observation {oid}, the supplied archive record lists flux {flux} kg/h.', 'supported'),
            ('source_detected', f'For observation {oid}, the supplied archive record lists timestamp {wrong_date}.', 'contradicted'),
            ('source_detected', f'For observation {oid}, the supplied archive record lists flux {wrong_flux} kg/h.', 'contradicted'),
            ('operator_notified', f'The operator of {sid} received a recipient-specific notification about observation {oid} before its observation timestamp.', 'insufficient_evidence'),
            ('mitigation_confirmed', f'Physical repair of {sid} after observation {oid} was confirmed by post-action methane measurements.', 'insufficient_evidence'),
        ]
        if split == 'test':
            documents.append(doc)
        for j, (claim_type, text, verdict) in enumerate(probes):
            cid = f'{sid}-probe-{j+1}'
            inp = {'sourceId': sid, 'claimType': claim_type, 'claimText': text,
                   'consentToExternalProcessing': True, 'consentToPublishCitations': False,
                   'consentToPublishClaim': False, 'documents': [doc]}
            row = {'claimId': cid, 'sourceId': sid, 'split': split, 'synthetic': True,
                   'underlyingMetadataSynthetic': False, 'claimOrigin': 'DEMO authored challenge; not a publisher assertion', 'input': inp}
            rows.append(row)
            references.append({'claimId': cid, 'sourceId': sid, 'split': split, 'verdict': verdict,
                               'basis': 'explicit record equality/conflict or absent event evidence; authored reference, not human gold'})
            if split == 'test':
                agent_claims.append({'claimId': cid, 'sourceId': sid, 'claimType': claim_type, 'claimText': text, 'documentIds': [doc['id']]})
    baseline = [assess_record(row) for row in rows if row['split'] == 'test']
    pack = {'scope': 'DEMO authored claims about supplied real historical metadata; document support is not physical verification',
            'documents': documents, 'claims': agent_claims}
    outputs = {'diagnostic-inputs.json': rows, 'diagnostic-reference.json': references,
               'diagnostic-rules.json': baseline, 'diagnostic-agent-pack.json': pack}
    encoded = {name: (json.dumps(value, indent=2, ensure_ascii=False) + '\n').encode() for name, value in outputs.items()}
    freeze = {'schemaVersion': 1, 'frozenAt': datetime.now(timezone.utc).isoformat(),
              'scope': 'DEMO authored diagnostic; NOT original real-claim/provider/human P6 benchmark',
              'snapshotSha256': sha(asset.read_bytes()), 'snapshotProvenance': snapshot['provenance'],
              'excludedPilotSources': sorted(excluded), 'selection': 'First eligible distinct countries by sorted sourceId; latest quantified linked record per source.',
              'partitions': {s: {'sources': sorted({r['sourceId'] for r in rows if r['split'] == s}),
                                  'documentIds': sorted({d['id'] for r in rows if r['split'] == s for d in r['input']['documents']}),
                                  'claims': sum(r['split'] == s for r in rows)} for s in ['train', 'dev', 'test']},
              'materialsSha256': {name: sha(data) for name, data in encoded.items()},
              'baselineSha256': sha((ROOT / 'services/data-pipeline/agent_metadata_diagnostic.py').read_bytes()),
              'generatorSha256': sha(Path(__file__).read_bytes()),
              'agentPromptVersion': 'archive-agent-diagnostic-v1', 'model': 'gpt-6-luna', 'reasoningEffort': 'max',
              'scoring': 'exact claim sets; three classes; source-cluster paired accuracy bootstrap400 seed20261018; app exact-quote verifier',
              'timing': 'whole agent elapsed only; per-claim latency and billed cost unavailable',
              'humanResearchGatePassed': False, 'providerBenchmarkCompleted': False, 'activationEligible': False}
    encoded['diagnostic-freeze.json'] = (json.dumps(freeze, indent=2) + '\n').encode()
    for name, data in encoded.items():
        with (PACKET / name).open('xb') as out:
            out.write(data)
    private = Path('/tmp/methane-p56-completion/diagnostic-agent-pack.json')
    with private.open('xb') as out:
        out.write(encoded['diagnostic-agent-pack.json'])
    private.chmod(0o600)
    print(json.dumps({'claims': len(rows), 'testClaims': len(agent_claims), 'sources': len(documents), 'agentPackSha256': sha(encoded['diagnostic-agent-pack.json'])}))


if __name__ == '__main__':
    main()
