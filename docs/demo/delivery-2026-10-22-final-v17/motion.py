"""Deterministic, action-driven camera. UI, outline and cursor share one affine.
No invented clicks or pointer interpolation across disconnected recordings.
"""
import bisect,math
from functools import lru_cache
W,H=1920,1080
WINDOW=(128,188,1664,780)
def ease(t):
    t=min(1,max(0,t));return t*t*t*(t*(t*6-15)+10)
def lerp(a,b,t):return a+(b-a)*t
def focus(box,hit=None):
    x,y,w,h=box['x'],box['y'],min(box['width'],720),box['height']
    # Long forms span most of the screen. Frame their text-entry region,
    # rather than fitting an entire 1,500px field and barely magnifying it.
    if hit:w=max(w,hit['x']-x+40)
    z=min(2.4,max(1.2,1920/(w+120)),max(1.1,760/(h+160)))
    vw=1920/z;vh=vw*WINDOW[3]/WINDOW[2]
    return (min(max(x+w/2,vw/2),1920-vw/2),min(max(y+h/2,vh/2),1080-vh/2),z)
def affine(camera):
    cx,cy,z=camera;vw=1920/z;vh=vw*WINDOW[3]/WINDOW[2];s=WINDOW[2]/vw
    return (s,WINDOW[0]-s*(cx-vw/2),WINDOW[1]-s*(cy-vh/2))
def project(point,camera):
    s,x,y=affine(camera);return (point[0]*s+x,point[1]*s+y)
def local_time(c,t):return (t-c['sourceStart'])/c['speed']
def keyframes(c,actions):
    duration=c['duration'];frames=[(0,(960,540,1))];previous=None
    for a in actions:
        if a.get('sensitive')or not a.get('box')or not(c['sourceStart']<=a['settledAt']<c['sourceEnd']):continue
        settled=local_time(c,a['settledAt']);perform=local_time(c,a['performAt']);end=local_time(c,a['end'])
        if perform>duration-.64:continue
        # During real scroll, widen before focusing the next stable element.
        scrolled=previous is not None and abs(a.get('scrollY',0)-previous.get('scrollY',0))>50
        if (scrolled or previous is None)and settled>frames[-1][0]+.08:
            # Do not zoom into an element while the actual page is scrolling.
            frames.append((settled,(960,540,1)))
        arrival=max(frames[-1][0]+.18,perform-.12)
        if arrival<duration-.74:
            frames.append((arrival,focus(a['box'],a.get('hit'))))
            frames.append((min(duration-.72,max(arrival+.08,end)),focus(a['box'],a.get('hit'))))
        previous=a
    # A brief wide pivot between two nearby actions causes a whip zoom.
    # Join those stable targets directly instead of inserting a fast out/in.
    wide=(960,540,1)
    for i in range(len(frames)-2,0,-1):
        if frames[i][1]==wide and (frames[i][0]-frames[i-1][0]<.85 or frames[i+1][0]-frames[i][0]<.85):
            frames.pop(i)
    # Reserve a full second for the final return, never a last-frame snap.
    while len(frames)>1 and frames[-1][0]>duration-1.0:frames.pop()
    if frames[-1][0]<duration-1.0:frames.append((duration-1.0,frames[-1][1]))
    frames.append((duration-.04,wide))
    return frames
def camera(c,t,actions):
    frames=c['_camera'] if '_camera'in c else keyframes(c,actions)
    i=bisect.bisect_right([x[0]for x in frames],t)-1;i=max(0,min(len(frames)-2,i))
    ta,a=frames[i];tb,b=frames[i+1];u=ease((t-ta)/max(.0001,tb-ta))
    return tuple(lerp(x,y,u)for x,y in zip(a,b))
def active_action(c,t,actions):
    raw=c['sourceStart']+t*c['speed']
    selected=None
    for a in actions:
        if a.get('sensitive')or not a.get('box'):continue
        if a['settledAt']-.1<=raw<=a['end']+.5 and c['sourceStart']<=a['settledAt']<c['sourceEnd']:selected=a
    return selected

_pointer_cache={}
def pointer_at(points,raw):
    # Actual mouse events only. Linear resampling is time preserving, never a
    # decorative cursor path or a fabricated click. Click comes from down.
    key=id(points)
    if key not in _pointer_cache:
        moves=sorted([p for p in points if p['kind']in ('move','down','up')and p.get('x')is not None],key=lambda p:p['time'])
        _pointer_cache[key]=(moves,[p['time']for p in moves])
    moves,times=_pointer_cache[key];i=bisect.bisect_right(times,raw)-1
    if i<0:return None
    a=moves[i]
    if i+1<len(moves)and moves[i+1]['time']-a['time']<.2:
        b=moves[i+1];u=(raw-a['time'])/max(1e-6,b['time']-a['time']);return lerp(a['x'],b['x'],u),lerp(a['y'],b['y'],u)
    return a['x'],a['y']

def pointer_age(points,raw):
    pointer_at(points,raw)
    moves,times=_pointer_cache[id(points)];i=bisect.bisect_right(times,raw)-1
    return float('inf')if i<0 else raw-times[i]

def cursor_paths(actions,points):
    """Editorial travel easing between actual positions; never invent a click.
    Raw points remain retained. Click endpoint and time are never moved.
    """
    paths=[]
    for a in actions:
        if not a.get('moveStart')or not a.get('arrivedAt')or a.get('sensitive'):continue
        downs=[p for p in points if p['kind']=='down'and a['performAt']-.12<=p['time']<=a['end']+.12]
        target=(downs[0]['x'],downs[0]['y'])if downs else pointer_at(points,a['arrivedAt']+.04)
        origin=pointer_at(points,a['moveStart']-.005)
        if target is None or origin is None:continue
        if downs:a['hit']={'x':target[0],'y':target[1]}
        paths.append({'actionId':a['id'],'start':a['moveStart'],'arrival':min(a['arrivedAt'],a['performAt']-.1),'holdUntil':max(a['performAt']+.25,downs[0]['time']+.08 if downs else a['performAt']+.25),'origin':origin,'target':target})
    return paths

def guided_pointer(points,paths,raw):
    for p in reversed(paths):
        if p['start']<=raw<=p['holdUntil']:
            u=ease((raw-p['start'])/max(.04,p['arrival']-p['start']))
            return tuple(lerp(x,y,u)for x,y in zip(p['origin'],p['target']))
    return pointer_at(points,raw)
