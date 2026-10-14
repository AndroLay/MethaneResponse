import { expect, test } from 'bun:test';
import { getObservationMarkerDetails, getSourceMarkerDetails } from './map-marker-details';

test('source marker details bind historical values to the pinned MARS snapshot', () => {
  const details = getSourceMarkerDetails({
    sourceId: 'KAZ_S_136', region: 'Kazakhstan', lat: 50.01, lon: 67.04,
    maxFluxKgHr: 1200, plumeCount: 8, lastObserved: '2026-09-11', synthetic: false,
  }, { snapshotId: 'unep-mars-2026-09-11-abcd', archiveSha256: 'a'.repeat(64) });

  expect(details).toEqual([
    { label: 'MARS source ID', value: 'KAZ_S_136' },
    { label: 'Region', value: 'Kazakhstan' },
    { label: 'Coordinates', value: '50.01, 67.04' },
    { label: 'Highest reported flux in archive', value: '1200 kg/h' },
    { label: 'Linked plume records', value: '8' },
    { label: 'Last recorded plume date', value: '2026-09-11' },
    { label: 'Dataset snapshot', value: 'unep-mars-2026-09-11-abcd' },
    { label: 'Source archive SHA-256', value: 'a'.repeat(64) },
  ]);
});

test('source marker details label missing flux and missing snapshot as unknown', () => {
  const details = getSourceMarkerDetails({
    sourceId: 'SRC-UNLINKED', region: 'Region not specified', lat: 0, lon: 0,
    maxFluxKgHr: null, plumeCount: 0, lastObserved: null, synthetic: false,
  }, {});

  expect(details.find(row => row.label === 'Highest reported flux in archive')?.value).toBe('Not reported');
  expect(details.find(row => row.label === 'Dataset snapshot')?.value).toBe('Snapshot unavailable');
  expect(details.find(row => row.label === 'Source archive SHA-256')?.value).toBe('Hash unavailable');
});

test('source marker details preserve notification and feedback as raw MARS metadata', () => {
  const details = getSourceMarkerDetails({
    sourceId: 'SRC-1', region: 'Region', lat: 1, lon: 2, maxFluxKgHr: 0,
    plumeCount: 1, lastObserved: '2026-01-01', notified: 'Yes', feedback: 'Operator replied', synthetic: false,
  }, {});

  expect(details.find(row => row.label === 'MARS notification field')?.value).toBe('Yes');
  expect(details.find(row => row.label === 'MARS feedback field · not repair proof')?.value).toBe('Operator replied');
});

test('synthetic source details identify the demo fixture and do not claim a MARS snapshot', () => {
  const details = getSourceMarkerDetails({
    sourceId: 'DEMO-1', region: 'Demo', lat: 1, lon: 2, maxFluxKgHr: null, plumeCount: 0, synthetic: true,
  }, { snapshotId: 'should-not-be-used', archiveSha256: 'c'.repeat(64) });

  expect(details.find(row => row.label === 'Dataset snapshot')?.value).toBe('DEMO synthetic fixture');
});

test('observation marker details retain exact MARS record ID, timestamp, flux uncertainty, and source link state', () => {
  const details = getObservationMarkerDetails({
    id: 'PLUME-17', sourceId: null, linkStatus: 'source_id_missing', date: '2026-09-11T05:41:00Z',
    fluxKgHr: 1420.5, uncertaintyKgHr: 210.25, satellite: 'Sentinel-2', lat: 50.01, lon: 67.04,
  }, { snapshotId: 'mars-snapshot-17', archiveSha256: 'b'.repeat(64) });

  expect(details).toEqual([
    { label: 'MARS observation ID', value: 'PLUME-17' },
    { label: 'Source link', value: 'No source ID in MARS row' },
    { label: 'Observation timestamp', value: '2026-09-11T05:41:00Z' },
    { label: 'Reported flux', value: '1420.5 kg/h' },
    { label: 'Reported uncertainty', value: '±210.25 kg/h' },
    { label: 'Satellite', value: 'Sentinel-2' },
    { label: 'Coordinates', value: '50.01, 67.04' },
    { label: 'Dataset snapshot', value: 'mars-snapshot-17' },
    { label: 'Source archive SHA-256', value: 'b'.repeat(64) },
  ]);
});
