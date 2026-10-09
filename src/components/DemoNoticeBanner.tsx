import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

interface DemoNoticeBannerProps {
  message?: string;
  compact?: boolean;
}

export const DemoNoticeBanner: React.FC<DemoNoticeBannerProps> = ({
  message = 'Frontend Prototype Phase: Displaying preliminary deterministic calculations & sample cooling location datasets.',
  compact = false
}) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>DEMO MODE: Heuristic calculation & sample location data</span>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-r from-amber-950/40 via-amber-900/30 to-slate-900 border-y border-amber-500/30 px-4 py-3 text-amber-200 text-sm flex items-center justify-between shadow-inner">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-amber-300">Bharat Builds Tour — Environmental Safety Demo: </span>
            <span className="text-amber-200/90">{message}</span>
            <span className="hidden md:inline text-amber-400/80 text-xs ml-2 underline cursor-help" title="In production, HeatShield integrates AWS Bedrock AI and real-time sensor streams.">
              Learn about backend AWS architecture
            </span>
          </div>
        </div>
        <span className="px-2.5 py-0.5 rounded text-xs uppercase font-bold tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
          Demo Mode
        </span>
      </div>
    </div>
  );
};
