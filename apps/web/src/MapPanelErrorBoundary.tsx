import { Component, type ReactNode } from 'react';

export const MAP_PANEL_LOAD_FAILURE_COPY = 'The interactive map could not be loaded. Reload this page to retry; source and evidence review remains available.';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class MapPanelErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div className="map-component-fallback" role="alert">
        <strong>Interactive map unavailable</strong>
        <span>{MAP_PANEL_LOAD_FAILURE_COPY}</span>
        <button type="button" onClick={() => window.location.reload()}>Reload page</button>
      </div>;
    }
    return this.props.children;
  }
}
