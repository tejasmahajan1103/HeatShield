import { describe, it, expect } from 'vitest';
import { DeterministicHeatRiskService } from '../heatRiskService';
import type { HeatRiskInput } from '../../types';

describe('DeterministicHeatRiskService Unit Tests', () => {
  const service = new DeterministicHeatRiskService();

  it('calculates higher risk for running in direct sun vs walking in full shade', async () => {
    const highRiskInput: HeatRiskInput = {
      location: 'Bengaluru Central District',
      activity: 'running',
      plannedTime: '14:00',
      durationMinutes: 90,
      shadeAvailability: 'direct_sun'
    };

    const lowRiskInput: HeatRiskInput = {
      location: 'Bengaluru Central District',
      activity: 'walking',
      plannedTime: '08:00',
      durationMinutes: 20,
      shadeAvailability: 'full_shade'
    };

    const highResult = await service.calculateRisk(highRiskInput);
    const lowResult = await service.calculateRisk(lowRiskInput);

    expect(highResult.score).toBeGreaterThan(lowResult.score);
    expect(highResult.level).toMatch(/High|Extreme/);
    expect(lowResult.level).toMatch(/Low|Moderate/);
  });

  it('handles boundary duration values correctly', async () => {
    const inputShort: HeatRiskInput = {
      location: 'Test Park',
      activity: 'walking',
      plannedTime: '10:00',
      durationMinutes: 10,
      shadeAvailability: 'full_shade'
    };

    const inputLong: HeatRiskInput = {
      location: 'Test Park',
      activity: 'outdoor_work',
      plannedTime: '14:00',
      durationMinutes: 180,
      shadeAvailability: 'direct_sun'
    };

    const shortResult = await service.calculateRisk(inputShort);
    const longResult = await service.calculateRisk(inputLong);

    expect(shortResult.score).toBeLessThanOrEqual(50);
    expect(longResult.score).toBeGreaterThanOrEqual(60);
  });

  it('includes non-medical disclaimers and contributing factors', async () => {
    const input: HeatRiskInput = {
      location: 'Central Metro',
      activity: 'walking',
      plannedTime: '12:00',
      durationMinutes: 45,
      shadeAvailability: 'partial_shade'
    };

    const result = await service.calculateRisk(input);

    expect(result.disclaimer).toContain('Not a medical diagnostic');
    expect(result.uncertaintyScore).toBeGreaterThan(0);
    expect(result.contributingFactors.length).toBeGreaterThanOrEqual(4);
    expect(result.weatherSnapshot.isDemo).toBe(true);
  });
});
