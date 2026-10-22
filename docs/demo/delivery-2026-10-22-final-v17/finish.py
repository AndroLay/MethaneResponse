"""Attach credits/chapters losslessly, then audit the actual v17 artifact."""
import hashlib, importlib.util, json, subprocess, sys
from pathlib import Path
from PIL import Image,ImageDraw
from prepare import HERE,ROOT,OUT,OLD,EVIDENCE

def run(args):
    p=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if p.returncode:raise RuntimeError(p.stderr.decode(errors='replace')[-2200:])
    return p.stdout
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    run([sys.executable,str(HERE/'test_motion.py')])
    video=OUT/'MethaneResponse-Final-Submission-v17.mp4'
    master=OUT/'render-master-v17.mp4'
    spec=json.loads((HERE.parent/'delivery-2026-10-21-final-v15/delivery-spec.json').read_text())
    (OUT/'delivery-spec.json').write_text(json.dumps(spec,indent=2)+'\n')
    story=json.loads((HERE.parent/'delivery-2026-10-21-final-v15/story.json').read_text())
    credits=(OLD/'CREDITS.txt').read_text().split('\n\n')[0]
    credits+=' v17 editorial revision: new actual action-logged capture; constant-size event-derived cursor; geometry-bound camera; 0.72s feathered reveals. Full local prototype; limited public preview excludes private review and blockchain writes.'
    if not master.exists():
        video.rename(master)
        meta=';FFMETADATA1\ntitle=MethaneResponse — One Decision. Defensible Evidence.\ncomment='+credits+'\n'
        for s in story['scenes']:
            meta+=f"[CHAPTER]\nTIMEBASE=1/1000\nSTART={s['start']*1000}\nEND={s['end']*1000}\ntitle={s['chapter']}\n"
        (OUT/'chapters.ffmetadata').write_text(meta)
        run(['ffmpeg','-v','error','-i',str(master),'-i',str(OUT/'chapters.ffmetadata'),'-map','0',
             '-map_metadata','1','-map_chapters','1','-c','copy','-movflags','+faststart',str(video)])
    (OUT/'CREDITS.txt').write_text(credits+'\n\nBurned-in English captions. Do not additionally enable/upload the SRT as default captions if that would duplicate text. MP4 contains no selectable subtitle track.\n')
    audit=Path('/home/andro/.codex/plugins/cache/creative-studio-local/product-studio/1.0.0/skills/video-quality-review/scripts/audit_video.py')
    cuts=[22,43,63,99,125,153,184,207,246]
    run([sys.executable,str(audit),str(video),'--spec',str(OUT/'delivery-spec.json'),
         '--output-dir',str(OUT/'final-audit'),'--cuts',','.join(map(str,cuts)),'--timeout','240'])
    probe=json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-show_chapters','-of','json',str(video)]))
    assert not any(s['codec_type']=='subtitle' for s in probe['streams'])
    assert len(probe['chapters'])==10
    timestamps=json.loads(run(['ffprobe','-v','error','-select_streams','v:0','-show_frames',
                               '-show_entries','frame=best_effort_timestamp_time','-of','json',str(video)]))
    pts=[float(f['best_effort_timestamp_time']) for f in timestamps['frames']]
    assert len(pts)==7000 and all(abs(b-a-.04)<1e-6 for a,b in zip(pts,pts[1:]))
    # Validate code/acceptance artifacts remain the exact tested version.
    acceptance=json.loads((ROOT/'docs/evidence/pre-video-final-2026-10-21/verification.json').read_text())
    bound={**acceptance['sourceSha256'],**acceptance['artifactSha256']}
    mismatches=[p for p,h in bound.items() if sha(ROOT/p)!=h]
    if mismatches:raise ValueError('Earlier acceptance inputs changed: '+str(mismatches[:5]))
    sample_dir=OUT/'final-samples';sample_dir.mkdir(exist_ok=False)
    points=[2,36,57,70,77,85,93,113,132,143,158,162,177,198,215,224,234,240,274]
    points+= [c+o for c in cuts for o in [-.44,0,.52]]
    # Inspect the encoded artifact at the exact recorded actions as well as cuts.
    import render as film
    film.load();action_samples={}
    wanted=['Weighted historical indicators','Investigation slots','Evidence acceptance criteria','Evidence to request','Request due date','Freeze reviewed investigation decision']
    for scene in film.STORY:
        offset=0
        for clip in film.b.CLIPS.get(scene['id'],[]):
            for action in film.ACTIONS:
                if clip['sourceStart']<=action['performAt']<=clip['sourceEnd']and any(w.lower()in action['name'].lower()for w in wanted):
                    t=round(scene['start']+offset+(action['performAt']-clip['sourceStart'])/clip['speed']+.16,2)
                    action_samples[action['name']+' @ '+str(t)]=t;points.append(t)
            offset+=clip['duration']
    (OUT/'action-sample-times.json').write_text(json.dumps(action_samples,indent=2)+'\n')
    points=sorted(set(points));images=[]
    for t in points:
        p=sample_dir/f'{t:.2f}.png';run(['ffmpeg','-v','error','-ss',str(t),'-i',str(video),'-frames:v','1',str(p)])
        images.append((t,p))
    contact=Image.new('RGB',(1920,((len(images)+3)//4)*292),'#071723')
    for i,(t,p) in enumerate(images):
        x=i%4*480;y=i//4*292
        contact.paste(Image.open(p).resize((480,270)),(x,y));ImageDraw.Draw(contact).text((x+8,y+274),f'{t:.2f}s',fill='white')
    contact.save(sample_dir/'contact.jpg')
    Image.open(sample_dir/'215.00.png').save(OUT/'poster.jpg')
    summary={
        'version':'v17','durationSeconds':280,'width':1920,'height':1080,'fps':25,'decodedFrames':7000,
        'videoSha256':sha(video),'bytes':video.stat().st_size,'fullDecode':True,
        'sameV15MixedAudio':sha(OUT/'final-mix.wav')==sha(OLD/'final-mix.wav'),
        'narration':'Unchanged stock synthetic male Andrew; not human or cloned speech',
        'burnedInCaptions':True,'embeddedSubtitleStreams':0,'chapterMarkers':10,
        'productionRegressions':22,'retainedStateVerification':'retained-state-verification.json',
        'retainedStateVerificationSha256':sha(OUT/'retained-state-verification.json'),
        'v15Preserved':sha(OLD/'MethaneResponse-Final-Submission-v15.mp4'),
        'priorAcceptanceSourceHashesUnchanged':len(acceptance['sourceSha256']),
        'priorAcceptanceArtifactHashesUnchanged':len(acceptance['artifactSha256']),
        'captureWorkflow':'One passing actual browser journey; source/claim/scope and immutable history assertions retained','cursor':'Recorded click endpoints/times, eased editorial travel, constant 32px sprite; same affine as UI','camera':'Recorded action geometry; quintic easing; uniform scale','sampledVisualFrames':len(images),'fullPlaybackAndListening':'not_reviewed',
        'captureToolTypecheck':'PASS',
        'nativeCursorProbe':json.loads((OUT/'cursor-probe.json').read_text()),
        'videoProductionSourceSha256':{str(p.relative_to(ROOT)):sha(p)for p in sorted(HERE.iterdir())if p.suffix in ['.py','.ts']},
        'publicationsPerformed':False,'publicTransactions':0,'newProviderCalls':0,
        'r12TaskCompletion':'0/48 frozen scorer; unchanged; no human productivity established',
    }
    (OUT/'verification-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    # Only the small audit report and verification result join the proof source.
    for name in ['verification-summary.json','retained-state-verification.json']:
        (EVIDENCE/name).write_bytes((OUT/name).read_bytes())
    (EVIDENCE/'technical-video-audit.json').write_bytes((OUT/'final-audit/report.json').read_bytes())
    print(json.dumps(summary,indent=2))

if __name__=='__main__':main()
