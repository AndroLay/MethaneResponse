import base64
import hashlib
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from fetch_mars_candidate import fetch_candidate, head, URL


class Response(io.BytesIO):
    status = 200
    def __init__(self, data, headers):
        super().__init__(data)
        self.headers = headers
    def geturl(self):
        return URL


class CandidateFetchTests(unittest.TestCase):
    def fixture(self, **changes):
        data = b'DEMO bounded public dataset bytes'
        headers = {'ETag': '"DEMO-version"', 'Content-Length': str(len(data)),
                   'Content-MD5': base64.b64encode(hashlib.md5(data, usedforsecurity=False).digest()).decode(),
                   'Last-Modified': 'Tue, 20 Oct 2026 03:20:06 GMT'}
        return data, {**headers, **changes}

    def test_requires_approval_before_network_and_preserves_existing_output(self):
        with tempfile.TemporaryDirectory() as temp:
            called = []
            with self.assertRaises(ValueError):
                fetch_candidate(Path(temp)/'new', False, head_request=lambda: called.append(True))
            self.assertFalse(called)
            with self.assertRaises(FileExistsError):
                fetch_candidate(Path(temp), True)

    def test_consistent_headers_and_content_produce_original_hash_and_manifest(self):
        data, headers = self.fixture()
        with tempfile.TemporaryDirectory() as temp:
            out = Path(temp)/'new'
            result = fetch_candidate(out, True, lambda: headers, lambda: Response(data, headers))
            self.assertEqual((out/'unep-mars-csv.zip').read_bytes(), data)
            self.assertEqual(result['sha256'], hashlib.sha256(data).hexdigest())
            self.assertFalse(result['activeSnapshotChanged'])
            self.assertTrue((out/'download-manifest.json').is_file())

    def test_oversize_missing_headers_and_content_tampering_are_rejected(self):
        data, headers = self.fixture()
        for update in [{'Content-Length':'999999999'}, {'ETag':''}, {'Content-MD5':'invalid'}]:
            with tempfile.TemporaryDirectory() as temp, self.assertRaises(ValueError):
                fetch_candidate(Path(temp)/'new',True,lambda:{**headers,**update},lambda:Response(data,headers))
        with tempfile.TemporaryDirectory() as temp, self.assertRaises(ValueError):
            fetch_candidate(Path(temp)/'new',True,lambda:headers,lambda:Response(b'x'*len(data),headers))

    def test_changed_release_during_download_is_not_committed_as_ready(self):
        data,headers=self.fixture()
        calls=[]
        def head():
            calls.append(True)
            return headers if len(calls)==1 else {**headers,'ETag':'"DEMO-next"'}
        with tempfile.TemporaryDirectory() as temp:
            out=Path(temp)/'new'
            with self.assertRaises(ValueError):
                fetch_candidate(out,True,head,lambda:Response(data,headers))
            self.assertFalse((out/'download-manifest.json').exists())

    def test_output_outside_staging_and_symlink_into_public_tree_fail_before_network(self):
        root=Path(__file__).resolve().parents[1]
        called=[]
        for out in [root/'apps/web/public/data/DEMO-candidate',root/'data/real/DEMO-candidate',root/'docs/evidence/DEMO-candidate']:
            with self.assertRaises(ValueError):
                fetch_candidate(out,True,head_request=lambda:called.append(True))
        with tempfile.TemporaryDirectory() as temp:
            parent=Path(temp)/'redirect';parent.symlink_to(root/'apps/web/public',target_is_directory=True)
            with self.assertRaises(ValueError):
                fetch_candidate(parent/'DEMO-candidate',True,head_request=lambda:called.append(True))
        self.assertFalse(called)

    def test_redirected_archive_is_rejected_and_original_url_is_recorded(self):
        data,headers=self.fixture()
        with tempfile.TemporaryDirectory() as temp:
            response=Response(data,headers);response.geturl=lambda:'https://example.org/DEMO.zip'
            with self.assertRaises(ValueError):
                fetch_candidate(Path(temp)/'redirected',True,lambda:headers,lambda:response)
            self.assertFalse((Path(temp)/'redirected/download-manifest.json').exists())
            result=fetch_candidate(Path(temp)/'official',True,lambda:headers,lambda:Response(data,headers))
            self.assertEqual(result['finalUrl'],URL)

    def test_redirected_head_fails_before_accepting_publisher_headers(self):
        data,headers=self.fixture()
        response=Response(data,headers);response.geturl=lambda:'https://example.org/DEMO.zip'
        with patch('fetch_mars_candidate.urlopen',return_value=response),self.assertRaises(ValueError):
            head()

if __name__=='__main__':
    unittest.main()
