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
 * Determines if the given planned time string (e.g. '14:30', '20:30') falls within daylight hours.
 * Standard astronomical daylight window (~06:00 to ~18:30 local solar time).
 */
export function isDaylightTime(plannedTimeStr?: string, _lat?: number, _lon?: number): boolean {
  if (!plannedTimeStr || !plannedTimeStr.includes(':')) return true;
  try {
    const [hStr, mStr] = plannedTimeStr.trim().split(':');
    const hour = parseInt(hStr, 10);
    const minute = parseInt(mStr || '0', 10);
    const decimalHour = hour + minute / 60.0;
    return decimalHour >= 6.0 && decimalHour < 18.5;
  } catch {
    return true;
  }
}

/**
 * Pure NOAA National Weather Service Heat Index Calculation (Rothfusz Regression Equation)
 * Official Reference: https://www.wpc.ncep.noaa.gov/heat_index/hi_equation.html
 *
 * Computation Steps:
 * 1. Convert ambient temperature to °F (if passed in °C).
 * 2. Calculate Simple Heat Index (Steadman formula):
 *    HI_simple = 0.5 * (T + 61.0 + ((T - 68.0) * 1.2) + (RH * 0.094))
 * 3. If HI_simple < 80°F, use HI_simple.
 * 4. If HI_simple >= 80°F, compute full 9-coefficient Rothfusz regression equation.
 * 5. Apply low-humidity adjustment (if RH < 13% and 80 <= T <= 112°F):
 *    subtraction = ((13 - RH) / 4) * sqrt((17 - |T - 95|) / 17)
 * 6. Apply high-humidity adjustment (if RH > 85% and 80 <= T <= 87°F):
 *    addition = ((RH - 85) / 10) * ((87 - T) / 5)
 * 7. Convert HI °F to °C for display.
 */
export function calculateNOAAHeatIndex(tempInput: number, humidityPercent: number): { heatIndexF: number; heatIndexC: number } {
  const T = tempInput > 55.0 ? tempInput : celsiusToFahrenheit(tempInput);
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

    const weather: WeatherData = (input.latitude !== undefined && input.longitude !== undefined)
      ? await weatherService.getCurrentWeatherByCoords(input.latitude, input.longitude)
      : await weatherService.getCurrentWeather(input.location);

    // Weather Data Clamping
    const tempC = Math.max(-50, Math.min(60, weather.temperatureC));
    const humidityPercent = Math.max(0, Math.min(100, weather.humidityPercent));

    // Daylight / Nighttime Detection
    const isDaylight = isDaylightTime(input.plannedTime, input.latitude, input.longitude);

    // 2. Pure Meteorological NOAA NWS Heat Index Calculation
    const { heatIndexF, heatIndexC } = calculateNOAAHeatIndex(tempC, humidityPercent);

    // 3. Transparent HeatShield Risk Category Mapping (Derived from NOAA NWS Heat Index Ranges)
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

    // 4. Contextual Exposure Guidance & Adjustments (Accounts for Nighttime)
    let shadeDesc = 'Direct sunshine (NWS notes direct sun can increase effective heat sensation by up to +15°F)';
    if (!isDaylight) {
      shadeDesc = 'Nighttime Assessment: Direct solar radiation is absent after sunset.';
    } else if (input.shadeAvailability === 'full_shade') {
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

    // 5. Calibrated HeatShield 0-100 Presentation Score Model
    let baseScore = 5.0;
    if (heatIndexF <= 70) {
      baseScore = 5.0;
    } else if (heatIndexF < 80) {
      baseScore = 5.0 + ((heatIndexF - 70) / 10) * 20.0;
    } else if (heatIndexF < 90) {
      baseScore = 26.0 + ((heatIndexF - 80) / 10) * 24.0;
    } else if (heatIndexF < 103) {
      baseScore = 51.0 + ((heatIndexF - 90) / 13) * 24.0;
    } else {
      baseScore = Math.min(95, 76.0 + ((heatIndexF - 103) / 20) * 19.0);
    }

    const activityBonus = input.activity === 'running' || input.activity === 'outdoor_work' ? 8 : input.activity === 'cycling' ? 3 : 0;
    const durationBonus = input.durationMinutes > 120 ? 7 : input.durationMinutes > 60 ? 4 : input.durationMinutes < 30 ? -2 : 0;
    
    // At night, direct solar radiation bonus is zero
    const sunBonus = !isDaylight ? 0 : input.shadeAvailability === 'direct_sun' ? 5 : input.shadeAvailability === 'partial_shade' ? 0 : -5;

    const presentationScore = Math.min(99, Math.max(5, Math.round(baseScore + activityBonus + durationBonus + sunBonus)));

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
        factor: `Solar Exposure (${!isDaylight ? 'Nighttime' : input.shadeAvailability.replace('_', ' ')})`,
        impact: !isDaylight ? 'Low' : input.shadeAvailability === 'direct_sun' ? 'High' : 'Low',
        description: shadeDesc
      }
    ];

    const demoNotice = weather.isDemo
      ? 'Demo Telemetry Mode: Uses simulated weather data with official NOAA NWS Heat Index standard calculation.'
      : `Live Weather Provider: OpenWeather API (${weather.dataSourceStatus})`;

    return {
      score: presentationScore,
      level,
      levelColor,
      summary,
      contributingFactors,
      uncertaintyScore: 14,
      calculatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      disclaimer: 'Calculated using NOAA National Weather Service Heat Index standard equation. HeatShield risk levels and 0-100 score are UI presentation metrics, not an official medical diagnosis or probability of illness.',
      demoNotice,
      modelVersion: 'v1.1-noaa-nws',
      metricType: 'noaa_heat_index',
      weatherSnapshot: weather,
      heatIndexC,
      heatIndexF,
      calculationMethod: 'NOAA NWS Rothfusz Heat Index Equation'
    };
  }

  async calculateOvernightSummary(lat: number, lon: number): Promise<any> {
    const backendSummary = await weatherService.getOvernightForecast(lat, lon);
    if (backendSummary && backendSummary.slots) {
      return backendSummary;
    }

    const forecasts = await weatherService.getForecastByCoords(lat, lon);
    const slots = (forecasts.length > 0 ? forecasts : [
      { timestamp: 'Today 20:00', temperatureC: 31.2, humidityPercent: 56, conditionText: 'Evening Warm' },
      { timestamp: 'Today 23:00', temperatureC: 29.4, humidityPercent: 62, conditionText: 'Late Night Mild' },
      { timestamp: 'Tomorrow 02:00', temperatureC: 27.8, humidityPercent: 68, conditionText: 'Overnight Cooling' },
      { timestamp: 'Tomorrow 05:00', temperatureC: 26.7, humidityPercent: 72, conditionText: 'Pre-dawn Minimum' },
      { timestamp: 'Tomorrow 08:00', temperatureC: 30.0, humidityPercent: 60, conditionText: 'Early Morning Sunrise' }
    ]).map((fc) => {
      const isDay = isDaylightTime(fc.timestamp, lat, lon);
      const hi = calculateNOAAHeatIndex(fc.temperatureC, fc.humidityPercent);
      
      let baseScore = 5.0;
      if (hi.heatIndexF <= 70) baseScore = 5.0;
      else if (hi.heatIndexF < 80) baseScore = 5.0 + ((hi.heatIndexF - 70) / 10) * 20.0;
      else if (hi.heatIndexF < 90) baseScore = 26.0 + ((hi.heatIndexF - 80) / 10) * 24.0;
      else if (hi.heatIndexF < 103) baseScore = 51.0 + ((hi.heatIndexF - 90) / 13) * 24.0;
      else baseScore = Math.min(95, 76.0 + ((hi.heatIndexF - 103) / 20) * 19.0);

      const score = Math.min(99, Math.max(5, Math.round(baseScore + (isDay ? 5 : 0))));
      const riskLevel: RiskLevel = hi.heatIndexF >= 103 ? 'Extreme' : hi.heatIndexF >= 90 ? 'High' : hi.heatIndexF >= 80 ? 'Moderate' : 'Low';

      return {
        timeLabel: fc.timestamp,
        timestamp: fc.timestamp,
        temperatureC: fc.temperatureC,
        humidityPercent: fc.humidityPercent,
        heatIndexC: hi.heatIndexC,
        heatIndexF: hi.heatIndexF,
        riskLevel,
        score,
        isDaylight: isDay,
        weatherSource: 'demo_simulated',
        dataSourceStatus: 'demo_simulated',
        conditionText: fc.conditionText || 'Clear'
      };
    });

    const minSlot = [...slots].sort((a, b) => a.temperatureC - b.temperatureC)[0];
    const maxSlot = [...slots].sort((a, b) => b.temperatureC - a.temperatureC)[0];
    const peakHI = [...slots].sort((a, b) => b.heatIndexF - a.heatIndexF)[0];
    const peakRisk = [...slots].sort((a, b) => b.score - a.score)[0];

    const tempDiff = slots[slots.length - 1].temperatureC - slots[0].temperatureC;
    let trend = 'stable';
    let trendDesc = 'Broadly Stable: Overnight temperatures remain relatively steady.';
    if (tempDiff <= -2.5) {
      trend = 'decreasing';
      trendDesc = 'Overnight Cooling: Temperatures drop gradually towards pre-dawn hours.';
    } else if (tempDiff >= 2.5) {
      trend = 'increasing';
      trendDesc = 'Overnight Warming: Ambient temperatures increase through morning hours.';
    } else if (minSlot.temperatureC >= 28) {
      trend = 'persistently_hot';
      trendDesc = 'Persistently Hot Night: High ambient heat & humidity persist all night.';
    }

    return {
      minTempC: minSlot.temperatureC,
      minTempTime: minSlot.timeLabel,
      maxTempC: maxSlot.temperatureC,
      maxTempTime: maxSlot.timeLabel,
      peakHeatIndexC: peakHI.heatIndexC,
      peakHeatIndexF: peakHI.heatIndexF,
      peakHeatIndexTime: peakHI.timeLabel,
      peakRiskScore: peakRisk.score,
      peakRiskLevel: peakRisk.riskLevel,
      peakRiskTime: peakRisk.timeLabel,
      trend,
      trendDescription: trendDesc,
      resolutionText: '3-hour forecast intervals (OpenWeather resolution)',
      practicalAdvice: [
        `Pre-dawn hours (${minSlot.timeLabel}) provide the coolest window (${minSlot.temperatureC}°C) for outdoor movement.`,
        'Maintain indoor ventilation or fan circulation; nighttime humidity limits natural evaporative body cooling.',
        `Peak overnight heat index occurs at ${peakHI.timeLabel} (${peakHI.heatIndexC}°C / ${peakHI.heatIndexF}°F).`
      ],
      slots,
      isDemo: true,
      dataSourceStatus: 'demo_simulated'
    };
  }
}

export const heatRiskService = new DeterministicHeatRiskService();

