import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chainConfigured, readReceipt, registryCaseId, verifyAnchorTransaction } from '../apps/api/src/chain';
import { TransparencyRecord, validateAssessmentSemantics, validateDocumentRightsMetadata } from '../packages/shared/src/index';
import type { AuditResult } from '../packages/shared/src/index';
import { verifyExportIntegrity } from '../apps/web/src/report-export';

// Keep offline bundle verification local to this CLI. Users can check exported
// reports without asking the API that created them to attest to its own digest.
function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((item) => item === undefined ? 'null' : canonicalJson(item)).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const fields = Object.keys(record).filter((key) => record[key] !== undefined).sort();
    return `{${fields.map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
  }
  throw new TypeError(`Value of type ${typeof value} cannot be encoded as canonical JSON`);
}

function verifyBundleIntegrity(audit: AuditResult): boolean {
  const bundle = audit.bundle;
  const digest = `0x${createHash('sha256').update(canonicalJson(bundle)).digest('hex')}`;
  return !validateAssessmentSemantics(bundle) && digest === audit.bundleHash
    && audit.auditId === bundle.auditId
    && audit.caseId === bundle.caseId
    && audit.revision === bundle.revision
    && audit.sourceId === bundle.sourceId
    && audit.claimType === bundle.claimType
    && audit.result === bundle.result
    && audit.reason === bundle.reason
    && audit.generatedAt === bundle.generatedAt
    && audit.synthetic === bundle.synthetic
    && canonicalJson(audit.evidenceIds) === canonicalJson(bundle.citedEvidence.map((item) => item.id));
}

const reportPath = process.argv[2];
const flags = process.argv.slice(3);
if (flags.some(flag => !['--require-chain', '--require-context'].includes(flag)) || new Set(flags).size !== flags.length) {
  console.error('Unknown or repeated option; use --require-chain and/or --require-context.');
  process.exit(2);
}
const requireChain = flags.includes('--require-chain');
const requireContext = flags.includes('--require-context');
if (!reportPath) {
  console.error('Usage: bun run verify:audit <exported-audit-report.json> [--require-chain] [--require-context]');
  process.exit(2);
}

try {
  const report = JSON.parse(await readFile(reportPath, 'utf8')) as { latestAudit?: AuditResult } | AuditResult;
  if (report && typeof report === 'object' && 'summary' in report) {
    const parsed = TransparencyRecord.safeParse(report);
    if (!parsed.success || `0x${createHash('sha256').update(canonicalJson(parsed.data.summary)).digest('hex')}` !== parsed.data.summaryHash) {
      console.error('summary_hash: INVALID'); process.exit(1);
    }
    console.log('summary_hash: VALID');
    console.log('publication_status: NOT_CHECKED (offline historical summary; check the current API publication status)');
    console.log('A matching checksum does not authenticate publication metadata, issuer identity or physical truth.');
    if (requireContext) { console.error('export_context_checksum: REQUIRED (a redacted summary contains no audit export context)'); process.exit(1); }
    if (requireChain) { console.error('chain_receipt: REQUIRED (a redacted summary contains no public chain receipt)'); process.exit(1); }
    process.exit(0);
  }
  const audit = ('latestAudit' in report ? report.latestAudit : report) as AuditResult | undefined;
  if (!audit?.bundle || !audit.bundleHash) throw new Error('No audit bundle was found in this JSON file.');
  const rightsMetadataError = validateDocumentRightsMetadata(audit.bundle);
  const documentDigests = audit.bundle.intelligence?.documentDigests;
  const hasRightsDeclaration = !rightsMetadataError && Array.isArray(documentDigests)
    && documentDigests.some((item) => item.rightsDeclared !== undefined);
  if (!verifyBundleIntegrity(audit)) {
    console.error('bundle_hash: INVALID');
    process.exit(1);
  }
  console.log('bundle_hash: VALID');
  const isWrapper = 'latestAudit' in report;
  const contextStatus = isWrapper ? await verifyExportIntegrity(report as Record<string, unknown>) : 'absent';
  if (contextStatus === 'invalid' || contextStatus === 'unavailable') {
    console.error(`export_context_checksum: ${contextStatus.toUpperCase()}`);
    process.exit(1);
  }
  if (contextStatus === 'valid') {
    console.log('export_context_checksum: VALID');
    console.log('The export checksum is unsigned; it does not authenticate an issuer or physical truth.');
  } else {
    console.log('export_context_checksum: NOT_RECORDED');
    console.log('Wrapper fields are outside the audit bundle digest unless an export context checksum is recorded.');
    if (requireContext) { console.error('export_context_checksum: REQUIRED'); process.exit(1); }
  }
  if (isWrapper) {
    const context = report as Record<string, unknown>;
    const dataset = context.sourceDataset && typeof context.sourceDataset === 'object' && !Array.isArray(context.sourceDataset)
      ? context.sourceDataset as Record<string, unknown> : undefined;
    const expectedDataset = {
      snapshotId: audit.bundle.intelligence?.datasetSnapshotId || audit.bundle.provenance?.snapshotId || null,
      archiveSha256: audit.bundle.provenance?.archiveSha256 || null,
      inputFileSha256: audit.bundle.intelligence?.datasetInputSha256 || null,
    };
    const datasetMismatch = dataset && Object.entries(expectedDataset).some(([key, value]) => key in dataset && dataset[key] !== value);
    if (('claim' in context && context.claim !== audit.claimType)
      || ('selectedSourceId' in context && context.selectedSourceId !== audit.sourceId)
      || ('synthetic' in context && context.synthetic !== audit.synthetic)
      || datasetMismatch) {
      console.error('export_context_fields: MISMATCH');
      process.exit(1);
    }
  }
  console.log(`document_rights_metadata: ${rightsMetadataError ? 'INVALID' : hasRightsDeclaration ? 'VALID' : 'NOT_RECORDED'}`);
  if (rightsMetadataError) {
    console.error(`document_rights_metadata: INVALID (${rightsMetadataError})`);
    process.exit(1);
  }
  console.log(`audit_id: ${audit.auditId}`);
  console.log(`revision: ${audit.revision}`);
  console.log(`sha256: ${audit.bundleHash}`);

  if (requireChain && (!audit.receipt || !chainConfigured())) {
    console.error('chain_receipt: REQUIRED (receipt and configured network are required)');
    process.exit(1);
  }
  if (!audit.receipt) {
    console.log('chain_receipt: ABSENT');
  } else if (audit.chainTxHash !== audit.receipt.txHash) {
    console.error('chain_receipt: INVALID_METADATA');
    process.exit(1);
  } else if (!chainConfigured()) {
    console.log('chain_receipt: NOT_CHECKED (set SEPOLIA_RPC_URL and AUDIT_REGISTRY_ADDRESS)');
  } else {
    if (!audit.anchored) { console.error('chain_receipt: INVALID_METADATA'); process.exit(1); }
    const caseId = registryCaseId(audit.caseId, audit.claimType);
    const event = await verifyAnchorTransaction(caseId, audit.bundleHash, audit.receipt);
    if (!event.valid) {
      console.error(`chain_receipt: INVALID (${event.reason})`);
      process.exit(1);
    }
    const latest = await readReceipt(caseId);
    const isLatest = latest.hash.toLowerCase() === audit.bundleHash.toLowerCase() && Number(latest.version) === audit.receipt.version;
    console.log(`chain_receipt: VALID_${isLatest ? 'LATEST' : 'HISTORICAL'}`);
    console.log(`network: ${audit.receipt.chainId === 31337 ? 'LOCAL_DEVELOPMENT' : 'SEPOLIA_TESTNET'} (${audit.receipt.chainId})`);
    console.log(`registry: ${audit.receipt.registryAddress}`);
    console.log(`version: ${audit.receipt.version}`);
    console.log(`confirmation_policy: ${audit.receipt.confirmations ?? 'current verifier policy'}`);
    console.log(`issuer: ${audit.receipt.issuer}`);
    console.log(`transaction: ${audit.receipt.txHash}`);
    console.log(`block: ${audit.receipt.blockNumber}`);
  }
} catch (error) {
  console.error('Unable to verify audit report or reach the configured chain; no receipt was accepted.');
  process.exit(1);
}
