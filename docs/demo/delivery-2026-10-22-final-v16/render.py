"""Focused v16 picture revision. Reuse the verified v15 speech and actual takes.

All cards containing data are visibly editorial excerpts, never invented app UI.
No paid generation, new model request, voice replacement or public transaction.
"""
import argparse, concurrent.futures, hashlib, importlib.util, json, multiprocessing, sys
from functools import lru_cache
from pathlib import Path
from PIL import Image, ImageDraw
from prepare import HERE, ROOT, OUT, OLD, EVIDENCE

spec=importlib.util.spec_from_file_location('v15_film',HERE.parent/'delivery-2026-10-21-final-v15/render.py')
b=importlib.util.module_from_spec(spec);sys.modules[spec.name]=b;spec.loader.exec_module(b)
b.HERE=HERE;b.OUT=OUT
STORY=b.STORY
FACTS=None;REVISIT=None
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()

def load():
    global FACTS,REVISIT
    b.load()
    FACTS=json.loads((OUT/'verified-facts.json').read_text())
    raw=(ROOT/b.SYNC['video']).parent
    REVISIT=json.loads((raw/'revisited-investigation-decision.json').read_text())['revisit']
    assert REVISIT['historicalDecisionUnchanged'] is True
    assert REVISIT['reasons'][0]['code']=='new_authorized_response'
    # Tighter fixed camera framing; never chase the cursor or oscillate.
    settings={
        'globe':[(1.05,960,540),(1.85,1450,550)],
        'planner':[(2.0,700,655),(2.0,700,650)],
        'scope':[(1.8,960,450)],
        'request':[(2.1,760,460),(1.85,850,600),(2.0,850,720)],
        'revisit':[(2.0,1030,735)],
    }
    for sid,configs in settings.items():
        for clip,(zoom,cx,cy) in zip(b.CLIPS[sid],configs):
            clip.update(zoom=zoom,cx=cx,cy=cy)
    edit=json.loads((OUT/'edit.json').read_text())
    edit.update(clips=b.CLIPS,revision='v16',audio='Exact v15 final mix; no voice or timing change',
                notes=edit['notes']+['Editorial magnification and labeled exact export excerpts; recorded workflow unchanged.'])
    (OUT/'edit.json').write_text(json.dumps(edit,indent=2)+'\n')

def panel(im,box,kicker,color=b.TEAL):
    b.rect(im,box,fill=(6,24,35),outline=color,radius=18)
    b.label(im,(box[0]+28,box[1]+22),kicker,color)
def heading(im,xy,s,size=38,color=b.WHITE): b.text(im,xy,s,size,color,True)
def body(im,xy,s,size=30,width=1200,color=b.MUTED): return b.lines(im,xy,s,size,width,color,spacing=1.24)

def ui(im,source,t,duration,clip):
    # Smooth 1.4s approach, useful stable hold, smooth return. Magnification
    # happens within the real viewport and never renders nonexistent pixels.
    u=b.ease((t-.55)/1.4)*(1-b.ease((t-(duration-1.75))/1.25))
    z=b.lerp(1,clip['zoom'],u);cx=b.lerp(960,clip['cx'],u);cy=b.lerp(540,clip['cy'],u)
    vw,vh=1920/z,1080/z;ox=min(max(0,cx-vw/2),1920-vw);oy=min(max(0,cy-vh/2),1080-vh)
    tile=source.transform((1664,870),Image.Transform.AFFINE,(vw/1664,0,ox,0,vh/870,oy),resample=Image.Resampling.BICUBIC)
    im.paste(tile,(128,120));ImageDraw.Draw(im).rounded_rectangle((128,120,1791,989),radius=12,outline=(79,128,140),width=1)

def observation(im,t):
    obs=FACTS['sampleObservation']
    panel(im,(855,520,1762,964),'One historical observation · dataset excerpt')
    heading(im,(885,574),'TKM_S_021 · Sentinel-2',35)
    heading(im,(885,630),obs['date'].replace('T',' ')+' UTC',30)
    heading(im,(885,688),f"{obs['fluxKgHr']:,.0f} kg/h",50,b.TEAL)
    heading(im,(885,753),f"Reported SD: {obs['uncertaintyKgHr']:,.0f} kg/h",34)
    body(im,(885,817),'Satellite-estimated flux at one observation. Not continuous emissions or evidence of repair.',28,810)
    b.text(im,(885,921),'UNEP MARS · unep-mars-675417694883',20,b.MUTED)

def planner(im,t):
    if .8<t<7.8:
        panel(im,(850,675,1760,964),'Same snapshot · different record populations')
        heading(im,(882,729),'30,414 total plume records',37)
        heading(im,(882,782),'23,861 linked to source IDs',37,b.TEAL)
        body(im,(882,843),'6,553 unlinked records remain in the snapshot; they are not silently assigned to sources.',27,820)
    if 10.5<t<17.4:
        panel(im,(840,594,1760,964),'Recorded allocation · replay verified')
        for i,row in enumerate(b.PLAN_EXPLANATIONS['rows']):
            y=654+i*142
            heading(im,(874,y),row['sourceId'],38)
            reason='Selected within capacity and country quota' if row['reason']=='selected' else 'Country quota filled by earlier selections'
            body(im,(874,y+50),reason,31,816,b.TEAL if i==0 else b.AMBER)
    if 18.8<t<26:
        panel(im,(900,680,1760,964),'Comparison does not replace the active queue')
        heading(im,(930,736),'ACTIVE: 10 SOURCES',37,b.TEAL)
        heading(im,(930,790),'COMPARE: 20 SOURCES',37,b.AMBER)
        body(im,(930,850),'The active plan stays intact until explicit activation.',29,760)
    if 28<t<34.2:
        b.pill(im,(510,910),'Explicit activation → replace the active queue',b.TEAL,27)

@lru_cache(maxsize=1)
def archived():
    src=Image.open(ROOT/FACTS['quoteSource']).convert('RGB')
    # Crop around the actual result, excluding the long input form.
    return src

def ai(im,t):
    b.pill(im,(128,145),'SEPARATE RECORDED DEMO · KAZ_S_159 · 21 OCT',b.AMBER,23)
    heading(im,(128,205),'AI proposes. People review.',55)
    b.label(im,(128,285),'deepseek-v4.1-flash-1017 · backend integration')
    src=archived()
    if t<10:
        # Exact screenshot at higher size: no recreated result UI.
        patch=src.crop((790,1940,1408,2122)).resize((1545,455),Image.Resampling.LANCZOS)
        b.rect(im,(125,340,1795,820),fill=(6,24,35),outline=(55,104,120),radius=16)
        im.paste(patch,(190,351))
        b.label(im,(153,843),'Actual archived result · crop, no new model request',b.MUTED)
    else:
        panel(im,(128,335,1792,670),'Exact quotation · project-authored DEMO excerpt')
        # This exact transcript hashes to the quote SHA visibly in the original
        # screenshot; enlarging it does not upgrade its evidential status.
        body(im,(164,403),'“'+FACTS['quote']+'”',39,1560,b.WHITE)
        b.text(im,(164,613),'SHA-256: '+FACTS['quoteSha256'],21,b.MUTED,mono=True)
        panel(im,(128,700,1792,882),'Model suggestion · not an established physical outcome',b.AMBER)
        heading(im,(166,756),'INSUFFICIENT EVIDENCE',47,b.AMBER)
        body(im,(166,822),'Administrative correspondence is not a follow-up measurement.',29,1540)
    b.text(im,(128,935),'Not a TKM_S_021 model run. No verified physical mitigation.',28,b.AMBER,True)

def request(im,t):
    h=b.PROOF['record']['decision']['dossier']['history'][0]
    issued=h['requestEvents'][0]
    if 1<t<12:
        panel(im,(865,395,1760,964),'Exact export fields · software DEMO request')
        heading(im,(895,452),'What is needed?',38)
        body(im,(895,511),h['evidenceRequest'],34,807,b.WHITE)
        heading(im,(895,650),'Acceptance criteria',34,b.TEAL)
        body(im,(895,704),h['acceptanceCriteria'],31,807,b.WHITE)
        body(im,(895,866),f"Recipient: {issued['recipientRole']} · Due: {issued['dueDate']}",29,807,b.AMBER)
    elif 18<t<29.3:
        panel(im,(862,464,1760,964),'Frozen decision · exact DEMO export',b.AMBER)
        b.label(im,(895,516),'Claim under review',b.MUTED)
        body(im,(895,555),'Mitigation completed and confirmed?',36,808,b.WHITE)
        b.label(im,(895,676),'Actual decision',b.AMBER)
        heading(im,(895,720),'REQUEST MORE EVIDENCE',36,b.AMBER)
        body(im,(895,787),'The response alone is insufficient.',32,808,b.WHITE)
        b.text(im,(895,916),'Decision revision 1 · frozen work revision 5',23,b.MUTED)

def revisit(im,t):
    if 4<t<21:
        panel(im,(857,479,1760,964),'Actual revisit result · software DEMO response',b.AMBER)
        heading(im,(890,538),'REVIEW RECOMMENDED',37,b.AMBER)
        body(im,(890,605),'Reason: new authorized response',32,812,b.WHITE)
        b.text(im,(890,657),'new_authorized_response',25,b.TEAL,mono=True)
        heading(im,(890,721),'Frozen work: 5 → Latest work: 6',32)
        body(im,(890,782),'Decision revision 1 stays unchanged. The new response does not prove repair.',32,810,b.WHITE)

def proof(im,t):
    p=b.PROOF;r=p['record']['receipt'];b.title(im,'Exact TKM export → retained Anvil state','Verify a decision, not a repair.',t,62)
    b.pill(im,(128,320),'ANVIL LOCAL CHAIN · 31337',b.AMBER,23)
    b.pill(im,(655,320),'TKM_S_021 · Decision 1 · Work 5',b.TEAL,23)
    if t<15:
        panel(im,(128,390,1792,903),'Actual receipt and independently retained reviewer UI pin')
        b.label(im,(164,450),'Trusted SHA-256 digest · exact browser export',b.MUTED)
        digest=p['trustedDigest']
        for i,part in enumerate([digest[:34],digest[34:]]): b.text(im,(164,489+i*48),part,37,b.WHITE,mono=True)
        b.label(im,(164,607),'Transaction hash · Anvil receipt',b.MUTED)
        tx=r['txHash']
        for i,part in enumerate([tx[:34],tx[34:]]): b.text(im,(164,647+i*44),part,33,b.WHITE,mono=True)
        heading(im,(164,771),f"Block {r['blockNumber']} · Registry version {r['version']}",32,b.TEAL)
        b.text(im,(164,840),'Saved local state + export + exact receipt are included in the proof bundle.',27,b.MUTED)
    else:
        rows=[('Original decision','original','VERIFIED',b.TEAL),
              ('Altered + rehashed','alteredRehashed','REJECTED',b.CORAL),
              ('Original restored','originalAgain','VERIFIED',b.TEAL),
              ('After restart','afterRestart','VERIFIED',b.TEAL)]
        for i,(name,key,result,color) in enumerate(rows):
            y=391+i*110;active=t>=[14.6,19.5,25,27.7][i]
            b.rect(im,(128,y,1792,y+91),fill=(10,30,42),outline=color if active else (35,68,78),radius=15)
            heading(im,(164,y+24),name,35)
            if active:
                heading(im,(1160,y+24),result,34,color)
                b.text(im,(1540,y+30),f"CLI exit {p['checks'][key]['exitCode']}",23,b.MUTED,mono=True)
        b.text(im,(128,870),'bun run verify:investigation-decision  …  --require-chain',25,b.TEAL,mono=True)
    b.text(im,(128,945),'Local state is project-supplied DEMO evidence, not public notarization.',25,b.AMBER)

def close(im,t):
    b.close(im,t)
    # Keep the negative result, with the scorer scope explicit. Do not reinterpret
    # frozen task completion as an application-wide success/failure percentage.
    if t>8:
        b.rect(im,(128,678,1790,877),fill=(32,31,32),outline=(112,88,45),radius=17)
        b.label(im,(156,699),'Validation boundary · diagnostic agent lab, not a human pilot',b.AMBER)
        heading(im,(156,742),'Human productivity and climate outcomes remain unproven.',30)
        body(im,(156,793),'Frozen r12 scorer: task completion 0/48. This is not a pass rate for all application functions.',26,1540)
    if t>19:
        b.rect(im,(120,890,1800,989),fill=(6,24,35),outline=(6,24,35),radius=0,stroke=0)
        heading(im,(128,896),'Code & reproduction: github.com/AndroLay/MethaneResponse',32,b.TEAL)
        b.text(im,(128,947),'Limited preview: methaneresponse-preview.onrender.com',29,b.WHITE)

def render_frame(scene,t,source=None,clip=None,clip_t=0):
    im=b.background().copy();sid=scene['id']
    if source is not None:
        ui(im,source,clip_t,clip['duration'],clip)
        tag='HISTORICAL MARS CATALOG · 4,218 SOURCE RECORDS' if clip.get('catalogOnly') else 'TKM_S_021 · FULL LOCAL PROTOTYPE · SOFTWARE DEMO REVIEW'
        b.pill(im,(145,134),tag,b.AMBER,20)
        if sid=='globe':
            if t<9:
                b.pill(im,(152,918),'Imagery: Esri / NASA · location context, not plume imagery',b.TEAL,19)
            elif t>11: observation(im,t)
        elif sid=='planner': planner(im,t)
        elif sid=='scope' and t>8:
            panel(im,(1040,585,1760,964),'Claim under review · DEMO hypothesis',b.AMBER)
            body(im,(1070,644),'Was mitigation completed and confirmed?',40,650,b.WHITE)
            heading(im,(1070,783),'INSUFFICIENT EVIDENCE',29,b.AMBER)
            body(im,(1070,830),'Detection metadata cannot confirm repair.',28,650)
            b.text(im,(1070,928),'UTC: 2020-10-29 → 2026-09-13',23,b.MUTED)
        elif sid=='request': request(im,t)
        elif sid=='revisit': revisit(im,t)
    elif sid=='hook': b.hook(im,t)
    elif sid=='position':
        b.position(im,t)
        b.text(im,(128,965),'Demo: full local prototype · public preview: selected sources; no private review or chain writes',22,b.AMBER)
    elif sid=='ai': ai(im,t)
    elif sid=='verify': proof(im,t)
    elif sid=='close': close(im,t)
    duration=scene['end']-scene['start'];opacity=b.ease(t/.48)*(1-b.ease((t-(duration-.4))/.4))
    if opacity<1:im=Image.blend(b.background(),im,opacity)
    b.top(im,scene,t);b.caption(im,scene['start']+t)
    return im

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--smoke',action='store_true');parser.add_argument('--frames',action='store_true')
    args=parser.parse_args();load();b.render_frame=render_frame
    if args.frames:
        folder=OUT/'preview';folder.mkdir(exist_ok=True)
        # Native frames at meaningful reading holds, with raw-video times explicit.
        points=[('globe',15,14),('planner',7,25),('planner',22,37),('scope',14,57),
                ('ai',8,None),('ai',17,None),('request',5,64),('request',23,114),
                ('revisit',14,133),('verify',8,None),('verify',24,None),('close',28,None)]
        thumbs=[]
        for i,(sid,t,rawtime) in enumerate(points):
            scene=next(s for s in STORY if s['id']==sid);source=None;clip=None;local=t
            if rawtime is not None:
                png=b.run(['ffmpeg','-v','error','-ss',str(rawtime),'-i',str(ROOT/b.SYNC['video']),'-frames:v','1','-f','image2pipe','-vcodec','png','-'])
                import io
                source=Image.open(io.BytesIO(png)).convert('RGB')
                if sid=='globe':clip=b.CLIPS[sid][1];local=t-9
                elif sid=='planner':clip=b.CLIPS[sid][0 if t<18 else 1];local=t%18
                elif sid=='request':clip=b.CLIPS[sid][0 if t<10 else 2];local=t if t<10 else t-17
                else:clip=b.CLIPS[sid][0]
            frame=render_frame(scene,t,source,clip,local);path=folder/f'{i:02}-{sid}.png';frame.save(path);thumbs.append(frame)
        contact=Image.new('RGB',(1920,4*360))
        for i,frame in enumerate(thumbs):contact.paste(frame.resize((640,360)),(i%3*640,i//3*360))
        contact.save(folder/'contact.jpg');print('12 native preview frames prepared');return
    selected=[s for s in STORY if s['id'] in ['ai','request','verify']] if args.smoke else STORY
    with concurrent.futures.ProcessPoolExecutor(max_workers=2,mp_context=multiprocessing.get_context('fork')) as pool:
        for future in [pool.submit(b.render_scene,s,args.smoke) for s in selected]: future.result()
    if args.smoke:return
    folder=OUT/('segments-'+sha(HERE/'render.py')[:10])
    concat=OUT/'concat.txt';concat.write_text(''.join("file '"+str(folder/f"{s['id']}.mp4")+"'\n" for s in STORY))
    final=OUT/'MethaneResponse-Final-Submission-v16.mp4'
    if final.exists(): raise FileExistsError('Preserve existing v16 final')
    # The web upload master has burned-in subtitles only. Sidecar SRT is
    # supplied separately, avoiding automatic double captions on MP4 players.
    b.run(['ffmpeg','-v','error','-f','concat','-safe','0','-i',str(concat),'-i',str(OUT/'final-mix.wav'),
           '-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-ac','2',
           '-t','280','-movflags','+faststart','-metadata','title=MethaneResponse — One Decision. Defensible Evidence.',
           '-metadata','comment=Actual local UI; labeled export excerpts; stock synthetic Andrew; separate recorded KAZ AI; TKM Anvil local proof.',str(final)])
    print(json.dumps({'video':str(final.relative_to(ROOT)),'sha256':sha(final),'bytes':final.stat().st_size}))

if __name__=='__main__':main()
