import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { type AuditScope, type ClaimType, type Evidence, type ResultLabel } from '@methane/shared';
import { assess } from './audit';

// Read immutable v1 case inputs; never run the JavaScript port supplied in the research ZIP.
type Case = { id: string; claimType: ClaimType; scope?: AuditScope; evidence: Evidence[] };
const packet = '../../../docs/evidence/domain-review-preparation-2026-10-18/reviewer/cases.json';
const cases: Case[] = JSON.parse(await readFile(new URL(packet, import.meta.url), 'utf8')).cases;
const byId = (id: string) => structuredClone(cases.find(item => item.id === id)!);
const modify = (id: string, changes: Partial<Evidence>) => { const row = byId(id); Object.assign(row.evidence[0], changes); return row; };

const mutations: Array<[string, () => Case, ResultLabel]> = [
  ['M01', () => modify('D05', { reference: 'https://example.org/DEMO-fabricated' }), 'supported'],
  ['M02', () => modify('D05', { synthetic: false }), 'supported'],
  ['M03', () => { const row = byId('D05'); delete (row.evidence[0] as Partial<Evidence>).reference; return row; }, 'insufficient_evidence'],
  ['M04', () => modify('D05', { followUpReference: '     ' }), 'insufficient_evidence'],
  ['M05', () => modify('D05', { action: '     ' }), 'insufficient_evidence'],
  ['M06', () => modify('D05', { followUpDate: '2026-09-01' }), 'insufficient_evidence'],
  ['M07', () => modify('D05', { followUpDate: '2026-09-30' }), 'supported'],
  ['M08', () => ({ ...byId('D04'), scope: undefined }), 'insufficient_evidence'],
  ['M09', () => { const row = byId('D02'); delete (row.evidence[0] as Partial<Evidence>).reference; return row; }, 'insufficient_evidence'],
  ['M10', () => modify('D01', { title: 'DEMO fabricated receipt does not exist' }), 'supported'],
  ['M11', () => { const row = byId('D01'); row.scope!.recipient = ' DEMO recipient A '; return row; }, 'supported'],
  ['M12', () => modify('D01', { date: '2026-09-31' }), 'insufficient_evidence'],
  ['M13', () => { const row = modify('D01', { date: '2026-09-30T23:30:00-12:00' }); row.scope!.startDate = row.scope!.endDate = '2026-09-30'; return row; }, 'insufficient_evidence'],
  ['M14', () => modify('D05', { followUpReference: 'https://example.org/DEMO-fabricated-follow-up' }), 'supported'],
  ['M15', () => modify('D05', { followUpDate: '2026-10-01' }), 'insufficient_evidence'],
  ['M16', () => modify('D01', { recipient: 'DEMO other recipient' }), 'insufficient_evidence'],
  ['M17', () => modify('D05', { observationId: 'DEMO-other-event' }), 'insufficient_evidence'],
  ['M18', () => modify('D05', { action: 'DEMO unrelated equipment description' }), 'supported'],
];

test('P4 twelve frozen prompts preserve their metadata-only baseline outcomes', () => {
  const expected: ResultLabel[] = ['supported', 'insufficient_evidence', 'insufficient_evidence', 'insufficient_evidence', 'insufficient_evidence', 'insufficient_evidence', 'supported', 'contradicted', 'insufficient_evidence', 'insufficient_evidence', 'supported', 'insufficient_evidence'];
  expect(cases).toHaveLength(12);
  cases.forEach((row, index) => expect(assess({ evidence: row.evidence }, row.claimType, row.scope).result).toBe(expected[index]));
});
for (const [id, makeCase, expected] of mutations) test(`P4 ${id}: declared reference coverage, never physical verification`, () => {
  const row = makeCase();
  expect(assess({ evidence: row.evidence }, row.claimType, row.scope).result).toBe(expected);
});
