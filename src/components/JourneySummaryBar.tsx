import React from 'react';
import type { DestinationState } from '../types';

interface JourneySummaryBarProps {
  location: string;
  destination?: DestinationState | null;
  activity: string;
  durationMinutes?: number;
  shadeAvailability: string;
  calculatedAt: string;
}

export const JourneySummaryBar: React.FC<JourneySummaryBarProps> = ({
  location,
  destination,
  activity,
  durationMinutes,
  shadeAvailability,
  calculatedAt,
}) => {
  return (
    <div className="bg-white border border-stone-200/90 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs shadow-xs">
      <div>
        <span className="text-slate-500 font-semibold">Location:</span>
        <p className="font-bold text-slate-900 mt-0.5 truncate" title={location}>
          {location}
        </p>
      </div>
      <div>
        <span className="text-slate-500 font-semibold">Destination:</span>
        {destination ? (
          <div className="mt-0.5 min-w-0">
            <p className="font-bold text-slate-900 truncate" title={destination.name}>
              {destination.name}
            </p>
            {destination.latitude !== undefined && destination.longitude !== undefined && (
              <p className="text-[10px] text-slate-500 font-mono truncate">
                ({destination.latitude.toFixed(3)}, {destination.longitude.toFixed(3)})
              </p>
            )}
          </div>
        ) : (
          <p className="font-bold text-slate-500 mt-0.5">Not selected</p>
        )}
      </div>
      <div>
        <span className="text-slate-500 font-semibold">Activity:</span>
        <p className="font-bold text-slate-900 capitalize mt-0.5">
          {activity} {durationMinutes ? `(${durationMinutes} mins)` : ''}
        </p>
      </div>
      <div>
        <span className="text-slate-500 font-semibold">Solar Exposure:</span>
        <p className="font-bold text-slate-900 capitalize mt-0.5">
          {shadeAvailability.replace('_', ' ')}
        </p>
      </div>
      <div>
        <span className="text-slate-500 font-semibold">Calculated At:</span>
        <p className="font-bold text-slate-900 mt-0.5">{calculatedAt}</p>
      </div>
    </div>
  );
};
