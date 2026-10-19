import { assessmentPresentation, type AuditResult, type Evidence } from '@methane/shared';
import { auditReviewLabel } from './audit-history';

export type AuditDifference = { field: string; before: string; after: string };
export type AuditComparison = {
  comparable: boolean;
  notice?: string;
  differences: AuditDifference[];
  added: Evidence[];
  removed: Evidence[];
  changed: Evidence[];
  snapshotChanged: boolean;
  recordedParent: boolean;
};

const snapshot = (audit: AuditResult) => audit.bundle.intelligence?.datasetSnapshotId || audit.bundle.provenance?.snapshotId || 'Not recorded';
const archiveHash = (audit: AuditResult) => audit.bundle.provenance?.archiveSha256 || 'Not recorded';
const citationKey = (item: Evidence) => JSON.stringify([item.kind, item.id]);
const citationValue = (item: Evidence) => JSON.stringify([item.kind, item.id, item.claimType, item.title, item.reference, item.date, item.synthetic, item.locator, item.observationId, item.recipient, item.action, item.followUpDate, item.followUpReference]);
const documentSet = (audit: AuditResult) => JSON.stringify((audit.bundle.intelligence?.documentDigests || [])
  .map(item => [item.id, item.sha256, item.originalFileSha256, item.sourceUrl]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
const quotationSet = (audit: AuditResult) => JSON.stringify((audit.bundle.intelligence?.quotations || [])
  .map(item => [item.documentId, item.quote, item.quoteSha256]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));

/** Compare saved contents, never recompute a verdict or authenticate either revision. */
export function compareAuditRevisions(before: AuditResult, after: AuditResult): AuditComparison {
  const empty: AuditComparison = { comparable: false, differences: [], added: [], removed: [], changed: [], snapshotChanged: false, recordedParent: false };
  if (before.sourceId !== after.sourceId || before.claimType !== after.claimType || before.synthetic !== after.synthetic) {
    return { ...empty, notice: 'Choose two assessments for the same source, claim and real/demo mode.' };
  }
  if (before.auditId === after.auditId) return { ...empty, notice: 'Choose two different saved assessments.' };
  const oldCitations = new Map(before.bundle.citedEvidence.map(item => [citationKey(item), item]));
  const newCitations = new Map(after.bundle.citedEvidence.map(item => [citationKey(item), item]));
  const added = [...newCitations].filter(([key]) => !oldCitations.has(key)).map(([, item]) => item);
  const removed = [...oldCitations].filter(([key]) => !newCitations.has(key)).map(([, item]) => item);
  const changed = [...newCitations].filter(([key, item]) => oldCitations.has(key) && citationValue(item) !== citationValue(oldCitations.get(key)!)).map(([, item]) => item);
  const differences: AuditDifference[] = [];
  const add = (field: string, left: string | undefined, right: string | undefined) => {
    if (left !== right) differences.push({ field, before: left || 'Not recorded', after: right || 'Not recorded' });
  };
  add('Assessment', assessmentPresentation(before.bundle).resultLabel, assessmentPresentation(after.bundle).resultLabel);
  add('Assessment basis', assessmentPresentation(before.bundle).basisLabel, assessmentPresentation(after.bundle).basisLabel);
  add('Reason', before.reason, after.reason);
  add('Human review', auditReviewLabel(before), auditReviewLabel(after));
  add('Reviewer identity', before.bundle.humanAssessment?.reviewerId || before.bundle.intelligence?.review?.reviewerId, after.bundle.humanAssessment?.reviewerId || after.bundle.intelligence?.review?.reviewerId);
  add('Event / period scope', before.bundle.scope ? JSON.stringify(before.bundle.scope) : 'Unbounded source-level assessment', after.bundle.scope ? JSON.stringify(after.bundle.scope) : 'Unbounded source-level assessment');
  add('Next evidence request', before.bundle.humanAssessment?.nextEvidenceRequest, after.bundle.humanAssessment?.nextEvidenceRequest);
  add('Reviewer note', before.bundle.intelligence?.review?.note, after.bundle.intelligence?.review?.note);
  add('Dataset snapshot', snapshot(before), snapshot(after));
  add('Source archive hash', archiveHash(before), archiveHash(after));
  add('Dataset input hash', before.bundle.intelligence?.datasetInputSha256, after.bundle.intelligence?.datasetInputSha256);
  add('Case binding', before.caseId, after.caseId);
  add('Assessment method', before.bundle.humanAssessment ? 'Human evidence assessment' : before.bundle.intelligence ? `Document model · ${before.bundle.intelligence.modelVersion} · ${before.bundle.intelligence.promptVersion}` : 'Rules baseline',
    after.bundle.humanAssessment ? 'Human evidence assessment' : after.bundle.intelligence ? `Document model · ${after.bundle.intelligence.modelVersion} · ${after.bundle.intelligence.promptVersion}` : 'Rules baseline');
  add('Claim wording', before.bundle.humanAssessment?.claimText || before.bundle.intelligence?.claimText, after.bundle.humanAssessment?.claimText || after.bundle.intelligence?.claimText);
  if (documentSet(before) !== documentSet(after)) differences.push({ field: 'Document inputs', before: `${before.bundle.intelligence?.documentDigests.length || 0} documents`, after: `${after.bundle.intelligence?.documentDigests.length || 0} documents · input set changed` });
  if (quotationSet(before) !== quotationSet(after)) differences.push({ field: 'Quoted passages', before: `${before.bundle.intelligence?.quotations.length || 0} passages`, after: `${after.bundle.intelligence?.quotations.length || 0} passages · quotation set changed` });
  return {
    comparable: true, differences, added, removed, changed,
    snapshotChanged: snapshot(before) !== snapshot(after) || archiveHash(before) !== archiveHash(after) || before.bundle.intelligence?.datasetInputSha256 !== after.bundle.intelligence?.datasetInputSha256,
    recordedParent: (after.bundle.humanAssessment?.parentBundleHash || after.bundle.intelligence?.review?.parentBundleHash) === before.bundleHash,
  };
}
