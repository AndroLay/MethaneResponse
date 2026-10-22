#!/usr/bin/env python3
"""Final documentary edit: actual UI, authored diagrams, retained proof data.

Camera transforms use fractional coordinates and fixed focus regions. No cursor
is added to stills. The recorded browser cursor remains part of actual footage.
"""
import bisect,concurrent.futures,hashlib,json,math,multiprocessing,os,subprocess,sys
from functools import lru_cache
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
OUT=ROOT/'delivery-output/final-v15-TAKE01';FPS=25;W=1920;H=1080
sys.path.insert(0,str(HERE.parent/'delivery-2026-10-19-final-v12'))
from visuals import background,text,lines,rect,line,dot,ease,lerp,font,TEAL,WHITE,MUTED,AMBER,CORAL,INK
STORY=json.loads((HERE/'story.json').read_text())['scenes']
SYNC=None;PROOF=None;CAPTIONS=[];CLIPS={};CAP_STARTS=[];PLAN_EXPLANATIONS=None
def run(a):
    p=subprocess.run(a,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if p.returncode:raise RuntimeError(p.stderr.decode(errors='replace')[-1800:])
    return p.stdout
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def load():
    global SYNC,PROOF,CAPTIONS,CAP_STARTS,CLIPS,PLAN_EXPLANATIONS
    SYNC=json.loads((OUT/'sync.json').read_text());PROOF=json.loads((OUT/'current-take2-anvil-proof.json').read_text())
    if sha(ROOT/SYNC['video'])!=SYNC['videoSha256']:raise ValueError('Capture hash mismatch')
    raw=(ROOT/SYNC['video']).parent
    pin=json.loads((raw/'trusted-decision-digest.json').read_text())['digest']
    decision=json.loads((raw/'frozen-investigation-decision.json').read_text())
    if PROOF['trustedDigest']!=pin or PROOF['record']['decision']!=decision['decision']:raise ValueError('Same-source/same-decision continuity failed')
    assert PROOF['sourceId']=='TKM_S_021' and PROOF['chainId']==31337 and not PROOF['publicNetworkUsed']
    checks=PROOF['checks'];assert [checks[k]['exitCode'] for k in ['original','alteredRehashed','originalAgain','afterRestart']]==[0,1,0,0]
    # Produced by the app's plannerDisposition(report, sourceId, strategy),
    # after verifyInvestigationPortfolio replay passed. Initial wrong argument
    # order was rejected; never use its unknown_source diagnostic as a result.
    PLAN_EXPLANATIONS=json.loads((OUT/'planner-explanations.json').read_text())
    report=PROOF['record']['decision']['dossier']['plans'][0]['reports'][0]
    assert PLAN_EXPLANATIONS['reportDigest']==report['digest']
    assert PLAN_EXPLANATIONS['parameters']==report['input']['parameters']
    assert PLAN_EXPLANATIONS['rows']==[{'sourceId':'BHR_S_003','reason':'selected'},{'sourceId':'IRN_S_001','reason':'country_quota_filled'}]
    CAPTIONS=json.loads((OUT/'captions.json').read_text());CAP_STARTS=[x['start'] for x in CAPTIONS]
    s=SYNC['shots'];at=lambda i,offset=0:s[i]['start']+offset
    end=lambda i,offset=0:s[i]['end']-.20+offset
    # Each clip is an actual contiguous recording interval. Reading holds and
    # bounded slow motion are editorial and explicitly retained in edit.json.
    def clip(i,duration,speed=1,offset=0,stop=None,z=1.45,cx=1050,cy=560,note=''):
        return dict(sourceStart=at(i,offset),sourceEnd=stop or end(i),duration=duration,speed=speed,zoom=z,cx=cx,cy=cy,note=note)
    global_video=next((OUT/'raw').rglob('video.webm'))
    global_clip=dict(sourceStart=9.76,sourceEnd=17.15,duration=9,speed=.85,zoom=1.05,cx=960,cy=540,sourceVideo=str(global_video.relative_to(ROOT)),sourceSha256=sha(global_video),sourceCrop='1180:664:285:244',catalogOnly=True,note='Actual global map from take1, cropped to catalog globe; no case-specific claim in this interval')
    CLIPS={
      'globe':[global_clip,clip(0,11,.8,z=1.35,cx=1430,cy=540,note='Actual selected TKM source from final take2; reading hold')],
      'planner':[clip(1,18,.9,z=1.5,cx=850,cy=650),clip(2,18,.75,z=1.5,cx=850,cy=610)],
      'scope':[clip(4,26,.48,z=1.45,cx=900,cy=440,note='Actual source/claim/scope with reading hold; DEMO question')],
      'request':[clip(5,10,1.35,offset=0,z=1.5,cx=900,cy=480),clip(7,7,1.0,stop=min(at(7)+5.5,end(7)),z=1.5,cx=900,cy=580),clip(8,14,1.15,z=1.5,cx=900,cy=700)],
      'revisit':[clip(9,23,.8,z=1.5,cx=900,cy=650)]}
    (OUT/'edit.json').write_text(json.dumps({'actualCapture':SYNC['video'],'captureSha256':SYNC['videoSha256'],'sameTakeProof':'current-take2-anvil-proof.json','trustedDigest':pin,'clips':CLIPS,'notes':['Authentic UI footage; fixed-region editorial zoom; bounded slow motion and reading holds.','Separate KAZ AI segment uses an archival screenshot and no synthetic cursor.','Proof scene renders measured local test results, not a fabricated app or public explorer.']},indent=2))
def label(im,xy,s,color=TEAL):text(im,xy,s.upper(),20,color,True)
def pill(im,xy,s,color=TEAL,size=20):
    w=font(size,True).getlength(s)+30;x,y=xy
    rect(im,(x,y,x+w,y+36),fill=tuple(int(v*.15) for v in color),outline=color,radius=9,stroke=1)
    text(im,(x+15,y+6),s,size,color,True);return w
def top(im,scene,t):
    text(im,(96,35),'METHANERESPONSE',22,TEAL,True)
    text(im,(96,69),scene['chapter'],32,WHITE,True)
    group=0 if scene['start']<99 else 1 if scene['start']<184 else 2
    x=1370
    for i,name in enumerate(['PLAN','INVESTIGATE','VERIFY']):
        text(im,(x,45),name,18,TEAL if i==group else MUTED,True)
        line(im,[(x,82),(x+125,82)],TEAL if i==group else (32,62,72),3)
        x+=155
    line(im,[(96,106),(1824,106)],(33,70,82),1)
    line(im,[(96,106),(96+1728*(scene['start']+t)/280,106)],TEAL,2)
def caption(im,absolute):
    i=bisect.bisect_right(CAP_STARTS,absolute)-1
    if i<0 or absolute>CAPTIONS[i]['end']:return
    value=CAPTIONS[i]['text'];f=font(31,True);ww=f.getlength(value)
    x=(1920-ww)/2
    rect(im,(x-22,1006,x+ww+22,1062),fill=(4,13,21),outline=(4,13,21),radius=10)
    text(im,(x,1016),value,31,WHITE,True)
def title(im,kicker,value,t,size=66):
    u=ease(t/.8);label(im,(128,165+12*(1-u)),kicker)
    lines(im,(128,211+16*(1-u)),value,size,1630,WHITE,True,spacing=1.1)
def card(im,x,y,w,h,num,heading,body,t=5,color=TEAL):
    rect(im,(x,y,x+w,y+h),fill=(12,35,47),outline=(38,78,89),radius=20)
    label(im,(x+28,y+24),num,color)
    text(im,(x+28,y+66),heading,32,WHITE,True)
    lines(im,(x+28,y+122),body,25,w-58,MUTED,spacing=1.28)
def arrows(im,x,y,w=88,t=5):
    u=ease(t/.8);line(im,[(x,y),(x+w*u,y)],TEAL,3)
    if u>.95:line(im,[(x+w-12,y-8),(x+w,y),(x+w-12,y+8)],TEAL,3)
def hook(im,t):
    title(im,'The investigation bottleneck','Thousands of observations.\nOnly ten investigations.',t)
    # Explicit conceptual count graphic, not a methane heat map.
    for r in range(5):
        for c in range(22):
            u=ease((t-.5-(r*22+c)*.006)/.6)
            dot(im,152+c*29,458+r*31,5,TEAL,u*.7)
    label(im,(128,660),'Limited team capacity')
    for i in range(10):
        x=128+i*96;u=ease((t-1.3-i*.08)/.5)
        rect(im,(x,705,x+76,785),fill=(11,48,57),outline=TEAL,radius=12,a=u)
        text(im,(x+25,724),str(i+1),31,TEAL,True,a=u)
    if t>6:
        rect(im,(1130,430,1790,820),fill=(14,38,49),outline=(55,103,115),radius=24)
        lines(im,(1170,470),'Which ten?\nWhat evidence?\nCan we defend it?',44,570,WHITE,True,spacing=1.55)
    label(im,(128,900),'For analysts · regulators · environmental investigators',MUTED)
    text(im,(128,948),'Conceptual workflow illustration · no measured productivity claim',20,MUTED)
def position(im,t):
    title(im,'Build on the science','From observations to decisions.',t)
    card(im,128,390,700,370,'UNEP MARS','Detect · Notify · Follow up','Official observations and alert/response processes.\nWe use a pinned historical dataset.',t)
    arrows(im,850,575,110,t-1)
    card(im,995,390,790,370,'METHANERESPONSE','Plan · Investigate · Verify','Allocate investigation capacity.\nReview the evidence behind a claim.\nPreserve a checkable decision.',t)
    pill(im,(128,825),'Historical data, not a live feed',AMBER)
    text(im,(128,914),'Independent prototype · no UNEP affiliation or endorsement claimed',23,MUTED)
def proof(im,t):
    p=PROOF;receipt=p['record']['receipt'];c=p['checks']
    title(im,'Exact TKM export → isolated backend replay','A decision you can independently check.',t,58)
    pill(im,(128,320),'ANVIL LOCAL CHAIN · 31337',AMBER)
    pill(im,(610,320),'TKM_S_021 · Decision revision 1')
    if t<15:
        rect(im,(128,398,1790,850),fill=(8,27,39),outline=(41,81,96),radius=20)
        label(im,(164,430),'Retained transaction receipt · actual proof data')
        rows=[('Dataset snapshot',p['dataset']['datasetSnapshotId']),('Trusted digest',p['trustedDigest']),('Transaction',receipt['txHash']),('Registry',receipt['registryAddress']),('Block / version',f"{receipt['blockNumber']} / {receipt['version']}")]
        for i,(name,value) in enumerate(rows):
            y=490+i*60;text(im,(164,y),name,23,MUTED);text(im,(485,y),value,22,WHITE,mono=True)
        text(im,(164,810),'Commitment originates from the reviewer UI before download.',23,TEAL)
    else:
        rows=[('Original decision','original','VERIFIED',TEAL),('Altered + rehashed','alteredRehashed','REJECTED',CORAL),('Original restored','originalAgain','VERIFIED',TEAL),('After restart','afterRestart','VERIFIED',TEAL)]
        for i,(name,key,result,color) in enumerate(rows):
            y=390+i*110;active=t>=[14.6,19.5,25.0,27.7][i]
            rect(im,(128,y,1790,y+91),fill=(10,30,42),outline=color if active else (35,68,78),radius=15)
            text(im,(164,y+27),name,31,WHITE,True)
            if active:
                text(im,(1180,y+28),result,29,color,True)
                text(im,(1540,y+31),f"CLI exit {c[key]['exitCode']}",22,MUTED,mono=True)
        text(im,(128,870),'Recomputing a file hash cannot replace the trusted chain commitment.',25,TEAL)
    text(im,(128,930),'Local test results · no public transaction · integrity and chronology, not physical repair',23,AMBER)
def close(im,t):
    title(im,'Concrete outputs for an investigation team','One decision. Defensible evidence.',t,64)
    for i,(head,body) in enumerate([('Explainable plan','An explicit allocation and documented trade-offs.'),('Actionable request','The source-linked evidence needed for another review.'),('Verifiable decision','Preserved revisions and independent integrity checks.')]):
        card(im,128+i*568,370,536,255,f'0{i+1}',head,body,t)
    if t>8:
        rect(im,(128,678,1790,850),fill=(32,31,32),outline=(112,88,45),radius=17)
        label(im,(156,700),'What this prototype has not established',AMBER)
        text(im,(156,747),'Human productivity · field mitigation · measured climate outcomes',31,WHITE,True)
        text(im,(156,802),'Frozen agent lab r12: task completion 0/48. Deterministic checks are not user success.',24,MUTED)
    if t>19:
        text(im,(128,911),'Inspect the source. Reproduce the checks.',31,TEAL,True)
        text(im,(128,956),'github.com/AndroLay/MethaneResponse',27,WHITE,mono=True)
def ui_window(im,source,t,duration,z=1.5,cx=1050,cy=560):
    # One smooth approach, one reading hold, one return. No cursor-following or
    # frame-dependent bounding-box rounding that causes oscillation.
    u=ease((t-.8)/1.3)*(1-ease((t-(duration-2.1))/1.35))
    scale=lerp(1,z,u);centerx=lerp(960,cx,u);centery=lerp(540,cy,u)
    vw,vh=W/scale,H/scale;ox=min(max(0,centerx-vw/2),W-vw);oy=min(max(0,centery-vh/2),H-vh)
    iw,ih=1664,936
    tile=source.transform((iw,ih),Image.Transform.AFFINE,(W/scale/iw,0,ox,0,H/scale/ih,oy),resample=Image.Resampling.BICUBIC)
    im.paste(tile,(128,116));ImageDraw.Draw(im).rounded_rectangle((128,116,1791,1051),radius=12,outline=(79,128,140),width=1)
@lru_cache(maxsize=1)
def archive_source():
    src=Image.open(ROOT/'docs/evidence/render-preview-2026-10-21/deepseek-public.png').convert('RGB')
    return src.crop((740,1900,1410,2450)).resize((837,687),Image.Resampling.LANCZOS)
def archive(im,t):
    src=archive_source()
    pill(im,(128,158),'SEPARATE RECORDED AI EXAMPLE · KAZ_S_159 · 21 OCT',AMBER)
    lines(im,(128,245),'AI proposes.\nPeople review.',62,735,WHITE,True,spacing=1.12)
    label(im,(128,440),'deepseek-v4.1-flash-1017')
    text(im,(128,485),'Backend model · retained integration evidence',25,MUTED)
    for i,value in enumerate(['Authorized DEMO excerpt','Exact quotation validation','Insufficient evidence → review']):
        y=582+i*95;active=t>i*5
        dot(im,145,y+15,9,TEAL if active else MUTED)
        text(im,(180,y),value,29,WHITE if active else MUTED,True)
        if i<2:line(im,[(145,y+34),(145,y+84)],(40,89,99),2)
    rect(im,(930,235,1792,950),fill=(4,15,25),outline=(63,100,119),radius=16)
    im.paste(src,(942,249))
    label(im,(950,205),'Actual archived result · cropped',MUTED)
    text(im,(128,916),'Not a model run for TKM_S_021.',26,AMBER,True)
def render_frame(scene,t,source=None,clip=None,clip_t=0):
    im=background().copy();sid=scene['id']
    if source is not None:
        ui_window(im,source,clip_t,clip['duration'],clip['zoom'],clip['cx'],clip['cy'])
        tag='HISTORICAL MARS CATALOG · 4,218 SOURCE RECORDS' if clip.get('catalogOnly') else ('TKM_S_021 · HISTORICAL MARS' if sid in ['globe','planner','scope'] else 'TKM_S_021 · SOFTWARE DEMO REVIEW')
        pill(im,(145,132),tag,AMBER if sid in ['request','revisit'] else TEAL,18)
        if clip.get('catalogOnly'):pill(im,(145,950),'Imagery: Esri / NASA · location context, not methane imagery',TEAL,18)
        if sid=='planner' and 10.5<t<17.4:
            rect(im,(840,605,1760,944),fill=(8,27,39),outline=TEAL,radius=18)
            label(im,(875,635),'Recorded allocation · replay verified')
            reason_labels={'selected':'Selected within capacity and country quota','country_quota_filled':'Country quota filled by earlier selections'}
            for i,row in enumerate(PLAN_EXPLANATIONS['rows']):
                y=687+i*115
                text(im,(875,y),row['sourceId'],33,WHITE,True)
                text(im,(875,y+48),reason_labels[row['reason']],25,TEAL if i==0 else AMBER)
        if sid=='scope' and t>8:
            rect(im,(1100,655,1760,945),fill=(8,27,39),outline=AMBER,radius=17)
            label(im,(1130,683),'Question, not an established outcome',AMBER)
            lines(im,(1130,730),'Was mitigation completed and confirmed?',38,590,WHITE,True)
            text(im,(1130,856),'Historical metadata alone is insufficient.',23,MUTED)
            pill(im,(145,933),'UTC scope · 2020-10-29 → 2026-09-13',TEAL,21)
        if sid=='revisit' and t>12:
            pill(im,(720,900),'New response → review recommended',AMBER,25)
    elif sid=='hook':hook(im,t)
    elif sid=='position':position(im,t)
    elif sid=='ai':archive(im,t)
    elif sid=='verify':proof(im,t)
    elif sid=='close':close(im,t)
    # Short, stable dip to a shared visual field connects explanatory and demo
    # scenes. Transition consumes existing shot time; no extra runtime.
    dur=scene['end']-scene['start'];opacity=ease(t/.48)*(1-ease((t-(dur-.4))/.4))
    if opacity<1:im=Image.blend(background(),im,opacity)
    top(im,scene,t);caption(im,scene['start']+t)
    return im
def prepare_clip(c,key):
    version=hashlib.sha256(json.dumps([c,SYNC['videoSha256'],'trim-filter-v2'],sort_keys=True).encode()).hexdigest()[:10]
    target=OUT/'clips'/f'{key}-{version}.mp4';target.parent.mkdir(exist_ok=True)
    if not target.exists():
        available=min(c['sourceEnd']-c['sourceStart'],c['duration']*c['speed'])
        if available<=0:raise ValueError('Empty source interval')
        crop=f"crop={c['sourceCrop']},scale=1920:1080:flags=lanczos," if c.get('sourceCrop') else ''
        run(['ffmpeg','-v','error','-ss',str(c['sourceStart']),'-i',str(ROOT/c.get('sourceVideo',SYNC['video'])),'-an','-vf',f"trim=duration={available},setpts=(PTS-STARTPTS)/{c['speed']},{crop}fps=25,tpad=stop_mode=clone:stop_duration={c['duration']},trim=duration={c['duration']}",'-c:v','libx264','-preset','fast','-crf','16','-threads','2','-y',str(target)])
    return target
def render_scene(scene,smoke=False):
    sid=scene['id'];duration=scene['end']-scene['start'];version=sha(HERE/'render.py')[:10];folder=OUT/(('smoke-' if smoke else 'segments-')+version);folder.mkdir(exist_ok=True)
    dest=folder/f'{sid}.mp4'
    if dest.exists():return str(dest)
    partial=folder/f'{sid}.partial.mp4'
    clips=CLIPS.get(sid,[]);decoders=[]
    for i,c in enumerate(clips):
        p=prepare_clip(c,f'{sid}-{i}')
        decoders.append(subprocess.Popen(['ffmpeg','-v','error','-threads','1','-i',str(p),'-pix_fmt','rgb24','-f','rawvideo','-'],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL))
    # Smoke renders the hardest complete scene, including camera return.
    log=open(folder/f'{sid}.log','wb')
    encoder=subprocess.Popen(['ffmpeg','-v','error','-f','rawvideo','-pixel_format','rgb24','-video_size','1920x1080','-framerate','25','-i','-','-an','-vf','scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p','-c:v','libx264','-preset','fast','-crf','18','-threads','2','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-fps_mode','cfr','-y',str(partial)],stdin=subprocess.PIPE,stderr=log)
    ends=np.cumsum([c['duration'] for c in clips]);begin=0
    try:
        for f in range(round(duration*25)):
            t=f/25;source=None;clip=None;local=0
            if clips:
                i=min(len(clips)-1,bisect.bisect_right(ends,t));clip=clips[i];local=t-(0 if i==0 else ends[i-1])
                data=decoders[i].stdout.read(W*H*3)
                if len(data)!=W*H*3:raise RuntimeError(f'Source ended early: {sid}/{f}')
                source=Image.frombytes('RGB',(W,H),data)
            encoder.stdin.write(render_frame(scene,t,source,clip,local).tobytes())
        encoder.stdin.close()
        if encoder.wait():raise RuntimeError((folder/f'{sid}.log').read_text())
    finally:
        if encoder.poll() is None:encoder.kill();encoder.wait()
        log.close()
        for d in decoders:
            d.stdout.close()
            if d.poll() is None:d.terminate()
            d.wait()
    partial.rename(dest)
    print(json.dumps({'rendered':sid,'seconds':duration}),flush=True);return str(dest)
def main():
    load()
    selected=STORY
    if '--smoke' in sys.argv:selected=[s for s in STORY if s['id'] in ['position','planner','verify']]
    with concurrent.futures.ProcessPoolExecutor(max_workers=2,mp_context=multiprocessing.get_context('fork')) as pool:
        futures=[pool.submit(render_scene,s,'--smoke' in sys.argv) for s in selected]
        for future in futures:future.result()
    if '--smoke' in sys.argv:return
    concat=OUT/'concat.txt'
    concat.write_text(''.join("file '"+str(OUT/('segments-'+sha(HERE/'render.py')[:10])/f"{s['id']}.mp4")+"'\n" for s in STORY))
    dest=OUT/'MethaneResponse-Final-Submission-v15.mp4'
    if dest.exists():raise RuntimeError('Preserve existing final export')
    run(['ffmpeg','-v','error','-f','concat','-safe','0','-i',str(concat),'-i',str(OUT/'final-mix.wav'),'-i',str(OUT/'captions.en.srt'),'-map','0:v:0','-map','1:a:0','-map','2:s:0','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-c:s','mov_text','-metadata:s:s:0','language=eng','-disposition:s:0','0','-t','280','-movflags','+faststart','-metadata','title=MethaneResponse — One Decision. Defensible Evidence.','-metadata','comment=Actual local application footage; stock synthetic male narration; historical MARS; DEMO review; separate recorded KAZ AI; Anvil local chain.',str(dest)])
    print(json.dumps({'video':str(dest),'sha256':sha(dest),'bytes':dest.stat().st_size}),flush=True)
if __name__=='__main__':main()
