"""Bounded v18 edit: two new stock-voice cues, honest impact pathway, UI banners.

Reuses the complete v17 film. Does not recapture UI or contact an AI provider.
"""
import argparse,asyncio,bisect,copy,hashlib,importlib.util,json,math,re,subprocess,sys,wave
from functools import lru_cache
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw

HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
OUT=ROOT/'delivery-output/final-v18';OLD=ROOT/'delivery-output/final-v15-TAKE01'
SOURCE=ROOT/'delivery-output/final-v17/MethaneResponse-Final-Submission-v17.mp4'
SR=48000;FPS=25;INSERT=17;DURATION=297;BAND=(128,116,1664,70)
STAKES='Methane is a powerful warming gas. A satellite detection is a starting point, not proof that a leak was repaired. A response still needs evidence.'
IMPACT=('Potential climate impact comes after the software. Prioritized investigations and evidence requests can guide field follow-up. '
        'Documented repairs and comparable post-action measurements are needed to substantiate emissions reductions. We have not measured those outcomes.')
BANNERS={
 'request':[
  dict(start=0,end=5,label='MISSING EVIDENCE',text='Source-specific post-action measurements are not supplied in this DEMO.'),
  dict(start=5,end=23,label='ACTION REQUIRED',text='Request dated measurements, methods and uncertainty.'),
  dict(start=23,end=31,label='REVIEWABLE DECISION',text='Record the rationale; freeze the decision for later review.')],
 'revisit':[dict(start=0,end=23,label='REVIEWABLE DECISION',text='New evidence opens review. The previous decision remains unchanged.')]
}
NODES=[
 dict(title='Satellite observations',body='UNEP MARS\nHistorical, not live',status='REAL HISTORICAL INPUT',demonstrated=True),
 dict(title='Investigation priorities',body='Explainable plan\nSpecific evidence request',status='SHOWN IN LOCAL DEMO',demonstrated=True),
 dict(title='Field investigation',body='Organizations investigate\nand document repair',status='FIELD ACTION REQUIRED',demonstrated=False),
 dict(title='Measure the outcome',body='Comparable post-action\nmeasurements + uncertainty',status='NOT DEMONSTRATED',demonstrated=False),
]

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def dump(p,v):p.write_text(json.dumps(v,indent=2)+'\n')
def run(args,**kw):
    p=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,**kw)
    if p.returncode:raise RuntimeError(p.stderr.decode(errors='replace')[-2400:])
    return p.stdout
def read_pcm(p):
    with wave.open(str(p))as w:
        assert w.getframerate()==SR and w.getsampwidth()==2 and w.getnchannels()==1
        return np.frombuffer(w.readframes(w.getnframes()),'<i2').copy()

def module(name,path):
    spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);sys.modules[name]=m;spec.loader.exec_module(m);return m

def prepare(cached=False):
    OUT.mkdir(parents=True,exist_ok=True)
    assert sha(SOURCE)=='e0764396ca1ec16e458396f037c09e3de36b3cd39b91d4bde4f2a3059171f57c'
    base=module('v18voice',HERE.parent/'delivery-2026-10-19-final-v12/narration.py')
    base.OUT=OUT;base.VOICE='en-US-AndrewMultilingualNeural';base.RATE='-2%'
    authored=[dict(id='stakes',text=STAKES),dict(id='impact',text=IMPACT)]
    if not cached:
        async def generate():
            semaphore=asyncio.Semaphore(1)
            for cue in authored:await base.synthesize(cue,semaphore)
        asyncio.run(generate())
    m=json.loads((OLD/'narration-manifest.json').read_text());old_cues=m['cues']
    old_stakes=next(c for c in old_cues if c['id']=='stakes')
    original=read_pcm(OLD/'narration.wav');track=np.concatenate([original[:246*SR],np.zeros(INSERT*SR,dtype='<i2'),original[246*SR:]])
    track[round(old_stakes['start']*SR):round(old_stakes['end']*SR)]=0
    cues=[]
    for cue in old_cues:
        if cue['id']=='stakes':continue
        c=copy.deepcopy(cue)
        if c['start']>=246:
            c['start']+=INSERT;c['end']+=INSERT
            c['words']=[{**w,'start':w['start']+INSERT,'end':w['end']+INSERT}for w in c['words']]
        cues.append(c)
    timing=[]
    for cue,start,limit,scene in [(authored[0],old_stakes['start'],old_stakes['end'],'hook'),(authored[1],246.30,262.70,'impact')]:
        samples,words,provenance=base.load_cue(cue);raw=len(samples)/SR
        factor=max(.92,raw/(limit-start))
        if factor>1.10:raise ValueError(f'Shorten {cue["id"]}: voice needs {factor:.3f}x')
        samples=np.frombuffer(run(['ffmpeg','-v','error','-f','f32le','-ar',str(SR),'-ac','1','-i','-',
            '-af',f'atempo={factor:.9f}','-f','f32le','-'],input=samples.astype('<f4').tobytes()),'<f4').copy()
        if start+len(samples)/SR>limit+.03:raise ValueError('Narration exceeds reserved window')
        pos=round(start*SR);track[pos:pos+len(samples)]=np.rint(np.clip(samples,-1,1)*32767).astype('<i2')
        c={**cue,'scene':scene,'start':start,'end':start+len(samples)/SR,
           'words':[{**w,'start':start+w['start']/factor,'end':min(start+len(samples)/SR,start+w['end']/factor)}for w in words]}
        cues.append(c);timing.append(dict(id=cue['id'],rawSeconds=raw,tempo=factor,start=start,end=c['end'],generation=provenance))
    cues.sort(key=lambda c:c['start'])
    with wave.open(str(OUT/'narration.wav'),'wb')as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes(track.tobytes())
    # Retain exact existing caption timing outside the replaced/inserted cues.
    old_caps=json.loads((OLD/'captions.json').read_text())
    caps=[]
    for c in old_caps:
        if old_stakes['start']-.12<=c['start']<old_stakes['end']:continue
        delta=INSERT if c['start']>=246 else 0
        caps.append({**c,'start':c['start']+delta,'end':c['end']+delta})
    sys.path.insert(0,str(HERE.parent/'delivery-2026-10-19-final-v12'));sys.modules['narration']=base
    phrase_module=module('v18phrases',HERE.parent/'delivery-2026-10-19-final-v12/captions.py')
    caps+=phrase_module.phrases([c for c in cues if c['id']in ['stakes','impact']]);caps.sort(key=lambda c:c['start'])
    for a,b in zip(caps,caps[1:]):a['end']=min(a['end'],b['start']-.015)
    dump(OUT/'captions.json',caps)
    (OUT/'captions.en.srt').write_text('\n\n'.join(f'{i+1}\n{base.timecode(c["start"])} --> {base.timecode(c["end"])}\n{c["text"]}'for i,c in enumerate(caps))+'\n')
    dump(OUT/'narration-manifest.json',dict(voice=base.VOICE,rate=base.RATE,engine='edge-tts 7.3.1',synthetic=True,voiceCloning=False,
        newSynthesisCues=2,generatedVoiceCandidates=len(list((OUT/'voice-cues').glob('*.mp3'))),privateDocumentsSent=False,durationSeconds=DURATION,cues=cues,newCueTiming=timing,
        originalNarrationSha256=sha(OLD/'narration.wav'),narrationSha256=sha(OUT/'narration.wav')))
    story=json.loads((HERE.parent/'delivery-2026-10-21-final-v15/story.json').read_text());story['duration']=DURATION
    story['scenes'][0]['cues'][1]['text']=STAKES
    story['scenes'][-1]['start']+=INSERT;story['scenes'][-1]['end']+=INSERT
    story['scenes'].insert(-1,dict(id='impact',start=246,end=263,chapter='From data to potential climate impact',kind='editorial pathway',cues=[authored[1]]))
    dump(OUT/'story.json',story)
    spec=json.loads((ROOT/'delivery-output/final-v17/delivery-spec.json').read_text());spec['duration_seconds']=DURATION;dump(OUT/'delivery-spec.json',spec)
    print(json.dumps({'newVoiceTiming':timing,'duration':DURATION}),flush=True)

@lru_cache(maxsize=1)
def drawing():
    b=module('v18drawing',HERE.parent/'delivery-2026-10-21-final-v15/render.py')
    b.CAPTIONS=json.loads((OUT/'captions.json').read_text());b.CAP_STARTS=[c['start']for c in b.CAPTIONS]
    return b

def smooth(t):t=max(0,min(1,t));return t*t*t*(t*(t*6-15)+10)

def reveal(previous,current,u):
    """Move a narrow softened edge; do not dissolve two entire text screens."""
    if u<=0:return previous.copy()
    if u>=1:return current.copy()
    w,h=current.size;boundary=-100+(w+200)*u
    row=np.clip((boundary-np.arange(w))/96+.5,0,1)
    mask=Image.fromarray((row*255).astype('uint8').reshape(1,w)).resize((w,h))
    return Image.composite(current,previous,mask)

def encode_frames(dest,size,seconds,frame):
    if dest.exists():return
    partial=dest.with_name(dest.stem+'.partial.mp4');log=dest.with_suffix('.log').open('wb')
    proc=subprocess.Popen(['ffmpeg','-v','error','-filter_threads','1','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{size[0]}x{size[1]}',
        '-framerate','25','-i','-','-an','-vf','scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p','-c:v','libx264','-preset','fast','-crf','16','-threads','1','-pix_fmt','yuv420p',
        '-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-y',str(partial)],stdin=subprocess.PIPE,stderr=log)
    try:
        for n in range(round(seconds*FPS)):proc.stdin.write(frame(n/FPS).convert('RGB').tobytes())
        proc.stdin.close()
        if proc.wait():raise RuntimeError(dest.with_suffix('.log').read_text())
    finally:
        if proc.poll()is None:proc.kill();proc.wait()
        log.close()
    partial.rename(dest)

def caption_band(t):
    b=drawing();im=b.background().copy();b.caption(im,t);return im.crop((0,1000,1920,1080))

def banner(sid,t):
    b=drawing();x,y,w,h=BAND;bg=b.background().crop((x,y,x+w,y+h));im=bg.copy()
    for item in BANNERS[sid]:
        if not(item['start']<=t<item['end']):continue
        u=smooth((t-item['start'])/.40)*smooth((item['end']-t)/.35)
        b.text(im,(16,0),item['label'],21,b.AMBER if item['label']=='MISSING EVIDENCE'else b.TEAL,True)
        b.text(im,(16,31),item['text'],27,b.WHITE,True)
        return Image.blend(bg,im,u)
    return bg

def icon(im,index,x,y,color):
    d=ImageDraw.Draw(im);w=4
    if index==0:
        d.polygon([(x,y-23),(x+23,y),(x,y+23),(x-23,y)],outline=color,width=w)
        for a in [-1,1]:d.rectangle((x+a*55-16,y-13,x+a*55+16,y+13),outline=color,width=w)
        d.line((x-23,y,x-39,y),fill=color,width=w);d.line((x+23,y,x+39,y),fill=color,width=w)
    elif index==1:
        for j in range(3):
            yy=y-26+j*25;d.ellipse((x-45,yy-5,x-35,yy+5),fill=color);d.line((x-23,yy,x+42,yy),fill=color,width=w)
    elif index==2:
        d.polygon([(x-50,y+27),(x-50,y-7),(x-10,y+5),(x-10,y-15),(x+30,y+4),(x+30,y+27)],outline=color,width=w)
        d.rectangle((x+32,y-37,x+47,y+27),outline=color,width=w)
    else:
        d.line((x-49,y-32,x-49,y+32,x+50,y+32),fill=color,width=w)
        for xx,yy in [(-28,10),(-4,-13),(23,5),(43,-20)]:
            d.line((x+xx,y+yy-10,x+xx,y+yy+10),fill=color,width=2)
            d.ellipse((x+xx-4,y+yy-4,x+xx+4,y+yy+4),fill=color)

def impact_frame(t):
    b=drawing();im=b.background().copy()
    b.text(im,(96,35),'METHANERESPONSE',22,b.TEAL,True)
    b.text(im,(96,69),'From data to potential climate impact',32,b.WHITE,True)
    b.text(im,(128,182),'Beyond the software: accountable field follow-up',47,b.WHITE,True)
    b.text(im,(128,264),'Historical input + demonstrated workflow',25,b.TEAL,True)
    b.text(im,(1034,264),'Potential application · not an achieved outcome',25,b.AMBER,True)
    m=json.loads((OUT/'narration-manifest.json').read_text());cue=next(c for c in m['cues']if c['id']=='impact')
    field_time=next((w['start']-246 for w in cue['words']if w['text'].casefold()=='field'),4.0)
    measure_time=next((w['start']-246 for w in cue['words']if w['text'].casefold()=='comparable'),8.0)
    starts=[.35,1.1,max(2.0,field_time-.65),max(4.0,measure_time-.65)]
    for i,node in enumerate(NODES):
        x=128+i*424;y=390;u=smooth((t-starts[i])/.65)
        if i:
            for xx in range(x-48,x-8,12 if i>=2 else 4):
                ImageDraw.Draw(im).line((xx,530,xx+5,530),fill=b.AMBER if i>=2 else b.TEAL,width=3)
        layer=b.background().copy();color=b.TEAL if node['demonstrated']else b.AMBER
        b.rect(layer,(x,y,x+392,826),fill=(9,31,43),outline=color,radius=20)
        icon(layer,i,x+196,y+75,color)
        b.text(layer,(x+23,y+144),f'0{i+1}',23,color,True)
        b.lines(layer,(x+23,y+190),node['title'],30,347,b.WHITE,True,spacing=1.12)
        b.lines(layer,(x+23,y+280),node['body'],23,347,b.MUTED,spacing=1.3)
        b.text(layer,(x+23,y+399),node['status'],16,color,True)
        patch=layer.crop((x,y,x+392,826));original=im.crop((x,y,x+392,826))
        im.paste(Image.blend(original,patch,u),(x,y))
    b.text(im,(128,894),'Potential pathway only. No repairs or methane reductions measured by this prototype.',29,b.AMBER,True)
    b.text(im,(128,951),'Measurements need comparable conditions, documented methods and uncertainty.',24,b.MUTED)
    # Retain the v17 exit frame at the entry; bridge back to its existing outro.
    if t<.72:im=reveal(join_frame('verify',245.96),im,smooth(t/.72))
    if t>INSERT-.72:im=reveal(im,join_frame('close',246.72),smooth((t-(INSERT-.72))/.72))
    b.caption(im,246+t)
    return im

@lru_cache(maxsize=2)
def join_frame(name,t):
    import io
    data=run(['ffmpeg','-v','error','-threads','1','-ss',str(t),'-i',str(SOURCE),'-frames:v','1','-f','image2pipe','-vcodec','png','-'])
    im=Image.open(io.BytesIO(data)).convert('RGB')
    # Caption-free visual bridge; actual narration captions are drawn separately.
    im.paste(drawing().background().crop((0,1000,1920,1080)),(0,1000));return im

def render_assets():
    encode_frames(OUT/'hook-captions.mp4',(1920,80),22,caption_band)
    for sid,seconds in [('request',31),('revisit',23)]:
        encode_frames(OUT/f'{sid}-labels.mp4',(1664,70),seconds,lambda t,sid=sid:banner(sid,t))
    encode_frames(OUT/'close-captions.mp4',(1920,80),34,lambda t:caption_band(263+t))
    encode_frames(OUT/'impact.mp4',(1920,1080),INSERT,impact_frame)
    p=OUT/'previews';p.mkdir(exist_ok=True)
    for t in [1,5,10,14]:impact_frame(t).save(p/f'impact-{t}.png')

def mix():
    music=OUT/'original-instrumental-extended.wav'
    if not music.exists():run([sys.executable,str(ROOT/'scripts/generate-demo-music.py'),str(music),str(DURATION)])
    old_music=ROOT/'delivery-output/story-v4/original-instrumental.wav'
    with wave.open(str(old_music))as a,wave.open(str(music))as b:
        # Same composition; only the ending envelope is moved later.
        assert a.readframes(284*SR)==b.readframes(284*SR),'Score differs before the original fade'
    previous=module('v18mix',HERE.parent/'delivery-2026-10-19-final-v12/finish.py')
    # Its small existing mixer uses a fixed score path. Reuse its measured mix
    # algorithm here with the explicitly extended, verified original score.
    filters=(f'[0:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,asplit=2[voice][control];'
      f'[1:a]atrim=0:{DURATION},asetpts=PTS-STARTPTS,volume=0.22,afade=t=in:d=1.2,afade=t=out:st={DURATION-2}:d=2[music];'
      '[music][control]sidechaincompress=threshold=0.018:ratio=5:attack=25:release=240:makeup=1[ducked];'
      '[voice][ducked]amix=inputs=2:normalize=0:duration=first[mix]')
    run(['ffmpeg','-v','error','-filter_complex_threads','1','-i',str(OUT/'narration.wav'),'-i',str(music),'-filter_complex',filters,
        '-map','[mix]','-c:a','pcm_s24le','-t',str(DURATION),'-y',str(OUT/'premix.wav')])
    result=subprocess.run(['ffmpeg','-hide_banner','-i',str(OUT/'premix.wav'),'-af','loudnorm=I=-18:TP=-2:LRA=9:print_format=json','-f','null','-'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True)
    stats=json.loads(re.findall(r'\{\s*"input_i".*?\}',result.stderr.decode(),re.S)[-1])
    filt='loudnorm=I=-18:TP=-2:LRA=9:linear=true:'+':'.join(f'{a}={stats[b]}'for a,b in [('measured_I','input_i'),('measured_TP','input_tp'),('measured_LRA','input_lra'),('measured_thresh','input_thresh'),('offset','target_offset')])
    run(['ffmpeg','-v','error','-i',str(OUT/'premix.wav'),'-af',filt,'-ar','48000','-ac','2','-c:a','pcm_s24le','-y',str(OUT/'final-mix.wav')])
    dump(OUT/'mix-manifest.json',dict(originalMusic=str(old_music.relative_to(ROOT)),originalMusicSha256=sha(old_music),
        extendedMusicSha256=sha(music),unchangedScoreBeforeSeconds=284,durationSeconds=DURATION,measurements=stats,
        musicReplaced=False,newMusicGenerationServiceCalls=0,finalMixSha256=sha(OUT/'final-mix.wav')))

def assemble():
    dest=OUT/'MethaneResponse-Final-Submission-v18.mp4'
    if dest.exists():raise FileExistsError('Preserve existing final')
    story=json.loads((OUT/'story.json').read_text());metadata=';FFMETADATA1\ntitle=MethaneResponse — From observations to accountable action\n'
    metadata+='comment=Actual v17 local UI and Anvil proof retained; new editorial potential-impact pathway, not measured emissions reductions. Stock synthetic male Andrew; original procedural score.\n'
    for s in story['scenes']:metadata+=f'[CHAPTER]\nTIMEBASE=1/1000\nSTART={s["start"]*1000}\nEND={s["end"]*1000}\ntitle={s["chapter"]}\n'
    (OUT/'chapters.ffmetadata').write_text(metadata)
    graph=(
      '[0:v]setpts=PTS-STARTPTS[head];[2:v]setpts=PTS-STARTPTS,tpad=start_mode=clone:start_duration=0.72,trim=duration=34[tailpre];[tailpre][6:v]overlay=0:1000:shortest=1[tail];'
      '[head][3:v]overlay=0:1000:enable=lt(t\\,22):eof_action=pass[h];'
      '[4:v]setpts=PTS+153/TB[request];[h][request]overlay=128:116:enable=between(t\\,153\\,184):eof_action=pass[r];'
      '[5:v]setpts=PTS+184/TB[revisit];[r][revisit]overlay=128:116:enable=between(t\\,184\\,207):eof_action=pass[edited];'
      '[edited][1:v][tail]concat=n=3:v=1:a=0[film];'
      f'color=c=0x214652:s=1728x4:r=25:d={DURATION}[track];'
      f'color=c=0x52d5c7:s=1728x4:r=25:d={DURATION}[fill];'
      f'[track][fill]overlay=x=-1728+1728*t/{DURATION}:y=0:shortest=1[bar];'
      '[film][bar]overlay=x=96:y=105:shortest=1[v]')
    dump(OUT/'edit.json',dict(sourceVideo=str(SOURCE.relative_to(ROOT)),sourceSha256=sha(SOURCE),
        insertAt=246,insertSeconds=17,durationSeconds=297,bannerRegion=BAND,banners=BANNERS,
        cameraAndCursor='All actual v17 geometry and cursor travel retained; no recapture or fabricated clicks',
        captionReplacementRegion=[0,1000,1920,80],climateImpact='Potential pathway, not observed outcomes',
        publicTransactions=0,modelProviderCalls=0))
    run(['ffmpeg','-v','error','-filter_complex_threads','1','-threads','1','-t','246','-i',str(SOURCE),
         '-threads','1','-i',str(OUT/'impact.mp4'),'-threads','1','-ss','246.72','-t','33.28','-i',str(SOURCE),
         '-threads','1','-i',str(OUT/'hook-captions.mp4'),'-threads','1','-i',str(OUT/'request-labels.mp4'),
         '-threads','1','-i',str(OUT/'revisit-labels.mp4'),'-threads','1','-i',str(OUT/'close-captions.mp4'),'-i',str(OUT/'final-mix.wav'),'-i',str(OUT/'chapters.ffmetadata'),
         '-filter_complex',graph,'-map','[v]','-map','7:a:0','-map_metadata','8','-map_chapters','8',
         '-c:v','libx264','-preset','fast','-crf','17','-threads','1','-pix_fmt','yuv420p','-r','25','-fps_mode','cfr',
         '-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-c:a','aac','-b:a','192k','-ar','48000','-ac','2',
         '-t',str(DURATION),'-movflags','+faststart',str(dest)])
    print(json.dumps(dict(video=str(dest.relative_to(ROOT)),sha256=sha(dest))),flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('stage',choices=['prepare','assets','mix','assemble']);parser.add_argument('--cached',action='store_true');args=parser.parse_args()
    if args.stage=='prepare':prepare(args.cached)
    elif args.stage=='assets':render_assets()
    elif args.stage=='mix':mix()
    else:assemble()
