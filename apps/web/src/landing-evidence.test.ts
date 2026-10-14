import { describe, expect, test } from 'bun:test';
import { getLandingEvidenceReview } from './landing-evidence';

describe('curated landing evidence review', () => {
  const review = getLandingEvidenceReview();

  test('uses the official UNEP item as linked publisher evidence without rehosting it', () => {
    expect(review.sourceId).toBe('KAZ_S_159');
    expect(review.report.publisher).toBe('United Nations Environment Programme');
    expect(review.report.url).toBe('https://wedocs.unep.org/handle/20.500.11822/49949');
    expect(review.report.reportDate).toBe('2026-09-23');
    expect(review.report.license).toContain('NoDerivs');
    expect(review.report.contentIncluded).toBe(false);
    expect(review.report.publisherSummary).toContain('Uzen Field, Kazakhstan');
    expect(review.report.repositoryReviewStatus).toBe('internal review only');
    expect(review.report.metadataCheckedAt).toBe('2026-10-13');
    expect(review.assessmentScope).toBe('publisher_record_only');
  });

  test('shows only the casebook-linked historical MARS observations with reported uncertainty', () => {
    expect(review.observations).toHaveLength(3);
    expect(review.observations.map((observation) => observation.plumeId)).toEqual([
      '82758651-76f4-4e06-b4ab-c247ce765192',
      '7529d451-018f-4da3-9114-59b76c3a3bcd',
      '941806b5-2afe-46ac-baac-a0230880cede',
    ]);
    expect(review.observations.map((observation) => observation.fluxKgHr)).toEqual([591, 307, 496]);
    expect(review.observations.map((observation) => observation.uncertaintyKgHr)).toEqual([335, 66, 226]);
    expect(review.observations.every((observation) => observation.sourceId === review.sourceId)).toBe(true);
  });

  test('binds the landing evidence summary to the active MARS snapshot', () => {
    expect(review.provenance.snapshotId).toBe('unep-mars-675417694883');
    expect(review.provenance.archiveSha256).toBe('675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43');
  });

  test('does not turn the public report or an absent later record into an independent physical verification', () => {
    expect(review.independentMitigationVerified).toBe(false);
    expect(review.missingLaterObservationMeansZero).toBe(false);
    expect(review.provenance.archiveSha256).toBe('675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43');
  });
});
