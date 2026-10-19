import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { DEMO_SOURCES } from '@methane/shared';
import { createAudit } from './audit';
import { auditIntegrityValid } from './integrity';
import { canonicalJson } from './canonical';

const baseline = () => createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' });
const rehash = (audit: ReturnType<typeof baseline>) => { audit.bundleHash = `0x${createHash('sha256').update(canonicalJson(audit.bundle)).digest('hex')}`; return audit; };

test('new baseline semantics are inside the integrity commitment', () => {
  const audit = baseline();
  expect(audit.bundle).toHaveProperty('assessmentSemantics', {
    version: 1, basis: 'metadata_coverage', physicalVerification: 'not_established_by_application', referencePolicy: 'scoped-reference-coverage-v2',
  });
  expect(auditIntegrityValid(audit)).toBe(true);
  Object.assign(audit.bundle, { assessmentSemantics: { version: 1, basis: 'human_assessment', physicalVerification: 'not_established_by_application' } });
  expect(auditIntegrityValid(audit)).toBe(false);
  expect(auditIntegrityValid(rehash(audit))).toBe(false);
});

test('a fresh digest cannot make an unsupported physical-verification claim valid', () => {
  const audit = baseline();
  Object.assign(audit.bundle, { assessmentSemantics: { version: 1, basis: 'metadata_coverage', physicalVerification: 'verified' } });
  expect(auditIntegrityValid(rehash(audit))).toBe(false);
});

test('legacy bundles without semantics keep their original digest and are accepted unchanged', () => {
  const audit = baseline();
  delete (audit.bundle as Record<string, unknown>).assessmentSemantics;
  rehash(audit);
  const bytes = canonicalJson(audit.bundle);
  const hash = audit.bundleHash;
  expect(auditIntegrityValid(audit)).toBe(true);
  expect(canonicalJson(audit.bundle)).toBe(bytes);
  expect(audit.bundleHash).toBe(hash);
});
