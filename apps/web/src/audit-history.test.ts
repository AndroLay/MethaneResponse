import { expect, test } from 'bun:test';
import type { AuditResult } from '@methane/shared';
import { auditHistoryQueryKey, isPrivateAuditHistoryQuery, sortAuditHistory } from './audit-history';

function audit(auditId: string, revision: number, generatedAt: string, claimType: AuditResult['claimType'] = 'mitigation_confirmed') {
  return { auditId, revision, generatedAt, claimType } as AuditResult;
}

test('shows newest immutable audit revisions first without mutating the API result', () => {
  const older = audit('older', 1, '2026-10-12T10:00:00.000Z');
  const newer = audit('newer', 2, '2026-10-12T11:00:00.000Z');
  const otherClaim = audit('other-claim', 1, '2026-10-12T10:30:00.000Z', 'source_detected');
  const apiResult = [older, newer, otherClaim];

  expect(sortAuditHistory(apiResult)).toEqual([newer, otherClaim, older]);
  expect(apiResult).toEqual([older, newer, otherClaim]);
});

test('uses a fresh secret-free cache key for each private history session', () => {
  const firstUnlock = auditHistoryQueryKey('KAZ_S_159', true, 1);
  const secondUnlock = auditHistoryQueryKey('KAZ_S_159', true, 2);
  const locked = auditHistoryQueryKey('KAZ_S_159', false, 2);

  expect(firstUnlock).toEqual(['audit-history', 'KAZ_S_159', 'private', 1]);
  expect(secondUnlock).toEqual(['audit-history', 'KAZ_S_159', 'private', 2]);
  expect(secondUnlock).not.toEqual(firstUnlock);
  expect(locked).toEqual(['audit-history', 'KAZ_S_159', 'public', 0]);
  expect(isPrivateAuditHistoryQuery({ queryKey: secondUnlock })).toBe(true);
  expect(isPrivateAuditHistoryQuery({ queryKey: locked })).toBe(false);
});
