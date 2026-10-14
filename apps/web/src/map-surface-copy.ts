export type MapSurfaceTheme = 'dark' | 'satellite' | 'grayscale' | 'street';
export type MapSurfaceRecordMode = 'sources' | 'plumes';
export type MapSurfaceDataLayer = 'source-density' | 'observed-flux' | 'plume-footprints' | 'investigation-priority';

export function getDataStatusIndicatorKind(isHistoricalSnapshot: boolean): 'historical' | 'synthetic' {
  return isHistoricalSnapshot ? 'historical' : 'synthetic';
}

export type MapToplineInput = {
  status: 'ready' | 'loading' | 'error';
  dataLayer: MapSurfaceDataLayer;
  recordMode: MapSurfaceRecordMode;
  sourceCount: number;
  positiveFluxLocationCount: number;
  footprintPolygonCount: number;
  selectedHistoryMonth: string | null;
  priorityPointCount: number;
  priorityReady: boolean;
};

export function getMapToplineLabel(input: MapToplineInput): string {
  if (input.status === 'loading') return 'Loading basemap';
  if (input.status === 'error') return 'Map unavailable';
  if (input.dataLayer === 'observed-flux') return `${input.positiveFluxLocationCount.toLocaleString()} flux observations`;
  if (input.dataLayer === 'plume-footprints') return `${input.footprintPolygonCount.toLocaleString()} geometries · ${input.selectedHistoryMonth || 'month unavailable'}`;
  if (input.dataLayer === 'investigation-priority' && input.priorityReady) return `${input.priorityPointCount.toLocaleString()} ranked sources`;
  if (input.recordMode === 'plumes') return `${input.sourceCount.toLocaleString()} historical observations`;
  return `${input.sourceCount.toLocaleString()} sources`;
}

export function getMapArchiveLabel(synthetic: boolean, latestObservationDate: string | null): string {
  if (synthetic) return 'Synthetic demo data · DEMO · not live';
  return `UNEP MARS historical archive · through ${latestObservationDate || 'date unavailable'} UTC · LIVE FEED OFF`;
}

export function getMapBasemapDescription(theme: MapSurfaceTheme): string {
  if (theme === 'grayscale') return 'Static NASA Blue Marble (August 2004) overview blended over Esri imagery in grayscale; Esri supplies close detail.';
  if (theme === 'satellite') return 'Static NASA Blue Marble (August 2004) overview blended over Esri imagery; Esri supplies close detail.';
  return `OpenFreeMap ${theme === 'street' ? 'street' : 'dark'} basemap.`;
}

export function getMapInteractionHint(recordMode: MapSurfaceRecordMode): string {
  return `Drag to pan · scroll to zoom · click ${recordMode === 'plumes' ? 'an observation' : 'a source'}`;
}
