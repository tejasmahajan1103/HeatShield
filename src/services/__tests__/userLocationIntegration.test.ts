import { describe, it, expect, vi } from 'vitest';
import { DeterministicHeatRiskService } from '../heatRiskService';
import { StructuredRecommendationService } from '../recommendationService';
import { MockCoolSpotService, coolSpotService as hybridSingleton } from '../coolSpotService';
import type { HeatRiskInput } from '../../types';

describe('Shared Location Integration Tests across Heat Risk, Cool Spots, and Recommendations', () => {
  const heatRiskService = new DeterministicHeatRiskService();
  const recommendationService = new StructuredRecommendationService();
  const coolSpotService = new MockCoolSpotService();

  it('accepts latitude and longitude in HeatRiskInput and computes risk', async () => {
    const input: HeatRiskInput = {
      location: 'GPS (12.9716, 77.5946)',
      latitude: 12.9716,
      longitude: 77.5946,
      activity: 'running',
      plannedTime: '14:30',
      durationMinutes: 45,
      shadeAvailability: 'direct_sun'
    };

    const riskResult = await heatRiskService.calculateRisk(input);
    expect(riskResult).toBeDefined();
    expect(riskResult.score).toBeGreaterThan(0);
    expect(riskResult.calculatedAt).toBeDefined();
  }, 15000);

  it('fetches nearby cool spots dynamically when latitude and longitude are supplied', async () => {
    const spots = await coolSpotService.getCoolSpots({
      userCoordinates: { latitude: 12.9716, longitude: 77.5946 },
      maxDistanceKm: 5
    });

    expect(spots).toBeDefined();
    expect(Array.isArray(spots)).toBe(true);
    if (spots.length > 0) {
      expect(spots[0].distanceKm).toBeDefined();
      expect(typeof spots[0].distanceKm).toBe('number');
    }
  });

  it('generates recommendations containing nearby cool spots when coordinates are provided in input', async () => {
    hybridSingleton.clearCache?.();
    const mockLiveSpot = {
      id: 'osm_rec_1',
      name: 'Cubbon Park Sanctuary',
      category: 'park',
      categoryLabel: 'Park',
      distanceKm: 0.3,
      latitude: 12.975,
      longitude: 77.592,
      isIndoor: false,
      shadeVerified: true,
      waterVerified: true,
      openStatusVerified: true,
      isOpenNow: true,
      operatingHours: '06:00 - 20:00',
      address: 'Bengaluru',
      amenities: ['Shade'],
      isSampleData: false
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return {
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [mockLiveSpot]
      } as Response;
    });

    const input: HeatRiskInput = {
      location: 'GPS (12.9716, 77.5946)',
      latitude: 12.9716,
      longitude: 77.5946,
      activity: 'running',
      plannedTime: '14:30',
      durationMinutes: 45,
      shadeAvailability: 'direct_sun'
    };

    const riskResult = await heatRiskService.calculateRisk(input);
    const rec = await recommendationService.generateRecommendations(input, riskResult);

    expect(rec).toBeDefined();
    expect(rec.primaryAdvice.length).toBeGreaterThan(0);
    expect(rec.hydrationGuidance).toBeDefined();
    expect(rec.suggestedCoolSpots).toBeDefined();
    expect(Array.isArray(rec.suggestedCoolSpots)).toBe(true);
    expect(rec.suggestedCoolSpots.length).toBeGreaterThan(0);
    expect(rec.suggestedCoolSpots[0].name).toBe('Cubbon Park Sanctuary');

    fetchSpy.mockRestore();
  }, 15000);

  it('handles cool spot discovery failure gracefully without throwing and indicates unavailability', async () => {
    hybridSingleton.clearCache?.();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return {
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Internal Server Error' })
      } as Response;
    });

    const input: HeatRiskInput = {
      location: 'GPS (12.9716, 77.5946)',
      latitude: 12.9716,
      longitude: 77.5946,
      activity: 'running',
      plannedTime: '14:30',
      durationMinutes: 45,
      shadeAvailability: 'direct_sun'
    };

    const riskResult = await heatRiskService.calculateRisk(input);
    const rec = await recommendationService.generateRecommendations(input, riskResult);

    expect(rec).toBeDefined();
    expect(rec.primaryAdvice.length).toBeGreaterThan(0);
    expect(rec.suggestedCoolSpots).toEqual([]);
    expect(rec.disclaimer).toContain('Nearby cooling spot discovery was unavailable');

    fetchSpy.mockRestore();
  });
});
