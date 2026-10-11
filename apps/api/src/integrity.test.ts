import { describe, expect, test } from 'bun:test';
import { DEMO_SOURCES } from '@methane/shared';
import { createAudit } from './audit';
import { auditIntegrityValid } from './integrity';

describe('audit bundle integrity', () => {
  const audit = createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' });

  test('accepts an unchanged canonical audit bundle', () => {
    expect(auditIntegrityValid(audit)).toBe(true);
  });

  test('rejects changes to either the bundle or its duplicated result fields', () => {
    expect(auditIntegrityValid({ ...audit, result: 'contradicted' })).toBe(false);
    expect(auditIntegrityValid({ ...audit, bundle: { ...audit.bundle, reason: 'changed' } })).toBe(false);
  });
});
