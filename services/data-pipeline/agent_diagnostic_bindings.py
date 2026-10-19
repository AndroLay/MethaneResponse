"""Check that offline grounding rows actually replay the supplied agent rows."""
import hashlib
import json


def assessment_hashes(inp):
    claim = inp['claimText']
    # The application parses and trims claims before hashing. Frozen diagnostic
    # inputs already have that parsed form; reject ambiguity instead of guessing.
    if claim != claim.strip() or claim.startswith('\ufeff') or claim.endswith('\ufeff'):
        raise ValueError('Expected a parsed, trimmed claim')
    payload = {'sourceId': inp['sourceId'], 'claimType': inp['claimType'], 'claimText': claim,
               'documents': [{k: d[k] for k in ('id', 'title', 'text')} for d in inp['documents']]}
    encoded = json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(',', ':'), allow_nan=False).encode()
    return {'claimTextSha256': hashlib.sha256(claim.encode()).hexdigest(),
            'assessmentInputSha256': hashlib.sha256(encoded).hexdigest()}


def validate_grounding_binding(inputs, raw, grounded):
    def index(rows):
        result = {}
        for row in rows:
            if row['claimId'] in result:
                raise ValueError('Duplicate grounding claim')
            result[row['claimId']] = row
        return result
    inp, proposals, checked = index(inputs), index(raw), index(grounded)
    if not inp or set(inp) != set(proposals) or set(inp) != set(checked):
        raise ValueError('Raw/grounded claim sets differ')
    for cid, row in inp.items():
        p, g = proposals[cid], checked[cid]
        for field, expected in assessment_hashes(row['input']).items():
            if g.get(field) != expected:
                raise ValueError('Grounding hashes do not match the frozen input')
        documents = {d['id']: d['text'] for d in row['input']['documents']}
        exact = [q for q in p['citations'] if q['documentId'] in documents and q['quote'] in documents[q['documentId']]]
        rejected = len(p['citations']) - len(exact)
        verdict = 'insufficient_evidence' if rejected or not exact else p['verdict']
        if (g['proposedVerdict'] != p['verdict'] or g['verdict'] != verdict
                or g['citations'] != exact or g['citationValidationFailures'] != rejected
                or g['proposedCitationCount'] != len(p['citations'])):
            raise ValueError('Grounded output does not replay the raw proposal')
