"""Verify the retained TKM receipt on a disposable loopback-only Anvil.

No deployment, signing key, provider call or public RPC. The independently
supplied pin is mandatory; a bundle checksum alone is not an authenticity proof.
"""
import argparse, hashlib, json, os, shutil, socket, subprocess, tempfile, time
import urllib.request
from pathlib import Path
from prepare import ROOT, EVIDENCE

def rpc(url, method, params):
    req = urllib.request.Request(url, data=json.dumps({'jsonrpc':'2.0','id':1,'method':method,'params':params}).encode(), headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req, timeout=3) as response: value=json.load(response)
    if 'error' in value: raise ValueError('Disposable Anvil RPC failed: '+method)
    return value['result']

def verify(expected, output):
    manifest = json.loads((EVIDENCE/'manifest.json').read_text())
    if expected != manifest['trustedDigest']: raise ValueError('Externally supplied pin differs from the retained UI pin')
    for name, spec in manifest['files'].items():
        path = EVIDENCE/name
        if Path(name).name != name or path.is_symlink(): raise ValueError('Invalid allowlisted input')
        if hashlib.sha256(path.read_bytes()).hexdigest() != spec['sha256']: raise ValueError('Bundle input changed: '+name)
    proof=json.loads((EVIDENCE/'anvil-proof.json').read_text())
    export=json.loads((EVIDENCE/'browser-export.json').read_text())
    record=json.loads((EVIDENCE/'decision-with-receipt.json').read_text())
    pin=json.loads((EVIDENCE/'trusted-digest.json').read_text())
    assert record == proof['record'] and record['decision'] == export['decision']
    assert record['decision']['digest'] == pin['digest'] == expected
    assert proof['inputSha256'] == hashlib.sha256((EVIDENCE/'browser-export.json').read_bytes()).hexdigest()
    assert record['decision']['dossier']['context']['sourceId'] == 'TKM_S_021'
    state=json.loads((EVIDENCE/'anvil-state.json').read_text())
    assert int(state['chainId']) == record['receipt']['chainId'] == 31337
    assert state['registryAddress'] == record['receipt']['registryAddress']
    bun=shutil.which('bun');anvil_bin=shutil.which('anvil')
    if not bun or not anvil_bin: raise RuntimeError('Install existing Bun/Foundry toolchain before replay; no automatic installation')
    parent=ROOT/'.playwright-cli/v17-evidence';parent.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='replay-',dir=parent) as temporary:
        with socket.socket() as probe:
            probe.bind(('127.0.0.1',0));port=probe.getsockname()[1]
        url=f'http://127.0.0.1:{port}'
        env={'PATH':os.environ.get('PATH',''),'TMPDIR':temporary,
             'CHAIN_NETWORK':'local','LOCAL_CHAIN_RPC_URL':url,
             'LOCAL_REGISTRY_ADDRESS':state['registryAddress'],
             'CHAIN_CONFIRMATIONS':'1','ENABLE_CHAIN_WRITES':'false'}
        process=subprocess.Popen([anvil_bin,'--host','127.0.0.1','--port',str(port),'--chain-id','31337','--silent'],
                                 env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        try:
            ready=False
            for _ in range(60):
                if process.poll() is not None: raise RuntimeError('Disposable Anvil exited before readiness')
                try:
                    if rpc(url,'eth_chainId',[]) == '0x7a69': ready=True;break
                except (OSError,ValueError): pass
                time.sleep(.1)
            if not ready: raise RuntimeError('Disposable Anvil did not become ready')
            assert rpc(url,'anvil_loadState',[state['state']]) is True
            assert rpc(url,'eth_getCode',[state['registryAddress'],'latest']) != '0x'
            def cli(path, digest):
                p=subprocess.run([bun,'--no-env-file','scripts/verify-investigation-decision.ts',str(path),
                                  '--expected-digest',digest,'--require-chain'],cwd=ROOT,env=env,
                                  stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=40)
                return {'exitCode':p.returncode,'stdout':p.stdout.decode().strip(),'stderr':p.stderr.decode().strip()}
            original=cli(EVIDENCE/'decision-with-receipt.json',expected)
            altered=Path(temporary)/'altered.json'
            edit_env={**env,'PROOF_INPUT':str(EVIDENCE/'decision-with-receipt.json'),'PROOF_OUTPUT':str(altered)}
            edit="""import { investigationDigest } from './packages/shared/src/investigation-dossier';
const record=await Bun.file(process.env.PROOF_INPUT).json();
record.decision.rationale='DEMO modified after anchoring; no physical repair established.';
const {digest,...payload}=record.decision; record.decision.digest=await investigationDigest(payload);
await Bun.write(process.env.PROOF_OUTPUT,JSON.stringify(record)); console.log(record.decision.digest);"""
            changed=subprocess.run([bun,'--no-env-file','--eval',edit],cwd=ROOT,env=edit_env,
                                   stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=30,check=True)
            changed_pin=changed.stdout.decode().strip()
            checks={'original':original,'alteredTrusted':cli(altered,expected),
                    'alteredRehashed':cli(altered,changed_pin),
                    'originalAgain':cli(EVIDENCE/'decision-with-receipt.json',expected)}
            if [checks[k]['exitCode'] for k in checks] != [0,1,1,0]: raise AssertionError('Verification sequence failed')
            report={'kind':'retained-state-reverification-not-new-public-transaction',
                    'sourceId':'TKM_S_021','trustedDigest':expected,'chainId':31337,
                    'restoredState':True,'checks':checks,'providerCalls':0,'transactionsSent':0,
                    'publicNetworkUsed':False,'physicalOutcomeEstablished':False,
                    'limitation':'Project-supplied local state and separately retained DEMO UI pin; not independently witnessed public notarization.'}
            if output:
                if output.exists(): raise FileExistsError('Preserve prior verification output')
                output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(report,indent=2)+'\n')
            print(json.dumps({'sourceId':report['sourceId'],'checks':{k:v['exitCode'] for k,v in checks.items()},'transactionsSent':0}))
            return report
        finally:
            process.terminate()
            try: process.wait(timeout=5)
            except subprocess.TimeoutExpired: process.kill();process.wait()

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--expected-digest',required=True)
    parser.add_argument('--output',type=Path)
    args=parser.parse_args();verify(args.expected_digest,args.output)
