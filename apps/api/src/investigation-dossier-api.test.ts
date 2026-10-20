import { afterAll, beforeAll, expect, test } from 'bun:test';
import { createApp } from './app';
import { MemoryAuditStore } from './store';
import { issueReviewerToken } from './reviewer-auth';
import { getIntelligenceSnapshot } from './intelligence-data';
import { MemoryCaseWorkStore } from './case-work';
import { MemoryPlanStore } from './plan-store';
import { InvestigationExportBudget, InvestigationExportLimitError, loadInvestigationMaterials } from './investigation-dossier';

const oldSecret = process.env.REVIEWER_AUTH_SECRET;
const sourceId = 'TKM_S_021';
let api: ReturnType<typeof createApp>, headers: Record<string,string>, context: any, planLink: any;
const scope = { startDate: '2020-10-29', endDate: '2026-09-13' };
const draft = { status: 'awaiting_evidence', question: 'Inspect historical source detection and request source-specific follow-up.', notes: 'DEMO reviewer software test using real historical records.', evidenceRequest: 'Obtain the attributable follow-up measurement.', acceptanceCriteria: 'Identify the source, action date, measurement date, method and uncertainty.', nextAction: 'Inspect source-linked documents.', claimType: 'source_detected', scope };
const query = () => new URLSearchParams({ ...context, synthetic: 'false' }).toString();
const put = (id: string, value: unknown, h = headers) => api.request(`/api/case-work/${id}`, { method: 'PUT', headers: h, body: JSON.stringify(value) });

beforeAll(async () => {
  process.env.REVIEWER_AUTH_SECRET = 'DEMO-connected-investigation-' + 'x'.repeat(40);
  headers = { authorization: `Bearer ${issueReviewerToken(process.env.REVIEWER_AUTH_SECRET, 'dossier-reviewer', ['private_read','review'], 600)}`, 'content-type': 'application/json' };
  api = createApp(new MemoryAuditStore(), undefined, { loadReviewerAssurance: async id => ({ status: id === 'dossier-reviewer' ? 'operator_attested' : 'outside_authority' } as any) });
  const snapshot = await getIntelligenceSnapshot();
  context = { sourceId, synthetic: false, datasetSnapshotId: snapshot.datasetSnapshotId, archiveSha256: snapshot.upstreamArchiveSha256 };
  const request = { datasetSnapshotId: snapshot.datasetSnapshotId, inputFileSha256: snapshot.inputFileSha256, parameters: { capacity: 10, maxPerCountry: 2, recurrenceWeight: 50, countries: [], sectors: [] } };
  const report = await (await api.request('/api/investigations/portfolios', { method: 'POST', headers, body: JSON.stringify(request) })).json();
  expect(report.portfolios[0].selectedIds).toContain(sourceId);
  const response = await api.request('/api/investigation-plans/DEMO-linked-plan', { method: 'PUT', headers, body: JSON.stringify({ request, reportDigest: report.digest, strategy: 'weighted', decision: 'accept', rationale: 'DEMO software reviewer accepts this allocation for document investigation.', expectedRevision: 0, expectedHead: null }) });
  expect(response.status).toBe(201);
  const journal = await response.json(), revision = journal.revisions[0];
  planLink = { planId: journal.planId, revision: 1, revisionHash: revision.hash, reportDigest: report.digest, strategy: 'weighted' };
});
afterAll(() => { if (oldSecret === undefined) delete process.env.REVIEWER_AUTH_SECRET; else process.env.REVIEWER_AUTH_SECRET = oldSecret; });

test('casework accepts an exact approved allocation and rejects forged or unselected links', async () => {
  for (const bad of [{ ...planLink, planId: 'missing' }, { ...planLink, revision: 2 }, { ...planLink, revisionHash: '0x'+'f'.repeat(64) }, { ...planLink, reportDigest: '0x'+'f'.repeat(64) }, { ...planLink, strategy: 'breadth' }]) {
    expect((await put('DEMO-invalid', { context, expectedRevision: 0, draft: { ...draft, planLink: bad } })).status).toBe(422);
  }
  const other = { ...context, sourceId: 'KAZ_S_159' };
  expect((await put('DEMO-unselected', { context: other, expectedRevision: 0, draft: { ...draft, planLink } })).status).toBe(422);
  expect((await put('DEMO-valid-link', { context, expectedRevision: 0, draft: { ...draft, planLink } })).status).toBe(201);
});

test('private dossier exports the connected plan, assessment and immutable work revisions', async () => {
  const auditResponse = await api.request('/api/audits', { method: 'POST', headers, body: JSON.stringify({ sourceId, claimType: 'source_detected', scope, datasetSnapshotId: context.datasetSnapshotId }) });
  expect(auditResponse.status).toBe(201); const audit = await auditResponse.json();
  const first = await put('DEMO-dossier', { context, expectedRevision: 0, draft: { ...draft, planLink } }); expect(first.status).toBe(201);
  const second = await put('DEMO-dossier', { context, expectedRevision: 1, draft: { ...draft, planLink, assessmentLink: { auditId: audit.auditId, bundleHash: audit.bundleHash }, nextAction: 'Review the linked assessment and obtain follow-up evidence.' } }); expect(second.status).toBe(200);
  const path = `/api/case-work/DEMO-dossier/dossier?${query()}`;
  expect((await api.request(path)).status).toBe(401);
  const response = await api.request(path, { headers: { ...headers, origin: process.env.WEB_ORIGIN || 'http://localhost:5173' } }); expect(response.status).toBe(200);
  expect(response.headers.get('access-control-expose-headers')?.toLowerCase()).toContain('x-investigation-digest');
  expect(response.headers.get('cache-control')).toContain('no-store');
  const value = await response.json();
  expect(value.history).toHaveLength(2); expect(value.history[0].nextAction).toBe(draft.nextAction);
  expect(value.plans).toHaveLength(1); expect(value.assessments).toHaveLength(1);
  expect(value.assessments[0].bundle.auditId).toBe(audit.auditId);
  expect(value.history[1].acceptanceCriteria).toBe(draft.acceptanceCriteria);
  expect(value.digest).toBe(response.headers.get('x-investigation-digest'));
  expect(value.physicalOutcomeEstablished).toBe(false);
  const readOnly = { authorization: `Bearer ${issueReviewerToken(process.env.REVIEWER_AUTH_SECRET!, 'dossier-reviewer', ['private_read'], 600)}` };
  expect((await api.request(path, { headers: readOnly })).status).toBe(200);
});

test('change check binds the saved revision and exact real snapshot transition before attaching', async () => {
  expect((await put('DEMO-changes', { context, expectedRevision: 0, draft: { ...draft, planLink } })).status).toBe(201);
  const path = `/api/case-work/DEMO-changes/change-check?${query()}`;
  const check = (expectedRevision: number) => api.request(path, { method: 'POST', headers, body: JSON.stringify({ expectedRevision }) });
  expect((await check(2)).status).toBe(409);
  const response = await check(1); expect(response.status).toBe(200);
  const value = await response.json();
  expect(value.workRevision).toBe(1); expect(value.sourceId).toBe(sourceId);
  expect(value.signal.state).toBe('review_recommended');
  expect(value.signal.metadataFields).toContain('persistency');
  expect(value.signal.observationIds).toEqual([]);
  const digest = value.changeReportDigest;
  expect((await put('DEMO-changes', { context, expectedRevision: 1, draft: { ...draft, planLink, changeReportDigest: '0x'+'f'.repeat(64) } })).status).toBe(422);
  expect((await put('DEMO-changes', { context, expectedRevision: 1, draft: { ...draft, planLink, changeReportDigest: digest } })).status).toBe(200);
  const exported = await api.request(`/api/case-work/DEMO-changes/dossier?${query()}`, { headers }); expect(exported.status).toBe(200);
  expect((await exported.json()).transitions).toHaveLength(1);
});

test('restricted public preview refuses dossier and change checks', async () => {
  const preview = createApp(new MemoryAuditStore(), undefined, {}, { publicBaselinePreview: true });
  expect((await preview.request(`/api/case-work/DEMO/dossier?${query()}`, { headers })).status).toBe(403);
  expect((await preview.request(`/api/case-work/DEMO/change-check?${query()}`, { method: 'POST', headers, body: '{"expectedRevision":1}' })).status).toBe(403);
});

test('export budgets count UTF-8, escaping and cumulative materials before replay', async () => {
  const value = { text: 'DEMO\n"é😀', array: [null, 1, true], omitted: undefined };
  const size = Buffer.byteLength(JSON.stringify(value));
  expect(() => new InvestigationExportBudget(size).consume(value)).not.toThrow();
  expect(() => new InvestigationExportBudget(size - 1).consume(value)).toThrow(InvestigationExportLimitError);
  let loaded = 0;
  const planStore = new MemoryPlanStore();
  planStore.get = async (_id, inspect) => { loaded++; inspect!({ oversized: 'x'.repeat(2048) } as any); throw new Error('Replay must not run'); };
  await expect(loadInvestigationMaterials(context, [{ ...draft, planLink } as any], { planStore, auditStore: new MemoryAuditStore(), transition: async () => { throw new Error('Must not load'); } }, new InvestigationExportBudget(1500))).rejects.toBeInstanceOf(InvestigationExportLimitError);
  expect(loaded).toBe(1);
});

test('private export authority is checked again before response and failures do not disclose notes', async () => {
  for (const action of ['dossier','change-check']) {
    const workStore = new MemoryCaseWorkStore();
    await workStore.save(context, 'DEMO-revocation', draft as any, 0, 'dossier-reviewer');
    let checks = 0;
    const guarded = createApp(new MemoryAuditStore(), undefined, { loadReviewerAssurance: async () => ({ status: ++checks === 1 ? 'operator_attested' : 'revoked' } as any) }, { caseWorkStore: workStore });
    const response = await guarded.request(`/api/case-work/DEMO-revocation/${action}?${query()}`, { method: action === 'dossier' ? 'GET' : 'POST', headers, ...(action === 'dossier' ? {} : { body: '{"expectedRevision":1}' }) });
    expect(response.status).toBe(403); expect(response.headers.get('x-investigation-digest')).toBeNull(); expect(await response.text()).not.toContain(draft.notes);
    expect((await workStore.history(context, 'DEMO-revocation'))).toHaveLength(1);
  }
});

test('exports bound concurrent work and release slots after completion', async () => {
  const workStore = new MemoryCaseWorkStore(); await workStore.save(context, 'DEMO-capacity', draft as any, 0, 'dossier-reviewer');
  const history = workStore.history.bind(workStore); let active = 0, released = false, started!: () => void, release!: () => void;
  const bothStarted = new Promise<void>(done => { started = done; }), gate = new Promise<void>(done => { release = done; });
  workStore.history = async (...args) => { if (!released) { if (++active === 2) started(); await gate; } return history(...args); };
  const bounded = createApp(new MemoryAuditStore(), undefined, { loadReviewerAssurance: async () => ({ status: 'operator_attested' } as any) }, { caseWorkStore: workStore });
  const path = `/api/case-work/DEMO-capacity/dossier?${query()}`, get = () => bounded.request(path, { headers });
  const first = get(), second = get(); await bothStarted;
  try { const busy = await get(); expect(busy.status).toBe(429); expect(busy.headers.get('retry-after')).toBe('2'); }
  finally { released = true; release(); }
  expect((await first).status).toBe(200); expect((await second).status).toBe(200); expect((await get()).status).toBe(200);
});

test('historical checks reject oversized/unknown inputs and share a bounded request quota', async () => {
  const workStore = new MemoryCaseWorkStore(); await workStore.save(context, 'DEMO-quota', draft as any, 0, 'dossier-reviewer');
  const bounded = createApp(new MemoryAuditStore(), undefined, { loadReviewerAssurance: async () => ({ status: 'operator_attested' } as any) }, { caseWorkStore: workStore });
  const path = `/api/case-work/DEMO-quota/change-check?${query()}`, post = (body: string) => bounded.request(path, { method: 'POST', headers, body });
  expect((await post(JSON.stringify({ expectedRevision: 1, notes: 'x'.repeat(1100) }))).status).toBe(413);
  expect((await post('{"expectedRevision":1,"extra":true}')).status).toBe(400);
  for (let i = 0; i < 18; i++) expect((await post('{"expectedRevision":2}')).status).toBe(409);
  const limited = await post('{"expectedRevision":1}'); expect(limited.status).toBe(429); expect(limited.headers.get('retry-after')).toBe('60');
});
