"""Local content/archive regressions; do not call or publish to external services."""
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

import package_submission as pack


class SubmissionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.files, cls.gallery = pack.payload()
        cls.fields = json.loads(cls.files['fields.json'])

    def test_name_pitch_tags_and_exact_requested_headings(self):
        pack.validate_fields(self.fields, self.files['project-story.md'].decode())
        self.assertEqual(len(self.fields['elevatorPitch']), 143)
        self.assertEqual(len(self.fields['builtWith']), 15)

    def test_overlong_pitch_is_rejected(self):
        invalid = {**self.fields, 'elevatorPitch': 'x' * 201}
        with self.assertRaises(ValueError):
            pack.validate_fields(invalid, self.files['project-story.md'].decode())

    def test_story_retains_scientific_and_live_integration_limits(self):
        text = self.files['project-story.md'].decode()
        for phrase in ['historical records', 'exact action day', 'does not contradict UNEP',
                       'local Anvil', 'no public Sepolia receipt', '716 passing tests',
                       'Agent simulations are not human research', 'optional document-AI']:
            self.assertIn(phrase, text)
        self.assertNotIn('PostgreSQL', self.fields['builtWith'])

    def test_unpublished_urls_are_explicitly_pending(self):
        self.assertEqual(self.fields['tryItOutLinks'][1]['url'], 'https://methaneresponse-preview.onrender.com/dashboard')
        self.assertIsNone(self.fields['video']['url'])
        self.assertFalse(self.fields['externalSubmissionPerformed'])
        self.assertTrue(180 <= self.fields['video']['durationSeconds'] <= 300)

    def test_gallery_is_real_unchanged_and_within_form_limits(self):
        self.assertEqual(len(self.gallery), 6)
        self.assertLessEqual(len(self.gallery), 15)
        for item in self.gallery:
            data = self.files['gallery/' + item['file']]
            self.assertEqual(data, (pack.REPO / item['source']).read_bytes())
            self.assertLess(len(data), 5_000_000)
            self.assertFalse(item['modifiedPixels'])

    def test_controlled_change_is_one_reason_and_credentials_are_rejected(self):
        a = json.loads(self.files['evidence/original-report.json'])
        b = json.loads(self.files['evidence/changed-report.json'])
        self.assertEqual(pack.validate_examples(a, b), [
            '/exportIntegrity/sha256', '/latestAudit/bundle/reason', '/latestAudit/reason'])
        invalid = json.loads(json.dumps(b))
        invalid['selectedSourceId'] = 'DEMO_UNEXPECTED_SOURCE'
        with self.assertRaises(ValueError):
            pack.validate_examples(a, invalid)
        for key in ['api_key', 'privateKey', 'access-token', 'Authorization', 'password']:
            with self.assertRaises(ValueError):
                pack.reject_private_fields({'nested': {key: 'DEMO'}})

    def test_manifest_lists_all_payload_and_zip_is_deterministic(self):
        with tempfile.TemporaryDirectory(prefix='methane-submission-') as temp:
            a = Path(temp) / 'one.zip'
            b = Path(temp) / 'two.zip'
            pack.write_zip(a, self.files)
            pack.write_zip(b, self.files)
            self.assertEqual(a.read_bytes(), b.read_bytes())
            checked = pack.validate_archive(a)
            self.assertLess(checked['zipBytes'], 35_000_000)
            with zipfile.ZipFile(a) as archive:
                self.assertNotIn('.env', archive.namelist())
                self.assertFalse(any(n.endswith(('.mp4', '.webm')) for n in archive.namelist()))
            with self.assertRaises(FileExistsError):
                pack.write_zip(a, self.files)

    def test_archive_tampering_is_rejected(self):
        with tempfile.TemporaryDirectory(prefix='methane-submission-') as temp:
            path = Path(temp) / 'tampered.zip'
            changed = {**self.files, 'project-story.md': b'DEMO uncontrolled edit'}
            pack.write_zip(path, changed)
            with self.assertRaises(ValueError):
                pack.validate_archive(path)


if __name__ == '__main__':
    unittest.main()
