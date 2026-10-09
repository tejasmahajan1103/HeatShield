import React from 'react';
import { AlertCircle, ShieldAlert, ArrowRight, HelpCircle } from 'lucide-react';
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
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Preliminary Assessment</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
              Demo Calculation
            </span>
          </div>
          <h3 className="text-xl font-bold text-slate-100 mt-1">Heat-Exposure Risk</h3>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-xl border text-sm font-bold flex items-center gap-2 ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
            <ShieldAlert className="w-4 h-4" />
            <span>{result.level} Risk</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-mono font-extrabold text-lg">
            {result.score}<span className="text-xs text-slate-400 font-sans font-normal">/100</span>
          </div>
        </div>
      </div>

      {/* Progress dial bar */}
      <div className="py-4">
        <div className="flex justify-between text-xs font-semibold mb-1.5">
          <span className="text-emerald-400">Low (0-35)</span>
          <span className="text-amber-400">Moderate (36-65)</span>
          <span className="text-orange-400">High (66-85)</span>
          <span className="text-rose-400">Extreme (86-100)</span>
        </div>
        <div className="w-full h-3 rounded-full bg-slate-800 p-0.5 overflow-hidden flex">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${result.score}%`,
              backgroundColor: result.levelColor
            }}
          />
        </div>
      </div>

      <p className="text-sm text-slate-300 leading-relaxed py-2">
        {result.summary}
      </p>

      {/* Factors list */}
      <div className="mt-4 pt-4 border-t border-slate-800/80">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Key Contributing Factors</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {result.contributingFactors.map((item, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs">
              <div className="flex items-center justify-between font-medium text-slate-200">
                <span>{item.factor}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                  item.impact === 'High' ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700/60 text-slate-300'
                }`}>
                  {item.impact} Impact
                </span>
              </div>
              <p className="text-slate-400 mt-1 text-[11px]">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Uncertainty and Disclaimer Footer */}
      <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Estimated calculation uncertainty: <strong className="text-slate-300">{result.uncertaintyScore}%</strong></span>
        </div>

        {showDetailsLink && (
          <Link
            to="/app/recommendations"
            className="inline-flex items-center gap-1.5 text-orange-400 hover:text-orange-300 font-semibold transition"
          >
            <span>View Safety Recommendations</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Mandatory Non-Medical Disclaimer */}
      <div className="mt-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
        <span>{result.disclaimer} Always listen to bodily signals and consult local emergency guidelines during heatwaves.</span>
      </div>
    </div>
  );
};
