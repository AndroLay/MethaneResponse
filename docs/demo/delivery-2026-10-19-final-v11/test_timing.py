"""Regression gates for narration, truthful footage, cues and composition."""
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
from PIL import Image, ImageChops

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
import narration
import render
import visuals

class FinalTimingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest=json.loads((render.OUT/'narration-manifest.json').read_text())
        cls.timeline=json.loads((render.OUT/'timeline.json').read_text())

    def test_real_capture_has_unchanged_identity_and_no_page_errors(self):
        capture=json.loads((render.CAPTURE_DIR/'capture.json').read_text())
        self.assertEqual(capture['sha256'],'3de8dc98ffd4cb0e9aaf00f3a1b8838949cc84e7a04bce9257af3e0a0a4a2b98')
        self.assertEqual(capture['sourceId'],'KAZ_S_159')
        self.assertEqual(capture['snapshotId'],'unep-mars-675417694883')
        self.assertEqual(capture['pageErrors'],[])
        self.assertEqual(capture['claims']['receipt'],'none')

    def test_each_app_scene_keeps_real_elapsed_action_time(self):
        shots={s['id']:s for s in json.loads((render.CAPTURE_DIR/'capture.json').read_text())['shots']}
        self.assertEqual(self.timeline[0]['start'],0)
        for i,s in enumerate(self.timeline):
            self.assertAlmostEqual(s['start']*25,round(s['start']*25),places=5)
            if i:self.assertEqual(self.timeline[i-1]['end'],s['start'])
            if s['kind']=='app':self.assertAlmostEqual(s['end']-s['start'],shots[s['shot']]['duration'])
        self.assertTrue(180<=self.timeline[-1]['end']<=300)

    def test_voice_and_subtitle_cues_are_disjoint_and_inside_scenes(self):
        for scene in self.timeline:
            previous=-1
            for c in scene['cues']:
                self.assertGreaterEqual(c['localStart'],previous+.09)
                self.assertLessEqual(c['localEnd'],scene['end']-scene['start'])
                self.assertLessEqual(c['tempoFit'],1.10)
                previous=c['localEnd']
                for w in c['words']:
                    self.assertGreaterEqual(w['start'],0)
                    self.assertLessEqual(w['end'],c['localEnd']-c['localStart']+.001)
        groups=json.loads((render.OUT/'captions.json').read_text())
        for i,g in enumerate(groups):
            self.assertLess(g['start'],g['end'])
            if i:self.assertLessEqual(groups[i-1]['end'],g['start'])
        srt=(render.OUT/'captions.en.srt').read_text().strip().split('\n\n')
        self.assertEqual([int(c.splitlines()[0]) for c in srt],list(range(1,len(srt)+1)))

    def test_long_old_silent_padding_is_removed(self):
        self.assertLessEqual(self.manifest['maximumInterCueGapSeconds'],3.1)
        self.assertGreater(self.manifest['speechSeconds']/self.manifest['durationSeconds'],.78)
        for s in self.timeline:
            if s['kind']=='model':self.assertLessEqual(s['end']-s['start']-s['cues'][-1]['localEnd'],1.0)

    def test_significant_visuals_follow_the_actual_spoken_word(self):
        scene=next(s for s in self.timeline if s['id']=='climate')
        cue=scene['cues'][0];word=next(w for w in cue['words'] if w['text'].lower()=='thirty')
        self.assertAlmostEqual(visuals.spoken(scene,'warming','thirty')+.12,cue['localStart']+word['start'])
        for s in self.timeline:
            if s['kind']=='model':
                # This also catches a word anchor that no longer exists after a script edit.
                visuals.scene_image(s,(s['end']-s['start'])*.6,{'report':{'bundleHash':'0x'+'1'*64,'alteredBundleHash':'0x'+'2'*64}})

    def test_guides_fit_the_reserved_header(self):
        face=visuals.font(22,True)
        for s in self.timeline:
            if s['kind']=='app':
                for value in [s['instruction']]+[c['guide'] for c in s['cues'] if c.get('guide')]:
                    self.assertLess(face.getlength(value),1090,value)

    def test_finished_captions_preserve_punctuation_without_orphan_words(self):
        import captions
        groups=json.loads((render.OUT/'captions.json').read_text())
        self.assertEqual(groups[0]['text'],'Someone reports a methane repair.')
        self.assertEqual(groups[1]['text'],'How do we check what the evidence actually supports?')
        for g in groups:
            self.assertGreaterEqual(len(g['text'].split()),2)
            self.assertGreaterEqual(g['end']-g['start'],.8)
        regenerated=captions.phrases(self.manifest['cues'])
        self.assertEqual(groups,regenerated)

    def test_temporal_claim_and_result_boundaries_remain_explicit(self):
        content=(HERE/'story.json').read_text().lower()
        for required in ["missing dates don't mean zero",'rules baseline',"doesn\u0027t contradict",'no blockchain receipt','issuer','climate and user impact still need measurement']:
            self.assertIn(required,content)
        audit=next(s for s in self.timeline if s['id']=='audit')
        cues={c['id']:c for c in audit['cues']}
        self.assertGreaterEqual(cues['coverage']['localStart'],13.99)
        self.assertLess(cues['run']['localStart'],13.23)

    def test_text_does_not_ignore_zero_alpha(self):
        base=Image.new('RGB',(700,180),(10,20,30));hidden=base.copy()
        visuals.text(hidden,(25,20),'Review after references',36,a=0)
        self.assertIsNone(ImageChops.difference(hidden,base).getbbox())

    def test_current_camera_remains_continuous_and_settled(self):
        for shot in json.loads((render.CAPTURE_DIR/'capture.json').read_text())['shots']:
            self.assertEqual(render.camera(shot,0),(1.,960.,540.))
            self.assertEqual(render.camera(shot,shot['duration']-.04),(1.,960.,540.))
            samples=[render.camera(shot,i/250) for i in range(round(shot['duration']*250))]
            for a,b in zip(samples,samples[1:]):
                self.assertLess(abs(a[0]-b[0]),.015,shot['id'])
                self.assertLess(abs(a[1]-b[1]),20,shot['id'])
                self.assertLess(abs(a[2]-b[2]),20,shot['id'])
            for scroll in shot['scrolls']:
                self.assertEqual(render.camera(shot,(scroll['start']+scroll['end'])/2),(1.,960.,540.))

    def test_fractional_camera_has_no_integer_rounding_step(self):
        a=render.frame_geometry(1.4,960.01,540.01);b=render.frame_geometry(1.4,960.02,540.02)
        self.assertAlmostEqual(b[0]-a[0],.01,places=7)
        self.assertAlmostEqual(b[1]-a[1],.01,places=7)

    def test_new_light_scene_preserves_the_demo_palette_at_the_join(self):
        scene=next(s for s in self.timeline if s['id']=='climate')
        source=Image.new('RGB',(1920,1080),(8,25,35))
        stub={'duration':8,'pointer':[],'pointerTimes':[]}
        with patch.dict(render.FRAMES,{'source':(source,source)}),patch.dict(render.SHOTS,{'source':stub}):
            first=render.render_frame(scene,0);settled=render.render_frame(scene,1.15)
        self.assertEqual(first.getpixel((30,200)),visuals.background(False).getpixel((30,200)))
        self.assertEqual(settled.getpixel((30,200)),visuals.background(True).getpixel((30,200)))
        self.assertEqual(first.getpixel((70,45)),visuals.TEAL)

if __name__=='__main__':unittest.main()
