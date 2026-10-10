import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ThermometerSun,
  MapPin,
  Clock,
  Activity,
  CheckCircle2,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import type { HeatRiskInput, HeatRiskResult, ActivityType, ShadeOption } from '../types';
import { heatRiskService } from '../services/heatRiskService';
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
      <div className="bg-white border border-stone-200/80 p-6 rounded-3xl shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-50 border border-orange-200 px-3 py-0.5 rounded-full">Risk Assessment Engine</span>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Deterministic Heuristic
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">Heat-Risk Assessment</h1>
        <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
          Enter your planned activity details below. HeatShield calculates a preliminary risk score based on estimated wet-bulb thermal load, metabolic exertion, and solar exposure.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-6 bg-white border border-stone-200/90 rounded-3xl p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 pb-4 border-b border-stone-100">
            <Activity className="w-5 h-5 text-orange-600" />
            <span>Activity & Exposure Parameters</span>
          </h2>

          <form onSubmit={handleCalculate} className="space-y-5">
            {/* Location Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Location Name
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    if (errors.location) setErrors(prev => ({ ...prev, location: '' }));
                  }}
                  placeholder="e.g. Cubbon Park or Central Metro Plaza"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-2xl bg-stone-50 border ${
                    errors.location ? 'border-rose-500' : 'border-stone-300 focus:border-orange-500 focus:bg-white'
                  } text-slate-900 text-sm focus:outline-none transition font-medium`}
                />
              </div>
              {errors.location && <p className="text-xs text-rose-500 font-semibold mt-1">{errors.location}</p>}
            </div>

            {/* Activity Options */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Select Activity
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activities.map((act) => (
                  <button
                    key={act.value}
                    type="button"
                    onClick={() => setActivity(act.value)}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                      activity === act.value
                        ? 'bg-orange-50 border-orange-500 text-orange-950 font-bold shadow-xs'
                        : 'bg-stone-50 border-stone-200 hover:border-stone-300 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">{act.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{act.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Time & Duration Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Planned Start Time
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="time"
                    value={plannedTime}
                    onChange={(e) => {
                      setPlannedTime(e.target.value);
                      if (errors.plannedTime) setErrors(prev => ({ ...prev, plannedTime: '' }));
                    }}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-2xl bg-stone-50 border ${
                      errors.plannedTime ? 'border-rose-500' : 'border-stone-300 focus:border-orange-500 focus:bg-white'
                    } text-slate-900 text-sm focus:outline-none transition font-medium`}
                  />
                </div>
                {errors.plannedTime && <p className="text-xs text-rose-500 font-semibold mt-1">{errors.plannedTime}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="600"
                  value={durationMinutes}
                  onChange={(e) => {
                    setDurationMinutes(Number(e.target.value));
                    if (errors.durationMinutes) setErrors(prev => ({ ...prev, durationMinutes: '' }));
                  }}
                  className={`w-full px-4 py-2.5 rounded-2xl bg-stone-50 border ${
                    errors.durationMinutes ? 'border-rose-500' : 'border-stone-300 focus:border-orange-500 focus:bg-white'
                  } text-slate-900 text-sm focus:outline-none transition font-medium`}
                />
                {errors.durationMinutes && <p className="text-xs text-rose-500 font-semibold mt-1">{errors.durationMinutes}</p>}
              </div>
            </div>

            {/* Shade Availability Options */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Shade Availability
              </label>
              <div className="grid grid-cols-3 gap-2">
                {shadeOptions.map((sh) => (
                  <button
                    key={sh.value}
                    type="button"
                    onClick={() => setShadeAvailability(sh.value)}
                    className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                      shadeAvailability === sh.value
                        ? 'bg-amber-50 border-amber-500 text-amber-950 font-bold shadow-xs'
                        : 'bg-stone-50 border-stone-200 hover:border-stone-300 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">{sh.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
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
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold">Assessment calculation complete.</span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
              )}

              <HeatRiskCard result={result} />

              <div className="p-6 bg-white border border-stone-200/90 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">Personalized Action Plan</h4>
                  <p className="text-xs text-slate-600 mt-0.5">Hydration schedule & shade break intervals based on this score.</p>
                </div>
                <button
                  onClick={() => navigate('/app/recommendations', { state: { input: { location, activity, plannedTime, durationMinutes, shadeAvailability }, result } })}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-2 transition shrink-0 cursor-pointer shadow-sm"
                >
                  <span>View Recommendations</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-stone-200 border-dashed rounded-3xl p-12 text-center flex flex-col items-center justify-center h-full min-h-[350px]">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No Assessment Calculated Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-2 leading-relaxed">
                Fill out the activity form on the left and click "Calculate Preliminary Heat Risk" to see your customized thermal stress evaluation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
