import { describe, it, expect } from 'vitest';
import {
  DeterministicHeatRiskService,
  calculateNOAAHeatIndex,
  celsiusToFahrenheit,
  fahrenheitToCelsius
} from '../heatRiskService';
import type { HeatRiskInput } from '../../types';

describe('DeterministicHeatRiskService & NOAA Heat Index Validation Tests', () => {
  const service = new DeterministicHeatRiskService();

  it('converts temperature units accurately between Celsius and Fahrenheit', () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
    expect(celsiusToFahrenheit(100)).toBe(212);
    expect(celsiusToFahrenheit(26.6667)).toBeCloseTo(80, 1);

    expect(fahrenheitToCelsius(32)).toBe(0);
    expect(fahrenheitToCelsius(212)).toBe(100);
    expect(fahrenheitToCelsius(80)).toBeCloseTo(26.67, 1);
  });

  it('matches NOAA National Weather Service Heat Index reference values', () => {
    // 1. 80°F (26.6667°C), 45% RH -> NWS HI = 80.0°F
    const r1 = calculateNOAAHeatIndex(26.6667, 45);
    expect(r1.heatIndexF).toBeCloseTo(80.0, 0);

    // 2. 90°F (32.2222°C), 50% RH -> NWS HI = 94.6°F ~ 95.0°F
    const r2 = calculateNOAAHeatIndex(32.2222, 50);
    expect(r2.heatIndexF).toBeCloseTo(95.0, 0);

    // 3. 95°F (35.0°C), 55% RH -> NWS HI = 108.9°F
    const r3 = calculateNOAAHeatIndex(35.0, 55);
    expect(r3.heatIndexF).toBeCloseTo(108.9, 0);
  });

  it('uses the simple Steadman formula when calculated simple HI is under 80°F', () => {
    // T = 75°F (23.8889°C), RH = 50% -> HI_simple = 0.5 * (75 + 61 + 8.4 + 4.7) = 74.55°F (< 80°F)
    const res = calculateNOAAHeatIndex(23.8889, 50);
    expect(res.heatIndexF).toBeCloseTo(74.6, 1);
  });

  it('applies low-humidity adjustment when RH < 13% and 80 <= T <= 112°F', () => {
    // T = 90°F (32.2222°C), RH = 10%
    const unadjustedRothfusz =
      -42.379 +
      2.04901523 * 90 +
      10.14333127 * 10 -
      0.22475541 * 90 * 10 -
      0.00683783 * 90 * 90 -
      0.05481717 * 10 * 10 +
      0.00122874 * 90 * 90 * 10 +
      0.00085282 * 90 * 10 * 10 -
      0.00000199 * 90 * 90 * 10 * 10;
    const expectedAdjustment = ((13 - 10) / 4) * Math.sqrt((17 - Math.abs(90 - 95)) / 17);
    const expectedHI = unadjustedRothfusz - expectedAdjustment;

    const res = calculateNOAAHeatIndex(32.2222, 10);
    expect(res.heatIndexF).toBeCloseTo(expectedHI, 1);
  });

  it('applies high-humidity adjustment when RH > 85% and 80 <= T <= 87°F', () => {
    // T = 84°F (28.8889°C), RH = 90%
    const unadjustedRothfusz =
      -42.379 +
      2.04901523 * 84 +
      10.14333127 * 90 -
      0.22475541 * 84 * 90 -
      0.00683783 * 84 * 84 -
      0.05481717 * 90 * 90 +
      0.00122874 * 84 * 84 * 90 +
      0.00085282 * 84 * 90 * 90 -
      0.00000199 * 84 * 84 * 90 * 90;
    const expectedAdjustment = ((90 - 85) / 10) * ((87 - 84) / 5); // 0.5 * 0.6 = 0.3
    const expectedHI = unadjustedRothfusz + expectedAdjustment;

    const res = calculateNOAAHeatIndex(28.8889, 90);
    expect(res.heatIndexF).toBeCloseTo(expectedHI, 1);
  });

  it('clamps extreme humidity values safely within [0, 100]', () => {
    const resNegative = calculateNOAAHeatIndex(30, -20);
    const resZero = calculateNOAAHeatIndex(30, 0);
    expect(resNegative.heatIndexF).toBe(resZero.heatIndexF);

    const resOver = calculateNOAAHeatIndex(30, 150);
    const resMax = calculateNOAAHeatIndex(30, 100);
    expect(resOver.heatIndexF).toBe(resMax.heatIndexF);
  });

  it('returns deterministic output for identical inputs', async () => {
    const input: HeatRiskInput = {
      location: 'Bengaluru Central District',
      activity: 'walking',
      plannedTime: '14:00',
      durationMinutes: 45,
      shadeAvailability: 'partial_shade'
    };

    const res1 = await service.calculateRisk(input);
    const res2 = await service.calculateRisk(input);

    expect(res1.score).toBe(res2.score);
    expect(res1.level).toBe(res2.level);
    expect(res1.modelVersion).toBe('v1.1-noaa-nws');
    expect(res1.metricType).toBe('noaa_heat_index');
    expect(res1.calculationMethod).toBe('NOAA NWS Rothfusz Heat Index Equation');
  });

  it('throws descriptive error on missing input, missing location, or invalid duration bounds', async () => {
    // @ts-expect-error Testing invalid null input
    await expect(service.calculateRisk(null)).rejects.toThrow('Invalid input');

    const invalidLocInput = {
      location: '   ',
      activity: 'walking' as const,
      plannedTime: '14:00',
      durationMinutes: 45,
      shadeAvailability: 'direct_sun' as const
    };
    await expect(service.calculateRisk(invalidLocInput)).rejects.toThrow('location');

    const invalidDurationNegative = {
      location: 'Park',
      activity: 'walking' as const,
      plannedTime: '14:00',
      durationMinutes: -10,
      shadeAvailability: 'direct_sun' as const
    };
    await expect(service.calculateRisk(invalidDurationNegative)).rejects.toThrow('duration');

    const invalidDurationExcessive = {
      location: 'Park',
      activity: 'walking' as const,
      plannedTime: '14:00',
      durationMinutes: 2000,
      shadeAvailability: 'direct_sun' as const
    };
    await expect(service.calculateRisk(invalidDurationExcessive)).rejects.toThrow('duration');
  });

  it('applies solar shade and activity exertion scaling factors as documented', async () => {
    const directSunInput: HeatRiskInput = {
      location: 'Bengaluru',
      activity: 'running',
      plannedTime: '14:00',
      durationMinutes: 90,
      shadeAvailability: 'direct_sun'
    };

    const fullShadeInput: HeatRiskInput = {
      location: 'Bengaluru',
      activity: 'walking',
      plannedTime: '08:00',
      durationMinutes: 20,
      shadeAvailability: 'full_shade'
    };

    const highRes = await service.calculateRisk(directSunInput);
    const lowRes = await service.calculateRisk(fullShadeInput);

    expect(highRes.score).toBeGreaterThan(lowRes.score);
    expect(highRes.contributingFactors.length).toBe(4);
  });

  it('maps scores accurately across NOAA Low, Moderate, High, and Extreme categories', async () => {
    const resPark = await service.calculateRisk({
      location: 'Cubbon Park Canopy',
      activity: 'walking',
      plannedTime: '08:00',
      durationMinutes: 15,
      shadeAvailability: 'full_shade'
    });

    const resDelhi = await service.calculateRisk({
      location: 'North Delhi',
      activity: 'outdoor_work',
      plannedTime: '14:00',
      durationMinutes: 150,
      shadeAvailability: 'direct_sun'
    });

    expect(['Low', 'Moderate', 'High', 'Extreme']).toContain(resPark.level);
    expect(resDelhi.level).toBe('Extreme');

    // Test explicit category thresholds
    const lowHI = calculateNOAAHeatIndex(22, 40); // HI < 80°F
    expect(lowHI.heatIndexF).toBeLessThan(80);

    const modHI = calculateNOAAHeatIndex(27, 45); // 80 <= HI <= 89°F
    expect(modHI.heatIndexF).toBeGreaterThanOrEqual(80);
    expect(modHI.heatIndexF).toBeLessThan(90);

    const highHI = calculateNOAAHeatIndex(32, 50); // 90 <= HI <= 102°F (gives 95.0°F)
    expect(highHI.heatIndexF).toBeGreaterThanOrEqual(90);
    expect(highHI.heatIndexF).toBeLessThan(103);

    const extremeHI = calculateNOAAHeatIndex(35, 60); // HI >= 103°F
    expect(extremeHI.heatIndexF).toBeGreaterThanOrEqual(103);
  });
});
