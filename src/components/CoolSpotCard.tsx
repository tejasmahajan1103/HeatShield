import React from 'react';
import { MapPin, ShieldCheck, Droplets, Sun, Navigation, Clock, Building, Trees } from 'lucide-react';
import type { CoolSpot } from '../types';
import { formatDistance } from '../utils/formatters';

interface CoolSpotCardProps {
  spot: CoolSpot;
  distanceUnit?: 'km' | 'miles';
  onSelect?: (spot: CoolSpot) => void;
}

const isExplicitlyClosed = (hours?: string): boolean => {
  if (!hours) return false;
  const normalized = hours.trim().toLowerCase();
  // Only classify as Closed when there is explicit, reliable evidence that the entire
  // venue is closed (e.g. "closed", "permanently closed", "temporarily closed"),
  // rather than inferring closure from schedules like "Mon-Fri 09:00-18:00; Sat-Sun closed"
  // or "Closed on public holidays".
  return (
    normalized === 'closed' ||
    normalized === 'permanently closed' ||
    normalized === 'temporarily closed' ||
    /^permanently\s+closed(\s+.*)?$/.test(normalized) ||
    /^temporarily\s+closed(\s+.*)?$/.test(normalized)
  );
};

export const CoolSpotCard: React.FC<CoolSpotCardProps> = ({ spot, distanceUnit = 'km', onSelect }) => {
  const handleDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=;${spot.latitude}%2C${spot.longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      onClick={() => onSelect && onSelect(spot)}
      className="bg-white border border-stone-200/90 hover:border-teal-500/50 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer group"
    >
      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
              {spot.isIndoor ? <Building className="w-4 h-4" /> : <Trees className="w-4 h-4" />}
            </span>
            <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
              {spot.categoryLabel}
            </span>
          </div>

          <span className="text-xs font-mono font-bold text-slate-700 bg-stone-100 px-2.5 py-1 rounded-xl border border-stone-200">
            {formatDistance(spot.distanceKm, distanceUnit)} away
          </span>
        </div>

        {/* Title */}
        <h4 className="text-lg font-extrabold text-slate-900 group-hover:text-teal-700 transition-colors">
          {spot.name}
        </h4>

        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{spot.address}</span>
        </p>

        <p className="text-sm text-slate-600 mt-3 leading-relaxed">
          {spot.description}
        </p>

        {/* Verification Badges Grid */}
        <div className="mt-4 pt-3 border-t border-stone-100 grid grid-cols-2 gap-2 text-xs">
          {/* Shade Verification */}
          <div className={`flex items-center gap-1.5 p-2 rounded-xl border ${
            spot.shadeVerified
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
              : 'bg-stone-50 border-stone-200 text-slate-500'
          }`}>
            <Sun className="w-3.5 h-3.5 shrink-0 text-amber-600" />
            <span className="truncate">
              {spot.shadeVerified ? 'Shade: Verified' : 'Shade: Unverified'}
            </span>
          </div>

          {/* Water Verification */}
          <div className={`flex items-center gap-1.5 p-2 rounded-xl border ${
            spot.waterVerified
              ? 'bg-blue-50 border-blue-200 text-blue-800 font-semibold'
              : 'bg-stone-50 border-stone-200 text-slate-500'
          }`}>
            <Droplets className="w-3.5 h-3.5 shrink-0 text-blue-600" />
            <span className="truncate">
              {spot.waterVerified ? 'Water: Verified' : 'Water: Unverified'}
            </span>
          </div>
        </div>

        {/* Operating status & hours */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{spot.operatingHours}</span>
          </div>

          {/* Operating status badge */}
          {spot.isOpenNow ? (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Open Now
            </span>
          ) : isExplicitlyClosed(spot.operatingHours) ? (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
              Closed
            </span>
          ) : spot.openStatusVerified ? (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
              Hours Listed
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-slate-600 border border-stone-200">
              Status Unknown
            </span>
          )}
        </div>
      </div>

      {/* Footer & Actions */}
      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          <span>Verified: {new Date(spot.lastVerifiedTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <button
          onClick={handleDirections}
          className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Directions</span>
        </button>
      </div>
    </div>
  );
};
