"""v17: actual action geometry, one constant-sized cursor, smooth feathered reveals.
No fabricated product result, model call, public transaction, or new narration.
"""
import argparse,bisect,concurrent.futures,hashlib,importlib.util,io,json,multiprocessing,sys,subprocess
from functools import lru_cache
from PIL import Image,ImageDraw
from prepare import HERE,ROOT,OUT,OLD,EVIDENCE,sha,dump
from motion import WINDOW,ease,lerp,affine,project,camera,keyframes,active_action,pointer_at,pointer_age,cursor_paths,guided_pointer
spec=importlib.util.spec_from_file_location('v16_film',HERE.parent/'delivery-2026-10-22-final-v16/render.py')
v16=importlib.util.module_from_spec(spec);sys.modules[spec.name]=v16;spec.loader.exec_module(v16)
b=v16.b;b.HERE=HERE;b.OUT=OUT;STORY=b.STORY
_original_run=b.run
def bounded_run(args):
    if args[0]=='ffmpeg':
        args=list(args);args[1:1]=['-filter_threads','1','-filter_complex_threads','1']
        for i,value in enumerate(args[:-1]):
            if value=='-threads':args[i+1]='1'
    return _original_run(args)
b.run=bounded_run
ACTIONS=[];POINTS=[];PATHS=[];FACTS=None

def load():
    global ACTIONS,POINTS,PATHS,FACTS
    b.SYNC=json.loads((OUT/'sync.json').read_text());assert sha(ROOT/b.SYNC['video'])==b.SYNC['videoSha256']
    b.PROOF=json.loads((OUT/'take8-anvil-proof.json').read_text())
    raw=(ROOT/b.SYNC['video']).parent;export=json.loads((raw/'frozen-investigation-decision.json').read_text());pin=json.loads((raw/'trusted-decision-digest.json').read_text())
    assert b.PROOF['record']['decision']==export['decision']and b.PROOF['trustedDigest']==pin['digest']
    assert b.PROOF['chainId']==31337 and not b.PROOF['publicNetworkUsed']
    b.CAPTIONS=json.loads((OUT/'captions.json').read_text());b.CAP_STARTS=[c['start']for c in b.CAPTIONS]
    FACTS=json.loads((OUT/'verified-facts.json').read_text());v16.FACTS=FACTS
    assert hashlib.sha256(FACTS['quote'].encode()).hexdigest()==FACTS['quoteSha256']
    assert sha(ROOT/FACTS['quoteSource'])==FACTS['quoteSourceSha256']
    v16.REVISIT=json.loads((raw/'revisited-investigation-decision.json').read_text())['revisit']
    assert v16.REVISIT['historicalDecisionUnchanged']
    ACTIONS=b.SYNC['actions'];POINTS=b.SYNC['points'];PATHS=cursor_paths(ACTIONS,POINTS)
    shots=b.SYNC['shots'];at=lambda i:shots[i]['start'];end=lambda i:shots[i]['end']-.16
    def action(name,kind=None,shot=None):
        return next(a for a in ACTIONS if name.lower()in a.get('name','').lower()and(not kind or a['kind']==kind)and(not shot or a.get('shot')==shot))
    def clip(start,stop,duration,note):
        assert stop>start
        c=dict(sourceStart=start,sourceEnd=stop,duration=duration,speed=(stop-start)/duration,note=note)
        assert not any(a.get('sensitive')and a['start']<stop and a['end']>start for a in ACTIONS),'Credential footage must be excluded'
        c['_camera']=keyframes(c,ACTIONS)
        return c
    criteria=action('Evidence acceptance criteria');ev=action('Evidence to request','fill');due=action('Request due date')
    issued=next(a for a in ACTIONS if a['name']=='Add evidence event to draft'and a['performAt']>due['performAt'])
    frozen=action('Freeze reviewed investigation decision')
    inspect=action('Inspect decision dossier and history',shot=shots[8]['id'])
    rationale=action('Decision rationale','fill',shots[8]['id'])
    acknowledge=action('I inspected the scoped source','check')
    compare=action('Compare investigation plans','click',shots[1]['id'])
    open_source=action('Evidence TKM_S_021')
    choose_claim=action('CLAIM TO EVALUATE','selectOption')

    b.CLIPS={
        'globe':[clip(at(0),end(0),20,'Actual selected source; historical location imagery')],
        'planner':[clip(compare['start']-.35,end(1),18,'Compare, select weighted strategy, explicitly activate 10; omit setup wait'),clip(at(2),end(2),18,'Capacity 20; inspect unchanged active 10, compare and explicitly activate 20')],
        'scope':[clip(max(at(4)+.04,open_source['start']-.25),open_source['end']+.6,6,'Open actual source'),clip(choose_claim['start']-.3,end(4),20,'Actual claim and UTC period; idle navigation wait omitted')],
        'request':[clip(criteria['start']-.2,ev['end']+.5,13,'Acceptance criteria and source-linked evidence request'),clip(due['start']-.2,issued['end']+1.7,6,'Due date and issued request'),clip(inspect['start']-.3,inspect['end']+.5,4,'Inspect exact dossier'),clip(rationale['start']-.3,rationale['end']+.3,3.52,'Record actual decision rationale'),clip(acknowledge['start']-.3,frozen['end']+2.3,4.48,'Acknowledge, freeze and hold the decision; idle IPC wait omitted')],
        'revisit':[clip(at(9),end(9),23,'New DEMO response; preserved decision')]
    }
    dump(OUT/'edit.json',{'revision':'v17','actualCapture':b.SYNC['video'],'captureSha256':b.SYNC['videoSha256'],'trustedDigest':pin['digest'],'clips':b.CLIPS,'cursor':'Actual click endpoints/times; editorially eased travel, constant 32px output size; identical camera affine','transitions':'0.72s feathered directional reveal; no empty dip or broad text ghosting','audio':'Exact v15 mix, captions and 280-second timeline','sensitiveActionsIncluded':False,'pacing':'Long idle setup/IPC waits omitted; not a real-time application performance measurement'})

@lru_cache(maxsize=1)
def arrow():
    scale=4;sprite=Image.new('RGBA',(32*scale,42*scale));d=ImageDraw.Draw(sprite)
    coords=[(0,0),(1,29),(8,22),(14,35),(20,32),(14,20),(25,20)]
    d.polygon([((x+2)*scale,(y+3)*scale)for x,y in coords],fill=(0,0,0,105))
    d.polygon([(x*scale,y*scale)for x,y in coords],fill=(246,254,255,255),outline=(8,30,40,255),width=2*scale)
    return sprite.resize((32,42),Image.Resampling.LANCZOS)

def pointer(im,c,t,cam):
    raw=min(c['sourceEnd'],c['sourceStart']+t*c['speed']);p=guided_pointer(POINTS,PATHS,raw)
    if p is None:return
    x,y=project(p,cam);left,top,w,h=WINDOW
    if not(left+4<x<left+w-34 and top+4<y<top+h-38):return
    fade=ease((t-.65)/.3)*(1-ease((t-(c['duration']-.45))/.4))*(1-ease((pointer_age(POINTS,raw)/c['speed']-2)/.5))
    layer=Image.new('RGBA',im.size);d=ImageDraw.Draw(layer)
    # One anti-aliased 32px cursor; tip follows the exact transformed event.
    layer.alpha_composite(arrow(),(round(x),round(y)))
    for e in POINTS:
        dt=(raw-e['time'])/c['speed']
        if e['kind']=='down'and 0<=dt<.42 and c['sourceStart']<=e['time']<=c['sourceEnd']:
            xx,yy=project((e['x'],e['y']),cam);u=dt/.42;r=8+24*ease(u)
            d.ellipse((xx-r,yy-r,xx+r,yy+r),outline=(*b.TEAL,int(210*(1-u))),width=3)
    layer.putalpha(layer.getchannel('A').point(lambda a:int(a*fade)));im.paste(layer,(0,0),layer)

def ui(im,source,c,t):
    cam=camera(c,t,ACTIONS);scale,tx,ty=affine(cam);x,y,w,h=WINDOW
    ox=(x-tx)/scale;oy=(y-ty)/scale
    source=source.copy();ImageDraw.Draw(source).rectangle((0,0,95,11),fill=source.getpixel((105,6))) # remove editorial sync strip only
    tile=source.transform((w,h),Image.Transform.AFFINE,(1/scale,0,ox,0,1/scale,oy),resample=Image.Resampling.BICUBIC)
    im.paste(tile,(x,y));d=ImageDraw.Draw(im);d.rounded_rectangle((x,y,x+w-1,y+h-1),radius=9,outline=(60,110,124),width=1)
    a=active_action(c,t,ACTIONS)
    if a:
        raw=c['sourceStart']+t*c['speed'];u=ease((raw-a['settledAt'])/.45)*(1-ease((raw-a['end'])/.5))
        layer=Image.new('RGBA',im.size);ld=ImageDraw.Draw(layer);box=a['box'];p=project((box['x']-5,box['y']-5),cam);q=project((box['x']+box['width']+5,box['y']+box['height']+5),cam)
        # Clip outline to actual viewport; never magnify a different element.
        bounds=(max(x+2,p[0]),max(y+2,p[1]),min(x+w-2,q[0]),min(y+h-2,q[1]))
        if bounds[2]>bounds[0]and bounds[3]>bounds[1]:ld.rounded_rectangle(bounds,radius=7,outline=(*b.TEAL,int(230*u)),width=3)
        im.paste(layer,(0,0),layer)
        labels={'fill':'Enter','click':'Select','selectOption':'Choose','check':'Confirm','read':'Read result'}
        name=a['name'].replace('DEMO ','')
        if len(name)>90:name=name[:87]+'…'
        b.text(im,(145,151),labels[a['kind']]+': '+name,24,b.WHITE,True,a=u)
    else:b.text(im,(145,151),'TKM_S_021 · actual local application · software DEMO review',23,b.MUTED)

def reveal(previous,current,u):
    # Directional feathered reveal: no full-screen dip and no broad text ghosts.
    if u<=0:return previous.copy()
    if u>=1:return current
    boundary=-100+2120*u
    row=b.np.clip((boundary-b.np.arange(1920))/96+.5,0,1)
    mask=Image.fromarray((row*255).astype('uint8').reshape(1,1920)).resize((1920,1080))
    return Image.composite(current,previous,mask)

# Render static graphic changes as deliberate 0.65s reveals, not sudden cards.
EVENTS={'hook':[6], 'ai':[10], 'verify':[15,19.5,25,27.7], 'close':[8,19]}
def static(im,sid,t):
    fn={'hook':b.hook,'position':b.position,'ai':v16.ai,'verify':v16.proof,'close':v16.close}[sid]
    fn(im,t)
    for threshold in EVENTS.get(sid,[]):
        if threshold<=t<threshold+.65:
            before=b.background().copy();fn(before,threshold-.001)
            im.paste(reveal(before,im,ease((t-threshold)/.65)))
    # Stagger diagrams deliberately while retaining the exact authored content.
    regions=([(128+i*568,370,664+i*568,625)for i in range(3)]if sid=='close'else[(128,390,828,760),(995,390,1785,760)]if sid=='position'else[])
    for i,box in enumerate(regions):
        u=ease((t-.45-i*.3)/.65)
        if u<1:
            patch=im.crop(box);bg=b.background().crop(box)
            # Small 10px rise with fade; no overshoot or spring jitter.
            shifted=bg.copy();shifted.paste(patch,(0,round(10*(1-u))))
            im.paste(Image.blend(bg,shifted,u),box[:2])
    if sid=='position':b.text(im,(128,965),'Full local prototype · limited public preview excludes private review and chain writes',23,b.AMBER)

@lru_cache(maxsize=40)
def raw_frame(seconds):
    data=b.run(['ffmpeg','-v','error','-ss',str(seconds),'-i',str(ROOT/b.SYNC['video']),'-frames:v','1','-f','image2pipe','-vcodec','png','-'])
    return Image.open(io.BytesIO(data)).convert('RGB')

def content(scene,t,source=None,c=None,ct=0):
    im=b.background().copy();sid=scene['id']
    if source is not None:
        ui(im,source,c,ct)
        # No panel covers a live action. An exact observation excerpt replaces
        # the map only after its location has been established and held.
        if sid=='globe'and t>10:
            layer=im.copy();v16.observation(layer,t)
            im=Image.blend(im,layer,ease((t-10)/.7))
        footer='30,414 total plume records · 23,861 source-linked · historical snapshot'if sid=='planner'else'HISTORICAL DATA · CLAIM UNDER REVIEW, NOT A REPAIR CONFIRMATION'if sid=='scope'else'HISTORICAL DATA · NOT LIVE'if sid=='globe'else'SOFTWARE DEMO REVIEW · NOT A FIELD REPAIR CONFIRMATION'
        b.text(im,(140,975),footer,18,b.AMBER)
    else:static(im,sid,t)
    return im

@lru_cache(maxsize=12)
def final_content(sid):
    scene=next(s for s in STORY if s['id']==sid);t=scene['end']-scene['start']-.04
    cs=b.CLIPS.get(sid)
    if not cs:return content(scene,t)
    c=cs[-1];ct=c['duration']-.04;raw=min(c['sourceEnd']-.04,c['sourceStart']+ct*c['speed'])
    return content(scene,t,raw_frame(raw),c,ct)

def render_frame(scene,t,source=None,clip=None,clip_t=0):
    im=content(scene,t,source,clip,clip_t)
    if source is not None and clip_t<.55:
        clips=b.CLIPS[scene['id']];i=clips.index(clip)
        if i:
            previous=clips[i-1];prev_t=previous['duration']-.04;raw=min(previous['sourceEnd']-.04,previous['sourceStart']+prev_t*previous['speed'])
            prev=content(scene,t-.04,raw_frame(raw),previous,prev_t)
            im=reveal(prev,im,ease(clip_t/.55))
    index=next(i for i,s in enumerate(STORY)if s['id']==scene['id'])
    if t<.72 and index:im=reveal(final_content(STORY[index-1]['id']),im,ease(t/.72))
    # Composite one cursor AFTER all dissolves; never two ghost pointers.
    if source is not None:pointer(im,clip,clip_t,camera(clip,clip_t,ACTIONS))
    b.top(im,scene,t)
    # Keep branding/progress stable, and fade only the chapter title itself.
    title_box=(96,65,1335,105)
    u=ease(t/.38)*(1-ease((t-(scene['end']-scene['start']-.28))/.28))
    if u<1:im.paste(Image.blend(b.background().crop(title_box),im.crop(title_box),u),title_box[:2])
    b.caption(im,scene['start']+t)
    return im

def render_scene(scene,smoke=False):
    # One scene, encoder and current decoder at a time. The previous renderer
    # opened all decoders and forked workers, exceeding available local memory.
    sid=scene['id'];duration=scene['end']-scene['start']
    folder=OUT/('segments-'+hashlib.sha256((sha(HERE/'render.py')+sha(HERE/'motion.py')).encode()).hexdigest()[:10]);folder.mkdir(exist_ok=True)
    dest=folder/f'{sid}.mp4'
    if dest.exists():return dest
    clips=b.CLIPS.get(sid,[]);ends=b.np.cumsum([c['duration']for c in clips]);decoder=None;which=-1
    partial=folder/f'{sid}.partial.mp4';log=open(folder/f'{sid}.log','wb')
    encoder=subprocess.Popen(['ffmpeg','-v','error','-filter_threads','1','-f','rawvideo','-pixel_format','rgb24','-video_size','1920x1080','-framerate','25','-i','-','-an','-vf','scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p','-c:v','libx264','-preset','fast','-crf','18','-threads','1','-x264-params','rc-lookahead=8:sync-lookahead=0:bframes=2','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-fps_mode','cfr','-y',str(partial)],stdin=subprocess.PIPE,stderr=log)
    try:
        for frame in range(round(duration*25)):
            t=frame/25;source=None;c=None;ct=0
            if clips:
                i=min(len(clips)-1,bisect.bisect_right(ends,t));c=clips[i];ct=t-(ends[i-1]if i else 0)
                if i!=which:
                    if decoder:
                        decoder.stdout.close()
                        if decoder.poll()is None:decoder.terminate()
                        decoder.wait()
                    prepared=b.prepare_clip(c,f'{sid}-{i}')
                    decoder=subprocess.Popen(['ffmpeg','-v','error','-threads','1','-filter_threads','1','-i',str(prepared),'-pix_fmt','rgb24','-f','rawvideo','-'],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL);which=i
                data=decoder.stdout.read(1920*1080*3)
                if len(data)!=1920*1080*3:raise RuntimeError(f'Source ended early: {sid}/{frame}')
                source=Image.frombytes('RGB',(1920,1080),data)
            encoder.stdin.write(render_frame(scene,t,source,c,ct).tobytes())
        encoder.stdin.close()
        if encoder.wait():raise RuntimeError((folder/f'{sid}.log').read_text())
    finally:
        if decoder:
            decoder.stdout.close()
            if decoder.poll()is None:decoder.terminate()
            decoder.wait()
        if encoder.poll()is None:encoder.kill();encoder.wait()
        log.close();raw_frame.cache_clear();final_content.cache_clear()
    partial.rename(dest);print(json.dumps({'rendered':sid,'seconds':duration,'sequential':True}),flush=True);return dest

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--smoke',action='store_true');parser.add_argument('--frames',action='store_true');args=parser.parse_args()
    load();b.render_frame=render_frame
    if args.frames:
        dest=OUT/'preview';dest.mkdir(exist_ok=True);imgs=[]
        points=[('globe',13),('ai',10.3),('verify',15.3),('position',.36)]
        wanted=['Weighted historical indicators','Investigation slots','CLAIM TO EVALUATE','Period start','Apply assessment scope','Evidence acceptance criteria','Evidence to request','Request due date','Decision rationale','Freeze reviewed investigation decision']
        for sid,cs in b.CLIPS.items():
            acc=0
            for c in cs:
                for a in ACTIONS:
                    if c['sourceStart']<=a['performAt']<=c['sourceEnd']and any(w.lower()in a['name'].lower()for w in wanted):
                        points.append((sid,acc+min(c['duration']-.08,(a['performAt']-c['sourceStart'])/c['speed']+.16)))
                acc+=c['duration']
        for sid,t in points:
            scene=next(s for s in STORY if s['id']==sid);c=None;ct=0;src=None
            if sid in b.CLIPS:
                acc=0
                for c in b.CLIPS[sid]:
                    if t<acc+c['duration']:break
                    acc+=c['duration']
                ct=t-acc;src=raw_frame(min(c['sourceEnd']-.04,c['sourceStart']+ct*c['speed']))
            im=render_frame(scene,t,src,c,ct);im.save(dest/f'{sid}-{t}.png');imgs.append(im)
        sheet=Image.new('RGB',(1920,((len(imgs)+2)//3)*360))
        for i,im in enumerate(imgs):sheet.paste(im.resize((640,360)),(i%3*640,i//3*360))
        sheet.save(dest/'contact.jpg');return
    selected=[s for s in STORY if s['id']in ('planner','request')]if args.smoke else STORY
    for scene in selected:render_scene(scene,args.smoke)
    if args.smoke:return
    folder=OUT/('segments-'+hashlib.sha256((sha(HERE/'render.py')+sha(HERE/'motion.py')).encode()).hexdigest()[:10]);concat=OUT/'concat.txt';concat.write_text(''.join("file '"+str(folder/f"{s['id']}.mp4")+"'\n"for s in STORY))
    final=OUT/'MethaneResponse-Final-Submission-v17.mp4'
    if final.exists():raise FileExistsError('Preserve existing final')
    b.run(['ffmpeg','-v','error','-f','concat','-safe','0','-i',str(concat),'-i',str(OUT/'final-mix.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-t','280','-movflags','+faststart','-metadata','title=MethaneResponse — One Decision. Defensible Evidence.','-metadata','comment=Actual action-logged local capture; constant-size event-derived cursor; stock synthetic Andrew voice; separate KAZ AI archive; same-take TKM Anvil local proof.',str(final)])
    print(json.dumps({'video':str(final.relative_to(ROOT)),'sha256':sha(final),'bytes':final.stat().st_size}))
if __name__=='__main__':main()
