import json
from pathlib import Path
import tempfile
import unittest
from package_current_submission import assemble_current, assemble_completion, EXTRAS, COMPLETION_EXTRAS
from package_submission import write_zip, validate_archive, json_bytes


class CurrentPackageTests(unittest.TestCase):
    def test_additions_are_complete_checksummed_and_do_not_claim_publication(self):
        base={'README.md':b'DEMO','manifest.json':json_bytes({'files':{},'videoSource':{'localPath':'DEMO-v12.mp4'}}),'checksums.sha256':b''}
        additions={name:b'DEMO software proof' for name in EXTRAS}
        files=assemble_current(base,additions)
        manifest=json.loads(files['manifest.json'])
        self.assertFalse(manifest['publicDeploymentVerified'])
        self.assertTrue(manifest['videoIsHistoricalPresentation'])
        self.assertNotIn('current-proof/checks.json',base)
        self.assertIn('current-proof/checks.json',manifest['files'])
        with tempfile.TemporaryDirectory(prefix='methane-current-judging-') as tmp:
            path=Path(tmp)/'current.zip';write_zip(path,files)
            self.assertLess(validate_archive(path)['zipBytes'],35_000_000)
        with self.assertRaises(ValueError):
            assemble_current(base,{})

    def test_completion_preserves_p2_and_records_local_only_scope(self):
        base={'README.md':b'DEMO','manifest.json':json_bytes({'files':{},'videoSource':{'localPath':'DEMO-v12.mp4'}}),'checksums.sha256':b''}
        current=assemble_current(base,{name:b'DEMO prior proof' for name in EXTRAS})
        additions={name:b'DEMO completion proof' for name in COMPLETION_EXTRAS}
        completed=assemble_completion(current, additions)
        manifest=json.loads(completed['manifest.json'])
        self.assertEqual(completed['current-proof/checks.json'],current['current-proof/checks.json'])
        self.assertEqual(manifest['currentProof'],'completion-proof/checks.json')
        self.assertFalse(manifest['publicDeploymentVerified'])
        self.assertFalse(manifest['videoUploaded'])
        self.assertEqual(manifest['blockchainAcceptanceTarget'],'local_anvil_31337')
        with self.assertRaises(ValueError):
            assemble_completion(completed, additions)
        with tempfile.TemporaryDirectory(prefix='methane-completed-judging-') as tmp:
            path=Path(tmp)/'completed.zip';write_zip(path,completed)
            self.assertLess(validate_archive(path)['zipBytes'],35_000_000)

    def test_completion_rejects_missing_extra_and_oversized_inputs(self):
        base={'manifest.json':json_bytes({'files':{}}),'checksums.sha256':b''}
        valid={name:b'DEMO' for name in COMPLETION_EXTRAS}
        for invalid in [{}, {**valid,'server.env':b'DEMO'}, {**valid,'checks.json':b'x'*8_000_001}, {**valid,'checks.json':'not bytes'}]:
            with self.assertRaises(ValueError):
                assemble_completion(base,invalid)


if __name__=='__main__':
    unittest.main()
