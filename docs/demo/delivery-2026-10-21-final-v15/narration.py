"""Bounded stock male neural voice. Only the public authored script leaves host."""
import asyncio,importlib.util,json,sys,wave,hashlib
from pathlib import Path
import numpy as np
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
OUT=ROOT/'delivery-output/final-v15-TAKE01'
spec=importlib.util.spec_from_file_location('voicebase',HERE.parent/'delivery-2026-10-19-final-v12/narration.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
base.OUT=OUT;base.VOICE='en-US-AndrewMultilingualNeural';base.RATE='-2%'
SR=48000
def main():
    story=json.loads((HERE/'story.json').read_text())
    async def generate():
        semaphore=asyncio.Semaphore(2)
        await asyncio.gather(*(base.synthesize(c,semaphore) for s in story['scenes'] for c in s['cues']))
    if '--cached' not in sys.argv:asyncio.run(generate())
    track=np.zeros(280*SR,np.float32);cues=[];summary=[]
    for scene in story['scenes']:
        loaded=[base.load_cue(c) for c in scene['cues']]
        available=scene['end']-scene['start']-.65-.30*(len(loaded)-1)
        speech=sum(len(s)/SR for s,w,p in loaded)
        # Keep breath pauses short. Bounded pitch-preserving tempo adjustment
        # accommodates authored fixed shots without clipped or rushed sentences.
        factor=speech/available
        factor=min(1.14,max(.90,factor))
        if speech/available>1.14:raise ValueError(f"Shorten {scene['id']}: {speech/available:.3f}x")
        residual=(scene['end']-scene['start'])-speech/factor
        gap=residual/(len(loaded)+1)
        if gap<.10 or gap>2.8:raise ValueError(f"Re-author {scene['id']}: gap {gap:.2f}s")
        cursor=scene['start']+gap
        for c,(samples,words,provenance) in zip(scene['cues'],loaded):
            if abs(factor-1)>.001:
                import subprocess
                p=subprocess.run(['ffmpeg','-v','error','-f','f32le','-ar',str(SR),'-ac','1','-i','-','-af',f'atempo={factor:.8f}','-f','f32le','-'],input=samples.astype('<f4').tobytes(),stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True)
                samples=np.frombuffer(p.stdout,'<f4').copy()
                words=[{**w,'start':w['start']/factor,'end':w['end']/factor} for w in words]
            pos=round(cursor*SR);track[pos:pos+len(samples)]=samples
            cues.append({**c,'scene':scene['id'],'start':cursor,'end':cursor+len(samples)/SR,'words':[{**w,'start':cursor+w['start'],'end':cursor+w['end']} for w in words]})
            cursor+=len(samples)/SR+gap
        summary.append({'id':scene['id'],'rawSpeechSeconds':speech,'tempo':factor,'gapSeconds':gap})
    OUT.mkdir(exist_ok=True)
    with wave.open(str(OUT/'narration.wav'),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(SR);f.writeframes((np.clip(track,-1,1)*32767).astype('<i2').tobytes())
    # Use the previous punctuation-aware grouping implementation.
    sys.path.insert(0,str(HERE.parent/'delivery-2026-10-19-final-v12'))
    sys.modules['narration']=base
    from captions import phrases
    groups=phrases(cues)
    (OUT/'captions.json').write_text(json.dumps(groups,indent=2))
    (OUT/'captions.en.srt').write_text('\n\n'.join(f"{i+1}\n{base.timecode(g['start'])} --> {base.timecode(g['end'])}\n{g['text']}" for i,g in enumerate(groups))+'\n')
    (OUT/'narration-manifest.json').write_text(json.dumps({'voice':base.VOICE,'engine':'edge-tts 7.3.1; stock neural voice','synthetic':True,'voiceCloning':False,'durationSeconds':280,'scenes':summary,'cues':cues,'scriptSha256':hashlib.sha256((HERE/'story.json').read_bytes()).hexdigest()},indent=2))
    print(json.dumps(summary,indent=2))
if __name__=='__main__':main()
