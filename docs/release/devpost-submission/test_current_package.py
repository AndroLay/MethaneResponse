import json
from pathlib import Path
import tempfile
import unittest
from package_current_submission import assemble_current, EXTRAS
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


if __name__=='__main__':
    unittest.main()
