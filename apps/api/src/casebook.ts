import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MarsCasebook, ReviewSource, type Evidence as EvidenceType, type MarsCase, type MarsCasebook as MarsCasebookType, type ReviewSource as ReviewSourceType } from '@methane/shared';

const defaultCasebookPath = resolve(import.meta.dir, '../../../data/real/mars_casebook_2026-10-15.json');
let casebookPromise: Promise<MarsCasebookType> | undefined;
let cachedCasebookPath: string | undefined;

export async function loadCasebook(path = process.env.MARS_CASEBOOK_PATH || defaultCasebookPath): Promise<MarsCasebookType> {
  if (!casebookPromise || cachedCasebookPath !== path) {
    cachedCasebookPath = path;
    casebookPromise = (async () => {
      const json = JSON.parse(await readFile(path, 'utf8')) as unknown;
      const parsed = MarsCasebook.safeParse(json);
      if (!parsed.success) throw new Error(`MARS casebook failed validation: ${parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`);
      return parsed.data;
    })();
    casebookPromise.catch(() => {
      if (cachedCasebookPath === path) {
        cachedCasebookPath = undefined;
        casebookPromise = undefined;
      }
    });
  }
  return casebookPromise;
}

export function sourceFromCase(item: MarsCase, catalogUrl: string, attribution: MarsCasebookType['provenance']): ReviewSourceType {
  const evidence: EvidenceType[] = item.plumes.map((plume) => ({
    id: plume.plumeId,
    kind: 'detection' as const,
    claimType: 'source_detected' as const,
    title: `UNEP MARS ${plume.satellite} plume observation`,
    reference: catalogUrl,
    date: plume.tileDate,
    synthetic: false,
  }));
  if (item.source.notified.toLowerCase() === 'yes') {
    evidence.push({
      id: `${item.sourceId}:notification-status`,
      kind: 'metadata_notification' as const,
      title: 'UNEP MARS source-level notified field is Yes; recipient and exact notification time are not identified here',
      reference: catalogUrl,
      synthetic: false,
    });
  }

  const observations = item.plumes.map((plume) => ({
    id: plume.plumeId,
    date: plume.tileDate,
    fluxKgHr: plume.fluxKgHr,
    uncertaintyKgHr: plume.fluxStdKgHr,
    fluxUnit: 'kg/h' as const,
    satellite: plume.satellite,
    lat: plume.lat,
    lon: plume.lon,
    notified: plume.notified,
    actionable: plume.actionable,
    tile: plume.tile,
    detectionInstitution: plume.detectionInstitution,
    quantificationInstitution: plume.quantificationInstitution,
    totalEmissionTonnes: plume.totalEmissionTonnes,
    totalEmissionStdTonnes: plume.totalEmissionStdTonnes,
  }));
  const observedFluxes = item.plumes.map((plume) => plume.fluxKgHr).filter((value): value is number => value !== null);

  return ReviewSource.parse({
    sourceId: item.sourceId,
    caseId: item.caseId,
    name: item.source.sourceId,
    region: item.source.country,
    lat: item.source.lat,
    lon: item.source.lon,
    synthetic: false,
    evidence,
    country: item.source.country,
    sector: item.source.sector,
    sourceType: item.source.sourceType,
    plumeCount: item.source.detectedPlumeCount,
    lastObserved: item.source.latestPlumeDate || undefined,
    persistency: item.source.persistency ?? null,
    persistencyStd: item.source.persistencyStd ?? null,
    persistencyCategory: item.source.persistencyCategory,
    ...(typeof item.source.emissionStatus === 'string' ? { emissionStatus: item.source.emissionStatus } : {}),
    maxFluxKgHr: observedFluxes.length ? Math.max(...observedFluxes) : null,
    observations,
    notified: item.source.notified,
    feedback: item.source.feedback,
    feedbackOperator: item.source.feedbackOperator,
    feedbackGovernment: item.source.feedbackGovernment,
    externalEvidence: item.externalEvidence,
    provenance: attribution,
  });
}

export async function listReviewSources() {
  const book = await loadCasebook();
  return book.cases.map((item) => sourceFromCase(item, book.provenance.catalogUrl, book.provenance));
}

export async function findCaseBySourceId(sourceId: string) {
  const book = await loadCasebook();
  const item = book.cases.find((candidate) => candidate.sourceId === sourceId);
  return item ? { book, item, source: sourceFromCase(item, book.provenance.catalogUrl, book.provenance) } : null;
}
