export type ActivityType = 'walking' | 'cycling' | 'running' | 'outdoor_work' | 'other';
export type ShadeOption = 'direct_sun' | 'partial_shade' | 'full_shade';
export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Extreme';
export type CoolSpotCategory = 'park' | 'indoor_public' | 'water_point' | 'cooling_center' | 'temple';

export interface WeatherData {
  locationName: string;
  temperatureC: number;
  humidityPercent: number;
  uvIndex: number;
  wetBulbTempC: number;
  windSpeedKmh: number;
  conditionText: string;
  isDemo: boolean;
  dataSourceStatus: 'demo_simulated' | 'live_sensor' | 'error_fallback';
  fetchedAt: string;
  observationTime?: string;
  latitude?: number;
  longitude?: number;
}

export interface ForecastDataPoint {
  timestamp: string;
  temperatureC: number;
  humidityPercent: number;
  conditionText?: string;
}

export interface GeocodedLocation {
  id: string;
  displayName: string;
  name: string;
  latitude: number;
  longitude: number;
  category?: string;
  type?: string;
}

export interface RouteSegmentExposure {
  segmentName: string;
  estimatedTime: string;
  latitude: number;
  longitude: number;
  temperatureC: number;
  humidityPercent: number;
  heatIndexC: number;
  heatIndexF: number;
  riskLevel: RiskLevel;
  weatherSource: 'measured_live' | 'forecast' | 'demo_simulated' | 'forecast_unavailable' | 'estimated_route_segment';
  weatherStatusMessage?: string;
}


export interface RouteInfo {
  startLocation: { name: string; latitude: number; longitude: number };
  destinationLocation: { name: string; latitude: number; longitude: number };
  distanceKm: number;
  durationMinutes: number;
  routeEtaMinutes: number;
  implausibleDurationWarning?: string;
  geometry: [number, number][];
  segmentExposures: RouteSegmentExposure[];
  peakSegmentExposure?: RouteSegmentExposure;
  isSampleData: boolean;
  routingMode: 'driving' | 'walking' | 'cycling' | 'running';
  providerName: string;
}

export interface DestinationState {
  name: string;
  latitude: number;
  longitude: number;
}

export interface HeatRiskInput {
  location: string;
  activity: ActivityType;
  activityLabel?: string;
  plannedTime: string; // e.g. "14:30"
  durationMinutes: number;
  shadeAvailability: ShadeOption;
  latitude?: number;
  longitude?: number;
  destination?: DestinationState | null;
  route?: RouteInfo | null;
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
  uncertaintyScore: number; // percentage (e.g. 14%)
  calculatedAt: string;
  disclaimer: string;
  demoNotice: string;
  modelVersion: string;
  metricType: 'noaa_heat_index' | 'heuristic_proxy' | 'validated_wbgt';
  weatherSnapshot: WeatherData;
  heatIndexC?: number;
  heatIndexF?: number;
  calculationMethod?: string;
  routeInfo?: RouteInfo | null;
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
  isSampleData: boolean;
}

export interface AlternativeTimeWindow {
  timeWindow: string;
  expectedTempC?: number;
  expectedRiskLevel?: RiskLevel;
  reason: string;
  forecastAvailable: boolean;
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
  suggestedAlternativeTime?: AlternativeTimeWindow;
  disclaimer: string;
}

export interface UserSettings {
  preferredTempUnit: 'C' | 'F';
  preferredDistanceUnit: 'km' | 'miles';
  defaultActivity: ActivityType;
  alertsEnabled: boolean;
  darkTheme: boolean;
  offlineMode: boolean;
}

export interface OvernightRiskSlot {
  timeLabel: string;
  timestamp: string;
  temperatureC: number;
  humidityPercent: number;
  heatIndexC: number;
  heatIndexF: number;
  riskLevel: RiskLevel;
  score: number;
  isDaylight: boolean;
  weatherSource: string;
  dataSourceStatus: string;
  conditionText: string;
}

export interface OvernightForecastSummary {
  minTempC: number;
  minTempTime: string;
  maxTempC: number;
  maxTempTime: string;
  peakHeatIndexC: number;
  peakHeatIndexF: number;
  peakHeatIndexTime: string;
  peakRiskScore: number;
  peakRiskLevel: RiskLevel;
  peakRiskTime: string;
  trend: 'decreasing' | 'increasing' | 'stable' | 'persistently_hot';
  trendDescription: string;
  resolutionText: string;
  practicalAdvice: string[];
  slots: OvernightRiskSlot[];
  isDemo: boolean;
  dataSourceStatus: string;
}

