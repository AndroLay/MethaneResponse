"""Incremental picture-lock fix: only request field timing changes.

Preserve first-edit source/master. Validate the source diff is exactly one
declarative clip entry before reusing the nine unaffected encoded scenes.
"""
import hashlib,json,shutil
from pathlib import Path
import render
def main():
    out=render.OUT;old=out/'render-first-edit-source.py';current=render.HERE/'render.py'
    before=old.read_text();after=current.read_text()
    if before.replace("clip(5,10,1.15,offset=6.5", "clip(5,10,1.35,offset=0")!=after:raise RuntimeError('Unexpected changes: cannot reuse unaffected scenes')
    oldkey=hashlib.sha256(old.read_bytes()).hexdigest()[:10];newkey=hashlib.sha256(current.read_bytes()).hexdigest()[:10]
    source=out/f'segments-{oldkey}';target=out/f'segments-{newkey}';target.mkdir(exist_ok=False)
    reused={}
    for scene in render.STORY:
        if scene['id']=='request':continue
        p=source/f"{scene['id']}.mp4";dest=target/p.name
        shutil.copy2(p,dest);reused[scene['id']]=hashlib.sha256(p.read_bytes()).hexdigest()
    (out/'incremental-edit.json').write_text(json.dumps({'changedScene':'request','changedTiming':'Start at evidence fields rather than 6.5 seconds later; editorial speed 1.35x','preservedFirstMaster':'first-edit-v15.mp4','sourceBefore':oldkey,'sourceAfter':newkey,'sourceDiffVerified':'One clip entry only; all other scene code, data, speech and timing unchanged','reusedSceneSha256':reused},indent=2))
    render.main()
if __name__=='__main__':main()
