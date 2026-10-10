import React from 'react';
import { Link } from 'react-router-dom';
import {
  ThermometerSun,
  MapPin,
  ArrowRight,
  ShieldCheck,
  HeartPulse,
  Info,
  Trees,
  Building,
  Droplets,
  Sun,
  Clock,
  ShieldAlert
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-8 pb-12">
      {/* Grid: Combined Heat & Safety Monitor + Personal Risk Assessment & Understand Your Heat Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unified Heat & Safety Monitor & Personal Heat Risk Assessment Card */}
        <div className="bg-white/90 backdrop-blur-md border border-stone-200/90 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A]">Heat & Safety Monitor</h1>
            <p className="text-[#64748B] text-xs sm:text-sm mt-1 font-medium pb-4 border-b border-stone-100">
              Current conditions and quick heat-stress risk preview for your planned activities.
            </p>

            <div className="mt-4">
              <div className="flex items-center gap-2 pb-2">
                <ThermometerSun className="w-5 h-5 text-[#FF5A1F]" />
                <h2 className="font-extrabold text-slate-900 text-lg">Personal Heat Risk Assessment</h2>
              </div>

              <p className="text-xs sm:text-sm text-[#64748B] mt-2 leading-relaxed font-medium">
                Heat exposure depends on environmental conditions, your planned activity and how long you remain outdoors. HeatShield helps you assess these factors and understand potential heat-related risks before heading outside.
              </p>

              <div className="mt-4 space-y-2 text-xs">
                <div className="p-3.5 rounded-2xl bg-orange-50/70 border border-orange-200/80 flex items-center gap-3">
                  <div className="p-1.5 rounded-xl bg-orange-100 text-[#FF5A1F] border border-orange-200/80 shrink-0">
                    <Sun className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-slate-800">Review available weather conditions.</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-orange-50/70 border border-orange-200/80 flex items-center gap-3">
                  <div className="p-1.5 rounded-xl bg-orange-100 text-[#FF5A1F] border border-orange-200/80 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-slate-800">Consider activity intensity and exposure duration.</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-orange-50/70 border border-orange-200/80 flex items-center gap-3">
                  <div className="p-1.5 rounded-xl bg-orange-100 text-[#FF5A1F] border border-orange-200/80 shrink-0">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-slate-800">Understand the factors influencing your risk assessment.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Understand Your Heat Risk Card */}
        <div className="bg-white/90 backdrop-blur-md border border-stone-200/90 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <ShieldCheck className="w-5 h-5 text-[#FF5A1F]" />
              <h3 className="font-extrabold text-slate-900 text-lg">Understand Your Heat Risk</h3>
            </div>

            <p className="text-xs sm:text-sm text-[#64748B] mt-3 leading-relaxed font-medium">
              HeatShield evaluates environmental heat conditions alongside your planned outdoor activity to help you understand potential heat exposure. It uses available weather information and a documented assessment method to identify contributing factors and provide practical heat-safety guidance.
            </p>

            <div className="mt-4 p-4 rounded-2xl bg-orange-50/60 border border-orange-200/70 space-y-2 text-xs">
              <div className="font-bold text-orange-950 text-xs mb-1">How it works:</div>
              <ol className="space-y-1.5 text-[#0F172A] list-decimal list-inside font-medium leading-relaxed">
                <li>Review available weather and environmental conditions.</li>
                <li>Consider your planned activity and exposure duration.</li>
                <li>Receive an assessment with an explanation of the contributing risk factors.</li>
                <li>Explore practical ways to reduce heat exposure.</li>
              </ol>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
            <span className="text-[11px] text-[#64748B] font-medium">Personalized risk evaluation</span>
            <Link
              to="/app/heat-risk"
              className="px-6 py-3.5 rounded-2xl bg-[#FF5A1F] hover:bg-[#e04a12] text-white font-extrabold text-xs sm:text-sm shadow-md shadow-orange-500/20 flex items-center gap-2 transition cursor-pointer shrink-0"
            >
              <ThermometerSun className="w-4 h-4" />
              <span>Check My Heat Risk</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Discover CoolSpots Section */}
      <div className="bg-white/90 backdrop-blur-md border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-100">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
              <MapPin className="w-6 h-6 text-[#0E9F6E] shrink-0" />
              <span>Discover CoolSpots</span>
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-medium">
              CoolSpots helps you explore places where you may be able to escape the heat, including shaded parks, air-conditioned public spaces and water refill stations. Browse location details and available facilities to help you choose a suitable place to cool down.
            </p>
          </div>

          <Link
            to="/app/coolspots"
            className="px-6 py-3.5 rounded-2xl bg-[#0E9F6E] hover:bg-[#0b8259] text-white font-extrabold text-xs sm:text-sm shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition shrink-0 self-start sm:self-center cursor-pointer"
          >
            <span>Explore All CoolSpots</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Supporting Points */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200/80 shrink-0">
              <Trees className="w-4 h-4" />
            </div>
            <span className="font-semibold text-slate-800">Find shaded outdoor resting areas.</span>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-50 text-sky-700 border border-sky-200/80 shrink-0">
              <Building className="w-4 h-4" />
            </div>
            <span className="font-semibold text-slate-800">Discover indoor cooling facilities.</span>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 shrink-0">
              <Droplets className="w-4 h-4" />
            </div>
            <span className="font-semibold text-slate-800">Locate water refill and hydration points.</span>
          </div>
        </div>
      </div>

      {/* Heat Safety Action Protocols & How HeatShield Works */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heat Safety Action Protocols Card */}
        <div className="lg:col-span-2 bg-white/90 backdrop-blur-md border border-stone-200/90 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-[#FF5A1F]" />
                <h3 className="font-extrabold text-[#0F172A] text-lg">Heat Safety Action Protocols</h3>
              </div>
              <Link to="/app/recommendations" className="text-xs font-bold text-[#FF5A1F] hover:text-[#e04a12] inline-flex items-center gap-1">
                <span>View Protocols</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200/80 space-y-1">
                <div className="font-bold text-orange-950 flex items-center gap-1.5">
                  <ThermometerSun className="w-4 h-4 text-[#FF5A1F]" />
                  <span>Personal Risk Evaluation</span>
                </div>
                <p className="text-[#64748B] text-[11px] leading-relaxed">
                  Calculate real-time heat stress taking into account duration, shade, and physical exertion load.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 space-y-1">
                <div className="font-bold text-teal-950 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#0E9F6E]" />
                  <span>Verified CoolSpot Sanctuaries</span>
                </div>
                <p className="text-[#64748B] text-[11px] leading-relaxed">
                  Locate shaded parks, air-conditioned public halls, and chilled water points with distance routing.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* How HeatShield Works Explanation */}
        <div className="bg-[#E6F6FC]/70 border border-sky-200/60 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-sky-200/60">
              <Info className="w-5 h-5 text-[#0284C7]" />
              <h3 className="font-extrabold text-[#0F172A] text-lg">How HeatShield Works</h3>
            </div>

            <div className="mt-4 space-y-3 text-xs text-[#0F172A] leading-relaxed">
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

          <div className="mt-6 pt-3 border-t border-sky-200/60 text-[11px] text-[#64748B] font-medium">
            AWS Bedrock AI interface prepared for production rollout.
          </div>
        </div>
      </div>
    </div>
  );
};
