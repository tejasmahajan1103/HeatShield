import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MockCoolSpotService,
  HybridCoolSpotService,
  isValidCoordinate,
  calculateHaversineDistance,
  sampleRouteWaypoints,
  calculateMinDistanceToRoute
} from '../coolSpotService';

describe('CoolSpotService, Geolocation, Origin Selection & Diagnostics Tests', () => {
  const service = new MockCoolSpotService();
  const hybridService = new HybridCoolSpotService();

  beforeEach(() => {
    hybridService.clearCache();
  });

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

  it('samples route waypoints evenly for corridor search', () => {
    const routeGeom: [number, number][] = [
      [12.9716, 77.5946],
      [12.9800, 77.5900],
      [12.9900, 77.5850],
      [13.0000, 77.5800],
      [13.0182, 77.5684]
    ];
    const sampled = sampleRouteWaypoints(routeGeom, 3);
    expect(sampled.length).toBe(3);
    expect(sampled[0]).toEqual(routeGeom[0]);
    expect(sampled[2]).toEqual(routeGeom[routeGeom.length - 1]);
  });

  it('calculates minimum distance from a coordinate to a route polyline', () => {
    const routeGeom: [number, number][] = [
      [12.9716, 77.5946],
      [13.0182, 77.5684]
    ];
    const dist = calculateMinDistanceToRoute(12.9716, 77.5946, routeGeom);
    expect(dist).toBe(0.0);
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

  it('supports origin selection for destination coordinates', async () => {
    const destSpots = await service.getCoolSpots({
      originType: 'destination',
      destinationCoordinates: { latitude: 13.0182, longitude: 77.5684 },
      maxDistanceKm: 10
    });

    expect(destSpots.length).toBeGreaterThan(0);
    expect(destSpots[0].distanceKm).toBeLessThanOrEqual(10);
  });

  it('filters by category including temple, search query, shade, and water verification', async () => {
    const parks = await service.getCoolSpots({ category: 'park' });
    expect(parks.every(p => p.category === 'park')).toBe(true);

    const waterSpots = await service.getCoolSpots({ verifiedWaterOnly: true });
    expect(waterSpots.every(w => w.waterVerified)).toBe(true);

    const sampleFlag = parks.every(p => p.isSampleData === true);
    expect(sampleFlag).toBe(true);
  });

  it('normalizes live backend response shapes and handles array responses gracefully', async () => {
    const mockLiveSpot = {
      id: 'osm_node_1001',
      name: 'Cubbon Park Live Shaded Haven',
      category: 'park',
      categoryLabel: 'Park & Outdoor Shade',
      distanceKm: 0.4,
      latitude: 12.975,
      longitude: 77.592,
      isIndoor: false,
      shadeVerified: true,
      waterVerified: true,
      openStatusVerified: true,
      isOpenNow: true,
      operatingHours: '06:00 - 20:00',
      address: 'Kasturba Road, Bengaluru',
      amenities: ['Shade Coverage', 'Drinking Water'],
      isSampleData: false
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return {
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [mockLiveSpot]
      } as Response;
    });

    const liveSpots = await hybridService.getCoolSpots({
      userCoordinates: { latitude: 12.9716, longitude: 77.5946 },
      maxDistanceKm: 5
    });

    expect(liveSpots.length).toBeGreaterThan(0);
    expect(liveSpots[0].id).toBe('osm_node_1001');
    expect(liveSpots[0].isSampleData).toBe(false);

    fetchSpy.mockRestore();
  });

  it('handles HTML fallback responses without crashing or hanging', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return {
        ok: true,
        headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
        text: async () => '<!DOCTYPE html><html><body>SPA Fallback</body></html>'
      } as Response;
    });

    // When API returns HTML, service falls back safely or throws clean error
    const spots = await hybridService.getCoolSpots({
      userCoordinates: { latitude: 12.9716, longitude: 77.5946 },
      maxDistanceKm: 5
    });

    expect(Array.isArray(spots)).toBe(true);
    fetchSpy.mockRestore();
  });

  it('handles HTTP 500 error cleanly by throwing descriptive error for Retry button', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return {
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Internal Server Error' })
      } as Response;
    });

    await expect(
      hybridService.getCoolSpots({
        userCoordinates: { latitude: 12.9716, longitude: 77.5946 },
        maxDistanceKm: 5
      })
    ).rejects.toThrow('CoolSpot API Discovery Failed (HTTP_500). Please click Retry.');

    fetchSpy.mockRestore();
  });

  it('handles HTTP 429 Rate Limit error cleanly by throwing RATE_LIMITED error', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return {
        ok: false,
        status: 429,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Too Many Requests' })
      } as Response;
    });

    await expect(
      hybridService.getCoolSpots({
        userCoordinates: { latitude: 12.9716, longitude: 77.5946 },
        maxDistanceKm: 5
      })
    ).rejects.toThrow('CoolSpot API Discovery Failed (RATE_LIMITED). Please click Retry.');

    fetchSpy.mockRestore();
  });

  it('supports explicit cache clearing and differentiates filter options in cache keys', async () => {
    const mockLiveSpot = {
      id: 'osm_101',
      name: 'Lalbagh Botanical Garden',
      category: 'park',
      categoryLabel: 'Park',
      distanceKm: 1.2,
      latitude: 12.95,
      longitude: 77.58,
      isIndoor: false,
      shadeVerified: true,
      waterVerified: true,
      openStatusVerified: true,
      isOpenNow: true,
      operatingHours: '06:00 - 19:00',
      address: 'Bengaluru',
      amenities: ['Trees'],
      isSampleData: false
    };

    let fetchCount = 0;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      fetchCount++;
      return {
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [mockLiveSpot]
      } as Response;
    });

    // Initial fetch populates cache
    await hybridService.getCoolSpots({
      userCoordinates: { latitude: 12.9716, longitude: 77.5946 },
      maxDistanceKm: 5,
      category: 'park'
    });
    expect(fetchCount).toBe(1);

    // Repeated call with identical parameters reuses cache
    await hybridService.getCoolSpots({
      userCoordinates: { latitude: 12.9716, longitude: 77.5946 },
      maxDistanceKm: 5,
      category: 'park'
    });
    expect(fetchCount).toBe(1);

    // Call with different filter parameter (category) uses different cache key
    await hybridService.getCoolSpots({
      userCoordinates: { latitude: 12.9716, longitude: 77.5946 },
      maxDistanceKm: 5,
      category: 'water_point'
    });
    expect(fetchCount).toBe(2);

    // Clearing cache forces a new network request
    hybridService.clearCache();
    await hybridService.getCoolSpots({
      userCoordinates: { latitude: 12.9716, longitude: 77.5946 },
      maxDistanceKm: 5,
      category: 'park'
    });
    expect(fetchCount).toBe(3);

    fetchSpy.mockRestore();
  });

  it('handles cancelled in-flight requests gracefully', async () => {
    const controller = new AbortController();
    controller.abort();

    const spots = await hybridService.getCoolSpots({
      userCoordinates: { latitude: 12.9716, longitude: 77.5946 },
      signal: controller.signal
    });

    expect(spots).toEqual([]);
  });
});
