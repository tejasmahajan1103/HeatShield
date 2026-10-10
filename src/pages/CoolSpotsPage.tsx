import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  MapPin,
  Search,
  Trees,
  Building,
  Droplets,
  ShieldCheck,
  Map as MapIcon,
  ListFilter,
  Info,
  Route,
  Flag,
  Compass,
  RotateCcw,
  Loader2,
  AlertTriangle,
  Sun
} from 'lucide-react';
import type { CoolSpot, CoolSpotCategory, UserSettings } from '../types';
import { coolSpotService, type CoolSpotOriginType } from '../services/coolSpotService';
import { settingsService } from '../services/settingsService';
import { routingService } from '../services/routingService';
import { CoolSpotCard } from '../components/CoolSpotCard';
import { CoolSpotMap } from '../components/CoolSpotMap';
import { useUserLocation } from '../context/UserLocationContext';

export const CoolSpotsPage: React.FC = () => {
  const userLoc = useUserLocation();
  const [spots, setSpots] = useState<CoolSpot[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CoolSpotCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(5);
  const [verifiedShadeOnly, setVerifiedShadeOnly] = useState(false);
  const [verifiedWaterOnly, setVerifiedWaterOnly] = useState(false);
  const [originType, setOriginType] = useState<CoolSpotOriginType>('current');
  const [selectedSpot, setSelectedSpot] = useState<CoolSpot | null>(null);
  const [userCoordinates, setUserCoordinates] = useState<{ latitude: number; longitude: number } | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'split' | 'map' | 'list'>('split');
  const [settings, setSettings] = useState<UserSettings | null>(null);

  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastSuccessTime, setLastSuccessTime] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const userLat = userLoc.latitude;
  const userLon = userLoc.longitude;
  const destLat = userLoc.destination?.latitude;
  const destLon = userLoc.destination?.longitude;

  const effectiveUserCoords = useMemo(() => {
    return (userLat !== null && userLon !== null && userLat !== undefined && userLon !== undefined)
      ? { latitude: userLat, longitude: userLon }
      : userCoordinates;
  }, [userLat, userLon, userCoordinates]);

  const effectiveDestCoords = useMemo(() => {
    return destLat !== undefined && destLon !== undefined
      ? { latitude: destLat, longitude: destLon }
      : undefined;
  }, [destLat, destLon]);

  // Compute route if destination exists but route is not in context yet
  useEffect(() => {
    let isMounted = true;
    async function ensureRoute() {
      if (destLat !== undefined && destLon !== undefined && userLat !== null && userLon !== null && userLat !== undefined && userLon !== undefined) {
        try {
          const r = await routingService.calculateRoute(
            { latitude: userLat, longitude: userLon },
            { latitude: destLat, longitude: destLon }
          );
          if (isMounted && r) {
            userLoc.setRoute(r);
          }
        } catch {
          // Handled
        }
      }
    }
    ensureRoute();
    return () => { isMounted = false; };
  }, [destLat, destLon, userLat, userLon]);

  useEffect(() => {
    async function loadInitial() {
      const userSettings = await settingsService.getSettings();
      setSettings(userSettings);
    }
    loadInitial();
  }, []);

  const fetchSpots = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsFetching(true);
    setFetchError(null);

    try {
      const data = await coolSpotService.getCoolSpots({
        category: selectedCategory,
        searchQuery,
        maxDistanceKm,
        verifiedShadeOnly,
        verifiedWaterOnly,
        originType,
        userCoordinates: effectiveUserCoords,
        destinationCoordinates: effectiveDestCoords,
        route: userLoc.route,
        signal: controller.signal
      });

      if (!controller.signal.aborted) {
        setSpots(data);
        setLastSuccessTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setFetchError(null);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError' && !controller.signal.aborted) {
        console.error('CoolSpot discovery failed:', err);
        setFetchError(err?.message || 'Unable to load cool spots for the selected parameters.');
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsFetching(false);
      }
    }
  }, [
    selectedCategory,
    searchQuery,
    maxDistanceKm,
    verifiedShadeOnly,
    verifiedWaterOnly,
    originType,
    effectiveUserCoords?.latitude,
    effectiveUserCoords?.longitude,
    effectiveDestCoords?.latitude,
    effectiveDestCoords?.longitude,
    userLoc.route
  ]);

  useEffect(() => {
    fetchSpots();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchSpots]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    setMaxDistanceKm(5);
    setVerifiedShadeOnly(false);
    setVerifiedWaterOnly(false);
    setOriginType('current');
  };

  const hasLiveData = spots.some(s => s.isSampleData === false);

  const categories: { id: CoolSpotCategory | 'all'; label: string; icon: any }[] = [
    { id: 'all', label: 'All CoolSpots', icon: MapPin },
    { id: 'park', label: 'Parks & Shade', icon: Trees },
    { id: 'indoor_public', label: 'Indoor AC Spaces', icon: Building },
    { id: 'water_point', label: 'Water Stations', icon: Droplets },
    { id: 'temple', label: 'Shaded Temples', icon: Sun },
    { id: 'cooling_center', label: 'Official Centers', icon: ShieldCheck }
  ];

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    searchQuery.trim() !== '' ||
    maxDistanceKm !== 5 ||
    verifiedShadeOnly ||
    verifiedWaterOnly ||
    originType !== 'current';

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-white border border-stone-200/90 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#009F87]">CoolSpot Discovery</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              hasLiveData
                ? 'bg-teal-50 text-teal-800 border-teal-200'
                : 'bg-amber-50 text-amber-800 border-amber-200/80'
            }`}>
              {hasLiveData ? 'OpenStreetMap Live Data' : 'Sample Location Store'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#102C4C] mt-1">Cooling Sanctuaries</h1>
          <p className="text-[#526985] text-xs sm:text-sm mt-1">
            Discover nearby shaded parks, public air-conditioned halls, drinking water fountains, temples, and official cooling havens.
          </p>
        </div>

        {/* View mode toggle (Mobile/Desktop) */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200/80 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('split')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'split' ? 'bg-[#009F87] text-white font-bold shadow-sm' : 'text-[#526985] hover:text-[#102C4C]'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Split View</span>
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'map' ? 'bg-[#009F87] text-white font-bold shadow-sm' : 'text-[#526985] hover:text-[#102C4C]'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Map Only</span>
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'list' ? 'bg-[#009F87] text-white font-bold shadow-sm' : 'text-[#526985] hover:text-[#102C4C]'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>List Only</span>
          </button>
        </div>
      </div>

      {/* Filter Bar & Controls */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-sm space-y-4">
        {/* Origin Selector Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Compass className="w-4 h-4 text-[#009F87]" />
            <span>Search Area:</span>
          </div>

          <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200/80 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setOriginType('current')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                originType === 'current'
                  ? 'bg-[#009F87] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Near Current Location</span>
            </button>

            <button
              type="button"
              onClick={() => setOriginType('route')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                originType === 'route'
                  ? 'bg-[#009F87] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Route className="w-3.5 h-3.5" />
              <span>Along Journey Route</span>
            </button>

            <button
              type="button"
              onClick={() => setOriginType('destination')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                originType === 'destination'
                  ? 'bg-[#009F87] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Near Destination</span>
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0 transition ${
                  isSelected
                    ? 'bg-[#009F87] text-white font-bold shadow-md shadow-teal-500/20'
                    : 'bg-stone-50 text-stone-700 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Checkboxes Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-stone-200">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, address, category, or amenity..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-[#102C4C] placeholder:text-stone-400 focus:border-[#009F87] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <span className="text-xs text-[#526985] whitespace-nowrap">
              Radius: {maxDistanceKm} {settings?.preferredDistanceUnit === 'miles' ? 'mi' : 'km'}
            </span>
            <input
              type="range"
              min="1"
              max="20"
              value={maxDistanceKm}
              onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
              className="w-full accent-[#009F87]"
            />
          </div>

          <div className="md:col-span-4 flex items-center justify-between md:justify-end gap-4 text-xs">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={verifiedShadeOnly}
                  onChange={(e) => setVerifiedShadeOnly(e.target.checked)}
                  className="rounded accent-[#009F87]"
                />
                <span>Shade Verified</span>
              </label>

              <label className="flex items-center gap-1.5 text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={verifiedWaterOnly}
                  onChange={(e) => setVerifiedWaterOnly(e.target.checked)}
                  className="rounded accent-[#009F87]"
                />
                <span>Water Available</span>
              </label>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Missing Destination / Route Notice */}
        {originType === 'destination' && !userLoc.destination && (
          <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-purple-600 shrink-0" />
              <span>No destination selected. Set a destination on the Heat Risk page to search near your destination.</span>
            </div>
          </div>
        )}

        {originType === 'route' && (!userLoc.destination || !userLoc.route) && (
          <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Route className="w-4 h-4 text-orange-600 shrink-0" />
              <span>No active journey route. Set a destination on the Heat Risk page to discover cooling spots along your path.</span>
            </div>
          </div>
        )}
      </div>

      {/* Transient Refresh Error Banner when spots exist */}
      {fetchError && spots.length > 0 && !isFetching && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Showing previous results {lastSuccessTime ? `from ${lastSuccessTime}` : ''}: </span>
              <span>{fetchError}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchSpots}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 transition"
          >
            Retry Refresh
          </button>
        </div>
      )}

      {/* Main Content Layout (Split / Map / List) */}
      <div className="min-h-[500px]">
        {isFetching ? (
          <div className="bg-white border border-stone-200/90 rounded-3xl p-16 text-center space-y-3 shadow-xs">
            <Loader2 className="w-8 h-8 text-[#009F87] animate-spin mx-auto" />
            <p className="text-slate-700 text-sm font-bold">Querying Geographic OpenStreetMap Data...</p>
            <p className="text-slate-500 text-xs">Locating shaded parks, indoor sanctuaries, drinking water points, and temples.</p>
          </div>
        ) : fetchError && spots.length === 0 ? (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center space-y-4">
            <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-rose-950">Error Loading Cooling Sanctuaries</h3>
              <p className="text-xs text-rose-800 mt-1">{fetchError}</p>
            </div>
            <button
              type="button"
              onClick={fetchSpots}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition"
            >
              Retry Geographic Discovery
            </button>
          </div>
        ) : activeTab === 'split' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            {/* Cards List Column */}
            <div className="lg:col-span-6 space-y-4 max-h-[650px] overflow-y-auto pr-1">
              {spots.length === 0 ? (
                <div className="bg-white border border-stone-200/90 rounded-3xl p-8 text-center space-y-4 shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto">
                    <Trees className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">No Cool Spots Found Matching Criteria</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                      No cooling spots match your current filters within {maxDistanceKm} {settings?.preferredDistanceUnit === 'miles' ? 'mi' : 'km'}.
                    </p>
                  </div>

                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="px-4 py-2 rounded-xl bg-[#009F87] hover:bg-[#008974] text-white font-bold text-xs shadow-sm transition inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Active Filters</span>
                    </button>
                  )}
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
                onUserLocationDetected={(coords) => setUserCoordinates(coords)}
              />
            </div>
          </div>
        ) : activeTab === 'map' ? (
          <div className="h-[600px] w-full">
            <CoolSpotMap
              spots={spots}
              selectedSpot={selectedSpot}
              onSelectSpot={(s) => setSelectedSpot(s)}
              onUserLocationDetected={(coords) => setUserCoordinates(coords)}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {spots.length === 0 ? (
              <div className="bg-white border border-stone-200/90 rounded-3xl p-8 text-center space-y-4 shadow-xs">
                <h3 className="text-base font-bold text-slate-900">No Cool Spots Found</h3>
                <p className="text-xs text-slate-500">Try expanding your search radius or changing category filters.</p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="px-4 py-2 rounded-xl bg-[#009F87] text-white font-bold text-xs"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
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
        )}
      </div>

      {/* Verified Data Disclaimer Notice */}
      <div className="p-3.5 rounded-xl bg-teal-50/60 border border-teal-200/80 text-[11px] text-teal-900 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
        <span>
          Cooling spots are retrieved directly from OpenStreetMap. Shaded parks, drinking water points, indoor spaces, and temples are mapped based on community geographic data.
        </span>
      </div>
    </div>
  );
};
