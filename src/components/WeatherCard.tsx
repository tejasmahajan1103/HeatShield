import React from 'react';
import { Thermometer, Droplets, Sun, Wind, Clock } from 'lucide-react';
import type { WeatherData } from '../types';
import { formatTemp } from '../utils/formatters';

interface WeatherCardProps {
  weather: WeatherData;
  tempUnit?: 'C' | 'F';
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ weather, tempUnit = 'C' }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
      {/* Glow background accent */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-100">{weather.locationName}</h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
              Demo Data
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Simulated sample telemetry</span>
          </p>
        </div>

        <div className="text-right">
          <div className="text-3xl font-extrabold text-orange-400 tracking-tight">
            {formatTemp(weather.temperatureC, tempUnit)}
          </div>
          <span className="text-xs font-medium text-amber-300/90">{weather.conditionText}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
            <Thermometer className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Wet Bulb Temp</p>
            <p className="text-sm font-semibold text-slate-200">{formatTemp(weather.wetBulbTempC, tempUnit)}</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
            <Droplets className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Relative Humidity</p>
            <p className="text-sm font-semibold text-slate-200">{weather.humidityPercent}%</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <Sun className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">UV Index</p>
            <p className="text-sm font-semibold text-slate-200">{weather.uvIndex} / 12</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
            <Wind className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Wind Speed</p>
            <p className="text-sm font-semibold text-slate-200">{weather.windSpeedKmh} km/h</p>
          </div>
        </div>
      </div>
    </div>
  );
};
