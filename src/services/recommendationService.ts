import type { HeatRiskResult, Recommendation, HeatRiskInput } from '../types';
import { coolSpotService } from './coolSpotService';

export interface RecommendationService {
  generateRecommendations(input: HeatRiskInput, result: HeatRiskResult): Promise<Recommendation>;
}

export class StructuredRecommendationService implements RecommendationService {
  async generateRecommendations(_input: HeatRiskInput, result: HeatRiskResult): Promise<Recommendation> {
    const spots = await coolSpotService.getCoolSpots({ maxDistanceKm: 3 });
    const topSpots = spots.slice(0, 3);

    const primaryAdvice: string[] = [];
    let hydrationGuidance = '';
    let activityModification = '';
    let restInterval = '';

    if (result.score >= 80) {
      primaryAdvice.push('Postpone non-essential heavy exertion until ambient temperature drops.');
      primaryAdvice.push('Seek immediate shade or air-conditioned shelter every 15-20 minutes.');
      primaryAdvice.push('Consume electrolyte solutions alongside clean water to prevent hyponatremia.');

      hydrationGuidance = 'Drink 750ml to 1000ml of cold fluids per hour of exposure in small, frequent sips.';
      activityModification = 'Reduce activity pace by 50% or shift to early morning (06:00 AM - 08:00 AM).';
      restInterval = 'Mandatory 15-minute rest in active shade for every 30 minutes of physical activity.';
    } else if (result.score >= 60) {
      primaryAdvice.push('Limit continuous outdoor activity to under 45 minutes.');
      primaryAdvice.push('Wear light-colored, loose-fitting, breathable moisture-wicking apparel.');
      primaryAdvice.push('Keep a spray water bottle or cool damp towel for neck skin cooling.');

      hydrationGuidance = 'Drink 500ml to 750ml of water per hour. Avoid sugary or high-caffeine beverages.';
      activityModification = 'Pace yourself moderately; avoid sprint intervals or peak load efforts.';
      restInterval = '10-minute shade pause every 40 minutes of outdoor exertion.';
    } else if (result.score >= 35) {
      primaryAdvice.push('Stay aware of environmental thermal accumulation over time.');
      primaryAdvice.push('Apply SPF 30+ broad-spectrum sunscreen and wear UV-rated sunglasses.');

      hydrationGuidance = 'Maintain regular water intake (350ml - 500ml per hour).';
      activityModification = 'Standard activity pace permissible; monitor skin flushing and heart rate.';
      restInterval = 'Brief 5-minute break in shade hourly.';
    } else {
      primaryAdvice.push('Conditions are currently within low risk limits for routine activities.');
      primaryAdvice.push('Maintain baseline hydration and sun protection.');

      hydrationGuidance = 'Drink water as needed to satisfy thirst.';
      activityModification = 'Normal activity levels supported.';
      restInterval = 'Standard routine rest breaks.';
    }

    const emergencySigns = [
      'Dizziness, disorientation, or lightheadedness',
      'Heavy sweating transitioning to dry, hot skin',
      'Rapid, shallow pulse or severe throbbing headache',
      'Muscle cramping or nausea'
    ];

    const alternativeTime = {
      timeWindow: '06:30 AM - 08:30 AM (Tomorrow)',
      expectedTempC: 26.5,
      expectedRiskLevel: 'Low' as const,
      reason: 'Morning solar angle provides minimal direct thermal radiation and 11.3°C cooler ambient conditions.'
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
      suggestedAlternativeTime: result.score >= 35 ? alternativeTime : undefined
    };
  }
}

export const recommendationService = new StructuredRecommendationService();
