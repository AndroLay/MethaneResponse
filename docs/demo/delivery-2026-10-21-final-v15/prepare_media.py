import hashlib,json,subprocess
from pathlib import Path
import numpy as np
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2];OUT=ROOT/'delivery-output/final-v15-TAKE01'
def run(a):return subprocess.check_output(a,stderr=subprocess.PIPE)
def main():
    capture=next((OUT/'raw-take2').rglob('capture.json'));directory=capture.parent;video=directory/'video.webm'
    meta=json.loads(capture.read_text())
    pix=np.frombuffer(run(['ffmpeg','-v','error','-i',str(video),'-vf','fps=25,scale=1:1','-pix_fmt','rgb24','-f','rawvideo','-']),np.uint8).reshape(-1,3).astype(int)
    observed=[];missing=[]
    for shot in meta['shots']:
        match=np.flatnonzero(np.max(abs(pix-np.array(shot['color'])),axis=1)<7)
        if len(match)<5:
            missing.append(shot);continue
        shot['start']=(int(match[-1])+1)/25
        shot['slateStart']=int(match[0])/25
        shot['sync']='observed visual slate'
        observed.append(shot['startWall']/1000-shot['start'])
    offset=float(np.median(observed))
    if len(observed)<8 or max(abs(x-offset) for x in observed)>.16:raise ValueError('Recording clock not stable enough for fallback')
    for shot in missing:
        shot['start']=round((shot['startWall']/1000-offset)*25)/25
        shot['slateStart']=shot['start']-.64
        shot['sync']='median clock of nine observed slates; Chromium skipped this short slate'
        shot['clockMaximumDeviationSeconds']=max(abs(x-offset) for x in observed)
    duration=float(json.loads(run(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(video)]))['format']['duration'])
    for i,shot in enumerate(meta['shots']):shot['end']=meta['shots'][i+1]['slateStart'] if i+1<len(meta['shots']) else duration
    meta.update(video=str(video.relative_to(ROOT)),videoSha256=hashlib.sha256(video.read_bytes()).hexdigest(),duration=duration)
    (OUT/'sync.json').write_text(json.dumps(meta,indent=2))
    frame_dir=OUT/'raw-contact';frame_dir.mkdir(exist_ok=True)
    # Actual source contact sheet is an inspection aid, never a claim of playback.
    run(['ffmpeg','-v','error','-i',str(video),'-vf','fps=1/4,scale=480:270,tile=4x7','-frames:v','1','-y',str(frame_dir/'contact.png')])
    print(json.dumps([{'id':s['id'],'start':s['start'],'end':s['end']} for s in meta['shots']],indent=2))
if __name__=='__main__':main()
