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

# These are the intended essential reading sizes at a 1920x1080 export. Raw UI
# metadata remains visible as evidence; the editorial explanation is separate.
READING={'headline':72,'body':44,'guide':40,'source':26,'value':44,'date':32}

def headline(im,kicker,value,t,light=False,width=1650):
    col=INK if light else WHITE;accent=(19,128,117) if light else TEAL
    u=reveal(t,.1,.6)
    text(im,(128,152),kicker.upper(),26,accent,True,a=u)
    lines(im,(128,213),value,72,width,col,True,u,1.10)

def credit(im,value,light=False):
    text(im,(128,1008),value,26,(59,88,94) if light else MUTED)

def analyst(im,cx,cy,t,a=1):
    """Original anonymous role icon; not a participant or pilot result."""
    u=reveal(t,.5,.65)*a;d=ImageDraw.Draw(im,'RGBA')
    dot(im,cx,cy-85,47,TEAL,.14*u)
    d.arc((cx-64,cy-28,cx+64,cy+105),180,360,fill=alpha(TEAL,u),width=9)
    d.ellipse((cx-36,cy-121,cx+36,cy-49),outline=alpha(TEAL,u),width=7)
    line(im,[(cx-122,cy+106),(cx+122,cy+106)],TEAL,5,u)
    line(im,[(cx+54,cy+20),(cx+160,cy+20),(cx+136,cy+106)],MUTED,6,u)

def actual_detail(im,context,shot,box,target):
    image=context.get('_lastFrames',{}).get(shot)
    if image is None:return
    x,y,w,h=target
    # Uniform scale, cropped only to the documented result region; never stretch
    # application text or substitute an authored finding for the actual UI.
    tile=image.crop(box);tile.thumbnail((round(w),round(h)),Image.Resampling.LANCZOS)
    im.paste(tile,(round(x),round(y)))
    ImageDraw.Draw(im,'RGBA').rectangle((x-2,y-2,x+tile.width+2,y+tile.height+2),outline=alpha(TEAL,.65),width=2)

def fingerprint(im,value,x,y,t,color=TEAL,a=1):
    raw=value.removeprefix('0x');u=reveal(t,0,.7)*a
    for i in range(64):
        height=36+int(raw[i%len(raw)],16)*6
        line(im,[(x+i*13,y-height/2),(x+i*13,y+height/2)],color,7,u)

def scene_image(scene,t,context):
    sid=scene['id'];light=sid in ['climate','observation-model','next']
    im=background(light).copy();d=ImageDraw.Draw(im,'RGBA')
    if sid=='hook':
        change=spoken(scene,'benefit');u=reveal(t,change,.6)
        a=1-u
        text(im,(128,152),'AN ANALYST’S EVERYDAY QUESTION',26,TEAL,True,a=a)
        lines(im,(128,223),'A repair is reported.\nWhat should you check?',78,1200,WHITE,True,a,1.12)
        analyst(im,370,660,t,a)
        text(im,(242,812),'Researcher / auditor',36,MUTED,a=a)
        x,y=950,505
        rect(im,(x,y,x+800,y+325),(16,43,54),AMBER,18,a)
        text(im,(x+38,y+30),'REPORTED ACTION',26,AMBER,True,a=a)
        lines(im,(x+38,y+100),'“The leak has\nbeen repaired.”',56,720,WHITE,True,a)
        line(im,[(535,675),(855,675)],TEAL,4,a*reveal(t,2))
        text(im,(802,632),'?',74,AMBER,True,a=a)
        text(im,(128,160),'METHANERESPONSE',68,TEAL,True,a=u)
        lines(im,(128,296),'Check the claim.\nMake the next step clear.',82,1650,WHITE,True,u,1.10)
        for i,(name,sub) in enumerate([('Claim','What is being reported?'),('Evidence','What can we inspect?'),('Next check','What is still missing?')]):
            x=128+i*570;v=u*reveal(t,change+.2+i*.15,.5)
            text(im,(x,665),name,48,TEAL,True,a=v)
            lines(im,(x,748),sub,38,470,MUTED,a=v)
            if i<2:line(im,[(x+410,700),(x+500,700)],TEAL,3,v)
        credit(im,'Opening scenario is hypothetical. The following case uses real historical UNEP records.')
    elif sid=='climate':
        headline(im,'Why reliable follow-up matters','Methane has a major climate effect.',t,True)
        u=reveal(t,spoken(scene,'warming','thirty'),.65)
        text(im,(128,402),'~30%',215,(19,128,117),True,a=u)
        lines(im,(830,450),'of warming since\npre-industrial times\nattributed to methane.',48,920,(42,75,81),a=u)
        line(im,[(128,762),(1792,762)],(19,128,117),3,u)
        lines(im,(132,813),'A reported response still needs evidence of its outcome.',44,1630,(42,75,81),a=reveal(t,spoken(scene,'follow-up')))
        credit(im,'Source: UNEP methane explainer. Global attribution; no prototype impact measured.',True)
    elif sid=='system':
        headline(im,'Complementary roles','MARS detects. MethaneResponse reviews.',t)
        start=spoken(scene,'mars-role')
        for i,(name,sub) in enumerate([('Detect','Major emissions'),('Notify','Relevant stakeholders'),('Follow up','Recorded responses')]):
            x=270+i*575;u=reveal(t,start+i*.22,.6)
            dot(im,x,489,30,TEAL,.13*u);dot(im,x,489,10,TEAL,u)
            if i<2:flow(im,x+35,489,x+540,489,t,start+.25+i*.22)
            text(im,(x-140,558),name,50,WHITE,True,a=u)
            text(im,(x-140,633),sub,30,MUTED,a=u)
        u=reveal(t,spoken(scene,'review-role'),.65)
        line(im,[(128,746),(1792,746)],AMBER,3,u)
        text(im,(128,794),'Does this evidence support this claim?',58,AMBER,True,a=u)
        text(im,(128,907),'Historical records · transparent rules baseline',36,MUTED,a=reveal(t,spoken(scene,'preview')))
        credit(im,'UNEP MARS observations + independent review of the available material')
    elif sid=='observation-model':
        headline(im,'Three EnMAP estimates','Different dates. Recorded uncertainty.',t,True)
        baseline=810
        for value in [0,250,500,750,1000]:
            y=baseline-value*.36;line(im,[(230,y),(1740,y)],(72,111,119),1,.18)
            text(im,(130,y-15),str(value),26,(64,91,98),mono=True)
        text(im,(130,361),'kg/h',32,(64,91,98),True)
        start=spoken(scene,'estimates','three')
        records=[('07 JUN 2024',591,335,470),('05 JUN 2026',307,66,990),('11 JUL 2026',496,226,1510)]
        for i,(date,value,unc,x) in enumerate(records):
            u=reveal(t,start+i*.35,.8);y=baseline-value*.36
            line(im,[(x,y-unc*.36),(x,y+unc*.36)],(182,124,25),7,u)
            for yy in [y-unc*.36,y+unc*.36]:line(im,[(x-20,yy),(x+20,yy)],(182,124,25),5,u)
            dot(im,x,y,14,(19,138,123),u)
            text(im,(x-172,379),f'{value} ± {unc}',44,(12,93,89),True,a=u)
            text(im,(x-156,851),date,32,(53,86,93),mono=True,a=u)
        text(im,(230,928),'Error bars = recorded uncertainty. Records are not continuous monitoring.',32,(56,91,96),a=reveal(t,spoken(scene,'uncertainty')))
        credit(im,'UNEP MARS · EnMAP / DLR · dates and reported estimates retained; spacing is categorical.',True)
    elif sid=='ambiguity':
        headline(im,'The missing detail','A month is not an exact action date.',t)
        x=460;dw=40;y=478
        u=reveal(t,spoken(scene,'action-month'),.7)
        text(im,(128,497),'Reported\naction',42,MUTED,a=u)
        rect(im,(x,y,x+31*dw,y+115),(63,55,37),AMBER,13,u)
        text(im,(x+28,y+29),'JULY 2026 · exact day unavailable',40,AMBER,True,a=u)
        start=spoken(scene,'observation-day')
        text(im,(128,690),'Satellite\nobservation',38,MUTED,a=reveal(t,start))
        for i in range(31):
            col=TEAL if i==10 else (47,75,85)
            rect(im,(x+i*dw,706,x+i*dw+30,737),col,col,5,reveal(t,start+i*.009))
        u=reveal(t,spoken(scene,'observation-day','eleventh'),.6)
        line(im,[(x+415,637),(x+415,771)],TEAL,4,u)
        text(im,(x+317,790),'11 JULY',44,TEAL,True,a=u)
        text(im,(130,913),'Before or after the action? The ordering is still unknown.',44,AMBER,True,a=reveal(t,spoken(scene,'ordering')))
        credit(im,'Catalogue action month + dated observation. No before/after mitigation conclusion.')
    elif sid=='result':
        headline(im,'The actual local result','More evidence needed for this review.',t)
        text(im,(128,410),'APP RESULT',28,TEAL,True,a=reveal(t,.6))
        lines(im,(128,466),'Insufficient\nReference Coverage',48,850,WHITE,True,reveal(t,.7))
        lines(im,(128,646),'No matching mitigation passage\nin the submitted material.',40,850,MUTED,a=reveal(t,1.2))
        text(im,(1050,410),'ACTUAL APPLICATION',28,TEAL,True,a=reveal(t,.6))
        actual_detail(im,context,'audit',(275,505,1160,810),(1050,475,730,340))
        u=reveal(t,spoken(scene,'decision'),.55)
        line(im,[(128,825),(1792,825)],AMBER,3,u)
        text(im,(128,874),'Next: request the exact action date and follow-up evidence.',42,AMBER,True,a=u)
        credit(im,'This bundle result does not contradict UNEP or establish that mitigation failed.')
    elif sid=='next':
        headline(im,'A useful outcome for the analyst','From a broad question to a specific request.',t,True)
        u=reveal(t,spoken(scene,'before'),.6)
        text(im,(128,460),'STARTING QUESTION',28,(54,94,99),True,a=u)
        lines(im,(128,530),'Is the repair\ndocumented?',60,650,INK,True,u)
        start=spoken(scene,'after');u=reveal(t,start,.65)
        flow(im,800,651,970,651,t,start,fill=(19,128,117))
        text(im,(1060,460),'NEXT REQUEST',28,(19,128,117),True,a=u)
        lines(im,(1060,530),'Exact action date.\nAttributable follow-up.',48,740,INK,True,u)
        text(im,(130,854),'A trail another reviewer can follow.',48,(19,128,117),True,a=reveal(t,start+.5))
        credit(im,'Illustration of the saved local analyst request; no operator was contacted.',True)
    elif sid=='fingerprint':
        headline(im,'A report others can check','A digital fingerprint for this version.',t)
        values=['Recorded data','Review date','Review result']
        for i,value in enumerate(values):
            u=reveal(t,.5+i*.22,.6);x=128+i*580
            text(im,(x,448),value,44,TEAL,True,a=u)
            if i<2:flow(im,x+365,481,x+505,481,t,.6+i*.22)
        value=context['report']['bundleHash']
        fingerprint(im,value,520,674,t-.8)
        text(im,(520,785),value[:23]+'…',40,WHITE,mono=True,a=reveal(t,1.5))
        u=reveal(t,spoken(scene,'controlled-change'),.6)
        text(im,(128,897),'Change one reason → its fingerprint changes.',48,CORAL,True,a=u)
        credit(im,'Actual exported SHA-256 digest. The test keeps the stored digest unchanged.')
    elif sid=='limits':
        headline(im,'Two different questions','Integrity and physical outcome.',t)
        line(im,[(960,432),(960,880)],(60,100,110),2)
        text(im,(128,448),'THIS CHECK',28,TEAL,True,a=reveal(t,.5))
        lines(im,(128,530),'Has this copy\nchanged?',64,760,WHITE,True,reveal(t,.5))
        text(im,(128,761),'Tested in this demo',38,TEAL,a=reveal(t,1))
        text(im,(1060,448),'REQUIRES EVIDENCE',28,AMBER,True,a=reveal(t,1.7))
        lines(im,(1060,530),'Was mitigation\nsuccessful?',60,730,WHITE,True,reveal(t,1.7))
        text(im,(1060,761),'Not established by a hash',38,AMBER,a=reveal(t,2.2))
        text(im,(128,920),'Who issued it? Authentication is a separate check.',40,MUTED,a=reveal(t,2.8))
        credit(im,'Local integrity preview. No blockchain receipt or physical repair proof is shown.')
    elif sid=='close':
        headline(im,'MethaneResponse','Make the next investigation traceable.',t)
        for i,(number,name) in enumerate([('01','Inspect'),('02','Check'),('03','Request'),('04','Verify')]):
            x=128+i*435;u=reveal(t,spoken(scene,'value')+i*.15,.65)
            text(im,(x,469),number,28,TEAL,mono=True,a=u)
            text(im,(x,538),name,58,WHITE,True,a=u)
            if i<3:flow(im,x+250,577,x+355,577,t,spoken(scene,'value')+.2+i*.15)
        u=reveal(t,.7)
        lines(im,(128,705),'A specific next request.\nA report others can check.',54,1650,TEAL,True,u)
        credit(im,'Historical data · rules baseline · user and climate impact still need measurement.')
    else:raise ValueError(f'No authored scene for {sid}')
    return im

@lru_cache(maxsize=1)
def pointer_image():
    s=3;im=Image.new('RGBA',(48*s,60*s));d=ImageDraw.Draw(im)
    points=[(3,2),(3,40),(13,31),(20,48),(27,45),(19,28),(34,28)]
    d.polygon([(round(x*s),round(y*s)) for x,y in points],fill=WHITE,outline=(3,18,27),width=2*s)
    d.line([(5*s,7*s),(5*s,33*s)],fill=TEAL,width=2*s)
    return im.resize((48,60),Image.Resampling.LANCZOS)
