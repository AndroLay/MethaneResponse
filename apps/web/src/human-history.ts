import type { AuditResult, AuditScope, ClaimType } from '@methane/shared';
import { canonicalJson } from './report-export';
import { verifyImportedAuditReport } from './imported-audit-verifier';

type Context = { sourceId: string; claimType: ClaimType; scope: AuditScope; synthetic: boolean; datasetSnapshotId?: string };

export async function fetchLatestHumanAssessment(base: string, context: Context, token: string, signal?: AbortSignal, fetcher: typeof fetch = fetch): Promise<AuditResult | null> {
  let cursor: string | null = null;
  let latest: AuditResult | null = null;
  const seen = new Set<string>();
  for (let page = 0; page < 1000; page++) {
    const query = new URLSearchParams({ sourceId: context.sourceId, claimType: context.claimType, limit: '100', ...(cursor ? { cursor } : {}) });
    const response = await fetcher(`${base}/api/audits/history?${query}`, { headers: { authorization: `Bearer ${token.trim()}` }, cache: 'no-store', signal });
    if (!response.ok) throw new Error('Authorized private history could not be loaded. Check reviewer access and retry.');
    const body = await response.json() as { audits?: AuditResult[]; nextCursor?: string | null };
    if (!Array.isArray(body.audits) || !(body.nextCursor === null || typeof body.nextCursor === 'string')) throw new Error('Invalid private history response.');
    for (const audit of body.audits) {
      if (audit?.bundle?.schemaVersion !== 4 || !audit.bundle.humanAssessment || audit.sourceId !== context.sourceId || audit.claimType !== context.claimType || audit.synthetic !== context.synthetic
        || canonicalJson(audit.bundle.scope) !== canonicalJson(context.scope)
        || (!context.synthetic && (!context.datasetSnapshotId || audit.bundle.provenance?.snapshotId !== context.datasetSnapshotId))) continue;
      if ((await verifyImportedAuditReport(audit)).localDigest !== 'valid') throw new Error('Human assessment integrity check failed. No revision was loaded.');
      if (!latest || audit.revision > latest.revision) latest = audit;
    }
    if (body.nextCursor === null) return latest;
    if (!body.nextCursor || seen.has(body.nextCursor)) throw new Error('Private history pagination is inconsistent. Refresh before loading a revision.');
    seen.add(body.nextCursor); cursor = body.nextCursor;
  }
  throw new Error('Private history pagination limit reached. Narrow the assessment context before retrying.');
}
