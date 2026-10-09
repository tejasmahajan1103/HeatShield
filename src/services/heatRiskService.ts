import type { HeatRiskInput, HeatRiskResult, RiskLevel, WeatherData, ContributingFactor } from '../types';
import { weatherService } from './weatherService';

export interface HeatRiskService {
  calculateRisk(input: HeatRiskInput): Promise<HeatRiskResult>;
}

export class DeterministicHeatRiskService implements HeatRiskService {
  async calculateRisk(input: HeatRiskInput): Promise<HeatRiskResult> {
    const weather: WeatherData = await weatherService.getCurrentWeather(input.location);

    const tempC = weather.temperatureC;
    const humidityRatio = weather.humidityPercent / 100;
    const vaporPressure = humidityRatio * 6.105 * Math.exp((17.27 * tempC) / (237.7 + tempC));
    const wbgtProxy = 0.567 * tempC + 0.393 * vaporPressure + 3.94;

    const activityMultipliers: Record<string, { multiplier: number; label: string }> = {
      walking: { multiplier: 1.0, label: 'Brisk Walking (Moderate Load)' },
      cycling: { multiplier: 1.25, label: 'Cycling (Elevated Load)' },
      running: { multiplier: 1.55, label: 'Running (High Metabolic Load)' },
      outdoor_work: { multiplier: 1.65, label: 'Heavy Outdoor Work (Sustained Load)' },
      other: { multiplier: 1.1, label: 'General Movement' }
    };
    const activityMeta = activityMultipliers[input.activity] || activityMultipliers.other;

    let durationMultiplier = 1.0;
    let durationLabel = '30 - 60 mins';
    if (input.durationMinutes < 30) {
      durationMultiplier = 0.85;
      durationLabel = '< 30 mins short exposure';
    } else if (input.durationMinutes <= 60) {
      durationMultiplier = 1.0;
    } else if (input.durationMinutes <= 120) {
      durationMultiplier = 1.25;
      durationLabel = '60 - 120 mins extended exposure';
    } else {
      durationMultiplier = 1.5;
      durationLabel = '> 2 hours prolonged heat stress';
    }

    let shadeBonus = 0;
    let shadeDesc = 'Direct solar radiation (+15 risk score penalty)';
    if (input.shadeAvailability === 'full_shade') {
      shadeBonus = -12;
      shadeDesc = 'Continuous shade coverage (-12 risk score reduction)';
    } else if (input.shadeAvailability === 'partial_shade') {
      shadeBonus = +4;
      shadeDesc = 'Intermittent shade coverage (+4 minor penalty)';
    } else {
      shadeBonus = +15;
    }

    const baseThermalStress = Math.max(0, wbgtProxy - 18);
    const rawScore = (baseThermalStress * 3.6) * activityMeta.multiplier * durationMultiplier + shadeBonus;
    const finalScore = Math.min(99, Math.max(8, Math.round(rawScore)));

    let level: RiskLevel = 'Low';
    let levelColor = '#10B981';
    let summary = 'Heat stress risk is minimal. Maintain normal hydration.';

    if (finalScore >= 80) {
      level = 'Extreme';
      levelColor = '#EF4444';
      summary = 'DANGER: Extreme heat stress hazard. High probability of heat exhaustion or heat stroke during activity.';
    } else if (finalScore >= 60) {
      level = 'High';
      levelColor = '#F97316';
      summary = 'WARNING: High thermal stress. Limit strenuous outdoor work and seek cool spots frequently.';
    } else if (finalScore >= 35) {
      level = 'Moderate';
      levelColor = '#F59E0B';
      summary = 'CAUTION: Moderate heat exposure. Take shaded rest breaks and monitor hydration levels.';
    }

    const contributingFactors: ContributingFactor[] = [
      {
        factor: `Ambient Temp (${tempC}°C) & Humidity (${weather.humidityPercent}%)`,
        impact: tempC > 36 || weather.humidityPercent > 70 ? 'High' : 'Medium',
        description: `High heat index (apparent temp ~${Math.round(wbgtProxy + 4)}°C) reduces natural evaporative sweat cooling.`
      },
      {
        factor: `Activity Intensity (${activityMeta.label.split(' ')[0]})`,
        impact: activityMeta.multiplier >= 1.4 ? 'High' : activityMeta.multiplier >= 1.2 ? 'Medium' : 'Low',
        description: activityMeta.label
      },
      {
        factor: `Exposure Duration (${input.durationMinutes} minutes)`,
        impact: durationMultiplier >= 1.25 ? 'High' : 'Medium',
        description: durationLabel
      },
      {
        factor: `Solar Radiation (${input.shadeAvailability.replace('_', ' ')})`,
        impact: input.shadeAvailability === 'direct_sun' ? 'High' : 'Low',
        description: shadeDesc
      }
    ];

    return {
      score: finalScore,
      level,
      levelColor,
      summary,
      contributingFactors,
      uncertaintyScore: 14,
      calculatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      disclaimer: 'Preliminary frontend heuristic score. Not a medical diagnostic or official meteorological warning.',
      demoNotice: 'Demo Mode: Uses static/simulated weather data & preliminary deterministic calculation.',
      weatherSnapshot: weather
    };
  }
}

export const heatRiskService = new DeterministicHeatRiskService();
