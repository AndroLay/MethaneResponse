import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
try:
    import casebook  # noqa: E402
except ModuleNotFoundError:
    casebook = None


def sample_snapshot():
    return {
        'schemaVersion': 1,
        'provenance': {'archiveSha256': 'a' * 64, 'license': 'CC BY-NC-SA 4.0'},
        'sources': [
            {'sourceId': 'AAA_S_001', 'feedback': 'Yes', 'synthetic': False},
            {'sourceId': 'BBB_S_002', 'feedback': 'No', 'synthetic': False},
        ],
        'plumes': [
            {'plumeId': 'plume-a', 'sourceId': 'AAA_S_001', 'linkStatus': 'linked', 'synthetic': False},
            {'plumeId': 'plume-b', 'sourceId': 'BBB_S_002', 'linkStatus': 'linked', 'synthetic': False},
            {'plumeId': 'plume-unlinked', 'sourceId': None, 'linkStatus': 'source_id_missing', 'synthetic': False},
        ],
    }


class CasebookTests(unittest.TestCase):
    def build(self, snapshot, selections, expected_hash='a' * 64):
        builder = getattr(casebook, 'build_casebook', None) if casebook else None
        self.assertIsNotNone(builder, 'build_casebook must create provenance-bound real-data cases')
        return builder(snapshot, selections, expected_archive_sha256=expected_hash)

    def test_casebook_contains_only_plumes_linked_to_each_selected_source(self):
        report_reference = {
            'title': 'UNEP MARS confirmed mitigation case',
            'url': 'https://wedocs.unep.org/handle/20.500.11822/49949',
            'license': 'CC BY-NC-ND 3.0 IGO',
            'contentIncluded': False,
        }
        cases = self.build(sample_snapshot(), [
            {
                'caseId': 'CASE-A', 'sourceId': 'AAA_S_001', 'purpose': 'feedback received',
                'externalEvidence': [report_reference],
            },
            {'caseId': 'CASE-B', 'sourceId': 'BBB_S_002', 'purpose': 'no feedback recorded'},
        ])

        self.assertEqual([case['source']['sourceId'] for case in cases['cases']], ['AAA_S_001', 'BBB_S_002'])
        self.assertEqual([p['plumeId'] for p in cases['cases'][0]['plumes']], ['plume-a'])
        self.assertEqual(cases['cases'][0]['source']['feedback'], 'Yes')
        self.assertEqual(cases['cases'][0]['externalEvidence'], [report_reference])
        self.assertEqual(cases['provenance']['archiveSha256'], 'a' * 64)

    def test_casebook_rejects_unknown_sources_and_snapshot_hash_mismatch(self):
        selection = [{'caseId': 'CASE-X', 'sourceId': 'UNKNOWN_S_001', 'purpose': 'example'}]
        with self.assertRaisesRegex(ValueError, 'not present in the snapshot'):
            self.build(sample_snapshot(), selection)
        with self.assertRaisesRegex(ValueError, 'snapshot SHA-256 does not match'):
            self.build(sample_snapshot(), [], expected_hash='b' * 64)

    def test_casebook_rejects_duplicate_case_or_source_selections(self):
        selection = [
            {'caseId': 'CASE-A', 'sourceId': 'AAA_S_001', 'purpose': 'first'},
            {'caseId': 'CASE-A', 'sourceId': 'BBB_S_002', 'purpose': 'second'},
        ]
        with self.assertRaisesRegex(ValueError, '(?i)duplicate case ID'):
            self.build(sample_snapshot(), selection)

        duplicate_source_selection = [
            {'caseId': 'CASE-A', 'sourceId': 'AAA_S_001', 'purpose': 'first'},
            {'caseId': 'CASE-B', 'sourceId': 'AAA_S_001', 'purpose': 'second'},
        ]
        with self.assertRaisesRegex(ValueError, '(?i)duplicate source ID'):
            self.build(sample_snapshot(), duplicate_source_selection)

    def test_casebook_rejects_embedded_or_unlicensed_external_report_content(self):
        selection = [{
            'caseId': 'CASE-A', 'sourceId': 'AAA_S_001', 'purpose': 'document linked',
            'externalEvidence': [{
                'title': 'UNEP report', 'url': 'https://example.org/report',
                'license': 'CC BY-NC-ND 3.0 IGO', 'contentIncluded': True,
            }],
        }]
        with self.assertRaisesRegex(ValueError, '(?i)external evidence must be link-only'):
            self.build(sample_snapshot(), selection)

        selection[0]['externalEvidence'][0]['contentIncluded'] = False
        selection[0]['externalEvidence'][0]['excerpt'] = 'Copied report text'
        with self.assertRaisesRegex(ValueError, '(?i)unsupported external evidence field'):
            self.build(sample_snapshot(), selection)


if __name__ == '__main__':
    unittest.main()
