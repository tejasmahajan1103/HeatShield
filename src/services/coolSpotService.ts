import type { CoolSpot, CoolSpotCategory } from '../types';
import { SAMPLE_COOLSPOTS } from '../data/sampleCoolSpots';

export interface CoolSpotFilterOptions {
  category?: CoolSpotCategory | 'all';
  searchQuery?: string;
  maxDistanceKm?: number;
  userCoordinates?: { latitude: number; longitude: number };
  verifiedShadeOnly?: boolean;
  verifiedWaterOnly?: boolean;
  indoorOnly?: boolean;
}

export interface CoolSpotService {
  getCoolSpots(filters?: CoolSpotFilterOptions): Promise<CoolSpot[]>;
  getCoolSpotById(id: string): Promise<CoolSpot | undefined>;
  getNearbyCoolSpots(lat: number, lng: number, radiusKm?: number): Promise<CoolSpot[]>;
}

export class MockCoolSpotService implements CoolSpotService {
  private spots: CoolSpot[] = [...SAMPLE_COOLSPOTS];

  async getCoolSpots(filters?: CoolSpotFilterOptions): Promise<CoolSpot[]> {
    let result = [...this.spots];

    if (!filters) return result;

    // 1. Dynamic Geolocation Distance Calculation if userCoordinates are provided
    if (filters.userCoordinates) {
      const { latitude, longitude } = filters.userCoordinates;
      if (isValidCoordinate(latitude, longitude)) {
        result = result.map(spot => {
          const dist = calculateHaversineDistance(latitude, longitude, spot.latitude, spot.longitude);
          return { ...spot, distanceKm: Number(dist.toFixed(1)) };
        });
        result.sort((a, b) => a.distanceKm - b.distanceKm);
      }
    }

    // 2. Category Filter
    if (filters.category && filters.category !== 'all') {
      result = result.filter(spot => spot.category === filters.category);
    }

    // 3. Search Query Filter
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase().trim();
      result = result.filter(
        spot =>
          spot.name.toLowerCase().includes(q) ||
          spot.address.toLowerCase().includes(q) ||
          spot.description.toLowerCase().includes(q) ||
          spot.amenities.some(a => a.toLowerCase().includes(q))
      );
    }

    // 4. Maximum Distance Radius Filter
    if (filters.maxDistanceKm !== undefined && filters.maxDistanceKm > 0) {
      result = result.filter(spot => spot.distanceKm <= filters.maxDistanceKm!);
    }

    // 5. Attribute Verification Filters
    if (filters.verifiedShadeOnly) {
      result = result.filter(spot => spot.shadeVerified);
    }

    if (filters.verifiedWaterOnly) {
      result = result.filter(spot => spot.waterVerified);
    }

    if (filters.indoorOnly) {
      result = result.filter(spot => spot.isIndoor);
    }

    return result;
  }

  async getCoolSpotById(id: string): Promise<CoolSpot | undefined> {
    return this.spots.find(s => s.id === id);
  }

  async getNearbyCoolSpots(lat: number, lng: number, radiusKm: number = 5): Promise<CoolSpot[]> {
    if (!isValidCoordinate(lat, lng)) {
      return [];
    }

    const safeRadius = Math.max(0.1, Math.min(100, radiusKm));

    return this.spots
      .map(spot => {
        const dist = calculateHaversineDistance(lat, lng, spot.latitude, spot.longitude);
        return { ...spot, distanceKm: Number(dist.toFixed(1)) };
      })
      .filter(spot => spot.distanceKm <= safeRadius)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }
}

/**
 * Validates latitude (-90 to 90) and longitude (-180 to 180) ranges.
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Standard Haversine formula to compute great-circle distance in kilometers between two coordinates.
 */
export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    return Infinity;
  }

  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const coolSpotService = new MockCoolSpotService();
