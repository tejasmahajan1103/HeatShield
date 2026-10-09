import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ThermometerSun,
  MapPin,
  ArrowRight,
  ShieldCheck,
  History,
  Info
} from 'lucide-react';
import { WeatherCard } from '../components/WeatherCard';
import { CoolSpotCard } from '../components/CoolSpotCard';
import type { WeatherData, HeatRiskResult, CoolSpot, AssessmentRecord, UserSettings } from '../types';
import { weatherService } from '../services/weatherService';
import { heatRiskService } from '../services/heatRiskService';
import { coolSpotService } from '../services/coolSpotService';
import { historyService } from '../services/historyService';
import { settingsService } from '../services/settingsService';
import { getRiskBadgeColor } from '../utils/formatters';

export const DashboardPage: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [quickRisk, setQuickRisk] = useState<HeatRiskResult | null>(null);
  const [coolSpots, setCoolSpots] = useState<CoolSpot[]>([]);
  const [recentHistory, setRecentHistory] = useState<AssessmentRecord[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const userSettings = await settingsService.getSettings();
        setSettings(userSettings);

        const w = await weatherService.getCurrentWeather('Bengaluru Central District');
        setWeather(w);

        const risk = await heatRiskService.calculateRisk({
          location: 'Bengaluru Central District',
          activity: 'walking',
          plannedTime: '14:00',
          durationMinutes: 45,
          shadeAvailability: 'partial_shade'
        });
        setQuickRisk(risk);

        const spots = await coolSpotService.getCoolSpots({ maxDistanceKm: 3 });
        setCoolSpots(spots.slice(0, 2));

        const hist = await historyService.getHistory();
        setRecentHistory(hist.slice(0, 2));
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  if (loading || !weather || !quickRisk) {
    return (
      <div className="py-20 text-center space-y-4 animate-pulse">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-400 text-sm">Loading environmental telemetry and risk heuristics...</p>
      </div>
    );
  }

  const badgeStyle = getRiskBadgeColor(quickRisk.level);

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-6 rounded-3xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-orange-400">Environmental Dashboard</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              Demo Telemetry
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 mt-1">Heat & Safety Monitor</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Current conditions and quick heat-stress risk preview for your planned activities.
          </p>
        </div>

        {/* Primary CTA Button */}
        <Link
          to="/app/heat-risk"
          className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2.5 transition shrink-0"
        >
          <ThermometerSun className="w-5 h-5" />
          <span>Check My Heat Risk</span>
        </Link>
      </div>

      {/* Grid: Weather & Preliminary Risk Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weather Telemetry Widget */}
        <WeatherCard weather={weather} tempUnit={settings?.preferredTempUnit} />

        {/* Quick Preliminary Heat-Risk Summary Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-orange-400" />
                <h3 className="font-bold text-slate-100 text-base">Preliminary Risk Preview</h3>
              </div>
              <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                {quickRisk.level} Risk ({quickRisk.score}/100)
              </span>
            </div>

            <p className="text-xs text-slate-300 mt-4 leading-relaxed">
              {quickRisk.summary}
            </p>

            <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Sample Activity:</span>
                <span className="font-semibold text-slate-200">45 Min Outdoor Walking</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Shade Coverage:</span>
                <span className="font-semibold text-slate-200">Partial Shade</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Heuristic Model Uncertainty:</span>
                <span className="font-semibold text-amber-400">{quickRisk.uncertaintyScore}%</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">Preliminary deterministic calculation</span>
            <Link
              to="/app/heat-risk"
              className="text-xs text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1 transition"
            >
              <span>Custom Assessment</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* CoolSpot Preview Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-teal-400" />
              <span>Nearby CoolSpots</span>
            </h2>
            <p className="text-xs text-slate-400">Sample verified cooling locations in proximity</p>
          </div>

          <Link
            to="/app/coolspots"
            className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1 transition"
          >
            <span>View All CoolSpots</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coolSpots.map(spot => (
            <CoolSpotCard key={spot.id} spot={spot} distanceUnit={settings?.preferredDistanceUnit} />
          ))}
        </div>
      </div>

      {/* Recent Assessments & How HeatShield Works */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Assessments List */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-orange-400" />
              <h3 className="font-bold text-slate-100 text-base">Recent Demo Assessments</h3>
            </div>
            <Link to="/app/history" className="text-xs text-slate-400 hover:text-slate-200">
              View History
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {recentHistory.map((item) => (
              <div key={item.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">{item.input.location}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-mono">
                      {item.date}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Demo
                    </span>
                  </div>
                  <p className="text-slate-400 mt-1">
                    Activity: <strong className="text-slate-300 capitalize">{item.input.activity}</strong> ({item.input.durationMinutes} mins)
                  </p>
                </div>

                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    item.result.level === 'High' ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {item.result.level} ({item.result.score}/100)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How HeatShield Works Explanation */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Info className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-slate-100 text-base">How HeatShield Works</h3>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                1. <strong>Telemetry Layer:</strong> Aggregates temperature, relative humidity, wind vector, and UV radiation.
              </p>
              <p>
                2. <strong>Risk Engine:</strong> Applies a deterministic wet-bulb thermal stress proxy combined with duration and metabolic activity load.
              </p>
              <p>
                3. <strong>CoolSpot Routing:</strong> Recommends nearest verified shade and hydration locations to mitigate risk.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
            AWS Bedrock AI interface prepared for production rollout.
          </div>
        </div>
      </div>
    </div>
  );
};
