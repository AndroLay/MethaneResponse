import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { AuditInput, ClaimType, DEMO_SOURCES, type AuditReceipt, type AuditResult, type ExternalEvidenceReference, type MarsProvenance, type ReviewSource } from '@methane/shared';
import { createAudit, type AuditMetadata } from './audit';
import { anchorReceipt, chainConfigured, chainWriteConfigured, readReceipt, registryCaseId, verifyAnchorTransaction } from './chain';
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
import { z } from 'zod';

export type ApiBindings = { clientAddress?: string };
export type CreateAppOptions = { auditRateLimit?: FixedWindowRateLimitOptions; aiAssessmentRateLimit?: FixedWindowRateLimitOptions };

type CasebookAccess = {
  load: typeof loadCasebook;
  list: typeof listReviewSources;
  find: typeof findCaseBySourceId;
};

type AppServices = {
  aiConfigured: typeof defaultAiConfigured;
  requestModelAssessment: typeof requestModelAssessment;
  getIntelligenceSnapshot: typeof getIntelligenceSnapshot;
  chainConfigured: typeof chainConfigured;
  chainWriteConfigured: typeof chainWriteConfigured;
  readReceipt: typeof readReceipt;
  anchorReceipt: typeof anchorReceipt;
  verifyAnchorTransaction: typeof verifyAnchorTransaction;
};

const defaultServices: AppServices = {
  aiConfigured: defaultAiConfigured,
  requestModelAssessment,
  getIntelligenceSnapshot,
  chainConfigured,
  chainWriteConfigured,
  readReceipt,
  anchorReceipt,
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

function privateAuditReadAuthorized(header: string | undefined): boolean {
  return reviewerIdentity(header, 'private_read') !== null;
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
  const app = new Hono<{ Bindings: ApiBindings }>();
  const rateLimitConfig = options.auditRateLimit || { limit: 20, windowMs: 60_000 };
  const auditRateLimiter = createFixedWindowRateLimiter(rateLimitConfig);
  const aiRateLimitConfig = options.aiAssessmentRateLimit || { limit: 6, windowMs: 60_000 };
  const aiAssessmentRateLimiter = createFixedWindowRateLimiter(aiRateLimitConfig);
  const rateLimitSalt = randomBytes(32).toString('hex');
  const rateLimitHashSecret = process.env.RATE_LIMIT_HASH_SECRET;
  const persistentRateLimitConsumer = store.consumeRateLimit?.bind(store);
  const sharedRateLimitActive = Boolean(persistentRateLimitConsumer && rateLimitHashSecret && rateLimitHashSecret.length >= 32);
  const sharedRateLimitRequired = process.env.NODE_ENV === 'production' && Boolean(persistentRateLimitConsumer);
  const rateLimitStatus = {
    backend: sharedRateLimitActive ? 'postgres' : 'process-local',
    shared: sharedRateLimitActive,
    required: sharedRateLimitRequired,
    ready: !sharedRateLimitRequired || sharedRateLimitActive,
  };
  const consumeClientRateLimit = async (
    scope: RateLimitScope,
    address: string,
    identity: string,
    config: FixedWindowRateLimitOptions,
    localLimiter: ReturnType<typeof createFixedWindowRateLimiter>,
  ): Promise<RateLimitDecision | null> => {
    if (sharedRateLimitRequired && !sharedRateLimitActive) return null;
    const key = createRateLimitClientKey(sharedRateLimitActive ? rateLimitHashSecret! : rateLimitSalt, scope, address, identity);
    if (sharedRateLimitActive) return persistentRateLimitConsumer!(scope, key, config.limit, config.windowMs);
    return localLimiter.consume(key);
  };
  const anchoringInFlight = new Set<string>();
  app.use('/api/*', cors({ origin: process.env.WEB_ORIGIN || 'http://localhost:5173' }));

  app.get('/api/health', async (c) => {
    const [storage, casebookReady] = await Promise.all([
      store.status(),
      casebookAccess.load().then(() => true, () => false),
    ]);
    const ready = storage.ready && casebookReady && rateLimitStatus.ready;
    return c.json({ status: ready ? 'ok' : 'degraded', mode: 'mars-casebook-and-demo', storage, casebookReady, rateLimits: rateLimitStatus, chainConfigured: services.chainConfigured(), chainWriteConfigured: services.chainWriteConfigured() }, ready ? 200 : 503);
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
      chainWriteConfigured: services.chainWriteConfigured(),
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
    let decision: RateLimitDecision | null;
    try {
      decision = await consumeClientRateLimit('ai_assessment', address, tokenFingerprint, aiRateLimitConfig, aiAssessmentRateLimiter);
    } catch {
      decision = null;
    }
    if (!decision) {
      c.header('Retry-After', '5');
      return c.json({ error: 'Shared rate limiting is unavailable; retry later.' }, 503);
    }
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

  app.post('/api/audits', async (c) => {
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_PUBLIC_BASELINE_AUDITS !== 'true'
      && !bearerTokenMatches(c.req.header('authorization'), process.env.ADMIN_API_TOKEN)) {
      return c.json({ error: 'Baseline audit creation requires administrator authorization in production' }, 401);
    }
    // Use the server's socket address passed by the runtime; caller-supplied forwarding headers are ignored.
    const address = c.env?.clientAddress?.trim() || 'unknown';
    let decision: RateLimitDecision | null;
    try {
      decision = await consumeClientRateLimit('audit_write', address, '', rateLimitConfig, auditRateLimiter);
    } catch {
      decision = null;
    }
    if (!decision) {
      c.header('Retry-After', '5');
      return c.json({ error: 'Shared rate limiting is unavailable; retry later.' }, 503);
    }
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
    if (!privateAuditReadAuthorized(c.req.header('authorization'))) return c.json({ error: 'Authorized audit-history access is required' }, 401);
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
      if (pageRequested) {
        const page = await store.listPage({
          sourceId,
          claimType: claimType?.success ? claimType.data : undefined,
          limit: parsedLimit ?? DEFAULT_AUDIT_PAGE_SIZE,
          before: cursor,
          visibility: 'all',
        });
        return c.json({ ...page, nextCursor: page.nextCursor ? encodeAuditCursor(page.nextCursor) : null });
      }
      const audits = await store.list(sourceId, claimType?.success ? claimType.data : undefined);
      return c.json({ audits: audits.sort((a, b) => a.sourceId.localeCompare(b.sourceId) || a.claimType.localeCompare(b.claimType) || a.revision - b.revision) });
    } catch {
      return c.json({ error: 'Audit history is unavailable' }, 503);
    }
  });

  app.get('/api/audits/:id', async (c) => {
    const audit = await store.get(c.req.param('id')).catch(() => undefined);
    if (!audit || (!auditIsPubliclyReadable(audit) && !privateAuditReadAuthorized(c.req.header('authorization')))) {
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
    if (audit.bundle.schemaVersion === 3 && audit.bundle.intelligence?.reviewStatus === 'unreviewed') return c.json({ error: 'Human review is required before anchoring an AI assessment' }, 409);
    if (reviewer && !isAdmin && (audit.bundle.schemaVersion !== 3 || !audit.bundle.intelligence?.reviewStatus)) return c.json({ error: 'Reviewer anchoring is limited to human-reviewed document assessments' }, 403);
    if (audit.synthetic && process.env.NODE_ENV === 'production' && process.env.ALLOW_SYNTHETIC_CHAIN_ANCHORS !== 'true') {
      return c.json({ error: 'Synthetic demonstration audits cannot be anchored in production' }, 422);
    }
    if (audit.anchored) return c.json({ error: 'Already anchored', chainTxHash: audit.chainTxHash }, 409);
    if (!auditIntegrityValid(audit)) return c.json({ error: 'Local audit bundle or result integrity mismatch' }, 409);
    if (!services.chainConfigured()) return c.json({ error: 'Chain not configured' }, 503);
    if (!services.chainWriteConfigured()) return c.json({ error: 'Chain signing key not configured; no transaction intent was created' }, 503);
    if (!store.reserveAnchor || !store.completeAnchor) return c.json({ error: 'Durable PostgreSQL anchor storage is required' }, 503);
    if (anchoringInFlight.has(audit.auditId)) return c.json({ error: 'Anchoring is already in progress for this audit' }, 409);
    anchoringInFlight.add(audit.auditId);
    let broadcastAttempted = false;
    try {
      const current = await store.get(audit.auditId);
      if (current?.anchored) return c.json({ error: 'Already anchored', chainTxHash: current.chainTxHash }, 409);
      const registryId = registryCaseId(audit.caseId, audit.claimType);
      const latest = await services.readReceipt(registryId);
      if (latest.version > 0n && latest.hash.toLowerCase() === audit.bundleHash.toLowerCase()) {
        return c.json({ error: 'Bundle already exists on chain; reconcile its receipt before retrying' }, 409);
      }
      if (!(await store.reserveAnchor(audit))) {
        return c.json({ error: 'A pending or completed chain operation exists; verify and reconcile before another write' }, 409);
      }
      broadcastAttempted = true;
      const receipt = await services.anchorReceipt(registryId, audit.bundleHash);
      const anchored = { ...audit, anchored: true, chainTxHash: receipt.txHash, receipt };
      await store.completeAnchor(anchored);
      if (isAdmin || reviewer?.scopes.includes('private_read')) return c.json(anchored);
      return c.json({ status: 'anchored', auditId: anchored.auditId, bundleHash: anchored.bundleHash, receipt });
    } catch {
      return c.json({ error: broadcastAttempted
        ? 'Anchor status is uncertain; inspect the chain and reconcile before retrying'
        : 'Anchor preflight failed; no transaction was submitted' }, broadcastAttempted ? 502 : 503);
    } finally {
      anchoringInFlight.delete(audit.auditId);
    }
  });

  const ReconcileReceiptInput = z.object({
    chainId: z.literal(11155111),
    registryAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
    issuer: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    version: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    blockNumber: z.string().regex(/^\d+$/),
  });

  app.post('/api/audits/:id/reconcile', async (c) => {
    preventPrivateResponseCaching(c);
    const isAdmin = bearerTokenMatches(c.req.header('authorization'), process.env.ADMIN_API_TOKEN);
    const reviewer = reviewerIdentity(c.req.header('authorization'), 'anchor');
    if (!isAdmin && !reviewer) return c.json({ error: 'Reconciliation requires anchor authorization' }, 401);
    if (!store.reserveAnchor || !store.completeAnchor) return c.json({ error: 'Durable PostgreSQL reconciliation is required' }, 503);
    const body = await readBoundedJson(c.req.raw, 2_048);
    if (!body.ok) return c.json({ error: body.error }, body.status);
    const parsed = ReconcileReceiptInput.safeParse(body.value);
    if (!parsed.success) return c.json({ error: 'Invalid transaction receipt fields' }, 400);
    const audit = await store.get(c.req.param('id')).catch(() => undefined);
    if (!audit) return c.json({ error: 'Audit not found' }, 404);
    if (audit.anchored) return c.json({ status: 'already_reconciled', auditId: audit.auditId, receipt: audit.receipt });
    if (audit.synthetic && process.env.NODE_ENV === 'production' && process.env.ALLOW_SYNTHETIC_CHAIN_ANCHORS !== 'true') {
      return c.json({ error: 'Synthetic demonstration audits cannot be reconciled in production' }, 422);
    }
    if (audit.bundle.schemaVersion === 3 && audit.bundle.intelligence?.reviewStatus === 'unreviewed') {
      return c.json({ error: 'An unreviewed assessment cannot be reconciled' }, 409);
    }
    if (!auditIntegrityValid(audit)) return c.json({ error: 'Bundle integrity mismatch' }, 409);
    if (!services.chainConfigured()) return c.json({ error: 'Chain verification is not configured' }, 503);
    try {
      const receipt = parsed.data as AuditReceipt;
      const check = await services.verifyAnchorTransaction(registryCaseId(audit.caseId, audit.claimType), audit.bundleHash, receipt);
      if (!check.valid) return c.json({ error: 'On-chain event does not match this bundle and receipt', reason: check.reason }, 422);
      const anchored = { ...audit, anchored: true, chainTxHash: receipt.txHash, receipt };
      // Old receipts may not have an intent; a verified event is the only path
      // that may create a missing reservation and finalize it.
      await store.reserveAnchor(audit);
      await store.completeAnchor(anchored);
      return c.json({ status: 'reconciled', auditId: audit.auditId, bundleHash: audit.bundleHash, receipt });
    } catch {
      return c.json({ error: 'Could not verify or reconcile the submitted chain event' }, 503);
    }
  });

  app.get('/api/audits/:id/verify', async (c) => {
    const audit = await store.get(c.req.param('id')).catch(() => undefined);
    if (!audit || (!auditIsPubliclyReadable(audit) && !privateAuditReadAuthorized(c.req.header('authorization')))) {
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
