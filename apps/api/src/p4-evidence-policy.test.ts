import { expect, test } from 'bun:test';
import { type Evidence } from '@methane/shared';
import { assess } from './audit';
import { resolveScopedSource } from './scoped-source';
import { getIntelligenceSnapshot } from './intelligence-data';
import { findCaseBySourceId } from './casebook';

const scope = { startDate: '2026-09-01', endDate: '2026-09-30', recipient: 'DEMO recipient A', observationId: 'DEMO-P4-OBS' };
const notice: Evidence = { id: 'DEMO-notice', kind: 'notification', title: 'DEMO receipt metadata', reference: 'https://example.org/notice', date: '2026-09-10', recipient: 'DEMO recipient A', observationId: scope.observationId, synthetic: true };
const mitigation: Evidence = { ...notice, kind: 'mitigation_confirmation', action: 'DEMO valve replacement', followUpDate: '2026-09-30', followUpReference: 'https://example.org/follow-up' };
const evaluate = (evidence: Evidence, claim: 'operator_notified' | 'mitigation_confirmed', selectedScope: typeof scope | undefined = scope) => assess({ evidence: [evidence] }, claim, selectedScope);

test('new notification and mitigation evaluations require scope even with complete reference metadata', () => {
  for (const [evidence, claim] of [[notice, 'operator_notified'], [mitigation, 'mitigation_confirmed']] as const) {
    const result = assess({ evidence: [evidence] }, claim);
    expect(result.result).toBe('insufficient_evidence');
    expect(result.reason).toContain('scope');
    expect(result.evidenceIds).toEqual([]);
  }
});

test('blank, absent, insecure and malformed pointers cannot support or contradict coverage', () => {
  for (const kind of ['notification', 'contradiction'] as const) {
    for (const reference of [undefined, '', '   ', 'not a url', 'http://example.org/report', 'https://u:p@example.org/report']) {
      expect(evaluate({ ...notice, kind, claimType: 'operator_notified', reference } as Evidence, 'operator_notified').result).toBe('insufficient_evidence');
    }
  }
  for (const followUpReference of ['', '   ', 'bad', 'http://example.org/follow-up']) {
    expect(evaluate({ ...mitigation, followUpReference }, 'mitigation_confirmed').result).toBe('insufficient_evidence');
  }
  expect(evaluate(notice, 'operator_notified').result).toBe('supported');
  expect(evaluate(mitigation, 'mitigation_confirmed').result).toBe('supported');
});

test('fixture pointers are usable only for explicitly synthetic evidence', () => {
  for (const synthetic of [true, false]) {
    const evidence = { ...notice, reference: 'fixture://notices/DEMO-1', synthetic };
    expect(evaluate(evidence, 'operator_notified').result).toBe(synthetic ? 'supported' : 'insufficient_evidence');
  }
});

test('recipient normalization is symmetric and invalid direct-call scope is conservative', () => {
  expect(evaluate({ ...notice, recipient: ' demo RECIPIENT a ' }, 'operator_notified', { ...scope, recipient: ' DEMO recipient A ' }).result).toBe('supported');
  expect(evaluate(notice, 'operator_notified', { ...scope, startDate: '2026-09-31' }).result).toBe('insufficient_evidence');
});

test('the UTC day, strict calendar and strict timestamp determine scope and follow-up eligibility', () => {
  const oneDay = { ...scope, startDate: '2026-09-30', endDate: '2026-09-30' };
  expect(evaluate({ ...notice, date: '2026-09-30T23:30:00-12:00' }, 'operator_notified', oneDay).result).toBe('insufficient_evidence');
  expect(evaluate({ ...notice, date: '2026-10-01T00:30:00+02:00' }, 'operator_notified', oneDay).result).toBe('supported');
  for (const date of ['2026-09-31', '2026-09-31T00:00:00Z', '2026-09-10T25:00:00Z', '2026-09-10 junk', undefined]) {
    expect(evaluate({ ...notice, date }, 'operator_notified').result).toBe('insufficient_evidence');
  }
  expect(evaluate({ ...notice, date: '2026-09-10 13:30:00' }, 'operator_notified').result).toBe('supported');
  expect(evaluate({ ...mitigation, followUpDate: '2026-09-31' }, 'mitigation_confirmed').result).toBe('insufficient_evidence');
  expect(evaluate({ ...mitigation, followUpDate: '2026-09-30T23:30:00-12:00' }, 'mitigation_confirmed').result).toBe('insufficient_evidence');
});

test('source resolver and coverage use the same UTC observation day', async () => {
  const snapshot = structuredClone(await getIntelligenceSnapshot());
  const row = snapshot.sources[0];
  row.observationTimestamps[0] = '2026-09-30T23:30:00-12:00';
  const input = { sourceId: row.sourceId, claimType: 'source_detected' as const, datasetSnapshotId: snapshot.datasetSnapshotId || undefined,
    scope: { startDate: '2026-10-01', endDate: '2026-10-01', observationId: row.observationIds[0] } };
  const resolved = await resolveScopedSource(input, async () => snapshot, findCaseBySourceId);
  expect(assess(resolved.source, input.claimType, input.scope).result).toBe('supported');
  await expect(resolveScopedSource({ ...input, scope: { ...input.scope, startDate: '2026-09-30', endDate: '2026-09-30' } }, async () => snapshot, findCaseBySourceId)).rejects.toThrow('inside the assessment period');
});
