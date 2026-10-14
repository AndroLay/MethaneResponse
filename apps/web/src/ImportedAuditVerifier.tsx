import { useState, type ChangeEvent } from 'react';
import { verifyImportedAuditReport, type ImportedAuditVerification } from './imported-audit-verifier';

const MAX_REPORT_BYTES = 5 * 1024 * 1024;

function receiptLabel(status: ImportedAuditVerification['receipt']): string {
  if (status === 'not_present') return 'No blockchain receipt is included in this file.';
  if (status === 'metadata_matches_event_unverified') return 'Receipt metadata is consistent, but this browser has not verified the transaction or blockchain event.';
  return 'Receipt metadata is incomplete or does not match the transaction hash.';
}

export default function ImportedAuditVerifier() {
  const [verification, setVerification] = useState<ImportedAuditVerification | null>(null);
  const [checking, setChecking] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  async function checkFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    setVerification(null);
    setFileError(null);
    if (!file) return;
    if (file.size > MAX_REPORT_BYTES) {
      setFileError('The report exceeds the 5 MiB limit. Choose a smaller file.');
      return;
    }

    setChecking(true);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      setVerification(await verifyImportedAuditReport(parsed));
    } catch {
      setFileError('This file could not be read or verified. Choose a valid exported JSON report.');
    } finally {
      setChecking(false);
    }
  }

  return <section className="panel imported-audit-verifier" aria-labelledby="imported-audit-title">
    <div className="panel-head">
      <div>
        <div className="panel-title" id="imported-audit-title">Verify an exported report</div>
        <div className="panel-subtitle">Check an audit JSON file in this browser</div>
      </div>
    </div>
    <p className="imported-audit-intro">Choose an exported report to recompute the audit bundle’s SHA-256 digest and check it against the report summary. File contents are processed locally and are not uploaded.</p>
    <label className="imported-audit-file">
      <span>Choose a JSON audit report</span>
      <input type="file" accept=".json,application/json" aria-label="Choose a JSON audit report" onChange={event => void checkFile(event)}/>
      <small>Maximum file size: 5 MiB.</small>
    </label>
    {checking && <p className="imported-audit-state" role="status">Checking the audit digest…</p>}
    {fileError && <p className="imported-audit-state imported-audit-error" role="alert">{fileError}</p>}
    {verification?.localDigest === 'valid' && <div className="imported-audit-result imported-audit-valid" role="status">
      <strong>Audit bundle SHA-256 digest matches.</strong>
      <dl>
        <div><dt>Source</dt><dd>{verification.sourceId}</dd></div>
        <div><dt>Revision</dt><dd>{verification.revision}</dd></div>
        <div><dt>Claim</dt><dd>{verification.claimType?.replaceAll('_', ' ')}</dd></div>
        <div><dt>Result</dt><dd>{verification.result?.replaceAll('_', ' ')}</dd></div>
        {verification.historicalObservationCount !== undefined && <div><dt>Historical observations · context only</dt><dd>{verification.historicalObservationCount}</dd></div>}
        {verification.reviewStatus && <div><dt>Review</dt><dd>{verification.reviewStatus.replaceAll('_', ' ')}</dd></div>}
        <div className="imported-audit-hash"><dt>SHA-256</dt><dd>{verification.bundleHash}</dd></div>
      </dl>
      {verification.synthetic && <p className="imported-audit-caution"><strong>Synthetic DEMO</strong> · This report is not a real MARS case or evidence of mitigation.</p>}
      <p>{receiptLabel(verification.receipt)}</p>
      {verification.exportContext === 'not_in_audit_hash' && <p className="imported-audit-caution">Export wrapper fields—such as dataset metadata and observations outside the audit bundle—are not covered by the audit digest.</p>}
      {verification.exportContext === 'manifest_valid' && <p className="imported-audit-caution">The export SHA-256 checksum matches the dataset and observation context. This checksum is not signed or anchored to a blockchain.</p>}
      {verification.historicalObservationCount !== undefined && <p className="imported-audit-caution">Historical observations provide source context, not citations supporting a mitigation claim. The audit bundle digest does not cover this context list.</p>}
      {verification.exportContext === 'manifest_unavailable' && <p className="imported-audit-caution">The audit bundle is verifiable, but Web Crypto is unavailable to check the export context checksum.</p>}
      <p className="imported-audit-limit">This digest verifies the audit bundle against its stored hash. It does not verify document authenticity, physical mitigation, or emissions reductions.</p>
      {verification.receipt === 'metadata_matches_event_unverified' && <p className="imported-audit-limit">To verify the event and issuer on Sepolia, use the verifier CLI with a read-only RPC URL and the matching registry address.</p>}
    </div>}
    {verification?.localDigest === 'invalid' && <div className="imported-audit-result imported-audit-error" role="alert">
      <strong>Audit bundle verification failed.</strong>
      <p>{verification.message || 'The bundle digest or audit metadata does not match the report.'}</p>
    </div>}
    {verification?.localDigest === 'unavailable' && <div className="imported-audit-result imported-audit-caution" role="status">
      <strong>SHA-256 verification is unavailable in this browser.</strong>
      <p>{verification.message}</p>
    </div>}
  </section>;
}
