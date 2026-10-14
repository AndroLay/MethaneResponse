import { test, expect } from 'bun:test';
import { readPreparedEvidenceFile, validatePreparedEvidence } from './prepared-evidence';
import { createHash } from 'node:crypto';
const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const text = 'The incident response team inspected the listed facility, but no independent post-repair measurement is included in the available report.';
const textBytes = new TextEncoder().encode(text).byteLength;
const template = () => ({
  apiPayload: {
    sourceId: 'KAZ_S_159', claimType: 'mitigation_confirmed', consentToExternalProcessing: false,
    documents: [{ id: 'doc-01', title: 'Source report', text, sourceUrl: 'https://publisher.example.org/report', originalFileSha256: 'a'.repeat(64),
      rightsDeclared: 'explicit_permission', selectedPages: [{page:1,textSha256:sha(text)}] }],
  },
  localManifest: { documentSha256: 'a'.repeat(64), extractedTextSha256: sha(text), sourceUrl: 'https://publisher.example.org/report',
    formatVersion: 1, rightsStatus: 'explicit_permission', selectedPages: [{page:1,textSha256:sha(text),excerptStartByte:0,excerptLengthBytes:textBytes}] },
});
test('valid prepared document remains offline and retains provenance metadata', async () => {
  const result = await validatePreparedEvidence(template(), 'KAZ_S_159', 'mitigation_confirmed');
  expect(result.originalFileSha256).toBe('a'.repeat(64));
  expect(result.selectedPages[0].page).toBe(1);
});
test('cannot import evidence for a different source or modified excerpt', async () => {
  await expect(validatePreparedEvidence(template(),'LBY_S_143','mitigation_confirmed')).rejects.toThrow('does not match');
  const edited = template(); edited.apiPayload.documents[0].text += ' ADDED';
  await expect(validatePreparedEvidence(edited,'KAZ_S_159','mitigation_confirmed')).rejects.toThrow('checksum');
});
test('rejects link-only or tampered page metadata', async () => {
  const invalid = template(); invalid.localManifest.selectedPages[0].textSha256 = 'b'.repeat(64);
  await expect(validatePreparedEvidence(invalid,'KAZ_S_159','mitigation_confirmed')).rejects.toThrow('page metadata');
  const unauthorized = template(); unauthorized.apiPayload.documents[0].rightsDeclared = 'link_only';
  await expect(validatePreparedEvidence(unauthorized,'KAZ_S_159','mitigation_confirmed')).rejects.toThrow('rights declaration');
  const rewritten = template();
  rewritten.apiPayload.documents[0].selectedPages[0].textSha256 = 'b'.repeat(64);
  rewritten.localManifest.selectedPages[0].textSha256 = 'b'.repeat(64);
  await expect(validatePreparedEvidence(rewritten,'KAZ_S_159','mitigation_confirmed')).rejects.toThrow('page excerpt hash');
});

test('reads only bounded prepared JSON and rejects malformed or oversized files', async () => {
  const contents = JSON.stringify(template());
  const file = { name: 'evidence.json', size: new TextEncoder().encode(contents).byteLength, text: async () => contents };
  expect((await readPreparedEvidenceFile(file, 'KAZ_S_159', 'mitigation_confirmed')).title).toBe('Source report');
  await expect(readPreparedEvidenceFile({ ...file, name: 'report.pdf' }, 'KAZ_S_159', 'mitigation_confirmed')).rejects.toThrow('JSON');
  await expect(readPreparedEvidenceFile({ ...file, size: 256_001 }, 'KAZ_S_159', 'mitigation_confirmed')).rejects.toThrow('256 KB');
  await expect(readPreparedEvidenceFile({ ...file, text: async () => '{' }, 'KAZ_S_159', 'mitigation_confirmed')).rejects.toThrow('valid JSON');
});
