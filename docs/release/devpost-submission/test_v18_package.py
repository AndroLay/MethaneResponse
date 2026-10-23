"""Focused regressions for the current, explicitly allowlisted judging pack."""
import copy,json,tempfile,unittest,zipfile
from pathlib import Path
from unittest.mock import patch
import package_v18_submission as p

class V18PackageTests(unittest.TestCase):
    def test_current_fields_video_proof_and_limits(self):
        fields=json.loads((p.HERE/'fields.json').read_text())
        p.validate_current(fields)
        self.assertEqual(fields['video']['version'],'v18')
        self.assertEqual(fields['video']['durationSeconds'],297)
        self.assertEqual(fields['video']['url'],'https://youtu.be/_YzYe921q6g')
        publication=json.loads((p.HERE/fields['publicationObservationFile']).read_text())
        self.assertEqual(publication['youtube']['url'],fields['video']['url'])
        self.assertIsNotNone(publication['devpost']['submittedAt'])
        self.assertTrue(fields['externalSubmissionPerformed'])
        self.assertEqual(fields['primaryVideoSourceId'],'TKM_S_021')

    def test_wrong_video_or_take_is_rejected(self):
        fields=json.loads((p.HERE/'fields.json').read_text())
        for key,value in [('sha256','0'*64),('version','v16'),('durationSeconds',280)]:
            bad=copy.deepcopy(fields);bad['video'][key]=value
            with self.assertRaises(ValueError):p.validate_current(bad)
        bad=copy.deepcopy(fields);bad['proofDirectory']='docs/evidence/video-v16-2026-10-22'
        with self.assertRaises(ValueError):p.validate_current(bad)

    def test_safe_paths_reject_escape_symlink_and_unlisted_file(self):
        for path in ['../README.md','/etc/passwd','.env','docs/../README.md']:
            with self.assertRaises(ValueError):p.allowed_bytes(path)
        with tempfile.TemporaryDirectory(dir=p.REPO/'delivery-output') as tmp:
            link=Path(tmp)/'README.md';link.symlink_to(p.REPO/'README.md')
            name=str(link.relative_to(p.REPO))
            with patch.object(p,'ALLOWED',p.ALLOWED|{name}):
                with self.assertRaises(ValueError):p.allowed_bytes(name)

    def test_story_current_case_ai_and_negative_results_are_explicit(self):
        story=(p.HERE/'project-story.md').read_text()
        for phrase in ['Turkmenistan','separate Kazakhstan example','**DEMO**',
                       'Anvil, a local Ethereum development chain',
                       'excerpt written for the demonstration',
                       'did not establish user productivity or practical effectiveness',
                       'agent-practical-usefulness-2026-10-21-r12',
                       'We have not measured those outcomes',
                       'temporary state, and no private review or blockchain writes']:
            self.assertIn(phrase,story)
        self.assertNotRegex(story,r'\bv\d+\b|\b716 passing tests\b')
        original=json.loads((p.REPO/'docs/evidence/agent-practical-usefulness-2026-10-21-r12/results.json').read_text())
        self.assertEqual(original['aggregate']['scored'],48)
        self.assertEqual(original['aggregate']['metrics']['taskCompletionRate'],0)
        fields=json.loads((p.HERE/'fields.json').read_text())
        self.assertIn('deepseek-v4.1-flash-1017',fields['prototypeScope']['ai'])
        replay=json.loads((p.REPO/'docs/evidence/video-v18-2026-10-22/submission-replay-2026-10-23.json').read_text())
        self.assertEqual(replay['trustedDigest'],p.PIN)
        self.assertEqual([v['exitCode']for v in replay['checks'].values()],[0,1,1,0])
        self.assertEqual(replay['transactionsSent'],0)

    def test_package_binds_current_proof_and_labels_gallery(self):
        files=p.payload();m=json.loads(files['manifest.json'])
        self.assertEqual(m['videoSource']['sha256'],p.VIDEO_SHA)
        self.assertEqual(m['trustedDigest'],p.PIN)
        self.assertFalse(m['videoIncluded']);self.assertTrue(m['videoUploaded'])
        self.assertTrue(m['externalSubmissionPerformed'])
        self.assertFalse(m['externalActionsByBuilder'])
        self.assertEqual(m['hostedCutMatchesLocalExport'],'not_verified')
        self.assertIn('docs/evidence/video-v17-2026-10-22/browser-export.json',files)
        self.assertFalse(any(n.endswith(('.mp4','.webm'))for n in files))
        gallery=json.loads(files['gallery-captions.json'])
        self.assertEqual(len(gallery),6)
        self.assertTrue(any(g['kind']=='editorial_diagram'for g in gallery))
        self.assertTrue(all(len(files['gallery/'+g['file']])<5_000_000 for g in gallery))

    def test_youtube_copy_fits_and_keeps_demo_limits_and_chapters(self):
        import re
        copy=(p.HERE/'youtube-metadata.md').read_text()
        title,description=re.findall(r'```text\n(.*?)\n```',copy,re.S)
        self.assertLessEqual(len(title),100)
        self.assertLessEqual(len(description),5000)
        self.assertNotRegex(title,r'\bv\d+\b')
        stamps=re.findall(r'^(\d{2}):(\d{2}) ',description,re.M)
        self.assertEqual([int(m)*60+int(s)for m,s in stamps],[0,22,43,63,99,125,153,184,207,246,263])
        for phrase in ['a separate Kazakhstan example','DEMO','local Ethereum development chain',
                       'No emissions reduction or improvement in human productivity',
                       'synthetic English narration','temporary storage']:
            self.assertIn(phrase.lower(),description.lower())
        self.assertFalse(json.loads((p.HERE/'publication-status-2026-10-23.json').read_text())['youtube']['proposedMetadataSaved'])

    def test_deterministic_archive_size_checksums_and_no_overwrite(self):
        files=p.payload()
        with tempfile.TemporaryDirectory() as tmp:
            a=Path(tmp)/'a.zip';b=Path(tmp)/'b.zip'
            p.write_zip(a,files);p.write_zip(b,files)
            self.assertEqual(a.read_bytes(),b.read_bytes())
            self.assertLess(p.validate_archive(a)['zipBytes'],35_000_000)
            with self.assertRaises(FileExistsError):p.write_zip(a,files)
            altered={**files,'READ-FIRST.md':b'DEMO changed after manifest'}
            c=Path(tmp)/'changed.zip';p.write_zip(c,altered)
            with self.assertRaises(ValueError):p.validate_archive(c)

if __name__=='__main__':unittest.main()
