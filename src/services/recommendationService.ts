import type { HeatRiskResult, Recommendation, HeatRiskInput, AlternativeTimeWindow, CoolSpot } from '../types';
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
    const userCoordinates = (input.latitude !== undefined && input.longitude !== undefined)
      ? { latitude: input.latitude, longitude: input.longitude }
      : undefined;

    let spots: CoolSpot[] = [];
    let coolSpotDiscoveryFailed = false;
    try {
      spots = await coolSpotService.getCoolSpots({ maxDistanceKm: 5, userCoordinates });
    } catch (err) {
      console.warn('CoolSpot discovery unavailable for recommendations:', err);
      coolSpotDiscoveryFailed = true;
    }
    const topSpots = spots.slice(0, 3);

    const primaryAdvice: string[] = [];
    let hydrationGuidance = '';
    let activityModification = '';
    let restInterval = '';

    if (result.level === 'Extreme' || result.score >= 80) {
      primaryAdvice.push('Reduce or stop outdoor physical exertion immediately during severe heat.');
      primaryAdvice.push('Seek an indoor air-conditioned space or verified cooling sanctuary.');
      primaryAdvice.push('Drink cool water (1 cup for every 15-20 minutes) and supplement electrolytes.');

      hydrationGuidance = 'Drink cool water frequently in small amounts. Do not wait for thirst. Supplement electrolytes if sweating heavily.';
      activityModification = `For ${input.activity.replace('_', ' ')}, suspend or reschedule activity to cooler morning or evening hours.`;
      restInterval = 'Rest immediately in a cooled or shaded environment for at least 15-20 minutes per half hour.';
    } else if (result.level === 'High' || result.score >= 60) {
      primaryAdvice.push('Reduce outdoor exertion intensity and limit total exposure time.');
      primaryAdvice.push('Seek active shade or indoor cooling spots for mandatory rest breaks.');
      primaryAdvice.push('Maintain continuous hydration with water and avoid dehydrating beverages.');

      hydrationGuidance = 'Drink water regularly throughout exposure. Avoid caffeine and alcoholic beverages.';
      activityModification = `Pace outdoor ${input.activity.replace('_', ' ')} at low intensity. Avoid peak solar hours.`;
      restInterval = 'Take a 10-15 minute shade break every 25-30 minutes.';
    } else if (result.level === 'Moderate' || result.score >= 35) {
      primaryAdvice.push('Pace physical exertion and utilize available shade along your route.');
      primaryAdvice.push('Keep hydration accessible and take routine rest breaks.');
      primaryAdvice.push('Wear light-colored, breathable apparel and apply broad-spectrum sunscreen.');

      hydrationGuidance = 'Drink fluids regularly to maintain healthy hydration balance.';
      activityModification = 'Maintain moderate pace; monitor skin flushing, heat discomfort, and fatigue.';
      restInterval = 'Take routine 5-10 minute rest breaks in shaded areas.';
    } else {
      primaryAdvice.push('Heat stress risk is currently low for general outdoor activities.');
      primaryAdvice.push('Maintain standard preventive hydration and sun protection.');
      primaryAdvice.push('Stay aware of environmental temperature increases over extended periods.');

      hydrationGuidance = 'Satisfy thirst with fresh water at normal intervals.';
      activityModification = 'Normal activity pace supported under current weather conditions.';
      restInterval = 'Standard routine breaks as needed.';
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

    let disclaimer = 'General public health guidance based on preliminary risk heuristics. Not medical advice. Seek medical care if experiencing heat illness symptoms.';
    if (coolSpotDiscoveryFailed) {
      disclaimer += ' (Nearby cooling spot discovery was unavailable at this time.)';
    }

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
      disclaimer
    };
  }
}

export const recommendationService = new StructuredRecommendationService();

