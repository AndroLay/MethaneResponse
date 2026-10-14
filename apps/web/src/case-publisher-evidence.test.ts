import { expect, test } from 'bun:test';
import { orderCasePublisherObservations } from './case-publisher-evidence';

test('case evidence defaults to the latest valid observation and keeps record choice deterministic', () => {
  const observations = [
    { id: 'later-z', date: '2026-06-21T12:00:00Z', fluxKgHr: 300, uncertaintyKgHr: 20 },
    { id: 'older', date: '2025-01-01T00:00:00Z', fluxKgHr: 100, uncertaintyKgHr: null },
    { id: 'later-a', date: '2026-06-21T12:00:00Z', fluxKgHr: 250, uncertaintyKgHr: 10 },
    { id: 'invalid', date: 'not-a-date', fluxKgHr: 999, uncertaintyKgHr: null },
  ];

  const ordered = orderCasePublisherObservations(observations);

  expect(ordered.map(item => item.id)).toEqual(['later-a', 'later-z', 'older']);
  expect(observations.map(item => item.id)).toEqual(['later-z', 'older', 'later-a', 'invalid']);
});

test('case evidence option ordering uses observation instants rather than date strings', () => {
  const observations = [
    { id: 'utc-later', date: '2026-06-22T01:00:00Z', fluxKgHr: null, uncertaintyKgHr: null },
    { id: 'offset-same', date: '2026-06-21T20:00:00-05:00', fluxKgHr: 0, uncertaintyKgHr: 0 },
  ];

  expect(orderCasePublisherObservations(observations).map(item => item.id)).toEqual(['offset-same', 'utc-later']);
});
