import { describe, expect, test } from 'bun:test';
import type { AuditResult } from '@methane/shared';
import { decodeAuditCursor, encodeAuditCursor, pageAuditRecords, parseAuditPageLimit } from './audit-pagination';

function audit(auditId: string, generatedAt: string): AuditResult {
  return { auditId, generatedAt, bundle: { schemaVersion: 2 } } as AuditResult;
}

describe('audit pagination', () => {
  test('orders newest first and returns a stable cursor for the next page', () => {
    const records = [
      audit('00000000-0000-4000-8000-000000000001', '2026-10-10T00:00:00.000Z'),
      audit('00000000-0000-4000-8000-000000000002', '2026-10-12T00:00:00.000Z'),
      audit('00000000-0000-4000-8000-000000000003', '2026-10-11T00:00:00.000Z'),
    ];

    const first = pageAuditRecords(records, { limit: 2, visibility: 'all' });
    expect(first.audits.map(item => item.auditId)).toEqual([
      '00000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000003',
    ]);
    expect(first.hasMore).toBe(true);
    expect(first.nextCursor).toEqual({
      generatedAt: '2026-10-11T00:00:00.000Z',
      auditId: '00000000-0000-4000-8000-000000000003',
    });

    const second = pageAuditRecords(records, { limit: 2, visibility: 'all', before: first.nextCursor! });
    expect(second.audits.map(item => item.auditId)).toEqual(['00000000-0000-4000-8000-000000000001']);
    expect(second.hasMore).toBe(false);
    expect(second.nextCursor).toBeNull();
  });

  test('uses audit ID as a deterministic tie breaker for equal timestamps', () => {
    const records = [
      audit('00000000-0000-4000-8000-000000000001', '2026-10-12T00:00:00.000Z'),
      audit('00000000-0000-4000-8000-000000000003', '2026-10-12T00:00:00.000Z'),
      audit('00000000-0000-4000-8000-000000000002', '2026-10-12T00:00:00.000Z'),
    ];
    const page = pageAuditRecords(records, { limit: 2, visibility: 'all' });
    expect(page.audits.map(item => item.auditId)).toEqual([
      '00000000-0000-4000-8000-000000000003',
      '00000000-0000-4000-8000-000000000002',
    ]);
    expect(page.nextCursor?.auditId).toBe('00000000-0000-4000-8000-000000000002');
  });

  test('filters private drafts before deciding whether another public page exists', () => {
    const privateDraft = {
      ...audit('00000000-0000-4000-8000-000000000009', '2026-10-13T00:00:00.000Z'),
      bundle: {
        schemaVersion: 3,
        intelligence: { reviewStatus: 'unreviewed', citationPublication: { status: 'private', authorConsent: false } },
      },
    } as unknown as AuditResult;
    const publicRecords = [
      audit('00000000-0000-4000-8000-000000000001', '2026-10-10T00:00:00.000Z'),
      audit('00000000-0000-4000-8000-000000000002', '2026-10-11T00:00:00.000Z'),
    ];
    const page = pageAuditRecords([...publicRecords, privateDraft], { limit: 2, visibility: 'public' });
    expect(page.audits.map(item => item.auditId)).toEqual([
      '00000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000001',
    ]);
    expect(page.hasMore).toBe(false);
    expect(page.audits.some(item => item.auditId === privateDraft.auditId)).toBe(false);
  });

  test('round trips an opaque cursor and rejects malformed values', () => {
    const cursor = { generatedAt: '2026-10-12T00:00:00.000Z', auditId: '00000000-0000-4000-8000-000000000002' };
    expect(decodeAuditCursor(encodeAuditCursor(cursor))).toEqual(cursor);
    expect(decodeAuditCursor('not-a-cursor')).toBeNull();
    expect(decodeAuditCursor(Buffer.from('{"generatedAt":"bad"}').toString('base64url'))).toBeNull();
  });

  test('accepts only bounded positive integer page sizes', () => {
    expect(parseAuditPageLimit(undefined)).toBeNull();
    expect(parseAuditPageLimit('1')).toBe(1);
    expect(parseAuditPageLimit('100')).toBe(100);
    expect(parseAuditPageLimit('0')).toBeNull();
    expect(parseAuditPageLimit('101')).toBeNull();
    expect(parseAuditPageLimit('1.5')).toBeNull();
    expect(parseAuditPageLimit('-2')).toBeNull();
  });
});
