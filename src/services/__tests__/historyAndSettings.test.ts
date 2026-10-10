import { describe, it, expect } from 'vitest';
import { LocalStorageSettingsService, DEFAULT_SETTINGS } from '../settingsService';

describe('Settings Storage Service Tests', () => {
  const settingsService = new LocalStorageSettingsService();

  it('retrieves default settings and allows updating preferences', async () => {
    const settings = await settingsService.getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);

    const updated = await settingsService.saveSettings({ preferredTempUnit: 'F', preferredDistanceUnit: 'miles' });
    expect(updated.preferredTempUnit).toBe('F');
    expect(updated.preferredDistanceUnit).toBe('miles');

    const retrieved = await settingsService.getSettings();
    expect(retrieved.preferredTempUnit).toBe('F');
  });
});
