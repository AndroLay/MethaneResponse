#!/usr/bin/env python3
"""Build a v18 local judging ZIP, with exact take8 proof and no publication."""
import argparse,json
from pathlib import Path
from PIL import Image
from package_submission import (REPO,HERE,digest,json_bytes,validate_fields,
                                reject_private_fields,write_zip,validate_archive)

VIDEO_SHA='b14bc61f893176631c8ce15445217ea1ab4977e52a1c252b81d2e661b4006fad'
PIN='0xcab36a271a000facd92cefbbfb902b314cce70eed565a9471ca6b263b5353ec2'
PROOF='docs/evidence/video-v17-2026-10-22'
DELIVERY='docs/demo/delivery-2026-10-22-final-v18'
FIXED=[
 'README.md','LICENSE','NOTICE','data/real/README.md',
 *['docs/release/devpost-submission/'+n for n in
   ['README.md','fields.json','project-story.md','judges-guide.md','source-links.md','rules-check.md','access-status.json',
    'package_v18_submission.py','test_v18_package.py','package_submission.py','alignment-checks.json',
    'publication-status-2026-10-23.json','youtube-metadata.md']],
 *[DELIVERY+'/'+n for n in ['README.md','pipeline.py','test_revision.py','verify.py']],
 *['docs/evidence/video-v18-2026-10-22/'+n for n in
   ['verification-summary.json','technical-video-audit.json','edit.json','submission-replay-2026-10-23.json']],
 *[PROOF+'/'+n for n in ['README.md','manifest.json','browser-export.json','trusted-digest.json',
    'decision-with-receipt.json','anvil-proof.json','anvil-state.json','verified-facts.json',
    'MARS-DATA-LICENSE.txt','retained-state-verification.json']],
 *['docs/evidence/deepseek-live-2026-10-21/'+n for n in ['README.md','smoke-summary.json']],
 *['docs/evidence/agent-practical-usefulness-2026-10-21-r12/'+n for n in ['findings.md','results.json']],
 'docs/evidence/render-preview-2026-10-21/README.md',
 'docs/evidence/pre-video-final-2026-10-21/README.md',
 'docs/evidence/release-sync-2026-10-23/README.md',
 'docs/evidence/release-sync-2026-10-23/validation.json',
 'docs/demo/delivery-2026-10-22-final-v17/verify_evidence.py',
]
GALLERY=[
 ('01-plan.png','delivery-output/final-v18/final-samples/83.20.png','Compare investigation capacity',
  'Rendered local take8 footage: compare capacity 10 and 20. This is a planning heuristic, not predicted leakage.', 'rendered_application_footage'),
 ('02-ai.png','docs/evidence/render-preview-2026-10-21/deepseek-public.png','Separate archived DeepSeek DEMO',
  'KAZ_S_159 project-authored DEMO excerpt, recorded backend integration; separate from the TKM investigation.', 'archived_browser_capture'),
 ('03-request.png','delivery-output/final-v18/final-samples/164.64.png','Make the evidence request actionable',
  'TKM software DEMO request: dated follow-up measurements, methods and uncertainty. No operator is contacted.', 'rendered_application_footage'),
 ('04-review.png','delivery-output/final-v18/final-samples/198.00.png','Preserve review history',
  'New software DEMO information opens review without overwriting the earlier decision.', 'rendered_application_footage'),
 ('05-verify.png','delivery-output/final-v18/final-samples/224.00.png','Verify the retained local commitment',
  'Take8 TKM original/rehashed/restored checks against Anvil local chain 31337; not public notarization or repair proof.', 'editorial_proof_readout'),
 ('06-impact.png','delivery-output/final-v18/final-samples/260.00.png','From software to potential climate impact',
  'Editorial pathway: field repairs and comparable post-action measurements are not demonstrated or quantified outcomes.', 'editorial_diagram'),
]
ALLOWED=set(FIXED)|{row[1]for row in GALLERY}

def allowed_bytes(name):
    path=Path(name)
    if path.is_absolute()or '..'in path.parts or name not in ALLOWED:
        raise ValueError('File is outside the explicit v18 allowlist')
    candidate=REPO/path
    if candidate.is_symlink()or REPO not in candidate.resolve().parents:
        raise ValueError('Symlink or escaped input')
    data=candidate.read_bytes()
    if len(data)>8_000_000:raise ValueError('Oversized attachment input')
    if name.endswith('.json'):reject_private_fields(json.loads(data))
    return data

def validate_current(fields):
    validate_fields(fields,(HERE/'project-story.md').read_text())
    video=fields['video']
    if (video.get('version'),video['durationSeconds'],video['sha256'])!=('v18',297,VIDEO_SHA):
        raise ValueError('Current submission must bind the verified v18 video')
    if fields['proofDirectory']!=PROOF or fields['primaryVideoSourceId']!='TKM_S_021':
        raise ValueError('Current film requires the exact take8 TKM proof')
    if video['localPath']!='delivery-output/final-v18/MethaneResponse-Final-Submission-v18.mp4':
        raise ValueError('Unexpected local film path')
    if digest((REPO/video['localPath']).read_bytes())!=VIDEO_SHA:raise ValueError('Video bytes differ')
    verification=json.loads((REPO/'docs/evidence/video-v18-2026-10-22/verification-summary.json').read_text())
    if verification['videoSha256']!=VIDEO_SHA or verification['durationSeconds']!=297:
        raise ValueError('Video verification does not bind this film')
    if verification['technicalChecksPassed']!=18:raise ValueError('Incomplete video checks')

def payload():
    fields=json.loads((HERE/'fields.json').read_text());validate_current(fields)
    proof=json.loads((REPO/PROOF/'manifest.json').read_text())
    if proof['trustedDigest']!=PIN or proof['sourceId']!='TKM_S_021':raise ValueError('Wrong retained pin')
    for name,spec in proof['files'].items():
        data=allowed_bytes(PROOF+'/'+name)
        if digest(data)!=spec['sha256']or len(data)!=spec['bytes']:raise ValueError('Retained proof changed')
    export=json.loads(allowed_bytes(PROOF+'/browser-export.json'))
    receipt=json.loads(allowed_bytes(PROOF+'/decision-with-receipt.json'))
    if receipt['decision']!=export['decision']or receipt['decision']['digest']!=PIN:
        raise ValueError('Export and receipt are not the same take')
    if receipt['receipt']['chainId']!=31337:raise ValueError('Expected local Anvil')
    files={name:allowed_bytes(name)for name in FIXED};gallery=[]
    for name,source,title,caption,kind in GALLERY:
        data=allowed_bytes(source)
        if len(data)>=5_000_000:raise ValueError('Gallery image exceeds supplied form limit')
        with Image.open(REPO/source)as image:image.verify()
        with Image.open(REPO/source)as image:width,height=image.size
        files['gallery/'+name]=data
        gallery.append(dict(file=name,source=source,title=title,caption=caption,kind=kind,
                            width=width,height=height,renderedComposition=kind!='archived_browser_capture'))
    files['gallery-captions.json']=json_bytes(gallery)
    files['READ-FIRST.md']=('''# MethaneResponse — current v18 judging attachment

Start with `docs/release/devpost-submission/judges-guide.md` and
`docs/release/devpost-submission/project-story.md`. Video v18 is a separate
local MP4, 4:57; its checksum and registered host URL are in `fields.json`.
Public video metadata does not establish that the hosted cut matches this MP4.
Gallery captions distinguish actual browser capture, composed application
footage, a proof readout and an editorial impact diagram.

The exact TKM take8 commitment is in `docs/evidence/video-v17-2026-10-22/`.
Clone the full repository to run its real Bun/Anvil verifier; this attachment
is a bounded evidence package, not a standalone application or full source ZIP.
Follow that proof README. KAZ AI is a separate archived DEMO, not a TKM inference.
Anvil is local. No physical repair, emissions reduction or productivity is proven.

Read the current authenticated submission observation in
`docs/release/devpost-submission/publication-status-2026-10-23.json` and the earlier
baseline in `docs/release/devpost-submission/access-status.json`. This archive
does not certify which file, if any, was uploaded to the submitted entry.
The public preview has selected sources, temporary state and no private review
or chain writes. This packaging command performs no upload, push, deployment
or Devpost submission. Proposed YouTube metadata has not been saved to YouTube.
Full video playback and listening remain unreviewed. Frozen r12 is 0/48 under
its scorer. See the complete repository for links outside this allowlisted subset:
https://github.com/AndroLay/MethaneResponse
''').encode()
    manifest=dict(schemaVersion=2,preparedDate='2026-10-23',version='v18',
        purpose='Local judging evidence attachment; not standalone source or a submitted entry',
        sourceId='TKM_S_021',trustedDigest=PIN,chainId=31337,videoSource=fields['video'],
        videoIncluded=False,videoUploaded=bool(fields['video']['url']),
        externalSubmissionPerformed=fields['externalSubmissionPerformed'],
        externalActionsByBuilder=False,hostedCutMatchesLocalExport='not_verified',
        publicationObservation=json.loads(files['docs/release/devpost-submission/publication-status-2026-10-23.json']),
        publicV18RevisionVerified=False,sourcePaths='Repository-relative; use the full repository for runtime dependencies',
        files={n:dict(sha256=digest(data),bytes=len(data))for n,data in sorted(files.items())})
    files['manifest.json']=json_bytes(manifest)
    files['checksums.sha256']=''.join(f'{digest(data)}  {n}\n'for n,data in sorted(files.items())).encode()
    return files

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
    if args.output.exists():raise FileExistsError('Preserve prior judging ZIP')
    files=payload();args.output.parent.mkdir(parents=True,exist_ok=True);write_zip(args.output,files)
    result={**validate_archive(args.output),'path':str(args.output),'version':'v18','uploaded':False}
    args.output.with_suffix('.verification.json').write_bytes(json_bytes(result));print(json.dumps(result))

if __name__=='__main__':main()
