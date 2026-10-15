export type WorkspaceRoute = 'dashboard' | 'map' | 'indicators' | 'cases' | 'audit' | 'documents' | 'blockchain' | 'reports' | 'operators' | 'settings';
export type DefaultWorkspace = 'dashboard' | 'map' | 'cases' | 'audit';
export type WorkspaceMapTheme = 'satellite' | 'grayscale' | 'street' | 'dark';
export type EarthRenderPreference = 'auto' | 'eco' | 'balanced' | 'quality';

export type WorkspacePreferences = {
  defaultWorkspace: DefaultWorkspace;
  mapTheme: WorkspaceMapTheme;
  earthQuality: EarthRenderPreference;
  sidebarCollapsed: boolean;
};

export type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const WORKSPACE_PREFERENCES_KEY = 'methane-response-workspace-preferences-v1';
export const DEFAULT_WORKSPACE_PREFERENCES: WorkspacePreferences = {
  defaultWorkspace: 'dashboard',
  mapTheme: 'satellite',
  earthQuality: 'auto',
  sidebarCollapsed: false,
};

const workspaceRoutes: WorkspaceRoute[] = ['dashboard', 'map', 'indicators', 'cases', 'audit', 'documents', 'blockchain', 'reports', 'operators', 'settings'];
const defaultWorkspaces: DefaultWorkspace[] = ['dashboard', 'map', 'cases', 'audit'];
const mapThemes: WorkspaceMapTheme[] = ['satellite', 'grayscale', 'street', 'dark'];
const earthPreferences: EarthRenderPreference[] = ['auto', 'eco', 'balanced', 'quality'];

function browserStorage(): PreferenceStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function isMember<T extends string>(value: unknown, choices: T[]): value is T {
  return typeof value === 'string' && choices.includes(value as T);
}

export function readWorkspacePreferences(storage: PreferenceStorage | null = browserStorage()): WorkspacePreferences {
  if (!storage) return { ...DEFAULT_WORKSPACE_PREFERENCES };
  try {
    const parsed: unknown = JSON.parse(storage.getItem(WORKSPACE_PREFERENCES_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...DEFAULT_WORKSPACE_PREFERENCES };
    const value = parsed as Record<string, unknown>;
    return {
      defaultWorkspace: isMember(value.defaultWorkspace, defaultWorkspaces) ? value.defaultWorkspace : DEFAULT_WORKSPACE_PREFERENCES.defaultWorkspace,
      mapTheme: isMember(value.mapTheme, mapThemes) ? value.mapTheme : DEFAULT_WORKSPACE_PREFERENCES.mapTheme,
      earthQuality: isMember(value.earthQuality, earthPreferences) ? value.earthQuality : DEFAULT_WORKSPACE_PREFERENCES.earthQuality,
      sidebarCollapsed: typeof value.sidebarCollapsed === 'boolean' ? value.sidebarCollapsed : DEFAULT_WORKSPACE_PREFERENCES.sidebarCollapsed,
    };
  } catch {
    return { ...DEFAULT_WORKSPACE_PREFERENCES };
  }
}

export function writeWorkspacePreferences(preferences: WorkspacePreferences, storage: PreferenceStorage | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(WORKSPACE_PREFERENCES_KEY, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}

export function getInitialWorkspace(pathname: string, preferences: WorkspacePreferences): WorkspaceRoute {
  const pathSegment = pathname.split('/')[2] || '';
  if (pathSegment === '' || pathSegment === 'dashboard') return preferences.defaultWorkspace;
  return workspaceRoutes.includes(pathSegment as WorkspaceRoute) ? pathSegment as WorkspaceRoute : 'dashboard';
}
