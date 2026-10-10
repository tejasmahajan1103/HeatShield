import type { HeatRiskResult, Recommendation, HeatRiskInput, AlternativeTimeWindow } from '../types';
import { coolSpotService } from './coolSpotService';

export interface RecommendationService {
  generateRecommendations(input: HeatRiskInput, result: HeatRiskResult): Promise<Recommendation>;
}

/**
 * Recommendation Service Protocol
 * ===============================
 * Generates evidence-based public health heat safety suggestions (CDC / NIOSH heat stress guidelines)
 * based on the deterministic risk engine output.
 *
 * NOTE: Does NOT provide medical diagnostic advice or fabricate unsupported multi-hour weather forecasts.
 */
export class StructuredRecommendationService implements RecommendationService {
  async generateRecommendations(input: HeatRiskInput, result: HeatRiskResult): Promise<Recommendation> {
    const spots = await coolSpotService.getCoolSpots({ maxDistanceKm: 3 });
    const topSpots = spots.slice(0, 3);

    const primaryAdvice: string[] = [];
    let hydrationGuidance = '';
    let activityModification = '';
    let restInterval = '';

    if (result.score >= 80) {
      primaryAdvice.push('Consider rescheduling or minimizing strenuous physical exertion during extreme thermal stress.');
      primaryAdvice.push('Take frequent rest breaks in active shade or air-conditioned environments.');
      primaryAdvice.push('Drink fluids regularly and balance with electrolyte intake during heavy sweating.');

      hydrationGuidance = 'Maintain regular fluid intake in small, frequent amounts. Do not wait until feeling thirsty.';
      activityModification = `For ${input.activity.replace('_', ' ')}, reduce physical intensity and avoid peak solar radiation hours.`;
      restInterval = 'Schedule a shaded rest pause every 20-30 minutes of exertion.';
    } else if (result.score >= 60) {
      primaryAdvice.push('Pace continuous outdoor exertion and monitor body signals.');
      primaryAdvice.push('Wear lightweight, breathable, light-colored clothing and UV sun protection.');
      primaryAdvice.push('Keep cool water accessible and use damp towels for skin cooling.');

      hydrationGuidance = 'Drink water frequently throughout exposure. Avoid alcohol or high-caffeine beverages.';
      activityModification = 'Maintain a moderate pace and avoid max-effort intervals during peak heat.';
      restInterval = 'Take a 10-minute shade break every 30-40 minutes.';
    } else if (result.score >= 35) {
      primaryAdvice.push('Stay mindful of cumulative heat exposure over time.');
      primaryAdvice.push('Apply SPF 30+ broad-spectrum sunscreen and wear protective eyewear.');

      hydrationGuidance = 'Drink water at regular intervals to maintain healthy hydration.';
      activityModification = 'Standard activity pace supported; monitor skin flushing and body comfort.';
      restInterval = 'Take routine brief rest breaks in shade.';
    } else {
      primaryAdvice.push('Environmental heat stress is currently low for routine activities.');
      primaryAdvice.push('Maintain general hydration and sun protection.');

      hydrationGuidance = 'Drink fluids regularly to satisfy thirst.';
      activityModification = 'Normal activity pace supported.';
      restInterval = 'Standard routine breaks.';
    }

    const emergencySigns = [
      'Dizziness, confusion, or lightheadedness',
      'Profuse sweating transitioning to hot, dry skin',
      'Rapid pulse or severe throbbing headache',
      'Nausea, muscle cramps, or extreme fatigue'
    ];

    // Alternative Time Window Guidance (Without fabricating unverified future weather telemetry)
    const suggestedAlternativeTime: AlternativeTimeWindow = {
      timeWindow: 'Early Morning (06:00 AM - 08:00 AM) or Post-Sunset',
      reason: 'Multi-hour weather forecast telemetry is not currently connected. Generally, early morning hours feature lower solar radiation and cooler baseline ambient conditions.',
      forecastAvailable: false
    };

    return {
      riskScore: result.score,
      riskLevel: result.level,
      primaryAdvice,
      hydrationGuidance,
      activityModification,
      restInterval,
      emergencySigns,
      suggestedCoolSpots: topSpots,
      suggestedAlternativeTime,
      disclaimer: 'General public health guidance based on preliminary risk heuristics. Not medical advice. Seek medical care if experiencing heat illness symptoms.'
    };
  }
}

export const recommendationService = new StructuredRecommendationService();
