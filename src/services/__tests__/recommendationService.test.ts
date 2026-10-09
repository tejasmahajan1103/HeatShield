import { describe, it, expect } from 'vitest';
import { StructuredRecommendationService } from '../recommendationService';
import { DeterministicHeatRiskService } from '../heatRiskService';
import type { HeatRiskInput } from '../../types';

describe('StructuredRecommendationService Unit Tests', () => {
  const recService = new StructuredRecommendationService();
  const riskService = new DeterministicHeatRiskService();

  it('generates high-risk safety protocols and alternative time window for high thermal stress', async () => {
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
    expect(recommendation.hydrationGuidance).toContain('fluids');
    expect(recommendation.emergencySigns.length).toBeGreaterThan(0);
    expect(recommendation.suggestedAlternativeTime).toBeDefined();
    expect(recommendation.suggestedAlternativeTime?.expectedRiskLevel).toBe('Low');
  });
});
