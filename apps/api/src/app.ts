import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { AuditInput, ClaimType, DEMO_SOURCES, HumanAssessmentInput, SharedWorkContext, SharedWorkId, SharedWorkInput, WithdrawalInput, transparencySummaryPayload, type TransparencyRecord, type EvidenceCheck, type AuditReceipt, type AuditResult, type ExternalEvidenceReference, type MarsProvenance, type ReviewSource } from '@methane/shared';
import { PublicationError, publicationState, type PublicationEvent } from './publication';
import { createAudit, type AuditMetadata } from './audit';
import { prepareAnchor, broadcastAnchor, inspectAnchorIntent, inspectRegistryIntent, chainTarget, chainConfigured, chainWriteConfigured, readReceipt, registryCaseId, verifyAnchorTransaction } from './chain';
import { findCaseBySourceId, listReviewSources, loadCasebook } from './casebook';
import { MemoryAuditStore, type AuditStore } from './store';
import { auditIntegrityValid } from './integrity';
import { aiConfigured as defaultAiConfigured, createDocumentAudit, DocumentAssessmentInput, HumanReviewInput, createReviewedAudit, requestModelAssessment } from './ai-review';
import { expandObservedFluxTrend, getIntelligenceSnapshot } from './intelligence-data';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createFixedWindowRateLimiter, createRateLimitClientKey, type FixedWindowRateLimitOptions, type RateLimitDecision, type RateLimitScope } from './rate-limit';
import { scopedReviewerAuthConfigured, verifyReviewerToken, type ReviewerScope } from './reviewer-auth';
import { decodeAuditCursor, DEFAULT_AUDIT_PAGE_SIZE, encodeAuditCursor, parseAuditPageLimit } from './audit-pagination';
import { auditIsPubliclyReadable } from './audit-visibility';
import { resolveScopedSource, ScopeError } from './scoped-source';
import { createHumanAssessment } from './human-assessment';
import { z } from 'zod';
import { checkEvidenceReference, EVIDENCE_PUBLISHER_HOSTS } from './evidence-check';
import { loadReviewerAssurance } from './reviewer-directory';
import { canonicalJson } from './canonical';
import { pageAuditRecords } from './audit-pagination';
import { CaseWorkError, MemoryCaseWorkStore, type CaseWorkStore } from './case-work';
import { isPublicPreviewAuditAllowed, PUBLIC_PREVIEW_SOURCE_IDS } from './public-preview';
import { buildDecisionPlan, decisionChallenges } from '@methane/shared/decision-lab';
import { buildObservationCheck, ObservationCheckRequest } from '@methane/shared/observation-claims';
import { getObservationSource } from './observation-archive';
import { buildInvestigationPortfolio, PlannerRequest } from '@methane/shared/investigation-planner';
import { getPlannerCatalog } from './investigation-planner-data';
import { PlanId, PlanSaveInput } from '@methane/shared/plan-journal';
import { MemoryPlanStore, PlanStoreError } from './plan-store';
import { getSnapshotTransition } from './snapshot-transition-data';
import { SnapshotTransitionRequest, transitionPage } from '@methane/shared/snapshot-transition';
import { buildInvestigationDossier, investigationReviewSignal } from '@methane/shared/investigation-dossier';
import { registerInvestigationDecisions } from './investigation-decision-routes';
import { buildEvidenceOverlapReport } from '@methane/shared/evidence-overlap';
import { InvestigationLinkError, InvestigationExportLimitError, MAX_INVESTIGATION_BYTES, loadInvestigationMaterials } from './investigation-dossier';

export type ApiBindings = { clientAddress?: string };
export type CreateAppOptions = { auditRateLimit?: FixedWindowRateLimitOptions; aiAssessmentRateLimit?: FixedWindowRateLimitOptions; caseWorkStore?: CaseWorkStore; planStore?: MemoryPlanStore; publicBaselinePreview?: boolean };

type CasebookAccess = {
  load: typeof loadCasebook;
  list: typeof listReviewSources;
  find: typeof findCaseBySourceId;
};

type AppServices = {
  checkEvidenceReference: typeof checkEvidenceReference;
  loadReviewerAssurance: typeof loadReviewerAssurance;
  aiConfigured: typeof defaultAiConfigured;
  requestModelAssessment: typeof requestModelAssessment;
  getIntelligenceSnapshot: typeof getIntelligenceSnapshot;
  getObservationSource: typeof getObservationSource;
  getSnapshotTransition: typeof getSnapshotTransition;
  chainTarget: typeof chainTarget;
  chainConfigured: typeof chainConfigured;
  chainWriteConfigured: typeof chainWriteConfigured;
  readReceipt: typeof readReceipt;
  prepareAnchor: typeof prepareAnchor;
  broadcastAnchor: typeof broadcastAnchor;
  inspectAnchorIntent: typeof inspectAnchorIntent;
  inspectRegistryIntent: typeof inspectRegistryIntent;
  verifyAnchorTransaction: typeof verifyAnchorTransaction;
};

const defaultServices: AppServices = {
  checkEvidenceReference,
  loadReviewerAssurance,
  aiConfigured: defaultAiConfigured,
  requestModelAssessment,
  getIntelligenceSnapshot,
  getObservationSource,
  getSnapshotTransition,
  chainTarget, chainConfigured,
  chainWriteConfigured,
  readReceipt,
  prepareAnchor, broadcastAnchor, inspectAnchorIntent, inspectRegistryIntent,
  verifyAnchorTransaction,
};

function bearerTokenMatches(header: string | undefined, token: string | undefined): boolean {
  if (!token || token.length < 32 || !header) return false;
  const expected = Buffer.from(`Bearer ${token}`);
  const supplied = Buffer.from(header);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

function configuredReviewerId(value: string | undefined): value is string {
  return Boolean(value && /^[a-zA-Z0-9._:@-]{3,96}$/.test(value));
}

function aiAccessConfigured(): boolean {
  const token = process.env.AI_REVIEW_TOKEN;
  return Boolean(token && token.length >= 32 && token !== process.env.ADMIN_API_TOKEN && token !== process.env.HUMAN_REVIEW_TOKEN);
}

function legacyReviewConfigured(): boolean {
  const token = process.env.HUMAN_REVIEW_TOKEN;
  return Boolean(token && token.length >= 32 && token !== process.env.ADMIN_API_TOKEN && token !== process.env.AI_REVIEW_TOKEN && configuredReviewerId(process.env.HUMAN_REVIEWER_ID));
}

function humanReviewConfigured(): boolean {
  return scopedReviewerAuthConfigured(process.env.REVIEWER_AUTH_SECRET)
    || (legacyReviewConfigured() && (process.env.NODE_ENV !== 'production' || process.env.ALLOW_LEGACY_SHARED_REVIEWER_TOKEN === 'true'));
}

function reviewerIdentity(header: string | undefined, scope: ReviewerScope) {
  const scoped = verifyReviewerToken(header, process.env.REVIEWER_AUTH_SECRET, scope);
  if (scoped) return scoped;
  const legacyScopes: ReviewerScope[] = ['private_read', 'review'];
  if (legacyScopes.includes(scope) && legacyReviewConfigured()
    && (process.env.NODE_ENV !== 'production' || process.env.ALLOW_LEGACY_SHARED_REVIEWER_TOKEN === 'true')
    && bearerTokenMatches(header, process.env.HUMAN_REVIEW_TOKEN)) {
    return { reviewerId: process.env.HUMAN_REVIEWER_ID!, scopes: legacyScopes };
  }
  return null;
}

function varyByAuthorization(c: Context<{ Bindings: ApiBindings }>) {
  const values = new Set((c.res.headers.get('Vary') || '').split(',').map((value) => value.trim()).filter(Boolean));
  if (![...values].some((value) => value.toLowerCase() === 'authorization')) values.add('Authorization');
  c.header('Vary', [...values].join(', '));
}

function preventPrivateResponseCaching(c: Context<{ Bindings: ApiBindings }>) {
  c.header('Cache-Control', 'no-store');
  varyByAuthorization(c);
}

type BoundedJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; status: 400 | 413; error: string };

async function readBoundedJson(request: Request, maxBytes: number): Promise<BoundedJsonResult> {
  const contentLength = request.headers.get('content-length');
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) {
      await request.body?.cancel().catch(() => undefined);
      return { ok: false, status: 400, error: 'Invalid Content-Length' };
    }
    if (Number(contentLength) > maxBytes) {
      await request.body?.cancel().catch(() => undefined);
      return { ok: false, status: 413, error: 'Request body too large' };
    }
  }

  if (!request.body) return { ok: false, status: 400, error: 'Invalid JSON request' };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, status: 413, error: 'Request body too large' };
      }
      chunks.push(value);
    }
  } catch {
    await reader.cancel().catch(() => undefined);
    return { ok: false, status: 400, error: 'Unable to read request body' };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { ok: true, value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown };
  } catch {
    return { ok: false, status: 400, error: 'Invalid JSON request' };
  }
}

const defaultCasebookAccess: CasebookAccess = {
  load: loadCasebook,
  list: listReviewSources,
  find: findCaseBySourceId,
};

export function createApp(store: AuditStore, casebookAccess: CasebookAccess = defaultCasebookAccess, serviceOverrides: Partial<AppServices> = {}, options: CreateAppOptions = {}) {
  const services = { ...defaultServices, ...serviceOverrides };
  const directoryPermits = (status: Awaited<ReturnType<typeof loadReviewerAssurance>>['status']) =>
    !['revoked', 'outside_authority', 'directory_unavailable'].includes(status)
    && (process.env.REQUIRE_ATTESTED_HUMAN_REVIEWERS !== 'true' || status === 'operator_attested');
  async function anchorReviewerPermitted(reviewer: { reviewerId: string }, claim: ClaimType) {
    // Spending issuer funds requires a current operator attestation, even in compatibility mode.
    return (await services.loadReviewerAssurance(reviewer.reviewerId, claim)).status === 'operator_attested';
  }
  async function privateReadClaims(header: string | undefined) {
    const reviewer = reviewerIdentity(header, 'private_read');
    if (!reviewer) return new Set<ClaimType>();
    const decisions = await Promise.all(ClaimType.options.map(async claim => ({ claim, allowed: directoryPermits((await services.loadReviewerAssurance(reviewer.reviewerId, claim)).status) })));
    return new Set(decisions.filter(item => item.allowed).map(item => item.claim));
  }
  async function privateAuditReadAuthorized(header: string | undefined, claim: ClaimType) {
    const reviewer = reviewerIdentity(header, 'private_read');
    return Boolean(reviewer && directoryPermits((await services.loadReviewerAssurance(reviewer.reviewerId, claim)).status));
  }
  const app = new Hono<{ Bindings: ApiBindings }>();
  const caseWorkStore = options.caseWorkStore || new MemoryCaseWorkStore();
  const planStore = options.planStore || new MemoryPlanStore();
  const dossierLimiter = createFixedWindowRateLimiter({ limit: 20, windowMs: 60_000 });
  let dossierExportsInFlight = 0;
  const investigationResources = { planStore, auditStore: store, transition: async () => services.getSnapshotTransition(await services.getIntelligenceSnapshot()) };
  const rateLimitConfig = options.auditRateLimit || (options.publicBaselinePreview
    ? { limit: 6, windowMs: 60_000, maxEntries: 512 }
    : { limit: 20, windowMs: 60_000 });
  const auditRateLimiter = createFixedWindowRateLimiter(rateLimitConfig);
  const aiRateLimitConfig = options.aiAssessmentRateLimit || { limit: 6, windowMs: 60_000 };
  const aiAssessmentRateLimiter = createFixedWindowRateLimiter(aiRateLimitConfig);
  const decisionPlanRateLimitConfig = { limit: 20, windowMs: 60_000, maxEntries: 512 };
  const decisionPlanRateLimiter = createFixedWindowRateLimiter(decisionPlanRateLimitConfig);
  const observationCheckRateLimiter = createFixedWindowRateLimiter(decisionPlanRateLimitConfig);
  const allocationRateLimiter = createFixedWindowRateLimiter(decisionPlanRateLimitConfig);
  const snapshotTransitionRateLimiter = createFixedWindowRateLimiter(decisionPlanRateLimitConfig);
  const rateLimitSalt = randomBytes(32).toString('hex');
  const anchorStorageAvailable = Boolean(store.reserveAnchor && store.completeAnchor && store.getAnchorIntent && store.markAnchorReverted);
  const rateLimitStatus = { backend: 'process-local', shared: false, required: false, ready: true } as const;
  const consumeClientRateLimit = async (
    scope: RateLimitScope,
    address: string,
    identity: string,
    config: FixedWindowRateLimitOptions,
    localLimiter: ReturnType<typeof createFixedWindowRateLimiter>,
  ): Promise<RateLimitDecision> => {
    const key = createRateLimitClientKey(rateLimitSalt, scope, address, identity);
    return localLimiter.consume(key);
  };
  const anchoringInFlight = new Set<string>();
  app.use('/api/*', cors({ origin: process.env.WEB_ORIGIN || 'http://localhost:5173', exposeHeaders: ['X-Investigation-Digest'] }));

  // Shared team state always requires a signed identity AND current directory
  // authority. Legacy shared tokens and permissive audit-review flags do not apply.
  const teamIdentity = (c: Context<{ Bindings: ApiBindings }>) => verifyReviewerToken(c.req.header('authorization'), process.env.REVIEWER_AUTH_SECRET, 'private_read');
  const teamAllowed = async (id: string, claim: ClaimType) => (await services.loadReviewerAssurance(id, claim)).status === 'operator_attested';
  const teamClaims = async (id: string) => new Set((await Promise.all(ClaimType.options.map(async claim => await teamAllowed(id, claim) ? claim : null))).filter((claim): claim is ClaimType => claim !== null));
  function teamQuery(c: Context<{ Bindings: ApiBindings }>, requireSource = true) {
    const synthetic = c.req.query('synthetic');
    if (synthetic !== 'true' && synthetic !== 'false') return null;
    const parsed = SharedWorkContext.safeParse({ sourceId: c.req.query('sourceId') || (requireSource ? '' : '_all'), synthetic: synthetic === 'true', datasetSnapshotId: c.req.query('datasetSnapshotId'), ...(c.req.query('archiveSha256') ? { archiveSha256: c.req.query('archiveSha256') } : {}) });
    if (!parsed.success) return null;
    return parsed.data;
  }
  const teamStorageError = (c: Context<{ Bindings: ApiBindings }>, error: unknown) => error instanceof CaseWorkError && error.code === 'conflict'
    ? c.json({ error: 'This investigation changed. Load and compare the latest revision; your draft must be retained.', code: 'conflict' }, 409)
    : error instanceof CaseWorkError && error.code === 'capacity'
      ? c.json({ error: 'Shared casework capacity reached. Existing history is retained.', code: 'capacity' }, 413)
      : c.json({ error: 'Shared casework storage is unavailable. Inspect the latest revision before retrying.', code: 'unavailable' }, 503);

  app.get('/api/case-work/session', async (c) => {
    preventPrivateResponseCaching(c);
    const identity = teamIdentity(c);
    if (!identity) return c.json({ error: 'A signed private-read reviewer token is required' }, 401);
    const claims = [...await teamClaims(identity.reviewerId)];
    if (!claims.length) return c.json({ error: 'No current team directory authority' }, 403);
    return c.json({ reviewerId: identity.reviewerId, claimTypes: claims, canWrite: identity.scopes.includes('review'), storage: await caseWorkStore.status() });
  });
  app.get('/api/case-work', async (c) => {
    preventPrivateResponseCaching(c);
    const identity = teamIdentity(c);
    if (!identity) return c.json({ error: 'Signed team access is required' }, 401);
    const context = teamQuery(c, false);
    if (!context) return c.json({ error: 'A pinned dataset context is required' }, 400);
    try {
      const claims = await teamClaims(identity.reviewerId);
      const works = await caseWorkStore.list({ ...context, sourceId: c.req.query('sourceId') || undefined }, claims);
      const stillAllowed = await teamClaims(identity.reviewerId);
      return c.json({ works: works.filter(item => stillAllowed.has(item.claimType)) });
    } catch (error) { return teamStorageError(c, error); }
  });
  app.get('/api/case-work/:id', async (c) => {
    preventPrivateResponseCaching(c);
    const identity = teamIdentity(c);
    if (!identity) return c.json({ error: 'Signed team access is required' }, 401);
    const context = teamQuery(c);
    if (!context || !SharedWorkId.safeParse(c.req.param('id')).success) return c.json({ error: 'Invalid work context or ID' }, 400);
    try {
      const history = await caseWorkStore.history(context, c.req.param('id'));
      const work = history[history.length - 1];
      if (!work || !await teamAllowed(identity.reviewerId, work.claimType)) return c.json({ error: 'Investigation not found' }, 404);
      return c.json({ work, history });
    } catch (error) { return teamStorageError(c, error); }
  });
  app.put('/api/case-work/:id', async (c) => {
    preventPrivateResponseCaching(c);
    const identity = teamIdentity(c);
    if (!identity) return c.json({ error: 'Signed team access is required' }, 401);
    if (!identity.scopes.includes('review')) return c.json({ error: 'Both private_read and review scopes are required' }, 403);
    const body = await readBoundedJson(c.req.raw, 16_384);
    if (!body.ok) return c.json({ error: body.error }, body.status);
    const parsed = SharedWorkInput.safeParse(body.value);
    if (!parsed.success || !SharedWorkId.safeParse(c.req.param('id')).success) return c.json({ error: 'Invalid shared casework input' }, 400);
    const { context, draft, expectedRevision } = parsed.data;
    if (!await teamAllowed(identity.reviewerId, draft.claimType)) return c.json({ error: 'No current authority for this claim type' }, 403);
    if (draft.assignee && !await teamAllowed(draft.assignee, draft.claimType)) return c.json({ error: 'Assignee is not currently authorized for this claim type' }, 422);
    try {
      const resolved = await resolveScopedSource({ sourceId: context.sourceId, claimType: draft.claimType, datasetSnapshotId: context.datasetSnapshotId, scope: draft.scope || { startDate: '1900-01-01', endDate: '9999-12-31' } }, services.getIntelligenceSnapshot, casebookAccess.find);
      if (resolved.source.synthetic !== context.synthetic || (!context.synthetic && resolved.metadata.provenance?.archiveSha256 !== context.archiveSha256) || (context.synthetic && context.archiveSha256)) return c.json({ error: 'Dataset provenance changed; reload the dataset' }, 409);
      if (draft.assessmentLink) {
        const audit = await store.get(draft.assessmentLink.auditId);
        if (!audit || audit.sourceId !== context.sourceId || audit.claimType !== draft.claimType || audit.synthetic !== context.synthetic || audit.bundleHash !== draft.assessmentLink.bundleHash
          || canonicalJson(audit.bundle.scope || null) !== canonicalJson(draft.scope || null)
          || (!context.synthetic && (audit.bundle.provenance?.snapshotId !== context.datasetSnapshotId || audit.bundle.provenance?.archiveSha256 !== context.archiveSha256))) return c.json({ error: 'Assessment link does not match this investigation' }, 422);
      }
      if (draft.planLink && !await teamAllowed(identity.reviewerId, 'source_detected')) return c.json({ error: 'Current source-investigation authority is required to link a private plan.' }, 403);
      await loadInvestigationMaterials(context, [draft], investigationResources);
      const work = await caseWorkStore.save(context, c.req.param('id'), draft, expectedRevision, identity.reviewerId, async () => {
        const fresh = teamIdentity(c);
        if (!fresh?.scopes.includes('review') || !await teamAllowed(fresh.reviewerId, draft.claimType) || (draft.assignee && !await teamAllowed(draft.assignee, draft.claimType))
          || draft.planLink && !await teamAllowed(fresh.reviewerId, 'source_detected')) throw new Error('Team authority changed before commit');
      });
      return c.json({ work }, expectedRevision === 0 ? 201 : 200);
    } catch (error) {
      if (error instanceof ScopeError) return c.json({ error: error.message }, error.status);
      if (error instanceof InvestigationLinkError) return c.json({ error: error.message }, 422);
      if (error instanceof InvestigationExportLimitError) return c.json({ error: error.message }, 413);
      return teamStorageError(c, error);
    }
  });

  app.get('/api/case-work/:id/evidence-overlap', async c => {
    preventPrivateResponseCaching(c);
    if (options.publicBaselinePreview) return c.json({ error: 'Private overlap checks are unavailable in public preview.' }, 403);
    const identity = teamIdentity(c);
    if (!identity) return c.json({ error: 'Signed private access is required.' }, 401);
    const context = teamQuery(c), revision = c.req.query('expectedRevision');
    if (!context || !SharedWorkId.safeParse(c.req.param('id')).success || !/^[1-9]\d{0,3}$/.test(revision || '')) return c.json({ error: 'Pinned context and saved revision are required.' }, 400);
    if (!(await consumeClientRateLimit('investigation_dossier', c.env?.clientAddress?.trim() || 'unknown', identity.reviewerId, { limit: 20, windowMs: 60_000 }, dossierLimiter)).allowed) return c.json({ error: 'Overlap checks are rate limited. Retry later.' }, 429);
    if (dossierExportsInFlight >= 2) return c.json({ error: 'Investigation comparisons are busy. Retry shortly.' }, 429);
    dossierExportsInFlight++;
    try {
      const work = (await caseWorkStore.history(context, c.req.param('id'))).at(-1);
      if (!work || !await teamAllowed(identity.reviewerId, work.claimType)) return c.json({ error: 'Investigation not found.' }, 404);
      if (work.revision !== Number(revision)) return c.json({ error: 'Investigation changed. Load its latest saved revision.' }, 409);
      const { sourceId: _, ...dataset } = context;
      const works = await caseWorkStore.list(dataset, await teamClaims(identity.reviewerId));
      const report = await buildEvidenceOverlapReport(work, works);
      const claims = await teamClaims(identity.reviewerId), fresh = teamIdentity(c);
      if (!fresh || fresh.reviewerId !== identity.reviewerId || !claims.has(work.claimType) || works.some(row => !claims.has(row.claimType))) return c.json({ error: 'Reviewer authority changed during comparison.' }, 403);
      const head = (await caseWorkStore.history(context, work.workId)).at(-1);
      if (head?.revision !== work.revision) return c.json({ error: 'Investigation changed during comparison. Retry with the latest revision.' }, 409);
      const finalClaims = await teamClaims(identity.reviewerId);
      if (!teamIdentity(c) || !finalClaims.has(work.claimType) || works.some(row=>!finalClaims.has(row.claimType))) return c.json({ error: 'Reviewer authority changed.' }, 403);
      return c.json(report);
    } catch (error) { return teamStorageError(c, error); }
    finally { dossierExportsInFlight--; }
  });

  for (const action of ['dossier', 'change-check'] as const) app.on(action === 'dossier' ? 'GET' : 'POST', `/api/case-work/:id/${action}`, async c => {
    preventPrivateResponseCaching(c);
    if (options.publicBaselinePreview) return c.json({ error: 'Private investigation exports and change checks are unavailable in public preview.' }, 403);
    const identity = teamIdentity(c);
    if (!identity) return c.json({ error: 'Signed team access is required.' }, 401);
    const context = teamQuery(c);
    if (!context || !SharedWorkId.safeParse(c.req.param('id')).success) return c.json({ error: 'Invalid investigation context or ID.' }, 400);
    const limit = await consumeClientRateLimit('investigation_dossier', c.env?.clientAddress?.trim() || 'unknown', identity.reviewerId, { limit: 20, windowMs: 60_000 }, dossierLimiter);
    if (!limit.allowed) { c.header('Retry-After', '60'); return c.json({ error: 'Too many investigation checks. Retry in one minute.' }, 429); }
    if (action === 'dossier' && dossierExportsInFlight >= 2) { c.header('Retry-After', '2'); return c.json({ error: 'Investigation exports are busy. Retry shortly; saved revisions are retained.' }, 429); }
    if (action === 'dossier') dossierExportsInFlight++;
    try {
      const history = await caseWorkStore.history(context, c.req.param('id')), work = history.at(-1);
      if (!work || !await teamAllowed(identity.reviewerId, work.claimType)) return c.json({ error: 'Investigation not found.' }, 404);
      if (history.some(row => row.planLink) && !await teamAllowed(identity.reviewerId, 'source_detected')) return c.json({ error: 'Current source-investigation authority is required to inspect linked plans.' }, 403);
      let value: unknown, exportedDigest: string | undefined;
      if (action === 'change-check') {
        const body = await readBoundedJson(c.req.raw, 1024);
        if (!body.ok) return c.json({ error: body.error }, body.status);
        const input = z.object({ expectedRevision: z.number().int().positive().max(100) }).strict().safeParse(body.value);
        if (!input.success) return c.json({ error: 'A saved investigation revision is required.' }, 400);
        if (input.data.expectedRevision !== work.revision) return c.json({ error: 'Investigation changed. Load the latest revision before checking.' }, 409);
        const transition = await investigationResources.transition();
        if (context.synthetic || transition.after.datasetSnapshotId !== context.datasetSnapshotId || transition.after.provenance.archiveSha256 !== context.archiveSha256) return c.json({ error: 'This historical transition does not match the investigation dataset.' }, 409);
        value = { workRevision: work.revision, sourceId: context.sourceId, datasetSnapshotId: context.datasetSnapshotId, changeReportDigest: transition.digest,
          beforeSnapshotId: transition.before.datasetSnapshotId, afterSnapshotId: transition.after.datasetSnapshotId, signal: investigationReviewSignal(work, transition) };
      } else {
        const materials = await loadInvestigationMaterials(context, history, investigationResources);
        const dossier = await buildInvestigationDossier(context, work.workId, history, materials);
        const encoded = JSON.stringify(dossier);
        if (Buffer.byteLength(encoded) > MAX_INVESTIGATION_BYTES) throw new InvestigationExportLimitError();
        exportedDigest = dossier.digest;
        value = dossier;
      }
      const fresh = teamIdentity(c);
      if (!fresh || !await teamAllowed(fresh.reviewerId, work.claimType) || history.some(row => row.planLink) && !await teamAllowed(fresh.reviewerId, 'source_detected')) return c.json({ error: 'Authority changed. Reconnect before inspecting private evidence.' }, 403);
      if (exportedDigest) c.header('X-Investigation-Digest', exportedDigest);
      return c.json(value);
    } catch (error) {
      if (error instanceof InvestigationLinkError) return c.json({ error: error.message }, 422);
      if (error instanceof InvestigationExportLimitError) return c.json({ error: error.message }, 413);
      return c.json({ error: 'Investigation context is unavailable or inconsistent. Retain the draft and retry.' }, 503);
    } finally { if (action === 'dossier') dossierExportsInFlight--; }
  });

  registerInvestigationDecisions(app, {
    beginBuild: () => { if (dossierExportsInFlight >= 2) return false; dossierExportsInFlight++; return true; }, endBuild: () => { dossierExportsInFlight--; },
    store, workStore: caseWorkStore, publicPreview: Boolean(options.publicBaselinePreview), inFlight: anchoringInFlight,
    context: teamQuery, identity: teamIdentity, read: (c, bytes) => readBoundedJson(c.req.raw, bytes),
    allowed: async (c, work, required) => {
      const identity = teamIdentity(c);
      return Boolean(identity && (!required || identity.scopes.includes(required)) && (required !== 'anchor' || identity.scopes.includes('review'))
        && await teamAllowed(identity.reviewerId, work.claimType) && (!work.planLink || await teamAllowed(identity.reviewerId, 'source_detected')));
    },
    rate: async (c, actor) => (await consumeClientRateLimit('investigation_dossier', c.env?.clientAddress?.trim() || 'unknown', actor, { limit: 20, windowMs: 60_000 }, dossierLimiter)).allowed,
    materials: (context, history) => loadInvestigationMaterials(context, history, investigationResources), transition: investigationResources.transition, chain: services,
  });

  app.get('/api/health', async (c) => {
    const [storage, casebookReady, caseWorkStorage] = await Promise.all([
      store.status(),
      casebookAccess.load().then(() => true, () => false),
      caseWorkStore.status(),
    ]);
    const ready = storage.ready && casebookReady && rateLimitStatus.ready && caseWorkStorage.ready;
    return c.json({ status: ready ? 'ok' : 'degraded', mode: 'mars-casebook-and-demo', storage, caseWorkStorage, casebookReady, rateLimits: rateLimitStatus, chainConfigured: services.chainConfigured(), chainWriteConfigured: services.chainWriteConfigured() && anchorStorageAvailable,
      ...(options.publicBaselinePreview ? { preview: { enabled: true, auditState: 'ephemeral', publicBaselineSources: PUBLIC_PREVIEW_SOURCE_IDS } } : {}),
    }, ready ? 200 : 503);
  });

  app.get('/api/cases', async (c) => {
    try {
      return c.json({ synthetic: false, ...(await casebookAccess.load()) });
    } catch {
      return c.json({ error: 'Traceable MARS casebook is unavailable or invalid' }, 503);
    }
  });

  app.get('/api/cases/:id', async (c) => {
    try {
      const book = await casebookAccess.load();
      const item = book.cases.find((candidate) => candidate.caseId === c.req.param('id'));
      return item ? c.json({ synthetic: false, provenance: book.provenance, limitations: book.limitations, ...item }) : c.json({ error: 'Case not found' }, 404);
    } catch {
      return c.json({ error: 'Traceable MARS casebook is unavailable or invalid' }, 503);
    }
  });

  app.get('/api/sources', async (c) => {
    if (c.req.query('mode') === 'demo') return c.json({ synthetic: true, sources: DEMO_SOURCES });
    try {
      return c.json({ synthetic: false, sources: await casebookAccess.list() });
    } catch {
      return c.json({ error: 'Traceable MARS casebook is unavailable or invalid' }, 503);
    }
  });

  app.get('/api/sources/:id', async (c) => {
    if (c.req.query('mode') === 'demo') {
      const demo = DEMO_SOURCES.find((item) => item.sourceId === c.req.param('id'));
      return demo ? c.json(demo) : c.json({ error: 'Source not found' }, 404);
    }
    let found: Awaited<ReturnType<CasebookAccess['find']>> = null;
    try {
      found = await casebookAccess.find(c.req.param('id'));
    } catch {
      return c.json({ error: 'Traceable MARS casebook is unavailable or invalid' }, 503);
    }
    return found ? c.json(found.source) : c.json({ error: 'Source not found' }, 404);
  });

  app.get('/api/intelligence/status', (c) => {
    return c.json({
      documentModelConfigured: services.aiConfigured() && aiAccessConfigured(),
      humanReviewConfigured: humanReviewConfigured(),
      chainConfigured: services.chainConfigured(),
      chainWriteConfigured: services.chainWriteConfigured() && anchorStorageAvailable,
      modelMode: services.aiConfigured() && aiAccessConfigured() ? 'server-side-document-assessment' : 'deterministic-baseline-only',
    });
  });

  app.get('/api/intelligence/insights', async (c) => {
    const sourceId = c.req.query('sourceId');
    if (!sourceId || sourceId.length > 128) return c.json({ error: 'A valid sourceId is required' }, 400);
    try {
      const snapshot = await services.getIntelligenceSnapshot();
      const sourceInsight = snapshot.sources.find((item) => item.sourceId === sourceId);
      if (!sourceInsight) return c.json({ error: 'Source not found in the pinned MARS dataset' }, 404);
      const observedFluxTrend = expandObservedFluxTrend(sourceInsight.observedFluxTrend, snapshot.observedTrendMethod);
      const forecast = snapshot.forecastReadiness || sourceInsight.forecast;
      const insight = {
        ...sourceInsight,
        ...(observedFluxTrend ? { observedFluxTrend } : {}),
        ...(forecast ? { forecast } : {}),
      };
      return c.json({ snapshot: {
        modelVersion: snapshot.modelVersion,
        datasetSnapshotId: snapshot.datasetSnapshotId,
        linkedObservationCount: snapshot.linkedObservationCount,
        sourceDataset: snapshot.sourceDataset,
        sourceProvider: snapshot.sourceProvider,
        datasetLicense: snapshot.datasetLicense,
        catalogUrl: snapshot.catalogUrl,
        datasetAttribution: snapshot.datasetAttribution,
        upstreamArchiveSha256: snapshot.upstreamArchiveSha256,
        snapshotSha256: snapshot.snapshotSha256,
        inputFileSha256: snapshot.inputFileSha256,
        generatedAt: snapshot.generatedAt,
        trainedModel: snapshot.trainedModel,
        observedTrendMethod: snapshot.observedTrendMethod,
        forecastReadiness: snapshot.forecastReadiness,
        recordRecurrenceModel: snapshot.recordRecurrenceModel,
        publisherIndicatorComparison: snapshot.publisherIndicatorComparison,
        limitations: snapshot.limitations,
      }, insight });
    } catch {
      return c.json({ error: 'Intelligence snapshot is missing, invalid, or stale for the pinned MARS dataset' }, 503);
    }
  });

  app.get('/api/intelligence/rankings', async (c) => {
    try {
      const snapshot = await services.getIntelligenceSnapshot();
      return c.json({
        snapshot: {
          modelVersion: snapshot.modelVersion,
          datasetSnapshotId: snapshot.datasetSnapshotId,
          linkedObservationCount: snapshot.linkedObservationCount,
          sourceDataset: snapshot.sourceDataset,
          sourceProvider: snapshot.sourceProvider,
          datasetLicense: snapshot.datasetLicense,
          catalogUrl: snapshot.catalogUrl,
          upstreamArchiveSha256: snapshot.upstreamArchiveSha256,
          snapshotSha256: snapshot.snapshotSha256,
          inputFileSha256: snapshot.inputFileSha256,
          generatedAt: snapshot.generatedAt,
          trainedModel: snapshot.trainedModel,
          calibratedProbability: snapshot.calibratedProbability,
          observedTrendMethod: snapshot.observedTrendMethod,
          forecastReadiness: snapshot.forecastReadiness,
          recordRecurrenceModel: snapshot.recordRecurrenceModel,
          publisherIndicatorComparison: snapshot.publisherIndicatorComparison,
          sourceCount: snapshot.sourceCount,
          limitations: snapshot.limitations,
        },
        rankings: snapshot.sources.map(({ sourceId, priorityScore, priorityBand, priorityType, lastObserved, dataSufficiency, recordRecurrenceForecast }) => ({
          sourceId, priorityScore, priorityBand, priorityType, lastObserved, dataSufficiency, recordRecurrenceForecast,
        })),
        forecast: snapshot.forecastReadiness || {
          status: 'not_available',
          reason: 'No complete observation-opportunity labels or independent outcome validation are available; no forecast probability is produced.',
        },
      });
    } catch {
      return c.json({ error: 'Intelligence snapshot is missing, invalid, or stale for the pinned MARS dataset' }, 503);
    }
  });

  app.post('/api/intelligence/assessments', async (c) => {
    preventPrivateResponseCaching(c);
    const token = process.env.AI_REVIEW_TOKEN;
    if (!aiAccessConfigured() || !bearerTokenMatches(c.req.header('authorization'), token)) {
      return c.json({ error: 'Unauthorized or document assessment disabled' }, 401);
    }
    if (!services.aiConfigured()) return c.json({ error: 'Document assessment provider is not configured' }, 503);
    const address = c.env?.clientAddress?.trim() || 'unknown';
    const tokenFingerprint = createHash('sha256').update(token!).digest('hex');
    const decision = await consumeClientRateLimit('ai_assessment', address, tokenFingerprint, aiRateLimitConfig, aiAssessmentRateLimiter);
    c.header('X-RateLimit-Limit', String(aiAssessmentRateLimiter.limit));
    c.header('X-RateLimit-Remaining', String(decision.remaining));
    c.header('X-RateLimit-Reset', String(Math.ceil(decision.resetAt / 1_000)));
    if (!decision.allowed) {
      const now = aiRateLimitConfig.now?.() ?? Date.now();
      c.header('Retry-After', String(Math.max(1, Math.ceil((decision.resetAt - now) / 1_000))));
      if (decision.reason === 'capacity') return c.json({ error: 'AI assessment service is temporarily busy; retry later.' }, 503);
      return c.json({ error: 'Too many AI assessment requests; try again later.' }, 429);
    }
    const body = await readBoundedJson(c.req.raw, 40_960);
    if (!body.ok) return c.json({ error: body.error }, body.status);
    const parsed = DocumentAssessmentInput.safeParse(body.value);
    if (!parsed.success) return c.json({ error: 'Invalid request', details: parsed.error.flatten() }, 400);
    let found: Awaited<ReturnType<CasebookAccess['find']>>;
    let casebookUnavailable = false;
    try { found = await casebookAccess.find(parsed.data.sourceId); }
    catch { found = null; casebookUnavailable = true; }
    if (found?.source.synthetic) return c.json({ error: 'Document AI is unavailable for synthetic sources' }, 404);
    let assessmentSource: Pick<ReviewSource, 'sourceId' | 'synthetic'>;
    let caseId: string;
    let externalEvidence: ExternalEvidenceReference[];
    let provenance: MarsProvenance;
    let observationIds: string[];
    let observationTimeline: { id: string; observedAt: string }[];
    let pinnedSnapshot: Awaited<ReturnType<AppServices['getIntelligenceSnapshot']>> | undefined;
    try { pinnedSnapshot = await services.getIntelligenceSnapshot(); }
    catch { /* A matching curated archive remains a safe, versioned fallback. */ }
    const pinnedRow = pinnedSnapshot?.sources.find((item) => item.sourceId === parsed.data.sourceId);
    const pinnedProvenance = pinnedSnapshot?.sourceProvenance;
    const pinIsConsistent = Boolean(pinnedSnapshot?.datasetSnapshotId && pinnedRow && pinnedProvenance
      && pinnedProvenance.snapshotId === pinnedSnapshot?.datasetSnapshotId
      && pinnedProvenance.archiveSha256 === pinnedSnapshot?.upstreamArchiveSha256);
    if (pinIsConsistent && pinnedSnapshot && pinnedRow && pinnedProvenance) {
      assessmentSource = { sourceId: pinnedRow.sourceId, synthetic: false };
      caseId = `mars:${pinnedSnapshot.datasetSnapshotId}:${pinnedRow.sourceId}`;
      externalEvidence = found?.item.externalEvidence || [];
      provenance = pinnedProvenance;
      observationIds = pinnedRow.observationIds;
      observationTimeline = pinnedRow.observationIds.map((id, index) => ({ id, observedAt: pinnedRow.observationTimestamps[index] }));
    } else if (found) {
      assessmentSource = found.source;
      caseId = found.item.caseId;
      externalEvidence = found.item.externalEvidence;
      provenance = found.book.provenance;
      observationIds = found.item.plumes.map((plume) => plume.plumeId);
      observationTimeline = found.item.plumes.map((plume) => ({ id: plume.plumeId, observedAt: plume.tileDate }));
    } else {
      if (pinnedSnapshot && !pinnedRow) return c.json({ error: 'Unknown source in the pinned MARS snapshot' }, 404);
      if (pinnedRow) return c.json({ error: 'Pinned MARS dataset provenance is incomplete or inconsistent' }, 503);
      if (casebookUnavailable) return c.json({ error: 'Pinned snapshot has no matching source and the curated casebook is unavailable' }, 503);
      return c.json({ error: 'Pinned MARS source snapshot is unavailable or stale' }, 503);
    }
    let rawAssessment;
    try { rawAssessment = await services.requestModelAssessment(parsed.data); }
    catch { return c.json({ error: 'Document assessment provider failed or timed out; no report was created' }, 502); }
    const insight = pinnedSnapshot?.sources.find((item) => item.sourceId === parsed.data.sourceId);
    try {
      const audit = await store.create(caseId, parsed.data.sourceId, parsed.data.claimType, (revision) => createDocumentAudit(
        parsed.data,
        assessmentSource,
        rawAssessment,
        revision,
        {
          caseId,
          externalEvidence,
          provenance,
          ...(pinnedSnapshot ? { investigationSnapshotSha256: pinnedSnapshot.snapshotSha256 } : {}),
          ...(insight ? { investigationPriority: insight.priorityScore } : {}),
          ...(pinnedSnapshot ? { investigationModelVersion: pinnedSnapshot.modelVersion } : {}),
          ...(pinnedSnapshot ? { datasetSnapshotId: pinnedSnapshot.datasetSnapshotId || undefined, datasetInputSha256: pinnedSnapshot.inputFileSha256 } : {}),
          observationTimeline,
          observationIds,
        },
      ));
      return c.json({ audit }, 201);
    } catch {
      return c.json({ error: 'Assessment could not be persisted' }, 503);
    }
  });

  app.get('/api/investigations/challenges', async c => {
    c.header('Cache-Control', 'no-store');
    return c.json({ synthetic: true, challenges: await decisionChallenges() });
  });

  app.post('/api/investigations/plan', async c => {
    preventPrivateResponseCaching(c);
    const decision = await consumeClientRateLimit('decision_plan', c.env?.clientAddress?.trim() || 'unknown', '', decisionPlanRateLimitConfig, decisionPlanRateLimiter);
    if (!decision.allowed) { c.header('Retry-After', '60'); return c.json({ error: 'Too many decision analyses; retry in one minute.' }, 429); }
    const body = await readBoundedJson(c.req.raw, 16_384);
    if (!body.ok) return c.json({ error: body.error }, body.status);
    const parsed = AuditInput.strict().safeParse(body.value);
    if (!parsed.success) return c.json({ error: 'Invalid investigation request' }, 400);
    if (options.publicBaselinePreview && !isPublicPreviewAuditAllowed(parsed.data)) return c.json({ error: 'This source or claim scope is unavailable in the public preview.' }, 403);
    try {
      const resolved = await resolveScopedSource({ ...parsed.data, scope: parsed.data.scope || { startDate: '0001-01-01', endDate: '9999-12-31' } }, services.getIntelligenceSnapshot, casebookAccess.find);
      const plan = await buildDecisionPlan({ sourceId: resolved.source.sourceId, synthetic: resolved.source.synthetic, evidence: resolved.source.evidence, claimType: parsed.data.claimType,
        ...(parsed.data.scope ? { scope: parsed.data.scope } : {}),
        datasetSnapshotId: resolved.source.synthetic ? 'DEMO' : resolved.metadata.provenance?.snapshotId || '',
        ...(resolved.metadata.provenance ? { archiveSha256: resolved.metadata.provenance.archiveSha256 } : {}),
        ...(resolved.metadata.provenance ? { provenance: resolved.metadata.provenance } : {}),
        sourceLimitations: resolved.metadata.limitations || [],
      });
      return c.json(plan);
    } catch (error) {
      return c.json({ error: error instanceof ScopeError ? error.message : 'Decision analysis is unavailable; reload the pinned dataset and try again.' }, error instanceof ScopeError ? error.status : 503);
    }
  });

  app.post('/api/investigations/observation-check', async c => {
    preventPrivateResponseCaching(c);
    const limit = await consumeClientRateLimit('observation_check', c.env?.clientAddress?.trim() || 'unknown', '', decisionPlanRateLimitConfig, observationCheckRateLimiter);
    if (!limit.allowed) { c.header('Retry-After', '60'); return c.json({ error: 'Too many archive queries; retry in one minute.' }, 429); }
    const body = await readBoundedJson(c.req.raw, 16_384);
    if (!body.ok) return c.json({ error: body.error }, body.status);
    const parsed = ObservationCheckRequest.safeParse(body.value);
    if (!parsed.success) return c.json({ error: 'Invalid observation question' }, 400);
    if (options.publicBaselinePreview && !(PUBLIC_PREVIEW_SOURCE_IDS as readonly string[]).includes(parsed.data.sourceId)) return c.json({ error: 'This source is outside the public preview.' }, 403);
    try {
      const snapshot = await services.getIntelligenceSnapshot();
      if (snapshot.datasetSnapshotId !== parsed.data.datasetSnapshotId) return c.json({ error: 'Dataset snapshot changed; reload before checking.' }, 409);
      if (parsed.data.inputFileSha256 && parsed.data.inputFileSha256 !== snapshot.inputFileSha256) return c.json({ error: 'Dataset projection changed; reload before checking.' }, 409);
      if (!snapshot.sources.some(source => source.sourceId === parsed.data.sourceId)) return c.json({ error: 'Unknown source in the pinned snapshot' }, 404);
      const records = await services.getObservationSource(parsed.data.sourceId, snapshot);
      return c.json(await buildObservationCheck({
        ...parsed.data, synthetic: false, archiveSha256: snapshot.upstreamArchiveSha256,
        inputFileSha256: snapshot.inputFileSha256, provenance: snapshot.sourceProvenance,
        sourceLimitations: snapshot.limitations, ...records,
      }));
    } catch { return c.json({ error: 'Pinned observation history is unavailable or inconsistent; reload and retry.' }, 503); }
  });

  for (const path of ['/api/investigations/snapshot-transition', '/api/investigations/snapshot-transition/export']) app.post(path, async c => {
    preventPrivateResponseCaching(c);
    if (options.publicBaselinePreview) return c.json({ error: 'Complete historical snapshot comparison is unavailable in the restricted public preview.' }, 403);
    const limit = await consumeClientRateLimit('snapshot_transition', c.env?.clientAddress?.trim() || 'unknown', '', decisionPlanRateLimitConfig, snapshotTransitionRateLimiter);
    if (!limit.allowed) { c.header('Retry-After', '60'); return c.json({ error: 'Too many snapshot comparisons. Retry in one minute.' }, 429); }
    const body = await readBoundedJson(c.req.raw, 16_384);
    if (!body.ok) return c.json({ error: body.error }, body.status);
    const parsed = SnapshotTransitionRequest.safeParse(body.value);
    if (!parsed.success) return c.json({ error: 'Invalid historical snapshot comparison.' }, 400);
    try {
      const snapshot = await services.getIntelligenceSnapshot(), request = parsed.data;
      if (snapshot.datasetSnapshotId !== request.datasetSnapshotId || snapshot.inputFileSha256 !== request.inputFileSha256) return c.json({ error: 'Active dataset changed. Reload before comparing historical releases.' }, 409);
      const report = await services.getSnapshotTransition(snapshot);
      const known = new Set([...snapshot.sources.map(row => row.sourceId), ...report.sourceChanges.map(row => row.id)]);
      if (request.sourceIds.some(id => !known.has(id))) return c.json({ error: 'A selected source is absent from both pinned snapshot catalogs.' }, 400);
      return c.json(path.endsWith('/export') ? report : transitionPage(report, request));
    } catch { return c.json({ error: 'Historical snapshot comparison is unavailable or inconsistent. No live change is inferred; retain the current plan and retry.' }, 503); }
  });

  async function currentPortfolio(request: z.infer<typeof PlannerRequest>) {
    const snapshot = await services.getIntelligenceSnapshot();
    if (snapshot.datasetSnapshotId !== request.datasetSnapshotId || snapshot.inputFileSha256 !== request.inputFileSha256) throw new PlanStoreError('conflict');
    const catalog = await getPlannerCatalog(snapshot);
    const candidates = options.publicBaselinePreview ? catalog.candidates.filter(row => (PUBLIC_PREVIEW_SOURCE_IDS as readonly string[]).includes(row.sourceId)) : catalog.candidates;
    return buildInvestigationPortfolio({ parameters: request.parameters, candidates,
      dataset: { datasetSnapshotId: snapshot.datasetSnapshotId, inputFileSha256: snapshot.inputFileSha256,
        archiveSha256: snapshot.upstreamArchiveSha256, intelligenceSha256: snapshot.snapshotSha256, synthetic: false,
        provenance: snapshot.sourceProvenance, totalSourceCount: snapshot.sourceCount, scope: options.publicBaselinePreview ? 'public_preview' : 'full_snapshot',
        archiveStartDate: catalog.archiveStartDate, archiveEndDate: catalog.archiveEndDate } });
  }
  app.get('/api/investigation-plans/:id', async c => {
    preventPrivateResponseCaching(c);
    if (options.publicBaselinePreview) return c.json({ error: 'Private plan history is unavailable in public preview.' }, 403);
    const identity = teamIdentity(c);
    if (!identity) return c.json({ error: 'Signed team access is required.' }, 401);
    if (!await teamAllowed(identity.reviewerId, 'source_detected')) return c.json({ error: 'Current source-investigation authority required.' }, 403);
    if (!PlanId.safeParse(c.req.param('id')).success) return c.json({ error: 'Invalid plan ID.' }, 400);
    try {
      const journal = await planStore.get(c.req.param('id'));
      if (!await teamAllowed(identity.reviewerId, 'source_detected')) return c.json({ error: 'Authority changed; reconnect.' }, 403);
      return journal ? c.json(journal) : c.json({ error: 'Saved plan not found.' }, 404);
    } catch { return c.json({ error: 'Plan history is unavailable; retain your export and retry.' }, 503); }
  });
  app.put('/api/investigation-plans/:id', async c => {
    preventPrivateResponseCaching(c);
    if (options.publicBaselinePreview) return c.json({ error: 'Private plan decisions are unavailable in public preview.' }, 403);
    const identity = teamIdentity(c);
    if (!identity) return c.json({ error: 'Signed team access is required.' }, 401);
    if (!identity.scopes.includes('review') || !await teamAllowed(identity.reviewerId, 'source_detected')) return c.json({ error: 'Review scope and current source-investigation authority required.' }, 403);
    const limit = await consumeClientRateLimit('investigation_allocation', c.env?.clientAddress?.trim() || 'unknown', identity.reviewerId, decisionPlanRateLimitConfig, allocationRateLimiter);
    if (!limit.allowed) { c.header('Retry-After', '60'); return c.json({ error: 'Too many plan decisions. Retry in one minute.' }, 429); }
    const body = await readBoundedJson(c.req.raw, 8192);
    if (!body.ok) return c.json({ error: body.error }, body.status);
    const parsed = PlanSaveInput.safeParse(body.value);
    if (!parsed.success || !PlanId.safeParse(c.req.param('id')).success) return c.json({ error: 'Invalid plan decision.' }, 400);
    try {
      const { request, reportDigest, expectedRevision, expectedHead, ...decision } = parsed.data;
      const report = await currentPortfolio(request);
      if (report.digest !== reportDigest) return c.json({ error: 'Displayed plan changed. Recompute and inspect before reviewing.' }, 409);
      const journal = await planStore.save(c.req.param('id'), report, decision, expectedRevision, expectedHead, identity.reviewerId, async () => {
        const fresh = teamIdentity(c);
        if (!fresh?.scopes.includes('review') || !await teamAllowed(fresh.reviewerId, 'source_detected')) throw new Error('Authority changed before commit');
      });
      return c.json(journal, expectedRevision === 0 ? 201 : 200);
    } catch (error) {
      if (error instanceof Error && error.message === 'conflict') return c.json({ error: 'Plan or dataset changed. Load the latest history and compare before saving.' }, 409);
      if (error instanceof PlanStoreError && error.code === 'capacity') return c.json({ error: 'Plan history capacity reached. Existing revisions are retained.' }, 413);
      return c.json({ error: 'Plan decision could not be saved. Check latest history before retrying.' }, 503);
    }
  });
  app.post('/api/investigations/portfolios', async c => {
    preventPrivateResponseCaching(c);
    const limit = await consumeClientRateLimit('investigation_allocation', c.env?.clientAddress?.trim() || 'unknown', '', decisionPlanRateLimitConfig, allocationRateLimiter);
    if (!limit.allowed) { c.header('Retry-After', '60'); return c.json({ error: 'Too many allocation requests; retry in one minute.' }, 429); }
    const body = await readBoundedJson(c.req.raw, 8192);
    if (!body.ok) return c.json({ error: body.error }, body.status);
    const parsed = PlannerRequest.safeParse(body.value);
    if (!parsed.success) return c.json({ error: 'Invalid investigation constraints' }, 400);
    try {
      return c.json(await currentPortfolio(parsed.data));
    } catch (error) {
      if (error instanceof PlanStoreError && error.code === 'conflict') return c.json({ error: 'Dataset changed; reload before planning.' }, 409);
      return c.json({ error: 'Pinned planning data are missing or inconsistent. Reload and retry.' }, 503);
    }
  });

  app.post('/api/audits', async (c) => {
    if (process.env.NODE_ENV === 'production' && !options.publicBaselinePreview && process.env.ENABLE_PUBLIC_BASELINE_AUDITS !== 'true'
      && !bearerTokenMatches(c.req.header('authorization'), process.env.ADMIN_API_TOKEN)) {
      return c.json({ error: 'Baseline audit creation requires administrator authorization in production' }, 401);
    }
    // Use the server's socket address passed by the runtime; caller-supplied forwarding headers are ignored.
    const address = c.env?.clientAddress?.trim() || 'unknown';
    const decision = await consumeClientRateLimit('audit_write', address, '', rateLimitConfig, auditRateLimiter);
    c.header('X-RateLimit-Limit', String(auditRateLimiter.limit));
    c.header('X-RateLimit-Remaining', String(decision.remaining));
    c.header('X-RateLimit-Reset', String(Math.ceil(decision.resetAt / 1_000)));
    if (!decision.allowed) {
      const now = rateLimitConfig.now?.() ?? Date.now();
      c.header('Retry-After', String(Math.max(1, Math.ceil((decision.resetAt - now) / 1_000))));
      if (decision.reason === 'capacity') return c.json({ error: 'Audit service is temporarily busy; retry later.' }, 503);
      return c.json({ error: 'Too many audit requests; try again later.' }, 429);
    }
    const body = await readBoundedJson(c.req.raw, 16_384);
    if (!body.ok) return c.json({ error: body.error }, body.status);
    const parsed = AuditInput.safeParse(body.value);
    if (!parsed.success) return c.json({ error: 'Invalid request', details: parsed.error.flatten() }, 400);
    if (options.publicBaselinePreview && !isPublicPreviewAuditAllowed(parsed.data)) {
      return c.json({ error: 'Public preview audits are limited to the three curated historical sources and non-recipient claims.' }, 403);
    }
    if (parsed.data.scope) {
      if (parsed.data.scope.recipient) preventPrivateResponseCaching(c);
      try {
        const resolved = await resolveScopedSource({ ...parsed.data, scope: parsed.data.scope }, services.getIntelligenceSnapshot, casebookAccess.find);
        const audit = await store.create(resolved.caseId, resolved.source.sourceId, parsed.data.claimType, revision => createAudit(resolved.source, parsed.data, { ...resolved.metadata, caseId: resolved.caseId, revision }));
        return c.json(audit, 201);
      } catch (error) {
        return c.json({ error: error instanceof ScopeError ? error.message : 'Scoped audit could not be saved' }, error instanceof ScopeError ? error.status : 503);
      }
    }
    const demoSource = DEMO_SOURCES.find((item) => item.sourceId === parsed.data.sourceId);
    let found: Awaited<ReturnType<CasebookAccess['find']>> = null;
    let casebookUnavailable = false;
    if (!demoSource) {
      try {
        found = await casebookAccess.find(parsed.data.sourceId);
      } catch {
        casebookUnavailable = true;
      }
    }
    let source: Pick<ReviewSource, 'sourceId' | 'synthetic' | 'evidence'> | undefined = demoSource || found?.source;
    let caseId = found?.item.caseId || source?.sourceId;
    let metadata: AuditMetadata | undefined = found ? {
      externalEvidence: found.item.externalEvidence,
      provenance: found.book.provenance,
      limitations: [...found.book.limitations, 'Linked report content is not included or independently reviewed.'],
    } : undefined;

    if (!source && !demoSource) {
      try {
        const snapshot = await services.getIntelligenceSnapshot();
        const row = snapshot.sources.find((item) => item.sourceId === parsed.data.sourceId);
        const provenance = snapshot.sourceProvenance;
        const snapshotIsConsistent = Boolean(row && snapshot.datasetSnapshotId && provenance
          && provenance.snapshotId === snapshot.datasetSnapshotId
          && provenance.archiveSha256 === snapshot.upstreamArchiveSha256);
        if (row && snapshotIsConsistent && provenance) {
          const latestIndex = row.observationTimestamps.reduce((latest, timestamp, index) =>
            timestamp.localeCompare(row.observationTimestamps[latest] || '') > 0 ? index : latest, 0);
          const latestObservationId = row.observationIds[latestIndex];
          source = {
            sourceId: row.sourceId,
            synthetic: false,
            evidence: latestObservationId ? [{
              id: latestObservationId,
              kind: 'detection',
              claimType: 'source_detected',
              title: `UNEP MARS plume observation · ${row.observationTimestamps[latestIndex]}`,
              reference: provenance.catalogUrl,
              date: row.observationTimestamps[latestIndex],
              synthetic: false,
            }] : [],
          };
          caseId = `mars:${snapshot.datasetSnapshotId}:${row.sourceId}`;
          metadata = {
            provenance,
            limitations: [
              ...snapshot.limitations,
              'This global source is outside the curated response casebook. The baseline cites at most one latest linked plume record for the source-detected claim.',
              'Notification and feedback metadata are not treated as proof of operator receipt, physical repair, or emissions reduction.',
            ],
          };
        }
      } catch {
        // A curated casebook remains usable when the wider pinned snapshot is unavailable.
      }
    }

    if (!source || !caseId) {
      if (casebookUnavailable) return c.json({ error: 'Traceable MARS casebook is unavailable or invalid' }, 503);
      return c.json({ error: 'Unknown source in the pinned MARS snapshot or curated casebook' }, 404);
    }
    try {
      const audit = await store.create(caseId, source.sourceId, parsed.data.claimType, (revision) => createAudit(source!, parsed.data, {
        ...metadata,
        caseId,
        revision,
      }));
      return c.json(audit, 201);
    } catch {
      return c.json({ error: 'Audit could not be persisted' }, 503);
    }
  });

  app.get('/api/reviewers/me', async c => {
    preventPrivateResponseCaching(c);
    const reviewer = reviewerIdentity(c.req.header('authorization'), 'review');
    if (!reviewer) return c.json({ error: 'Reviewer authorization required' }, 401);
    const claim = ClaimType.safeParse(c.req.query('claimType'));
    if (!claim.success) return c.json({ error: 'A valid claimType is required' }, 400);
    const assurance = await services.loadReviewerAssurance(reviewer.reviewerId, claim.data);
    return c.json({ reviewerId: reviewer.reviewerId, assurance, publisherHosts: EVIDENCE_PUBLISHER_HOSTS,
      attestedReviewersRequired: process.env.REQUIRE_ATTESTED_HUMAN_REVIEWERS === 'true' });
  });

  app.post('/api/human-assessments', async (c) => {
    preventPrivateResponseCaching(c);
    const reviewer = reviewerIdentity(c.req.header('authorization'), 'review');
    if (!reviewer) return c.json({ error: 'An authorized human reviewer is required; no AI service is needed' }, 401);
    const address = c.env?.clientAddress?.trim() || 'unknown';
    const decision = await consumeClientRateLimit('audit_write', address, reviewer.reviewerId, rateLimitConfig, auditRateLimiter);
    if (!decision.allowed) return c.json({ error: 'Too many assessment requests; try again later' }, 429);
    const body = await readBoundedJson(c.req.raw, 65_536);
    if (!body.ok) return c.json({ error: body.error }, body.status);
    const parsed = HumanAssessmentInput.safeParse(body.value);
    if (!parsed.success) return c.json({ error: 'Invalid human assessment', details: parsed.error.flatten() }, 400);
    const input = parsed.data;
    try {
      const assurance = await services.loadReviewerAssurance(reviewer.reviewerId, input.claimType);
      if (!directoryPermits(assurance.status)) {
        return c.json({ error: 'Reviewer directory approval is revoked, outside this claim authority, or required but not current' }, 403);
      }
      const resolved = await resolveScopedSource(input, services.getIntelligenceSnapshot, casebookAccess.find);
      const parent = input.parentAuditId ? await store.get(input.parentAuditId) : undefined;
      if (input.parentAuditId && (!parent || parent.bundle.schemaVersion !== 4 || parent.caseId !== resolved.caseId || parent.claimType !== input.claimType || !auditIntegrityValid(parent))) {
        return c.json({ error: 'Parent must be a matching human assessment with valid integrity' }, 409);
      }
      const urls = new Map<string, { reference: string; expected?: string }>();
      for (const item of input.evidence) {
        urls.set(`${item.reference}|${item.expectedSha256 || ''}`, { reference: item.reference, expected: item.expectedSha256 });
        if (item.followUpReference) urls.set(`${item.followUpReference}|${item.followUpExpectedSha256 || ''}`, { reference: item.followUpReference, expected: item.followUpExpectedSha256 });
      }
      const candidates = [...urls.values()];
      const referenceChecks: EvidenceCheck[] = [];
      // Bound concurrent outgoing reads, with no model call or document persistence.
      for (let index = 0; index < candidates.length; index += 3) {
        referenceChecks.push(...await Promise.all(candidates.slice(index, index + 3).map(item => input.checkPublicReferences
          ? services.checkEvidenceReference(item.reference, item.expected)
          : Promise.resolve({ reference: item.reference, checkedAt: new Date().toISOString(), status: 'not_checked' as const }))));
      }
      if (input.result !== 'insufficient_evidence' && referenceChecks.some(item => item.status === 'digest_mismatch')) {
        return c.json({ error: 'A reference digest mismatched. Resolve it or record insufficient evidence.' }, 422);
      }
      // Refresh approval after potentially slow retrieval, so a newly revoked entry cannot be used to save.
      let currentAssurance = await services.loadReviewerAssurance(reviewer.reviewerId, input.claimType);
      if (!directoryPermits(currentAssurance.status)) return c.json({ error: 'Reviewer approval changed; check current access before saving' }, 403);
      const audit = await store.create(resolved.caseId, input.sourceId, input.claimType,
        revision => createHumanAssessment(input, resolved, reviewer.reviewerId, revision, parent, {
          reviewer: currentAssurance, referenceChecks, conflictDeclaration: input.conflictDeclaration || 'not_declared', publicSummaryConsent: input.publicSummaryConsent === true,
        }), parent?.auditId, async () => {
          currentAssurance = await services.loadReviewerAssurance(reviewer.reviewerId, input.claimType);
          return directoryPermits(currentAssurance.status);
        });
      return c.json({ audit }, 201);
    } catch (error) {
      if (error instanceof ScopeError) return c.json({ error: error.message }, error.status);
      if (error instanceof PublicationError) return c.json({ error: error.message }, error.status);
      if (error instanceof Error && error.message === 'Review parent is no longer the latest unreviewed audit') return c.json({ error: 'The case revision changed; reload its latest human assessment' }, 409);
      return c.json({ error: 'Human assessment could not be saved' }, 503);
    }
  });

  const transparencyRecord = (audit: AuditResult, events: PublicationEvent[]): TransparencyRecord | null => {
    if (!auditIntegrityValid(audit)) return null;
    const summary = transparencySummaryPayload(audit);
    if (!summary) return null;
    return { summary, summaryHash: `0x${createHash('sha256').update(canonicalJson(summary)).digest('hex')}`, publication: publicationState(audit, events) };
  };
  app.get('/api/transparency', async c => {
    c.header('Cache-Control', 'no-store');
    const sourceId = c.req.query('sourceId');
    const rawLimit = c.req.query('limit');
    const rawCursor = c.req.query('cursor');
    const view = c.req.query('view') || 'current';
    const limit = rawLimit === undefined ? DEFAULT_AUDIT_PAGE_SIZE : parseAuditPageLimit(rawLimit);
    const before = rawCursor === undefined ? undefined : decodeAuditCursor(rawCursor);
    if (!limit || !['current', 'history'].includes(view) || (rawCursor !== undefined && !before) || (sourceId !== undefined && (!sourceId || sourceId.length > 128))) return c.json({ error: 'Invalid transparency filter or pagination' }, 400);
    try {
      const snapshot = await store.publicationSnapshot();
      const eligible = snapshot.audits.filter(audit => (!sourceId || audit.sourceId === sourceId) && transparencySummaryPayload(audit) !== null);
      const current = new Map<string, AuditResult>();
      for (const audit of eligible) {
        const key = JSON.stringify([audit.caseId, audit.claimType]);
        if (!current.has(key) || current.get(key)!.revision < audit.revision) current.set(key, audit);
      }
      const visible = (view === 'history' ? eligible : [...current.values()]).filter(audit => transparencyRecord(audit, snapshot.events) !== null);
      const page = pageAuditRecords(visible, { limit, before, visibility: 'all' });
      return c.json({ summaries: page.audits.map(audit => transparencyRecord(audit, snapshot.events)!), hasMore: page.hasMore,
        nextCursor: page.nextCursor ? encodeAuditCursor(page.nextCursor) : null });
    } catch { return c.json({ error: 'Transparency summaries unavailable' }, 503); }
  });
  app.get('/api/transparency/:id', async c => {
    c.header('Cache-Control', 'no-store');
    try {
      const snapshot = await store.publicationSnapshot();
      const audit = snapshot.audits.find(item => item.auditId === c.req.param('id'));
      const record = audit ? transparencyRecord(audit, snapshot.events) : null;
      return record ? c.json(record) : c.json({ error: 'Public summary not found' }, 404);
    } catch { return c.json({ error: 'Public summary unavailable' }, 503); }
  });
  app.get('/api/transparency/:id/verify', async c => {
    c.header('Cache-Control', 'no-store');
    try {
      const snapshot = await store.publicationSnapshot();
      const audit = snapshot.audits.find(item => item.auditId === c.req.param('id'));
      const record = audit ? transparencyRecord(audit, snapshot.events) : null;
      if (!record) return c.json({ error: 'Public summary not found' }, 404);
      return c.json({ summaryHash: record.summaryHash, publication: record.publication, checkedAt: new Date().toISOString(),
        limitation: 'Server-reported publication status at this check. Historical checksum does not certify current publication, identity or physical truth.' });
    } catch { return c.json({ error: 'Publication status unavailable' }, 503); }
  });
  app.post('/api/transparency/:id/withdraw', async c => {
    preventPrivateResponseCaching(c);
    const reviewer = reviewerIdentity(c.req.header('authorization'), 'review');
    if (!reviewer) return c.json({ error: 'An authorized human reviewer is required' }, 401);
    const body = await readBoundedJson(c.req.raw, 4096);
    if (!body.ok) return c.json({ error: body.error }, body.status);
    const parsed = WithdrawalInput.safeParse(body.value);
    if (!parsed.success) return c.json({ error: 'A publication version and a predefined withdrawal reason are required' }, 400);
    try {
      const snapshot = await store.publicationSnapshot();
      const audit = snapshot.audits.find(item => item.auditId === c.req.param('id'));
      if (!audit || !transparencyRecord(audit, snapshot.events)) return c.json({ error: 'Public summary not found' }, 404);
      const permitted = async () => (await services.loadReviewerAssurance(reviewer.reviewerId, audit.claimType)).status === 'operator_attested';
      if (!await permitted()) return c.json({ error: 'Current operator-attested review authority is required' }, 403);
      const address = c.env?.clientAddress?.trim() || 'unknown';
      const decision = await consumeClientRateLimit('audit_write', address, reviewer.reviewerId, rateLimitConfig, auditRateLimiter);
      if (!decision.allowed) return c.json({ error: 'Too many publication requests; try again later' }, 429);
      await store.withdrawPublication(audit.auditId, parsed.data.expectedVersion, parsed.data.reason, reviewer.reviewerId, permitted);
      const saved = await store.publicationSnapshot();
      const record = transparencyRecord(saved.audits.find(item => item.auditId === audit.auditId)!, saved.events);
      return c.json(record);
    } catch (error) {
      if (error instanceof PublicationError) return c.json({ error: error.message }, error.status);
      return c.json({ error: 'Withdrawal could not be confirmed; refresh publication status before retrying' }, 503);
    }
  });

  app.get('/api/audits', async (c) => {
    const sourceId = c.req.query('sourceId');
    if (sourceId !== undefined && sourceId.length > 128) return c.json({ error: 'Invalid sourceId filter' }, 400);
    const rawClaimType = c.req.query('claimType');
    const claimType = rawClaimType ? ClaimType.safeParse(rawClaimType) : undefined;
    if (rawClaimType && !claimType?.success) return c.json({ error: 'Invalid claimType filter' }, 400);
    const rawLimit = c.req.query('limit');
    const rawCursor = c.req.query('cursor');
    const pageRequested = rawLimit !== undefined || rawCursor !== undefined;
    const parsedLimit = parseAuditPageLimit(rawLimit);
    if (pageRequested && rawLimit !== undefined && parsedLimit === null) return c.json({ error: 'Invalid page size; limit must be an integer from 1 to 100' }, 400);
    const cursor = rawCursor === undefined ? null : decodeAuditCursor(rawCursor);
    if (rawCursor !== undefined && !cursor) return c.json({ error: 'Invalid audit pagination cursor' }, 400);
    try {
      if (pageRequested) {
        const page = await store.listPage({
          sourceId,
          claimType: claimType?.success ? claimType.data : undefined,
          limit: parsedLimit ?? DEFAULT_AUDIT_PAGE_SIZE,
          before: cursor,
          visibility: 'public',
        });
        return c.json({ ...page, nextCursor: page.nextCursor ? encodeAuditCursor(page.nextCursor) : null });
      }
      const audits = (await store.list(sourceId, claimType?.success ? claimType.data : undefined)).filter(auditIsPubliclyReadable);
      return c.json({ audits: audits.sort((a, b) => a.sourceId.localeCompare(b.sourceId) || a.claimType.localeCompare(b.claimType) || a.revision - b.revision) });
    } catch {
      return c.json({ error: 'Audit history is unavailable' }, 503);
    }
  });

  app.get('/api/audits/history', async (c) => {
    preventPrivateResponseCaching(c);
    const permittedClaims = await privateReadClaims(c.req.header('authorization'));
    if (!permittedClaims.size) return c.json({ error: 'Authorized audit-history access is required' }, 401);
    const sourceId = c.req.query('sourceId');
    const rawClaimType = c.req.query('claimType');
    const claimType = rawClaimType ? ClaimType.safeParse(rawClaimType) : undefined;
    if (rawClaimType && !claimType?.success) return c.json({ error: 'Invalid claimType filter' }, 400);
    if (sourceId !== undefined && sourceId.length > 128) return c.json({ error: 'Invalid sourceId filter' }, 400);
    const rawLimit = c.req.query('limit');
    const rawCursor = c.req.query('cursor');
    const pageRequested = rawLimit !== undefined || rawCursor !== undefined;
    const parsedLimit = parseAuditPageLimit(rawLimit);
    if (pageRequested && rawLimit !== undefined && parsedLimit === null) return c.json({ error: 'Invalid page size; limit must be an integer from 1 to 100' }, 400);
    const cursor = rawCursor === undefined ? null : decodeAuditCursor(rawCursor);
    if (rawCursor !== undefined && !cursor) return c.json({ error: 'Invalid audit pagination cursor' }, 400);
    try {
      const visible = (await store.list(sourceId, claimType?.success ? claimType.data : undefined)).filter(audit => permittedClaims.has(audit.claimType));
      if (pageRequested) {
        const page = pageAuditRecords(visible, {
          limit: parsedLimit ?? DEFAULT_AUDIT_PAGE_SIZE,
          before: cursor,
          visibility: 'all',
        });
        return c.json({ ...page, nextCursor: page.nextCursor ? encodeAuditCursor(page.nextCursor) : null });
      }
      return c.json({ audits: visible.sort((a, b) => a.sourceId.localeCompare(b.sourceId) || a.claimType.localeCompare(b.claimType) || a.revision - b.revision) });
    } catch {
      return c.json({ error: 'Audit history is unavailable' }, 503);
    }
  });

  app.get('/api/audits/:id', async (c) => {
    const audit = await store.get(c.req.param('id')).catch(() => undefined);
    if (!audit || (!auditIsPubliclyReadable(audit) && !await privateAuditReadAuthorized(c.req.header('authorization'), audit.claimType))) {
      preventPrivateResponseCaching(c);
      return c.json({ error: 'Audit not found' }, 404);
    }
    if (!auditIsPubliclyReadable(audit)) {
      preventPrivateResponseCaching(c);
    }
    return c.json(audit);
  });

  app.post('/api/audits/:id/review', async (c) => {
    preventPrivateResponseCaching(c);
    const reviewer = reviewerIdentity(c.req.header('authorization'), 'review');
    if (!reviewer) {
      return c.json({ error: 'Unauthorized or human review is not configured' }, 401);
    }
    const body = await readBoundedJson(c.req.raw, 4_096);
    if (!body.ok) return c.json({ error: body.error }, body.status);
    const parsed = HumanReviewInput.safeParse(body.value);
    if (!parsed.success) return c.json({ error: 'Invalid review decision', details: parsed.error.flatten() }, 400);
    const parent = await store.get(c.req.param('id')).catch(() => undefined);
    if (!parent) return c.json({ error: 'Audit not found' }, 404);
    const assurance = await services.loadReviewerAssurance(reviewer.reviewerId, parent.claimType);
    if (!directoryPermits(assurance.status)) return c.json({ error: 'Reviewer directory approval does not permit this review' }, 403);
    if (parent.bundle.schemaVersion !== 3 || parent.bundle.intelligence?.reviewStatus !== 'unreviewed') {
      return c.json({ error: 'Only an unreviewed document assessment can receive a review revision' }, 409);
    }
    if (parsed.data.status === 'approved' && parent.bundle.intelligence.quotations.length === 0) {
      return c.json({ error: 'Approval requires at least one exact validated quotation' }, 422);
    }
    if (parsed.data.publishCitations && parent.bundle.intelligence.citationPublication?.authorConsent !== true) {
      return c.json({ error: 'Submitter consent is required before citations can be published' }, 403);
    }
    if (parsed.data.publishClaimText && parent.bundle.intelligence.claimPublication?.authorConsent !== true) {
      return c.json({ error: 'Submitter consent is required before the claim text can be published' }, 403);
    }
    try {
      const audit = await store.create(parent.caseId, parent.sourceId, parent.claimType,
        (revision) => createReviewedAudit(parent, revision, reviewer.reviewerId, parsed.data), parent.auditId);
      return c.json({ audit }, 201);
    } catch {
      return c.json({ error: 'Audit was already reviewed or its revision changed; reload the audit history' }, 409);
    }
  });

  // Privileged action: ADMIN_API_TOKEN and REVIEWER_AUTH_SECRET stay server-side.
  app.post('/api/audits/:id/anchor', async (c) => {
    preventPrivateResponseCaching(c);
    const isAdmin = bearerTokenMatches(c.req.header('authorization'), process.env.ADMIN_API_TOKEN);
    const reviewer = reviewerIdentity(c.req.header('authorization'), 'anchor');
    if (!isAdmin && !reviewer) {
      return c.json({ error: 'Unauthorized or anchoring disabled' }, 401);
    }
    const audit = await store.get(c.req.param('id')).catch(() => undefined);
    if (!audit) return c.json({ error: 'Audit not found' }, 404);
    if (audit.bundle.schemaVersion === 4) return c.json({ error: 'Private human assessments cannot be anchored by this prototype' }, 409);
    if (reviewer && !isAdmin && !await anchorReviewerPermitted(reviewer, audit.claimType)) return c.json({ error: 'Current reviewer authority does not permit this claim' }, 403);
    if (audit.bundle.schemaVersion === 3 && audit.bundle.intelligence?.reviewStatus === 'unreviewed') return c.json({ error: 'Human review is required before anchoring an AI assessment' }, 409);
    if (reviewer && !isAdmin && (audit.bundle.schemaVersion !== 3 || !audit.bundle.intelligence?.reviewStatus)) return c.json({ error: 'Reviewer anchoring is limited to human-reviewed document assessments' }, 403);
    if (audit.synthetic && process.env.NODE_ENV === 'production' && process.env.ALLOW_SYNTHETIC_CHAIN_ANCHORS !== 'true') {
      return c.json({ error: 'Synthetic demonstration audits cannot be anchored in production' }, 422);
    }
    if (audit.anchored) return c.json({ error: 'Already anchored', chainTxHash: audit.chainTxHash }, 409);
    if (!auditIntegrityValid(audit)) return c.json({ error: 'Local audit bundle or result integrity mismatch' }, 409);
    if (!services.chainConfigured()) return c.json({ error: 'Chain not configured' }, 503);
    if (!services.chainWriteConfigured()) return c.json({ error: 'Chain signing key not configured; no transaction intent was created' }, 503);
    if (!store.reserveAnchor || !store.completeAnchor || !store.getAnchorIntent || !store.markAnchorReverted) return c.json({ error: 'Durable anchoring storage is unavailable' }, 503);
    let expectedTarget: { chainId: number; registryAddress: string; issuer: string } | undefined;
    if (c.req.raw.body !== null) {
      const body = await readBoundedJson(c.req.raw, 2_048);
      if (!body.ok) return c.json({ error: body.error }, body.status);
      const parsed = z.object({ chainId: z.number().int(), registryAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/), issuer: z.string().regex(/^0x[a-fA-F0-9]{40}$/) }).strict().safeParse(body.value);
      if (!parsed.success) return c.json({ error: 'Invalid expected target' }, 400);
      expectedTarget = parsed.data;
    }
    if (anchoringInFlight.size) return c.json({ error: 'The dedicated issuer is busy; reconcile pending operations first' }, 409);
    anchoringInFlight.add(audit.auditId);
    let reserved = false;
    let prepared: Awaited<ReturnType<typeof prepareAnchor>> | undefined;
    try {
      const current = await store.get(audit.auditId);
      if (current?.anchored) return c.json({ error: 'Already anchored', chainTxHash: current.chainTxHash }, 409);
      const existing = await store.getAnchorIntent(audit.auditId);
      if (existing?.state === 'pending') return c.json({ error: 'Pending transaction; reconcile before any new write', intent: existing }, 409);
      const registryId = registryCaseId(audit.caseId, audit.claimType);
      const latest = await services.readReceipt(registryId);
      if (latest.version > 0n && latest.hash.toLowerCase() === audit.bundleHash.toLowerCase()) {
        return c.json({ error: 'Bundle already exists on chain; verify its existing receipt' }, 409);
      }
      prepared = await services.prepareAnchor(audit.auditId, registryId, audit.bundleHash);
      if (expectedTarget && (expectedTarget.chainId !== prepared.draft.chainId
        || expectedTarget.registryAddress.toLowerCase() !== prepared.draft.registryAddress.toLowerCase()
        || expectedTarget.issuer.toLowerCase() !== prepared.draft.issuer.toLowerCase())) return c.json({ error: 'Configured target changed; inspect it again before approval' }, 409);
      if (reviewer && !isAdmin && !await anchorReviewerPermitted(reviewer, audit.claimType)) return c.json({ error: 'Reviewer authority changed before reservation' }, 403);
      if (!(await store.reserveAnchor(audit, prepared.draft))) return c.json({ error: 'A pending operation or stale nonce/version blocks this write' }, 409);
      reserved = true;
      await services.broadcastAnchor(prepared);
      const intent = (await store.getAnchorIntent(audit.auditId))!;
      const outcome = await services.inspectAnchorIntent(intent, true);
      if (outcome.status === 'reverted') {
        await store.markAnchorReverted(audit.auditId);
        return c.json({ error: 'Transaction reverted; audit remains unanchored', txHash: intent.txHash }, 422);
      }
      if (outcome.status === 'pending') return c.json({ status: 'pending', intent }, 202);
      const receipt = outcome.receipt;
      const anchored = { ...audit, anchored: true, chainTxHash: receipt.txHash, receipt };
      await store.completeAnchor(anchored);
      if (isAdmin || await privateAuditReadAuthorized(c.req.header('authorization'), audit.claimType)) return c.json(anchored);
      return c.json({ status: 'anchored', auditId: anchored.auditId, bundleHash: anchored.bundleHash, receipt });
    } catch {
      return c.json({ error: reserved
        ? 'Anchor outcome is uncertain; use anchor-status and reconcile. Do not rebroadcast.'
        : 'Anchor preflight failed; no transaction was submitted' }, reserved ? 502 : 503);
    } finally {
      prepared = undefined;
      anchoringInFlight.delete(audit.auditId);
    }
  });

  const ReconcileReceiptInput = z.object({
    chainId: z.union([z.literal(11155111), z.literal(31337)]),
    registryAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
    issuer: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    version: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    blockNumber: z.string().regex(/^\d{1,19}$/),
    blockHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
    confirmations: z.number().int().min(1).max(64).optional(),
  });

  app.get('/api/audits/:id/anchor-status', async (c) => {
    preventPrivateResponseCaching(c);
    const admin = bearerTokenMatches(c.req.header('authorization'), process.env.ADMIN_API_TOKEN);
    const reviewer = reviewerIdentity(c.req.header('authorization'), 'anchor');
    if (!admin && !reviewer) return c.json({ error: 'Anchor authorization required' }, 401);
    const audit = await store.get(c.req.param('id')).catch(() => undefined);
    if (!audit) return c.json({ error: 'Audit not found' }, 404);
    if (reviewer && !admin && !await anchorReviewerPermitted(reviewer, audit.claimType)) return c.json({ error: 'Current reviewer authority does not permit this claim' }, 403);
    if (reviewer && !admin && audit.bundle.schemaVersion !== 3) return c.json({ error: 'Audit not found' }, 404);
    try {
      if (!store.getAnchorIntent) return c.json({ error: 'Durable intent storage unavailable' }, 503);
      return c.json({ auditId: audit.auditId, intent: await store.getAnchorIntent(audit.auditId) ?? null, target: await services.chainTarget().catch(() => null) });
    } catch { return c.json({ error: 'Intent storage unavailable' }, 503); }
  });

  app.post('/api/audits/:id/reconcile', async (c) => {
    preventPrivateResponseCaching(c);
    const isAdmin = bearerTokenMatches(c.req.header('authorization'), process.env.ADMIN_API_TOKEN);
    const reviewer = reviewerIdentity(c.req.header('authorization'), 'anchor');
    if (!isAdmin && !reviewer) return c.json({ error: 'Reconciliation requires anchor authorization' }, 401);
    let supplied: AuditReceipt | undefined;
    if (c.req.raw.body !== null) {
      const body = await readBoundedJson(c.req.raw, 2_048);
      if (!body.ok) return c.json({ error: body.error }, body.status);
      const parsed = ReconcileReceiptInput.safeParse(body.value);
      if (!parsed.success) return c.json({ error: 'Invalid transaction receipt fields' }, 400);
      supplied = parsed.data as AuditReceipt;
    }
    const audit = await store.get(c.req.param('id')).catch(() => undefined);
    if (!audit) return c.json({ error: 'Audit not found' }, 404);
    if (audit.bundle.schemaVersion === 4 || audit.bundle.intelligence?.reviewStatus === 'unreviewed') return c.json({ error: 'Private or unreviewed assessments cannot be reconciled' }, 409);
    if (reviewer && !isAdmin && !await anchorReviewerPermitted(reviewer, audit.claimType)) return c.json({ error: 'Current reviewer authority does not permit this claim' }, 403);
    if (reviewer && !isAdmin && audit.bundle.schemaVersion !== 3) return c.json({ error: 'Reviewer anchoring is limited to reviewed document assessments' }, 403);
    if (audit.synthetic && process.env.NODE_ENV === 'production' && process.env.ALLOW_SYNTHETIC_CHAIN_ANCHORS !== 'true') return c.json({ error: 'Synthetic anchors are disabled' }, 422);
    if (!auditIntegrityValid(audit)) return c.json({ error: 'Bundle integrity mismatch' }, 409);
    if (!store.getAnchorIntent || !store.completeAnchor || !store.markAnchorReverted) return c.json({ error: 'Durable reconciliation storage is unavailable' }, 503);
    if (!services.chainConfigured()) return c.json({ error: 'Chain verification is not configured' }, 503);
    if (anchoringInFlight.size) return c.json({ error: 'Issuer operation in progress' }, 409);
    anchoringInFlight.add(audit.auditId);
    try {
      const intent = await store.getAnchorIntent(audit.auditId);
      if (!intent) return c.json({ error: 'No durable intent exists; imported receipts require independent verification' }, 409);
      if (supplied && (supplied.txHash !== intent.txHash || supplied.chainId !== intent.chainId
        || supplied.registryAddress.toLowerCase() !== intent.registryAddress.toLowerCase()
        || supplied.issuer.toLowerCase() !== intent.issuer.toLowerCase() || supplied.version !== intent.expectedVersion)) return c.json({ error: 'Receipt does not match stored intent' }, 422);
      if (intent.state === 'confirmed') return c.json({ status: 'already_reconciled', auditId: audit.auditId, receipt: audit.receipt });
      if (intent.state === 'reverted') return c.json({ status: 'reverted', auditId: audit.auditId, txHash: intent.txHash });
      const outcome = await services.inspectAnchorIntent(intent);
      if (reviewer && !isAdmin && !await anchorReviewerPermitted(reviewer, audit.claimType)) return c.json({ error: 'Reviewer authority changed during reconciliation' }, 403);
      if (outcome.status === 'pending') return c.json({ status: 'pending', intent }, 202);
      if (outcome.status === 'reverted') {
        await store.markAnchorReverted(audit.auditId);
        return c.json({ status: 'reverted', auditId: audit.auditId, txHash: intent.txHash });
      }
      const receipt = outcome.receipt;
      if (supplied && supplied.blockNumber !== receipt.blockNumber) return c.json({ error: 'Receipt block mismatch' }, 422);
      const anchored = { ...audit, anchored: true, chainTxHash: receipt.txHash, receipt };
      await store.completeAnchor(anchored);
      return c.json({ status: 'reconciled', auditId: audit.auditId, bundleHash: audit.bundleHash, receipt });
    } catch { return c.json({ error: 'Chain verification unavailable; intent remains pending' }, 503); }
    finally { anchoringInFlight.delete(audit.auditId); }
  });

  app.get('/api/audits/:id/verify', async (c) => {
    const audit = await store.get(c.req.param('id')).catch(() => undefined);
    if (!audit || (!auditIsPubliclyReadable(audit) && !await privateAuditReadAuthorized(c.req.header('authorization'), audit.claimType))) {
      preventPrivateResponseCaching(c);
      return c.json({ error: 'Audit not found' }, 404);
    }
    if (!auditIsPubliclyReadable(audit)) {
      preventPrivateResponseCaching(c);
    }
    const localDigestValid = auditIntegrityValid(audit);
    if (!localDigestValid) return c.json({ status: 'local_hash_mismatch', integrityVerified: false, localDigestValid });
    if (!services.chainConfigured()) return c.json({ status: audit.anchored ? 'receipt_metadata_present_chain_unavailable' : 'not_configured', integrityVerified: false, localDigestValid, receipt: audit.receipt || null });
    if (!audit.receipt) return c.json({ status: 'not_anchored', integrityVerified: false, localDigestValid, receipt: null });
    try {
      const [eventCheck, latest] = await Promise.all([
        services.verifyAnchorTransaction(registryCaseId(audit.caseId, audit.claimType), audit.bundleHash, audit.receipt),
        services.readReceipt(registryCaseId(audit.caseId, audit.claimType)),
      ]);
      const isLatest = latest.hash.toLowerCase() === audit.bundleHash.toLowerCase() && Number(latest.version) === audit.receipt.version;
      const integrityVerified = eventCheck.valid;
      return c.json({
        status: !integrityVerified ? eventCheck.reason : isLatest ? 'verified_latest_receipt' : 'verified_historical_receipt',
        integrityVerified,
        localDigestValid,
        isLatest,
        issuer: eventCheck.issuer || audit.receipt.issuer,
        version: eventCheck.version || audit.receipt.version,
        blockNumber: eventCheck.blockNumber || audit.receipt.blockNumber,
        transactionHash: eventCheck.transactionHash || audit.receipt.txHash,
        receipt: audit.receipt,
      });
    } catch {
      return c.json({ status: 'verification_unavailable', integrityVerified: false, localDigestValid }, 502);
    }
  });

  return app;
}

// API unit tests use an isolated, non-durable store. Runtime entrypoint selects durable storage.
export const app = createApp(new MemoryAuditStore());
