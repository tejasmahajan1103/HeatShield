import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  HeartPulse,
  Droplets,
  Clock,
  AlertCircle,
  Cpu,
  CheckCircle2,
  Sun
} from 'lucide-react';
import type { Recommendation, HeatRiskResult, HeatRiskInput } from '../types';
import { recommendationService } from '../services/recommendationService';
import { heatRiskService } from '../services/heatRiskService';
import { getRiskBadgeColor } from '../utils/formatters';

export const RecommendationsPage: React.FC = () => {
  const routerLocation = useLocation();
  const stateData = routerLocation.state as { input?: HeatRiskInput; result?: HeatRiskResult } | null;

  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [lastResult, setLastResult] = useState<HeatRiskResult | null>(null);
  const [lastInput, setLastInput] = useState<HeatRiskInput | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {

        let input: HeatRiskInput;
        let res: HeatRiskResult;

        if (stateData?.input && stateData?.result) {
          input = stateData.input;
          res = stateData.result;
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
        <p className="text-slate-600 text-sm font-medium">Structuring safety recommendations...</p>
      </div>
    );
  }

  const badgeStyle = getRiskBadgeColor(recommendation.riskLevel);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="bg-white border border-stone-200/80 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-3 py-0.5 rounded-full">Safety Protocol</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
              <Cpu className="w-3 h-3 text-purple-600" />
              <span>Bedrock AI Ready</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">Personalized Heat Safety Guidance</h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-1">
            Actionable hydration schedules, rest break protocols, and cooling options for your risk profile.
          </p>
        </div>

        <div className={`px-4 py-3 rounded-2xl border flex items-center gap-3 ${badgeStyle.bg} ${badgeStyle.border}`}>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Current Assessment</div>
            <div className={`text-base font-extrabold ${badgeStyle.text}`}>
              {recommendation.riskLevel} Risk ({recommendation.riskScore}/100)
            </div>
          </div>
        </div>
      </div>

      {/* Environmental Inputs Summary Bar */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs shadow-xs">
        <div>
          <span className="text-slate-500 font-semibold">Location:</span>
          <p className="font-bold text-slate-900 mt-0.5">{lastInput.location}</p>
        </div>
        <div>
          <span className="text-slate-500 font-semibold">Activity:</span>
          <p className="font-bold text-slate-900 capitalize mt-0.5">{lastInput.activity} ({lastInput.durationMinutes} mins)</p>
        </div>
        <div>
          <span className="text-slate-500 font-semibold">Solar Exposure:</span>
          <p className="font-bold text-slate-900 capitalize mt-0.5">{lastInput.shadeAvailability.replace('_', ' ')}</p>
        </div>
        <div>
          <span className="text-slate-500 font-semibold">Calculated At:</span>
          <p className="font-bold text-slate-900 mt-0.5">{lastResult.calculatedAt}</p>
        </div>
      </div>

      {/* Grid: Primary Guidance & Hydration/Rest Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Core Recommendations */}
        <div className="lg:col-span-7 bg-white border border-stone-200/90 rounded-3xl p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 pb-3 border-b border-stone-100">
            <HeartPulse className="w-5 h-5 text-teal-600" />
            <span>Primary Safety Action Plan</span>
          </h2>

          <div className="space-y-3">
            {recommendation.primaryAdvice.map((advice, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-start gap-3">
                <div className="p-1.5 rounded-xl bg-teal-100 text-teal-800 border border-teal-200 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <p className="text-xs text-slate-800 font-medium leading-relaxed">{advice}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-stone-100">
            <div className="p-4.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs">
              <div className="flex items-center gap-2 font-bold text-blue-900 mb-2">
                <Droplets className="w-4 h-4 text-blue-600" />
                <span>Hydration Protocol</span>
              </div>
              <p className="text-slate-700 leading-relaxed font-medium">{recommendation.hydrationGuidance}</p>
            </div>

            <div className="p-4.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-900 mb-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Rest & Shade Breaks</span>
              </div>
              <p className="text-slate-700 leading-relaxed font-medium">{recommendation.restInterval}</p>
            </div>
          </div>
        </div>

        {/* Alternative Time & Emergency Signs */}
        <div className="lg:col-span-5 space-y-6">
          {/* Suggested Alternative Time Window Card */}
          {recommendation.suggestedAlternativeTime && (
            <div className="bg-teal-50/70 border border-teal-200/80 rounded-3xl p-6 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-teal-200/60">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-teal-700" />
                  <h3 className="font-extrabold text-slate-900 text-sm">Suggested Alternative Time</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                  Optimal Window
                </span>
              </div>

              <div className="mt-4 space-y-2">
                <div className="text-xl font-extrabold text-teal-900 font-mono">
                  {recommendation.suggestedAlternativeTime.timeWindow}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {recommendation.suggestedAlternativeTime.reason}
                </p>
                {recommendation.suggestedAlternativeTime.expectedTempC !== undefined && (
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-teal-200/60">
                    <span>Expected Ambient Temp: <strong>{recommendation.suggestedAlternativeTime.expectedTempC}°C</strong></span>
                    <span className="text-emerald-800 font-bold">{recommendation.suggestedAlternativeTime.expectedRiskLevel} Risk</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warning Signs Matrix */}
          <div className="bg-white border border-stone-200/90 rounded-3xl p-6 shadow-sm">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 pb-3 border-b border-stone-100">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Heat Stress Warning Signs</span>
            </h3>

            <div className="mt-4 space-y-2 text-xs">
              {recommendation.emergencySigns.map((sign, i) => (
                <div key={i} className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center gap-2 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
                  <span>{sign}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
