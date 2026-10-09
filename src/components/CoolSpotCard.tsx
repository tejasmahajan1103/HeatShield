import React from 'react';
import { MapPin, ShieldCheck, Droplets, Sun, Navigation, Clock, Building, Trees } from 'lucide-react';
import type { CoolSpot } from '../types';
import { formatDistance } from '../utils/formatters';

interface CoolSpotCardProps {
  spot: CoolSpot;
  distanceUnit?: 'km' | 'miles';
  onSelect?: (spot: CoolSpot) => void;
}

export const CoolSpotCard: React.FC<CoolSpotCardProps> = ({ spot, distanceUnit = 'km', onSelect }) => {
  const handleDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=;${spot.latitude}%2C${spot.longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      onClick={() => onSelect && onSelect(spot)}
      className="bg-slate-900/90 border border-slate-800 hover:border-teal-500/50 rounded-2xl p-5 shadow-lg transition-all duration-200 flex flex-col justify-between cursor-pointer group"
    >
      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400">
              {spot.isIndoor ? <Building className="w-4 h-4" /> : <Trees className="w-4 h-4" />}
            </span>
            <span className="text-xs font-semibold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2.5 py-0.5 rounded-full">
              {spot.categoryLabel}
            </span>
          </div>

          <span className="text-xs font-mono font-bold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
            {formatDistance(spot.distanceKm, distanceUnit)} away
          </span>
        </div>

        {/* Title */}
        <h4 className="text-lg font-bold text-slate-100 group-hover:text-teal-300 transition-colors">
          {spot.name}
        </h4>

        <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate">{spot.address}</span>
        </p>

        <p className="text-sm text-slate-300 mt-3 leading-relaxed">
          {spot.description}
        </p>

        {/* Verification Badges Grid */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
          {/* Shade Verification */}
          <div className={`flex items-center gap-1.5 p-2 rounded-lg border ${
            spot.shadeVerified
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-slate-800/50 border-slate-800 text-slate-400'
          }`}>
            <Sun className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {spot.shadeVerified ? 'Shade: Verified' : 'Shade: Unverified'}
            </span>
          </div>

          {/* Water Verification */}
          <div className={`flex items-center gap-1.5 p-2 rounded-lg border ${
            spot.waterVerified
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
              : 'bg-slate-800/50 border-slate-800 text-slate-400'
          }`}>
            <Droplets className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {spot.waterVerified ? 'Water: Verified' : 'Water: Unverified'}
            </span>
          </div>
        </div>

        {/* Operating status & hours */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{spot.operatingHours}</span>
          </div>

          {spot.openStatusVerified && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              spot.isOpenNow ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
            }`}>
              {spot.isOpenNow ? 'Open Now' : 'Closed'}
            </span>
          )}
        </div>
      </div>

      {/* Footer & Actions */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
          <span>Verified: {new Date(spot.lastVerifiedTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <button
          onClick={handleDirections}
          className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition shadow-sm"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Directions</span>
        </button>
      </div>
    </div>
  );
};
