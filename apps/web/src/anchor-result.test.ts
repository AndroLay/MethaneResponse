import { expect, test } from 'bun:test';
import type { AuditReceipt, AuditResult } from '@methane/shared';
import { mergeAnchorResponse } from './anchor-result';

const audit = {
  auditId: 'audit-123', bundleHash: `0x${'a'.repeat(64)}`,
  anchored: false, bundle: { schemaVersion: 3 },
} as unknown as AuditResult;
const receipt: AuditReceipt = {
  chainId: 11155111,
  registryAddress: '0x0000000000000000000000000000000000000001',
  txHash: `0x${'1'.repeat(64)}`,
  issuer: '0x0000000000000000000000000000000000000002',
  version: 2,
  blockNumber: '1234',
};

test('merges a minimal scoped-reviewer receipt without dropping private report data', () => {
  const result = mergeAnchorResponse(audit, {
    status: 'anchored', auditId: audit.auditId, bundleHash: audit.bundleHash, receipt,
  });
  expect(result).toMatchObject({ auditId: audit.auditId, bundleHash: audit.bundleHash, anchored: true, chainTxHash: receipt.txHash, receipt });
  expect(result.bundle).toBe(audit.bundle);
});

test('rejects receipt metadata for another audit or an unverified full result', () => {
  expect(() => mergeAnchorResponse(audit, {
    status: 'anchored', auditId: 'other-audit', bundleHash: audit.bundleHash, receipt,
  })).toThrow('does not match');
  expect(() => mergeAnchorResponse(audit, { ...audit, auditId: 'other-audit', anchored: true, receipt })).toThrow('does not match');
});

test('rejects non-positive or unsafe receipt versions and insufficiently described confirmations', () => {
  for (const version of [0, -1, Number.MAX_SAFE_INTEGER + 1]) {
    expect(() => mergeAnchorResponse(audit, { status: 'anchored', auditId: audit.auditId, bundleHash: audit.bundleHash, receipt: { ...receipt, version } })).toThrow('does not match');
  }
  expect(() => mergeAnchorResponse(audit, { status: 'anchored', auditId: audit.auditId, bundleHash: audit.bundleHash, receipt: { ...receipt, confirmations: 0 } })).toThrow('does not match');
});
