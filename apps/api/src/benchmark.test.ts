import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DEMO_SOURCES } from '@methane/shared';
import { assess } from './audit';
import { findCaseBySourceId } from './casebook';

type BenchmarkRow = {
  id: string;
  caseId?: string;
  sourceId: string;
  claimType: 'source_detected' | 'operator_notified' | 'mitigation_confirmed';
  expected: 'supported' | 'insufficient_evidence' | 'contradicted';
  synthetic: boolean;
};

const path = resolve(import.meta.dir, '../../../services/data-pipeline/data/mars_claim_benchmark.jsonl');

describe('reviewed baseline benchmark conformance', () => {
  test('the API rules match every pinned real case and separately marked demo fixture', async () => {
    const rows = (await readFile(path, 'utf8')).trim().split('\n').map((line) => JSON.parse(line) as BenchmarkRow);
    expect(rows).toHaveLength(15);
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);

    for (const row of rows) {
      const source = row.synthetic
        ? DEMO_SOURCES.find((candidate) => candidate.sourceId === row.sourceId)
        : (await findCaseBySourceId(row.sourceId))?.source;
      expect(source).toBeDefined();
      const caseId = source && 'caseId' in source ? source.caseId : undefined;
      if (row.caseId) expect(caseId).toBe(row.caseId);
      const result = assess(source!, row.claimType);
      expect(result.result).toBe(row.expected);
      if (result.result === 'supported') expect(result.evidenceIds.length).toBeGreaterThan(0);
      if (!row.synthetic && row.claimType === 'mitigation_confirmed') {
        expect(result.result).toBe('insufficient_evidence');
      }
    }
  });
});
