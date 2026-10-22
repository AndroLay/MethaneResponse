import hashlib,json,unittest,wave
import numpy as np
from PIL import Image
import pipeline as p
class RevisionTests(unittest.TestCase):
    def test_source_video_preserved(self):
        self.assertEqual(p.sha(p.SOURCE),'e0764396ca1ec16e458396f037c09e3de36b3cd39b91d4bde4f2a3059171f57c')
    def test_duration_below_five_minutes(self):
        self.assertEqual(p.DURATION,297);self.assertEqual(p.INSERT,17);self.assertLess(p.DURATION,300)
    def test_reveal_limits_double_exposure_to_narrow_edge(self):
        previous=Image.new('RGB',(1920,1080),'black');current=Image.new('RGB',(1920,1080),'white')
        self.assertEqual(p.reveal(previous,current,0).tobytes(),previous.tobytes())
        self.assertEqual(p.reveal(previous,current,1).tobytes(),current.tobytes())
        row=np.asarray(p.reveal(previous,current,.5))[540,:,0]
        self.assertLessEqual(np.count_nonzero((row>0)&(row<255)),96)
        self.assertTrue(np.all(row[:900]==255));self.assertTrue(np.all(row[1020:]==0))
    def test_exact_new_climate_narrative(self):
        self.assertIn('not proof that a leak was repaired',p.STAKES)
        self.assertIn('comparable post-action measurements',p.IMPACT)
        self.assertIn('We have not measured those outcomes',p.IMPACT)
    def test_workflow_banners_stay_outside_ui_and_captions(self):
        self.assertEqual(p.BAND,(128,116,1664,70))
        self.assertLessEqual(p.BAND[1]+p.BAND[3],188)
        self.assertEqual({x['label']for x in p.BANNERS['request']},{'MISSING EVIDENCE','ACTION REQUIRED','REVIEWABLE DECISION'})
    def test_potential_outcomes_are_not_reported_as_demonstrated(self):
        self.assertEqual([x['demonstrated']for x in p.NODES],[True,True,False,False])
        self.assertIn('NOT DEMONSTRATED',p.NODES[-1]['status'])
    def test_main_narration_unchanged(self):
        old=p.read_pcm(p.OLD/'narration.wav');new=p.read_pcm(p.OUT/'narration.wav')
        self.assertTrue(np.array_equal(old[22*p.SR:246*p.SR],new[22*p.SR:246*p.SR]))
        self.assertTrue(np.array_equal(old[246*p.SR:],new[263*p.SR:]))
        self.assertEqual(len(new),297*p.SR)
    def test_model_and_blockchain_segment_narration_remain_original(self):
        m=json.loads((p.OUT/'narration-manifest.json').read_text());old=json.loads((p.OLD/'narration-manifest.json').read_text())
        for scene in ['ai','verify']:
            self.assertEqual([c for c in m['cues']if c['scene']==scene],[c for c in old['cues']if c['scene']==scene])
    def test_captions_order_and_duration(self):
        caps=json.loads((p.OUT/'captions.json').read_text())
        for c in caps:self.assertTrue(0<=c['start']<c['end']<=297)
        for a,b in zip(caps,caps[1:]):self.assertLessEqual(a['end'],b['start'])
    def test_speech_is_bounded_and_disclosed(self):
        m=json.loads((p.OUT/'narration-manifest.json').read_text())
        self.assertEqual(m['newSynthesisCues'],2);self.assertTrue(m['synthetic']);self.assertFalse(m['voiceCloning'])
        for c in m['newCueTiming']:self.assertLessEqual(c['tempo'],1.10);self.assertGreaterEqual(c['tempo'],.92)
    def test_chapters_are_contiguous(self):
        s=json.loads((p.OUT/'story.json').read_text())['scenes'];self.assertEqual(len(s),11)
        for a,b in zip(s,s[1:]):self.assertEqual(a['end'],b['start'])
        self.assertEqual(s[-1]['end'],297)
    def test_frozen_research_preserved(self):
        self.assertEqual(p.sha(p.ROOT/'docs/evidence/agent-practical-usefulness-2026-10-21-r12/results.json'),'2ebe52a1ee151cd313feaf2e3361d0a7942ada690ccded03885617f3f3784cf1')
if __name__=='__main__':unittest.main()
