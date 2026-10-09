import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import type { CoolSpot } from '../types';
import { createCustomMarkerIcon } from '../utils/leafletIcons';
import { Navigation, ShieldCheck } from 'lucide-react';
import { formatDistance } from '../utils/formatters';

interface CoolSpotMapProps {
  spots: CoolSpot[];
  selectedSpot?: CoolSpot | null;
  onSelectSpot?: (spot: CoolSpot) => void;
  center?: [number, number];
  zoom?: number;
}

const MapController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
};

export const CoolSpotMap: React.FC<CoolSpotMapProps> = ({
  spots,
  selectedSpot,
  onSelectSpot,
  center = [12.9716, 77.5946],
  zoom = 13
}) => {
  const mapCenter: [number, number] = selectedSpot
    ? [selectedSpot.latitude, selectedSpot.longitude]
    : center;

  return (
    <div className="w-full h-full min-h-[380px] rounded-2xl overflow-hidden border border-slate-800 shadow-xl relative">
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <MapController center={mapCenter} zoom={selectedSpot ? 15 : zoom} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

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
                <div className="p-1 space-y-2 text-slate-100 max-w-[220px]">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] uppercase font-bold text-teal-400 bg-teal-500/20 px-2 py-0.5 rounded">
                      {spot.categoryLabel}
                    </span>
                    <span className="text-xs font-mono text-slate-300 font-bold">
                      {formatDistance(spot.distanceKm)}
                    </span>
                  </div>

                  <h5 className="font-bold text-sm text-slate-100">{spot.name}</h5>
                  <p className="text-xs text-slate-300 leading-snug">{spot.description}</p>

                  <div className="pt-2 border-t border-slate-700 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-teal-400" />
                      Verified
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=;${spot.latitude}%2C${spot.longitude}`, '_blank');
                      }}
                      className="px-2.5 py-1 rounded bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-semibold flex items-center gap-1"
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
