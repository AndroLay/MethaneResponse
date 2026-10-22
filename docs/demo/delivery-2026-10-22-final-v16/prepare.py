"""Prepare an additive editorial revision and an allowlisted TKM proof bundle.

Never rewrites v15, application state, frozen r12, or any remote destination.
"""
import gzip, hashlib, json, re, shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OLD = ROOT / 'delivery-output/final-v15-TAKE01'
OUT = ROOT / 'delivery-output/final-v16'
EVIDENCE = ROOT / 'docs/evidence/video-v16-2026-10-22'
QUOTE = ('An administrative response was recorded concerning source KAZ_S_159. '
         'No repair completion, follow-up measurement, or independent mitigation verification is documented.')
QUOTE_SHA = '167d54ef9ee7952847bd9c88b12a513f181bf609a91bc2e3af8c25b31cabd0eb'

def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def dump(path, value): path.write_text(json.dumps(value, indent=2, ensure_ascii=False)+'\n')
def copy_once(src, dest):
    if dest.exists():
        if sha(src) != sha(dest): raise ValueError(f'Refusing to overwrite {dest.name}')
    else: shutil.copy2(src, dest)

def check_keys(value):
    """Reject credentials by field name; permit public hashes and registry IDs."""
    if isinstance(value, dict):
        for key, item in value.items():
            if re.search(r'(^|_)(password|secret|token|private.?key|api.?key|authorization)($|_)', key, re.I):
                raise ValueError(f'Credential-like field in publication input: {key}')
            check_keys(item)
    elif isinstance(value, list):
        for item in value: check_keys(item)

def main():
    OUT.mkdir(exist_ok=True); EVIDENCE.mkdir(exist_ok=True)
    sync = json.loads((OLD/'sync.json').read_text())
    raw = (ROOT/sync['video']).parent
    proof = json.loads((OLD/'current-take2-anvil-proof.json').read_text())
    export = json.loads((raw/'frozen-investigation-decision.json').read_text())
    pin = json.loads((raw/'trusted-decision-digest.json').read_text())
    assert proof['record']['decision'] == export['decision']
    assert sha(raw/'frozen-investigation-decision.json') == proof['inputSha256']
    assert pin['digest'] == proof['trustedDigest'] == export['decision']['digest']
    assert proof['sourceId'] == 'TKM_S_021' and proof['chainId'] == 31337
    assert proof['providerCalls'] == 0 and not proof['publicNetworkUsed']
    assert hashlib.sha256(QUOTE.encode()).hexdigest() == QUOTE_SHA
    for obj in (proof, export, pin): check_keys(obj)
    # Explicit source allowlist: no logs, environment, traces, credentials or wallets.
    allowed = {
        'browser-export.json': raw/'frozen-investigation-decision.json',
        'trusted-digest.json': raw/'trusted-decision-digest.json',
        'anvil-proof.json': OLD/'current-take2-anvil-proof.json',
        'anvil-state.json': OLD/'current-take2-anvil-proof.json.anvil-state.json',
        'MARS-DATA-LICENSE.txt': ROOT/'data/real/UNEP-MARS-LICENSE-CC-BY-NC-SA-4.0.txt',
    }
    for name, src in allowed.items(): copy_once(src, EVIDENCE/name)
    dump(EVIDENCE/'decision-with-receipt.json', proof['record'])
    for name in ['sync.json', 'current-take2-anvil-proof.json', 'planner-explanations.json',
                 'captions.json', 'captions.en.srt', 'narration-manifest.json',
                 'final-mix.wav', 'narration.wav', 'mix-manifest.json']:
        copy_once(OLD/name, OUT/name)
    # One catalog-only source from take1. The main investigation stays take2.
    (OUT/'raw').mkdir(exist_ok=True)
    copy_once(next((OLD/'raw').rglob('video.webm')), OUT/'raw/video.webm')
    manifest_path = ROOT/'apps/web/public/data/mars-progressive-manifest.json'
    manifest = json.loads(manifest_path.read_text())
    assert manifest['plumeCount'] == manifest['linkedObservationCount'] + manifest['unlinkedObservationCount']
    bid = hashlib.sha256(b'TKM_S_021').digest()[0] % 64
    bucket = manifest_path.parent/f'mars-observation-buckets/{bid:03}.json.gz'
    decoded = gzip.decompress(bucket.read_bytes())
    entry = manifest['buckets'][bid]
    assert sha(bucket) == entry['compressedSha256']
    assert hashlib.sha256(decoded).hexdigest() == entry['decodedSha256']
    data = json.loads(decoded)
    source = next(s for s in data['sources'] if s['sourceId'] == 'TKM_S_021')
    obs = sorted(source['observations'], key=lambda x:x['date'])[0]
    assert obs['sourceId'] == 'TKM_S_021' and not obs['synthetic']
    assert obs['fluxKgHr'] == 22926 and obs['uncertaintyKgHr'] == 7969
    facts = {
        'sourceId':'TKM_S_021', 'snapshotId':manifest['datasetSnapshotId'],
        'sourceCount':manifest['sourceCount'], 'totalPlumes':manifest['plumeCount'],
        'linkedPlumes':manifest['linkedObservationCount'], 'unlinkedPlumes':manifest['unlinkedObservationCount'],
        'sampleObservation':obs, 'observationBucket':str(bucket.relative_to(ROOT)),
        'observationBucketSha256':sha(bucket), 'observationIsContinuous':False,
        'quote':QUOTE, 'quoteSha256':QUOTE_SHA,
        'quoteSource':'docs/evidence/render-preview-2026-10-21/deepseek-public.png',
        'quoteSourceSha256':sha(ROOT/'docs/evidence/render-preview-2026-10-21/deepseek-public.png'),
        'quoteIsProjectAuthoredDemo':True, 'separateAIExampleSourceId':'KAZ_S_159',
        'previousVideoSha256':sha(OLD/'MethaneResponse-Final-Submission-v15.mp4'),
        'trustedDigest':pin['digest'], 'publicPreviewHasFullWorkflow':False,
    }
    dump(OUT/'verified-facts.json', facts); dump(EVIDENCE/'verified-facts.json', facts)
    names = list(allowed) + ['decision-with-receipt.json','verified-facts.json']
    dump(EVIDENCE/'manifest.json', {
        'kind':'allowlisted-local-demo-proof-not-public-chain', 'sourceId':'TKM_S_021',
        'trustedDigest':pin['digest'], 'chainId':31337, 'publicNetworkUsed':False,
        'browserVideoSha256':sync['videoSha256'], 'v15VideoSha256':facts['previousVideoSha256'],
        'files':{name:{'sha256':sha(EVIDENCE/name),'bytes':(EVIDENCE/name).stat().st_size} for name in names},
        'publication':'Prepared locally; presence here does not mean pushed to GitHub.',
        'trustBoundary':'The saved chain and digest are project-supplied DEMO trust inputs, not an independent public notarization.',
    })
    print(json.dumps({'output':str(OUT.relative_to(ROOT)), 'evidenceFiles':len(names),
                      'sameTakeContinuity':True, 'quoteHashMatches':True}))

if __name__ == '__main__': main()
