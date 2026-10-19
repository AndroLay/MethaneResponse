import { expect, test } from 'bun:test';
import { reviewerAssurance, loadReviewerAssurance } from './reviewer-directory';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const now = '2026-10-17T00:00:00Z';
const entry = { reviewerId: 'analyst-alice', organization: 'DEMO Research', checkedBy: 'operator-bob', checkedAt: '2026-10-01T00:00:00Z', expiresAt: '2026-11-01T00:00:00Z', verificationReference: 'DEMO enrollment record 1', claimTypes: ['source_detected', 'operator_notified'], disabled: false };
const directory = { schemaVersion: 1, reviewers: [entry] };

test('directory approval is server attested and bounded by identity, category and time', () => {
  expect(reviewerAssurance(undefined, 'analyst-alice', 'source_detected', now).status).toBe('unverified');
  expect(reviewerAssurance(directory, 'analyst-alice', 'source_detected', now).status).toBe('operator_attested');
  expect(reviewerAssurance(directory, 'other', 'source_detected', now).status).toBe('unverified');
  expect(reviewerAssurance(directory, 'analyst-alice', 'mitigation_confirmed', now).status).toBe('outside_authority');
  expect(reviewerAssurance(directory, 'analyst-alice', 'source_detected', '2026-12-01T00:00:00Z').status).toBe('expired');
  expect(reviewerAssurance({ ...directory, reviewers: [{ ...entry, disabled: true }] }, 'analyst-alice', 'source_detected', now).status).toBe('revoked');
});

test('malformed, duplicate, future and self-approved directory entries fail closed', () => {
  for (const value of [{}, { ...directory, reviewers: [entry, entry] }, { ...directory, reviewers: [{ ...entry, checkedBy: entry.reviewerId }] }, { ...directory, reviewers: [{ ...entry, expiresAt: '2026-01-01T00:00:00Z' }] }]) {
    expect(reviewerAssurance(value, 'analyst-alice', 'source_detected', now).status).toBe('unverified');
  }
  expect(reviewerAssurance(directory, 'analyst-alice', 'source_detected', '2026-09-01T00:00:00Z').status).toBe('unverified');
});

test('configured missing or corrupt directories fail closed and edits take effect without restart', async () => {
  const old = process.env.REVIEWER_DIRECTORY_PATH;
  const dir = await mkdtemp(join(tmpdir(), 'methane-directory-'));
  try {
    delete process.env.REVIEWER_DIRECTORY_PATH;
    expect((await loadReviewerAssurance('analyst-alice', 'source_detected')).status).toBe('unverified');
    process.env.REVIEWER_DIRECTORY_PATH = join(dir, 'directory.json');
    expect((await loadReviewerAssurance('analyst-alice', 'source_detected')).status).toBe('directory_unavailable');
    await writeFile(process.env.REVIEWER_DIRECTORY_PATH, '{invalid');
    expect((await loadReviewerAssurance('analyst-alice', 'source_detected')).status).toBe('directory_unavailable');
    const current = { ...entry, checkedAt: new Date(Date.now() - 60_000).toISOString(), expiresAt: new Date(Date.now() + 60_000).toISOString() };
    await writeFile(process.env.REVIEWER_DIRECTORY_PATH, JSON.stringify({ schemaVersion: 1, reviewers: [current] }));
    expect((await loadReviewerAssurance('analyst-alice', 'source_detected')).status).toBe('operator_attested');
    await writeFile(process.env.REVIEWER_DIRECTORY_PATH, JSON.stringify({ schemaVersion: 1, reviewers: [{ ...current, disabled: true }] }));
    expect((await loadReviewerAssurance('analyst-alice', 'source_detected')).status).toBe('revoked');
  } finally { if (old === undefined) delete process.env.REVIEWER_DIRECTORY_PATH; else process.env.REVIEWER_DIRECTORY_PATH = old; await rm(dir, { recursive: true, force: true }); }
});
