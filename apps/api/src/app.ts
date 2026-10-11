import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { AuditInput, ClaimType, DEMO_SOURCES, type AuditResult } from '@methane/shared';
import { createAudit } from './audit';
import { anchorReceipt, chainConfigured, readReceipt, registryCaseId, verifyAnchorTransaction } from './chain';
import { findCaseBySourceId, listReviewSources, loadCasebook } from './casebook';
import { MemoryAuditStore, type AuditStore } from './store';
import { auditIntegrityValid } from './integrity';

type CasebookAccess = {
  load: typeof loadCasebook;
  list: typeof listReviewSources;
  find: typeof findCaseBySourceId;
};

const defaultCasebookAccess: CasebookAccess = {
  load: loadCasebook,
  list: listReviewSources,
  find: findCaseBySourceId,
};

export function createApp(store: AuditStore, casebookAccess: CasebookAccess = defaultCasebookAccess) {
  const app = new Hono();
  app.use('/api/*', cors({ origin: process.env.WEB_ORIGIN || 'http://localhost:5173' }));

  app.get('/api/health', async (c) => {
    const [storage, casebookReady] = await Promise.all([
      store.status(),
      casebookAccess.load().then(() => true, () => false),
    ]);
    const ready = storage.ready && casebookReady;
    return c.json({ status: ready ? 'ok' : 'degraded', mode: 'mars-casebook-and-demo', storage, casebookReady, chainConfigured: chainConfigured() }, ready ? 200 : 503);
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

  app.post('/api/audits', async (c) => {
    const raw = await c.req.text();
    if (new TextEncoder().encode(raw).byteLength > 16_384) return c.json({ error: 'Request body too large' }, 413);
    let body: unknown;
    try { body = JSON.parse(raw) as unknown; }
    catch { return c.json({ error: 'Invalid JSON request' }, 400); }
    const parsed = AuditInput.safeParse(body);
    if (!parsed.success) return c.json({ error: 'Invalid request', details: parsed.error.flatten() }, 400);
    const demoSource = DEMO_SOURCES.find((item) => item.sourceId === parsed.data.sourceId);
    let found: Awaited<ReturnType<CasebookAccess['find']>> = null;
    if (!demoSource) {
      try {
        found = await casebookAccess.find(parsed.data.sourceId);
      } catch {
        return c.json({ error: 'Traceable MARS casebook is unavailable or invalid' }, 503);
      }
    }
    const source = demoSource || found?.source;
    if (!source) return c.json({ error: 'Unknown source' }, 404);
    try {
      const audit = await store.create(found?.item.caseId || source.sourceId, source.sourceId, parsed.data.claimType, (revision) => createAudit(source, parsed.data, found ? {
        caseId: found.item.caseId,
        revision,
        externalEvidence: found.item.externalEvidence,
        provenance: found.book.provenance,
        limitations: [...found.book.limitations, 'Linked report content is not included or independently reviewed.'],
      } : { revision }));
      return c.json(audit, 201);
    } catch {
      return c.json({ error: 'Audit could not be persisted' }, 503);
    }
  });

  app.get('/api/audits', async (c) => {
    const sourceId = c.req.query('sourceId');
    const rawClaimType = c.req.query('claimType');
    const claimType = rawClaimType ? ClaimType.safeParse(rawClaimType) : undefined;
    if (rawClaimType && !claimType?.success) return c.json({ error: 'Invalid claimType filter' }, 400);
    try {
      const audits = await store.list(sourceId, claimType?.success ? claimType.data : undefined);
      return c.json({ audits: audits.sort((a, b) => a.sourceId.localeCompare(b.sourceId) || a.claimType.localeCompare(b.claimType) || a.revision - b.revision) });
    } catch {
      return c.json({ error: 'Audit history is unavailable' }, 503);
    }
  });

  app.get('/api/audits/:id', async (c) => {
    const audit = await store.get(c.req.param('id')).catch(() => undefined);
    return audit ? c.json(audit) : c.json({ error: 'Audit not found' }, 404);
  });

  // Privileged action: ADMIN_API_TOKEN must never be exposed to the browser.
  app.post('/api/audits/:id/anchor', async (c) => {
    const token = process.env.ADMIN_API_TOKEN;
    if (!token || token.length < 32 || c.req.header('authorization') !== `Bearer ${token}`) {
      return c.json({ error: 'Unauthorized or anchoring disabled' }, 401);
    }
    const audit = await store.get(c.req.param('id')).catch(() => undefined);
    if (!audit) return c.json({ error: 'Audit not found' }, 404);
    if (audit.anchored) return c.json({ error: 'Already anchored', chainTxHash: audit.chainTxHash }, 409);
    if (!auditIntegrityValid(audit)) return c.json({ error: 'Local audit bundle or result integrity mismatch' }, 409);
    if (!chainConfigured()) return c.json({ error: 'Chain not configured' }, 503);
    try {
      const receipt = await anchorReceipt(registryCaseId(audit.caseId, audit.claimType), audit.bundleHash);
      const anchored = { ...audit, anchored: true, chainTxHash: receipt.txHash, receipt };
      await store.replace(anchored);
      return c.json(anchored);
    } catch {
      return c.json({ error: 'Unable to anchor audit; no receipt was recorded by this API' }, 502);
    }
  });

  app.get('/api/audits/:id/verify', async (c) => {
    const audit = await store.get(c.req.param('id')).catch(() => undefined);
    if (!audit) return c.json({ error: 'Audit not found' }, 404);
    const localDigestValid = auditIntegrityValid(audit);
    if (!localDigestValid) return c.json({ status: 'local_hash_mismatch', integrityVerified: false, localDigestValid });
    if (!chainConfigured()) return c.json({ status: audit.anchored ? 'receipt_metadata_present_chain_unavailable' : 'not_configured', integrityVerified: false, localDigestValid, receipt: audit.receipt || null });
    if (!audit.receipt) return c.json({ status: 'not_anchored', integrityVerified: false, localDigestValid, receipt: null });
    try {
      const [eventCheck, latest] = await Promise.all([
        verifyAnchorTransaction(registryCaseId(audit.caseId, audit.claimType), audit.bundleHash, audit.receipt),
        readReceipt(registryCaseId(audit.caseId, audit.claimType)),
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
