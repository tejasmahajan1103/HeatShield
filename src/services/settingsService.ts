import type { UserSettings } from '../types';

const SETTINGS_KEY = 'heatshield_user_settings_v1';

const memorySettingsStorage = new Map<string, string>();

function getStorage(): Storage | { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void } {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    return window.localStorage;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return {
    getItem: (key: string) => memorySettingsStorage.get(key) || null,
    setItem: (key: string, val: string) => memorySettingsStorage.set(key, val),
    removeItem: (key: string) => memorySettingsStorage.delete(key)
  };
}

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
      const storage = getStorage();
      const raw = storage.getItem(SETTINGS_KEY);
      if (!raw) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) {
        return DEFAULT_SETTINGS;
      }
      return {
        preferredTempUnit: parsed.preferredTempUnit === 'F' ? 'F' : 'C',
        preferredDistanceUnit: parsed.preferredDistanceUnit === 'miles' ? 'miles' : 'km',
        defaultActivity: parsed.defaultActivity || DEFAULT_SETTINGS.defaultActivity,
        alertsEnabled: typeof parsed.alertsEnabled === 'boolean' ? parsed.alertsEnabled : DEFAULT_SETTINGS.alertsEnabled,
        darkTheme: typeof parsed.darkTheme === 'boolean' ? parsed.darkTheme : DEFAULT_SETTINGS.darkTheme,
        offlineMode: typeof parsed.offlineMode === 'boolean' ? parsed.offlineMode : DEFAULT_SETTINGS.offlineMode
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...updates };
    try {
      const storage = getStorage();
      storage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save settings to storage:', err);
    }
    return updated;
  }
}

export const settingsService = new LocalStorageSettingsService();
