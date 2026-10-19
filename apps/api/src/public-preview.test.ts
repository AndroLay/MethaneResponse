import { describe, expect, test } from 'bun:test';
import { AuditInput } from '@methane/shared';
import { isPublicPreviewAuditAllowed, PUBLIC_PREVIEW_SOURCE_IDS } from './public-preview';

const input = (overrides: Record<string, unknown> = {}) => AuditInput.parse({
  sourceId: 'KAZ_S_159',
  claimType: 'mitigation_confirmed',
  ...overrides,
});

describe('public preview audit policy', () => {
  test('allows the three curated historical cases for supported public claim workflows', () => {
    for (const sourceId of PUBLIC_PREVIEW_SOURCE_IDS) {
      expect(isPublicPreviewAuditAllowed(input({ sourceId, claimType: 'source_detected' }))).toBe(true);
      expect(isPublicPreviewAuditAllowed(input({ sourceId, claimType: 'mitigation_confirmed' }))).toBe(true);
    }
  });

  test('rejects uncurated sources, recipient claims, and private recipient scope', () => {
    expect(isPublicPreviewAuditAllowed(input({ sourceId: 'AFG_S_001' }))).toBe(false);
    expect(isPublicPreviewAuditAllowed(input({ claimType: 'operator_notified' }))).toBe(false);
    expect(isPublicPreviewAuditAllowed(input({ scope: {
      startDate: '2024-06-07', endDate: '2026-10-14', recipient: 'Private operator contact',
    } }))).toBe(false);
  });
});
