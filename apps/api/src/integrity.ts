import { createHash } from 'node:crypto';
import { validateAssessmentSemantics, type AuditResult } from '@methane/shared';
import { canonicalJson } from './canonical';

export function auditIntegrityValid(audit: AuditResult): boolean {
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
