import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Search,
  Trees,
  Building,
  Droplets,
  ShieldCheck,
  Map as MapIcon,
  ListFilter,
  Info
} from 'lucide-react';
import type { CoolSpot, CoolSpotCategory, UserSettings } from '../types';
import { coolSpotService } from '../services/coolSpotService';
import { settingsService } from '../services/settingsService';
import { CoolSpotCard } from '../components/CoolSpotCard';
import { CoolSpotMap } from '../components/CoolSpotMap';

export const CoolSpotsPage: React.FC = () => {
  const [spots, setSpots] = useState<CoolSpot[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CoolSpotCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(5);
  const [verifiedShadeOnly, setVerifiedShadeOnly] = useState(false);
  const [verifiedWaterOnly, setVerifiedWaterOnly] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<CoolSpot | null>(null);
  const [activeTab, setActiveTab] = useState<'split' | 'map' | 'list'>('split');
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    async function loadInitial() {
      const userSettings = await settingsService.getSettings();
      setSettings(userSettings);
    }
    loadInitial();
  }, []);

  useEffect(() => {
    async function fetchSpots() {
      try {
        const data = await coolSpotService.getCoolSpots({
          category: selectedCategory,
          searchQuery,
          maxDistanceKm,
          verifiedShadeOnly,
          verifiedWaterOnly
        });
        setSpots(data);
      } catch (err) {
        console.error('Failed to fetch coolspots:', err);
      }
    }
    fetchSpots();
  }, [selectedCategory, searchQuery, maxDistanceKm, verifiedShadeOnly, verifiedWaterOnly]);

  const categories: { id: CoolSpotCategory | 'all'; label: string; icon: any }[] = [
    { id: 'all', label: 'All CoolSpots', icon: MapPin },
    { id: 'park', label: 'Parks & Shade', icon: Trees },
    { id: 'indoor_public', label: 'Indoor AC Spaces', icon: Building },
    { id: 'water_point', label: 'Water Stations', icon: Droplets },
    { id: 'cooling_center', label: 'Official Centers', icon: ShieldCheck }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">CoolSpot Discovery</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              Sample Location Store
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 mt-1">Cooling Sanctuaries</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Discover nearby shaded parks, public air-conditioned halls, drinking water fountains, and official cooling havens.
          </p>
        </div>

        {/* View mode toggle (Mobile/Desktop) */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('split')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'split' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Split View</span>
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'map' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Map Only</span>
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'list' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>List Only</span>
          </button>
        </div>
      </div>

      {/* Filter Bar & Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0 transition ${
                  isSelected
                    ? 'bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/20'
                    : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Checkboxes Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-slate-800">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, landmark, or amenities..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <span className="text-xs text-slate-400 whitespace-nowrap">
              Radius: {maxDistanceKm} {settings?.preferredDistanceUnit === 'miles' ? 'mi' : 'km'}
            </span>
            <input
              type="range"
              min="1"
              max="10"
              value={maxDistanceKm}
              onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
              className="w-full accent-teal-500"
            />
          </div>

          <div className="md:col-span-4 flex items-center gap-4 text-xs">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={verifiedShadeOnly}
                onChange={(e) => setVerifiedShadeOnly(e.target.checked)}
                className="rounded accent-teal-500"
              />
              <span>Shade Verified</span>
            </label>

            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={verifiedWaterOnly}
                onChange={(e) => setVerifiedWaterOnly(e.target.checked)}
                className="rounded accent-teal-500"
              />
              <span>Water Available</span>
            </label>
          </div>
        </div>
      </div>

      {/* Main Content Layout (Split / Map / List) */}
      <div className="min-h-[500px]">
        {activeTab === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            {/* Cards List Column */}
            <div className="lg:col-span-6 space-y-4 max-h-[650px] overflow-y-auto pr-1">
              {spots.length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                  No coolspots found matching your active filters. Try expanding search parameters.
                </div>
              ) : (
                spots.map((spot) => (
                  <CoolSpotCard
                    key={spot.id}
                    spot={spot}
                    distanceUnit={settings?.preferredDistanceUnit}
                    onSelect={(s) => setSelectedSpot(s)}
                  />
                ))
              )}
            </div>

            {/* Interactive Leaflet Map Column */}
            <div className="lg:col-span-6 h-[500px] lg:h-auto">
              <CoolSpotMap
                spots={spots}
                selectedSpot={selectedSpot}
                onSelectSpot={(s) => setSelectedSpot(s)}
              />
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="h-[600px] w-full">
            <CoolSpotMap
              spots={spots}
              selectedSpot={selectedSpot}
              onSelectSpot={(s) => setSelectedSpot(s)}
            />
          </div>
        )}

        {activeTab === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {spots.map((spot) => (
              <CoolSpotCard
                key={spot.id}
                spot={spot}
                distanceUnit={settings?.preferredDistanceUnit}
                onSelect={(s) => setSelectedSpot(s)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Verified Data Disclaimer Notice */}
      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
        <span>
          Sample locations dataset. Verified timestamps represent simulated data audits. In production, location data syncs dynamically via AWS DynamoDB GeoSpatial query APIs.
        </span>
      </div>
    </div>
  );
};
