"""Synchronize an actual action-logged capture; preserve prior films/evidence."""
import argparse,hashlib,importlib.util,json,shutil,subprocess
from pathlib import Path
import numpy as np
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
OUT=ROOT/'delivery-output/final-v17';OLD=ROOT/'delivery-output/final-v15-TAKE01'
EVIDENCE=ROOT/'docs/evidence/video-v17-2026-10-22'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def dump(p,x):p.write_text(json.dumps(x,indent=2,ensure_ascii=False)+'\n')
def main(capture_root=None,output_root=None,sync_only=False):
    global OUT
    capture=next((capture_root or OUT/'raw-take8').resolve().rglob('capture.json'));
    if output_root:OUT=output_root;OUT.mkdir(parents=True,exist_ok=True)
    raw=capture.parent;video=raw/'video.webm';meta=json.loads(capture.read_text());assert meta['status']=='complete','Never render an incomplete capture as complete'
    cache=OUT/('sync-pixels-'+sha(video)[:16]+'.npz')
    if cache.exists():
        arrays=np.load(cache);pix=arrays['pix'];strip=arrays['strip']
    else:
        pix=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(video),'-vf','fps=25,scale=1:1','-pix_fmt','rgb24','-f','rawvideo','-']),np.uint8).reshape(-1,3).astype(int)
        strip=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(video),'-vf','fps=25,crop=96:12:0:0','-pix_fmt','rgb24','-f','rawvideo','-']),np.uint8).reshape(-1,12,96,3)[:,6,2::4,:].astype(int)
        np.savez(cache,pix=pix,strip=strip)
    offsets=[];missing=[]
    for s in meta['shots']:
        match=np.flatnonzero(np.max(abs(pix-np.array(s['color'])),axis=1)<7)
        if len(match)<1:missing.append(s);continue
        s['start']=(int(match[-1])+1)/25;s['slateStart']=int(match[0])/25;s['sync']='observed visual slate'
        offsets.append(s['startWall']/1000-s['start'])
    # Per-action visual codes avoid the global-clock drift observed in take5.
    # Code pixels are 24 cells, 4px wide. Sentinel and checksum reject UI pixels.
    assert len(offsets)>=6,'Insufficient visually observed scene anchors'
    observed_codes={}
    for frame,row in enumerate(strip):
        if any(np.max(abs(row[i]-np.array(color)))>45 for i,color in [(0,[255,0,255]),(1,[0,255,255]),(22,[255,0,255]),(23,[0,255,255])]):continue
        bits=(row[2:22].mean(axis=1)>127).astype(int)
        code=sum(int(b)<<(15-i)for i,b in enumerate(bits[:16]))
        check=sum(int(b)<<(3-i)for i,b in enumerate(bits[16:]))
        if check!=((code^(code>>4)^(code>>8)^(code>>12))&15):continue
        observed_codes.setdefault(code,[]).append(frame/25)
    anchors=[(s['startWall']/1000,s['start'])for s in meta['shots']if 'start'in s]
    coverage=[];excluded_sensitive=[];interpolated_phases=[]
    for a in meta['actions']:
        for field,phase in [('settledAt',0),('arrivedAt',1),('performAt',2),('end',3)]:
            if field not in a:continue
            code=a['id']*8+phase;frames=observed_codes.get(code,[])
            if a.get('sensitive')and len(frames)<1:
                excluded_sensitive.append({'actionId':a['id'],'phase':field,'reason':'Credential action excluded from every edited interval'});continue
            if not frames and field!='performAt':
                interpolated_phases.append({'actionId':a['id'],'phase':field,'reason':'Browser repaint skipped this phase; interpolated between adjacent visual anchors'});continue
            assert len(frames)>=1,('Missing action sync code',a['id'],field,len(frames))
            anchors.append((a[field]/1000,frames[0]));coverage.append({'actionId':a['id'],'phase':field,'videoTime':frames[0],'visibleFrames':len(frames)})
    anchors.sort();aw=np.array([x[0]for x in anchors]);av=np.array([x[1]for x in anchors])
    assert np.all(np.diff(aw)>0)and np.all(np.diff(av)>=0),'Visual code ordering changed'
    def clock(ms):return float(np.interp(ms/1000,aw,av))
    for s in missing:
        s.update(start=clock(s['startWall']),slateStart=clock(s['startWall']-700),sync='Local piecewise action-code mapping; no scene slate observed')
    duration=float(json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(video)]))['format']['duration'])
    for i,s in enumerate(meta['shots']):s['end']=meta['shots'][i+1]['slateStart'] if i+1<len(meta['shots'])else duration
    for a in meta['actions']:
        for k in ['start','settledAt','moveStart','arrivedAt','performAt','end']:
            if k in a:a[k]=clock(a[k])
    for p in meta['points']:p['time']=clock(p['time'])
    meta.update(video=str(video.relative_to(ROOT)),videoSha256=sha(video),duration=duration,
        clockMethod='Piecewise visual action-phase codes + observed scene slates',
        globalClockDriftSeconds=float(max(offsets)-min(offsets)),
        visualActionSyncCoverage=coverage,interpolatedSyncPhases=interpolated_phases,excludedSensitiveSyncPhases=excluded_sensitive,actionSyncResolutionSeconds=.04,
        synchronizationLimitation='Code is observed on a 25fps frame; Quantization is one 25fps frame; skipped browser repaints can add uncertainty. No sub-frame or hardware latency accuracy claimed; inspect the action frames.')
    dump(OUT/'sync.json',meta)
    if sync_only:
        print(json.dumps({'actions':len(meta['actions']),'syncPhases':len(coverage),'syncResolutionSeconds':.04}));return
    for name in ['captions.json','captions.en.srt','narration-manifest.json','final-mix.wav','narration.wav','mix-manifest.json']:
        dest=OUT/name
        if dest.exists():assert sha(dest)==sha(OLD/name)
        else:shutil.copy2(OLD/name,dest)
    facts=json.loads((ROOT/'delivery-output/final-v16/verified-facts.json').read_text())
    facts.update(trustedDigest=json.loads((raw/'trusted-decision-digest.json').read_text())['digest'])
    dump(OUT/'verified-facts.json',facts)
    print(json.dumps({'seconds':duration,'actions':len(meta['actions']),'points':len(meta['points']),'syncPhases':len(coverage),'syncResolutionSeconds':.04}))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--capture',type=Path);p.add_argument('--output',type=Path);p.add_argument('--sync-only',action='store_true');args=p.parse_args();main(args.capture,args.output,args.sync_only)
