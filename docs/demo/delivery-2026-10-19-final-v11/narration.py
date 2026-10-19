#!/usr/bin/env python3
"""Generate stock neural speech; schedule actual word timings against real UI.

Install edge-tts==7.3.1 outside source; see README. Only the public script is sent
to the speech service. No user documents, keys, or captured app state are sent.
"""
from __future__ import annotations
import asyncio
import hashlib
import json
import math
import os
from pathlib import Path
import re
import subprocess
import sys
import wave
import numpy as np

HERE=Path(__file__).resolve().parent
REPO=HERE.parents[2]
OUT=REPO/'delivery-output/story-v11'
SR=48000
FPS=25
VOICE='en-US-AvaMultilingualNeural'
RATE='-2%'

def run(args):
    p=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if p.returncode:raise RuntimeError(p.stderr.decode(errors='replace')[-2000:])
    return p.stdout

def key_for(text):
    return hashlib.sha256(json.dumps([text,VOICE,RATE,'edge-tts-7.3.1'],ensure_ascii=False).encode()).hexdigest()[:20]

async def synthesize(cue,semaphore):
    import edge_tts
    cache=OUT/'voice-cues';cache.mkdir(parents=True,exist_ok=True)
    key=key_for(cue['text']);mp3=cache/f'{key}.mp3';events=cache/f'{key}.words.json'
    if mp3.exists() and events.exists():return
    async with semaphore:
        for attempt in range(3):
            try:
                chunks=[];words=[]
                speech=edge_tts.Communicate(cue['text'],VOICE,rate=RATE,boundary='WordBoundary',receive_timeout=45)
                async for x in speech.stream():
                    if x['type']=='audio':chunks.append(x['data'])
                    elif x['type']=='WordBoundary':words.append(x)
                if not chunks or not words:raise RuntimeError('No audio/word boundaries from voice service.')
                mp3.write_bytes(b''.join(chunks));events.write_text(json.dumps(words,indent=2))
                print(json.dumps({'generatedCue':cue['id'],'words':len(words)}),flush=True)
                return
            except Exception:
                if attempt==2:raise
                await asyncio.sleep(1+attempt*2)

def load_cue(cue):
    key=key_for(cue['text']);cache=OUT/'voice-cues';mp3=cache/f'{key}.mp3'
    samples=np.frombuffer(run(['ffmpeg','-v','error','-i',str(mp3),'-f','f32le','-ac','1','-ar',str(SR),'-']),dtype='<f4').copy()
    metadata=json.loads((cache/f'{key}.words.json').read_text())
    words=[{'text':w['text'],'start':w['offset']/1e7,'end':(w['offset']+w['duration'])/1e7} for w in metadata]
    # Trim only edge quiet. Natural phoneme pauses within a sentence are retained.
    blocks=np.array([np.sqrt(np.mean(samples[i:i+480]**2)) for i in range(0,len(samples),480)])
    active=np.flatnonzero(blocks>10**(-43/20))
    if not len(active):raise ValueError('Silent voice cue.')
    trim_start=max(0,int(active[0]*480-.065*SR))
    trim_end=min(len(samples),int((active[-1]+1)*480+.075*SR))
    samples=samples[trim_start:trim_end]
    offset=trim_start/SR
    for w in words:
        w['start']=max(0,w['start']-offset);w['end']=min(len(samples)/SR,w['end']-offset)
    return samples,words,{'cacheKey':key,'trimStart':offset,'rawDuration':len(blocks)*.01,'duration':len(samples)/SR}

def fit(samples,words,seconds):
    """Bounded tempo fit only; reject rushed/clipped UI narration."""
    duration=len(samples)/SR
    factor=max(1,duration/seconds)
    if factor>1.10:raise ValueError(f'Cue requires {factor:.3f}x; shorten its text or change its approved anchor.')
    if factor>1.0005:
        p=subprocess.run(['ffmpeg','-v','error','-f','f32le','-ar',str(SR),'-ac','1','-i','-',
          '-af',f'atempo={factor:.8f}','-f','f32le','-'],input=samples.astype('<f4').tobytes(),stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        if p.returncode:raise RuntimeError(p.stderr.decode())
        samples=np.frombuffer(p.stdout,dtype='<f4').copy()
        for w in words:
            w['start']=min(len(samples)/SR,w['start']/factor)
            w['end']=min(len(samples)/SR,w['end']/factor)
    return samples,words,factor

def schedule(story):
    timeline=[];all_cues=[];audio=[];cursor=0.
    for scene in story['scenes']:
        local=[];blocks=[];end=.35
        common_factor=1.
        if scene['kind']=='app' and all('anchor' not in c for c in scene['cues']):
            speech=sum(len(load_cue(c)[0])/SR for c in scene['cues'])
            available=scene['minimumDuration']-.70-.24*(len(scene['cues'])-1)
            common_factor=max(1,speech/available)
        for i,c in enumerate(scene['cues']):
            samples,words,provenance=load_cue(c)
            start=float(c.get('anchor',end if i else .35))
            fit_factor=1.
            if common_factor>1:
                samples,words,fit_factor=fit(samples,words,len(samples)/SR/common_factor)
            if 'anchor' in c:
                deadline=scene['cues'][i+1].get('anchor',scene['minimumDuration']-.35) if i+1<len(scene['cues']) else scene['minimumDuration']-.35
                available=deadline-start-.13
                samples,words,fit_factor=fit(samples,words,available)
            if local and start<local[-1]['localEnd']+.10:raise ValueError(f"Overlapping speech in {scene['id']}/{c['id']}")
            end=start+len(samples)/SR
            local.append({'id':c['id'],'text':c['text'],'guide':c.get('guide'),'localStart':round(start,6),'localEnd':round(end,6),
              'words':words,'tempoFit':fit_factor,'generation':provenance})
            blocks.append((start,samples));end+=.24
        # No old scene padding: leave a brief breath for the connected transition.
        duration=scene['minimumDuration'] if scene['kind']=='app' else max(scene['minimumDuration'],local[-1]['localEnd']+.85)
        duration=math.ceil(duration*FPS-1e-8)/FPS
        if scene['kind']=='model' and duration-local[-1]['localEnd']>1.0:
            # Minimum durations are composition suggestions, not silent padding.
            duration=math.ceil((local[-1]['localEnd']+.85)*FPS)/FPS
        track=np.zeros(round(duration*SR),np.float32)
        for start,samples in blocks:
            pos=round(start*SR)
            if pos+len(samples)>len(track):raise ValueError(f"Voice exceeds {scene['id']}")
            track[pos:pos+len(samples)]+=samples
        entry={k:v for k,v in scene.items() if k not in ['cues','minimumDuration']}
        entry.update(start=round(cursor,6),end=round(cursor+duration,6),cues=local)
        for c in local:
            all_cues.append({**c,'scene':scene['id'],'start':round(cursor+c['localStart'],6),'end':round(cursor+c['localEnd'],6),
              'words':[{**w,'start':round(cursor+c['localStart']+w['start'],6),'end':round(cursor+c['localStart']+w['end'],6)} for w in c['words']]})
        timeline.append(entry);audio.append(track);cursor+=duration
    return timeline,all_cues,np.concatenate(audio)

def timecode(t):
    ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'

def caption_groups(cues):
    groups=[]
    for cue in cues:
        words=cue['words'];current=[]
        for i,w in enumerate(words):
            current.append(w)
            value=' '.join(x['text'] for x in current)
            if len(current)>=8 or len(value)>48 or i==len(words)-1:
                groups.append({'start':max(cue['start'],current[0]['start']-.04),
                  'end':min(cue['end'],current[-1]['end']+.10),'text':value,'scene':cue['scene']});current=[]
    # Boundaries include punctuation and may be adjacent. Keep cues disjoint.
    for i,g in enumerate(groups[:-1]):g['end']=min(g['end'],groups[i+1]['start']-.015)
    return groups

def main():
    story=json.loads((HERE/'story.json').read_text());OUT.mkdir(parents=True,exist_ok=True)
    if '--schedule-only' not in sys.argv:
        async def generate():
            semaphore=asyncio.Semaphore(2)
            await asyncio.gather(*(synthesize(c,semaphore) for s in story['scenes'] for c in s['cues']))
        asyncio.run(generate())
    timeline,cues,samples=schedule(story);duration=len(samples)/SR
    gaps=[{'after':a['scene']+'/'+a['id'],'before':b['scene']+'/'+b['id'],'seconds':round(b['start']-a['end'],3)} for a,b in zip(cues,cues[1:])]
    with wave.open(str(OUT/'narration.wav'),'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(SR);f.writeframes((np.clip(samples,-1,1)*32767).astype('<i2').tobytes())
    groups=caption_groups(cues)
    (OUT/'captions.en.srt').write_text('\n\n'.join(f"{i+1}\n{timecode(g['start'])} --> {timecode(g['end'])}\n{g['text']}" for i,g in enumerate(groups))+'\n')
    (OUT/'captions.json').write_text(json.dumps(groups,indent=2))
    (OUT/'timeline.json').write_text(json.dumps(timeline,indent=2))
    manifest={'schemaVersion':11,'engine':'Microsoft stock neural speech via edge-tts 7.3.1','voice':VOICE,'rate':RATE,
      'syntheticVoice':True,'voiceCloning':False,'durationSeconds':duration,'speechSeconds':round(sum(c['end']-c['start'] for c in cues),3),
      'maximumInterCueGapSeconds':max(g['seconds'] for g in gaps),'gaps':gaps,'cues':cues,'captionGroups':len(groups),
      'scriptSha256':hashlib.sha256((HERE/'story.json').read_bytes()).hexdigest(),'narrationSha256':hashlib.sha256((OUT/'narration.wav').read_bytes()).hexdigest()}
    (OUT/'narration-manifest.json').write_text(json.dumps(manifest,indent=2))
    print(json.dumps({k:v for k,v in manifest.items() if k not in ['cues','gaps']}),flush=True)

if __name__=='__main__':main()
