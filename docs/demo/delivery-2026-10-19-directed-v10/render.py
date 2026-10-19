#!/usr/bin/env python3
"""Render truthful app footage with fractional camera motion and authored graphics.

No new packages: Python/Pillow/numpy and system FFmpeg. Every frame is timed at
25 fps. The original source footage is never modified; overlays are editorial.
"""
from __future__ import annotations
import bisect
import concurrent.futures
import hashlib
import json
import math
import multiprocessing
import os
from pathlib import Path
import subprocess
import sys
import time
import uuid
import numpy as np
from PIL import Image, ImageDraw
from visuals import (W,H,INK,TEAL,WHITE,MUTED,AMBER,CORAL,background,scene_image,
                     pointer_image,text,label,rect,line,dot,ease,clamp,lerp,alpha)

HERE=Path(__file__).resolve().parent
REPO=HERE.parents[2]
OUT=REPO/'delivery-output/story-v10'
FPS=25
FULL=(128.,120.,1664.,936.)
THUMB=(1040.,390.,730.,410.625)
CAPTURE_DIR=Path(os.environ.get('MR_DIRECTED_CAPTURE_OUTPUT_DIR',str(OUT/'capture-master')))
VIDEO=CAPTURE_DIR/'actual-ui.webm'
TIMELINE=json.loads((HERE/'timeline.json').read_text())
CAPTURE={}
SHOTS={}
FRAMES={}
SEGMENTS=None
BUILD_KEY=''
STEPS=['Inspect','Scope','Assess','Request','Verify']

def sha(path):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
    return h.hexdigest()
def probe(path):
    return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration,size:stream=width,height,r_frame_rate,codec_name','-of','json',str(path)]))
def run(args):
    p=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if p.returncode:raise RuntimeError(p.stderr.decode(errors='replace')[-2200:])
    return p.stdout
def find_sync():
    """Locate full-screen recording slates; none of them enter the edited video."""
    raw=run(['ffmpeg','-v','error','-i',str(VIDEO),'-vf','scale=1:1','-pix_fmt','rgb24','-f','rawvideo','-'])
    pixels=np.frombuffer(raw,dtype=np.uint8).reshape(-1,3).astype(np.int16)
    results={}
    for s in CAPTURE['shots']:
        matching=np.flatnonzero(np.max(np.abs(pixels-np.array(s['marker'])),axis=1)<13)
        groups=[]
        for _,g in __import__('itertools').groupby(enumerate(matching),lambda z:int(z[1])-z[0]):
            group=[int(x[1]) for x in g]
            if len(group)>=3:groups.append(group)
        if not groups:
            if s['id']=='source':continue
            raise RuntimeError(f"No visual sync slate for {s['id']}")
        group=max(groups,key=len)
        start=(group[-1]+1)/FPS
        results[s['id']]={**s,'sourceStartSeconds':start,'markerFrameRange':[group[0],group[-1]],'syncMethod':'full-screen visual slate'}
    if 'source' not in results:
        # Chromium can begin encoding just after the first short slate. The same
        # recording clock is recoverable from all seven later observed slates.
        offsets=[s['startWall']/1000-s['sourceStartSeconds'] for s in results.values()]
        median=float(np.median(offsets))
        if len(offsets)<7 or max(abs(x-median) for x in offsets)>.12:
            raise RuntimeError('Cannot reliably align the first source scene.')
        s=CAPTURE['shots'][0];start=round((s['startWall']/1000-median)*FPS)/FPS
        if start<0:raise RuntimeError('Source actions begin before the encoded footage.')
        results['source']={**s,'sourceStartSeconds':start,'markerFrameRange':None,
          'syncMethod':'median recording clock from seven observed slates; first slate precedes encoder startup',
          'maxClockDeviationSeconds':round(max(abs(x-median) for x in offsets),4)}
    ordered=[results[s['id']] for s in CAPTURE['shots']]
    for i,s in enumerate(ordered):
        if i+1<len(ordered) and s['sourceStartSeconds']+s['duration']>=ordered[i+1]['markerFrameRange'][0]/FPS:
            raise RuntimeError(f"Scene exceeds its recording window: {s['id']}")
    return {s['id']:s for s in ordered}
def extract_frame(time_seconds,path):
    if path.exists():return
    run(['ffmpeg','-v','error','-ss',str(time_seconds),'-i',str(VIDEO),'-frames:v','1','-y',str(path)])
def prepare():
    global CAPTURE,SHOTS,FRAMES,SEGMENTS,BUILD_KEY
    CAPTURE=json.loads((CAPTURE_DIR/'capture.json').read_text())
    if CAPTURE['schemaVersion']!=10 or not CAPTURE['localOnly'] or CAPTURE['sourceId']!='KAZ_S_159' or CAPTURE['pageErrors']:
        raise RuntimeError('Capture provenance does not satisfy the local demo contract.')
    if sha(VIDEO)!=CAPTURE['sha256']:raise RuntimeError('Source capture hash mismatch.')
    if TIMELINE[0]['start']!=0 or TIMELINE[-1]['end']!=290:raise RuntimeError('Invalid narrative runtime.')
    for i,s in enumerate(TIMELINE):
        if s['end']<=s['start'] or (i and TIMELINE[i-1]['end']!=s['start']):raise RuntimeError('Non-contiguous timeline.')
    SHOTS=find_sync()
    (OUT/'sync.json').write_text(json.dumps({'sourceSha256':CAPTURE['sha256'],'shots':SHOTS},indent=2))
    frame_dir=OUT/f"match-frames-{CAPTURE['sha256'][:10]}";frame_dir.mkdir(exist_ok=True)
    for sid,s in SHOTS.items():
        first=frame_dir/f'{sid}-first.png';last=frame_dir/f'{sid}-last.png'
        extract_frame(s['sourceStartSeconds'],first)
        extract_frame(s['sourceStartSeconds']+s['duration']-1/FPS,last)
        FRAMES[sid]=(Image.open(first).convert('RGB'),Image.open(last).convert('RGB'))
    for s in TIMELINE:
        if s['kind']=='app' and s['end']-s['start']!=SHOTS[s['shot']]['duration']:
            raise RuntimeError(f"Duration mismatch: {s['id']}")
    build=hashlib.sha256()
    for p in [HERE/'render.py',HERE/'visuals.py',HERE/'timeline.json',CAPTURE_DIR/'capture.json']:build.update(p.read_bytes())
    BUILD_KEY=build.hexdigest()[:14];SEGMENTS=OUT/f'segments-{BUILD_KEY}';SEGMENTS.mkdir(exist_ok=True)
    # Actual recorded pointer samples, indexed separately per shot.
    for s in SHOTS.values():
        events=[{**p,'at':(p['wall']-s['startWall'])/1000} for p in CAPTURE['pointer'] if s['startWall']-1000<=p['wall']<=s['startWall']+s['duration']*1000]
        s['pointer']=events;s['pointerTimes']=[p['at'] for p in events]
    return BUILD_KEY

def union_roi(boxes,max_zoom=1.45):
    if not boxes:return (1.,960.,540.)
    x1=min(b['x'] for b in boxes);y1=min(b['y'] for b in boxes)
    x2=max(b['x']+b['width'] for b in boxes);y2=max(b['y']+b['height'] for b in boxes)
    z=min(max_zoom,1920/max(1,x2-x1+210),1080/max(1,y2-y1+180))
    return (max(1,z),(x1+x2)/2,(y1+y2)/2)
def pulse(t,start,hold,end,target):
    zin,centerx,centery=target
    if t<start or t>end:return (1.,960.,540.)
    amount=ease((t-start)/.95) if t<start+.95 else (1. if t<hold else 1-ease((t-hold)/max(.01,end-hold)))
    return (lerp(1,zin,amount),lerp(960,centerx,amount),lerp(540,centery,amount))
def camera(s,t):
    sid=s['id'];actions=s['actions'];focus=s['focus']
    neutral=(1.,960.,540.)
    if any(q['start']-.05<=t<=q['end']+.25 for q in s['scrolls']):return neutral
    if sid=='audit':
        if t<9.0:
            target=union_roi([x['rect'] for x in focus[:4]],1.43)
            return pulse(t,.9,7.6,8.8,target)
        run=next(x for x in focus if x['label']=='Run the rules baseline')
        result=next(x for x in focus if x.get('color')=='amber')
        target_a=union_roi([run['rect']],1.52)
        target_b=union_roi([result['rect']],1.48)
        if t<run['start']+.8:return pulse(t,run['start']-.5,run['start']+2,run['start']+3,target_a)
        if t<result['start']+1.2:
            u=ease((t-(run['start']+.8))/max(.05,result['start']+1.2-(run['start']+.8)))
            return tuple(lerp(a,b,u) for a,b in zip(target_a,target_b))
        return pulse(t,result['start']-.2,24,25.4,target_b)
    if sid=='casework':
        targets=[union_roi([f['rect']],1.76) for f in focus[:3]]
        if t<3.1:return pulse(t,.65,3.5,4.6,targets[0])
        if t<3.9:
            u=ease((t-3.1)/.8);return tuple(lerp(a,b,u) for a,b in zip(targets[0],targets[1]))
        if t<6.05:return targets[1]
        if t<6.85:
            u=ease((t-6.05)/.8);return tuple(lerp(a,b,u) for a,b in zip(targets[1],targets[2]))
        return pulse(t,5.8,10.7,12.5,targets[2])
    if sid=='observations':return pulse(t,1.4,10.8,12.3,(1.14,1010,675))
    if sid=='source':return neutral
    if sid=='catalog':return pulse(t,1.4,8.5,10.2,union_roi([focus[0]['rect']],1.32))
    if sid=='report':
        scroll=s['scrolls'][0] if s['scrolls'] else {'start':3.0,'end':4.1}
        if t<scroll['start']-.05:return pulse(t,.65,scroll['start']-.6,scroll['start']-.06,union_roi([focus[0]['rect']],1.45))
        if len(focus)>1 and t>scroll['end']+.3:
            b=focus[-1]['rect'];roi={**b,'width':900,'height':350,'y':max(0,b['y']-40)}
            return pulse(t,scroll['end']+.4,9.2,10.8,union_roi([roi],1.65))
        return neutral
    if sid in ['tamper','original']:
        # Read the file name and resulting check together, without chasing either.
        b=focus[0]['rect'];roi={**b,'width':900,'height':340,'y':max(0,b['y']-45)}
        return pulse(t,1.0,s['duration']-2.4,s['duration']-.8,union_roi([roi],1.7))
    return neutral

def frame_geometry(z,cx,cy):
    vw,vh=1920/z,1080/z
    return (clamp(cx-vw/2,0,1920-vw),clamp(cy-vh/2,0,1080-vh),z)
def window(im,source,geometry=FULL,cam=(1,960,540),opacity=1):
    x,y,w,h=geometry
    if w<2 or h<2 or opacity<=0:return None
    iw,ih=round(w),round(h);ox,oy,z=frame_geometry(*cam)
    # PIL affine uses fractional input coordinates throughout. No integer crop or
    # frame-varying raster size is used for the steady camera path.
    tile=source.transform((iw,ih),Image.Transform.AFFINE,(1920/z/w,0,ox,0,1080/z/h,oy),resample=Image.Resampling.BICUBIC)
    mask=Image.new('L',(iw,ih));ImageDraw.Draw(mask).rounded_rectangle((0,0,iw,ih),radius=18,fill=round(255*opacity))
    d=ImageDraw.Draw(im,'RGBA')
    for k in range(5,0,-1):d.rounded_rectangle((x-k*3,y+5-k*2,x+w+k*3,y+h+k*3),radius=20+k*2,fill=(0,3,8,round(4*opacity)))
    im.paste(tile,(round(x),round(y)),mask)
    d.rounded_rectangle((x,y,x+w-1,y+h-1),radius=18,outline=(123,182,190,round(140*opacity)),width=1)
    return (x,y,w,h,ox,oy,z)
def transform_point(x,y,geo):
    gx,gy,w,h,ox,oy,z=geo
    return gx+(x-ox)*w*z/1920,gy+(y-oy)*h*z/1080
def draw_pointer(im,s,t,geo,opacity=1):
    events=s['pointer'];times=s['pointerTimes']
    i=bisect.bisect_right(times,t)-1
    if i<0:return
    p=events[i];px,py=p['x'],p['y']
    if i+1<len(events) and events[i+1]['at']-p['at']<.16:
        n=events[i+1];u=clamp((t-p['at'])/max(.001,n['at']-p['at']));px=lerp(px,n['x'],u);py=lerp(py,n['y'],u)
    x,y=transform_point(px,py,geo);gx,gy,w,h,*_=geo
    if not(gx+8<x<gx+w-8 and gy+8<y<gy+h-8):return
    dot(im,x,y,19,TEAL,.12*opacity)
    for e in reversed(events[:i+1]):
        dt=t-e['at']
        if dt>.55:break
        if e['kind']=='click':
            rx,ry=transform_point(e['x'],e['y'],geo);r=12+25*ease(dt/.55)
            ImageDraw.Draw(im,'RGBA').ellipse((rx-r,ry-r,rx+r,ry+r),outline=alpha(TEAL,(1-dt/.55)*opacity),width=3)
    cursor=pointer_image()
    if opacity<.999:
        cursor=cursor.copy();cursor.putalpha(cursor.getchannel('A').point(lambda a:round(a*opacity)))
    im.paste(cursor,(round(x-3),round(y-2)),cursor)
def highlight(im,s,t,geo):
    # Do not highlight stale DOM bounds while the page scrolls.
    if any(q['start']-.2<=t<=q['end']+.4 for q in s['scrolls']):return None
    choices=[x for x in s['focus'] if x['start']<=t<=x['end']]
    if not choices:return None
    f=choices[-1];b=f['rect'];color=AMBER if f.get('color')=='amber' else TEAL
    if s['id']=='source':
        action=next((a for a in s['actions'] if a['label']==f['label']),None)
        if action and t>action['at']+.15:return None
    x1,y1=transform_point(b['x']-5,b['y']-5,geo);x2,y2=transform_point(b['x']+b['width']+5,b['y']+b['height']+5,geo)
    gx,gy,w,h,*_=geo
    x1=max(gx+3,x1);y1=max(gy+3,y1);x2=min(gx+w-3,x2);y2=min(gy+h-3,y2)
    if x2<=x1 or y2<=y1:return f
    a=ease((t-f['start'])/.25)*ease((f['end']-t)/.4)
    d=ImageDraw.Draw(im,'RGBA')
    for k in [7,4]:d.rounded_rectangle((x1-k,y1-k,x2+k,y2+k),radius=12,outline=alpha(color,.13*a),width=3)
    d.rounded_rectangle((x1,y1,x2,y2),radius=9,outline=alpha(color,.88*a),width=2)
    return f
def header(im,s,global_t,action=None):
    light=s['id'] in ['climate','observation-model']
    # Match the background's entry/exit blend rather than switching the header
    # to dark text while a dark application window is still on screen.
    mix=1. if light else 0.
    index=TIMELINE.index(s);local_t=global_t-s['start'];duration=s['end']-s['start']
    if light and index and TIMELINE[index-1]['kind']=='app':mix*=ease(local_t/1.15)
    if light and index+1<len(TIMELINE) and TIMELINE[index+1]['kind']=='app':mix*=1-ease((local_t-(duration-1.15))/1.15)
    fg=tuple(round(lerp(a,b,mix)) for a,b in zip(WHITE,INK))
    mut=tuple(round(lerp(a,b,mix)) for a,b in zip(MUTED,(68,101,106)))
    mark=tuple(round(lerp(a,b,mix)) for a,b in zip(TEAL,(22,137,123)))
    dot(im,70,45,7,mark)
    text(im,(88,31),'METHANERESPONSE',21,fg,True)
    if s['kind']=='app':
        step=s['step']
        if s['id']=='audit' and global_t-s['start']>=11:step=2
        for i,name in enumerate(STEPS):
            x=430+i*285;col=TEAL if i==step else MUTED
            if i==step:rect(im,(x-12,70,x+235,108),(17,60,67),TEAL,14,1,1)
            text(im,(x,76),f'{i+1:02}  {name}',22,col,True)
        instruction=action or s['instruction']
        text(im,(760,31),instruction,22,WHITE,True)
    else:
        text(im,(1050,35),s.get('chapter','').upper(),19,mut,mono=True)
    ImageDraw.Draw(im,'RGBA').rectangle((0,H-4,W,H),fill=(80,113,120,60))
    ImageDraw.Draw(im,'RGBA').rectangle((0,H-4,W*global_t/290,H),fill=(*TEAL,255))

def bridge_card(im,next_scene,u):
    shot=next_scene['shot'];cover=background(False).copy()
    label(cover,(130,370),'Continue in the actual application')
    text(cover,(130,430),next_scene['instruction'],40,WHITE,True)
    # Wrap long instruction into a readable line rather than overlap the preview.
    from visuals import lines
    cover=background(False).copy();label(cover,(130,345),'Next · Actual application')
    lines(cover,(130,407),next_scene['instruction'],52,800,WHITE,True)
    text(cover,(130,645),'Same historical case. Real controls and results.',25,MUTED)
    line(cover,[(925,591),(1021,591)],TEAL,2,.65)
    dot(cover,1021,591,5,TEAL)
    window(cover,FRAMES[shot][0],THUMB)
    im.paste(cover,(0,0),Image.new('L',(W,H),round(255*u)))

def render_frame(s,local_t,source=None):
    i=TIMELINE.index(s);prev=TIMELINE[i-1] if i else None;nxt=TIMELINE[i+1] if i+1<len(TIMELINE) else None
    duration=s['end']-s['start'];global_t=s['start']+local_t
    action=None
    if s['kind']=='app':
        im=background(False).copy();shot=SHOTS[s['shot']]
        u=ease(local_t/1.1)
        geometry=tuple(lerp(a,b,u) for a,b in zip(THUMB,FULL)) if prev and prev['kind']=='model' else FULL
        if u<1:
            from visuals import lines
            label(im,(130,345),'Next · Actual application',a=1-u)
            lines(im,(130,407),s['instruction'],52,800,WHITE,True,a=1-u)
        c=camera(shot,local_t)
        # Camera settles into its crop after the shared window reaches full size.
        c=tuple(lerp(a,b,u) for a,b in zip((1.,960.,540.),c))
        geo=window(im,source if source is not None else FRAMES[s['shot']][0],geometry,c)
        active=highlight(im,shot,local_t,geo) if u>.99 else None
        if active:action=active['label']
        if local_t>.65:draw_pointer(im,shot,local_t,geo,u)
    else:
        content_t=max(0,local_t-.65) if prev and prev['kind']=='app' else local_t
        im=scene_image(s,content_t,CAPTURE)
        if prev and prev['kind']=='app' and local_t<1.15:
            u=ease(local_t/1.15)
            # Start from precisely the same last source frame and window geometry.
            base=Image.blend(background(False),background(s['id'] in ['climate','observation-model']),u)
            base=Image.blend(base,im,u)
            geometry=tuple(lerp(a,b,u) for a,b in zip(FULL,THUMB))
            visibility=1-ease((local_t-.58)/.57)
            geo=window(base,FRAMES[prev['shot']][1],geometry,opacity=visibility)
            if local_t<.45 and geo:
                draw_pointer(base,SHOTS[prev['shot']],SHOTS[prev['shot']]['duration']-.04,geo,1-ease(local_t/.45))
            im=base
        if nxt and nxt['kind']=='app' and local_t>duration-1.15:
            bridge_card(im,nxt,ease((local_t-(duration-1.15))/1.15))
    header(im,s,global_t,action)
    return im

def render_scene(s):
    destination=SEGMENTS/f"{s['start']:03d}-{s['id']}.mp4"
    duration=s['end']-s['start']
    if destination.exists():
        p=probe(destination)
        if abs(float(p['format']['duration'])-duration)>.05:raise RuntimeError('Cached segment duration mismatch.')
        return str(destination)
    temporary=SEGMENTS/f"{s['id']}-{uuid.uuid4().hex[:8]}.partial.mp4"
    logpath=SEGMENTS/f"{s['id']}.log"
    decoder=None
    if s['kind']=='app':
        shot=SHOTS[s['shot']]
        decoder=subprocess.Popen(['ffmpeg','-v','error','-threads','1','-ss',str(shot['sourceStartSeconds']),'-i',str(VIDEO),'-t',str(duration),'-vf',f'fps={FPS}','-pix_fmt','rgb24','-f','rawvideo','-'],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
    with open(logpath,'wb') as logs:
        encoder=subprocess.Popen(['ffmpeg','-v','error','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{W}x{H}','-framerate',str(FPS),'-i','-',
          '-an','-vf','scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p','-c:v','libx264','-preset','fast','-crf','17','-threads','2',
          '-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-r',str(FPS),'-fps_mode','cfr',str(temporary)],stdin=subprocess.PIPE,stderr=logs)
        try:
            last=None
            for f in range(round(duration*FPS)):
                source=None
                if decoder:
                    data=decoder.stdout.read(W*H*3)
                    if len(data)==W*H*3:source=Image.frombytes('RGB',(W,H),data);last=source
                    elif f<duration*FPS-2:raise RuntimeError(f"Source recording ended early in {s['id']}: {f}")
                    else:source=last
                frame=render_frame(s,f/FPS,source)
                encoder.stdin.write(frame.tobytes())
            encoder.stdin.close()
            status=encoder.wait()
            if status:raise RuntimeError(logpath.read_text()[-2000:])
        finally:
            if encoder.poll() is None:encoder.kill();encoder.wait()
            if decoder:
                decoder.stdout.close()
                if decoder.poll() is None:decoder.terminate()
                decoder.wait()
    temporary.rename(destination)
    return str(destination)

def assemble(paths,destination,duration=290,audio=True):
    if destination.exists():raise RuntimeError(f'Preserving existing export: {destination}')
    concat=SEGMENTS/f"concat-{destination.stem}.txt"
    concat.write_text(''.join("file '"+str(Path(p)).replace("'","'\\''")+"'\n" for p in paths))
    args=['ffmpeg','-v','error','-f','concat','-safe','0','-i',str(concat)]
    if audio:
        args+=['-i',str(REPO/'delivery-output/story-v5/MethaneResponse-Hybrid-Presentation-Demo-4m50-v9.3-final.mp4'),'-map','0:v:0','-map','1:a:0','-c','copy']
    else:args+=['-an','-c:v','copy']
    run(args+['-t',str(duration),'-movflags','+faststart',str(destination)])

def main():
    prepare();mode=sys.argv[1] if len(sys.argv)>1 else 'study'
    if mode=='stills':
        times=[4,28,53,74,98,130,143,147,154,179,194,214,224,231,240,255,267,281]
        for t in times:
            s=next(s for s in TIMELINE if s['start']<=t<s['end']);source=None
            if s['kind']=='app':
                shot=SHOTS[s['shot']];p=OUT/f"preview-source-{CAPTURE['sha256'][:8]}-{t}.png";extract_frame(shot['sourceStartSeconds']+t-s['start'],p);source=Image.open(p).convert('RGB')
            render_frame(s,t-s['start'],source).save(OUT/f'preview-{t}.png')
        print(json.dumps({'status':'stills-rendered','times':times}));return
    selected=TIMELINE if mode=='full' else [s for s in TIMELINE if s['id'] in ['system','ambiguity','audit']]
    started=time.monotonic()
    with concurrent.futures.ProcessPoolExecutor(max_workers=2,mp_context=multiprocessing.get_context('fork')) as pool:
        futures={pool.submit(render_scene,s):s for s in selected}
        for f in concurrent.futures.as_completed(futures):
            path=f.result();print(json.dumps({'rendered':futures[f]['id'],'seconds':round(time.monotonic()-started)}),flush=True)
    if mode=='study':
        clips=[]
        for sid,start,length in [('system',9,10),('ambiguity',18,3),('audit',0,19)]:
            s=next(s for s in TIMELINE if s['id']==sid);src=SEGMENTS/f"{s['start']:03d}-{s['id']}.mp4";dst=SEGMENTS/f'study-{sid}.mp4'
            if not dst.exists():run(['ffmpeg','-v','error','-ss',str(start),'-i',str(src),'-t',str(length),'-an','-c:v','libx264','-preset','fast','-crf','17','-threads','2',str(dst)])
            clips.append(dst)
        output=OUT/'MethaneResponse-v10-motion-study.mp4';assemble(clips,output,32,False)
        print(json.dumps({'study':str(output),'sha256':sha(output),'seconds':32}));return
    output=OUT/'MethaneResponse-Directed-Presentation-Demo-4m50-v10.mp4'
    paths=[SEGMENTS/f"{s['start']:03d}-{s['id']}.mp4" for s in TIMELINE]
    assemble(paths,output)
    captions=REPO/'docs/demo/delivery-2026-10-19-story-v4/06-Captions-EN.srt'
    caption_out=Path(str(output)+'.en.srt');caption_out.write_bytes(captions.read_bytes())
    manifest={'version':10,'durationSeconds':290,'fps':FPS,'createdAt':__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),
      'output':{'path':str(output),'sha256':sha(output),'probe':probe(output)},'buildKey':BUILD_KEY,'sourceCaptureSha256':CAPTURE['sha256'],
      'timeline':TIMELINE,'captureManifest':str(CAPTURE_DIR/'capture.json'),'sourceSync':'sync.json','captionSha256':sha(caption_out),
      'motion':{'camera':'fractional inverse affine transform, quintic easing, settled holds; neutral camera during page scrolling',
                'cursor':'high-contrast arrow and click ripple from actual timestamped browser events',
                'transitions':'shared application window expands from preview; same last source frame contracts into explanation',
                'models':'original procedural sphere/satellite, lane diagram, real uncertainty plot, month boundary, evidence gate, actual digest comparison'},
      'audio':{'retainedFrom':'story-v5 v9.3 final; unchanged English synthetic Kokoro af_heart narration + original instrumental'},
      'scope':'Local app + temporary local state. No live AI provider, blockchain receipt, deployment or upload.'}
    (OUT/'render-manifest.json').write_text(json.dumps(manifest,indent=2))
    print(json.dumps({'export':str(output),'sha256':manifest['output']['sha256'],'durationSeconds':290}),flush=True)

if __name__=='__main__':main()
