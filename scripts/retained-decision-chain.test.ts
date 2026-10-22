import { expect, test } from 'bun:test';
import { createHash, randomBytes } from 'node:crypto';
import { lstat, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createPublicClient, createWalletClient, http, type Hex } from '../apps/api/node_modules/viem';
import { generatePrivateKey, privateKeyToAccount } from '../apps/api/node_modules/viem/accounts';
import { foundry } from '../apps/api/node_modules/viem/chains';
import { createApp } from '../apps/api/src/app';
import { FileAuditStore } from '../apps/api/src/store';
import { FileCaseWorkStore, writeCaseWorkState } from '../apps/api/src/case-work-file';
import { loadReviewerAssurance } from '../apps/api/src/reviewer-directory';
import { issueReviewerToken } from '../apps/api/src/reviewer-auth';
import { investigationDigest } from '../packages/shared/src/investigation-dossier';
import { InvestigationDecision, verifyInvestigationDecision } from '../packages/shared/src/investigation-decision';
import { registryInvestigationId } from '../apps/api/src/chain';

// This pinned digest comes from the prior authenticated DEMO browser export,
// not from the input file being checked. No new human identity is asserted.
const TRUSTED = process.env.METHANE_RETAINED_TRUSTED_DIGEST || '0x24d360507d8b6e4bfc6354863233ec661e894a4c6aba41311cc0fa04c31b6e1e';
const FIXTURE = process.env.METHANE_RETAINED_EXPORT_PATH || 'docs/evidence/r12-recovery-2026-10-21/frozen-investigation-decision.json';

test('retained TKM decision: scoped API anchor, tamper rejection, revocation and restored local chain', async () => {
  // Fail closed if run outside the isolated wrapper. Never use an inherited RPC/key.
  if (process.env.METHANE_RETAINED_CHAIN_TEST !== 'disposable-loopback-only'
    || process.env.SEPOLIA_RPC_URL || process.env.SEPOLIA_PRIVATE_KEY || process.env.LOCAL_CHAIN_RPC_URL
    || process.env.LOCAL_CHAIN_PRIVATE_KEY || process.env.AI_API_KEY) throw Error('Use scripts/run-retained-decision-proof.ts');
  const input = await lstat(FIXTURE);
  expect(input.isFile() && input.size <= 16*1024*1024).toBe(true);
  expect(TRUSTED).toMatch(/^0x[a-f0-9]{64}$/);
  const bytes = await readFile(FIXTURE);
  const decision = InvestigationDecision.parse(JSON.parse(bytes.toString()).decision);
  expect(await verifyInvestigationDecision(decision, TRUSTED)).toBe(true);
  expect(decision.dossier.context.sourceId).toBe('TKM_S_021');
  expect(decision.reviewerId).toBe('connected-demo-mitigation');
  expect(decision.dossier.history.at(-1)!.claimType).toBe('mitigation_confirmed');
  expect(decision.dossier.history.at(-1)!.scope).toEqual({ startDate:'2020-10-29', endDate:'2026-09-13' });
  const names = ['CHAIN_NETWORK','LOCAL_CHAIN_RPC_URL','LOCAL_REGISTRY_ADDRESS','LOCAL_CHAIN_PRIVATE_KEY','ENABLE_CHAIN_WRITES','CHAIN_CONFIRMATIONS','REVIEWER_AUTH_SECRET','REVIEWER_DIRECTORY_PATH','REQUIRE_ATTESTED_HUMAN_REVIEWERS'];
  const previous = names.map(name => process.env[name]);
  const dir = await mkdtemp(join(tmpdir(), 'methane-retained-chain-'));
  const probe = Bun.serve({ hostname:'127.0.0.1', port:0, fetch:() => new Response('probe') });
  const port = probe.port!; probe.stop(true);
  const rpc = `http://127.0.0.1:${port}`;
  const anvilRpc = async (method:'anvil_setBalance'|'anvil_dumpState'|'anvil_loadState',params:unknown[]) => {
    const response = await fetch(rpc,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
    const payload = await response.json() as {result?:unknown;error?:unknown};
    if(!response.ok || payload.error) throw Error('Disposable Anvil RPC failed');
    return payload.result;
  };
  let anvil: ReturnType<typeof Bun.spawn> | undefined;
  const startChain = async () => {
    anvil = Bun.spawn(['anvil','--host','127.0.0.1','--port',String(port),'--chain-id','31337','--silent'], { stdout:'ignore',stderr:'ignore' });
    const reader = createPublicClient({ chain:foundry, transport:http(rpc,{ retryCount:0,timeout:1000 }) });
    for (let n=0;n<100;n++) {
      try { if (await reader.getChainId() === 31337) return reader; } catch {}
      await Bun.sleep(100);
    }
    throw Error('Disposable Anvil did not start');
  };
  try {
    let reader = await startChain();
    const build = Bun.spawnSync(['forge','build','--quiet'],{cwd:resolve('contracts'),stdout:'pipe',stderr:'pipe'});
    expect(build.exitCode).toBe(0);
    const artifact = JSON.parse(await readFile('contracts/out/EvidenceRegistry.sol/EvidenceRegistry.json','utf8'));
    const secret = generatePrivateKey(), account = privateKeyToAccount(secret);
    await anvilRpc('anvil_setBalance',[account.address,'0x8ac7230489e80000']);
    expect(await reader.getBalance({address:account.address})).toBe(10_000_000_000_000_000_000n);
    const wallet = createWalletClient({ account, chain:foundry,transport:http(rpc) });
    const deployment = await reader.waitForTransactionReceipt({hash:await wallet.deployContract({abi:artifact.abi,bytecode:artifact.bytecode.object as Hex})});
    const registry = deployment.contractAddress!;
    const directoryPath = join(dir,'reviewers.json');
    const entry = {reviewerId:decision.reviewerId,organization:'DEMO software fixture only',checkedBy:'DEMO-local-fixture-operator',
      checkedAt:new Date(Date.now()-60_000).toISOString(),expiresAt:new Date(Date.now()+3_600_000).toISOString(),
      verificationReference:'DEMO local test enrollment. No human identity or expertise verified.',claimTypes:['source_detected','mitigation_confirmed'],disabled:false};
    const writeDirectory = (disabled=false) => writeFile(directoryPath,JSON.stringify({schemaVersion:1,reviewers:[{...entry,disabled}]}),{mode:0o600});
    await writeDirectory();
    Object.assign(process.env,{CHAIN_NETWORK:'local',LOCAL_CHAIN_RPC_URL:rpc,LOCAL_REGISTRY_ADDRESS:registry,LOCAL_CHAIN_PRIVATE_KEY:secret,
      ENABLE_CHAIN_WRITES:'true',CHAIN_CONFIRMATIONS:'1',REVIEWER_AUTH_SECRET:randomBytes(48).toString('hex'),REVIEWER_DIRECTORY_PATH:directoryPath,REQUIRE_ATTESTED_HUMAN_REVIEWERS:'true'});
    const storePath = join(dir,'audits.json'), workPath = join(dir,'work.json');
    await writeCaseWorkState(workPath,{schemaVersion:1,histories:[decision.dossier.history]});
    const store = new FileAuditStore(storePath);
    // Explicit test-only restore of an already verified revision. This is not a
    // public import endpoint or a replacement for the earlier browser review.
    await store.saveInvestigationDecision(decision,null,async () =>
      (await loadReviewerAssurance(decision.reviewerId,'mitigation_confirmed')).status === 'operator_attested');
    let app = createApp(store,undefined,{}, {caseWorkStore:new FileCaseWorkStore(workPath)});
    const context = decision.dossier.context;
    const query = new URLSearchParams({...context,synthetic:String(context.synthetic)});
    const base = `/api/case-work/${decision.dossier.workId}/decisions/${TRUSTED}`;
    const token = (scopes: Array<'private_read'|'review'|'anchor'>) => issueReviewerToken(process.env.REVIEWER_AUTH_SECRET!,decision.reviewerId,scopes,600);
    const headers = {authorization:`Bearer ${token(['private_read','review','anchor'])}`,'content-type':'application/json'};
    const target = {chainId:31337,registryAddress:registry,issuer:account.address};
    const post = (action:string,h:Record<string,string>=headers) => app.request(`${base}/${action}?${query}`,{method:'POST',headers:h,...(action==='anchor'?{body:JSON.stringify(target)}:{})});
    const noAuth = await post('anchor',{}); expect(noAuth.status).toBe(401);
    const noScope = await post('anchor',{...headers,authorization:`Bearer ${token(['private_read','review'])}`}); expect(noScope.status).toBe(403);
    await writeDirectory(true);
    const revoked = await post('anchor'); expect(revoked.status).toBe(403);
    expect(await reader.getTransactionCount({address:account.address})).toBe(1); // deployment only
    await writeDirectory();
    const anchor = await post('anchor'); expect([200,202]).toContain(anchor.status);
    const intent = await store.getDecisionAnchorIntent(TRUSTED); expect(intent).toBeDefined();
    await reader.waitForTransactionReceipt({hash:intent!.txHash as Hex,confirmations:1});
    expect((await post('reconcile')).status).toBe(200);
    const response = await post('verify'); expect(response.status).toBe(200);
    const record = await response.json(); expect(record.chainStatus).toBe('verified_latest');
    expect(record.decision).toEqual(decision);
    expect(record.registryKey).toBe(registryInvestigationId(context,decision.dossier.workId));
    expect((await post('anchor')).status).toBe(409);
    expect(await reader.getTransactionCount({address:account.address})).toBe(2);
    const file = join(dir,'decision.json');
    const verify = (expected=TRUSTED) => {
      const result = Bun.spawnSync([process.execPath,'--no-env-file','scripts/verify-investigation-decision.ts',file,'--expected-digest',expected,'--require-chain'],{
        cwd:process.cwd(),env:{PATH:process.env.PATH,TMPDIR:dir,CHAIN_NETWORK:'local',LOCAL_CHAIN_RPC_URL:rpc,LOCAL_REGISTRY_ADDRESS:registry,CHAIN_CONFIRMATIONS:'1',ENABLE_CHAIN_WRITES:'false'},stdout:'pipe',stderr:'pipe'});
      return {exitCode:result.exitCode,stdout:result.stdout.toString().trim(),stderr:result.stderr.toString().trim()};
    };
    await writeFile(file,JSON.stringify(record));
    const original = verify(); expect(original.exitCode).toBe(0);
    const changed = structuredClone(decision); changed.rationale = 'DEMO manipulated rationale after anchoring; physical mitigation is not established.';
    const {digest:discarded,...payload} = changed; changed.digest = await investigationDigest(payload);
    await writeFile(file,JSON.stringify({...record,decision:changed}));
    const alteredTrusted = verify(); expect(alteredTrusted.exitCode).toBe(1);
    const alteredRehashed = verify(changed.digest); expect(alteredRehashed.exitCode).toBe(1);
    await writeFile(file,JSON.stringify(record));
    const originalAgain = verify(); expect(originalAgain.exitCode).toBe(0);
    const forged = {...record,receipt:{...record.receipt,issuer:registry}};
    await writeFile(file,JSON.stringify(forged)); const forgedReceipt = verify(); expect(forgedReceipt.exitCode).toBe(1);
    await writeFile(file,JSON.stringify(record));
    // Exercise process and ledger restoration, not just a second in-memory read.
    const state = await anvilRpc('anvil_dumpState',[]);
    expect(typeof state).toBe('string');
    anvil!.kill(); await anvil!.exited;
    reader = await startChain();
    expect(await anvilRpc('anvil_loadState',[state])).toBe(true);
    app = createApp(new FileAuditStore(storePath),undefined,{}, {caseWorkStore:new FileCaseWorkStore(workPath)});
    const afterRestart = verify(); expect(afterRestart.exitCode).toBe(0);
    const reopened = await post('verify'); expect(reopened.status).toBe(200);
    expect((await reopened.json()).decision).toEqual(decision);
    await writeDirectory(true);
    const revokedAfterRestart = await post('verify'); expect(revokedAfterRestart.status).toBe(403);
    expect(await readFile(FIXTURE)).toEqual(bytes);
    const proof = {kind:'local-software-conformance-not-agent-evaluation',recordedAt:new Date().toISOString(),chain:'Anvil local chain',chainId:31337,
      sourceId:context.sourceId,dataset:context,claimType:'mitigation_confirmed',scope:decision.dossier.history.at(-1)!.scope,
      inputSha256:createHash('sha256').update(bytes).digest('hex'),trustedDigest:TRUSTED,reviewer:'DEMO software fixture; not a human expert',
      record,checks:{noAuth:noAuth.status,noAnchorScope:noScope.status,revoked:revoked.status,duplicateAnchor:409,original,alteredTrusted,alteredRehashed,originalAgain,forgedReceipt,afterRestart,revokedAfterRestart:revokedAfterRestart.status},
      unchangedDecision:true,publicNetworkUsed:false,providerCalls:0,physicalOutcomeEstablished:false,
      limitation:'The browser-reviewed DEMO decision was explicitly restored into isolated file storage. This proves local API authorization and on-chain integrity, not a fresh human review, public-chain deployment, physical repair or practical usefulness.'};
    if (process.env.METHANE_RETAINED_CHAIN_EVIDENCE) {
      await writeFile(process.env.METHANE_RETAINED_CHAIN_EVIDENCE,JSON.stringify(proof,null,2)+'\n',{mode:0o600,flag:'wx'});
      // Ledger state contains public transactions/storage only, no generated
      // signing key or reviewer token. It permits future read-only local replay.
      await writeFile(process.env.METHANE_RETAINED_CHAIN_EVIDENCE+'.anvil-state.json',JSON.stringify({label:'DEMO local Anvil state; no public chain',chainId:31337,registryAddress:registry,state})+'\n',{mode:0o600,flag:'wx'});
    }
  } finally {
    if (anvil) { anvil.kill(); await anvil.exited; }
    names.forEach((name,index) => {if(previous[index]===undefined) delete process.env[name];else process.env[name]=previous[index];});
    await rm(dir,{recursive:true,force:true});
  }
},120_000);
