import { expect, test } from 'bun:test';
import { planVerifierArguments } from './verify-plan';
test('plan verifier requires one file and a separately recorded expected head; refuses unknown options', () => {
  expect(planVerifierArguments(['review.json', '--expected-head', '0x'+'a'.repeat(64)])).toEqual({ file: 'review.json', expected: '0x'+'a'.repeat(64) });
  for (const args of [[], ['review.json'], ['review.json','--expected-head','wrong'], ['review.json','--expected-head','0x'+'a'.repeat(64),'--skip-replay']]) expect(() => planVerifierArguments(args)).toThrow();
});
