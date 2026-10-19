import { createHash } from 'node:crypto';
import { lookup as dnsLookup } from 'node:dns/promises';
import { get } from 'node:https';
import { BlockList, isIP } from 'node:net';
import type { EvidenceCheck } from '@methane/shared';

export const EVIDENCE_PUBLISHER_HOSTS = Object.freeze(['www.unep.org', 'methanedata.unep.org', 'www.iea.org', 'iea.org']);
const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 4000;
const blocked = new BlockList();
for (const [address, prefix] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]] as const) blocked.addSubnet(address, prefix, 'ipv4');
const ipv6Global = new BlockList(); ipv6Global.addSubnet('2000::', 3, 'ipv6');
const ipv6Reserved = new BlockList();
for (const [address, prefix] of [['2001::', 23], ['2001:db8::', 32], ['2002::', 16], ['3fff::', 20]] as const) ipv6Reserved.addSubnet(address, prefix, 'ipv6');
export function publicAddress(address: string): boolean {
  const family = isIP(address);
  return family === 4 ? !blocked.check(address, 'ipv4')
    : family === 6 && ipv6Global.check(address, 'ipv6') && !ipv6Reserved.check(address, 'ipv6');
}

type TransportResult = { status: number; contentType?: string; bytes: number; sha256?: string };
export type EvidenceTransport = (url: string, address: string, family: number) => Promise<TransportResult>;
export const retrievePublisherReference: EvidenceTransport = (url, address, family) => new Promise((resolve, reject) => {
  // Keep TLS hostname validation while pinning this request to the checked public DNS address.
  const request = get(url, { lookup: (_hostname, options, callback) => options.all ? callback(null, [{ address, family }]) : callback(null, address, family), headers: { Accept: 'application/pdf,text/plain,text/html,application/json', 'Accept-Encoding': 'identity', 'User-Agent': 'MethaneResponse-reference-check/1' } }, response => {
    if (response.statusCode !== 200) { response.destroy(); resolve({ status: response.statusCode || 0, bytes: 0 }); return; }
    const size = response.headers['content-length'];
    if (size && (!/^\d+$/.test(size) || Number(size) > MAX_BYTES)) { response.destroy(); reject(new Error('Reference size exceeds limit')); return; }
    const hash = createHash('sha256'); let bytes = 0;
    response.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > MAX_BYTES) { response.destroy(new Error('Reference size exceeds limit')); return; }
      hash.update(chunk);
    });
    response.on('error', reject);
    response.on('end', () => resolve({ status: 200, bytes, sha256: hash.digest('hex'), contentType: response.headers['content-type']?.slice(0, 160) }));
  });
  const timer = setTimeout(() => request.destroy(new Error('Reference retrieval timed out')), TIMEOUT_MS);
  request.on('close', () => clearTimeout(timer));
  request.on('error', reject);
});

type Dependencies = { lookup?: (host: string) => Promise<{ address: string; family: number }[]>; transport?: EvidenceTransport };
export async function checkEvidenceReference(reference: string, expectedSha256?: string, dependencies: Dependencies = {}): Promise<EvidenceCheck> {
  const base = { reference, checkedAt: new Date().toISOString(), ...(expectedSha256 ? { expectedSha256 } : {}) };
  try {
    const url = new URL(reference);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash
      || !EVIDENCE_PUBLISHER_HOSTS.includes(url.hostname)) return { ...base, status: 'not_checked' };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const addresses = await Promise.race([
      (dependencies.lookup || (host => dnsLookup(host, { all: true })))(url.hostname),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('DNS timed out')), TIMEOUT_MS); }),
    ]).finally(() => clearTimeout(timer));
    if (!addresses.length || addresses.some(item => !publicAddress(item.address))) return { ...base, status: 'blocked' };
    const result = await (dependencies.transport || retrievePublisherReference)(url.href, addresses[0].address, addresses[0].family);
    if (result.status !== 200 || !result.sha256 || result.bytes <= 0 || result.bytes > MAX_BYTES) return { ...base, status: 'unavailable' };
    // An HTML response is commonly an error page or download interstitial, not the expected PDF.
    if (/\.pdf$/i.test(url.pathname) && !result.contentType?.toLowerCase().startsWith('application/pdf')) return { ...base, status: 'unavailable' };
    return { ...base, status: expectedSha256 ? expectedSha256 === result.sha256 ? 'digest_matched' : 'digest_mismatch' : 'publisher_retrieved',
      publisherHost: url.hostname, sha256: result.sha256, bytes: result.bytes, ...(result.contentType ? { contentType: result.contentType } : {}) };
  } catch { return { ...base, status: 'unavailable' }; }
}
