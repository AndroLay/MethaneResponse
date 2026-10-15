import { describe, expect, test } from 'bun:test';

const preferencesModule = await import('./workspace-preferences').catch(() => null);

describe('workspace preferences', () => {
  test('loads validated defaults and persists real browser preferences', () => {
    expect(preferencesModule).not.toBeNull();
    if (!preferencesModule) return;

    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
    };
    const defaults = preferencesModule.readWorkspacePreferences(adapter);
    expect(defaults).toEqual({
      defaultWorkspace: 'dashboard',
      mapTheme: 'satellite',
      earthQuality: 'auto',
      sidebarCollapsed: false,
    });

    const saved = { defaultWorkspace: 'cases', mapTheme: 'grayscale', earthQuality: 'eco', sidebarCollapsed: true } as const;
    expect(preferencesModule.writeWorkspacePreferences(saved, adapter)).toBe(true);
    expect(preferencesModule.readWorkspacePreferences(adapter)).toEqual(saved);
    expect(preferencesModule.readWorkspacePreferences({
      getItem: () => '{"mapTheme":"made-up","earthQuality":"ultra"}',
      setItem: () => undefined,
    })).toEqual(defaults);
  });

  test('deep links keep their route while the dashboard root honors the configured start page', () => {
    expect(preferencesModule).not.toBeNull();
    if (!preferencesModule) return;
    const preferences = { defaultWorkspace: 'cases', mapTheme: 'satellite', earthQuality: 'auto', sidebarCollapsed: false } as const;
    expect(preferencesModule.getInitialWorkspace('/dashboard', preferences)).toBe('cases');
    expect(preferencesModule.getInitialWorkspace('/dashboard/audit', preferences)).toBe('audit');
    expect(preferencesModule.getInitialWorkspace('/dashboard/operators', preferences)).toBe('operators');
    expect(preferencesModule.getInitialWorkspace('/dashboard/indicators', preferences)).toBe('indicators');
    expect(preferencesModule.getInitialWorkspace('/dashboard/unknown', preferences)).toBe('dashboard');
  });
});
