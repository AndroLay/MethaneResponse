#!/usr/bin/env python3
"""Punctuated, phrase-aware subtitles from the generated word boundaries."""
import json
from pathlib import Path
import re
from narration import OUT,timecode

def phrases(cues):
    groups=[]
    for cue in cues:
        words=[];cursor=0
        for original in cue['words']:
            w=dict(original);index=cue['text'].casefold().find(w['text'].casefold(),cursor)
            if index<0:raise ValueError(f"Cannot align {cue['scene']}/{cue['id']}: {w['text']}")
            cursor=index+len(w['text'])
            suffix=re.match(r'[.,!?;:]+',cue['text'][cursor:])
            if suffix:w['text']+=suffix[0]
            words.append(w)
        i=0
        while i<len(words):
            count=0;value=''
            while i+count<len(words) and count<10:
                candidate=(value+' '+words[i+count]['text']).strip()
                if len(candidate)>56 and count>=3:break
                value=candidate;count+=1
                if count>=3 and re.search(r'[.!?]$',value):break
                if count>=5 and value.endswith(','):break
            remaining=len(words)-i-count
            # Avoid flashing a single leftover word for half a second.
            if 0<remaining<3 and count>=5:count-=3-remaining
            chunk=words[i:i+count];i+=count
            groups.append({'start':max(cue['start'],chunk[0]['start']-.04),
              'end':min(cue['end'],chunk[-1]['end']+.10),'text':' '.join(w['text'] for w in chunk),'scene':cue['scene']})
    for a,b in zip(groups,groups[1:]):a['end']=min(a['end'],b['start']-.015)
    return groups

def main():
    m=json.loads((OUT/'narration-manifest.json').read_text());groups=phrases(m['cues'])
    (OUT/'captions.json').write_text(json.dumps(groups,indent=2))
    (OUT/'captions.en.srt').write_text('\n\n'.join(f"{i+1}\n{timecode(g['start'])} --> {timecode(g['end'])}\n{g['text']}" for i,g in enumerate(groups))+'\n')
    (OUT/'caption-manifest.json').write_text(json.dumps({'source':'narration-manifest.json','groups':len(groups),
      'punctuation':'from authored script, aligned to exact generated words',
      'minimumWordsPerGroup':min(len(g['text'].split()) for g in groups),
      'minimumDurationSeconds':min(g['end']-g['start'] for g in groups)},indent=2))
    m['captionGroups']=len(groups)
    m['captionPostprocessing']='captions.py: authored punctuation and phrase-aware grouping'
    (OUT/'narration-manifest.json').write_text(json.dumps(m,indent=2))
    print(json.dumps({'captionGroups':len(groups),'minWords':min(len(g['text'].split()) for g in groups)}))

if __name__=='__main__':main()
