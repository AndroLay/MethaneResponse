import { describe, expect, test } from 'bun:test';
import { planLabExecution } from './run-all';

describe('full agent lab execution plan', () => {
  test('prepares and scripts dry-run only when no frozen artifacts exist yet', () => {
    expect(planLabExecution({ protocolFrozen: false, resultsExist: false, dryRunRecordCount: 0 })).toEqual({ prepare: true, dryRun: true });
  });

  test('reuses a complete dry-run and never overwrites a finalized report', () => {
    expect(planLabExecution({ protocolFrozen: true, resultsExist: false, dryRunRecordCount: 4 })).toEqual({ prepare: false, dryRun: false });
    expect(() => planLabExecution({ protocolFrozen: true, resultsExist: true, dryRunRecordCount: 4 })).toThrow('refusing to overwrite finalized evidence');
  });

  test('fails closed on partial or excess scripted dry-run records', () => {
    expect(() => planLabExecution({ protocolFrozen: true, resultsExist: false, dryRunRecordCount: 2 })).toThrow('partial dry-run evidence requires a new revision');
    expect(() => planLabExecution({ protocolFrozen: true, resultsExist: false, dryRunRecordCount: 5 })).toThrow('unexpected dry-run record count');
  });
});
