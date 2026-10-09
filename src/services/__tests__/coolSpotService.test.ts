import { describe, it, expect } from 'vitest';
import { MockCoolSpotService } from '../coolSpotService';

describe('CoolSpotService Unit Tests', () => {
  const service = new MockCoolSpotService();

  it('filters coolspots by category', async () => {
    const parkSpots = await service.getCoolSpots({ category: 'park' });
    expect(parkSpots.length).toBeGreaterThan(0);
    expect(parkSpots.every(s => s.category === 'park')).toBe(true);

    const indoorSpots = await service.getCoolSpots({ category: 'indoor_public' });
    expect(indoorSpots.length).toBeGreaterThan(0);
    expect(indoorSpots.every(s => s.category === 'indoor_public')).toBe(true);
  });

  it('filters coolspots by search query', async () => {
    const query = 'Cubbon';
    const spots = await service.getCoolSpots({ searchQuery: query });
    expect(spots.length).toBeGreaterThan(0);
    expect(spots[0].name).toContain('Cubbon');
  });

  it('filters coolspots by maximum distance', async () => {
    const spotsNear = await service.getCoolSpots({ maxDistanceKm: 1.0 });
    expect(spotsNear.every(s => s.distanceKm <= 1.0)).toBe(true);
  });

  it('calculates Haversine distance correctly for nearby coordinates', async () => {
    // Bengaluru center approx 12.9716, 77.5946
    const nearby = await service.getNearbyCoolSpots(12.9716, 77.5946, 5);
    expect(nearby.length).toBeGreaterThan(0);
    expect(nearby[0].distanceKm).toBeLessThanOrEqual(nearby[nearby.length - 1].distanceKm);
  });
});
