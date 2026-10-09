export type ActivityType = 'walking' | 'cycling' | 'running' | 'outdoor_work' | 'other';
export type ShadeOption = 'direct_sun' | 'partial_shade' | 'full_shade';
export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Extreme';
export type CoolSpotCategory = 'park' | 'indoor_public' | 'water_point' | 'cooling_center';

export interface WeatherData {
  locationName: string;
  temperatureC: number;
  humidityPercent: number;
  uvIndex: number;
  wetBulbTempC: number;
  windSpeedKmh: number;
  conditionText: string;
  isDemo: boolean;
  fetchedAt: string;
}

export interface HeatRiskInput {
  location: string;
  activity: ActivityType;
  activityLabel?: string;
  plannedTime: string; // e.g. "14:30"
  durationMinutes: number;
  shadeAvailability: ShadeOption;
}

export interface ContributingFactor {
  factor: string;
  impact: 'High' | 'Medium' | 'Low';
  description: string;
}

export interface HeatRiskResult {
  score: number; // 0 to 100
  level: RiskLevel;
  levelColor: string;
  summary: string;
  contributingFactors: ContributingFactor[];
  uncertaintyScore: number; // percentage (e.g. 15%)
  calculatedAt: string;
  disclaimer: string;
  demoNotice: string;
  weatherSnapshot: WeatherData;
}

export interface CoolSpot {
  id: string;
  name: string;
  category: CoolSpotCategory;
  categoryLabel: string;
  distanceKm: number;
  latitude: number;
  longitude: number;
  isIndoor: boolean;
  shadeVerified: boolean;
  waterVerified: boolean;
  openStatusVerified: boolean;
  isOpenNow: boolean;
  operatingHours: string;
  lastVerifiedTimestamp: string;
  description: string;
  address: string;
  amenities: string[];
}

export interface Recommendation {
  riskScore: number;
  riskLevel: RiskLevel;
  primaryAdvice: string[];
  hydrationGuidance: string;
  activityModification: string;
  restInterval: string;
  emergencySigns: string[];
  suggestedCoolSpots: CoolSpot[];
  suggestedAlternativeTime?: {
    timeWindow: string;
    expectedTempC: number;
    expectedRiskLevel: RiskLevel;
    reason: string;
  };
}

export interface AssessmentRecord {
  id: string;
  date: string;
  input: HeatRiskInput;
  result: HeatRiskResult;
  isDemo: boolean;
}

export interface UserSettings {
  preferredTempUnit: 'C' | 'F';
  preferredDistanceUnit: 'km' | 'miles';
  defaultActivity: ActivityType;
  alertsEnabled: boolean;
  darkTheme: boolean;
  offlineMode: boolean;
}
