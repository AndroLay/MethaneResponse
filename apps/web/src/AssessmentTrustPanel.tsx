import { useState } from 'react';
import type { AuditResult, ReviewerAssurance } from '@methane/shared';
import { makeTransparencyRecord, downloadTransparencyRecord } from './transparency';

export const reviewerStatusLabel: Record<ReviewerAssurance['status'], string> = {
  unverified: 'Identity not attested', operator_attested: 'Operator-attested identity and claim authority',
  expired: 'Directory attestation expired', revoked: 'Directory approval revoked', outside_authority: 'Outside approved claim authority',
  directory_unavailable: 'Reviewer directory unavailable',
};
export default function AssessmentTrustPanel({ audit }: { audit: AuditResult }) {
  const [error, setError] = useState('');
  const trust = audit.bundle.humanAssessment?.trust;
  if (!trust) return <p>Reviewer identity and reference checks were not recorded in this legacy revision.</p>;
  async function download() {
    try { const record = await makeTransparencyRecord(audit); if (record) downloadTransparencyRecord(record); }
    catch { setError('Summary could not be hashed. Use a browser with Web Crypto on HTTPS or localhost.'); }
  }
  return <section className="assessment-trust" aria-label="Assessment trust record">
    <h4>Evidence and reviewer assurance</h4>
    <p><strong>{reviewerStatusLabel[trust.reviewer.status]}</strong> · recorded at assessment time.</p>
    {trust.reviewer.expiresAt && <p>Directory approval expiry: {trust.reviewer.expiresAt}</p>}
    <p>Conflict declaration: {trust.conflictDeclaration.replaceAll('_', ' ')} · self-reported.</p>
    <ul>{trust.referenceChecks.map((check, index) => <li key={`${check.reference}-${index}`}>
      <strong>Reference check {index + 1}: {check.status.replaceAll('_', ' ')}</strong>
      <small>{check.checkedAt}{check.publisherHost ? ` · ${check.publisherHost}` : ''}</small>
      {check.sha256 && <code>{check.sha256}</code>}
    </li>)}</ul>
    {!trust.referenceChecks.length && <p>No reference retrieval checks recorded.</p>}
    <p>Retrieval checks publisher origin and bytes. Directory approval is an operator attestation. These do not certify document truth, reviewer independence or physical mitigation.</p>
    {trust.publicSummaryConsent ? <><p>A redacted summary is publicly readable for this revision. Full references and reasoning stay private.</p><button className="outline-btn" type="button" onClick={() => void download()}>Download redacted public summary</button></> : <p>No public summary consent recorded for this revision.</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
