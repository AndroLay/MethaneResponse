import { isAuditPublic, type AuditResult } from '@methane/shared';

/** Preserve the existing public-history rule in one place for memory, file, SQL, and API paths. */
export function auditIsPubliclyReadable(audit: AuditResult): boolean {
  return isAuditPublic(audit);
}
