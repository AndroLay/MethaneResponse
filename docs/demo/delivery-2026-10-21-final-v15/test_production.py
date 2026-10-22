"""Regression checks on this edit, not a substitute for audiovisual review."""
import importlib.util,json,unittest
from pathlib import Path
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('film',HERE/'render.py')
film=importlib.util.module_from_spec(spec);spec.loader.exec_module(film)
class ProductionContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):film.load()
    def test_exact_runtime(self):
        self.assertEqual(film.STORY[0]['start'],0)
        self.assertEqual(film.STORY[-1]['end'],280)
        self.assertEqual(sum((s['end']-s['start'])*25 for s in film.STORY),7000)
        for a,b in zip(film.STORY,film.STORY[1:]):self.assertEqual(a['end'],b['start'])
    def test_same_take_chain(self):
        p=film.PROOF
        self.assertFalse(p['publicNetworkUsed']);self.assertEqual(p['chainId'],31337)
        self.assertEqual(p['record']['decision']['dossier']['context']['sourceId'],'TKM_S_021')
        self.assertEqual(p['trustedDigest'],p['record']['decision']['digest'])
    def test_source_segments(self):
        for s in film.STORY:
            if s['id'] in film.CLIPS:self.assertEqual(sum(c['duration'] for c in film.CLIPS[s['id']]),s['end']-s['start'])
        for clips in film.CLIPS.values():
            for c in clips:self.assertGreater(c['sourceEnd'],c['sourceStart'])
    def test_archival_ai_is_separate(self):
        s=next(s for s in film.STORY if s['id']=='ai')
        narration=' '.join(c['text'] for c in s['cues'])
        self.assertIn('separate recorded example',narration)
        self.assertIn('not a model run for our Turkmenistan',narration)
        self.assertNotIn('ai',film.CLIPS)
    def test_caption_bounds_and_readability(self):
        for c in film.CAPTIONS:
            self.assertGreater(c['end'],c['start'])
            self.assertGreaterEqual(c['start'],0);self.assertLessEqual(c['end'],280)
            self.assertLess(film.font(31,True).getlength(c['text']),1700)
        for a,b in zip(film.CAPTIONS,film.CAPTIONS[1:]):self.assertLessEqual(a['end'],b['start'])
    def test_no_productivity_claim(self):
        text=' '.join(c['text'] for s in film.STORY for c in s['cues'])
        self.assertIn('did not establish practical usefulness',text)
        self.assertIn('climate outcomes remain unproven',text)
    def test_voice_timing(self):
        m=json.loads((film.OUT/'narration-manifest.json').read_text())
        self.assertTrue(m['synthetic']);self.assertFalse(m['voiceCloning'])
        self.assertIn('Andrew',m['voice'])
        for c in m['cues']:self.assertLess(c['start'],c['end'])
        for a,b in zip(m['cues'],m['cues'][1:]):
            self.assertGreaterEqual(b['start']-a['end'],.09)
            self.assertLess(b['start']-a['end'],1.2)
    def test_deterministic_camera_easing(self):
        self.assertEqual(film.ease(-1),0);self.assertEqual(film.ease(2),1)
        a=[film.ease(i/100) for i in range(101)]
        self.assertTrue(all(x<=y for x,y in zip(a,a[1:])))
if __name__=='__main__':unittest.main()
