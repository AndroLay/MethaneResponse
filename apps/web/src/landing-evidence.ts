import marsCasebook from '../../../data/real/mars_casebook_2026-10-15.json';

const SOURCE_ID = 'KAZ_S_159';
const OFFICIAL_REPORT_URL = 'https://wedocs.unep.org/handle/20.500.11822/49949';

function requireValue<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

const selectedCase = requireValue(
  marsCasebook.cases.find((item) => item.sourceId === SOURCE_ID),
  `Curated MARS case ${SOURCE_ID} is missing`,
);

const report = requireValue(
  selectedCase.externalEvidence.find((item) => item.url === OFFICIAL_REPORT_URL),
  `Official UNEP reference for ${SOURCE_ID} is missing`,
);

export function getLandingEvidenceReview() {
  const observations = selectedCase.plumes
    .filter((plume) => plume.sourceId === SOURCE_ID && plume.linkStatus === 'linked' && !plume.synthetic)
    .slice()
    .sort((left, right) => left.tileDate.localeCompare(right.tileDate))
    .map((plume) => ({
      plumeId: plume.plumeId,
      sourceId: plume.sourceId,
      date: plume.tileDate,
      fluxKgHr: plume.fluxKgHr,
      uncertaintyKgHr: plume.fluxStdKgHr,
      satellite: plume.satellite,
    }));

  return {
    sourceId: selectedCase.sourceId,
    country: selectedCase.source.country,
    sector: selectedCase.source.sector,
    observations,
    report: {
      title: report.title,
      url: report.url,
      publisher: report.publisher,
      reportDate: report.reportDate,
      license: report.license,
      contentIncluded: report.contentIncluded,
      publisherSummary: 'The UNEP item page reports that IMEO confirmed a methane mitigation action at Uzen Field, Kazakhstan, in July 2026.',
      repositoryReviewStatus: 'internal review only',
      metadataCheckedAt: '2026-10-13',
    },
    assessmentScope: 'publisher_record_only' as const,
    independentMitigationVerified: false,
    missingLaterObservationMeansZero: false,
    provenance: {
      snapshotId: marsCasebook.provenance.snapshotId,
      retrievedAt: marsCasebook.provenance.retrievedAt,
      archiveSha256: marsCasebook.provenance.archiveSha256,
      license: marsCasebook.provenance.license,
      provider: marsCasebook.provenance.provider,
    },
  };
}
