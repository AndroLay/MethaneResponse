import { expect, test } from 'bun:test';
import { resolveDevApiProxyTarget } from '../build/api-proxy-target';

test('uses the standard local API target when no development override is set', () => {
  expect(resolveDevApiProxyTarget(undefined)).toBe('http://localhost:3001');
  expect(resolveDevApiProxyTarget('   ')).toBe('http://localhost:3001');
});

test('uses an explicit HTTP API origin for isolated or non-default development ports', () => {
  expect(resolveDevApiProxyTarget(' http://127.0.0.1:3317/ ')).toBe('http://127.0.0.1:3317');
  expect(resolveDevApiProxyTarget('https://api.example.test')).toBe('https://api.example.test');
});

test('rejects malformed, credentialed, or non-origin proxy targets', () => {
  expect(() => resolveDevApiProxyTarget('not a URL')).toThrow();
  expect(() => resolveDevApiProxyTarget('http://user:password@localhost:3001')).toThrow();
  expect(() => resolveDevApiProxyTarget('http://localhost:3001/api')).toThrow();
  expect(() => resolveDevApiProxyTarget('file:///tmp/api')).toThrow();
});
