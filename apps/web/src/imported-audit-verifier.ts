import { canonicalJson, verifyExportIntegrity } from './report-export';

type JsonRecord = Record<string, unknown>;

export type ImportedAuditVerification = {
  localDigest: 'valid' | 'invalid' | 'unavailable';
  auditId?: string;
  revision?: number;
  sourceId?: string;
  bundleHash?: string;
  result?: string;
  claimType?: string;
  synthetic?: boolean;
  reviewStatus?: string;
  receipt: 'not_present' | 'metadata_matches_event_unverified' | 'metadata_mismatch';
  exportContext: 'none' | 'not_in_audit_hash' | 'manifest_valid' | 'manifest_invalid' | 'manifest_unavailable';
  message?: string;
};

const HEX_256 = /^0x[0-9a-f]{64}$/i;
const ADDRESS = /^0x[0-9a-f]{40}$/i;
const CLAIM_TYPES = new Set(['source_detected', 'operator_notified', 'mitigation_confirmed']);
const RESULTS = new Set(['supported', 'insufficient_evidence', 'contradicted']);

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function receiptStatus(audit: JsonRecord): ImportedAuditVerification['receipt'] {
  const receipt = audit.receipt;
  if (receipt === undefined || receipt === null) return audit.anchored === false && audit.chainTxHash === undefined
    ? 'not_present'
    : 'metadata_mismatch';
  if (!isRecord(receipt)) return 'metadata_mismatch';
  const validFields = Number.isSafeInteger(receipt.chainId) && Number(receipt.chainId) > 0
    && typeof receipt.registryAddress === 'string' && ADDRESS.test(receipt.registryAddress)
    && typeof receipt.txHash === 'string' && HEX_256.test(receipt.txHash)
    && typeof receipt.issuer === 'string' && ADDRESS.test(receipt.issuer)
    && Number.isSafeInteger(receipt.version) && Number(receipt.version) > 0
    && typeof receipt.blockNumber === 'string' && /^\d+$/.test(receipt.blockNumber);
  const transactionMatches = typeof audit.chainTxHash === 'string'
    && audit.chainTxHash.toLowerCase() === String(receipt.txHash).toLowerCase();
  return audit.anchored === true && validFields && transactionMatches
    ? 'metadata_matches_event_unverified'
    : 'metadata_mismatch';
}

function invalid(message: string, exportContext: ImportedAuditVerification['exportContext']): ImportedAuditVerification {
  return { localDigest: 'invalid', receipt: 'metadata_mismatch', exportContext, message };
}

function exportContextMatches(report: JsonRecord, audit: JsonRecord, bundle: JsonRecord): boolean {
  if (report.exportType !== 'audit_report' || report.selectedSourceId !== audit.sourceId) return false;
  const status = report.sourceContextStatus;
  if (status !== 'bound_to_audit' && status !== 'omitted_dataset_mismatch') return false;
  const expectedSnapshotId = isRecord(bundle.intelligence) && typeof bundle.intelligence.datasetSnapshotId === 'string'
    ? bundle.intelligence.datasetSnapshotId
    : isRecord(bundle.provenance) && typeof bundle.provenance.snapshotId === 'string' ? bundle.provenance.snapshotId : undefined;
  const expectedArchiveHash = isRecord(bundle.provenance) && typeof bundle.provenance.archiveSha256 === 'string'
    ? bundle.provenance.archiveSha256 : undefined;
  const expectedInputHash = isRecord(bundle.intelligence) && typeof bundle.intelligence.datasetInputSha256 === 'string'
    ? bundle.intelligence.datasetInputSha256 : undefined;
  if (expectedSnapshotId || expectedArchiveHash || expectedInputHash) {
    if (!isRecord(report.sourceDataset)) return false;
    if (expectedSnapshotId && report.sourceDataset.snapshotId !== expectedSnapshotId) return false;
    if (expectedArchiveHash && report.sourceDataset.archiveSha256 !== expectedArchiveHash) return false;
    if (expectedInputHash && report.sourceDataset.inputFileSha256 !== expectedInputHash) return false;
    if (status === 'bound_to_audit' && expectedInputHash
      && report.sourceDataset.loadedInputFileSha256 !== expectedInputHash) return false;
  }

  if (!Array.isArray(report.observations)) return false;
  if (status === 'omitted_dataset_mismatch') {
    return report.observations.length === 0 && report.unlinkedObservationCount === null;
  }
  const intelligence = isRecord(bundle.intelligence) ? bundle.intelligence : undefined;
  const boundIds = Array.isArray(intelligence?.observationIds)
    ? intelligence.observationIds.filter((id): id is string => typeof id === 'string')
    : Array.isArray(bundle.citedEvidence)
      ? bundle.citedEvidence.filter((item): item is JsonRecord => isRecord(item) && item.kind === 'detection').map(item => item.id).filter((id): id is string => typeof id === 'string')
      : [];
  if (report.observations.length && !boundIds.length) return false;
  if (report.observations.some(item => !isRecord(item) || typeof item.id !== 'string' || !boundIds.includes(item.id))) return false;
  if (Array.isArray(intelligence?.observationTimeline)) {
    const dates = new Map(intelligence.observationTimeline.filter(isRecord)
      .filter(item => typeof item.id === 'string' && typeof item.observedAt === 'string')
      .map(item => [item.id as string, (item.observedAt as string).slice(0, 10)]));
    if (report.observations.some(item => isRecord(item) && typeof item.date === 'string' && dates.has(item.id as string)
      && dates.get(item.id as string) !== item.date.slice(0, 10))) return false;
  }
  return true;
}

/** Verify only the canonical audit bundle; exported envelope fields are deliberately outside its digest. */
export async function verifyImportedAuditReport(input: unknown): Promise<ImportedAuditVerification> {
  const isExport = isRecord(input) && Object.hasOwn(input, 'latestAudit');
  let exportContext: ImportedAuditVerification['exportContext'] = isExport ? 'not_in_audit_hash' : 'none';
  const audit = isExport ? input.latestAudit : input;
  if (!isRecord(audit) || !isRecord(audit.bundle)) return invalid('No audit bundle was found in this JSON file.', exportContext);

  const bundle = audit.bundle;
  const citedEvidence = bundle.citedEvidence;
  if ((bundle.schemaVersion !== 2 && bundle.schemaVersion !== 3)
    || typeof audit.bundleHash !== 'string' || !HEX_256.test(audit.bundleHash)
    || typeof audit.auditId !== 'string' || typeof audit.caseId !== 'string'
    || !Number.isSafeInteger(audit.revision) || typeof audit.sourceId !== 'string'
    || typeof audit.claimType !== 'string' || !CLAIM_TYPES.has(audit.claimType)
    || typeof audit.result !== 'string' || !RESULTS.has(audit.result)
    || typeof audit.reason !== 'string' || typeof audit.generatedAt !== 'string'
    || typeof audit.synthetic !== 'boolean' || !Array.isArray(audit.evidenceIds)
    || !audit.evidenceIds.every((id) => typeof id === 'string')
    || !Array.isArray(citedEvidence) || !citedEvidence.every((item) => isRecord(item) && typeof item.id === 'string')) {
    return invalid('The audit envelope or bundle has an unsupported or incomplete shape.', exportContext);
  }

  const fieldsMatch = audit.auditId === bundle.auditId
    && audit.caseId === bundle.caseId
    && audit.revision === bundle.revision
    && audit.sourceId === bundle.sourceId
    && audit.claimType === bundle.claimType
    && audit.result === bundle.result
    && audit.reason === bundle.reason
    && audit.generatedAt === bundle.generatedAt
    && audit.synthetic === bundle.synthetic
    && canonicalJson(audit.evidenceIds) === canonicalJson(citedEvidence.map((item) => item.id));
  if (!fieldsMatch) return invalid('Audit summary fields do not match the hashed bundle.', exportContext);

  if (isExport && isRecord(input)) {
    const integrity = await verifyExportIntegrity(input);
    if (integrity === 'invalid') return invalid('The report export checksum is invalid or does not match its context.', 'manifest_invalid');
    if (integrity === 'unavailable') exportContext = 'manifest_unavailable';
    if (integrity === 'valid') {
      if (!exportContextMatches(input, audit, bundle)) return invalid('The report export source, dataset snapshot, or observations do not match the saved audit.', 'manifest_invalid');
      exportContext = 'manifest_valid';
    }
  }

  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return { localDigest: 'unavailable', auditId: audit.auditId as string, revision: audit.revision as number,
    sourceId: audit.sourceId as string, bundleHash: audit.bundleHash as string, result: audit.result as string, claimType: audit.claimType as string, synthetic: audit.synthetic as boolean,
    reviewStatus: isRecord(bundle.intelligence) && typeof bundle.intelligence.reviewStatus === 'string' ? bundle.intelligence.reviewStatus : undefined,
    receipt: receiptStatus(audit), exportContext, message: 'This browser does not expose Web Crypto SHA-256; use the local CLI verifier.' };

  try {
    const bytes = new TextEncoder().encode(canonicalJson(bundle));
    const hashBuffer = await subtle.digest('SHA-256', bytes as BufferSource);
    const computed = `0x${Array.from(new Uint8Array(hashBuffer), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
    const shared = {
      auditId: audit.auditId as string,
      revision: audit.revision as number,
      sourceId: audit.sourceId as string,
      bundleHash: audit.bundleHash as string,
      result: audit.result as string,
      claimType: audit.claimType as string,
      synthetic: audit.synthetic as boolean,
      reviewStatus: isRecord(bundle.intelligence) && typeof bundle.intelligence.reviewStatus === 'string' ? bundle.intelligence.reviewStatus : undefined,
      receipt: receiptStatus(audit),
      exportContext,
    };
    return computed.toLowerCase() === audit.bundleHash.toLowerCase()
      ? { localDigest: 'valid', ...shared }
      : { localDigest: 'invalid', ...shared, message: `Bundle SHA-256 mismatch. Computed ${computed}.` };
  } catch {
    return { localDigest: 'unavailable', auditId: audit.auditId as string, revision: audit.revision as number,
      sourceId: audit.sourceId as string, bundleHash: audit.bundleHash as string, result: audit.result as string, claimType: audit.claimType as string, synthetic: audit.synthetic as boolean,
      receipt: receiptStatus(audit), exportContext, message: 'The audit bundle could not be encoded for SHA-256 verification.' };
  }
}
