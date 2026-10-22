import { describe, expect, test } from 'bun:test';
import { createManualPacketTool } from './manual-packet';

const candidate = (sourceId: string, country: string | null, sector: string | null, medianFluxKgHr: number | null, distinctDates: number) => ({
  sourceId, country, sector, medianFluxKgHr, medianUncertaintyKgHr: null, distinctDates, observationCount: distinctDates,
  missingFluxCount: medianFluxKgHr === null ? distinctDates : 0, lastObserved: distinctDates ? '2026-09-01T00:00:00' : null,
});

const packet = {
  taskId: 'T1',
  dataset: { datasetSnapshotId: 'DEMO', inputFileSha256: 'a'.repeat(64), archiveSha256: 'b'.repeat(64), intelligenceSha256: 'c'.repeat(64), synthetic: true, provenance: null, scope: 'full_snapshot', totalSourceCount: 4, archiveStartDate: '2020-01-01', archiveEndDate: '2026-09-11' },
  parameters: { capacity: 2, maxPerCountry: 1, countries: [], sectors: [], recurrenceWeight: 50 },
  task: { sourceAId: 'DEMO-A', sourceBId: 'DEMO-C', startingCapacity: 2, changedCapacity: 3, maxPerCountry: 1 },
  candidates: [candidate('DEMO-A', 'A', 'Oil', 1000, 2), candidate('DEMO-B', 'A', 'Waste', 900, 10), candidate('DEMO-C', 'B', 'Oil', 100, 8), candidate('DEMO-D', 'D', 'Waste', null, 0)],
};

describe('manual packet candidate table', () => {
  test('returns bounded weighted ranking pages without applying the quota or selecting a plan', async () => {
    const tool = createManualPacketTool(packet);
    const result = await tool.execute({ operation: 'ranked_page', offset: 0, limit: 2 }) as { totalEligible: number; rows: Array<{ sourceId: string; weightedScore: number }> };
    expect(tool.definition.function.name).toBe('read_manual_packet');
    expect(result.totalEligible).toBe(3);
    expect(result.rows.map(row => row.sourceId)).toEqual(['DEMO-B', 'DEMO-A']);
    expect(result.rows.every(row => Number.isFinite(row.weightedScore))).toBe(true);
    expect(result).not.toHaveProperty('selectedIds');
  });

  test('finds named source rows outside the current page and rejects oversized reads', async () => {
    const tool = createManualPacketTool(packet);
    const result = await tool.execute({ operation: 'find_sources', sourceIds: ['DEMO-A', 'DEMO-D'] }) as { rows: Array<{ sourceId: string }> };
    expect(result.rows.map(row => row.sourceId)).toEqual(['DEMO-A', 'DEMO-D']);
    expect(() => tool.execute({ operation: 'ranked_page', offset: 0, limit: 51 })).toThrow('limit must be between 1 and 50');
  });
});
