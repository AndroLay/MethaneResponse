import { expect, test } from 'bun:test';
import { transitionVerifierArguments } from './verify-snapshot-transition';
const args = ['DEMO-report.json', '--before', 'DEMO-before.gz', '--after', 'DEMO-after.gz', '--expected-before', 'a'.repeat(64), '--expected-after', 'b'.repeat(64), '--expected-report', '0x'+'c'.repeat(64)];
test('snapshot CLI requires separate trusted input and report commitments without bypass flags', () => {
  expect(transitionVerifierArguments(args).beforeHash).toBe('a'.repeat(64));
  for (const invalid of [args.slice(0,-2), [...args,'--skip-replay'], args.map((v,i) => i === 6 ? 'invalid' : v), args.map((v,i) => i === 9 ? '--trust-file' : v)]) expect(() => transitionVerifierArguments(invalid)).toThrow();
});
