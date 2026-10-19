import datetime as dt
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path('/tmp/methane-value-manual')

def canonical_hash(value):
    raw = json.dumps(value, ensure_ascii=False, separators=(',', ':'), sort_keys=True).encode('utf-8')
    return '0x' + hashlib.sha256(raw).hexdigest()

def utc_day(value):
    if not isinstance(value, str):
        return None
    # MARS timestamps without a zone are UTC; dates are strict ISO calendar dates.
    try:
        if re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
            return dt.date.fromisoformat(value).isoformat()
        parsed = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=dt.timezone.utc)
        return parsed.astimezone(dt.timezone.utc).date().isoformat()
    except ValueError:
        return None

def secure_reference(value):
    if not isinstance(value, str) or value != value.strip() or len(value) > 2000 or not value.startswith('https://'):
        return False
    try:
        parsed = urlsplit(value)
        return parsed.scheme == 'https' and bool(parsed.hostname) and parsed.username is None and parsed.password is None
    except ValueError:
        return False

print('COVERAGE')
kind_for = {'source_detected': 'detection', 'operator_notified': 'notification', 'mitigation_confirmed': 'mitigation_confirmation'}
for task in json.load(open(ROOT/'coverage-inputs.json')):
    req, source = task['request'], task['source']
    claim, scope = req['claimType'], req['scope']
    found = []
    for e in source.get('evidence', []):
        required = kind_for[claim]
        relevant = (e.get('kind') == required and (not e.get('claimType') or e.get('claimType') == claim)) or (e.get('kind') == 'contradiction' and e.get('claimType') == claim)
        day = utc_day(e.get('date'))
        eligible = relevant and day is not None and secure_reference(e.get('reference'))
        eligible = eligible and scope['startDate'] <= day <= scope['endDate']
        if scope.get('observationId'):
            observation = e.get('observationId') or (e.get('id') if e.get('kind') == 'detection' else None)
            eligible = eligible and observation == scope['observationId']
        if claim == 'operator_notified':
            eligible = eligible and bool(scope.get('recipient', '').strip()) and e.get('recipient', '').strip().lower() == scope['recipient'].strip().lower()
        if e.get('kind') == 'mitigation_confirmation':
            follow = utc_day(e.get('followUpDate'))
            eligible = eligible and bool(e.get('action', '').strip()) and secure_reference(e.get('followUpReference')) and follow is not None and day <= follow <= scope['endDate']
        if eligible:
            found.append(e['id'])
    found.sort()
    result = 'contradicted' if found and any(e.get('kind') == 'contradiction' and e.get('id') in found for e in source.get('evidence', [])) else ('supported' if found else 'insufficient_evidence')
    print(json.dumps({'id':task['id'],'result':result,'evidenceIds':found,'physicalMitigationEstablished':False},ensure_ascii=False))

print('INTEGRITY')
for path in sorted((ROOT/'integrity').glob('*.json')):
    report = json.load(open(path))
    if isinstance(report.get('latestAudit'), dict):
        audit = report['latestAudit']
        bundle = audit.get('bundle') or {}
        digest_match = canonical_hash(bundle) == audit.get('bundleHash')
        repeated = ('auditId','caseId','revision','generatedAt','sourceId','claimType','result','reason')
        summary_match = all(audit.get(k) == bundle.get(k) for k in repeated)
        summary_match = summary_match and audit.get('evidenceIds') == [e.get('id') for e in bundle.get('citedEvidence', [])]
        context_match = False
        if isinstance(report.get('exportIntegrity'), dict):
            context_payload = {k:v for k,v in report.items() if k != 'exportIntegrity'}
            context_match = canonical_hash(context_payload) == report['exportIntegrity'].get('sha256')
    else:
        bundle = report.get('bundle') or {}
        digest_match = canonical_hash(bundle) == report.get('bundleHash')
        repeated = ('auditId','caseId','revision','generatedAt','sourceId','claimType','result','reason')
        summary_match = all(report.get(k) == bundle.get(k) for k in repeated)
        summary_match = summary_match and report.get('evidenceIds') == [e.get('id') for e in bundle.get('citedEvidence', [])]
        # Strict complete-context validation requires an export context checksum.
        context_match = False
    print(json.dumps({'id':path.stem,'bundleDigestMatches':digest_match,'summaryMatches':summary_match,'exportContextMatches':context_match,'localDigest':bool(digest_match and summary_match and context_match),'authenticityEstablished':False}))

print('LINEAGE')
lineage=json.load(open(ROOT/'lineage.json'))
before, after=lineage['before'], lineage['after']
old_ok=canonical_hash(before['bundle'])==before['bundleHash']
new_ok=canonical_hash(after['bundle'])==after['bundleHash']
parent_ok=after['bundle'].get('humanAssessment',{}).get('parentBundleHash')==before['bundleHash']
reason_changed=before['reason'] != after['reason']
print(json.dumps({'oldBundleDigestMatches':old_ok,'newBundleDigestMatches':new_ok,'parentMatches':parent_ok,'reasonChanged':reason_changed,'oldVersionPreserved':bool(old_ok and before['revision'] < after['revision'])}))

print('UTC')
events=json.load(open(ROOT/'utc.json'))['events']
days=sorted(day for event in events if (day:=utc_day(event.get('date'))) is not None)
print(json.dumps({'validDays':days,'startDate':days[0] if days else None,'endDate':days[-1] if days else None,'count':len(days)}))
