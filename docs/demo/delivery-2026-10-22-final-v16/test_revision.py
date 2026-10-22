"""Focused regression checks for the editorial and evidence revision."""
import hashlib, importlib.util, json, unittest
from pathlib import Path
from prepare import HERE, ROOT, OUT, OLD, EVIDENCE, QUOTE, QUOTE_SHA, check_keys

spec=importlib.util.spec_from_file_location('revision',HERE/'render.py')
film=importlib.util.module_from_spec(spec);spec.loader.exec_module(film)

class RevisionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):film.load()
    def test_frozen_original_video(self):
        self.assertEqual(hashlib.sha256((OLD/'MethaneResponse-Final-Submission-v15.mp4').read_bytes()).hexdigest(),
                         'c23e05776f8094c249364481e6b2304f4e9ecf7eb5251be46bc2bfde318df408')
    def test_exact_duration_and_contiguous_sections(self):
        self.assertEqual(film.STORY[0]['start'],0);self.assertEqual(film.STORY[-1]['end'],280)
        for a,b in zip(film.STORY,film.STORY[1:]):self.assertEqual(a['end'],b['start'])
        self.assertEqual(sum(s['end']-s['start'] for s in film.STORY)*25,7000)
    def test_unchanged_sound_and_captions(self):
        for name in ['final-mix.wav','captions.json','captions.en.srt','narration-manifest.json']:
            self.assertEqual((OUT/name).read_bytes(),(OLD/name).read_bytes())
    def test_clip_lengths_match(self):
        for scene in film.STORY:
            if scene['id'] in film.b.CLIPS:self.assertEqual(sum(c['duration'] for c in film.b.CLIPS[scene['id']]),scene['end']-scene['start'])
    def test_same_source_decision_and_receipt(self):
        p=json.loads((EVIDENCE/'anvil-proof.json').read_text())
        export=json.loads((EVIDENCE/'browser-export.json').read_text())
        self.assertEqual(p['record']['decision'],export['decision'])
        self.assertEqual(p['trustedDigest'],json.loads((EVIDENCE/'trusted-digest.json').read_text())['digest'])
        self.assertEqual(p['inputSha256'],hashlib.sha256((EVIDENCE/'browser-export.json').read_bytes()).hexdigest())
        self.assertEqual(p['chainId'],31337);self.assertFalse(p['publicNetworkUsed'])
        self.assertEqual(json.loads((EVIDENCE/'decision-with-receipt.json').read_text()),p['record'])
    def test_actual_quote_sha(self):
        self.assertEqual(hashlib.sha256(QUOTE.encode()).hexdigest(),QUOTE_SHA)
        self.assertEqual(film.FACTS['quote'],QUOTE)
        self.assertTrue(film.FACTS['quoteIsProjectAuthoredDemo'])
    def test_count_populations(self):
        f=film.FACTS;self.assertEqual(f['totalPlumes'],30414)
        self.assertEqual(f['linkedPlumes'],23861);self.assertEqual(f['unlinkedPlumes'],6553)
        self.assertEqual(f['totalPlumes'],f['linkedPlumes']+f['unlinkedPlumes'])
    def test_one_observation_is_not_continuous(self):
        o=film.FACTS['sampleObservation'];self.assertEqual(o['sourceId'],'TKM_S_021')
        self.assertEqual(o['fluxKgHr'],22926);self.assertEqual(o['uncertaintyKgHr'],7969)
        self.assertEqual(o['fluxUnit'],'kg/h');self.assertFalse(film.FACTS['observationIsContinuous'])
    def test_revisit_preserves_history(self):
        r=film.REVISIT;self.assertTrue(r['historicalDecisionUnchanged'])
        self.assertEqual((r['frozenWorkRevision'],r['latestWorkRevision']),(5,6))
        self.assertEqual(r['reasons'][0]['code'],'new_authorized_response')
    def test_ai_case_remains_separate(self):
        self.assertEqual(film.FACTS['separateAIExampleSourceId'],'KAZ_S_159')
        self.assertNotIn('ai',film.b.CLIPS)
        narration=' '.join(c['text'] for s in film.STORY for c in s['cues'])
        self.assertIn('not a model run for our Turkmenistan',narration)
        self.assertIn('did not establish practical usefulness',narration)
    def test_bundle_allowlist_digests(self):
        m=json.loads((EVIDENCE/'manifest.json').read_text())
        self.assertEqual(set(m['files']),{'browser-export.json','trusted-digest.json','anvil-proof.json','anvil-state.json','decision-with-receipt.json','verified-facts.json','MARS-DATA-LICENSE.txt'})
        for name,spec in m['files'].items():
            self.assertEqual(hashlib.sha256((EVIDENCE/name).read_bytes()).hexdigest(),spec['sha256'])
    def test_secret_field_guard(self):
        check_keys({'txHash':'public','digest':'public','reviewerId':'DEMO'})
        for key in ['private_key','api_key','token','authorization','password']:
            with self.assertRaises(ValueError):check_keys({key:'not-for-publication'})
    def test_camera_keeps_capacity_field_visible(self):
        for c in film.b.CLIPS['planner']:
            left=c['cx']-1920/c['zoom']/2
            self.assertLessEqual(left,250)
            self.assertLessEqual(c['zoom'],2.1)
    def test_important_typesetting_fits(self):
        for text,size,width in [('ACTIVE: 10 SOURCES',37,800),('COMPARE: 20 SOURCES',37,800),
                                ('REQUEST MORE EVIDENCE',36,808),('REVIEW RECOMMENDED',37,812),
                                ('Code & reproduction: github.com/AndroLay/MethaneResponse',32,1664)]:
            self.assertLess(film.b.font(size,True).getlength(text),width)

if __name__=='__main__':unittest.main()
