import { expect, test } from 'bun:test';
import { evidenceOverlapReviewNote } from './evidence-overlap-ui';
test('overlap review preserves existing notes and records exact report, revisions and human interpretation', () => {
  const report = { digest: '0x'+'a'.repeat(64), target:{revision:2},candidates:[{id:'0x'+'b'.repeat(64),work:{workId:'DEMO-related',revision:3,context:{sourceId:'DEMO_SOURCE'}}}] } as any;
  const note = evidenceOverlapReviewNote('Existing notes',report,report.candidates[0].id,'legitimate_reuse','DEMO report covers different documented questions.');
  expect(note).toStartWith('Existing notes\n\n'); expect(note).toContain('revision 2'); expect(note).toContain('DEMO-related revision 3'); expect(note).toContain(report.digest);
});
test('unknown candidate, blank rationale, unsupported interpretation or overflowing notes are rejected', () => {
  const report={digest:'0x'+'a'.repeat(64),target:{revision:1},candidates:[{id:'x',work:{workId:'DEMO',revision:1,context:{sourceId:'DEMO'}}}]} as any;
  for (const [id, disposition, rationale, notes] of [['missing','legitimate_reuse','DEMO rationale here',''],['x','legitimate_reuse','',''],['x','repair_proven','DEMO rationale here',''],['x','needs_investigation','DEMO rationale here','x'.repeat(4000)]]) {
    expect(()=>evidenceOverlapReviewNote(notes,report,id,disposition as any,rationale)).toThrow();
  }
});
