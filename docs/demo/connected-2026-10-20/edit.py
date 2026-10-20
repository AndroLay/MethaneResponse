"""Render a captioned technical supplement from the actual connected workflow recording."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
from textwrap import wrap
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[3]
FONT=Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
STEPS=['Allocate capacity','Scope the question','Request evidence','Assess separately','Check related claims','Freeze the dossier','Revisit when needed']


def schedule(markers, duration, recorded_duration):
    if not 0<recorded_duration<=duration+1 or not markers:
        raise ValueError('Invalid recorded duration or missing actual markers')
    offset=max(0,duration-recorded_duration)
    result=[(0.0,'Actual application workflow','Historical MARS records. Software DEMO reviewer. Local API. No physical repair claim.')]
    previous=-1
    for item in markers:
        when=item['seconds'];label=item['label']
        if not isinstance(when,(int,float)) or not previous<=when<recorded_duration or not isinstance(label,str) or not 1<=len(label)<=180:
            raise ValueError('Nonmonotonic or invalid capture marker')
        result.append((when+offset+5,label,'Real interface interaction; demonstration decisions and evidence requests.'))
        previous=when
    result.append((duration+5,'Preserve the decision. Revisit the evidence.','A matching hash verifies integrity; it does not establish physical mitigation.'))
    return result,duration+8


def overlay(path,title,caption,index,bookend=False):
    im=Image.new('RGBA',(1920,1080),(4,18,29,255));d=ImageDraw.Draw(im)
    d.rectangle((240,0,1679,999),fill=(0,0,0,0))
    font=lambda size:ImageFont.truetype(str(FONT),size)
    d.text((22,42),'Methane',font=font(25),fill='#eefcff');d.text((22,76),'Response',font=font(25),fill='#20d7cc')
    for i,text in enumerate(['TECHNICAL','WALKTHROUGH','20 OCTOBER 2026']):d.text((22,148+i*29),text,font=font(15),fill='#9fb8c6')
    for i,text in enumerate(['Historical data','Real local API','DEMO reviewer','No live AI claim','No public chain']):d.text((22,332+i*35),text,font=font(17),fill='#bed2dd')
    d.text((1702,55),'INVESTIGATION',font=font(17),fill='#20d7cc')
    for i,text in enumerate(STEPS):
        y=130+i*80;active=min(index,6)==i
        d.ellipse((1703,y,1728,y+25),fill='#1abfb8' if active else '#24404f')
        d.text((1738,y+1),str(i+1),font=font(17),fill='#d8eff9')
        for j,line in enumerate(wrap(text,16)):d.text((1702,y+31+j*22),line,font=font(16),fill='#efffff' if active else '#9bb5c4')
    for j,line in enumerate(wrap(title,92)[:2]):d.text((260,1010+j*29),line,font=font(23),fill='#e9ffff')
    # Captions remain outside the authentic 1440x1000 application pixels.
    if bookend:
        d.rectangle((240,0,1679,999),fill='#061b29')
        for j,line in enumerate(wrap(title,38)):d.text((340,325+j*60),line,font=font(43),fill='#efffff')
        for j,line in enumerate(wrap(caption,60)):d.text((340,540+j*38),line,font=font(25),fill='#a9c4d3')
    im.save(path)


def run(args):
    return subprocess.run(args,check=True,capture_output=True,text=True)


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--capture',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    videos=list(a.capture.glob('raw/*/video.webm'))
    if len(videos)!=1:raise ValueError('Exactly one completed actual recording is required')
    video=videos[0];meta=json.loads((video.parent/'capture-markers.json').read_text())
    info=json.loads(run(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(video)]).stdout)
    stream=next(s for s in info['streams'] if s['codec_type']=='video')
    if (stream['width'],stream['height'])!=(1440,1000):raise ValueError('Unexpected native capture resolution')
    duration=float(info['format']['duration']);segments,total=schedule(meta['markers'],duration,meta['durationSeconds'])
    a.output.mkdir(parents=True,exist_ok=False)
    concat=[]
    for i,(start,title,caption) in enumerate(segments):
        name=f'overlay-{i:02d}.png';overlay(a.output/name,title,caption,max(0,i-1),bookend=i in (0,len(segments)-1))
        end=segments[i+1][0] if i+1<len(segments) else total
        concat.extend([f"file '{name}'",f'duration {end-start:.3f}'])
    concat.append(f"file 'overlay-{len(segments)-1:02d}.png'")
    (a.output/'overlay.ffconcat').write_text('\n'.join(concat)+'\n')
    destination=a.output/'MethaneResponse-Connected-Workflow-2026-10-20.mp4'
    music=ROOT/'delivery-output/story-v4/original-instrumental.wav'
    run(['ffmpeg','-v','error','-n','-filter_complex_threads','1','-i',str(video),'-f','concat','-safe','1','-i',str(a.output/'overlay.ffconcat'),'-stream_loop','-1','-i',str(music),'-filter_complex',
         '[0:v]tpad=start_duration=5:stop_duration=3:start_mode=clone:stop_mode=clone,pad=1920:1080:240:0:color=0x04121d[v];[1:v]fps=25[o];[v][o]overlay=0:0:format=auto:shortest=1[out];[2:a]volume=0.16,afade=t=in:d=2,afade=t=out:st='+str(max(0,total-3))+':d=3,loudnorm=I=-23:TP=-2:LRA=7[a]',
         '-map','[out]','-map','[a]','-t',str(total),'-r','25','-c:v','libx264','-preset','fast','-crf','19','-threads','2','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-ar','48000','-movflags','+faststart','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709',str(destination)])
    run(['ffmpeg','-v','error','-i',str(destination),'-f','null','-'])
    for i,time in enumerate([7,total*.4,total*.65,total-2]):
        run(['ffmpeg','-v','error','-n','-ss',str(time),'-i',str(destination),'-frames:v','1',str(a.output/f'frame-{i}.png')])
    final=json.loads(run(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(destination)]).stdout)
    report={'schemaVersion':1,'file':str(destination),'sha256':hashlib.sha256(destination.read_bytes()).hexdigest(),'rawCaptureSha256':hashlib.sha256(video.read_bytes()).hexdigest(),
            'durationSeconds':float(final['format']['duration']),'width':1920,'height':1080,'actualCapture':True,'applicationPixelsUpscaled':False,'publiclyUploaded':False,
            'segments':segments,'audio':'Original project instrumental, no new voiceover. Historical v12 contains English synthetic narration.',
            'limitations':['Technical supplement, not a replacement submission presentation.','Application actions are not sped up. Includes mobile viewport checks and software fixture setup.','Editorial chapter timing uses recorded markers with an estimated browser-start offset.','Human audiovisual quality review remains separate.']}
    (a.output/'verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))


if __name__=='__main__':main()
