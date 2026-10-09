import type { CoolSpot, CoolSpotCategory } from '../types';
import { SAMPLE_COOLSPOTS } from '../data/sampleCoolSpots';

export interface CoolSpotFilterOptions {
  category?: CoolSpotCategory | 'all';
  searchQuery?: string;
  maxDistanceKm?: number;
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

    if (filters.category && filters.category !== 'all') {
      result = result.filter(spot => spot.category === filters.category);
    }

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

    if (filters.maxDistanceKm !== undefined && filters.maxDistanceKm > 0) {
      result = result.filter(spot => spot.distanceKm <= filters.maxDistanceKm!);
    }

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
    return this.spots
      .map(spot => {
        const dist = calculateHaversineDistance(lat, lng, spot.latitude, spot.longitude);
        return { ...spot, distanceKm: Number(dist.toFixed(1)) };
      })
      .filter(spot => spot.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }
}

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
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
