"""Audit the actual v18 MP4; separate technical checks from sampled review."""
import io,json,math,subprocess,sys
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
import pipeline as p

def frame(path,t):
    data=p.run(['ffmpeg','-v','error','-threads','1','-ss',str(t),'-i',str(path),'-frames:v','1','-f','image2pipe','-vcodec','png','-'])
    return Image.open(io.BytesIO(data)).convert('RGB')

def main():
    p.run([sys.executable,str(p.HERE/'test_revision.py')])
    p.run([sys.executable,str(p.HERE.parent/'delivery-2026-10-22-final-v17/test_motion.py')])
    dest=p.OUT/'MethaneResponse-Final-Submission-v18.mp4'
    tool=Path('/home/andro/.codex/plugins/cache/creative-studio-local/product-studio/1.0.0/skills/video-quality-review/scripts/audit_video.py')
    cuts=[22,43,63,99,125,153,166,175,184,207,246,263]
    p.run([sys.executable,str(tool),str(dest),'--spec',str(p.OUT/'delivery-spec.json'),
           '--output-dir',str(p.OUT/'final-audit'),'--cuts',','.join(map(str,cuts)),'--timeout','240'])
    audit=json.loads((p.OUT/'final-audit/report.json').read_text())
    assert all(c['status']=='pass'for c in audit['checks'])
    probe=json.loads(p.run(['ffprobe','-v','error','-show_streams','-show_format','-show_chapters','-of','json',str(dest)]))
    assert not any(s['codec_type']=='subtitle'for s in probe['streams'])
    assert len(probe['chapters'])==11
    frames=json.loads(p.run(['ffprobe','-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',str(dest)]))['frames']
    pts=[float(f['best_effort_timestamp_time'])for f in frames]
    assert len(pts)==7425 and all(abs(b-a-.04)<1e-6 for a,b in zip(pts,pts[1:]))
    acceptance=json.loads((p.ROOT/'docs/evidence/pre-video-final-2026-10-21/verification.json').read_text())
    bound={**acceptance['sourceSha256'],**acceptance['artifactSha256']}
    assert all(p.sha(p.ROOT/name)==digest for name,digest in bound.items())
    review=p.OUT/'final-samples';review.mkdir(exist_ok=False)
    times=[12,20,83.2,156.1,164.64,168.2,178,190,198,224,247,250,255,260,262.24,262.64,263.8,295.5]
    times+= [cut+delta for cut in [22,153,166,175,184,246,263]for delta in [-.04,.36,.76]]
    images=[]
    for t in sorted(set(times)):
        path=review/f'{t:.2f}.png';frame(dest,t).save(path);images.append((t,path))
    contact=Image.new('RGB',(1920,math.ceil(len(images)/4)*292),'#071723')
    for i,(t,path)in enumerate(images):
        x=i%4*480;y=i//4*292;contact.paste(Image.open(path).resize((480,270)),(x,y))
        ImageDraw.Draw(contact).text((x+5,y+274),f'{t:.2f}s',fill='white')
    contact.save(review/'contact.jpg');Image.open(review/'260.00.png').save(p.OUT/'poster.jpg')
    # Check the actual encoded UI pane against v17: unchanged camera and clicks,
    # with normal bounded H.264 generation loss. Banners are outside this pane.
    comparisons=[]
    for t in [83.2,113,164.64,198,224,234]:
        original=np.asarray(frame(p.SOURCE,t).crop((128,188,1792,968)),dtype=np.float32)
        revised=np.asarray(frame(dest,t).crop((128,188,1792,968)),dtype=np.float32)
        rmse=float(np.sqrt(np.mean((original-revised)**2)))
        comparisons.append(dict(seconds=t,uiPaneRgbRmse=rmse));assert rmse<10,(t,rmse)
    voice=p.read_pcm(p.OUT/'narration.wav').astype(np.float32)/32768
    quiet=np.sqrt(np.mean(voice.reshape(-1,480)**2,axis=1))<10**(-42/20)
    edges=np.diff(np.r_[False,quiet,False].astype(int));starts=np.flatnonzero(edges==1);ends=np.flatnonzero(edges==-1)
    gaps=[dict(start=round(a*.01,2),end=round(b*.01,2),seconds=round((b-a)*.01,2))for a,b in zip(starts,ends)if b-a>=40]
    maximum=max(g['seconds']for g in gaps)
    assert maximum<2,'Unexpected long narration silence'
    summary=dict(version='v18',durationSeconds=297,width=1920,height=1080,fps=25,decodedFrames=7425,
        videoSha256=p.sha(dest),bytes=dest.stat().st_size,technicalChecksPassed=len(audit['checks']),
        newRevisionRegressions=12,retainedMotionRegressions=22,sampledVisualFrames=len(images),uiPaneComparisons=comparisons,
        maxNarrationQuietIntervalSeconds=maximum,narrationQuietMethod='10ms RMS below -42dBFS; intervals >=400ms',
        silenceIntervals=gaps,embeddedSubtitleStreams=0,chapters=11,
        v17Sha256=p.sha(p.SOURCE),newSpeech='Two selected stock synthetic Andrew cues; three short candidates generated; no voice cloning',
        sourceHashesUnchanged=len(acceptance['sourceSha256']),artifactHashesUnchanged=len(acceptance['artifactSha256']),
        sourceVideo='Same v17 TKM take8; separate archived KAZ AI and same-take Anvil local proof retained',
        claimBoundary='Field actions and measured emissions reductions are potential, not demonstrated outcomes',
        fullNormalSpeedPlaybackAndListening='not_reviewed; technical measurements and sampled frame review only',
        publicTransactions=0,assessmentModelProviderCalls=0,uploaded=False,deployed=False,
        r12TaskCompletion='0/48 frozen scorer; unchanged',
        productionSourceSha256={str(f.relative_to(p.ROOT)):p.sha(f)for f in sorted(p.HERE.glob('*.py'))})
    p.dump(p.OUT/'verification-summary.json',summary)
    evidence=p.ROOT/'docs/evidence/video-v18-2026-10-22';evidence.mkdir(exist_ok=False)
    for name,src in [('verification-summary.json',p.OUT/'verification-summary.json'),('technical-video-audit.json',p.OUT/'final-audit/report.json'),('edit.json',p.OUT/'edit.json')]:
        (evidence/name).write_bytes(src.read_bytes())
    print(json.dumps(summary,indent=2),flush=True)

if __name__=='__main__':main()
