import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { checkEvidenceReference, publicAddress, type EvidenceTransport } from './evidence-check';

const digest = createHash('sha256').update('official record').digest('hex');
const url = 'https://www.unep.org/evidence';
const transport: EvidenceTransport = async () => ({ status: 200, contentType: 'application/pdf', bytes: 15, sha256: digest });
const lookup = async () => [{ address: '8.8.8.8', family: 4 }];

test('publisher retrieval binds bytes, time and expected digest without claiming content truth', async () => {
  const result = await checkEvidenceReference(url, digest, { lookup, transport });
  expect(result.status).toBe('digest_matched');
  expect(result.sha256).toBe(digest);
  expect(result.publisherHost).toBe('www.unep.org');
  expect(result.checkedAt).toBeTruthy();
  expect(JSON.stringify(result)).not.toContain('official record');
  expect((await checkEvidenceReference(url, 'b'.repeat(64), { lookup, transport })).status).toBe('digest_mismatch');
  expect((await checkEvidenceReference(url, undefined, { lookup, transport })).status).toBe('publisher_retrieved');
});

test('unsafe, unlisted and redirect references never become retrieved evidence', async () => {
  let calls = 0;
  const counted: EvidenceTransport = async () => { calls++; return transport(url, '8.8.8.8', 4); };
  for (const reference of ['http://www.unep.org/a', 'https://www.unep.org.evil.test/a', 'https://user:pass@www.unep.org/a', 'https://127.0.0.1/a', 'https://www.unep.org:8443/a', 'https://example.org/receipt']) {
    expect((await checkEvidenceReference(reference, undefined, { lookup, transport: counted })).status).toBe('not_checked');
  }
  expect(calls).toBe(0);
  expect((await checkEvidenceReference(url, undefined, { lookup: async () => [{ address: '127.0.0.1', family: 4 }], transport: counted })).status).toBe('blocked');
  expect(calls).toBe(0);
  const redirected: EvidenceTransport = async () => ({ status: 302, bytes: 0 });
  expect((await checkEvidenceReference(url, undefined, { lookup, transport: redirected })).status).toBe('unavailable');
  expect((await checkEvidenceReference(url, undefined, { lookup, transport: async () => { throw new Error('token/private transport detail'); } })).status).toBe('unavailable');
});

test('local, mapped, reserved and mixed DNS addresses are blocked', async () => {
  for (const address of ['127.1.2.3', '10.0.0.2', '172.16.0.1', '169.254.169.254', '100.64.0.1', '192.168.1.1', '0.0.0.0', '224.0.0.1', '::1', '::ffff:127.0.0.1', 'fe80::1', 'fc00::1', '2001:db8::1']) expect(publicAddress(address)).toBe(false);
  expect(publicAddress('8.8.8.8')).toBe(true);
  expect(publicAddress('2606:4700:4700::1111')).toBe(true);
  expect((await checkEvidenceReference(url, undefined, { lookup: async () => [...await lookup(), { address: '10.0.0.1', family: 4 }], transport })).status).toBe('blocked');
});
