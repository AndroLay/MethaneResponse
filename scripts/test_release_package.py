import json
from pathlib import Path
import tempfile
import unittest
import zipfile
from release_package import select_source_paths, source_payload, write_archive, verify_archive


class ReleasePackageTests(unittest.TestCase):
    def test_browser_scenarios_required_by_the_repository_gate_are_included(self):
        self.assertEqual(select_source_paths(['e2e/audit-workflow.spec.ts','e2e/environment-assertions.ts']),['e2e/audit-workflow.spec.ts','e2e/environment-assertions.ts'])

    def test_archive_retains_runtime_pin_and_editor_configuration(self):
        self.assertEqual(select_source_paths(['.bun-version', '.editorconfig', '.private-state','apps/web/.env.example','apps/web/.env.local']), ['.bun-version', '.editorconfig','apps/web/.env.example'])

    def test_temporary_runtime_and_common_provider_credentials_are_excluded(self):
        self.assertEqual(select_source_paths(['apps/api/tmp/session.json','apps/api/temp/upload.txt']),[])
        with tempfile.TemporaryDirectory(prefix='methane-package-test-') as temp:
            root=Path(temp)
            for data in ['CLIENT_SECRET='+'A'*40, 'AIza'+'a'*35]:
                (root/'README.md').write_text(data)
                with self.assertRaises(ValueError):
                    source_payload(root,['README.md'],'DEMO')

    def test_only_source_allowlist_and_no_credentials_state_or_generated_trees(self):
        names = ['README.md', 'apps/api/src/app.ts', '.env', '.env.local', '.env.example',
                 'data/state/audits.json', 'apps/web/dist/index.html', 'node_modules/a.js',
                 'docs/evidence/DEMO/README.md', 'private.key', '../README.md', '/etc/passwd',
                 'apps/api/.wrangler/state/DEMO-local.json', 'apps/api/uploads/DEMO.txt', 'apps/api/state/DEMO.json']
        self.assertEqual(select_source_paths(names), ['.env.example', 'README.md', 'apps/api/src/app.ts', 'docs/evidence/DEMO/README.md'])

    def test_archive_is_deterministic_and_detects_changed_source(self):
        with tempfile.TemporaryDirectory(prefix='methane-release-test-') as temp:
            root = Path(temp)
            (root / 'README.md').write_text('DEMO source')
            payload = source_payload(root, ['README.md'], 'DEMO-baseline')
            a, b = root/'one.zip', root/'two.zip'
            write_archive(a, payload)
            write_archive(b, payload)
            self.assertEqual(a.read_bytes(), b.read_bytes())
            self.assertEqual(verify_archive(a)['members'], 3)
            with zipfile.ZipFile(a) as archive:
                self.assertEqual(archive.read('README.md'), b'DEMO source')
                self.assertFalse(json.loads(archive.read('source-manifest.json'))['publicDeploymentVerified'])
            tampered = {**payload, 'README.md': b'DEMO changed source'}
            write_archive(root/'bad.zip', tampered)
            with self.assertRaises(ValueError):
                verify_archive(root/'bad.zip')
            with self.assertRaises(FileExistsError):
                write_archive(a, payload)

    def test_symlink_source_and_recognizable_credentials_fail_closed(self):
        with tempfile.TemporaryDirectory(prefix='methane-release-test-') as temp:
            root = Path(temp)
            (root/'target').write_text('private file')
            (root/'README.md').symlink_to(root/'target')
            with self.assertRaises(ValueError):
                source_payload(root, ['README.md'], 'DEMO')
            (root/'README.md').unlink()
            (root/'README.md').write_text('-----BEGIN '+'PRIVATE KEY-----')
            with self.assertRaises(ValueError):
                source_payload(root, ['README.md'], 'DEMO')

    def test_manifest_includes_exact_relative_source_hashes(self):
        with tempfile.TemporaryDirectory(prefix='methane-release-test-') as temp:
            root = Path(temp)
            (root/'README.md').write_text('DEMO')
            payload = source_payload(root, ['README.md'], 'DEMO-baseline')
            manifest = json.loads(payload['source-manifest.json'])
            self.assertEqual(manifest['baselineCommit'], 'DEMO-baseline')
            self.assertEqual(list(manifest['files']), ['README.md'])
            self.assertEqual(manifest['files']['README.md']['bytes'], 4)

    def test_cloud_credentials_and_fine_grained_tokens_are_rejected(self):
        with tempfile.TemporaryDirectory(prefix='methane-release-test-') as temp:
            root = Path(temp)
            for data in ['AWS_SECRET_ACCESS_KEY='+'A'*40, 'AWS_ACCESS_KEY_ID='+'AKIA'+'A'*16, 'github_pat_'+'a'*70]:
                (root/'README.md').write_text(data)
                with self.assertRaises(ValueError):
                    source_payload(root, ['README.md'], 'DEMO')

if __name__ == '__main__':
    unittest.main()
