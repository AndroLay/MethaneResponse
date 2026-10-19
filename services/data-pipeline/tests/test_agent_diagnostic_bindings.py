"""Integrity replay checks for the dated agent evidence analyzer."""
from pathlib import Path
import copy
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from agent_diagnostic_bindings import assessment_hashes, validate_grounding_binding


def data():
    quote = {'documentId': 'd1', 'quote': 'Explicit record.'}
    inp = {'sourceId': 'S_1', 'claimType': 'source_detected', 'claimText': 'The explicit record lists source S_1.',
           'documents': [{'id': 'd1', 'title': 'Record', 'text': 'Explicit record.'}]}
    return ([{'claimId': 'c1', 'input': inp}],
            [{'claimId': 'c1', 'verdict': 'supported', 'citations': [quote]}],
            [{'claimId': 'c1', 'proposedVerdict': 'supported', 'verdict': 'supported', 'citations': [quote],
              'citationValidationFailures': 0, 'proposedCitationCount': 1, **assessment_hashes(inp)}])


def test_exact_raw_grounding_replay():
    validate_grounding_binding(*data())


@pytest.mark.parametrize('field,value', [('verdict', 'contradicted'), ('citations', []),
                                       ('proposedCitationCount', 2), ('citationValidationFailures', 1)])
def test_grounding_tampering_is_rejected(field, value):
    inputs, raw, grounded = copy.deepcopy(data())
    grounded[0][field] = value
    with pytest.raises(ValueError):
        validate_grounding_binding(inputs, raw, grounded)


def test_raw_output_and_duplicate_changes_are_rejected():
    inputs, raw, grounded = copy.deepcopy(data())
    raw[0]['citations'][0]['quote'] = 'Nonexistent quotation'
    with pytest.raises(ValueError):
        validate_grounding_binding(inputs, raw, grounded)
    with pytest.raises(ValueError):
        validate_grounding_binding(inputs, raw * 2, grounded)


@pytest.mark.parametrize('field', ['claimTextSha256', 'assessmentInputSha256'])
def test_forged_shared_hashes_are_rejected(field):
    inputs, raw, grounded = copy.deepcopy(data())
    grounded[0][field] = '0' * 64
    with pytest.raises(ValueError, match='frozen input'):
        validate_grounding_binding(inputs, raw, grounded)


def test_rejects_unparsed_claims():
    inputs, raw, grounded = copy.deepcopy(data())
    inputs[0]['input']['claimText'] = ' ' + inputs[0]['input']['claimText']
    with pytest.raises(ValueError, match='trimmed claim'):
        validate_grounding_binding(inputs, raw, grounded)
