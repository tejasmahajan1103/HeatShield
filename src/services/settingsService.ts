import type { UserSettings } from '../types';

const SETTINGS_KEY = 'heatshield_user_settings_v1';

export const DEFAULT_SETTINGS: UserSettings = {
  preferredTempUnit: 'C',
  preferredDistanceUnit: 'km',
  defaultActivity: 'walking',
  alertsEnabled: true,
  darkTheme: true,
  offlineMode: false
};

export interface SettingsService {
  getSettings(): Promise<UserSettings>;
  saveSettings(settings: Partial<UserSettings>): Promise<UserSettings>;
}

export class LocalStorageSettingsService implements SettingsService {
  async getSettings(): Promise<UserSettings> {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...updates };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  }
}

export const settingsService = new LocalStorageSettingsService();
