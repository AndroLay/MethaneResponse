#!/usr/bin/env python3
"""Inspect this export, not a previous revision. Does not certify human taste."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import wave
import numpy as np
from PIL import Image,ImageDraw

HERE=Path(__file__).resolve().parent
REPO=HERE.parents[2]
OUT=REPO/'delivery-output/story-v12'
VIDEO=OUT/'MethaneResponse-Final-Presentation-Demo-v12.mp4'

def run(args):
    p=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if p.returncode:raise RuntimeError(p.stderr.decode(errors='replace')[-1600:])
    return p.stdout

def silence():
    with wave.open(str(OUT/'narration.wav')) as f:
        sr=f.getframerate();a=np.frombuffer(f.readframes(f.getnframes()),'<i2').astype(float)/32768
    n=round(sr*.01)
    rms=np.array([np.sqrt(np.mean(a[i:i+n]**2)) for i in range(0,len(a),n)])
    quiet=rms<10**(-42/20);events=[];begin=None
    for i,q in enumerate(quiet.tolist()+[False]):
        if q and begin is None:begin=i
        elif not q and begin is not None:
            if (i-begin)*.01>=.4:events.append({'start':round(begin*.01,2),'end':round(i*.01,2),'duration':round((i-begin)*.01,2)})
            begin=None
    result={'input':'narration.wav','analysis':'10 ms RMS, below -42 dBFS for at least 400 ms',
      'maxSilenceSeconds':max(e['duration'] for e in events),'events':events}
    (OUT/'silence-analysis.json').write_text(json.dumps(result,indent=2))
    if result['maxSilenceSeconds']>3.2:raise RuntimeError('Unexpectedly long quiet interval in voice track.')
    return result

def main():
    silence_result=silence()
    tests=[]
    for p in [HERE/'test_timing.py',REPO/'docs/demo/delivery-2026-10-19-directed-v10/test_render.py']:
        r=subprocess.run([sys.executable,str(p)],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        log=r.stdout.decode()+r.stderr.decode();tests.append({'path':str(p.relative_to(REPO)),'exitCode':r.returncode,'output':log})
        if r.returncode:raise RuntimeError(log[-2000:])
    timeline=json.loads((OUT/'timeline.json').read_text());duration=timeline[-1]['end']
    pts=json.loads(run(['ffprobe','-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',str(VIDEO)]))['frames']
    times=np.array([float(f['best_effort_timestamp_time']) for f in pts]);steps=np.diff(times)
    if len(pts)!=round(duration*25) or np.max(np.abs(steps-.04))>1e-6:raise RuntimeError('Nonconstant frame cadence or wrong number of frames.')
    embedded=run(['ffmpeg','-v','error','-i',str(VIDEO),'-map','0:s:0','-f','srt','-']).decode()
    expected=(OUT/'captions.en.srt').read_text()
    if embedded.replace('\r\n','\n').strip()!=expected.strip():raise RuntimeError('Embedded subtitles differ from the supplied SRT.')
    audit=Path('/home/andro/.codex/plugins/cache/creative-studio-local/product-studio/1.0.0/skills/video-quality-review/scripts/audit_video.py')
    review=OUT/'review-final'
    chosen=['system','source','catalog','observations','audit','result','original'];cuts=[s['start'] for s in timeline if s['id'] in chosen]
    if review.exists():raise RuntimeError('Preserve existing audit; use a fresh directory for another export.')
    run([sys.executable,str(audit),str(VIDEO),'--spec',str(HERE/'delivery-spec.json'),'--output-dir',str(review),'--cuts',','.join(map(str,cuts))])
    report=json.loads((review/'report.json').read_text())
    native=OUT/'review-joins';native.mkdir(exist_ok=False)
    samples=[]
    for join in [s['start'] for s in timeline if s['id'] in ['system','source','catalog','audit','result','casework','original']]:
        for offset in [-.04,0,.20,.45,.85,1.1]:
            t=round(join+offset,3);p=native/f'{t:.3f}.png'
            run(['ffmpeg','-v','error','-ss',str(t),'-i',str(VIDEO),'-frames:v','1',str(p)])
            samples.append((t,p))
    cols=4;rows=(len(samples)+cols-1)//cols
    contact=Image.new('RGB',(cols*480,rows*288),'#071723')
    for i,(t,p) in enumerate(samples):
        x=i%cols*480;y=i//cols*288;contact.paste(Image.open(p).resize((480,270)),(x,y));ImageDraw.Draw(contact).text((x+10,y+272),f'{t:.3f}s',fill='white')
    contact.save(native/'contact.png')
    summary={'videoSha256':hashlib.sha256(VIDEO.read_bytes()).hexdigest(),'videoBytes':VIDEO.stat().st_size,
      'durationSeconds':duration,'frameCount':len(pts),'allFrameStepsSeconds':.04,
      'tests':tests,'embeddedCaptionsMatchSidecar':True,'maximumActualVoiceQuietSeconds':silence_result['maxSilenceSeconds'],
      'technicalAudit':'review-final/report.json','technicalChecks':report.get('checks'),
      'joinSamples':len(samples),'creativeStatus':'not_reviewed_full_playback_and_listening',
      'scope':'Local render, actual existing local capture; no new app functionality, no deployment, no upload.'}
    (OUT/'verification-summary.json').write_text(json.dumps(summary,indent=2))
    sources={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in HERE.iterdir() if p.is_file() and p.suffix in ['.py','.json']}
    (OUT/'production-source-hashes.json').write_text(json.dumps(sources,indent=2))
    print(json.dumps({k:v for k,v in summary.items() if k not in ['tests','technicalChecks']}))

if __name__=='__main__':main()
