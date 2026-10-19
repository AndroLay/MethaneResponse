"""Regression checks for the visible camera defects and truthful time binding."""
import importlib.util
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
from PIL import Image, ImageChops

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
import render
import visuals

class DirectedMotionTests(unittest.TestCase):
    def test_return_to_light_presentation_starts_from_the_demo_palette(self):
        scene=next(s for s in render.TIMELINE if s['id']=='climate')
        source=Image.new('RGB',(1920,1080),(8,25,35))
        stub={'duration':8,'pointer':[],'pointerTimes':[]}
        with patch.dict(render.FRAMES,{'source':(source,source)}),patch.dict(render.SHOTS,{'source':stub}):
            first=render.render_frame(scene,0)
            middle=render.render_frame(scene,.6)
            settled=render.render_frame(scene,1.15)
        sample=(30,200)
        self.assertEqual(first.getpixel(sample),visuals.background(False).getpixel(sample))
        self.assertEqual(settled.getpixel(sample),visuals.background(True).getpixel(sample))
        self.assertLess(sum(first.getpixel(sample)),sum(middle.getpixel(sample)))
        self.assertLess(sum(middle.getpixel(sample)),sum(settled.getpixel(sample)))
        self.assertEqual(first.getpixel((70,45)),visuals.TEAL)

    def test_text_reveal_obeys_opacity_and_does_not_appear_early(self):
        # Pillow's RGB text path can ignore the alpha in an RGBA fill. Use an
        # explicit glyph mask so later narration elements remain hidden.
        base=Image.new('RGB',(700,180),(10,20,30))
        hidden=base.copy();visuals.text(hidden,(25,20),'Review after references',36,a=0)
        self.assertIsNone(ImageChops.difference(hidden,base).getbbox())
        half=base.copy();visuals.text(half,(25,20),'Review after references',36,a=.5)
        full=base.copy();visuals.text(full,(25,20),'Review after references',36,a=1)
        half_delta=max(ImageChops.difference(half,base).getextrema()[0])
        full_delta=max(ImageChops.difference(full,base).getextrema()[0])
        self.assertGreater(half_delta,0)
        self.assertLess(half_delta,full_delta*.6)

    def test_camera_does_not_jump_at_scroll_or_target_boundaries(self):
        path=render.CAPTURE_DIR/'capture.json'
        if not path.exists():self.skipTest('A real capture is required for camera coordinates.')
        data=json.loads(path.read_text())
        for shot in data['shots']:
            samples=[render.camera(shot,i/250) for i in range(round(shot['duration']*250))]
            for a,b in zip(samples,samples[1:]):
                self.assertLess(abs(a[0]-b[0]),.015,f"Zoom discontinuity in {shot['id']}")
                self.assertLess(abs(a[1]-b[1]),20,f"Horizontal jump in {shot['id']}")
                self.assertLess(abs(a[2]-b[2]),20,f"Vertical jump in {shot['id']}")
            for scroll in shot['scrolls']:
                midpoint=(scroll['start']+scroll['end'])/2
                self.assertEqual(render.camera(shot,midpoint),(1.,960.,540.))

    def test_fractional_transform_preserves_subpixel_camera_motion(self):
        # Integer crop rounding caused stepping in the previous zoom pipeline.
        a=render.frame_geometry(1.4,960.01,540.01)
        b=render.frame_geometry(1.4,960.02,540.02)
        self.assertAlmostEqual(b[0]-a[0],.01,places=7)
        self.assertAlmostEqual(b[1]-a[1],.01,places=7)

    def test_timeline_exactly_covers_290_seconds_and_captured_actions(self):
        timeline=render.TIMELINE
        self.assertEqual(timeline[0]['start'],0);self.assertEqual(timeline[-1]['end'],290)
        for a,b in zip(timeline,timeline[1:]):self.assertEqual(a['end'],b['start'])
        path=render.CAPTURE_DIR/'capture.json'
        if not path.exists():self.skipTest('Real capture not yet available.')
        data=json.loads(path.read_text());shots={s['id']:s for s in data['shots']}
        for scene in timeline:
            if scene['kind']=='app':self.assertEqual(scene['end']-scene['start'],shots[scene['shot']]['duration'])
        self.assertEqual(data['sourceId'],'KAZ_S_159')
        self.assertEqual(data['snapshotId'],'unep-mars-675417694883')
        self.assertEqual(data['pageErrors'],[])
        self.assertEqual(data['claims']['result'],'insufficient_evidence')
        self.assertEqual(data['claims']['receipt'],'none')

    def test_enter_and_exit_camera_are_still_for_every_demo(self):
        path=render.CAPTURE_DIR/'capture.json'
        if not path.exists():self.skipTest('Real capture not yet available.')
        for shot in json.loads(path.read_text())['shots']:
            self.assertEqual(render.camera(shot,0),(1.,960.,540.))
            self.assertEqual(render.camera(shot,shot['duration']-.04),(1.,960.,540.))

if __name__=='__main__':unittest.main()
