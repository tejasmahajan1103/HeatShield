import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ThermometerSun,
  MapPin,
  Clock,
  Activity,
  CheckCircle2,
  ArrowRight,
  Bookmark,
  Sparkles
} from 'lucide-react';
import type { HeatRiskInput, HeatRiskResult, ActivityType, ShadeOption } from '../types';
import { heatRiskService } from '../services/heatRiskService';
import { historyService } from '../services/historyService';
import { HeatRiskCard } from '../components/HeatRiskCard';

export const HeatRiskPage: React.FC = () => {
  const navigate = useNavigate();

  // Form states
  const [location, setLocation] = useState('Bengaluru Central District');
  const [activity, setActivity] = useState<ActivityType>('walking');
  const [plannedTime, setPlannedTime] = useState('14:30');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [shadeAvailability, setShadeAvailability] = useState<ShadeOption>('direct_sun');

  // Validation & Result states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HeatRiskResult | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const activities: { value: ActivityType; label: string; desc: string }[] = [
    { value: 'walking', label: 'Walking', desc: 'Light to moderate aerobic movement' },
    { value: 'cycling', label: 'Cycling', desc: 'Elevated internal thermal load' },
    { value: 'running', label: 'Running', desc: 'High metabolic heat production' },
    { value: 'outdoor_work', label: 'Outdoor Work', desc: 'Sustained heavy physical labor' },
    { value: 'other', label: 'Other Exertion', desc: 'General outdoor movement' }
  ];

  const shadeOptions: { value: ShadeOption; label: string; desc: string }[] = [
    { value: 'direct_sun', label: 'Direct Sun', desc: 'Unshielded solar radiation' },
    { value: 'partial_shade', label: 'Partial Shade', desc: 'Intermittent tree/building cover' },
    { value: 'full_shade', label: 'Full Shade', desc: 'Continuous shaded protection' }
  ];

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!location.trim()) errs.location = 'Please enter a valid location name.';
    if (!plannedTime) errs.plannedTime = 'Please select a planned activity time.';
    if (isNaN(durationMinutes) || durationMinutes < 5 || durationMinutes > 600) {
      errs.durationMinutes = 'Duration must be between 5 and 600 minutes.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setSavedSuccess(false);
    try {
      const input: HeatRiskInput = {
        location: location.trim(),
        activity,
        activityLabel: activities.find(a => a.value === activity)?.label,
        plannedTime,
        durationMinutes: Number(durationMinutes),
        shadeAvailability
      };

      const res = await heatRiskService.calculateRisk(input);
      setResult(res);

      // Auto save record to history
      await historyService.saveAssessment({
        id: `rec-${Date.now()}`,
        date: `Today, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        input,
        result: res,
        isDemo: true
      });
      setSavedSuccess(true);
    } catch (err) {
      console.error('Heat risk calculation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-orange-400">Risk Assessment Engine</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Deterministic Heuristic
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 mt-1">Heat-Risk Assessment</h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-3xl">
          Enter your planned activity details below. HeatShield calculates a preliminary risk score based on estimated wet-bulb thermal load, metabolic exertion, and solar exposure.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 pb-4 border-b border-slate-800">
            <Activity className="w-5 h-5 text-orange-400" />
            <span>Activity & Exposure Parameters</span>
          </h2>

          <form onSubmit={handleCalculate} className="space-y-5">
            {/* Location Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Location Name
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Cubbon Park or Central Metro Plaza"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border ${
                    errors.location ? 'border-rose-500' : 'border-slate-800 focus:border-orange-500'
                  } text-slate-100 text-sm focus:outline-none transition`}
                />
              </div>
              {errors.location && <p className="text-xs text-rose-400 mt-1">{errors.location}</p>}
            </div>

            {/* Activity Options */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Select Activity
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activities.map((act) => (
                  <button
                    key={act.value}
                    type="button"
                    onClick={() => setActivity(act.value)}
                    className={`p-3 rounded-xl border text-left transition ${
                      activity === act.value
                        ? 'bg-orange-500/15 border-orange-500 text-orange-300 font-bold'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="text-xs font-semibold">{act.label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{act.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Time & Duration Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Planned Start Time
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="time"
                    value={plannedTime}
                    onChange={(e) => setPlannedTime(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border ${
                      errors.plannedTime ? 'border-rose-500' : 'border-slate-800 focus:border-orange-500'
                    } text-slate-100 text-sm focus:outline-none transition`}
                  />
                </div>
                {errors.plannedTime && <p className="text-xs text-rose-400 mt-1">{errors.plannedTime}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="600"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className={`w-full px-4 py-2.5 rounded-xl bg-slate-950 border ${
                    errors.durationMinutes ? 'border-rose-500' : 'border-slate-800 focus:border-orange-500'
                  } text-slate-100 text-sm focus:outline-none transition`}
                />
                {errors.durationMinutes && <p className="text-xs text-rose-400 mt-1">{errors.durationMinutes}</p>}
              </div>
            </div>

            {/* Shade Availability Options */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Shade Availability
              </label>
              <div className="grid grid-cols-3 gap-2">
                {shadeOptions.map((sh) => (
                  <button
                    key={sh.value}
                    type="button"
                    onClick={() => setShadeAvailability(sh.value)}
                    className={`p-3 rounded-xl border text-center transition ${
                      shadeAvailability === sh.value
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-semibold">{sh.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? (
                <span>Calculating Preliminary Stress...</span>
              ) : (
                <>
                  <ThermometerSun className="w-5 h-5" />
                  <span>Calculate Preliminary Heat Risk</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-6 space-y-6">
          {result ? (
            <div className="space-y-6">
              {savedSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Assessment record saved to local demo history.</span>
                  </div>
                  <Bookmark className="w-4 h-4 text-emerald-400" />
                </div>
              )}

              <HeatRiskCard result={result} />

              <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-100 text-sm">Personalized Action Plan</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Hydration schedule & shade break intervals based on this score.</p>
                </div>
                <button
                  onClick={() => navigate('/app/recommendations')}
                  className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition shrink-0"
                >
                  <span>View Recommendations</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 border-dashed rounded-3xl p-12 text-center flex flex-col items-center justify-center h-full min-h-[350px]">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-200">No Assessment Calculated Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-2">
                Fill out the activity form on the left and click "Calculate Preliminary Heat Risk" to see your customized thermal stress evaluation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
