import { expect, test } from 'bun:test';
import { scoreResponses } from './product-value-evaluation';

test('comparison retains missing and incorrect cells in the frozen denominator', () => {
  const key = [{ id: 'A', answer: { result: 'valid' } }, { id: 'B', answer: { physicalMitigationEstablished: false } }];
  expect(scoreResponses(key, [{ id: 'A', answer: { result: 'valid' } }])).toMatchObject({ scheduled: 2, correct: 1, missing: 1, criticalOverclaims: 0 });
  expect(scoreResponses(key, [{ id: 'B', answer: { physicalMitigationEstablished: true } }])).toMatchObject({ scheduled: 2, correct: 0, missing: 1, criticalOverclaims: 1 });
});

test('comparison refuses duplicate or unscheduled responses and scores objects independent of key order', () => {
  const key = [{ id: 'A', answer: { result: 'valid', physicalMitigationEstablished: false } }];
  expect(scoreResponses(key, [{ id: 'A', answer: { physicalMitigationEstablished: false, result: 'valid' } }]).correct).toBe(1);
  expect(() => scoreResponses(key, [{ id: 'X', answer: {} }])).toThrow('Unscheduled');
  expect(() => scoreResponses(key, [{ id: 'A', answer: {} }, { id: 'A', answer: {} }])).toThrow('Duplicate');
});
