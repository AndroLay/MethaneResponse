import { describe, expect, test } from 'bun:test';
import { type AuditReceipt } from '@methane/shared';
import { type Hex } from 'viem';
import { anchorReceipt, anchorReceiptMatches, assertSepoliaChainId, chainConfigured, chainWriteConfigured, isAllowedChainRpcUrl, readReceipt, registryCaseId, verifyAnchorTransaction } from './chain';

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

test('Sepolia writer readiness requires a valid HTTPS RPC, registry and private key', () => {
  const names = ['SEPOLIA_RPC_URL', 'AUDIT_REGISTRY_ADDRESS', 'SEPOLIA_PRIVATE_KEY'] as const;
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  try {
    process.env.SEPOLIA_RPC_URL = 'https://rpc.example/sepolia';
    process.env.AUDIT_REGISTRY_ADDRESS = '0x0000000000000000000000000000000000000001';
    delete process.env.SEPOLIA_PRIVATE_KEY;
    expect(chainConfigured()).toBe(true);
    expect(chainWriteConfigured()).toBe(false);
    process.env.SEPOLIA_PRIVATE_KEY = `0x${'1'.repeat(64)}`;
    expect(chainWriteConfigured()).toBe(true);
    process.env.SEPOLIA_PRIVATE_KEY = `0x${'0'.repeat(64)}`;
    expect(chainWriteConfigured()).toBe(false);
    process.env.SEPOLIA_RPC_URL = 'http://rpc.example/sepolia';
    expect(chainConfigured()).toBe(false);
    expect(chainWriteConfigured()).toBe(false);
  } finally {
    for (const name of names) {
      const value = previous[name];
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});

test('RPC configuration rejects insecure public transport and embedded credentials', () => {
  expect(isAllowedChainRpcUrl('https://rpc.example')).toBe(true);
  expect(isAllowedChainRpcUrl('http://127.0.0.1:8545')).toBe(true);
  expect(isAllowedChainRpcUrl('http://rpc.example')).toBe(false);
  expect(isAllowedChainRpcUrl('https://user:secret@rpc.example')).toBe(false);
  expect(isAllowedChainRpcUrl('not-a-url')).toBe(false);
});

test('configured RPC must identify the expected Sepolia chain', () => {
  expect(() => assertSepoliaChainId(11155111)).not.toThrow();
  for (const wrongChainId of [1, 31337, 0]) {
    expect(() => assertSepoliaChainId(wrongChainId)).toThrow('RPC chain ID mismatch');
  }
});

test('receipt reads stop before contract access when the RPC reports another chain', async () => {
  const names = ['SEPOLIA_RPC_URL', 'AUDIT_REGISTRY_ADDRESS', 'SEPOLIA_PRIVATE_KEY'] as const;
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const originalFetch = globalThis.fetch;
  const methods: string[] = [];
  process.env.SEPOLIA_RPC_URL = 'http://127.0.0.1:18545';
  process.env.AUDIT_REGISTRY_ADDRESS = '0x0000000000000000000000000000000000000001';
  process.env.SEPOLIA_PRIVATE_KEY = `0x${'1'.repeat(64)}`;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const request = JSON.parse(String(init?.body)) as { method: string; id: number };
    methods.push(request.method);
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: '0x1' }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  try {
    await expect(readReceipt(registryCaseId('case-rpc-mismatch', 'source_detected')))
      .rejects.toThrow('RPC chain ID mismatch');
    expect(methods).toEqual(['eth_chainId']);
    methods.length = 0;
    await expect(anchorReceipt(registryCaseId('case-rpc-mismatch', 'source_detected'), `0x${'a'.repeat(64)}` as Hex))
      .rejects.toThrow('RPC chain ID mismatch');
    expect(methods).toEqual(['eth_chainId']);
    methods.length = 0;
    const receipt: AuditReceipt = {
      chainId: 11155111,
      registryAddress: '0x0000000000000000000000000000000000000001',
      txHash: `0x${'2'.repeat(64)}`,
      issuer: '0x0000000000000000000000000000000000000002',
      version: 1,
      blockNumber: '123',
    };
    await expect(verifyAnchorTransaction(
      registryCaseId('case-rpc-mismatch', 'source_detected'), `0x${'a'.repeat(64)}` as Hex, receipt,
    )).rejects.toThrow('RPC chain ID mismatch');
    expect(methods).toEqual(['eth_chainId']);
  } finally {
    globalThis.fetch = originalFetch;
    for (const name of names) {
      const value = previous[name];
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});
