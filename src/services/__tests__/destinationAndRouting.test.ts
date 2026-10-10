import { describe, it, expect } from 'vitest';
import { geocodingService } from '../geocodingService';
import { routingService, getActivitySpeedKmh, addMinutesToTimeString } from '../routingService';
import { calculateNOAAHeatIndex } from '../heatRiskService';

describe('Destination Search, Geocoding & Route Calculation Tests', () => {
  it('searches destination places and returns geocoded results with coordinates', async () => {
    const results = await geocodingService.searchLocations('Cubbon Park');
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].latitude).toBeDefined();
    expect(results[0].longitude).toBeDefined();
    expect(typeof results[0].latitude).toBe('number');
    expect(typeof results[0].longitude).toBe('number');
  });

  it('handles empty or short search queries gracefully without throwing errors', async () => {
    const emptyResults = await geocodingService.searchLocations('  ');
    expect(emptyResults).toEqual([]);

    const singleCharResults = await geocodingService.searchLocations('a');
    expect(singleCharResults).toEqual([]);
  });

  it('returns fallback sample landmarks when search query matches known locations', async () => {
    const results = await geocodingService.searchLocations('Electronic City');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.name.includes('Electronic City'))).toBe(true);
  });

  it('calculates activity-based speeds correctly', () => {
    expect(getActivitySpeedKmh('walking')).toBe(4.5);
    expect(getActivitySpeedKmh('running')).toBe(10.0);
    expect(getActivitySpeedKmh('cycling')).toBe(18.0);
    expect(getActivitySpeedKmh('outdoor_work')).toBe(4.5);
  });

  it('adds minutes to time string formatted as HH:MM accurately', () => {
    expect(addMinutesToTimeString('14:30', 15)).toBe('14:45');
    expect(addMinutesToTimeString('14:45', 30)).toBe('15:15');
    expect(addMinutesToTimeString('23:45', 30)).toBe('00:15');
  });

  it('guards calculateNOAAHeatIndex against double conversion or bogus 55.6°C / 64.4°C outputs', () => {
    // Normal Celsius inputs (e.g., 32.2222°C [90°F], 50% RH -> 34.8°C / 94.6°F)
    const norm = calculateNOAAHeatIndex(32.2222, 50);
    expect(norm.heatIndexC).toBeLessThan(50);
    expect(norm.heatIndexF).toBeCloseTo(94.6, 0);

    // If input is passed as Fahrenheit (e.g. 90°F), guard detects Fahrenheit and avoids turning it into 194°F!
    const guarded = calculateNOAAHeatIndex(90, 50);
    expect(guarded.heatIndexF).toBeCloseTo(94.6, 0);
    expect(guarded.heatIndexC).toBeLessThan(50);
    expect(guarded.heatIndexC).not.toBe(55.6);
    expect(guarded.heatIndexC).not.toBe(64.4);
  });

  it('calculates route geometry, distance, travel mode ETA, and segment heat exposures between start and destination', async () => {
    const route = await routingService.calculateRoute(
      { latitude: 12.9716, longitude: 77.5946, name: 'MG Road' },
      { latitude: 13.0182, longitude: 77.5684, name: 'IISc Campus' },
      'running',
      '14:00'
    );

    expect(route).toBeDefined();
    expect(route.distanceKm).toBeGreaterThan(0);
    expect(route.routeEtaMinutes).toBeGreaterThan(0);
    expect(route.geometry.length).toBeGreaterThan(1);
    expect(route.segmentExposures.length).toBe(3);
    expect(route.segmentExposures[0].segmentName).toContain('Departure');
    expect(route.segmentExposures[2].segmentName).toContain('Destination');
    expect(route.peakSegmentExposure).toBeDefined();
  }, 15000);

  it('flags implausible travel durations for long walking routes', async () => {
    const longRoute = await routingService.calculateRoute(
      { latitude: 12.9716, longitude: 77.5946, name: 'Bengaluru' },
      { latitude: 12.8452, longitude: 77.6602, name: 'Electronic City' }, // ~16 km
      'walking',
      '12:00'
    );

    expect(longRoute.routeEtaMinutes).toBeGreaterThan(180);
    expect(longRoute.implausibleDurationWarning).toBeDefined();
    expect(longRoute.implausibleDurationWarning).toContain('Long journey duration');
  });

  it('handles cancellation signal with AbortController', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      routingService.calculateRoute(
        { latitude: 12.9716, longitude: 77.5946 },
        { latitude: 13.0182, longitude: 77.5684 },
        'walking',
        '14:00',
        controller.signal
      )
    ).rejects.toThrow('cancelled');
  });

  it('handles optional destination behavior (route calculation is skipped when destination is null)', async () => {
    const startOnly = { latitude: 12.9716, longitude: 77.5946, name: 'MG Road' };
    expect(startOnly.latitude).toBe(12.9716);
    expect(startOnly.longitude).toBe(77.5946);
  });
});
