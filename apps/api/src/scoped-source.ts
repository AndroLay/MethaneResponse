import { createHash } from 'node:crypto';
import { DEMO_SOURCES, evidenceUtcDay, type AuditInput, type AuditScope, type Source } from '@methane/shared';
import { type AuditMetadata } from './audit';
import { canonicalJson } from './canonical';
import { type findCaseBySourceId } from './casebook';
import { type getIntelligenceSnapshot } from './intelligence-data';

export class ScopeError extends Error {
  constructor(message: string, readonly status: 404 | 409 | 422 | 503) { super(message); }
}

export function scopedCaseId(caseId: string, scope: AuditScope): string {
  return `${caseId}:scope:${createHash('sha256').update(canonicalJson(scope)).digest('hex').slice(0, 24)}`;
}

export async function resolveScopedSource(
  input: AuditInput & { scope: AuditScope },
  getSnapshot: typeof getIntelligenceSnapshot,
  find: typeof findCaseBySourceId,
): Promise<{ source: Pick<Source, 'sourceId' | 'synthetic' | 'evidence'>; caseId: string; metadata: AuditMetadata }> {
  let source: Pick<Source, 'sourceId' | 'synthetic' | 'evidence'> | undefined = DEMO_SOURCES.find(row => row.sourceId === input.sourceId);
  let snapshotId = source ? 'DEMO' : undefined;
  let baseCaseId = source?.sourceId;
  let metadata: AuditMetadata = {};
  if (!source) {
    const snapshot = await getSnapshot().catch(() => undefined);
    const found = await find(input.sourceId).catch(() => null);
    const row = snapshot?.sources.find(item => item.sourceId === input.sourceId);
    const provenance = snapshot?.sourceProvenance;
    if (row && provenance && snapshot?.datasetSnapshotId === provenance.snapshotId && snapshot.upstreamArchiveSha256 === provenance.archiveSha256) {
      snapshotId = snapshot.datasetSnapshotId!;
      baseCaseId = `mars:${snapshotId}:${row.sourceId}`;
      source = { sourceId: row.sourceId, synthetic: false, evidence: row.observationIds.map((id, index) => ({
        id, kind: 'detection', claimType: 'source_detected', title: `UNEP MARS plume observation · ${row.observationTimestamps[index]}`,
        reference: provenance.catalogUrl, date: row.observationTimestamps[index], synthetic: false,
      })) };
      metadata = { provenance, externalEvidence: found?.book.provenance.archiveSha256 === provenance.archiveSha256 ? found.item.externalEvidence : [], limitations: snapshot.limitations };
    } else if (found && !row) {
      source = found.source;
      snapshotId = found.book.provenance.snapshotId;
      baseCaseId = snapshotId ? `mars:${snapshotId}:${input.sourceId}` : found.item.caseId;
      metadata = { provenance: found.book.provenance, externalEvidence: found.item.externalEvidence, limitations: found.book.limitations };
    } else if (row) throw new ScopeError('Pinned snapshot provenance is inconsistent', 503);
    else if (snapshot) throw new ScopeError('Unknown source in the pinned snapshot', 404);
    else throw new ScopeError('Source snapshot is unavailable', 503);
  }
  if (input.datasetSnapshotId && input.datasetSnapshotId !== snapshotId) throw new ScopeError('Dataset snapshot changed; reload before assessing', 409);
  if (input.scope.observationId) {
    const event = source.evidence.find(item => item.kind === 'detection' && item.id === input.scope.observationId);
    if (!event) throw new ScopeError('Selected observation does not belong to this source and snapshot', 422);
    const date = evidenceUtcDay(event.date);
    if (!date || date < input.scope.startDate || date > input.scope.endDate) throw new ScopeError('Selected observation must be inside the assessment period', 422);
  }
  return { source, caseId: scopedCaseId(baseCaseId!, input.scope), metadata };
}
