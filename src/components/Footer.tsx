import React from 'react';
import { Flame } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-stone-200/90 py-6 text-xs text-[#526985]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center gap-1.5 text-center select-none">
        {/* Row 1 — Branding */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#FF641C] p-0.5 flex items-center justify-center shadow-xs">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-extrabold text-[#102C4C] font-mono tracking-tight">HeatShield</span>
        </div>

        {/* Row 2 — Tagline */}
        <p className="text-xs sm:text-sm font-medium text-[#526985] italic">
          Know the heat. Find the cool. Stay safer.
        </p>

        {/* Row 3 — Copyright */}
        <div className="pt-0.5 text-[11px] sm:text-xs text-stone-500 font-medium">
          © 2026 HeatShield. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
