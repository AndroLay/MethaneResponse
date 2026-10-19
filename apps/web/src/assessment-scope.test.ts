import { expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEMO_SOURCES } from '@methane/shared';
import AssessmentScopeEditor from './AssessmentScopeEditor';
import { observationPeriod, scopeDraftChanged, scopeDraftSchema } from './assessment-scope';

test('scope draft schema preserves incomplete fields without retaining unknown data', () => {
  const fields = { startDate: '2026-10-01', endDate: '', observationId: '', recipient: 'Draft recipient' };
  expect(scopeDraftSchema.safeParse({ ...fields, token: 'must-not-persist' })).toEqual({ success: true, data: fields });
  expect(scopeDraftSchema.safeParse({ ...fields, startDate: 123 }).success).toBe(false);
});

test('observation preset sorts normalized UTC days and excludes invalid dates', () => {
  expect(observationPeriod([{ id: 'late', date: '2026-10-02' }, { id: 'offset', date: '2026-09-30T23:30:00-12:00' }, { id: 'bad', date: '2026-09-31' }]))
    .toEqual({ startDate: '2026-10-01', endDate: '2026-10-02', count: 2 });
  expect(observationPeriod([])).toBeUndefined();
  expect(observationPeriod([{ id: 'bad', date: 'invalid' }])).toBeUndefined();
});

test('unapplied scope edits are distinct from a source-level or saved scope', () => {
  expect(scopeDraftChanged(undefined, { startDate: '', endDate: '', observationId: '', recipient: '' })).toBe(false);
  expect(scopeDraftChanged(undefined, { startDate: '2026-10-01', endDate: '', observationId: '', recipient: '' })).toBe(true);
  const scope = { startDate: '2026-10-01', endDate: '2026-10-02' };
  expect(scopeDraftChanged(scope, { ...scope, observationId: '', recipient: ' ' })).toBe(false);
  expect(scopeDraftChanged(scope, { ...scope, endDate: '2026-10-03', observationId: '', recipient: '' })).toBe(true);
});

test('scope picker exposes dated DEMO detection references when no observation rows exist', () => {
  const html = renderToStaticMarkup(createElement(AssessmentScopeEditor, { observations: [], evidence: DEMO_SOURCES[0].evidence, onChange: () => {} }));
  expect(html).toContain('value="DEMO-OBS-001"');
  expect(html).toContain('2026-09-01 · DEMO-OBS-001');
});

test('scope picker shows the UTC day instead of the timestamp local day', () => {
  const html = renderToStaticMarkup(createElement(AssessmentScopeEditor, {
    observations: [{ id: 'offset-event', date: '2026-09-30T23:30:00-12:00' }], onChange: () => {},
  }));
  expect(html).toContain('2026-10-01 · offset-event');
  expect(html).toContain('UTC');
});
