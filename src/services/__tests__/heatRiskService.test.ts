import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  DeterministicHeatRiskService,
  calculateNOAAHeatIndex,
  celsiusToFahrenheit,
  fahrenheitToCelsius
} from '../heatRiskService';
import type { HeatRiskInput, WeatherData } from '../../types';

describe('DeterministicHeatRiskService & NOAA Heat Index Validation Tests', () => {
  const service = new DeterministicHeatRiskService();

  afterEach(() => {
    vi.restoreAllMocks();
  });

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
  }, 15000);

  it('throws descriptive error on missing input, missing location, or invalid duration bounds', async () => {

    await expect(service.calculateRisk(null as unknown as HeatRiskInput)).rejects.toThrow('Invalid input');

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

  it('correctly identifies daylight and nighttime hours and eliminates direct solar bonus at night', async () => {
    const nightInput: HeatRiskInput = {
      location: 'Bengaluru',
      activity: 'walking',
      plannedTime: '20:30',
      durationMinutes: 45,
      shadeAvailability: 'direct_sun'
    };

    const dayInput: HeatRiskInput = {
      location: 'Bengaluru',
      activity: 'walking',
      plannedTime: '14:00',
      durationMinutes: 45,
      shadeAvailability: 'direct_sun'
    };

    const nightRes = await service.calculateRisk(nightInput);
    const dayRes = await service.calculateRisk(dayInput);

    const nightSolar = nightRes.contributingFactors.find(f => f.factor.includes('Solar Exposure'));
    expect(nightSolar?.factor).toContain('Nighttime');
    expect(nightSolar?.description).toContain('absent after sunset');
    expect(nightRes.score).toBeLessThan(dayRes.score);
  });

  it('correctly calculates user screenshot scenario (32°C, 56.5% RH, cycling, 45m, direct sun) as Moderate (59/100)', async () => {
    // 32°C, 56.5% RH -> NOAA HI = 96.9°F (36.1°C) -> NOAA Extreme Caution band
    // baseScore: 36 + (96.9 - 90)/13 * 29 = 51.4
    // cycling adjustment: +3
    // 45 min duration adjustment: 0
    // direct sun midday (14:30): +5
    // total score: round(59.4) = 59 (Moderate Risk)
    const hi = calculateNOAAHeatIndex(32, 56.5);
    expect(hi.heatIndexC).toBeCloseTo(36.1, 1);
    expect(hi.heatIndexF).toBeCloseTo(96.9, 1);

    const mockWeather: WeatherData = {
      locationName: 'Bengaluru Central District',
      temperatureC: 32,
      humidityPercent: 56.5,
      uvIndex: 8.0,
      wetBulbTempC: 25.0,
      windSpeedKmh: 10.0,
      conditionText: 'Simulated Demo',
      isDemo: true,
      dataSourceStatus: 'demo_simulated',
      fetchedAt: new Date().toISOString()
    };

    const input: HeatRiskInput = {
      location: 'Bengaluru Central District',
      activity: 'cycling',
      plannedTime: '14:30',
      durationMinutes: 45,
      shadeAvailability: 'direct_sun',
      weatherOverride: mockWeather
    };

    const res = await service.calculateRisk(input);
    expect(res.score).toBe(59);
    expect(res.level).toBe('Moderate');
    expect(res.heatIndexC).toBeCloseTo(36.1, 1);
    expect(res.demoNotice).toBeDefined();
    expect(res.demoNotice).toContain('Demo Telemetry');
  });

  it('escalates to High Risk for strenuous activity and extended exposure under 32°C conditions', async () => {
    const mockWeather: WeatherData = {
      locationName: 'Bengaluru Central District',
      temperatureC: 32,
      humidityPercent: 56.5,
      uvIndex: 8.0,
      wetBulbTempC: 25.0,
      windSpeedKmh: 10.0,
      conditionText: 'Clear',
      isDemo: false,
      dataSourceStatus: 'live_sensor',
      fetchedAt: new Date().toISOString()
    };

    const input: HeatRiskInput = {
      location: 'Bengaluru Central District',
      activity: 'running', // +8
      plannedTime: '14:30',
      durationMinutes: 130, // +7
      shadeAvailability: 'direct_sun', // +5
      weatherOverride: mockWeather
    };

    const res = await service.calculateRisk(input);
    // base 51.4 + 8 + 7 + 5 = 71.4 -> 71 (High Risk)
    expect(res.score).toBe(71);
    expect(res.level).toBe('High');
  });

  it('verifies strict monotonic behavior across duration, exertion, and shade levels', async () => {
    const baseInput: HeatRiskInput = {
      location: 'Bengaluru Central District',
      activity: 'walking',
      plannedTime: '14:30',
      durationMinutes: 30,
      shadeAvailability: 'full_shade'
    };

    const baseRes = await service.calculateRisk(baseInput);

    // 1. Longer duration should not reduce risk
    const longerRes = await service.calculateRisk({ ...baseInput, durationMinutes: 90 });
    expect(longerRes.score).toBeGreaterThanOrEqual(baseRes.score);

    // 2. Higher physical exertion should not reduce risk
    const runningRes = await service.calculateRisk({ ...baseInput, activity: 'running' });
    expect(runningRes.score).toBeGreaterThanOrEqual(baseRes.score);

    // 3. Direct sun should not reduce risk compared to full shade
    const sunRes = await service.calculateRisk({ ...baseInput, shadeAvailability: 'direct_sun' });
    expect(sunRes.score).toBeGreaterThanOrEqual(baseRes.score);
  });
});

