import type { AuditResult } from '@methane/shared';
import { auditIsPubliclyReadable } from './audit-visibility';

export const DEFAULT_AUDIT_PAGE_SIZE = 50;
export const MAX_AUDIT_PAGE_SIZE = 100;

export type AuditCursor = { generatedAt: string; auditId: string };
export type AuditVisibility = 'all' | 'public';
export type AuditPageOptions = {
  limit: number;
  before?: AuditCursor | null;
  visibility: AuditVisibility;
};
export type AuditPage = {
  audits: AuditResult[];
  nextCursor: AuditCursor | null;
  hasMore: boolean;
};

function compareAuditCursor(left: AuditCursor, right: AuditCursor): number {
  const timeDifference = Date.parse(left.generatedAt) - Date.parse(right.generatedAt);
  return timeDifference || left.auditId.localeCompare(right.auditId);
}

export function pageAuditRecords(records: readonly AuditResult[], options: AuditPageOptions): AuditPage {
  const visible = records
    .filter(audit => options.visibility !== 'public' || auditIsPubliclyReadable(audit))
    .filter(audit => !options.before || compareAuditCursor(audit, options.before) < 0)
    .sort((left, right) => compareAuditCursor(right, left));
  const hasMore = visible.length > options.limit;
  const audits = visible.slice(0, options.limit);
  const last = audits.at(-1);
  return {
    audits,
    hasMore,
    nextCursor: hasMore && last ? { generatedAt: last.generatedAt, auditId: last.auditId } : null,
  };
}

export function encodeAuditCursor(cursor: AuditCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeAuditCursor(value: string): AuditCursor | null {
  if (!value || value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    if (Object.keys(record).length !== 2 || typeof record.generatedAt !== 'string' || typeof record.auditId !== 'string') return null;
    if (!Number.isFinite(Date.parse(record.generatedAt)) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(record.auditId)) return null;
    return { generatedAt: record.generatedAt, auditId: record.auditId };
  } catch {
    return null;
  }
}

/** Returns null when omitted (legacy unpaged response) or when outside the public bound. */
export function parseAuditPageLimit(value: string | undefined): number | null {
  if (value === undefined) return null;
  if (!/^[1-9]\d{0,2}$/.test(value)) return null;
  const parsed = Number(value);
  return parsed <= MAX_AUDIT_PAGE_SIZE ? parsed : null;
}
