import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { DestinationState, RouteInfo } from '../types';

export type LocationStatus = 'idle' | 'loading' | 'success' | 'error';
export type LocationSource = 'gps' | 'manual';

export interface UserLocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null; // in meters
  status: LocationStatus;
  error: string | null;
  source: LocationSource | null;
  locationName: string | null;
  timestamp: number | null;
  destination: DestinationState | null;
  route: RouteInfo | null;
}

export interface UserLocationContextType extends UserLocationState {
  requestGpsLocation: () => Promise<void>;
  setManualLocation: (name: string, lat?: number, lon?: number) => void;
  setDestination: (dest: DestinationState | null) => void;
  setRoute: (route: RouteInfo | null) => void;
  clearLocation: () => void;
  refreshLocation: () => Promise<void>;
}

const defaultState: UserLocationState = {
  latitude: null,
  longitude: null,
  accuracy: null,
  status: 'idle',
  error: null,
  source: null,
  locationName: null,
  timestamp: null,
  destination: null,
  route: null
};

const UserLocationContext = createContext<UserLocationContextType | undefined>(undefined);

export const UserLocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [locationState, setLocationState] = useState<UserLocationState>(defaultState);

  const requestGpsLocation = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationState(prev => ({
        ...prev,
        status: 'error',
        error: 'Geolocation is not supported by your browser or environment.'
      }));
      return;
    }

    setLocationState(prev => ({
      ...prev,
      status: 'loading',
      error: null
    }));

    return new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setLocationState(prev => ({
            ...prev,
            latitude,
            longitude,
            accuracy: accuracy ? Math.round(accuracy) : null,
            status: 'success',
            error: null,
            source: 'gps',
            locationName: `GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
            timestamp: Date.now()
          }));
          resolve();
        },
        (err) => {
          let errorMsg = 'An unknown error occurred while retrieving your location.';
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMsg = 'Location permission denied. Please allow location access in your browser.';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMsg = 'Location unavailable. Unable to determine your current position.';
              break;
            case err.TIMEOUT:
              errorMsg = 'Location request timed out. Please try again.';
              break;
          }
          setLocationState(prev => ({
            ...prev,
            status: 'error',
            error: errorMsg
          }));
          resolve();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }, []);

  const setManualLocation = useCallback((name: string, lat?: number, lon?: number) => {
    setLocationState(prev => ({
      ...prev,
      latitude: lat !== undefined ? lat : null,
      longitude: lon !== undefined ? lon : null,
      accuracy: null,
      status: 'success',
      error: null,
      source: 'manual',
      locationName: name.trim(),
      timestamp: Date.now()
    }));
  }, []);

  const setDestination = useCallback((dest: DestinationState | null) => {
    setLocationState(prev => ({
      ...prev,
      destination: dest,
      route: dest === null ? null : prev.route
    }));
  }, []);

  const setRoute = useCallback((route: RouteInfo | null) => {
    setLocationState(prev => ({
      ...prev,
      route
    }));
  }, []);

  const clearLocation = useCallback(() => {
    setLocationState(defaultState);
  }, []);

  const refreshLocation = useCallback(async () => {
    if (locationState.source === 'gps') {
      await requestGpsLocation();
    }
  }, [locationState.source, requestGpsLocation]);

  return (
    <UserLocationContext.Provider
      value={{
        ...locationState,
        requestGpsLocation,
        setManualLocation,
        setDestination,
        setRoute,
        clearLocation,
        refreshLocation
      }}
    >
      {children}
    </UserLocationContext.Provider>
  );
};

export const useUserLocation = (): UserLocationContextType => {
  const context = useContext(UserLocationContext);
  if (!context) {
    throw new Error('useUserLocation must be used within a UserLocationProvider');
  }
  return context;
};
