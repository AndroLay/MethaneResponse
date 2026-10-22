"""Build a fresh allowlisted judging supplement; no upload, no old-pack rewrite."""
import hashlib,json,subprocess,zipfile
from pathlib import Path
from prepare import HERE,ROOT,OUT,EVIDENCE,check_keys

def sha(data):return hashlib.sha256(data).hexdigest()
def main():
    summary=json.loads((OUT/'verification-summary.json').read_text())
    video=OUT/'MethaneResponse-Final-Submission-v16.mp4'
    assert sha(video.read_bytes())==summary['videoSha256']
    files={}
    names=['README.md','manifest.json','browser-export.json','trusted-digest.json',
           'anvil-proof.json','anvil-state.json','decision-with-receipt.json',
           'verified-facts.json','retained-state-verification.json','verification-summary.json',
           'technical-video-audit.json','MARS-DATA-LICENSE.txt']
    paths=[*(EVIDENCE/n for n in names),*(HERE/n for n in ['README.md','REVIEW.md','prepare.py','verify_evidence.py','render.py','finish.py','test_revision.py','package.py'])]
    paths += [ROOT/'docs/demo/delivery-2026-10-21-final-v15/render.py',
              ROOT/'docs/demo/delivery-2026-10-21-final-v15/story.json',
              ROOT/'docs/demo/delivery-2026-10-19-final-v12/visuals.py',
              ROOT/'docs/evidence/agent-practical-usefulness-2026-10-21-r12/results.json',
              ROOT/'docs/evidence/agent-practical-usefulness-2026-10-21-r12/findings.md']
    for p in paths:
        if p.is_symlink() or not p.is_file():raise ValueError('Invalid publication input')
        data=p.read_bytes()
        if len(data)>8_000_000:raise ValueError('Oversized evidence file')
        if p.suffix=='.json':check_keys(json.loads(data))
        files[str(p.relative_to(ROOT))]=data
    files['video/captions.en.srt']=(OUT/'captions.en.srt').read_bytes()
    files['video/CREDITS.txt']=(OUT/'CREDITS.txt').read_bytes()
    git=subprocess.run(['git','rev-parse','HEAD'],cwd=ROOT,stdout=subprocess.PIPE,check=True).stdout.decode().strip()
    acceptance=json.loads((ROOT/'docs/evidence/pre-video-final-2026-10-21/verification.json').read_text())
    files['source-lock.json']=(json.dumps({'localHead':git,'workingTreeContainsUncommittedChanges':True,
                                         'testedSourceSha256':acceptance['sourceSha256'],
                                         'note':'Source snapshot hashes, not proof these changes were pushed or deployed.'},indent=2)+'\n').encode()
    readme=f'''# MethaneResponse — v16 judging supplement (22 October 2026)

Current film: MethaneResponse-Final-Submission-v16.mp4, 4:40 / 1080p / 25fps.
SHA-256: {summary['videoSha256']}.

The MP4 is provided separately; this supplement contains the matching evidence,
transcript, credits and read-only local replay script. It does not include
footage, credentials, signing keys, an application installer, or the old v12 pack.
It is a local preparation, not a claim of an uploaded video or published source.

1. Read docs/evidence/video-v16-2026-10-22/README.md and the v16 delivery README.
2. Use the matching MethaneResponse source/dependencies. Extract this archive at
   the repository root; it adds paths, and does not contain app source files.
3. Run the documented verify_evidence.py command using the separately retained
   pin. It restores saved Anvil state on localhost, sends no transaction, and
   verifies original -> tampered/rehashed rejected -> original accepted.
4. Compare source-lock.json with the checkout. No remote CI claim is made for
   uncommitted source. A full video rebuild also needs retained raw capture/audio
   assets; this compact evidence supplement alone is not a film-production pack.

The main film follows TKM_S_021. KAZ_S_159 is a separate recorded DEMO AI example.
The public preview is restricted to selected sources, without private review or
chain writes. The film uses the full local prototype and Anvil local chain 31337.
Software DEMO review is not a human pilot. r12 frozen task completion stays 0/48.
No repair, emissions reduction, human productivity or public notarization is proven.

Burned-in captions only in the MP4; enabling another caption overlay may duplicate
them. Include video/CREDITS.txt with an eventual authorized upload. Normal-speed
human audiovisual review remains separate from automated technical acceptance.
'''
    files['README.md']=readme.encode()
    manifest={'version':'v16','videoSha256':summary['videoSha256'],'videoIncluded':False,
              'uploaded':False,'publicDeploymentChanged':False,
              'files':{name:{'sha256':sha(data),'bytes':len(data)} for name,data in sorted(files.items())}}
    files['manifest.json']=(json.dumps(manifest,indent=2)+'\n').encode()
    files['checksums.sha256']=''.join(f'{sha(data)}  {name}\n' for name,data in sorted(files.items())).encode()
    dest=OUT/'MethaneResponse-v16-Judging-Supplement.zip'
    if dest.exists():raise FileExistsError('Preserve earlier judging attachment')
    with zipfile.ZipFile(dest,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for name,data in sorted(files.items()):
            if name.startswith('/') or '..' in Path(name).parts:raise ValueError('Invalid archive path')
            z.writestr(name,data)
    with zipfile.ZipFile(dest) as z:
        assert z.testzip() is None
        for name,spec in manifest['files'].items():assert sha(z.read(name))==spec['sha256']
    assert dest.stat().st_size<35_000_000
    result={'archive':str(dest.relative_to(ROOT)),'sha256':sha(dest.read_bytes()),
            'bytes':dest.stat().st_size,'files':len(files),'checksumAndCRCVerified':True,
            'videoSha256':summary['videoSha256'],'uploaded':False}
    (OUT/'supplement-verification.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result))

if __name__=='__main__':main()
