import type { HeatRiskInput, HeatRiskResult, RiskLevel, WeatherData, ContributingFactor } from '../types';
import { weatherService } from './weatherService';

export interface HeatRiskService {
  calculateRisk(input: HeatRiskInput): Promise<HeatRiskResult>;
}

/**
 * Temperature Unit Conversions
 */
export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9;
}

/**
 * Pure NOAA National Weather Service Heat Index Calculation (Rothfusz Regression Equation)
 * Official Reference: https://www.wpc.ncep.noaa.gov/heat_index/hi_equation.html
 *
 * Computation Steps:
 * 1. Calculate Simple Heat Index (Steadman formula):
 *    HI_simple = 0.5 * (T + 61.0 + ((T - 68.0) * 1.2) + (RH * 0.094))
 * 2. If HI_simple < 80°F, use HI_simple.
 * 3. If HI_simple >= 80°F, compute full 9-coefficient Rothfusz regression equation.
 * 4. Apply low-humidity adjustment (if RH < 13% and 80 <= T <= 112°F):
 *    subtraction = ((13 - RH) / 4) * sqrt((17 - |T - 95|) / 17)
 * 5. Apply high-humidity adjustment (if RH > 85% and 80 <= T <= 87°F):
 *    addition = ((RH - 85) / 10) * ((87 - T) / 5)
 */
export function calculateNOAAHeatIndex(tempC: number, humidityPercent: number): { heatIndexF: number; heatIndexC: number } {
  const T = celsiusToFahrenheit(tempC);
  const RH = Math.max(0, Math.min(100, humidityPercent));

  // 1. Simple Heat Index formula
  let hiF = 0.5 * (T + 61.0 + (T - 68.0) * 1.2 + RH * 0.094);

  // 2. If simple HI >= 80°F, perform full Rothfusz regression equation & branch adjustments
  if (hiF >= 80.0) {
    hiF =
      -42.379 +
      2.04901523 * T +
      10.14333127 * RH -
      0.22475541 * T * RH -
      0.00683783 * T * T -
      0.05481717 * RH * RH +
      0.00122874 * T * T * RH +
      0.00085282 * T * RH * RH -
      0.00000199 * T * T * RH * RH;

    // Low-humidity adjustment branch
    if (RH < 13 && T >= 80 && T <= 112) {
      const adjustment = ((13 - RH) / 4) * Math.sqrt(Math.max(0, (17 - Math.abs(T - 95)) / 17));
      hiF -= adjustment;
    }
    // High-humidity adjustment branch
    else if (RH > 85 && T >= 80 && T <= 87) {
      const adjustment = ((RH - 85) / 10) * ((87 - T) / 5);
      hiF += adjustment;
    }
  }

  const hiC = fahrenheitToCelsius(hiF);
  return {
    heatIndexF: Math.round(hiF * 10) / 10,
    heatIndexC: Math.round(hiC * 10) / 10
  };
}

/**
 * HeatShield Deterministic Heat Risk Service
 * Model Version: v1.1-noaa-nws
 */
export class DeterministicHeatRiskService implements HeatRiskService {
  async calculateRisk(input: HeatRiskInput): Promise<HeatRiskResult> {
    // 1. Input Validation & Bounds Sanity Checks
    if (!input) {
      throw new Error('Invalid input: Input object is required.');
    }

    if (!input.location || !input.location.trim()) {
      throw new Error('Invalid location: A location name is required.');
    }

    if (typeof input.durationMinutes !== 'number' || isNaN(input.durationMinutes) || input.durationMinutes < 1 || input.durationMinutes > 1440) {
      throw new Error('Invalid duration: Duration must be a valid number between 1 and 1440 minutes (24 hours).');
    }

    const weather: WeatherData = await weatherService.getCurrentWeather(input.location);

    // Weather Data Clamping
    const tempC = Math.max(-50, Math.min(60, weather.temperatureC));
    const humidityPercent = Math.max(0, Math.min(100, weather.humidityPercent));

    // 2. Pure Meteorological NOAA NWS Heat Index Calculation
    const { heatIndexF, heatIndexC } = calculateNOAAHeatIndex(tempC, humidityPercent);

    // 3. Transparent HeatShield Risk Category Mapping (Derived from NOAA NWS Heat Index Ranges)
    // - NOAA Mild (<80°F / <26.7°C) -> HeatShield 'Low'
    // - NOAA Caution (80-89°F / 26.7-32.2°C) -> HeatShield 'Moderate'
    // - NOAA Extreme Caution (90-102°F / 32.2-39.4°C) -> HeatShield 'High'
    // - NOAA Danger / Extreme Danger (>=103°F / >=39.4°C) -> HeatShield 'Extreme'
    let level: RiskLevel = 'Low';
    let levelColor = '#10B981';
    let summary = 'Environmental heat index is within mild limits. Baseline hydration recommended.';

    if (heatIndexF >= 103) {
      level = 'Extreme';
      levelColor = '#EF4444';
      summary = 'DANGER: Environmental heat index indicates potential heat cramps, exhaustion, or heat stroke risk with continued exertion.';
    } else if (heatIndexF >= 90) {
      level = 'High';
      levelColor = '#F97316';
      summary = 'EXTREME CAUTION: Elevated environmental heat index. Heat cramps and heat exhaustion possible with prolonged exposure.';
    } else if (heatIndexF >= 80) {
      level = 'Moderate';
      levelColor = '#F59E0B';
      summary = 'CAUTION: Environmental heat index requires caution. Fatigue possible with prolonged physical activity.';
    } else {
      level = 'Low';
      levelColor = '#10B981';
    }

    // 4. Contextual Exposure Guidance & Adjustments (Kept distinct from environmental Heat Index)
    let shadeDesc = 'Direct sunshine (NWS notes direct sun can increase effective heat sensation by up to +15°F)';
    if (input.shadeAvailability === 'full_shade') {
      shadeDesc = 'Continuous shade coverage (provides solar radiation relief)';
    } else if (input.shadeAvailability === 'partial_shade') {
      shadeDesc = 'Partial shade coverage (intermittent solar protection)';
    }

    const activityMeta: Record<string, { label: string; impact: 'Low' | 'Medium' | 'High' }> = {
      walking: { label: 'Brisk Walking (Moderate Metabolic Load)', impact: 'Low' },
      cycling: { label: 'Cycling (Elevated Internal Thermal Load)', impact: 'Medium' },
      running: { label: 'Running (High Metabolic Heat Production)', impact: 'High' },
      outdoor_work: { label: 'Heavy Outdoor Work (Sustained Physical Exertion)', impact: 'High' },
      other: { label: 'General Outdoor Exertion', impact: 'Low' }
    };
    const actInfo = activityMeta[input.activity] || activityMeta.other;

    let durationLabel = '30 - 60 mins baseline exposure';
    if (input.durationMinutes < 30) {
      durationLabel = '< 30 mins short exposure';
    } else if (input.durationMinutes <= 60) {
      durationLabel = '30 - 60 mins exposure';
    } else if (input.durationMinutes <= 120) {
      durationLabel = '60 - 120 mins extended exposure';
    } else {
      durationLabel = '> 2 hours prolonged exposure';
    }

    // 5. HeatShield Normalized 0-100 Presentation Score (Designed strictly for UI visualization, NOT an official NOAA metric)
    let baseScore = Math.round(Math.max(10, Math.min(99, ((heatIndexF - 65) / 65) * 100)));
    let activityBonus = input.activity === 'running' || input.activity === 'outdoor_work' ? 8 : input.activity === 'cycling' ? 4 : 0;
    let durationBonus = input.durationMinutes > 120 ? 10 : input.durationMinutes > 60 ? 5 : 0;
    let sunBonus = input.shadeAvailability === 'direct_sun' ? 6 : input.shadeAvailability === 'partial_shade' ? 2 : -4;

    let presentationScore = Math.min(99, Math.max(8, baseScore + activityBonus + durationBonus + sunBonus));

    const contributingFactors: ContributingFactor[] = [
      {
        factor: `Environmental Heat Index (${heatIndexC}°C / ${heatIndexF}°F)`,
        impact: heatIndexF >= 90 ? 'High' : heatIndexF >= 80 ? 'Medium' : 'Low',
        description: `Calculated from ambient temp ${tempC}°C and humidity ${humidityPercent}% using official NOAA NWS formula.`
      },
      {
        factor: `Metabolic Load (${actInfo.label.split(' ')[0]})`,
        impact: actInfo.impact,
        description: actInfo.label
      },
      {
        factor: `Exposure Duration (${input.durationMinutes} minutes)`,
        impact: input.durationMinutes > 60 ? 'High' : 'Medium',
        description: durationLabel
      },
      {
        factor: `Solar Exposure (${input.shadeAvailability.replace('_', ' ')})`,
        impact: input.shadeAvailability === 'direct_sun' ? 'High' : 'Low',
        description: shadeDesc
      }
    ];

    return {
      score: presentationScore,
      level,
      levelColor,
      summary,
      contributingFactors,
      uncertaintyScore: 14,
      calculatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      disclaimer: 'Calculated using NOAA National Weather Service Heat Index standard equation. HeatShield risk levels and 0-100 score are UI presentation metrics, not an official medical diagnosis or probability of illness.',
      demoNotice: 'Demo Telemetry Mode: Uses simulated weather data with official NOAA NWS Heat Index standard calculation.',
      modelVersion: 'v1.1-noaa-nws',
      metricType: 'noaa_heat_index',
      weatherSnapshot: weather,
      heatIndexC,
      heatIndexF,
      calculationMethod: 'NOAA NWS Rothfusz Heat Index Equation'
    };
  }
}

export const heatRiskService = new DeterministicHeatRiskService();
