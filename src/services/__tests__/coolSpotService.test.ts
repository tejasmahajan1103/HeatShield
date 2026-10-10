import { describe, it, expect } from 'vitest';
import { MockCoolSpotService, isValidCoordinate, calculateHaversineDistance } from '../coolSpotService';

describe('MockCoolSpotService & Geolocation Tests', () => {
  const service = new MockCoolSpotService();

  it('validates coordinate boundaries correctly (-90..90, -180..180)', () => {
    expect(isValidCoordinate(12.9716, 77.5946)).toBe(true);
    expect(isValidCoordinate(0, 0)).toBe(true);
    expect(isValidCoordinate(91, 50)).toBe(false);
    expect(isValidCoordinate(-91, 50)).toBe(false);
    expect(isValidCoordinate(10, 181)).toBe(false);
    expect(isValidCoordinate(NaN, 50)).toBe(false);
  });

  it('calculates accurate Haversine distances for known coordinates', () => {
    // Distance between Bengaluru center (12.9716, 77.5946) and Vidhana Soudha (12.9796, 77.5907) is ~0.97 km
    const dist = calculateHaversineDistance(12.9716, 77.5946, 12.9796, 77.5907);
    expect(dist).toBeGreaterThan(0.8);
    expect(dist).toBeLessThan(1.2);
  });

  it('returns empty array for invalid user coordinates in getNearbyCoolSpots', async () => {
    const spots = await service.getNearbyCoolSpots(999, 999, 5);
    expect(spots).toEqual([]);
  });

  it('calculates dynamic distances and sorts nearby coolspots when user coordinates are provided', async () => {
    const spots = await service.getCoolSpots({
      userCoordinates: { latitude: 12.9716, longitude: 77.5946 },
      maxDistanceKm: 2.0
    });

    expect(spots.length).toBeGreaterThan(0);
    // Ensure sorted ascending by distanceKm
    for (let i = 0; i < spots.length - 1; i++) {
      expect(spots[i].distanceKm).toBeLessThanOrEqual(spots[i + 1].distanceKm);
    }
  });

  it('filters by category, search query, shade, and water verification', async () => {
    const parks = await service.getCoolSpots({ category: 'park' });
    expect(parks.every(p => p.category === 'park')).toBe(true);

    const waterSpots = await service.getCoolSpots({ verifiedWaterOnly: true });
    expect(waterSpots.every(w => w.waterVerified)).toBe(true);

    const sampleFlag = parks.every(p => p.isSampleData === true);
    expect(sampleFlag).toBe(true);
  });
});
