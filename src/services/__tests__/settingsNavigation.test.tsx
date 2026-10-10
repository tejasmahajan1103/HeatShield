import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageSettingsService, DEFAULT_SETTINGS } from '../settingsService';

describe('Settings Navigation & Active Route Logic Tests', () => {
  const settingsService = new LocalStorageSettingsService();

  beforeEach(async () => {
    await settingsService.saveSettings(DEFAULT_SETTINGS);
  });

  const getIsActiveRoute = (itemPath: string, currentPathname: string): boolean => {
    if (itemPath === '/app') {
      return currentPathname === '/app' || currentPathname === '/app/';
    }
    return currentPathname.startsWith(itemPath);
  };

  it('correctly matches active route for Settings (/app/settings)', () => {
    expect(getIsActiveRoute('/app/settings', '/app/settings')).toBe(true);
    expect(getIsActiveRoute('/app/settings', '/app/settings/')).toBe(true);
    expect(getIsActiveRoute('/app/settings', '/app/coolspots')).toBe(false);
    expect(getIsActiveRoute('/app/settings', '/app')).toBe(false);
  });

  it('highlights CoolSpots as active ONLY when on /app/coolspots route', () => {
    expect(getIsActiveRoute('/app/coolspots', '/app/coolspots')).toBe(true);
    expect(getIsActiveRoute('/app/coolspots', '/app/settings')).toBe(false);
    expect(getIsActiveRoute('/app/coolspots', '/app/heat-risk')).toBe(false);
  });

  it('persists updated settings preferences when modified', async () => {
    const initial = await settingsService.getSettings();
    expect(initial.preferredTempUnit).toBe('C');

    const updated = await settingsService.saveSettings({ preferredTempUnit: 'F', preferredDistanceUnit: 'miles' });
    expect(updated.preferredTempUnit).toBe('F');
    expect(updated.preferredDistanceUnit).toBe('miles');

    const verified = await settingsService.getSettings();
    expect(verified.preferredTempUnit).toBe('F');
  });
});
