export function shouldActivateMapPanel(isIntersecting: boolean, observerSupported: boolean): boolean {
  return !observerSupported || isIntersecting;
}

export function shouldBuildObservationPoints(recordMode: 'sources' | 'plumes', publisherFootprintsSelected: boolean): boolean {
  return recordMode === 'plumes' && !publisherFootprintsSelected;
}

export function shouldBuildSourcePoints(
  recordMode: 'sources' | 'plumes',
  dataLayer: 'source-density' | 'observed-flux' | 'plume-footprints' | 'investigation-priority',
  priorityRanksAvailable: boolean,
): boolean {
  return recordMode === 'sources'
    && (dataLayer === 'source-density' || (dataLayer === 'investigation-priority' && !priorityRanksAvailable));
}

export function shouldAnalyzeObservationHistory(
  recordMode: 'sources' | 'plumes',
  dataLayer: 'source-density' | 'observed-flux' | 'plume-footprints' | 'investigation-priority',
): boolean {
  return recordMode === 'plumes' || dataLayer === 'observed-flux' || dataLayer === 'plume-footprints';
}

export function shouldLoadSelectedSourceHistory(route: 'dashboard' | 'map' | 'cases' | 'audit' | 'documents' | 'blockchain' | 'reports' | 'operators' | 'settings', caseDetailsOpen: boolean): boolean {
  return route !== 'map' || caseDetailsOpen;
}

export function shouldLoadCompleteObservationHistory(
  mapVisible: boolean,
  mapActivated: boolean,
  recordMode: 'sources' | 'plumes',
  dataLayer: 'source-density' | 'observed-flux' | 'plume-footprints' | 'investigation-priority',
): boolean {
  return mapVisible && mapActivated && shouldAnalyzeObservationHistory(recordMode, dataLayer);
}
