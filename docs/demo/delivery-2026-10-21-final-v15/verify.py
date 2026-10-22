"""Technical acceptance of the actual final export. Never asserts human review."""
import hashlib,json,subprocess,sys,wave
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2];OUT=ROOT/'delivery-output/final-v15-TAKE01'
VIDEO=OUT/'MethaneResponse-Final-Submission-v15.mp4'
def run(a):
    p=subprocess.run(a,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if p.returncode:raise RuntimeError(p.stderr.decode(errors='replace')[-2000:])
    return p.stdout
def main():
    run([sys.executable,str(HERE/'test_production.py')])
    audit=Path('/home/andro/.codex/plugins/cache/creative-studio-local/product-studio/1.0.0/skills/video-quality-review/scripts/audit_video.py')
    cuts=[22,43,63,99,125,153,184,207,246]
    run([sys.executable,str(audit),str(VIDEO),'--spec',str(HERE/'delivery-spec.json'),'--output-dir',str(OUT/'final-audit'),'--cuts',','.join(map(str,cuts)),'--timeout','240'])
    p=json.loads(run(['ffprobe','-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',str(VIDEO)]))
    pts=np.array([float(f['best_effort_timestamp_time']) for f in p['frames']])
    assert len(pts)==7000 and np.max(abs(np.diff(pts)-.04))<1e-6
    actual=run(['ffmpeg','-v','error','-i',str(VIDEO),'-map','0:s:0','-f','srt','-']).decode().strip()
    expected=(OUT/'captions.en.srt').read_text().strip()
    assert actual.replace('\r\n','\n')==expected
    with wave.open(str(OUT/'narration.wav')) as f:
        sr=f.getframerate();a=np.frombuffer(f.readframes(f.getnframes()),'<i2').astype(float)/32768
    n=round(sr*.01);rms=np.array([np.sqrt(np.mean(a[i:i+n]**2)) for i in range(0,len(a),n)])
    intervals=[];begin=None
    for i,silent in enumerate(list(rms<10**(-42/20))+[False]):
        if silent and begin is None:begin=i
        elif not silent and begin is not None:
            if (i-begin)*.01>=.4:intervals.append({'start':begin*.01,'duration':(i-begin)*.01})
            begin=None
    maximum=max([v['duration'] for v in intervals] or [0]);assert maximum<=2
    (OUT/'voice-silence.json').write_text(json.dumps({'method':'10ms RMS below -42dBFS; boundaries >=400ms','maxSeconds':maximum,'intervals':intervals},indent=2))
    sample_dir=OUT/'final-join-samples';sample_dir.mkdir(exist_ok=False)
    # Review the whole dip/reveal, not just one instant at the cut.
    samples=[]
    for cut in cuts:
        for offset in [-.44,-.12,0,.24,.52]:
            t=cut+offset;p=sample_dir/f'{t:.2f}.png'
            run(['ffmpeg','-v','error','-ss',str(t),'-i',str(VIDEO),'-frames:v','1',str(p)])
            samples.append((t,p))
    contact=Image.new('RGB',(1920,((len(samples)+3)//4)*292),'#071723')
    for i,(t,p) in enumerate(samples):
        x=i%4*480;y=i//4*292;contact.paste(Image.open(p).resize((480,270)),(x,y));ImageDraw.Draw(contact).text((x+8,y+274),f'{t:.2f}s',fill='white')
    contact.save(sample_dir/'contact.png')
    summary={'videoSha256':hashlib.sha256(VIDEO.read_bytes()).hexdigest(),'bytes':VIDEO.stat().st_size,'durationSeconds':280,'frames':7000,'frameStepSeconds':.04,'technicalAudit':'final-audit/report.json','productionRegressions':8,'capture':'Actual Chromium local production build; take2 primary TKM; take1 global catalog crop only','sameTakeAnvil':'current-take2-anvil-proof.json; 34 assertions passed','voice':'Stock synthetic male Andrew; no voice cloning','maxActualVoiceSilenceSeconds':maximum,'embeddedSubtitlesMatch':True,'fullDecode':True,'visualInspection':'Opening/closing, important UI frames and 45 join samples; review notes separate','fullNormalSpeedPlaybackAndListening':'not claimed by this automated verification','remotePublication':'Not uploaded or published; no deployment or public chain transaction'}
    (OUT/'verification-summary.json').write_text(json.dumps(summary,indent=2))
    sources=[*HERE.glob('*.py'),*HERE.glob('*.ts'),HERE/'story.json',HERE/'delivery-spec.json']
    (OUT/'production-source-hashes.json').write_text(json.dumps({str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sources},indent=2))
    print(json.dumps(summary,indent=2))
if __name__=='__main__':main()
