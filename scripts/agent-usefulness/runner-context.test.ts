import { describe, expect, test } from 'bun:test';
import { buildTaskAssignment, providerSafePacket, redactProviderText } from './runner-context';

describe('agent lab provider context', () => {
  const t2Packet = {
    taskId: 'T2',
    dataset: { datasetSnapshotId: 'DEMO-MARS', attribution: 'UNEP IMEO MARS metadata attribution.' },
    claim: { sourceId: 'KAZ_S_159', claimText: 'A frozen claim.', scope: { startDate: '2026-06-01', endDate: '2026-07-31' } },
    source: { sourceId: 'KAZ_S_159', feedback: 'Yes', mitigationConfirmed: null },
    plumeRecords: [{ plumeId: 'DEMO-plume', fluxKgHr: 307 }],
    externalEvidenceMetadata: [{ title: 'Uncleared report title', url: 'https://reports.example/uncleared', publisher: 'External publisher', license: 'NoDerivs' }],
  };

  test('removes uncleared external report metadata while preserving the licensed source evidence', () => {
    const safe = providerSafePacket(t2Packet);
    expect(safe).not.toHaveProperty('externalEvidenceMetadata');
    expect(safe.claim).toEqual(t2Packet.claim);
    expect(safe.source).toEqual(t2Packet.source);
    expect(safe.plumeRecords).toEqual(t2Packet.plumeRecords);
    expect((safe.dataset as { attribution: string }).attribution).toBe(t2Packet.dataset.attribution);
    expect(safe.providerProcessingNote).toContain('External report metadata withheld');
  });

  test('redacts uncleared report metadata if it appears in visible browser text', () => {
    const visible = 'Source KAZ_S_159. Uncleared report title https://reports.example/uncleared External publisher';
    const safe = redactProviderText(visible, t2Packet);
    expect(safe).toContain('Source KAZ_S_159');
    expect(safe).not.toContain('Uncleared report title');
    expect(safe).not.toContain('https://reports.example/uncleared');
    expect(safe).not.toContain('External publisher');
    expect(safe).toContain('[external report metadata withheld]');
  });

  test('sends task assignment data without leaking the full T1 candidate table', () => {
    const packet = {
      taskId: 'T1',
      task: { sourceAId: 'BHR_S_003', sourceBId: 'IRN_S_001', startingCapacity: 10, changedCapacity: 20, maxPerCountry: 2 },
      parameters: { capacity: 10, maxPerCountry: 2, recurrenceWeight: 50 },
      dataset: { datasetSnapshotId: 'DEMO-MARS', candidateCount: 4218 },
      candidates: [{ sourceId: 'DO_NOT_SEND_THIS_ROW' }],
    };
    const assignment = buildTaskAssignment('T1', packet);
    expect(assignment.task).toEqual(packet.task);
    expect(assignment.parameters).toEqual(packet.parameters);
    expect(assignment.dataset).toEqual(packet.dataset);
    expect(JSON.stringify(assignment)).not.toContain('DO_NOT_SEND_THIS_ROW');
  });
});
