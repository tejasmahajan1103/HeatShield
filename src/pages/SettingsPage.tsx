import React, { useEffect, useState } from 'react';
import {
  Thermometer,
  Bell,
  Shield,
  Cloud,
  CheckCircle2
} from 'lucide-react';
import type { UserSettings } from '../types';
import { settingsService } from '../services/settingsService';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>({
    preferredTempUnit: 'C',
    preferredDistanceUnit: 'km',
    defaultActivity: 'walking',
    alertsEnabled: true,
    darkTheme: true,
    offlineMode: false
  });

  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      const s = await settingsService.getSettings();
      setSettings(s);
    }
    loadSettings();
  }, []);

  const updateSetting = async <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const updated = await settingsService.saveSettings({ [key]: value });
    setSettings(updated);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2500);
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">User Configuration</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Local Preferences
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 mt-1">Application Settings</h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1">
          Customize temperature scales, distance metrics, default activity selection, and local telemetry storage.
        </p>
      </div>

      {savedBanner && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Settings saved to local client storage.</span>
        </div>
      )}

      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        {/* Preferred Units */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-100 text-base flex items-center gap-2 pb-2 border-b border-slate-800">
            <Thermometer className="w-4 h-4 text-orange-400" />
            <span>Measurement Units</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Temperature Unit */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200">Temperature Scale</span>
                <p className="text-slate-400 text-[11px] mt-0.5">Celsius (°C) vs Fahrenheit (°F)</p>
              </div>

              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => updateSetting('preferredTempUnit', 'C')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    settings.preferredTempUnit === 'C' ? 'bg-orange-500 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  °C
                </button>
                <button
                  onClick={() => updateSetting('preferredTempUnit', 'F')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    settings.preferredTempUnit === 'F' ? 'bg-orange-500 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  °F
                </button>
              </div>
            </div>

            {/* Distance Unit */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200">Distance Radius</span>
                <p className="text-slate-400 text-[11px] mt-0.5">Kilometers (km) vs Miles (mi)</p>
              </div>

              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => updateSetting('preferredDistanceUnit', 'km')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    settings.preferredDistanceUnit === 'km' ? 'bg-teal-500 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  KM
                </button>
                <button
                  onClick={() => updateSetting('preferredDistanceUnit', 'miles')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    settings.preferredDistanceUnit === 'miles' ? 'bg-teal-500 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  MI
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications & Toggles */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="font-bold text-slate-100 text-base flex items-center gap-2 pb-2 border-b border-slate-800">
            <Bell className="w-4 h-4 text-amber-400" />
            <span>Alert Preferences</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200">Extreme Heat Warnings</span>
                <p className="text-slate-400 text-[11px] mt-0.5">Simulate alert banners when ambient thermal stress exceeds threshold</p>
              </div>

              <input
                type="checkbox"
                checked={settings.alertsEnabled}
                onChange={(e) => updateSetting('alertsEnabled', e.target.checked)}
                className="w-5 h-5 accent-orange-500 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Privacy & Cloud Integration Note */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-3 text-slate-400">
          <div className="flex items-center gap-2 font-bold text-slate-300">
            <Shield className="w-4 h-4 text-teal-400" />
            <span>Privacy & Storage Notice</span>
          </div>
          <p className="leading-relaxed">
            All user settings and demo assessment logs are stored strictly inside your local browser storage (<code className="text-amber-400">localStorage</code>). No personal data or geographic coordinates are transmitted to external servers.
          </p>
          <div className="pt-2 border-t border-slate-800 flex items-center gap-2 text-amber-400 text-[11px]">
            <Cloud className="w-3.5 h-3.5 shrink-0" />
            <span>AWS Cognito authentication & DynamoDB cloud sync interface ready for phase 2 deployment.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
