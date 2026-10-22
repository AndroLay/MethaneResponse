import { beforeAll, afterAll, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileAuditStore } from './store';
import { MemoryCaseWorkStore } from './case-work';
import { createApp } from './app';
import { issueReviewerToken } from './reviewer-auth';
import { getIntelligenceSnapshot } from './intelligence-data';
import { verifyInvestigationDecision } from '@methane/shared/investigation-decision';
let dir:string, context:any, headers:Record<string,string>, api:ReturnType<typeof createApp>, works:MemoryCaseWorkStore, store:FileAuditStore, draft:any;
const previous = process.env.REVIEWER_AUTH_SECRET;
const query = () => new URLSearchParams({...context,synthetic:'false'}).toString();
const base = () => `/api/case-work/DEMO-decision/decisions?${query()}`;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'methane-decision-api-')); process.env.REVIEWER_AUTH_SECRET = 'DEMO-decision-auth-'.padEnd(60,'x');
  headers = {authorization:`Bearer ${issueReviewerToken(process.env.REVIEWER_AUTH_SECRET,'DEMO-decision-reviewer',['private_read','review','anchor'],600)}`,'content-type':'application/json'};
  store = new FileAuditStore(`${dir}/audits.json`); works = new MemoryCaseWorkStore();
  api = createApp(store,undefined,{loadReviewerAssurance:async () => ({status:'operator_attested'} as any)},{caseWorkStore:works});
  const snapshot = await getIntelligenceSnapshot(); context = {sourceId:'KAZ_S_159',synthetic:false,datasetSnapshotId:snapshot.datasetSnapshotId,archiveSha256:snapshot.upstreamArchiveSha256};
  const scope = {startDate:'2024-06-07',endDate:'2024-06-07'};
  const response = await api.request('/api/audits',{method:'POST',headers,body:JSON.stringify({sourceId:context.sourceId,claimType:'source_detected',scope,datasetSnapshotId:context.datasetSnapshotId})});
  expect(response.status).toBe(201); const audit = await response.json();
  draft = {status:'review_recorded',question:'DEMO review historical source detection.',notes:'DEMO software reviewer, not a human pilot.',evidenceRequest:'',nextAction:'Request source-specific follow-up.',claimType:'source_detected',scope,assessmentLink:{auditId:audit.auditId,bundleHash:audit.bundleHash}};
  await works.save(context,'DEMO-decision',draft,0,'DEMO-decision-reviewer');
});
afterAll(async () => { if (previous === undefined) delete process.env.REVIEWER_AUTH_SECRET; else process.env.REVIEWER_AUTH_SECRET = previous; await rm(dir,{recursive:true,force:true}); });
test('frozen decisions require signed current review authority and exact saved dossier/head',async () => {
  expect((await api.request(base())).status).toBe(401);
  const readonly = {authorization:`Bearer ${issueReviewerToken(process.env.REVIEWER_AUTH_SECRET!,'DEMO-decision-reviewer',['private_read'],600)}`,'content-type':'application/json'};
  expect((await api.request(base(),{method:'POST',headers:readonly,body:'{}'})).status).toBe(403);
  const exported = await api.request(`/api/case-work/DEMO-decision/dossier?${query()}`,{headers}); const dossier = await exported.json();
  const input = {expectedRevision:1,expectedDossierDigest:dossier.digest,expectedDecisionDigest:null,disposition:'accept_assessment',rationale:'DEMO source detection coverage reviewed; this does not establish physical mitigation.',sourceInspected:true};
  const freeze = (body:any) => api.request(base(),{method:'POST',headers,body:JSON.stringify(body)});
  expect((await freeze({...input,expectedDossierDigest:'0x'+'f'.repeat(64)})).status).toBe(409);
  expect((await freeze({...input,sourceInspected:false})).status).toBe(400);
  const response = await freeze(input); expect(response.status).toBe(201); const {decision} = await response.json();
  expect(await verifyInvestigationDecision(decision,decision.digest)).toBe(true);
  expect(decision.dossier.context.sourceId).toBe('KAZ_S_159'); expect(decision.physicalOutcomeEstablished).toBe(false);
  expect((await freeze(input)).status).toBe(409);
  await works.save(context,'DEMO-decision',{...draft,notes:'DEMO later notes; the frozen dossier must not change.'},1,'DEMO-decision-reviewer');
  const downloaded = await api.request(`/api/case-work/DEMO-decision/decisions/${decision.digest}/verify?${query()}`,{method:'POST',headers}); expect(downloaded.status).toBe(200);
  const read = await downloaded.json(); expect(read.decision).toEqual(decision); expect(read.chainStatus).toBe('not_anchored'); expect(read.revisit.state).toBe('no_new_dependency_changes');
  const reopened = new FileAuditStore(store.path); expect((await reopened.listInvestigationDecisions(context,'DEMO-decision'))[0].decision).toEqual(decision);
  const list = await (await api.request(base(),{headers:readonly})).json(); expect(list.decisions).toHaveLength(1);
  const denied = await api.request(`/api/case-work/DEMO-decision/decisions/${decision.digest}/anchor?${query()}`,{method:'POST',headers:readonly,body:'{}'}); expect(denied.status).toBe(403);
  expect(await store.getDecisionAnchorIntent(decision.digest)).toBeUndefined();
});
test('public preview and revoked authority refuse frozen decision contents',async () => {
  const preview = createApp(store,undefined,{}, {publicBaselinePreview:true,caseWorkStore:works});
  expect((await preview.request(base(),{headers})).status).toBe(403);
  const revoked = createApp(store,undefined,{loadReviewerAssurance:async () => ({status:'revoked'} as any)},{caseWorkStore:works});
  const response = await revoked.request(base(),{headers}); expect(response.status).toBe(403); expect(await response.text()).not.toContain(draft.notes);
});

test('historical plan authority is retained after link removal and rechecked after transition loading',async () => {
  const {decisionFixture} = await import('./fixtures/investigation-decision');
  const decision = await decisionFixture(), ctx = decision.dossier.context, id = decision.dossier.workId;
  const isolatedStore = new FileAuditStore(`${dir}/privacy.json`), workStore = new MemoryCaseWorkStore();
  await isolatedStore.saveInvestigationDecision(decision,null,async () => true);
  const {CaseWorkDraft} = await import('@methane/shared');
  const original = CaseWorkDraft.parse(decision.dossier.history[0]);
  const historicalPlan = {planId:'DEMO-private-plan',revision:1,revisionHash:'0x'+'a'.repeat(64),reportDigest:'0x'+'b'.repeat(64),strategy:'weighted'} as const;
  await workStore.save(ctx,id,{...original,planLink:historicalPlan},0,'DEMO-decision-reviewer');
  await workStore.save(ctx,id,original,1,'DEMO-decision-reviewer');
  const q = new URLSearchParams({...ctx,synthetic:'true'}), route = `/api/case-work/${id}/decisions`;
  const scoped = createApp(isolatedStore,undefined,{loadReviewerAssurance:async (_actor,claim) => ({status:claim === 'mitigation_confirmed' ? 'operator_attested' : 'revoked'} as any)},{caseWorkStore:workStore});
  expect((await scoped.request(`${route}?${q}`,{headers})).status).toBe(403);
  const refused = await scoped.request(`${route}/${decision.digest}/verify?${q}`,{method:'POST',headers}); expect(refused.status).toBe(403); expect(refused.headers.get('x-investigation-digest')).toBeNull();
  let revoked = false;
  const delayed = createApp(isolatedStore,undefined,{loadReviewerAssurance:async () => ({status:revoked ? 'revoked' : 'operator_attested'} as any),getSnapshotTransition:async () => {revoked = true;throw new Error('DEMO revocation during transition load');}},{caseWorkStore:workStore});
  const afterAwait = await delayed.request(`${route}/${decision.digest}/verify?${q}`,{method:'POST',headers}); expect(afterAwait.status).toBe(403); expect(afterAwait.headers.get('x-investigation-digest')).toBeNull(); expect(await afterAwait.text()).not.toContain(decision.rationale);
});

test('terminal reverted decision reconciliation is idempotent and never broadcasts again',async () => {
  const {decisionFixture} = await import('./fixtures/investigation-decision');
  const decision = await decisionFixture(), ctx = decision.dossier.context, id = decision.dossier.workId;
  const isolatedStore = new FileAuditStore(`${dir}/reverted.json`), workStore = new MemoryCaseWorkStore();
  await isolatedStore.saveInvestigationDecision(decision,null,async () => true);
  const {CaseWorkDraft} = await import('@methane/shared'); await workStore.save(ctx,id,CaseWorkDraft.parse(decision.dossier.history[0]),0,'DEMO-decision-reviewer');
  await isolatedStore.reserveDecisionAnchor(decision.digest,'0x'+'b'.repeat(64),{operationId:crypto.randomUUID(),auditId:`investigation:${decision.digest}`,chainId:31337,registryAddress:'0x'+'a'.repeat(40),issuer:'0x'+'b'.repeat(40),txHash:'0x'+'c'.repeat(64),nonce:0,expectedVersion:1,confirmations:1},async () => true);
  await isolatedStore.finishDecisionAnchor(decision.digest,{status:'reverted'});
  let inspected = 0, broadcasts = 0;
  const terminal = createApp(isolatedStore,undefined,{loadReviewerAssurance:async () => ({status:'operator_attested'} as any),chainConfigured:() => true,inspectRegistryIntent:async () => {inspected++;throw new Error('Must not inspect known terminal state');},broadcastAnchor:async () => {broadcasts++;}},{caseWorkStore:workStore});
  const route = `/api/case-work/${id}/decisions/${decision.digest}/reconcile?${new URLSearchParams({...ctx,synthetic:'true'})}`;
  for (let i = 0;i < 2;i++) {const response = await terminal.request(route,{method:'POST',headers});expect(response.status).toBe(422);expect((await response.json()).status).toBe('reverted');}
  expect(inspected).toBe(0);expect(broadcasts).toBe(0);
});
