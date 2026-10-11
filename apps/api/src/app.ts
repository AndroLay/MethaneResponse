import { createHash } from 'node:crypto';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { keccak256, toBytes } from 'viem';
import { AuditInput, DEMO_SOURCES, type AuditResult } from '@methane/shared';
import { createAudit } from './audit';
import { anchorReceipt, chainConfigured, readReceipt } from './chain';

export const app = new Hono();
const audits = new Map<string, AuditResult>(); // demo only, resets on restart

app.use('/api/*', cors({ origin: process.env.WEB_ORIGIN || 'http://localhost:5173' }));
app.get('/api/health', (c) => c.json({ status: 'ok', mode: 'synthetic-demo', persistentStore: false, chainConfigured: chainConfigured() }));
app.get('/api/sources', (c) => c.json({ synthetic: true, sources: DEMO_SOURCES }));
app.get('/api/sources/:id', (c) => {
  const source = DEMO_SOURCES.find((item) => item.sourceId === c.req.param('id'));
  return source ? c.json(source) : c.json({ error: 'Source not found' }, 404);
});
app.post('/api/audits', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = AuditInput.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Invalid request', details: parsed.error.flatten() }, 400);
  const source = DEMO_SOURCES.find((item) => item.sourceId === parsed.data.sourceId);
  if (!source) return c.json({ error: 'Unknown source' }, 404);
  const audit = createAudit(source, parsed.data);
  audits.set(audit.auditId, audit);
  return c.json(audit, 201);
});
app.get('/api/audits/:id', (c) => {
  const audit = audits.get(c.req.param('id'));
  return audit ? c.json(audit) : c.json({ error: 'Audit not found (demo store resets on restart)' }, 404);
});

const caseIdFor = (audit: AuditResult) => keccak256(toBytes(`methane-response:v1:${audit.sourceId}:${audit.claimType}`));
const localDigestMatches = (audit: AuditResult) => `0x${createHash('sha256').update(JSON.stringify(audit.bundle)).digest('hex')}` === audit.bundleHash;

// Privileged action: never expose ADMIN_API_TOKEN to the browser or public frontend.
app.post('/api/audits/:id/anchor', async (c) => {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token || token.length < 32 || c.req.header('authorization') !== `Bearer ${token}`) {
    return c.json({ error: 'Unauthorized or anchoring disabled' }, 401);
  }
  const audit = audits.get(c.req.param('id'));
  if (!audit) return c.json({ error: 'Audit not found' }, 404);
  if (audit.anchored) return c.json({ error: 'Already anchored', chainTxHash: audit.chainTxHash }, 409);
  if (!localDigestMatches(audit)) return c.json({ error: 'Local audit bundle hash mismatch' }, 409);
  if (!chainConfigured()) return c.json({ error: 'Chain not configured' }, 503);
  try {
    const tx = await anchorReceipt(caseIdFor(audit), audit.bundleHash);
    const anchored = { ...audit, anchored: true, chainTxHash: tx };
    audits.set(audit.auditId, anchored);
    return c.json(anchored);
  } catch (error) {
    return c.json({ error: 'Unable to anchor audit', detail: String(error) }, 502);
  }
});

app.get('/api/audits/:id/verify', async (c) => {
  const audit = audits.get(c.req.param('id'));
  if (!audit) return c.json({ error: 'Audit not found' }, 404);
  const localDigestValid = localDigestMatches(audit);
  if (!localDigestValid) return c.json({ status: 'local_hash_mismatch', integrityVerified: false, localDigestValid });
  if (!chainConfigured()) return c.json({ status: 'not_configured', integrityVerified: false, localDigestValid });
  try {
    const record = await readReceipt(caseIdFor(audit));
    const same = record.hash.toLowerCase() === audit.bundleHash.toLowerCase();
    return c.json({ status: same ? 'matched_latest_record' : 'not_latest_or_mismatch', integrityVerified: same && record.version > 0n, localDigestValid, issuer: record.issuer, version: Number(record.version) });
  } catch (error) {
    return c.json({ status: 'verification_unavailable', integrityVerified: false, error: String(error) }, 502);
  }
});

