import type { ActivityType, RouteInfo, RouteSegmentExposure, WeatherData } from '../types';
import { calculateHaversineDistance } from './coolSpotService';
import { calculateNOAAHeatIndex } from './heatRiskService';
import { weatherService } from './weatherService';

export interface RoutingService {
  calculateRoute(
    start: { latitude: number; longitude: number; name?: string },
    destination: { latitude: number; longitude: number; name?: string },
    activity?: ActivityType,
    plannedTime?: string,
    signal?: AbortSignal
  ): Promise<RouteInfo>;
}

export function getActivitySpeedKmh(activity?: ActivityType): number {
  switch (activity) {
    case 'running':
      return 10.0;
    case 'cycling':
      return 18.0;
    case 'walking':
    case 'outdoor_work':
    case 'other':
    default:
      return 4.5;
  }
}

export function addMinutesToTimeString(timeStr: string, minutesToAdd: number): string {
  if (!timeStr || !timeStr.includes(':')) return '14:30';
  const [h, m] = timeStr.split(':').map(Number);
  const totalMins = (h * 60 + m + Math.round(minutesToAdd)) % (24 * 60);
  const newH = Math.floor(totalMins / 60);
  const newM = totalMins % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

export class HybridRoutingService implements RoutingService {
  private routeCache = new Map<string, RouteInfo>();

  async calculateRoute(
    start: { latitude: number; longitude: number; name?: string },
    destination: { latitude: number; longitude: number; name?: string },
    activity: ActivityType = 'walking',
    plannedTime: string = '14:30',
    signal?: AbortSignal
  ): Promise<RouteInfo> {
    if (signal?.aborted) {
      throw new Error('Route calculation cancelled by user.');
    }

    const startName = start.name || `Start (${start.latitude.toFixed(3)}, ${start.longitude.toFixed(3)})`;
    const destName = destination.name || `Destination (${destination.latitude.toFixed(3)}, ${destination.longitude.toFixed(3)})`;

    // Cache lookup
    const cacheKey = `${start.latitude.toFixed(4)},${start.longitude.toFixed(4)}-${destination.latitude.toFixed(4)},${destination.longitude.toFixed(4)}-${activity}-${plannedTime}`;
    if (this.routeCache.has(cacheKey)) {
      return this.routeCache.get(cacheKey)!;
    }

    let distanceKm = calculateHaversineDistance(start.latitude, start.longitude, destination.latitude, destination.longitude);
    let geometry: [number, number][] = [
      [start.latitude, start.longitude],
      [destination.latitude, destination.longitude]
    ];
    let isSampleData = false;
    let providerName = 'OSRM OpenStreetMap Router';

    // Try fetching real route geometry & distance from OSRM via HTTPS
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      if (signal) {
        signal.addEventListener('abort', () => controller.abort());
      }

      const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          distanceKm = Number((route.distance / 1000).toFixed(2));
          if (route.geometry && Array.isArray(route.geometry.coordinates)) {
            geometry = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
          }
        }
      } else {
        isSampleData = true;
        providerName = 'Haversine Great-Circle Fallback';
      }
    } catch {
      isSampleData = true;
      providerName = 'Haversine Great-Circle Fallback';
      const midLat = (start.latitude + destination.latitude) / 2 + 0.005;
      const midLon = (start.longitude + destination.longitude) / 2 + 0.005;
      geometry = [
        [start.latitude, start.longitude],
        [midLat, midLon],
        [destination.latitude, destination.longitude]
      ];
    }

    if (signal?.aborted) {
      throw new Error('Route calculation cancelled by user.');
    }

    // Calculate Travel Mode ETA
    const speedKmh = getActivitySpeedKmh(activity);
    const routeEtaMinutes = Math.max(5, Math.round((distanceKm / speedKmh) * 60));
    const userPlannedDuration = Math.min(routeEtaMinutes, 120);

    let implausibleDurationWarning: string | undefined = undefined;
    if (routeEtaMinutes > 180 && (activity === 'walking' || activity === 'running')) {
      const hours = Math.floor(routeEtaMinutes / 60);
      const mins = routeEtaMinutes % 60;
      implausibleDurationWarning = `Long journey duration for ${activity} (${hours}h ${mins}m for ${distanceKm} km). Consider motorized transport or shaded rest stops.`;
    }

    // Sample midpoint coordinate along route geometry
    const midIdx = Math.floor(geometry.length / 2);
    const midPoint = geometry[midIdx] || [(start.latitude + destination.latitude) / 2, (start.longitude + destination.longitude) / 2];

    // Calculate segment arrival times
    const departureTime = plannedTime;
    const midTime = addMinutesToTimeString(plannedTime, routeEtaMinutes / 2);
    const arrivalTime = addMinutesToTimeString(plannedTime, routeEtaMinutes);

    // Fetch segment weather & forecast data
    const [startWeatherRes, midForecastRes, destForecastRes] = await Promise.allSettled([
      weatherService.getCurrentWeatherByCoords(start.latitude, start.longitude),
      weatherService.getForecastByCoords(midPoint[0], midPoint[1]),
      weatherService.getForecastByCoords(destination.latitude, destination.longitude)
    ]);

    const defaultFallbackWeather = (name: string): WeatherData => ({
      locationName: name,
      temperatureC: 31.0,
      humidityPercent: 55,
      uvIndex: 6,
      wetBulbTempC: 24.5,
      windSpeedKmh: 12,
      conditionText: 'Partly Cloudy',
      isDemo: true,
      dataSourceStatus: 'demo_simulated',
      fetchedAt: new Date().toISOString()
    });

    const startWeather: WeatherData = startWeatherRes.status === 'fulfilled'
      ? startWeatherRes.value
      : defaultFallbackWeather(startName);

    // Process Midpoint Forecast
    let midTemp = startWeather.temperatureC;
    let midHumidity = startWeather.humidityPercent;
    let midSource: RouteSegmentExposure['weatherSource'] = startWeather.isDemo ? 'demo_simulated' : 'forecast';
    let midStatusMsg: string | undefined = undefined;

    if (midForecastRes.status === 'fulfilled' && midForecastRes.value.length > 0) {
      const fc = midForecastRes.value[0];
      midTemp = fc.temperatureC;
      midHumidity = fc.humidityPercent;
    } else {
      midSource = 'forecast_unavailable';
      midStatusMsg = 'Genuine forecast unavailable; segment data estimated.';
    }

    // Process Destination Forecast
    let destTemp = startWeather.temperatureC;
    let destHumidity = startWeather.humidityPercent;
    let destSource: RouteSegmentExposure['weatherSource'] = startWeather.isDemo ? 'demo_simulated' : 'forecast';
    let destStatusMsg: string | undefined = undefined;

    if (destForecastRes.status === 'fulfilled' && destForecastRes.value.length > 0) {
      const fc = destForecastRes.value.length > 1 ? destForecastRes.value[1] : destForecastRes.value[0];
      destTemp = fc.temperatureC;
      destHumidity = fc.humidityPercent;
    } else {
      destSource = 'forecast_unavailable';
      destStatusMsg = 'Genuine forecast unavailable; segment data estimated.';
    }

    // Check night-time for arrival segment
    const arrivalHour = parseInt(arrivalTime.split(':')[0], 10);
    const isNightTime = arrivalHour >= 19 || arrivalHour < 6;

    const startHI = calculateNOAAHeatIndex(startWeather.temperatureC, startWeather.humidityPercent);
    const midHI = calculateNOAAHeatIndex(midTemp, midHumidity);
    const destHI = calculateNOAAHeatIndex(destTemp, destHumidity);

    const startSource: RouteSegmentExposure['weatherSource'] = startWeather.isDemo ? 'demo_simulated' : 'measured_live';

    const segmentExposures: RouteSegmentExposure[] = [
      {
        segmentName: `Departure (${startName.split(',')[0]})`,
        estimatedTime: departureTime,
        latitude: start.latitude,
        longitude: start.longitude,
        temperatureC: startWeather.temperatureC,
        humidityPercent: startWeather.humidityPercent,
        heatIndexC: startHI.heatIndexC,
        heatIndexF: startHI.heatIndexF,
        riskLevel: startHI.heatIndexF >= 103 ? 'Extreme' : startHI.heatIndexF >= 90 ? 'High' : startHI.heatIndexF >= 80 ? 'Moderate' : 'Low',
        weatherSource: startSource,
        weatherStatusMessage: startWeather.isDemo ? 'Simulated Departure Telemetry' : 'Measured Current Weather'
      },
      {
        segmentName: 'En-Route Midpoint',
        estimatedTime: midTime,
        latitude: midPoint[0],
        longitude: midPoint[1],
        temperatureC: midTemp,
        humidityPercent: midHumidity,
        heatIndexC: midHI.heatIndexC,
        heatIndexF: midHI.heatIndexF,
        riskLevel: midHI.heatIndexF >= 103 ? 'Extreme' : midHI.heatIndexF >= 90 ? 'High' : midHI.heatIndexF >= 80 ? 'Moderate' : 'Low',
        weatherSource: midSource,
        weatherStatusMessage: midStatusMsg || (midSource === 'demo_simulated' ? 'Simulated Segment Forecast' : 'Segment Arrival Forecast')
      },
      {
        segmentName: `Destination Arrival (${destName.split(',')[0]})`,
        estimatedTime: arrivalTime,
        latitude: destination.latitude,
        longitude: destination.longitude,
        temperatureC: destTemp,
        humidityPercent: destHumidity,
        heatIndexC: destHI.heatIndexC,
        heatIndexF: destHI.heatIndexF,
        riskLevel: destHI.heatIndexF >= 103 ? 'Extreme' : destHI.heatIndexF >= 90 ? 'High' : destHI.heatIndexF >= 80 ? 'Moderate' : 'Low',
        weatherSource: destSource,
        weatherStatusMessage: destStatusMsg || (destSource === 'demo_simulated' ? 'Simulated Segment Forecast' : 'Segment Arrival Forecast')
      }
    ];


    if (isNightTime && segmentExposures[2]) {
      segmentExposures[2].segmentName += ' (Nighttime Arrival)';
    }

    const peakSegmentExposure = [...segmentExposures].sort((a, b) => b.heatIndexF - a.heatIndexF)[0];

    const routeResult: RouteInfo = {
      startLocation: { name: startName, latitude: start.latitude, longitude: start.longitude },
      destinationLocation: { name: destName, latitude: destination.latitude, longitude: destination.longitude },
      distanceKm,
      durationMinutes: userPlannedDuration,
      routeEtaMinutes,
      implausibleDurationWarning,
      geometry,
      segmentExposures,
      peakSegmentExposure,
      isSampleData,
      routingMode: (activity === 'cycling' ? 'cycling' : activity === 'running' ? 'running' : 'walking'),
      providerName
    };

    // Cache result
    this.routeCache.set(cacheKey, routeResult);
    return routeResult;
  }
}

export const routingService = new HybridRoutingService();
