import type { AuditResult, ClaimType } from '@methane/shared';
import type { MarsObservation, MarsSnapshot, MarsSource } from './mars';

type ExportIntegrity = { schemaVersion: 2; algorithm: 'SHA-256'; sha256: `0x${string}` };
export type ReportExportPayload = Record<string, unknown> & { exportIntegrity?: ExportIntegrity };

export type ReportExportInput = {
  audit: AuditResult | null;
  claim: ClaimType;
  source: MarsSource;
  snapshot: MarsSnapshot | null;
  sourceArchiveHash?: string | null;
  realMode: boolean;
  generatedAt: string;
};

function auditSnapshotId(audit: AuditResult): string | undefined {
  return audit.bundle.intelligence?.datasetSnapshotId || audit.bundle.provenance?.snapshotId;
}

function currentArchiveHash(input: ReportExportInput): string | undefined {
  return (input.snapshot?.provenance?.archiveSha256 as string | undefined)
    || input.sourceArchiveHash
    || input.source.provenance?.archiveSha256;
}

function currentSnapshotId(input: ReportExportInput): string | undefined {
  return input.snapshot?.snapshotId || input.source.provenance?.snapshotId;
}

function currentInputFileHash(input: ReportExportInput): string | undefined {
  const value = input.snapshot?.provenance?.webSnapshotInputSha256;
  return typeof value === 'string' ? value : undefined;
}

function isCurrentContextBound(input: ReportExportInput): boolean {
  const audit = input.audit;
  if (!audit) return true;
  if (audit.sourceId !== input.source.sourceId) return false;
  if (audit.synthetic) return input.source.synthetic;
  const expectedSnapshotId = auditSnapshotId(audit);
  const expectedArchiveHash = audit.bundle.provenance?.archiveSha256;
  const expectedInputHash = audit.bundle.intelligence?.datasetInputSha256;
  if (!expectedSnapshotId && !expectedArchiveHash) return false;
  if (expectedSnapshotId && currentSnapshotId(input) !== expectedSnapshotId) return false;
  if (expectedArchiveHash && currentArchiveHash(input) !== expectedArchiveHash) return false;
  if (expectedInputHash && currentInputFileHash(input) !== expectedInputHash) return false;
  return true;
}

function auditDatasetMetadata(audit: AuditResult, currentMatches: boolean, snapshot: MarsSnapshot | null) {
  const provenance = audit.bundle.provenance;
  const intelligence = audit.bundle.intelligence;
  return {
    name: provenance?.dataset || (audit.synthetic ? 'Synthetic fixture' : 'Versioned source dataset'),
    provider: provenance?.provider || null,
    snapshotId: auditSnapshotId(audit) || null,
    archiveSha256: provenance?.archiveSha256 || null,
    inputFileSha256: intelligence?.datasetInputSha256 || null,
    loadedInputFileSha256: typeof snapshot?.provenance?.webSnapshotInputSha256 === 'string' ? snapshot.provenance.webSnapshotInputSha256 : null,
    sourceUrl: provenance?.downloadUrl || provenance?.catalogUrl || null,
    license: provenance?.license || null,
    importedAt: provenance?.retrievedAt || null,
    ...(currentMatches && snapshot ? {
      observationDateRange: snapshot.plumeObservationDateRange || null,
      counts: snapshot.counts || null,
    } : {}),
  };
}

function currentDatasetMetadata(input: ReportExportInput) {
  const { snapshot, source } = input;
  if (!snapshot) return source.provenance || 'synthetic fixture';
  return {
    name: snapshot.dataset,
    snapshotId: currentSnapshotId(input) || null,
    archiveSha256: currentArchiveHash(input) || null,
    inputFileSha256: currentInputFileHash(input) || null,
    sourceUrl: snapshot.sourceUrl,
    license: snapshot.license,
    importedAt: snapshot.importedAt,
    observationDateRange: snapshot.plumeObservationDateRange || null,
    counts: snapshot.counts || null,
  };
}

function auditObservationIds(audit: AuditResult): Set<string> {
  const boundIds = audit.bundle.intelligence?.observationIds;
  if (boundIds) return new Set(boundIds);
  return new Set(audit.bundle.citedEvidence.filter(item => item.kind === 'detection').map(item => item.id));
}

export function buildReportExportPayload(input: ReportExportInput) {
  const { audit, source, snapshot } = input;
  const contextMatches = isCurrentContextBound(input);
  const sourceContextStatus = !audit ? 'source_only'
    : contextMatches ? 'bound_to_audit' : 'omitted_dataset_mismatch';
  const currentObservations: MarsObservation[] = sourceContextStatus === 'omitted_dataset_mismatch'
    ? []
    : source.observations || [];
  const observations = audit
    ? currentObservations.filter(observation => auditObservationIds(audit).has(observation.id))
    : currentObservations;
  const provenance = audit?.bundle.provenance;
  const sourceDataset = audit
    ? auditDatasetMetadata(audit, contextMatches, snapshot)
    : currentDatasetMetadata(input);
  const disclaimer = input.realMode
    ? `Historical UNEP observation snapshot; not live. Plume absence, notification, and feedback do not prove mitigation. This report records a versioned source dataset; a hash proves integrity, not physical repair.${sourceContextStatus === 'omitted_dataset_mismatch' ? ' Current source observations were omitted because the loaded source or snapshot does not match this saved audit.' : ''}`
    : 'Synthetic fixture only; not a UNEP observation or third-party mitigation certification.';

  return {
    prototype: true,
    exportType: audit ? 'audit_report' : 'source_context',
    synthetic: audit?.synthetic ?? !input.realMode,
    product: 'MethaneResponse',
    generatedAt: input.generatedAt,
    sourceDataset,
    selectedSourceId: audit?.sourceId || source.sourceId,
    sourceContextStatus,
    observations,
    ...(audit ? {
      historicalContext: {
        kind: 'historical_source_observations' as const,
        relationship: 'context_only_not_claim_evidence' as const,
        datasetSnapshotId: auditSnapshotId(audit) || null,
        observations: sourceContextStatus === 'omitted_dataset_mismatch' ? [] : currentObservations,
      },
    } : {}),
    unlinkedObservationCount: sourceContextStatus === 'omitted_dataset_mismatch'
      ? null
      : snapshot?.unlinkedObservationCount ?? snapshot?.unlinkedObservations?.length ?? 0,
    externalEvidence: audit?.bundle.externalEvidence || (sourceContextStatus === 'omitted_dataset_mismatch' ? [] : source.externalEvidence || []),
    claim: audit?.claimType || input.claim,
    latestAudit: audit,
    disclaimer,
    ...(provenance ? { sourceProvenance: provenance } : {}),
  };
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new TypeError('Unsupported JSON value');
    return serialized;
  }
  if (Array.isArray(value)) return `[${value.map(item => item === undefined ? 'null' : canonicalJson(item)).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const fields = Object.keys(record).filter(key => record[key] !== undefined).sort();
    return `{${fields.map(key => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
  }
  throw new TypeError(`Unsupported JSON value: ${typeof value}`);
}

export async function sha256Hex(text: string): Promise<`0x${string}`> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('Web Crypto SHA-256 is unavailable');
  const hash = await subtle.digest('SHA-256', new TextEncoder().encode(text) as BufferSource);
  return `0x${Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

export async function addExportIntegrity<T extends Record<string, unknown>>(payload: T): Promise<T & { exportIntegrity: ExportIntegrity }> {
  const sha256 = await sha256Hex(canonicalJson(payload));
  return { ...payload, exportIntegrity: { schemaVersion: 2, algorithm: 'SHA-256', sha256 } };
}

export async function verifyExportIntegrity(report: Record<string, unknown>): Promise<'absent' | 'valid' | 'invalid' | 'unavailable'> {
  const integrity = report.exportIntegrity;
  if (integrity === undefined) return 'absent';
  if (integrity === null || typeof integrity !== 'object' || Array.isArray(integrity)) return 'invalid';
  const envelope = integrity as Record<string, unknown>;
  if ((envelope.schemaVersion !== 1 && envelope.schemaVersion !== 2) || envelope.algorithm !== 'SHA-256'
    || typeof envelope.sha256 !== 'string' || !/^0x[0-9a-f]{64}$/i.test(envelope.sha256)) return 'invalid';
  const { exportIntegrity: _exportIntegrity, ...payload } = report;
  try {
    const expected = await sha256Hex(canonicalJson(payload));
    return expected.toLowerCase() === envelope.sha256.toLowerCase() ? 'valid' : 'invalid';
  } catch {
    return 'unavailable';
  }
}
