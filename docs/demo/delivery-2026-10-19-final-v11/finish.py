#!/usr/bin/env python3
"""Duck the existing original score under new speech; true-peak limited mix."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

HERE=Path(__file__).resolve().parent
REPO=HERE.parents[2]
OUT=REPO/'delivery-output/story-v11'

def run(args):
    p=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if p.returncode:raise RuntimeError(p.stderr.decode(errors='replace')[-2000:])
    return p

def main():
    duration=json.loads((OUT/'narration-manifest.json').read_text())['durationSeconds']
    music=REPO/'delivery-output/story-v4/original-instrumental.wav'
    # Parallel control signal ducks only the score. Speech itself stays clean.
    filters=(f'[0:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,asplit=2[voice][control];'
      f'[1:a]atrim=0:{duration},asetpts=PTS-STARTPTS,volume=0.22,afade=t=in:d=1.2,afade=t=out:st={duration-2}:d=2[music];'
      '[music][control]sidechaincompress=threshold=0.018:ratio=5:attack=25:release=240:makeup=1[ducked];'
      '[voice][ducked]amix=inputs=2:normalize=0:duration=first[mix]')
    premix=OUT/'premix.wav'
    run(['ffmpeg','-v','error','-i',str(OUT/'narration.wav'),'-i',str(music),'-filter_complex',filters,
      '-map','[mix]','-c:a','pcm_s24le','-t',str(duration),'-y',str(premix)])
    measured=run(['ffmpeg','-hide_banner','-i',str(premix),'-af','loudnorm=I=-18:TP=-2:LRA=9:print_format=json','-f','null','-'])
    match=re.findall(r'\{\s*"input_i".*?\}',measured.stderr.decode(),re.S)
    stats=json.loads(match[-1])
    filt=('loudnorm=I=-18:TP=-2:LRA=9:linear=true:'+
      ':'.join(f'{a}={stats[b]}' for a,b in [('measured_I','input_i'),('measured_TP','input_tp'),('measured_LRA','input_lra'),('measured_thresh','input_thresh'),('offset','target_offset')]))
    output=OUT/'final-mix.wav'
    run(['ffmpeg','-v','error','-i',str(premix),'-af',filt,'-ar','48000','-ac','2','-c:a','pcm_s24le','-y',str(output)])
    (OUT/'mix-manifest.json').write_text(json.dumps({'originalMusic':str(music.relative_to(REPO)),
      'musicSha256':hashlib.sha256(music.read_bytes()).hexdigest(),'speech':'narration.wav','speechSynthetic':True,
      'durationSeconds':duration,'ducking':'score only; 25ms attack, 240ms release, ratio 5',
      'normalization':{'targetLUFS':-18,'maxTruePeakDBTP':-2,'twoPassMeasurements':stats},
      'outputSha256':hashlib.sha256(output.read_bytes()).hexdigest()},indent=2))
    print(json.dumps({'mix':str(output),'duration':duration}))

if __name__=='__main__':main()
