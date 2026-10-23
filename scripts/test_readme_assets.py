"""Keep the public README's local links and actual screenshot inventory usable."""
import hashlib
import json
from pathlib import Path
import re
import unittest
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'docs/assets/screenshots'


class ReadmeAssetsTests(unittest.TestCase):
    def test_local_links_and_images_resolve(self):
        for relative in ['README.md', 'docs/product/organization-walkthrough.md']:
            document = ROOT / relative
            body = document.read_text()
            targets = re.findall(r'(?:href|src)="([^"]+)"', body)
            targets += re.findall(r'\]\(([^\s)]+)\)', body)
            for target in targets:
                parsed = urlsplit(target)
                if parsed.scheme or not parsed.path:
                    continue
                path = (document.parent / unquote(parsed.path)).resolve()
                with self.subTest(document=relative, target=target):
                    self.assertTrue(path.is_relative_to(ROOT))
                    self.assertTrue(path.exists(), f'Missing local target: {target}')

    def test_every_gallery_image_has_capture_provenance(self):
        manifest = json.loads((ASSETS / 'manifest.json').read_text())
        images = manifest['screenshots']
        referenced = set(re.findall(r'<img src="(docs/assets/screenshots/[^"]+)"', (ROOT / 'README.md').read_text()))
        self.assertEqual(referenced, {row['path'] for row in images})
        self.assertEqual(len(images), 5)
        for row in images:
            with self.subTest(path=row['path']):
                self.assertIn(row['environment'], ['public-preview', 'local-isolated-demo', 'local-browser'])
                self.assertRegex(row['captureDate'], r'^2026-10-\d{2}$')
                self.assertEqual(row['kind'], 'actual-browser-screenshot')
                self.assertEqual(row['processing'], 'lossless WebP encoding; no crop, resize or compositing')
                self.assertRegex(row['sourceSha256'], r'^[a-f0-9]{64}$')
                self.assertGreaterEqual(row['width'], 1000)

    def test_gallery_files_match_hashes_and_size_budget(self):
        rows = json.loads((ASSETS / 'manifest.json').read_text())['screenshots']
        total = 0
        for row in rows:
            content = (ROOT / row['path']).read_bytes()
            total += len(content)
            self.assertEqual(content[:4], b'RIFF')
            self.assertEqual(content[8:12], b'WEBP')
            self.assertEqual(hashlib.sha256(content).hexdigest(), row['sha256'])
            self.assertEqual(len(content), row['bytes'])
        self.assertLess(total, 2 * 1024 * 1024)

    def test_handoff_and_preview_boundaries_remain_findable(self):
        body = (ROOT / 'README.md').read_text()
        for section in ['## Quick start', '## Choose your environment', '## Verification and honest limits', '## License and attribution']:
            self.assertIn(section, body)
        for command in ['demo:workflow', 'export:investigation-brief', 'verify:investigation-decision']:
            self.assertIn(command, json.loads((ROOT / 'package.json').read_text())['scripts'])
        self.assertIn('**0/48**', body)
        self.assertIn('Anvil local chain 31337', body)
        self.assertEqual(body.count('```') % 2, 0)


if __name__ == '__main__':
    unittest.main()
