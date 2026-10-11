import { readFile } from 'node:fs/promises';
import { auditIntegrityValid } from '../apps/api/src/integrity';
import { chainConfigured, readReceipt, registryCaseId, verifyAnchorTransaction } from '../apps/api/src/chain';
import type { AuditResult } from '../packages/shared/src/index';

const reportPath = process.argv[2];
if (!reportPath) {
  console.error('Usage: bun run verify:audit <exported-audit-report.json>');
  process.exit(2);
}

try {
  const report = JSON.parse(await readFile(reportPath, 'utf8')) as { latestAudit?: AuditResult } | AuditResult;
  const audit = ('latestAudit' in report ? report.latestAudit : report) as AuditResult | undefined;
  if (!audit?.bundle || !audit.bundleHash) throw new Error('No audit bundle was found in this JSON file.');
  if (!auditIntegrityValid(audit)) {
    console.error('bundle_hash: INVALID');
    process.exit(1);
  }
  console.log('bundle_hash: VALID');
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
