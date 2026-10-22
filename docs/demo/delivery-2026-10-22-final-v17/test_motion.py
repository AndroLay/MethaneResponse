import hashlib,importlib.util,json,math,unittest
from prepare import HERE,ROOT,OUT,OLD,sha
from motion import *
spec=importlib.util.spec_from_file_location('film17',HERE/'render.py');film=importlib.util.module_from_spec(spec);spec.loader.exec_module(film)
class MotionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):film.load()
    def test_contiguous_280_second_story(self):
        self.assertEqual(sum(s['end']-s['start']for s in film.STORY),280)
        for a,b in zip(film.STORY,film.STORY[1:]):self.assertEqual(a['end'],b['start'])
    def test_unchanged_audio_and_subtitles(self):
        for name in ['final-mix.wav','captions.json','captions.en.srt']:self.assertEqual(sha(OUT/name),sha(OLD/name))
    def test_previous_films_preserved(self):
        self.assertEqual(sha(OLD/'MethaneResponse-Final-Submission-v15.mp4'),'c23e05776f8094c249364481e6b2304f4e9ecf7eb5251be46bc2bfde318df408')
        self.assertEqual(sha(ROOT/'delivery-output/final-v16/MethaneResponse-Final-Submission-v16.mp4'),'95ab00b68ac3c0322a49e88e135434d8bb8824db7a53078b2b9a8f66a4238046')
    def test_real_actions_cover_inputs_selections_and_clicks(self):
        self.assertTrue({'fill','click','selectOption','check','read'}<=set(a['kind']for a in film.ACTIONS))
    def test_no_values_in_capture(self):
        self.assertFalse(film.b.SYNC['valuesRecorded'])
        self.assertFalse(any('value'in a or 'args'in a for a in film.ACTIONS))
    def test_per_action_visual_sync(self):
        self.assertEqual(film.b.SYNC['actionSyncResolutionSeconds'],.04)
        covered={(c['actionId'],c['phase'])for c in film.b.SYNC['visualActionSyncCoverage']}
        for a in film.ACTIONS:
            if a.get('sensitive'):continue
            for k in ['performAt']:
                self.assertIn((a['id'],k),covered)
    def test_each_clip_duration_matches_scene(self):
        for s in film.STORY:
            if s['id']in film.b.CLIPS:self.assertEqual(sum(c['duration']for c in film.b.CLIPS[s['id']]),s['end']-s['start'])
    def test_sensitive_actions_excluded(self):
        for cs in film.b.CLIPS.values():
            for c in cs:self.assertFalse(any(a.get('sensitive')and a['start']<c['sourceEnd']and a['end']>c['sourceStart']for a in film.ACTIONS))
    def test_no_sync_slates_in_clips(self):
        for cs in film.b.CLIPS.values():
            for c in cs:
                for s in film.b.SYNC['shots']:
                    self.assertFalse(c['sourceStart']<s['start']-.04 and c['sourceEnd']>s['slateStart']+.04)
    def test_uniform_geometry(self):
        for z in [1,1.4,2.4]:
            s,tx,ty=affine((960,540,z));a=project((500,500),(960,540,z));b=project((600,500),(960,540,z));c=project((500,600),(960,540,z))
            self.assertAlmostEqual(b[0]-a[0],c[1]-a[1]);self.assertAlmostEqual(b[0]-a[0],100*s)
    def test_pointer_tracks_actual_events(self):
        p=[{'kind':'move','time':1,'x':300,'y':400},{'kind':'move','time':1.1,'x':500,'y':600}]
        self.assertIsNone(pointer_at(p,.9));self.assertAlmostEqual(pointer_at(p,1.05)[0],400);self.assertAlmostEqual(pointer_at(p,1.05)[1],500)
    def test_easing_has_zero_endpoint_velocity(self):
        self.assertEqual(ease(0),0);self.assertEqual(ease(1),1)
        self.assertLess(ease(.001),1e-7);self.assertLess(1-ease(.999),1e-7)
    def test_camera_bounds_and_return(self):
        for cs in film.b.CLIPS.values():
            for c in cs:
                times=[p[0]for p in c['_camera']];self.assertEqual(times,sorted(times))
                for i in range(int(c['duration']*25)):
                    cx,cy,z=camera(c,i/25,film.ACTIONS);s,tx,ty=affine((cx,cy,z));ox=(WINDOW[0]-tx)/s;oy=(WINDOW[1]-ty)/s
                    self.assertGreaterEqual(ox,-.01);self.assertGreaterEqual(oy,-.01)
                    self.assertLessEqual(ox+WINDOW[2]/s,1920.01);self.assertLessEqual(oy+WINDOW[3]/s,1080.01)
                self.assertEqual(camera(c,c['duration']-.04,film.ACTIONS),(960,540,1))
    def test_action_target_is_visible_when_performed(self):
        for cs in film.b.CLIPS.values():
            for c in cs:
                for a in film.ACTIONS:
                    t=local_time(c,a['performAt'])
                    if not a.get('box')or a.get('sensitive')or not(0<t<c['duration']-1.4):continue
                    box=a['box'];x,y=project((box['x']+min(box['width']/2,200),box['y']+box['height']/2),camera(c,t,film.ACTIONS))
                    self.assertTrue(WINDOW[0]<=x<=WINDOW[0]+WINDOW[2]and WINDOW[1]<=y<=WINDOW[1]+WINDOW[3],(a['name'],t,x,y))
    def test_camera_never_uses_a_whip_zoom(self):
        for cs in film.b.CLIPS.values():
            for c in cs:
                for a,b in zip(c['_camera'],c['_camera'][1:]):
                    if a[1]!=b[1]:self.assertGreaterEqual(b[0]-a[0],.8)
                zoom=[camera(c,i/25,film.ACTIONS)[2]for i in range(int(c['duration']*25))]
                self.assertLess(max(abs(a-b)for a,b in zip(zoom,zoom[1:])),.13)
    def test_actual_click_tip_remains_inside_rendered_pane(self):
        checked=0
        for cs in film.b.CLIPS.values():
            for c in cs:
                for p in film.POINTS:
                    t=local_time(c,p['time'])
                    if p['kind']!='down'or not(.65<t<c['duration']-.45):continue
                    x,y=project((p['x'],p['y']),camera(c,t,film.ACTIONS))
                    self.assertTrue(WINDOW[0]+4<x<WINDOW[0]+WINDOW[2]-34 and WINDOW[1]+4<y<WINDOW[1]+WINDOW[3]-38)
                    checked+=1
        self.assertEqual(checked,25)
    def test_same_take_chain_commitment(self):
        p=film.b.PROOF;raw=(ROOT/film.b.SYNC['video']).parent
        self.assertEqual(p['inputSha256'],sha(raw/'frozen-investigation-decision.json'))
        self.assertEqual(p['trustedDigest'],json.loads((raw/'trusted-decision-digest.json').read_text())['digest'])
        self.assertEqual(p['record']['decision'],json.loads((raw/'frozen-investigation-decision.json').read_text())['decision'])
        self.assertEqual(p['chainId'],31337);self.assertFalse(p['publicNetworkUsed']);self.assertEqual(p['providerCalls'],0)
    def test_actual_chain_failure_and_success(self):
        self.assertEqual([film.b.PROOF['checks'][k]['exitCode']for k in ['original','alteredRehashed','originalAgain','afterRestart']],[0,1,0,0])
    def test_separate_ai_case(self):
        self.assertEqual(film.FACTS['separateAIExampleSourceId'],'KAZ_S_159');self.assertNotIn('ai',film.b.CLIPS)
    def test_editorial_cursor_preserves_real_click_coordinates(self):
        count=0
        for p in film.PATHS:
            a=next(a for a in film.ACTIONS if a['id']==p['actionId'])
            downs=[e for e in film.POINTS if e['kind']=='down'and a['performAt']-.12<=e['time']<=a['end']+.12]
            if not downs:continue
            point=guided_pointer(film.POINTS,film.PATHS,downs[0]['time'])
            self.assertLess(math.hypot(point[0]-downs[0]['x'],point[1]-downs[0]['y']),.01,a['name']);count+=1
        self.assertGreater(count,30)
    def test_editorial_mouse_approach_has_no_endpoint_jump(self):
        for p in film.PATHS:
            at=guided_pointer(film.POINTS,film.PATHS,p['arrival'])
            before=guided_pointer(film.POINTS,film.PATHS,p['arrival']-.001)
            self.assertLess(math.hypot(at[0]-before[0],at[1]-before[1]),.1)
            self.assertLess(math.hypot(at[0]-p['target'][0],at[1]-p['target'][1]),.01)
    def test_frozen_r12_unchanged(self):
        self.assertEqual(sha(ROOT/'docs/evidence/agent-practical-usefulness-2026-10-21-r12/results.json'),'2ebe52a1ee151cd313feaf2e3361d0a7942ada690ccded03885617f3f3784cf1')
if __name__=='__main__':unittest.main()
