export type CasePageSize = 25 | 50 | 100;

export type CasePage<T> = {
  items: T[];
  currentPage: number;
  pageCount: number;
  firstItem: number;
  lastItem: number;
};

export function resolveSelectedCase<T extends { sourceId: string }>(sources: readonly T[], selectedSourceId: string): T | null {
  return sources.find(source => source.sourceId === selectedSourceId) || sources[0] || null;
}

export const SOURCE_CASE_SEARCH_LIMIT = 20;

type SearchableSourceCase = {
  sourceId: string;
  country?: string | null;
  region?: string | null;
  sector?: string | null;
  sourceType?: string | null;
};

export function searchSourceCases<T extends SearchableSourceCase>(sources: readonly T[], query: string): { items: T[]; totalMatches: number } {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return { items: [], totalMatches: 0 };

  const matches = sources.filter(source => {
    const searchableText = [source.sourceId, source.country, source.region, source.sector, source.sourceType]
      .filter((value): value is string => Boolean(value))
      .join(' ')
      .toLowerCase();
    return terms.every(term => searchableText.includes(term));
  });
  return { items: matches.slice(0, SOURCE_CASE_SEARCH_LIMIT), totalMatches: matches.length };
}

export function pageForSelectedCase<T extends { sourceId: string }>(sources: readonly T[], selectedSourceId: string, pageSize: CasePageSize): number {
  const selectedIndex = sources.findIndex(source => source.sourceId === selectedSourceId);
  return selectedIndex < 0 ? 1 : Math.floor(selectedIndex / pageSize) + 1;
}

export function paginateCases<T>(items: readonly T[], requestedPage: number, pageSize: CasePageSize): CasePage<T> {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(pageCount, Math.max(1, Math.floor(requestedPage) || 1));
  const offset = (safePage - 1) * pageSize;
  return {
    items: items.slice(offset, offset + pageSize),
    currentPage: safePage,
    pageCount,
    firstItem: total === 0 ? 0 : offset + 1,
    lastItem: Math.min(offset + pageSize, total),
  };
}

type SourceLocation = { country?: string | null; region?: string | null; lat: number; lon: number };

function formatCoordinate(value: number, positiveHemisphere: string, negativeHemisphere: string): string {
  const hemisphere = value < 0 ? negativeHemisphere : positiveHemisphere;
  const degrees = new Intl.NumberFormat('en-US', {
    useGrouping: false,
    maximumSignificantDigits: 15,
  }).format(Math.abs(value));
  return `${degrees}° ${hemisphere}`;
}

export function formatCaseLocation(location: SourceLocation): { area: string; coordinates: string } {
  const country = location.country?.trim();
  const region = location.region?.trim();
  const areaParts = [country, region].filter((value, index, all): value is string => Boolean(value) && all.findIndex(candidate => candidate?.toLocaleLowerCase() === value!.toLocaleLowerCase()) === index);
  const hasValidCoordinates = Number.isFinite(location.lat) && Number.isFinite(location.lon)
    && Math.abs(location.lat) <= 90 && Math.abs(location.lon) <= 180;
  return {
    area: areaParts.join(' · ') || 'Location not reported',
    coordinates: hasValidCoordinates
      ? `${formatCoordinate(location.lat, 'N', 'S')}, ${formatCoordinate(location.lon, 'E', 'W')}`
      : 'Coordinates unavailable',
  };
}
