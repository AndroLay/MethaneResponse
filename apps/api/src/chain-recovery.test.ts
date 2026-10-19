import { expect, test } from 'bun:test';
import * as chain from './chain';

test('a configured signer requires an explicit chain write opt-in', () => {
  const names = ['SEPOLIA_RPC_URL', 'AUDIT_REGISTRY_ADDRESS', 'SEPOLIA_PRIVATE_KEY', 'ENABLE_CHAIN_WRITES'];
  const before = names.map(n => process.env[n]);
  try {
    process.env.SEPOLIA_RPC_URL = 'https://example.invalid';
    process.env.AUDIT_REGISTRY_ADDRESS = `0x${'2'.repeat(40)}`;
    process.env.SEPOLIA_PRIVATE_KEY = `0x${'1'.repeat(64)}`;
    delete process.env.ENABLE_CHAIN_WRITES;
    expect(chain.chainWriteConfigured()).toBe(false);
  } finally { names.forEach((n, i) => { if (before[i] === undefined) delete process.env[n]; else process.env[n] = before[i]; }); }
});
test('local chain configuration is restricted to loopback and denied in production', () => {
  const names = ['CHAIN_NETWORK', 'LOCAL_CHAIN_RPC_URL', 'LOCAL_REGISTRY_ADDRESS', 'NODE_ENV'];
  const before = names.map(n => process.env[n]);
  try {
    Object.assign(process.env, { CHAIN_NETWORK: 'local', LOCAL_CHAIN_RPC_URL: 'http://127.0.0.1:8545', LOCAL_REGISTRY_ADDRESS: `0x${'2'.repeat(40)}`, NODE_ENV: 'development' });
    expect(chain.chainConfigured()).toBe(true);
    process.env.LOCAL_CHAIN_RPC_URL = 'https://example.invalid';
    expect(chain.chainConfigured()).toBe(false);
    process.env.LOCAL_CHAIN_RPC_URL = 'http://127.0.0.1:8545';
    process.env.NODE_ENV = 'production';
    expect(chain.chainConfigured()).toBe(false);
  } finally { names.forEach((n, i) => { if (before[i] === undefined) delete process.env[n]; else process.env[n] = before[i]; }); }
});
