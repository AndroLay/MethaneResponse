import { expect, test } from 'bun:test';
import * as client from './chain-client';
test('maps durable pending, reverted and confirmed states without implying physical mitigation', () => {
  expect(client.anchorStateLabel('pending')).toBe('Pending — reconcile before another transaction');
  expect(client.anchorStateLabel('reverted')).toBe('Transaction reverted — audit remains unanchored');
  expect(client.anchorStateLabel('confirmed')).toBe('Receipt recorded — verify its current chain status');
});
