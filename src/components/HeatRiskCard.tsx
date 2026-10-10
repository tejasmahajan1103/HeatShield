import React from 'react';
import { ShieldAlert, ArrowRight, HelpCircle } from 'lucide-react';
import type { HeatRiskResult } from '../types';
import { getRiskBadgeColor } from '../utils/formatters';
import { Link } from 'react-router-dom';

interface HeatRiskCardProps {
  result: HeatRiskResult;
  showDetailsLink?: boolean;
}

export const HeatRiskCard: React.FC<HeatRiskCardProps> = ({ result, showDetailsLink = true }) => {
  const badgeStyle = getRiskBadgeColor(result.level);

  return (
    <div className="bg-white border border-stone-200/90 rounded-3xl p-6 shadow-sm relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Preliminary Assessment</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-slate-700 border border-stone-200 font-mono">
              {result.modelVersion || 'v1.0-heuristic'}
            </span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 mt-1">Heat-Exposure Risk</h3>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
            <ShieldAlert className="w-4 h-4" />
            <span>{result.level} Risk</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-2xl bg-stone-100 border border-stone-200 text-slate-900 font-mono font-black text-lg">
            {result.score}<span className="text-xs text-slate-500 font-sans font-normal">/100</span>
          </div>
        </div>
      </div>

      {/* Progress dial bar */}
      <div className="py-4">
        <div className="flex justify-between text-xs font-bold mb-1.5">
          <span className="text-emerald-700">Low (0-35)</span>
          <span className="text-amber-700">Moderate (36-65)</span>
          <span className="text-orange-700">High (66-85)</span>
          <span className="text-rose-700">Extreme (86-100)</span>
        </div>
        <div className="w-full h-3.5 rounded-full bg-stone-100 p-0.5 overflow-hidden flex border border-stone-200">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${result.score}%`,
              backgroundColor: result.levelColor
            }}
          />
        </div>
      </div>

      <p className="text-sm text-slate-700 leading-relaxed py-2 font-medium">
        {result.summary}
      </p>

      {/* Factors list */}
      <div className="mt-4 pt-4 border-t border-stone-100">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Key Contributing Factors</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {result.contributingFactors.map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span>{item.factor}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  item.impact === 'High' ? 'bg-orange-100 text-orange-800 border border-orange-200' : 'bg-stone-200/70 text-slate-700'
                }`}>
                  {item.impact} Impact
                </span>
              </div>
              <p className="text-slate-600 mt-1 text-[11px] leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Uncertainty and Disclaimer Footer */}
      <div className="mt-5 pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Estimated calculation uncertainty: <strong className="text-slate-900">{result.uncertaintyScore}%</strong></span>
        </div>

        {showDetailsLink && (
          <Link
            to="/app/recommendations"
            className="inline-flex items-center gap-1.5 text-orange-600 hover:text-orange-700 font-bold transition"
          >
            <span>View Safety Recommendations</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Mandatory Non-Medical Disclaimer */}
      <div className="mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
        <strong className="text-amber-950 font-bold">Disclaimer: </strong>
        {result.disclaimer}
      </div>
    </div>
  );
};
