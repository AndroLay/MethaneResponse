"""Small explicit evidence allowlist. Never publishes raw browser recordings."""
import json,re,shutil
from prepare import HERE,ROOT,OUT,EVIDENCE,sha,dump

def scan(value):
    if isinstance(value,dict):
        for k,v in value.items():
            if re.search(r'(^|_)(password|secret|token|private.?key|api.?key|authorization)($|_)',k,re.I):raise ValueError('Credential-like field: '+k)
            scan(v)
    elif isinstance(value,list):
        for v in value:scan(v)

def main():
    EVIDENCE.mkdir(exist_ok=True)
    sync=json.loads((OUT/'sync.json').read_text());raw=(ROOT/sync['video']).parent;p=json.loads((OUT/'take8-anvil-proof.json').read_text())
    assert p['inputSha256']==sha(raw/'frozen-investigation-decision.json')
    assert p['record']['decision']==json.loads((raw/'frozen-investigation-decision.json').read_text())['decision']
    assert p['trustedDigest']==json.loads((raw/'trusted-decision-digest.json').read_text())['digest']
    inputs={'browser-export.json':raw/'frozen-investigation-decision.json','trusted-digest.json':raw/'trusted-decision-digest.json','anvil-proof.json':OUT/'take8-anvil-proof.json','anvil-state.json':OUT/'take8-anvil-proof.json.anvil-state.json','verified-facts.json':OUT/'verified-facts.json','MARS-DATA-LICENSE.txt':ROOT/'data/real/UNEP-MARS-LICENSE-CC-BY-NC-SA-4.0.txt'}
    for name,src in inputs.items():
        if name.endswith('.json'):scan(json.loads(src.read_text()))
        dst=EVIDENCE/name
        if dst.exists():assert sha(src)==sha(dst)
        else:shutil.copy2(src,dst)
    dump(EVIDENCE/'decision-with-receipt.json',p['record'])
    names=list(inputs)+['decision-with-receipt.json']
    dump(EVIDENCE/'manifest.json',{'kind':'same-take-local-demo-proof','revision':'v17','sourceId':'TKM_S_021','chainId':31337,'trustedDigest':p['trustedDigest'],'browserVideoSha256':sync['videoSha256'],'publicNetworkUsed':False,'providerCalls':0,'files':{n:{'sha256':sha(EVIDENCE/n),'bytes':(EVIDENCE/n).stat().st_size}for n in names},'publication':'Prepared locally, not pushed or uploaded','trustBoundary':'Project-supplied DEMO Anvil state and UI pin, not independent public notarization'})
    print(json.dumps({'sameTakeContinuity':True,'files':len(names),'providerCalls':0}))
if __name__=='__main__':main()
