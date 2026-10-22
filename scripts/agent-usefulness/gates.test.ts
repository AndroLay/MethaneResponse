import { describe, expect, test } from 'bun:test';
import { runGates } from './gates';

describe('synthetic safety and reliability gates', () => {
  test('G01 exercises positive publisher feedback without action or follow-up evidence', async () => {
    const gate = (await runGates()).find(result => result.id === 'G01')!;
    expect(gate.passed).toBe(true);
    expect(gate.evidence).toMatchObject({
      sourceMetadata: { feedback: 'Yes', notified: 'Yes' },
      includedEvidenceKinds: ['metadata_notification'],
      actionEvidenceCount: 0,
      postActionMeasurementCount: 0,
      result: 'insufficient_evidence',
    });
  });

  test('all twelve gates run and preserve their individual outcomes', async () => {
    const results = await runGates();
    expect(results.map(result => result.id)).toEqual(Array.from({ length: 12 }, (_, index) => `G${String(index + 1).padStart(2, '0')}`));
  });
});
