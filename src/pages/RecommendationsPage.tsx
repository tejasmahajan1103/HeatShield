import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  HeartPulse,
  Droplets,
  Clock,
  AlertCircle,
  Cpu,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Sun
} from 'lucide-react';
import type { Recommendation, HeatRiskResult, HeatRiskInput, UserSettings } from '../types';
import { recommendationService } from '../services/recommendationService';
import { heatRiskService } from '../services/heatRiskService';
import { historyService } from '../services/historyService';
import { settingsService } from '../services/settingsService';
import { getRiskBadgeColor } from '../utils/formatters';
import { CoolSpotCard } from '../components/CoolSpotCard';

export const RecommendationsPage: React.FC = () => {
  const routerLocation = useLocation();
  const stateData = routerLocation.state as { input?: HeatRiskInput; result?: HeatRiskResult } | null;

  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [lastResult, setLastResult] = useState<HeatRiskResult | null>(null);
  const [lastInput, setLastInput] = useState<HeatRiskInput | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const userSettings = await settingsService.getSettings();
        setSettings(userSettings);

        let input: HeatRiskInput;
        let res: HeatRiskResult;

        if (stateData?.input && stateData?.result) {
          input = stateData.input;
          res = stateData.result;
        } else {
          const history = await historyService.getHistory();
          if (history.length > 0) {
            input = history[0].input;
            res = history[0].result;
          } else {
            input = {
              location: 'Bengaluru Central District',
              activity: 'running',
              activityLabel: 'Running',
              plannedTime: '14:30',
              durationMinutes: 45,
              shadeAvailability: 'direct_sun'
            };
            res = await heatRiskService.calculateRisk(input);
          }
        }

        const rec = await recommendationService.generateRecommendations(input, res);

        setLastInput(input);
        setLastResult(res);
        setRecommendation(rec);
      } catch (err) {
        console.error('Failed to load recommendations:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [stateData]);

  if (loading || !recommendation || !lastResult || !lastInput) {
    return (
      <div className="py-20 text-center space-y-4 animate-pulse">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-400 text-sm">Structuring safety recommendations...</p>
      </div>
    );
  }

  const badgeStyle = getRiskBadgeColor(recommendation.riskLevel);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">Safety Protocol</span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
              <Cpu className="w-3 h-3" />
              <span>Bedrock AI Ready</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 mt-1">Personalized Heat Safety Guidance</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Actionable hydration schedules, rest break protocols, and cooling options for your risk profile.
          </p>
        </div>

        <div className={`px-4 py-2 rounded-2xl border flex items-center gap-3 ${badgeStyle.bg} ${badgeStyle.border}`}>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Assessment</div>
            <div className={`text-base font-extrabold ${badgeStyle.text}`}>
              {recommendation.riskLevel} Risk ({recommendation.riskScore}/100)
            </div>
          </div>
        </div>
      </div>

      {/* Environmental Inputs Summary Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-slate-400 font-medium">Location:</span>
          <p className="font-bold text-slate-200 mt-0.5">{lastInput.location}</p>
        </div>
        <div>
          <span className="text-slate-400 font-medium">Activity:</span>
          <p className="font-bold text-slate-200 capitalize mt-0.5">{lastInput.activity} ({lastInput.durationMinutes} mins)</p>
        </div>
        <div>
          <span className="text-slate-400 font-medium">Solar Exposure:</span>
          <p className="font-bold text-slate-200 capitalize mt-0.5">{lastInput.shadeAvailability.replace('_', ' ')}</p>
        </div>
        <div>
          <span className="text-slate-400 font-medium">Calculated At:</span>
          <p className="font-bold text-slate-200 mt-0.5">{lastResult.calculatedAt}</p>
        </div>
      </div>

      {/* Grid: Primary Guidance & Hydration/Rest Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Core Recommendations */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 pb-3 border-b border-slate-800">
            <HeartPulse className="w-5 h-5 text-teal-400" />
            <span>Primary Safety Action Plan</span>
          </h2>

          <div className="space-y-3">
            {recommendation.primaryAdvice.map((advice, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <p className="text-xs text-slate-200 font-medium leading-relaxed">{advice}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs">
              <div className="flex items-center gap-2 font-bold text-blue-400 mb-2">
                <Droplets className="w-4 h-4" />
                <span>Hydration Protocol</span>
              </div>
              <p className="text-slate-300 leading-relaxed">{recommendation.hydrationGuidance}</p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-400 mb-2">
                <Clock className="w-4 h-4" />
                <span>Rest & Shade Breaks</span>
              </div>
              <p className="text-slate-300 leading-relaxed">{recommendation.restInterval}</p>
            </div>
          </div>
        </div>

        {/* Alternative Time & Emergency Signs */}
        <div className="lg:col-span-5 space-y-6">
          {/* Suggested Alternative Time Window Card */}
          {recommendation.suggestedAlternativeTime && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-teal-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-teal-400" />
                  <h3 className="font-bold text-slate-100 text-sm">Suggested Alternative Time</h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300">
                  Optimal Window
                </span>
              </div>

              <div className="mt-4 space-y-2">
                <div className="text-xl font-extrabold text-teal-300 font-mono">
                  {recommendation.suggestedAlternativeTime.timeWindow}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {recommendation.suggestedAlternativeTime.reason}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <span>Expected Ambient Temp: <strong>{recommendation.suggestedAlternativeTime.expectedTempC}°C</strong></span>
                  <span className="text-emerald-400 font-semibold">{recommendation.suggestedAlternativeTime.expectedRiskLevel} Risk</span>
                </div>
              </div>
            </div>
          )}

          {/* Warning Signs Matrix */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2 pb-3 border-b border-slate-800">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>Heat Stress Warning Signs</span>
            </h3>

            <div className="mt-4 space-y-2 text-xs">
              {recommendation.emergencySigns.map((sign, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                  <span>{sign}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Suggested CoolSpots Section */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-teal-400" />
            <span>Recommended Cooling Locations for this Activity</span>
          </h2>

          <Link to="/app/coolspots" className="text-xs text-teal-400 font-semibold hover:text-teal-300 flex items-center gap-1">
            <span>Explore All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendation.suggestedCoolSpots.map((spot) => (
            <CoolSpotCard key={spot.id} spot={spot} distanceUnit={settings?.preferredDistanceUnit} />
          ))}
        </div>
      </div>
    </div>
  );
};
