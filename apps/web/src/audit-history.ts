import type { AuditResult } from '@methane/shared';

export function auditHistoryQueryKey(sourceId: string, privateHistoryEnabled: boolean, privateHistorySession: number) {
  return ['audit-history', sourceId, privateHistoryEnabled ? 'private' : 'public', privateHistoryEnabled ? privateHistorySession : 0] as const;
}

export function isPrivateAuditHistoryQuery(query: { queryKey: readonly unknown[] }): boolean {
  return query.queryKey[0] === 'audit-history' && query.queryKey[2] === 'private';
}

export function sortAuditHistory(audits: readonly AuditResult[]): AuditResult[] {
  return [...audits].sort((left, right) => {
    const leftTime = Date.parse(left.generatedAt);
    const rightTime = Date.parse(right.generatedAt);
    const timeDifference = (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
    return timeDifference || right.revision - left.revision || left.auditId.localeCompare(right.auditId);
  });
}

export function auditReviewLabel(audit: AuditResult): string {
  if (audit.bundle.schemaVersion === 4) return 'Human determination · private';
  const status = audit.bundle.schemaVersion === 3 ? audit.bundle.intelligence?.reviewStatus : undefined;
  switch (status) {
    case 'unreviewed': return 'AI suggestion · not reviewed';
    case 'approved': return 'Reviewer accepted';
    case 'rejected': return 'Reviewer rejected';
    case 'needs_more_evidence': return 'More evidence requested';
    default: return audit.bundle.scope?.recipient ? 'Rules baseline · named recipient private' : 'Rules baseline';
  }
}
