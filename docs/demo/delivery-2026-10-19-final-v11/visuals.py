"""Original, deterministic presentation graphics. No generated scientific imagery."""
from functools import lru_cache
from math import sin, cos, pi, sqrt
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W,H=1920,1080
INK=(7,23,35); TEAL=(85,216,197); WHITE=(244,249,248); MUTED=(164,188,194)
AMBER=(241,185,85); CORAL=(238,133,120); PAPER=(243,247,245); BLUE=(70,145,187)
FONT='/usr/share/fonts/inter/Inter.ttc'
MONO='/usr/share/fonts/TTF/DejaVuSansMono.ttf'
def clamp(x,a=0,b=1): return min(b,max(a,x))
def ease(x):
    x=clamp(x); return x*x*x*(10+x*(-15+6*x))
def lerp(a,b,u): return a+(b-a)*u
def alpha(c,a=1): return (*c,round(255*clamp(a)))
@lru_cache(maxsize=128)
def font(size,bold=False,mono=False): return ImageFont.truetype(MONO if mono else FONT, int(size),index=0 if mono or not bold else 14)
def text(im,xy,value,size=30,fill=WHITE,bold=False,mono=False,a=1,anchor=None):
    opacity=clamp(a)
    if opacity<=0:return
    face=font(size,bold,mono);value=str(value)
    if opacity>=1:
        ImageDraw.Draw(im).text(xy,value,font=face,fill=fill,anchor=anchor)
        return
    # Composite a glyph mask explicitly: ImageDraw's RGB text rendering can
    # ignore the alpha channel of a fill even with an RGBA drawing context.
    box=ImageDraw.Draw(im).textbbox(xy,value,font=face,anchor=anchor)
    left,top=int(box[0])-2,int(box[1])-2
    right,bottom=int(box[2])+3,int(box[3])+3
    mask=Image.new('L',(max(1,right-left),max(1,bottom-top)))
    ImageDraw.Draw(mask).text((xy[0]-left,xy[1]-top),value,font=face,
                             fill=round(255*opacity),anchor=anchor)
    im.paste(fill,(left,top,right,bottom),mask)
def lines(im,xy,value,size=32,width=900,fill=WHITE,bold=False,a=1,spacing=1.24):
    f=font(size,bold); y=xy[1]
    for paragraph in value.split('\n'):
        line=''
        for word in paragraph.split():
            candidate=(line+' '+word).strip()
            if f.getlength(candidate)>width and line:
                text(im,(xy[0],y),line,size,fill,bold,a=a); y+=size*spacing; line=word
            else: line=candidate
        text(im,(xy[0],y),line,size,fill,bold,a=a); y+=size*spacing
    return y
def rect(im,box,fill=(15,43,55),outline=(43,83,95),radius=20,a=1,stroke=2):
    ImageDraw.Draw(im,'RGBA').rounded_rectangle(box,radius=radius,fill=alpha(fill,a),outline=alpha(outline,a),width=stroke)
def line(im,points,fill=TEAL,width=3,a=1): ImageDraw.Draw(im,'RGBA').line(points,fill=alpha(fill,a),width=width,joint='curve')
def dot(im,x,y,r=7,fill=TEAL,a=1): ImageDraw.Draw(im,'RGBA').ellipse((x-r,y-r,x+r,y+r),fill=alpha(fill,a))
def reveal(t,delay=0,duration=.85): return ease((t-delay)/duration)
def label(im,xy,value,fill=TEAL,a=1): text(im,xy,value.upper(),19,fill,bold=True,a=a)
def title(im,kicker,value,t,width=1500,light=False):
    u=reveal(t,.25)
    label(im,(128,155+18*(1-u)),kicker,fill=(19,115,108) if light else TEAL,a=u)
    lines(im,(128,210+25*(1-u)),value,64,width,INK if light else WHITE,True,u,1.1)
def source(im,value,light=False): text(im,(128,1012),value,18,(73,102,109) if light else MUTED,mono=True)

@lru_cache(maxsize=2)
def background(light=False):
    yy,xx=np.mgrid[0:H,0:W]
    if light:
        base=np.array(PAPER,float); glow=np.exp(-((xx-1450)**2/(850**2)+(yy-400)**2/(750**2)))
        arr=np.clip(base[None,None,:]-glow[:,:,None]*np.array([15,3,4]),0,255)
    else:
        base=np.array(INK,float); glow=np.exp(-((xx-1400)**2/(900**2)+(yy-430)**2/(700**2)))
        arr=base[None,None,:]+glow[:,:,None]*np.array([5,25,25])
    im=Image.fromarray(arr.astype(np.uint8),'RGB'); d=ImageDraw.Draw(im,'RGBA')
    for x in range(0,W,80): d.line((x,110,x,H),fill=(80,130,138,12 if light else 10))
    for y in range(110,H,80): d.line((0,y,W,y),fill=(80,130,138,12 if light else 10))
    return im

@lru_cache(maxsize=4)
def sphere(radius,light=False):
    n=radius*2+4; yy,xx=np.mgrid[0:n,0:n]
    x=(xx-n/2)/radius; y=(yy-n/2)/radius; inside=x*x+y*y<=1
    z=np.sqrt(np.maximum(0,1-x*x-y*y)); shade=np.clip(-.35*x-.45*y+.82*z,.08,1)
    base=np.array([16,81,109] if not light else [22,113,129]); color=np.zeros((n,n,4),dtype=np.uint8)
    color[:,:,:3]=(base[None,None,:]*(.35+.75*shade[:,:,None])).astype(np.uint8)
    color[:,:,3]=inside.astype(np.uint8)*255
    return Image.fromarray(color,'RGBA')
def globe(im,cx,cy,r,t,light=False):
    tile=sphere(r,light); im.paste(tile,(round(cx-r-2),round(cy-r-2)),tile)
    d=ImageDraw.Draw(im,'RGBA'); rotation=.35+min(t,12)*.018
    def project(lat,lon):
        x=cos(lat)*sin(lon+rotation); y=sin(lat); z=cos(lat)*cos(lon+rotation)
        # A tilted conceptual globe, not a remote-sensing image.
        return cx+r*x,cy-r*(y*.94-z*.34),z*.94+y*.34
    for latitude in range(-60,90,30):
        path=[]
        for i in range(181):
            p=project(latitude*pi/180,-pi+i*2*pi/180)
            if p[2]>0: path.append(p[:2])
            elif len(path)>1: d.line(path,fill=(*TEAL,80),width=2); path=[]
        if len(path)>1:d.line(path,fill=(*TEAL,80),width=2)
    for longitude in range(0,360,30):
        path=[]
        for i in range(91):
            p=project(-pi/2+i*pi/90,longitude*pi/180)
            if p[2]>0:path.append(p[:2])
            elif len(path)>1:d.line(path,fill=(*TEAL,80),width=2);path=[]
        if len(path)>1:d.line(path,fill=(*TEAL,80),width=2)
    d.ellipse((cx-r-5,cy-r-5,cx+r+5,cy+r+5),outline=(*TEAL,100),width=2)
    # Original satellite prop; no measurement or instrument performance implied.
    phase=-.95+min(t,12)*.018
    sx=cx+cos(phase)*r*1.32; sy=cy+sin(phase)*r*1.25
    d.arc((cx-r*1.4,cy-r*1.25,cx+r*1.4,cy+r*1.25),180,350,fill=(*TEAL,65),width=2)
    line(im,[(sx-23,sy-15),(sx+24,sy+18)],WHITE,6)
    for side in [-1,1]:
        x=sx+side*52
        p=[(x-26,sy-28),(x+27,sy-12),(x+15,sy+25),(x-38,sy+9)]
        d.polygon(p,fill=(43,88,127,255),outline=(157,205,220,255))
        for j in range(1,4):line(im,[(x-26+j*12,sy-28+j*3),(x-38+j*12,sy+9+j*3)],BLUE,1)
    d.polygon([(sx-15,sy-22),(sx+20,sy-11),(sx+11,sy+21),(sx-23,sy+9)],fill=(211,226,225,255),outline=(252,255,255,255))
    tx,ty,_=project(43.41337*pi/180,-.2)
    dot(im,tx,ty,11,AMBER); dot(im,tx,ty,24,AMBER,.1)
    line(im,[(sx,sy+23),(tx,ty)],TEAL,2,.45)

def document(im,x,y,w,h,t,accent=TEAL,caption=None):
    u=reveal(t); y+=24*(1-u)
    rect(im,(x+12,y+12,x+w+12,y+h+12),(9,29,39),(33,70,82),16,u)
    rect(im,(x,y,x+w,y+h),(18,49,61),accent,16,u)
    line(im,[(x+26,y+40),(x+w-26,y+40)],accent,5,u)
    for i,ratio in enumerate([.84,.64,.78,.48]):
        v=reveal(t,.45+i*.12)
        line(im,[(x+26,y+80+i*25),(x+26+(w-52)*ratio*v,y+80+i*25)],MUTED,4,u*.65)
    if caption: text(im,(x+25,y+h-49),caption,22,accent,True,a=u)

def flow(im,x1,y1,x2,y2,t,delay=0,fill=TEAL):
    p=reveal(t,delay,1.0); end=(lerp(x1,x2,p),lerp(y1,y2,p))
    line(im,[(x1,y1),end],fill,3,.65)
    if p>.02:dot(im,*end,6,fill)

def spoken(scene,cue_id,word=None,lead=.12):
    """Use generated word boundaries, never an unrelated hardcoded reveal."""
    cue=next(c for c in scene['cues'] if c['id']==cue_id)
    start=cue['localStart']
    if word:
        found=next((w for w in cue['words'] if word.lower() in w['text'].lower()),None)
        if not found:raise ValueError(f'Missing spoken anchor {scene["id"]}/{cue_id}/{word}')
        start+=found['start']
    return max(0,start-lead)

def scene_image(scene,t,context):
    # The shared transition delays the model drawing clock by 650 ms. Restore
    # the scene clock for word-bound reveals; retain the established camera path.
    t+=scene.get('contentDelay',0)
    sid=scene['id']; light=sid in ['climate','observation-model']
    im=background(light).copy(); D=ImageDraw.Draw(im,'RGBA')
    if sid=='hook':
        title(im,'A real source. A specific question.','What can the evidence\nactually establish?',t,980)
        u=reveal(t,1.2)
        lines(im,(130,438),'Follow a historical methane record from observation to a reviewable answer.',34,780,MUTED,a=u)
        rect(im,(128,657,930,818),(15,43,55),(42,81,92),20,reveal(t,2.0))
        text(im,(160,685),'KAZ_S_159',35,TEAL,True,a=reveal(t,2.1))
        text(im,(160,744),'Kazakhstan · Historical UNEP MARS snapshot',25,MUTED,a=reveal(t,2.3))
        globe(im,1400,560,260,t)
        text(im,(1175,883),'CONCEPTUAL SATELLITE MODEL',17,MUTED,mono=True)
        source(im,'Case: KAZ_S_159 · source snapshot unep-mars-675417694883')
    elif sid=='climate':
        title(im,'Why reliable follow-up matters','Methane has a major\nclimate effect.',t,1000,True)
        u=reveal(t,spoken(scene,'warming','thirty'),.65)
        text(im,(126,420),'~30%',185,(19,128,117),True,a=u)
        lines(im,(134,666),'of global warming since pre-industrial times attributed to methane.',38,800,(42,75,81),a=u)
        globe(im,1420,535,228,t,True)
        D.arc((1105,220,1735,850),-90,-90+108*u,fill=(19,128,117,255),width=19)
        text(im,(1190,880),'GLOBAL CLIMATE CONTEXT',19,(48,98,101),mono=True)
        source(im,'UNEP methane explainer · Global attribution; no prototype impact measured.',True)
    elif sid=='system':
        title(im,'Complementary roles','MARS finds major emissions.\nMethaneResponse examines claims.',t)
        lanes=[('UNEP MARS',['Detect','Notify','Follow up'],425,TEAL,spoken(scene,'mars-role')),
               ('METHANERESPONSE',['Claim','References','Review'],665,AMBER,spoken(scene,'review-role'))]
        for name,items,y,color,delay in lanes:
            label(im,(128,y+49),name,color,reveal(t,delay))
            for i,item in enumerate(items):
                x=520+i*402;u=reveal(t,delay+.1+i*.25,.55)
                rect(im,(x,y+18*(1-u),x+300,y+148+18*(1-u)),(15,43,55),color,18,u)
                text(im,(x+32,y+38),f'0{i+1}',20,color,mono=True,a=u)
                text(im,(x+32,y+76),item,36,WHITE,True,a=u)
                if i<2:flow(im,x+302,y+78,x+392,y+78,t,delay+.2+i*.25,color)
        u=reveal(t,spoken(scene,'response-rate','twelve'),.55)
        text(im,(130,911),'~12% notification response in 2025',30,AMBER,True,a=u)
        text(im,(880,915),'Response does not establish physical repair.',25,MUTED,a=reveal(t,spoken(scene,'response-boundary')))
        source(im,'UNEP MARS · IEA 2026 guidance: response rate, not repair rate.')
    elif sid=='catalog-model':
        title(im,'Inspect the reference boundary','A publisher record is a starting point.',t)
        for i,(cap,col) in enumerate([('Title + link',TEAL),('Source + date',TEAL),('Report passage?',AMBER)]):
            x=160+i*555;document(im,x,410,435,370,t-1.0-i*.6,col,cap)
        lines(im,(160,855),'The casebook links the official catalogue. The report body and exact action day are not in this review bundle.',31,1520,MUTED,a=reveal(t,3.6))
        source(im,'UNEP catalogue metadata · handle 20.500.11822/49949')
    elif sid=='observation-model':
        title(im,'Three EnMAP estimates','Dated observations, with uncertainty.',t,1600,True)
        x0,y0=220,834; xend=1740
        line(im,[(x0,420),(x0,y0),(xend,y0)],(102,129,132),2)
        for value in [0,250,500,750,1000]:
            y=y0-value*.39;line(im,[(x0,y),(xend,y)],(100,137,139),1,.18)
            text(im,(124,y-14),value,22,(64,91,98),mono=True)
        text(im,(145,365),'kg/h',22,(64,91,98),mono=True)
        obs=[('2024-06-07',591,335,480),('2026-06-05',307,66,1000),('2026-07-11',496,226,1520)]
        for i,(date,value,unc,x) in enumerate(obs):
            cue,number=[('estimate-one','five'),('estimate-two','three'),('estimate-three','four')][i]
            u=reveal(t,spoken(scene,cue,number),.75);y=y0-value*.39
            line(im,[(x,y-unc*.39*u),(x,y+unc*.39*u)],(196,141,47),7,u)
            line(im,[(x-18,y-unc*.39*u),(x+18,y-unc*.39*u)],(196,141,47),4,u)
            line(im,[(x-18,y+unc*.39*u),(x+18,y+unc*.39*u)],(196,141,47),4,u)
            dot(im,x,y,12,(19,138,123),u)
            text(im,(x-110,410),f'{value} ± {unc}',30,(12,93,89),True,a=u)
            text(im,(x-112,864),date,23,(53,86,93),mono=True,a=u)
        text(im,(220,935),'Separate dated records; column spacing does not represent elapsed time.',24,(56,91,96),a=reveal(t,.7))
        source(im,'UNEP MARS casebook · EnMAP / DLR · reported estimates ± recorded uncertainty.',True)
    elif sid=='ambiguity':
        title(im,'The date boundary matters','“In July” does not tell us which day.',t)
        y=470;x=480;dw=39
        text(im,(128,485),'Catalogue action',27,MUTED)
        text(im,(128,674),'EnMAP observation',27,MUTED)
        u=reveal(t,spoken(scene,'action-month'),.8)
        rect(im,(x,y,x+31*dw*u,y+95),(68,59,36),AMBER,12,u)
        text(im,(x+22,y+30),'JULY 2026 · exact day unavailable',26,AMBER,mono=True,a=u)
        for i in range(31):
            color=TEAL if i==10 else (47,75,85)
            rect(im,(x+i*dw,660,x+i*dw+31,690),color,color,5,reveal(t,spoken(scene,'observation-day')+i*.006))
        u=reveal(t,spoken(scene,'observation-day','eleventh'),.6)
        line(im,[(x+10*dw+15,600),(x+10*dw+15,748)],TEAL,3,u)
        dot(im,x+10*dw+15,674,10,TEAL,u)
        text(im,(x+10*dw-90,773),'11 JULY',28,TEAL,True,a=u)
        label(im,(130,849),'Unresolved ordering',MUTED,reveal(t,spoken(scene,'ordering')))
        for i,question in enumerate(['Before the action?','After the action?']):
            u=reveal(t,spoken(scene,'ordering')+i*.25,.55)
            bx=480+i*630;rect(im,(bx,828,bx+592,902),(32,48,54),AMBER,13,u)
            text(im,(bx+27,847),question,29,AMBER,True,a=u)
        lines(im,(130,938),'Only an exact action date can resolve this ordering.',30,1580,MUTED,a=reveal(t,spoken(scene,'ordering')+.5))
        source(im,'Catalogue action month + dated observation · No before/after mitigation inference.')
    elif sid=='result':
        title(im,'The bounded assessment result','Insufficient reference coverage.',t)
        rows=[('SOURCE','KAZ_S_159',True),('SCOPE','11 July 2026 · UTC day',True),('CLAIM','Mitigation confirmation',True),('ELIGIBLE CITATION','Missing from this bundle',False)]
        for i,(name,value,ok) in enumerate(rows):
            x=130+(i%2)*840;y=405+(i//2)*205;u=reveal(t,.6+i*.25,.55)
            col=TEAL if ok else AMBER
            rect(im,(x,y,x+795,y+162),(14,40,52),col,18,u)
            label(im,(x+27,y+25),name,col,u);text(im,(x+27,y+71),value,30,WHITE,True,a=u)
            dot(im,x+755,y+42,8,col,u)
        lines(im,(135,867),'This bundle result does not contradict UNEP’s catalogue or establish that mitigation failed.',32,1570,MUTED,a=reveal(t,spoken(scene,'bounded-result',"doesn't")))
        source(im,'Actual local rules result · No live AI provider or physical mitigation determination.')
    elif sid=='next':
        title(im,'Make the open question actionable','Request the evidence that resolves it.',t)
        document(im,170,405,390,400,t-.8,TEAL,'Exact action date')
        document(im,980,405,390,400,t-1.5,AMBER,'Dated follow-up')
        flow(im,620,610,900,610,t,2.0)
        lines(im,(170,864),'Authorized, attributable passage',28,650,MUTED,a=reveal(t,2))
        lines(im,(980,864),'Method-appropriate evidence',28,680,MUTED,a=reveal(t,2.7))
        source(im,'Local analyst note · No operator contacted by this demo.')
    elif sid=='digest':
        title(im,'A reproducible report fingerprint','Bind the review to its recorded inputs.',t)
        items=[('SOURCE SNAPSHOT','Source + version'),('REVIEW SCOPE','Claim + UTC day'),('AUDIT RESULT','Reason + references')]
        for i,(a,b) in enumerate(items):
            y=405+i*145;u=reveal(t,.6+i*.25)
            rect(im,(130,y,710,y+118),(15,43,55),(46,88,99),16,u)
            label(im,(160,y+18),a,a=u);text(im,(160,y+55),b,29,WHITE,True,a=u)
        flow(im,740,610,980,610,t,1.7)
        rect(im,(1010,442,1775,777),(18,48,58),TEAL,24,reveal(t,2.3))
        text(im,(1050,484),'CANONICAL JSON → SHA-256',27,TEAL,True,a=reveal(t,2.4))
        digest=context['report']['bundleHash']
        text(im,(1050,569),digest[:24]+'…',30,WHITE,mono=True,a=reveal(t,2.8))
        text(im,(1050,639),'Local digest matches',31,TEAL,True,a=reveal(t,3.4))
        source(im,'Actual exported bundle digest · No blockchain receipt is included.')
    elif sid=='change':
        title(im,'Controlled integrity test','Change one hashed field.',t)
        for i,(name,color,token) in enumerate([('ORIGINAL',TEAL,'reason: original review rationale'),('ALTERED COPY',CORAL,'reason: … altered for integrity test')]):
            x=130+i*850;u=reveal(t,.5+i*.6)
            rect(im,(x,420,x+790,762),(14,40,52),color,20,u)
            label(im,(x+30,450),name,color,u)
            lines(im,(x+30,520),token,29,715,WHITE,a=u)
            text(im,(x+30,670),'Stored bundle digest unchanged',23,MUTED,mono=True,a=u)
        source(im,'The export-context checksum is recomputed; the audit bundle digest is held unchanged.')
    elif sid=='mismatch':
        title(im,'The controlled test result','A changed bundle produces a different hash.',t)
        for i,(name,key,col) in enumerate([('STORED DIGEST','bundleHash',TEAL),('RECOMPUTED AFTER CHANGE','alteredBundleHash',CORAL)]):
            y=448+i*178;u=reveal(t,.4+i*.4)
            label(im,(140,y),name,col,u)
            text(im,(140,y+54),context['report'][key][:36]+'…',38,col,mono=True,a=u)
        source(im,'Changed-copy mismatch observed in the actual local verifier.')
    elif sid=='limits':
        title(im,'Interpret the result correctly','Integrity is one layer of trust.',t)
        for i,(head,color,values) in enumerate([('LOCAL CHECKS',TEAL,['Bundle digest matches','Export checksum matches']),('STILL REQUIRES EVIDENCE',AMBER,['Who issued the report','Whether mitigation physically occurred'])]):
            x=130+i*850;u=reveal(t,.9+i*.55)
            rect(im,(x,420,x+790,830),(14,40,52),color,20,u)
            label(im,(x+32,456),head,color,u)
            for j,value in enumerate(values):
                dot(im,x+38,553+j*125,6,color,u)
                lines(im,(x+63,530+j*125),value,31,685,WHITE,a=reveal(t,1.7+i*.5+j*.4))
        source(im,'This preview: historical source data, deterministic rules, local file verification.')
    elif sid=='close':
        title(im,'MethaneResponse','Make the next investigation traceable.',t)
        values=[('01','Inspect','A historical source'),('02','Scope','A specific claim'),('03','Assess','Available evidence'),('04','Request','What is missing'),('05','Verify','The report integrity')]
        for i,(num,name,sub) in enumerate(values):
            x=130+i*338;u=reveal(t,spoken(scene,'value')+i*.16,.55)
            rect(im,(x,450,x+305,732),(15,43,55),TEAL,18,u)
            text(im,(x+25,480),num,23,TEAL,mono=True,a=u)
            text(im,(x+25,545),name,36,WHITE,True,a=u)
            lines(im,(x+25,613),sub,24,260,MUTED,a=u)
            if i<4:flow(im,x+305,585,x+332,585,t,spoken(scene,'value')+.3+i*.16)
        lines(im,(132,812),'For researchers, auditors and public-interest analysts.',34,1570,MUTED,a=reveal(t,spoken(scene,'audience')))
        text(im,(132,896),'Inspect the record. Expose the gap. Specify the next check.',31,TEAL,True,a=reveal(t,spoken(scene,'value')))
        source(im,'Rules preview · no live AI / public-chain receipt · user and climate impact not yet measured.')
    return im

@lru_cache(maxsize=1)
def pointer_image():
    s=3;im=Image.new('RGBA',(48*s,60*s));d=ImageDraw.Draw(im)
    points=[(3,2),(3,40),(13,31),(20,48),(27,45),(19,28),(34,28)]
    d.polygon([(round(x*s),round(y*s)) for x,y in points],fill=WHITE,outline=(3,18,27),width=2*s)
    d.line([(5*s,7*s),(5*s,33*s)],fill=TEAL,width=2*s)
    return im.resize((48,60),Image.Resampling.LANCZOS)
