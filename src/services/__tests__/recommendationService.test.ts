import { describe, it, expect } from 'vitest';
import { StructuredRecommendationService } from '../recommendationService';
import { DeterministicHeatRiskService } from '../heatRiskService';
import type { HeatRiskInput } from '../../types';

describe('StructuredRecommendationService Unit Tests', () => {
  const recService = new StructuredRecommendationService();
  const riskService = new DeterministicHeatRiskService();

  it('generates consistent safety advice aligned with risk engine score', async () => {
    const input: HeatRiskInput = {
      location: 'Bengaluru Central District',
      activity: 'running',
      plannedTime: '14:30',
      durationMinutes: 90,
      shadeAvailability: 'direct_sun'
    };

    const riskResult = await riskService.calculateRisk(input);
    const recommendation = await recService.generateRecommendations(input, riskResult);

    expect(recommendation.riskScore).toEqual(riskResult.score);
    expect(recommendation.primaryAdvice.length).toBeGreaterThan(0);
    expect(recommendation.hydrationGuidance).toBeDefined();
    expect(recommendation.emergencySigns.length).toBe(4);
    expect(recommendation.disclaimer).toContain('Not medical advice');
  });

  it('explains forecast unavailability in alternative time window without fabricating temperatures', async () => {
    const input: HeatRiskInput = {
      location: 'Bengaluru Central District',
      activity: 'running',
      plannedTime: '14:30',
      durationMinutes: 60,
      shadeAvailability: 'direct_sun'
    };

    const riskResult = await riskService.calculateRisk(input);
    const recommendation = await recService.generateRecommendations(input, riskResult);

    expect(recommendation.suggestedAlternativeTime).toBeDefined();
    expect(recommendation.suggestedAlternativeTime?.forecastAvailable).toBe(false);
    expect(recommendation.suggestedAlternativeTime?.reason).toContain('telemetry is not currently connected');
  });
});
