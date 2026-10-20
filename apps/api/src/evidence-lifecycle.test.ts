import { expect, test } from 'bun:test';
import { EvidenceRequestEvent, evidenceLifecycleValid } from '@methane/shared/evidence-lifecycle';
import { MemoryCaseWorkStore } from './case-work';
const issue = { type: 'issued', requestId: 'DEMO-request', requirement: 'Provide attributable follow-up measurements for this source and period.', acceptanceCriteria: 'Method, uncertainty and date must be attributable.', recipientRole: 'operator', dueDate: '2026-10-25' };
const response = { type: 'response_received', requestId: 'DEMO-request', responseId: 'DEMO-response', reference: 'https://example.org/authorized-report', locator: 'Page 2', sha256: 'a'.repeat(64), reportedDate: { precision: 'month', value: '2026-09' }, rights: 'explicit_permission' };
test('requests distinguish received, reviewed and accepted evidence without inventing dates', () => {
  expect(EvidenceRequestEvent.safeParse(response).success).toBe(true);
  expect(EvidenceRequestEvent.safeParse({ ...response, reportedDate: { precision: 'day', value: '2026-09' } }).success).toBe(false);
  expect(EvidenceRequestEvent.safeParse({ ...response, reportedDate: { precision: 'month', value: '2026-13' } }).success).toBe(false);
  expect(evidenceLifecycleValid([issue, response])).toBe(true);
  expect(evidenceLifecycleValid([response])).toBe(false);
  expect(evidenceLifecycleValid([issue, response, { type: 'response_reviewed', requestId: issue.requestId, responseId: response.responseId, decision: 'accepted_for_assessment', rationale: 'Attribution inspected; no physical confirmation is implied.' }])).toBe(true);
  expect(evidenceLifecycleValid([issue, response, response])).toBe(false);
});
test('casework request history is append only and attributed by the server revision', async () => {
  const store = new MemoryCaseWorkStore(), context = { sourceId: 'DEMO-SRC', synthetic: true, datasetSnapshotId: 'DEMO' };
  const draft = { status: 'awaiting_evidence', question: '', notes: '', evidenceRequest: '', nextAction: '', claimType: 'mitigation_confirmed', requestEvents: [issue] } as any;
  await store.save(context, 'DEMO-work', draft, 0, 'DEMO-reviewer');
  await expect(store.save(context, 'DEMO-work', { ...draft, requestEvents: [] }, 1, 'DEMO-reviewer')).rejects.toThrow();
  const saved = await store.save(context, 'DEMO-work', { ...draft, requestEvents: [issue, response] }, 1, 'DEMO-reviewer');
  expect(saved.requestEvents).toHaveLength(2); expect(saved.updatedBy).toBe('DEMO-reviewer');
  expect((await store.history(context, 'DEMO-work'))[0].requestEvents).toHaveLength(1);
});
