import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ThermometerSun,
  MapPin,
  Clock,
  Activity,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Search,
  Flag,
  X,
  Route,
  Loader2,
  Compass,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import type { HeatRiskInput, HeatRiskResult, ActivityType, ShadeOption, GeocodedLocation, RouteInfo } from '../types';
import { heatRiskService } from '../services/heatRiskService';
import { riskHistoryService } from '../services/riskHistoryService';
import { geocodingService } from '../services/geocodingService';
import { routingService } from '../services/routingService';
import { HeatRiskCard } from '../components/HeatRiskCard';
import { JourneySummaryBar } from '../components/JourneySummaryBar';
import { useUserLocation } from '../context/UserLocationContext';

export const HeatRiskPage: React.FC = () => {
  const navigate = useNavigate();
  const userLoc = useUserLocation();

  // Form states
  const [location, setLocation] = useState('Bengaluru Central District');
  const [activity, setActivity] = useState<ActivityType>('walking');
  const [plannedTime, setPlannedTime] = useState('14:30');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [shadeAvailability, setShadeAvailability] = useState<ShadeOption>('direct_sun');

  // Destination & Routing search states
  const [destQuery, setDestQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodedLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [activeRoute, setActiveRoute] = useState<RouteInfo | null>(null);

  // Validation & Result states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HeatRiskResult | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);


  const userLocName = userLoc.locationName;
  useEffect(() => {
    if (userLocName && userLocName !== location) {
      setLocation(userLocName);
    }
  }, [userLocName]);

  // Debounced geocoding search for destination
  useEffect(() => {
    if (!destQuery.trim() || destQuery.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const results = await geocodingService.searchLocations(destQuery);
        setSearchResults(results);
        if (results.length === 0) {
          setSearchError('No matching locations found for destination search.');
        }
      } catch {
        setSearchError('Geocoding service unavailable. Try selecting a sample landmark.');
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [destQuery]);

  const [routeError, setRouteError] = useState<string | null>(null);

  // Calculate route whenever starting location, destination, or activity changes
  const userDestination = userLoc.destination;
  const userLat = userLoc.latitude;
  const userLon = userLoc.longitude;
  const setUserRoute = userLoc.setRoute;

  useEffect(() => {
    const controller = new AbortController();

    async function updateRoute() {
      if (!userDestination) {
        setActiveRoute(null);
        setUserRoute(null);
        setRouteError(null);
        setIsCalculatingRoute(false);
        return;
      }

      const startLat = userLat !== null ? userLat : 12.9716;
      const startLon = userLon !== null ? userLon : 77.5946;

      setIsCalculatingRoute(true);
      setRouteError(null);

      try {
        const routeData = await routingService.calculateRoute(
          { latitude: startLat, longitude: startLon, name: location },
          { latitude: userDestination.latitude, longitude: userDestination.longitude, name: userDestination.name },
          activity,
          plannedTime,
          controller.signal
        );

        if (!controller.signal.aborted) {
          setActiveRoute(routeData);
          setUserRoute(routeData);
          setRouteError(null);
        }
      } catch (err: any) {
        if (!controller.signal.aborted) {
          console.error('Route calculation failed:', err);
          setRouteError(err?.message || 'Route calculation failed for selected destination. You can retry or choose a different place.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsCalculatingRoute(false);
        }
      }
    }

    updateRoute();

    return () => {
      controller.abort();
    };
  }, [userLat, userLon, userDestination, setUserRoute, location, activity, plannedTime]);


  const activities: { value: ActivityType; label: string; desc: string }[] = [
    { value: 'walking', label: 'Walking', desc: 'Light to moderate aerobic movement' },
    { value: 'cycling', label: 'Cycling', desc: 'Elevated internal thermal load' },
    { value: 'running', label: 'Running', desc: 'High metabolic heat production' },
    { value: 'outdoor_work', label: 'Outdoor Work', desc: 'Sustained heavy physical labor' },
    { value: 'other', label: 'Other Exertion', desc: 'General outdoor movement' }
  ];

  const shadeOptions: { value: ShadeOption; label: string; desc: string }[] = [
    { value: 'direct_sun', label: 'Direct Sun', desc: 'Unshielded solar radiation' },
    { value: 'partial_shade', label: 'Partial Shade', desc: 'Intermittent tree/building cover' },
    { value: 'full_shade', label: 'Full Shade', desc: 'Continuous shaded protection' }
  ];

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!location.trim()) errs.location = 'Please enter a valid starting location name.';
    if (!plannedTime) errs.plannedTime = 'Please select a planned activity time.';
    if (isNaN(durationMinutes) || durationMinutes < 5 || durationMinutes > 600) {
      errs.durationMinutes = 'Duration must be between 5 and 600 minutes.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSelectDestination = (place: GeocodedLocation) => {
    userLoc.setDestination({
      name: place.name || place.displayName,
      latitude: place.latitude,
      longitude: place.longitude
    });
    setDestQuery('');
    setSearchResults([]);
  };

  const handleClearDestination = () => {
    userLoc.setDestination(null);
    userLoc.setRoute(null);
    setActiveRoute(null);
    setDestQuery('');
    setSearchResults([]);
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setSavedSuccess(false);
    try {
      const input: HeatRiskInput = {
        location: location.trim(),
        activity,
        activityLabel: activities.find(a => a.value === activity)?.label,
        plannedTime,
        durationMinutes: Number(durationMinutes),
        shadeAvailability,
        latitude: userLoc.latitude !== null ? userLoc.latitude : undefined,
        longitude: userLoc.longitude !== null ? userLoc.longitude : undefined,
        destination: userLoc.destination,
        route: activeRoute
      };

      const res = await heatRiskService.calculateRisk(input);
      if (activeRoute) {
        res.routeInfo = activeRoute;
      }
                  setResult(res);
      setSavedSuccess(true);

      // Save history independently; failure must not affect the risk result.
      void riskHistoryService.saveAssessment(input, res).catch((historyError) => {
        console.error('Risk history save failed:', historyError);
      });
    } catch (err) {
      console.error('Heat risk calculation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="bg-white border border-stone-200/80 p-6 rounded-3xl shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-50 border border-orange-200 px-3 py-0.5 rounded-full">Risk Assessment Engine</span>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            {userLoc.destination ? 'Route & Journey Exposure Active' : 'Deterministic Heuristic'}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">Heat-Risk Assessment</h1>
        <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
          Calculate your heat exposure for a single spot or a planned journey route. Evaluates thermal load, metabolic exertion, solar radiation, and estimated segment arrival forecasts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-6 bg-white border border-stone-200/90 rounded-3xl p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 pb-4 border-b border-stone-100">
            <Activity className="w-5 h-5 text-orange-600" />
            <span>Activity & Exposure Parameters</span>
          </h2>

          <form onSubmit={handleCalculate} className="space-y-5">
            {/* Shared Starting GPS Location Bar */}
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Compass className={`w-4 h-4 text-orange-600 shrink-0 ${userLoc.status === 'loading' ? 'animate-spin' : ''}`} />
                <div>
                  <span className="font-bold text-slate-900 block">
                    {userLoc.source === 'gps'
                      ? `Starting GPS Active: Lat ${userLoc.latitude?.toFixed(4)}, Lon ${userLoc.longitude?.toFixed(4)}`
                      : userLoc.source === 'manual'
                      ? `Starting Location: ${userLoc.locationName}`
                      : 'Default / Starting GPS'}
                  </span>
                  {userLoc.accuracy !== null && (
                    <span className="text-[11px] text-slate-500">Coordinates Accuracy: ±{userLoc.accuracy}m</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => userLoc.requestGpsLocation()}
                disabled={userLoc.status === 'loading'}
                className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 disabled:opacity-75"
              >
                {userLoc.status === 'loading' ? (
                  <span>Locating...</span>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{userLoc.source === 'gps' ? 'Refresh GPS' : 'Use My GPS'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Starting Location Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Starting Location
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    if (errors.location) setErrors(prev => ({ ...prev, location: '' }));
                  }}
                  placeholder="e.g. Cubbon Park or Central Metro Plaza"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-2xl bg-stone-50 border ${
                    errors.location ? 'border-rose-500' : 'border-stone-300 focus:border-orange-500 focus:bg-white'
                  } text-slate-900 text-sm focus:outline-none transition font-medium`}
                />
              </div>
              {errors.location && <p className="text-xs text-rose-500 font-semibold mt-1">{errors.location}</p>}
            </div>

            {/* Separate Destination Search Field */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Destination (Optional Journey Route)
              </label>

              {userLoc.destination ? (
                <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-950 flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <Flag className="w-4 h-4 text-purple-600 shrink-0" />
                    <div>
                      <span className="font-bold block">{userLoc.destination.name}</span>
                      <span className="text-[11px] text-purple-700">
                        Lat: {userLoc.destination.latitude.toFixed(4)}, Lon: {userLoc.destination.longitude.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClearDestination}
                    className="p-1 rounded-lg text-purple-600 hover:text-purple-900 hover:bg-purple-100 cursor-pointer transition"
                    title="Remove Destination"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={destQuery}
                    onChange={(e) => setDestQuery(e.target.value)}
                    placeholder="Search destination landmark, office, college, or address..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-stone-50 border border-stone-300 focus:border-purple-500 focus:bg-white text-slate-900 text-sm focus:outline-none transition font-medium"
                  />
                  {isSearching && (
                    <Loader2 className="w-4 h-4 text-purple-600 absolute right-3.5 top-3.5 animate-spin" />
                  )}
                </div>
              )}

              {/* Geocoding Search Dropdown Results */}
              {searchResults.length > 0 && !userLoc.destination && (
                <div className="bg-white border border-stone-200 rounded-2xl shadow-lg max-h-56 overflow-y-auto divide-y divide-stone-100 text-xs">
                  {searchResults.map((place) => (
                    <button
                      key={place.id}
                      type="button"
                      onClick={() => handleSelectDestination(place)}
                      className="w-full p-3 text-left hover:bg-purple-50/70 transition flex items-start justify-between gap-2 cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{place.name}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">{place.displayName}</div>
                      </div>
                      <span className="text-[10px] font-mono text-purple-700 bg-purple-100 px-2 py-0.5 rounded shrink-0">
                        {place.latitude.toFixed(3)}, {place.longitude.toFixed(3)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {searchError && !userLoc.destination && (
                <p className="text-xs text-rose-500 font-semibold">{searchError}</p>
              )}
            </div>

            {/* Calculated Route Info Banner */}
            {userLoc.destination && (
              <div className="p-4 rounded-2xl bg-orange-50/80 border border-orange-200/90 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-orange-950">
                  <div className="flex items-center gap-1.5">
                    <Route className="w-4 h-4 text-orange-600" />
                    <span>Calculated Journey Route</span>
                  </div>
                  {isCalculatingRoute ? (
                    <span className="text-slate-500 font-normal flex items-center gap-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-600" />
                      <span>Calculating route...</span>
                    </span>
                  ) : activeRoute ? (
                    <span className="font-mono text-orange-900">
                      {activeRoute.distanceKm} km · ETA: {activeRoute.routeEtaMinutes} mins ({activeRoute.routingMode})
                    </span>
                  ) : routeError ? (
                    <span className="text-rose-600 font-bold">Route Error</span>
                  ) : null}
                </div>

                {routeError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between gap-2">
                    <span>{routeError}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setRouteError(null);
                        setIsCalculatingRoute(true);
                        routingService.calculateRoute(
                          { latitude: userLoc.latitude || 12.9716, longitude: userLoc.longitude || 77.5946, name: location },
                          { latitude: userLoc.destination!.latitude, longitude: userLoc.destination!.longitude, name: userLoc.destination!.name },
                          activity,
                          plannedTime
                        ).then(r => { setActiveRoute(r); userLoc.setRoute(r); }).catch(e => setRouteError(e.message)).finally(() => setIsCalculatingRoute(false));
                      }}
                      className="px-2 py-1 rounded bg-rose-600 text-white font-bold hover:bg-rose-700 cursor-pointer shrink-0"
                    >
                      Retry Route
                    </button>
                  </div>
                )}

                {activeRoute?.implausibleDurationWarning && (
                  <div className="p-2.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-950 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>{activeRoute.implausibleDurationWarning}</span>
                  </div>
                )}

                {activeRoute?.isSampleData && !routeError && (
                  <p className="text-[11px] text-orange-800">
                    Routing provider fallback active ({activeRoute.providerName}). Route geometry interpolated.
                  </p>
                )}
              </div>
            )}

            {/* Activity Options */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Select Activity
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activities.map((act) => (
                  <button
                    key={act.value}
                    type="button"
                    onClick={() => setActivity(act.value)}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                      activity === act.value
                        ? 'bg-orange-50 border-orange-500 text-orange-950 font-bold shadow-xs'
                        : 'bg-stone-50 border-stone-200 hover:border-stone-300 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">{act.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{act.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Time & Duration Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Planned Start Time
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="time"
                    value={plannedTime}
                    onChange={(e) => {
                      setPlannedTime(e.target.value);
                      if (errors.plannedTime) setErrors(prev => ({ ...prev, plannedTime: '' }));
                    }}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-2xl bg-stone-50 border ${
                      errors.plannedTime ? 'border-rose-500' : 'border-stone-300 focus:border-orange-500 focus:bg-white'
                    } text-slate-900 text-sm focus:outline-none transition font-medium`}
                  />
                </div>
                {errors.plannedTime && <p className="text-xs text-rose-500 font-semibold mt-1">{errors.plannedTime}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="600"
                  value={durationMinutes}
                  onChange={(e) => {
                    setDurationMinutes(Number(e.target.value));
                    if (errors.durationMinutes) setErrors(prev => ({ ...prev, durationMinutes: '' }));
                  }}
                  className={`w-full px-4 py-2.5 rounded-2xl bg-stone-50 border ${
                    errors.durationMinutes ? 'border-rose-500' : 'border-stone-300 focus:border-orange-500 focus:bg-white'
                  } text-slate-900 text-sm focus:outline-none transition font-medium`}
                />
                {errors.durationMinutes && <p className="text-xs text-rose-500 font-semibold mt-1">{errors.durationMinutes}</p>}
              </div>
            </div>

            {/* Shade Availability Options */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Shade Availability
              </label>
              <div className="grid grid-cols-3 gap-2">
                {shadeOptions.map((sh) => (
                  <button
                    key={sh.value}
                    type="button"
                    onClick={() => setShadeAvailability(sh.value)}
                    className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                      shadeAvailability === sh.value
                        ? 'bg-amber-50 border-amber-500 text-amber-950 font-bold shadow-xs'
                        : 'bg-stone-50 border-stone-200 hover:border-stone-300 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">{sh.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Calculating Preliminary Stress...</span>
              ) : (
                <>
                  <ThermometerSun className="w-5 h-5" />
                  <span>{userLoc.destination ? 'Calculate Journey Heat Risk' : 'Calculate Preliminary Heat Risk'}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-6 space-y-6">
          {result ? (
            <div className="space-y-6">
              {savedSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold">Assessment calculation complete.</span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
              )}

              <JourneySummaryBar
                location={location}
                destination={userLoc.destination}
                activity={activity}
                durationMinutes={durationMinutes}
                shadeAvailability={shadeAvailability}
                calculatedAt={result.calculatedAt}
              />

              <HeatRiskCard result={result} />

              {/* Route Segment Heat Exposure Card */}
              {result.routeInfo && (
                <div className="bg-white border border-stone-200/90 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                    <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                      <Route className="w-5 h-5 text-orange-600" />
                      <span>Route Segment Heat Exposure</span>
                    </h3>
                    <span className="text-xs font-mono font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">
                      {result.routeInfo.distanceKm} km · {result.routeInfo.durationMinutes} mins
                    </span>
                  </div>

                  {/* Segment Breakdown Cards */}
                  <div className="space-y-3">
                    {result.routeInfo.segmentExposures.map((seg, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{seg.segmentName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">({seg.estimatedTime})</span>
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5">
                            Temp: {seg.temperatureC}°C · Humidity: {seg.humidityPercent}% · Heat Index: {seg.heatIndexC.toFixed(1)}°C ({seg.heatIndexF.toFixed(1)}°F)
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            seg.riskLevel === 'Extreme'
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : seg.riskLevel === 'High'
                              ? 'bg-orange-100 text-orange-800 border-orange-200'
                              : seg.riskLevel === 'Moderate'
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}>
                            {seg.riskLevel} Risk
                          </span>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {seg.weatherSource === 'measured_live' ? 'Measured Live' : 'Segment Forecast'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Peak Exposure Warning */}
                  {result.routeInfo.peakSegmentExposure && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Peak Journey Heat Exposure</span>
                        <p className="mt-0.5 leading-relaxed">
                          Peak thermal load expected at <strong>{result.routeInfo.peakSegmentExposure.segmentName}</strong> ({result.routeInfo.peakSegmentExposure.estimatedTime}) with Heat Index of <strong>{result.routeInfo.peakSegmentExposure.heatIndexC.toFixed(1)}°C</strong>.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="p-6 bg-white border border-stone-200/90 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">Personalized Action Plan</h4>
                  <p className="text-xs text-slate-600 mt-0.5">Hydration schedule & shade break intervals based on this score.</p>
                </div>
                <button
                  onClick={() => navigate('/app/recommendations', { state: { input: { location, activity, plannedTime, durationMinutes, shadeAvailability, destination: userLoc.destination, route: activeRoute }, result } })}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-2 transition shrink-0 cursor-pointer shadow-sm"
                >
                  <span>View Recommendations</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white border border-stone-200 border-dashed rounded-3xl p-8 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No Custom Assessment Calculated Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                  Adjust parameters on the left and click "Calculate Heat Risk" for a single time slot or journey route.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

