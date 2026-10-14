import type { AuditResult } from '@methane/shared';

/** Preserve the existing public-history rule in one place for memory, file, SQL, and API paths. */
export function auditIsPubliclyReadable(audit: AuditResult): boolean {
  if (audit.bundle.schemaVersion === 2) return true;
  if (audit.bundle.schemaVersion !== 3) return false;
  const intelligence = audit.bundle.intelligence;
  const publication = intelligence?.citationPublication;
  return intelligence?.reviewStatus === 'approved'
    && publication?.status === 'public'
    && publication.authorConsent === true;
}
