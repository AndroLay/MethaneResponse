import { expect, test } from 'bun:test';
import { formatCaseLocation, pageForSelectedCase, paginateCases, resolveSelectedCase } from './case-table';

test('source case search is bounded and matches all words across case metadata', async () => {
  const module = await import('./case-table') as typeof import('./case-table') & {
    searchSourceCases?: <T extends { sourceId: string; country?: string; region?: string; sector?: string }>(
      sources: readonly T[], query: string,
    ) => { items: T[]; totalMatches: number };
  };
  expect(module.searchSourceCases).toBeDefined();
  if (!module.searchSourceCases) return;

  const records = Array.from({ length: 25 }, (_, index) => ({
    sourceId: `KAZ_S_${String(index + 1).padStart(3, '0')}`,
    country: 'Kazakhstan', region: `Mangystau ${index + 1}`, sector: 'Oil and Gas',
  }));
  const result = module.searchSourceCases(records, 'kazakhstan oil');
  expect(result.totalMatches).toBe(25);
  expect(result.items).toHaveLength(20);
  expect(result.items[0]).toBe(records[0]);
  expect(result.items[19]).toBe(records[19]);
});

test('source case search does not render the full inventory for an empty query', async () => {
  const module = await import('./case-table') as typeof import('./case-table') & {
    searchSourceCases?: <T extends { sourceId: string }>(sources: readonly T[], query: string) => { items: T[]; totalMatches: number };
  };
  expect(module.searchSourceCases).toBeDefined();
  if (!module.searchSourceCases) return;
  const records = Array.from({ length: 4_218 }, (_, index) => ({ sourceId: `MARS_${index + 1}` }));
  expect(module.searchSourceCases(records, '  ')).toEqual({ items: [], totalMatches: 0 });
});

test('case pagination exposes a bounded page window for thousands of rows', () => {
  const records = Array.from({ length: 4_211 }, (_, index) => index + 1);

  const secondPage = paginateCases(records, 2, 25);
  expect(secondPage).toMatchObject({ currentPage: 2, pageCount: 169, firstItem: 26, lastItem: 50 });
  expect(secondPage.items).toHaveLength(25);
  expect(secondPage.items[0]).toBe(26);

  const finalPage = paginateCases(records, 999, 25);
  expect(finalPage).toMatchObject({ currentPage: 169, pageCount: 169, firstItem: 4_201, lastItem: 4_211 });
  expect(finalPage.items).toHaveLength(11);
});

test('empty results have a safe page window', () => {
  expect(paginateCases([], 8, 50)).toMatchObject({
    items: [], currentPage: 1, pageCount: 1, firstItem: 0, lastItem: 0,
  });
});

test('case locations retain reported country, region and source coordinate precision', () => {
  expect(formatCaseLocation({
    country: 'Kazakhstan', region: 'Mangystau', lat: 43.41337, lon: 52.91829,
  })).toEqual({
    area: 'Kazakhstan · Mangystau',
    coordinates: '43.41337° N, 52.91829° E',
  });
});

test('case locations do not repeat identical country and region labels', () => {
  expect(formatCaseLocation({
    country: 'Kazakhstan', region: 'Kazakhstan', lat: -8.5, lon: -120.25,
  })).toEqual({
    area: 'Kazakhstan',
    coordinates: '8.5° S, 120.25° W',
  });
});

test('case inspector keeps the requested visible source and falls back safely after filtering', () => {
  const records = [{ sourceId: 'MARS-1' }, { sourceId: 'MARS-2' }];
  expect(resolveSelectedCase(records, 'MARS-2')).toBe(records[1]);
  expect(resolveSelectedCase(records, 'MARS-9')).toBe(records[0]);
  expect(resolveSelectedCase([], 'MARS-9')).toBeNull();
});

test('selected case opens on the page containing its row', () => {
  const records = Array.from({ length: 4_211 }, (_, index) => ({ sourceId: `MARS-${index + 1}` }));
  expect(pageForSelectedCase(records, 'MARS-301', 25)).toBe(13);
  expect(pageForSelectedCase(records, 'MARS-301', 50)).toBe(7);
  expect(pageForSelectedCase(records, 'filtered-out', 25)).toBe(1);
});
