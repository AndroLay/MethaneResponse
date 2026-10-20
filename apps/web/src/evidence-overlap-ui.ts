import type { EvidenceOverlapReport } from '@methane/shared/evidence-overlap';
export type OverlapInterpretation = 'legitimate_reuse' | 'distinct_claims' | 'needs_investigation';
export function evidenceOverlapReviewNote(notes: string, report: EvidenceOverlapReport, candidateId: string, interpretation: OverlapInterpretation, rationale: string) {
  const candidate = report.candidates.find(row => row.id === candidateId);
  if (!candidate || !['legitimate_reuse','distinct_claims','needs_investigation'].includes(interpretation) || rationale.trim().length < 10 || rationale.length > 600) throw new Error('Select a current candidate and explain its interpretation in 10–600 characters.');
  const result = `${notes}${notes ? '\n\n' : ''}Evidence overlap review: ${interpretation}\nTarget revision ${report.target.revision}; ${candidate.work.context.sourceId}/${candidate.work.workId} revision ${candidate.work.revision}\nReport ${report.digest}\nCandidate ${candidate.id}\n${rationale.trim()}\nCandidate evidence overlap does not establish duplicate mitigation or physical repair.`;
  if (result.length > 4000) throw new Error('Review would exceed the notes limit. Preserve the current notes and record a shorter rationale.');
  return result;
}
