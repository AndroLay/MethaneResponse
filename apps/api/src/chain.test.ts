import { describe, expect, test } from 'bun:test';
import { type AuditReceipt } from '@methane/shared';
import { type Hex } from 'viem';
import { anchorReceiptMatches, registryCaseId } from './chain';

describe('registry case IDs', () => {
  test('binds a stable case and claim category to its receipt record', () => {
    const first = registryCaseId('MARS-REPORT-KAZ-S-159', 'source_detected');
    expect(first).toMatch(/^0x[a-f0-9]{64}$/);
    expect(registryCaseId('MARS-REPORT-KAZ-S-159', 'source_detected')).toBe(first);
    expect(registryCaseId('MARS-REPORT-KAZ-S-159', 'mitigation_confirmed')).not.toBe(first);
    expect(registryCaseId('MARS-REPORT-LBY-S-143', 'source_detected')).not.toBe(first);
  });
});

describe('historical receipt verification', () => {
  const caseId = registryCaseId('MARS-REPORT-KAZ-S-159', 'source_detected');
  const bundleHash = `0x${'a'.repeat(64)}` as Hex;
  const otherHash = `0x${'b'.repeat(64)}` as Hex;
  const txHash = `0x${'1'.repeat(64)}` as Hex;
  const issuer = '0x00000000000000000000000000000000000000aa' as const;
  const receipt: AuditReceipt = {
    chainId: 11155111,
    registryAddress: '0x0000000000000000000000000000000000000001',
    txHash,
    issuer,
    version: 4,
    blockNumber: '1234',
  };
  const event = { caseId, issuer, bundleHash, version: 4n };
  const transaction = { txHash, status: 'success' as const, blockNumber: 1234n };

  test('accepts the exact historical transaction and matching event metadata', () => {
    expect(anchorReceiptMatches(caseId, bundleHash, receipt, event, transaction)).toBe(true);
  });

  test('rejects mismatched bundle, case, issuer, version, block, transaction or status', () => {
    expect(anchorReceiptMatches(caseId, otherHash, receipt, event, transaction)).toBe(false);
    expect(anchorReceiptMatches(caseId, bundleHash, receipt, { ...event, caseId: registryCaseId('MARS-REPORT-LBY-S-143', 'source_detected') }, transaction)).toBe(false);
    expect(anchorReceiptMatches(caseId, bundleHash, receipt, { ...event, issuer: '0x00000000000000000000000000000000000000bb' }, transaction)).toBe(false);
    expect(anchorReceiptMatches(caseId, bundleHash, receipt, { ...event, version: 5n }, transaction)).toBe(false);
    expect(anchorReceiptMatches(caseId, bundleHash, receipt, event, { ...transaction, blockNumber: 1235n })).toBe(false);
    expect(anchorReceiptMatches(caseId, bundleHash, receipt, event, { ...transaction, txHash: `0x${'2'.repeat(64)}` as Hex })).toBe(false);
    expect(anchorReceiptMatches(caseId, bundleHash, receipt, event, { ...transaction, status: 'reverted' })).toBe(false);
  });
});
