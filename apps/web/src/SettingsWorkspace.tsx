import type { DefaultWorkspace, WorkspacePreferences } from './workspace-preferences';

type Props = {
  preferences: WorkspacePreferences;
  saveSucceeded: boolean | null;
  onChange: (preferences: WorkspacePreferences) => void;
  onReset: () => void;
};

export default function SettingsWorkspace({ preferences, saveSucceeded, onChange, onReset }: Props) {
  const update = (patch: Partial<WorkspacePreferences>) => onChange({ ...preferences, ...patch });

  return <div className="settings-workspace">
    <section className="panel settings-panel" aria-labelledby="settings-preferences-title">
      <header className="settings-panel-heading"><div><h2 id="settings-preferences-title">Workspace preferences</h2><p>These choices are saved in this browser and take effect in the matching workspace.</p></div><button className="outline-btn" onClick={onReset}>Restore defaults</button></header>
      <div className="settings-fields">
        <label className="settings-field"><span><strong>Starting workspace</strong><small>Used when you open the dashboard root. Direct links continue to open their requested page.</small></span><select value={preferences.defaultWorkspace} onChange={event => update({ defaultWorkspace: event.target.value as DefaultWorkspace })}><option value="dashboard">Dashboard</option><option value="map">Map Explorer</option><option value="cases">Cases</option><option value="audit">Evidence Auditor</option></select></label>
        <label className="settings-field"><span><strong>Map basemap</strong><small>Changes the background used by Map Explorer. It does not change methane observations.</small></span><select value={preferences.mapTheme} onChange={event => update({ mapTheme: event.target.value as WorkspacePreferences['mapTheme'] })}><option value="satellite">Satellite · natural color</option><option value="grayscale">Satellite · grayscale</option><option value="street">Street map</option><option value="dark">Dark map</option></select></label>
        <label className="settings-field"><span><strong>Earth rendering quality</strong><small>Auto adapts to the device; Eco, Balanced, and Quality set a fixed rendering preference.</small></span><select value={preferences.earthQuality} onChange={event => update({ earthQuality: event.target.value as WorkspacePreferences['earthQuality'] })}><option value="auto">Auto</option><option value="eco">Eco</option><option value="balanced">Balanced</option><option value="quality">Quality</option></select></label>
        <label className="settings-sidebar-choice"><input type="checkbox" checked={preferences.sidebarCollapsed} onChange={event => update({ sidebarCollapsed: event.target.checked })}/><span><strong>Start with compact navigation</strong><small>Keep the icon rail visible on desktop and tablet; expand it when labels are needed.</small></span></label>
      </div>
      <p className={`settings-save-status${saveSucceeded === false ? ' settings-save-error' : ''}`} role="status">{saveSucceeded === false ? 'Browser storage is unavailable. These choices apply until this page is closed.' : 'Changes apply immediately and are stored only in this browser.'}</p>
    </section>
    <aside className="settings-boundary"><strong>Service configuration</strong><p>AI credentials, reviewer access, database connections, RPC endpoints, and signing keys stay on the server. They cannot be changed from this browser preferences page.</p></aside>
  </div>;
}
