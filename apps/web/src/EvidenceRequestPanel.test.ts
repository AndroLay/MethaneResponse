import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'bun:test';
import { CaseWorkDraft } from '@methane/shared';
import EvidenceRequestPanel from './EvidenceRequestPanel';

test('evidence history pages ten concise events while retaining original requirements and identifiers in closed details', () => {
  const requestEvents = Array.from({ length: 11 }, (_, i) => ({
    type: 'issued' as const, requestId: `DEMO-request-${i}`, recipientRole: 'operator' as const,
    dueDate: '2026-10-25', requirement: 'DEMO dated operator notification receipt',
    acceptanceCriteria: 'DEMO receipt identifies facility and recipient',
  }));
  const draft = CaseWorkDraft.parse({ status: 'investigate', claimType: 'operator_notified',
    question: '', notes: '', evidenceRequest: '', nextAction: '', requestEvents });
  const html = renderToStaticMarkup(createElement(EvidenceRequestPanel, { draft, disabled: false, onChange: () => {} }));
  expect(html.match(/class="evidence-event"/g)).toHaveLength(10);
  expect(html).toContain('Events 1–10 of 11');
  expect(html).toContain('DEMO-request-9');
  expect(html).not.toContain('DEMO-request-10');
  expect(html).toContain('<details class="evidence-event">');
  expect(html).toContain('DEMO receipt identifies facility and recipient');
  expect(html).toContain('Receipt of a response does not establish evidence quality or mitigation.');
});

test('response disclosure retains exact reference, file digest, rights and reported date precision', () => {
  const draft = CaseWorkDraft.parse({ status: 'awaiting_evidence', claimType: 'operator_notified',
    question: '', notes: '', evidenceRequest: '', nextAction: '', requestEvents: [{
      type: 'response_received', requestId: 'DEMO-request', responseId: 'DEMO-response',
      reference: 'https://example.org/DEMO-evidence', locator: 'DEMO page 2', sha256: 'a'.repeat(64),
      rights: 'explicit_permission', reportedDate: { precision: 'month', value: '2026-09' },
    }] });
  const html = renderToStaticMarkup(createElement(EvidenceRequestPanel, { draft, disabled: true, onChange: () => {} }));
  for (const value of ['2026-09', 'month', 'a'.repeat(64), 'DEMO-response', 'explicit permission', 'https://example.org/DEMO-evidence']) expect(html).toContain(value);
  expect(html).toContain('<fieldset disabled="">');
});
