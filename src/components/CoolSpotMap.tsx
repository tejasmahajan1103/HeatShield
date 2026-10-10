import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import type { CoolSpot } from '../types';
import { createCustomMarkerIcon, createUserLocationMarkerIcon, createDestinationMarkerIcon } from '../utils/leafletIcons';
import { Navigation, ShieldCheck, Compass, AlertCircle, X, Flag, Route as RouteIcon } from 'lucide-react';
import { formatDistance } from '../utils/formatters';
import { useUserLocation } from '../context/UserLocationContext';

interface CoolSpotMapProps {
  spots: CoolSpot[];
  selectedSpot?: CoolSpot | null;
  onSelectSpot?: (spot: CoolSpot) => void;
  onUserLocationDetected?: (coords: { latitude: number; longitude: number }) => void;
  center?: [number, number];
  zoom?: number;
}

const MapController: React.FC<{
  center: [number, number];
  zoom: number;
  selectedSpot?: CoolSpot | null;
  routeGeometry?: [number, number][];
  spots?: CoolSpot[];
  startCoords?: [number, number] | null;
  destCoords?: [number, number] | null;
}> = ({ center, zoom, selectedSpot, routeGeometry, spots, startCoords, destCoords }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedSpot) {
      map.flyTo([selectedSpot.latitude, selectedSpot.longitude], 15, { duration: 1.0 });
      return;
    }

    const points: [number, number][] = [];
    if (startCoords) points.push(startCoords);
    if (destCoords) points.push(destCoords);
    if (routeGeometry && routeGeometry.length > 0) {
      points.push(...routeGeometry);
    } else if (spots && spots.length > 0) {
      spots.slice(0, 15).forEach(s => points.push([s.latitude, s.longitude]));
    }

    if (points.length > 1) {
      const lats = points.map(p => p[0]);
      const lons = points.map(p => p[1]);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);
      map.fitBounds(
        [[minLat, minLon], [maxLat, maxLon]],
        { padding: [45, 45], maxZoom: 15, duration: 1.0 }
      );
    } else {
      map.flyTo(center, zoom, { duration: 1.0 });
    }
  }, [center, zoom, selectedSpot, routeGeometry, spots, startCoords, destCoords, map]);

  return null;
};

export const CoolSpotMap: React.FC<CoolSpotMapProps> = ({
  spots,
  selectedSpot,
  onSelectSpot,
  onUserLocationDetected,
  center = [12.9716, 77.5946],
  zoom = 13
}) => {
  const userLoc = useUserLocation();
  const [dismissedError, setDismissedError] = useState(false);

  const isLocating = userLoc.status === 'loading';
  const effectiveUserLoc = useMemo<[number, number] | null>(() => {
    return userLoc.latitude !== null && userLoc.longitude !== null
      ? [userLoc.latitude, userLoc.longitude]
      : null;
  }, [userLoc.latitude, userLoc.longitude]);

  const effectiveDestLoc = useMemo<[number, number] | null>(() => {
    return userLoc.destination
      ? [userLoc.destination.latitude, userLoc.destination.longitude]
      : null;
  }, [userLoc.destination]);

  const activeError = !dismissedError ? userLoc.error : null;

  const handleLocateUser = async () => {
    setDismissedError(false);
    await userLoc.requestGpsLocation();
  };

  useEffect(() => {
    if (effectiveUserLoc && onUserLocationDetected) {
      onUserLocationDetected({ latitude: effectiveUserLoc[0], longitude: effectiveUserLoc[1] });
    }
  }, [effectiveUserLoc, onUserLocationDetected]);

  const mapCenter: [number, number] = selectedSpot
    ? [selectedSpot.latitude, selectedSpot.longitude]
    : effectiveDestLoc || effectiveUserLoc || center;

  const activeZoom = selectedSpot ? 15 : (effectiveUserLoc ? 13 : zoom);

  return (
    <div className="w-full h-full min-h-[380px] rounded-2xl overflow-hidden border border-stone-200/90 shadow-md relative">
      {/* Map Control Buttons Overlay */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end gap-2 max-w-[calc(100%-24px)]">
        <button
          type="button"
          onClick={handleLocateUser}
          disabled={isLocating}
          className="px-3.5 py-2 rounded-xl bg-white/95 backdrop-blur-md border border-stone-200 text-[#102C4C] hover:bg-stone-50 font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer hover:shadow-lg disabled:opacity-75"
          aria-label="Use My Location"
        >
          <Compass className={`w-4 h-4 text-rose-500 shrink-0 ${isLocating ? 'animate-spin' : ''}`} />
          <span>{isLocating ? 'Locating...' : 'Use My Location'}</span>
        </button>

        {activeError && (
          <div className="p-2.5 rounded-xl bg-rose-50/95 backdrop-blur-md border border-rose-200 text-rose-900 text-xs shadow-md flex items-start gap-2 max-w-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{activeError}</div>
            <button
              type="button"
              onClick={() => setDismissedError(true)}
              className="text-rose-500 hover:text-rose-700 p-0.5 rounded cursor-pointer"
              aria-label="Dismiss error"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Route Info Overlay */}
      {userLoc.route && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-md border border-stone-200/90 p-3 rounded-2xl shadow-lg flex items-center gap-3 text-xs max-w-[calc(100%-32px)] sm:max-w-sm pointer-events-auto">
          <div className="p-2 rounded-xl bg-orange-100 text-orange-800 border border-orange-200 shrink-0">
            <RouteIcon className="w-4 h-4 text-orange-600" />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-slate-900 truncate">
              Route to {userLoc.destination?.name || 'Destination'}
            </div>
            <div className="text-[11px] text-slate-600 font-mono mt-0.5 truncate">
              {userLoc.route.distanceKm} km · {userLoc.route.durationMinutes} mins ({userLoc.route.routingMode})
            </div>
          </div>
        </div>
      )}

      <MapContainer
        center={mapCenter}
        zoom={activeZoom}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <MapController
          center={mapCenter}
          zoom={activeZoom}
          selectedSpot={selectedSpot}
          routeGeometry={userLoc.route?.geometry}
          spots={spots}
          startCoords={effectiveUserLoc}
          destCoords={effectiveDestLoc}
        />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Start GPS Location Marker */}
        {effectiveUserLoc && (
          <Marker position={effectiveUserLoc} icon={createUserLocationMarkerIcon()}>
            <Popup className="coolspot-leaflet-popup">
              <div className="p-1 space-y-1.5 text-stone-900 max-w-[200px]">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] uppercase font-bold text-rose-800 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded">
                    Starting Location
                  </span>
                </div>
                <h5 className="font-bold text-sm text-[#102C4C]">Your Starting GPS Location</h5>
                <p className="text-xs text-[#526985]">
                  Lat: {effectiveUserLoc[0].toFixed(4)}, Lon: {effectiveUserLoc[1].toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Location Marker */}
        {userLoc.destination && (
          <Marker
            position={[userLoc.destination.latitude, userLoc.destination.longitude]}
            icon={createDestinationMarkerIcon()}
          >
            <Popup className="coolspot-leaflet-popup">
              <div className="p-1 space-y-1.5 text-stone-900 max-w-[220px]">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] uppercase font-bold text-purple-800 bg-purple-50 border border-purple-200/80 px-2 py-0.5 rounded flex items-center gap-1">
                    <Flag className="w-3 h-3 text-purple-600" />
                    Destination
                  </span>
                </div>
                <h5 className="font-bold text-sm text-[#102C4C]">{userLoc.destination.name}</h5>
                <p className="text-xs text-[#526985]">
                  Lat: {userLoc.destination.latitude.toFixed(4)}, Lon: {userLoc.destination.longitude.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route Polyline Overlay */}
        {userLoc.route && userLoc.route.geometry && userLoc.route.geometry.length > 0 && (
          <Polyline
            positions={userLoc.route.geometry}
            pathOptions={{
              color: '#F97316',
              weight: 5,
              opacity: 0.85,
              dashArray: userLoc.route.isSampleData ? '8, 8' : undefined
            }}
          />
        )}

        {/* CoolSpot Markers */}
        {spots.map(spot => {
          const icon = createCustomMarkerIcon(spot.category, spot.isIndoor);
          return (
            <Marker
              key={spot.id}
              position={[spot.latitude, spot.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectSpot && onSelectSpot(spot)
              }}
            >
              <Popup className="coolspot-leaflet-popup">
                <div className="p-1 space-y-2 text-stone-900 max-w-[220px]">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] uppercase font-bold text-teal-800 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded">
                      {spot.categoryLabel}
                    </span>
                    <span className="text-xs font-mono text-stone-600 font-bold">
                      {formatDistance(spot.distanceKm)}
                    </span>
                  </div>

                  <h5 className="font-bold text-sm text-[#102C4C]">{spot.name}</h5>
                  <p className="text-xs text-[#526985] leading-snug">{spot.description}</p>

                  <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
                    <span className="text-[10px] text-teal-700 flex items-center gap-1 font-medium">
                      <ShieldCheck className="w-3 h-3 text-teal-600" />
                      {spot.isSampleData ? 'Simulated' : 'Verified OSM'}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=;${spot.latitude}%2C${spot.longitude}`, '_blank');
                      }}
                      className="px-2.5 py-1 rounded bg-[#009F87] hover:bg-[#008974] text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
                    >
                      <Navigation className="w-3 h-3" />
                      Go
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
