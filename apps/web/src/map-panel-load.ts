export function shouldActivateMapPanel(isIntersecting: boolean, observerSupported: boolean): boolean {
  return !observerSupported || isIntersecting;
}
