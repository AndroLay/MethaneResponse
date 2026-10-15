import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chainConfigured, readReceipt, registryCaseId, verifyAnchorTransaction } from '../apps/api/src/chain';
import { validateDocumentRightsMetadata } from '../packages/shared/src/index';
import type { AuditResult } from '../packages/shared/src/index';

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
  return digest === audit.bundleHash
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
if (!reportPath) {
  console.error('Usage: bun run verify:audit <exported-audit-report.json>');
  process.exit(2);
}

try {
  const report = JSON.parse(await readFile(reportPath, 'utf8')) as { latestAudit?: AuditResult } | AuditResult;
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
  console.log(`document_rights_metadata: ${rightsMetadataError ? 'INVALID' : hasRightsDeclaration ? 'VALID' : 'NOT_RECORDED'}`);
  if (rightsMetadataError) {
    console.error(`document_rights_metadata: INVALID (${rightsMetadataError})`);
    process.exit(1);
  }
  console.log(`audit_id: ${audit.auditId}`);
  console.log(`revision: ${audit.revision}`);
  console.log(`sha256: ${audit.bundleHash}`);

  if (!audit.receipt) {
    console.log('chain_receipt: ABSENT');
  } else if (audit.chainTxHash !== audit.receipt.txHash) {
    console.error('chain_receipt: INVALID_METADATA');
    process.exit(1);
  } else if (!chainConfigured()) {
    console.log('chain_receipt: NOT_CHECKED (set SEPOLIA_RPC_URL and AUDIT_REGISTRY_ADDRESS)');
  } else {
    const caseId = registryCaseId(audit.caseId, audit.claimType);
    const event = await verifyAnchorTransaction(caseId, audit.bundleHash, audit.receipt);
    if (!event.valid) {
      console.error(`chain_receipt: INVALID (${event.reason})`);
      process.exit(1);
    }
    const latest = await readReceipt(caseId);
    const isLatest = latest.hash.toLowerCase() === audit.bundleHash.toLowerCase() && Number(latest.version) === audit.receipt.version;
    console.log(`chain_receipt: VALID_${isLatest ? 'LATEST' : 'HISTORICAL'}`);
    console.log(`issuer: ${audit.receipt.issuer}`);
    console.log(`transaction: ${audit.receipt.txHash}`);
    console.log(`block: ${audit.receipt.blockNumber}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Unable to verify audit report.');
  process.exit(1);
}
