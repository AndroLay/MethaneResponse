import { describe, expect, test } from 'bun:test';
import { canonicalJson } from './canonical';

describe('canonical JSON encoding', () => {
  test('sorts object keys recursively and matches the verifier representation', () => {
    expect(canonicalJson({ z: 2, a: { y: true, b: null } })).toBe('{"a":{"b":null,"y":true},"z":2}');
  });

  test('omits undefined object values and preserves array order', () => {
    expect(canonicalJson({ absent: undefined, values: [3, 1] })).toBe('{"values":[3,1]}');
  });
});
