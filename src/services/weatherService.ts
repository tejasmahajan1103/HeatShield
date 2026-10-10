import type { WeatherData, ForecastDataPoint } from '../types';
import { SAMPLE_WEATHER_DATA } from '../data/sampleWeather';

export interface WeatherService {
  getCurrentWeather(location: string, coords?: { latitude: number; longitude: number }): Promise<WeatherData>;
  getCurrentWeatherByCoords(lat: number, lon: number): Promise<WeatherData>;
  getForecast(location: string): Promise<ForecastDataPoint[]>;
  getForecastByCoords(lat: number, lon: number): Promise<ForecastDataPoint[]>;
}

export class MockWeatherService implements WeatherService {
  async getCurrentWeather(location: string, coords?: { latitude: number; longitude: number }): Promise<WeatherData> {
    const locLower = (location || '').trim().toLowerCase();

    let lat = coords?.latitude ?? 12.9716;
    let lon = coords?.longitude ?? 77.5946;

    // Coordinate & location-aware variation (prevents identical values)
    const latVar = Math.sin(lat * 0.15) * 2.5;
    const lonVar = Math.cos(lon * 0.15) * 2.0;

    let tempC = Number((31.2 + latVar).toFixed(1));
    let humidity = Math.round(Math.max(35, Math.min(85, 56 + lonVar * 4.0)));
    let wetBulb = Number((tempC * 0.72 + humidity * 0.1).toFixed(1));
    let uv = Number(Math.max(4, Math.min(11, 7.5 + latVar)).toFixed(1));

    if (locLower.includes('delhi') || locLower.includes('north')) {
      tempC = 38.5;
      humidity = 42;
      wetBulb = 28.5;
      uv = 9.8;
    } else if (locLower.includes('mumbai') || locLower.includes('coastal')) {
      tempC = 33.2;
      humidity = 78;
      wetBulb = 29.5;
      uv = 8.2;
    } else if (locLower.includes('park') || locLower.includes('garden')) {
      tempC = 29.8;
      humidity = 54;
      wetBulb = 23.5;
      uv = 7.0;
    }

    return {
      ...SAMPLE_WEATHER_DATA,
      locationName: location || SAMPLE_WEATHER_DATA.locationName,
      temperatureC: tempC,
      humidityPercent: humidity,
      wetBulbTempC: wetBulb,
      uvIndex: uv,
      isDemo: true,
      dataSourceStatus: 'demo_simulated',
      fetchedAt: new Date().toISOString(),
      observationTime: new Date().toISOString(),
      latitude: lat,
      longitude: lon
    };
  }

  async getCurrentWeatherByCoords(lat: number, lon: number): Promise<WeatherData> {
    return this.getCurrentWeather(`GPS (${lat.toFixed(4)}, ${lon.toFixed(4)})`, { latitude: lat, longitude: lon });
  }

  async getForecast(location: string): Promise<ForecastDataPoint[]> {
    const current = await this.getCurrentWeather(location);
    const t = current.temperatureC;
    const h = current.humidityPercent;

    return [
      { timestamp: 'Today +1h', temperatureC: Number((t + 0.4).toFixed(1)), humidityPercent: Math.max(30, h - 2), conditionText: 'Partly Sunny' },
      { timestamp: 'Today +3h', temperatureC: Number((t + 1.2).toFixed(1)), humidityPercent: Math.max(30, h - 5), conditionText: 'Warm / Clear' },
      { timestamp: 'Today +6h', temperatureC: Number((t - 1.5).toFixed(1)), humidityPercent: Math.min(90, h + 6), conditionText: 'Clear / Evening' },
      { timestamp: 'Today +9h', temperatureC: Number((t - 3.2).toFixed(1)), humidityPercent: Math.min(90, h + 10), conditionText: 'Nighttime Mild' },
    ];
  }

  async getForecastByCoords(lat: number, lon: number): Promise<ForecastDataPoint[]> {
    return this.getForecast(`GPS (${lat.toFixed(4)}, ${lon.toFixed(4)})`);
  }
}

export class HybridWeatherService implements WeatherService {
  private mockService = new MockWeatherService();

  private getApiBaseUrl(): string {
    const customBase = (import.meta.env?.VITE_API_BASE_URL as string) || (import.meta.env?.VITE_WEATHER_API_URL as string);
    if (customBase) {
      const cleanBase = customBase.replace(/\/+$/, '');
      if (cleanBase.endsWith('/api/weather')) {
        return cleanBase.replace(/\/weather$/, '');
      }
      return cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`;
    }
    return 'http://127.0.0.1:8000/api';
  }

  async getCurrentWeatherByCoords(lat: number, lon: number): Promise<WeatherData> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const apiBase = this.getApiBaseUrl();
      const queryUrl = `${apiBase}/weather?lat=${lat}&lon=${lon}&demo=true`;
      
      const response = await fetch(queryUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return {
          locationName: data.locationName || `GPS (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
          temperatureC: Number(data.temperatureC),
          humidityPercent: Number(data.humidityPercent),
          uvIndex: Number(data.uvIndex || 0),
          wetBulbTempC: Number(data.wetBulbTempC || 0),
          windSpeedKmh: Number(data.windSpeedKmh || 0),
          conditionText: data.conditionText || 'Clear',
          isDemo: Boolean(data.isDemo),
          dataSourceStatus: data.dataSourceStatus || 'live_sensor',
          fetchedAt: data.fetchedAt || new Date().toISOString(),
          observationTime: data.observationTime || data.fetchedAt || new Date().toISOString(),
          latitude: data.latitude ?? lat,
          longitude: data.longitude ?? lon
        };
      }
    } catch {
      // Fallback to mock service if API endpoint unreachable
    }

    return this.mockService.getCurrentWeatherByCoords(lat, lon);
  }

  async getCurrentWeather(location: string, coords?: { latitude: number; longitude: number }): Promise<WeatherData> {
    if (coords && coords.latitude !== undefined && coords.longitude !== undefined) {
      return this.getCurrentWeatherByCoords(coords.latitude, coords.longitude);
    }

    if (!location || !location.trim()) {
      throw new Error('Invalid location: A location name is required.');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const apiBase = this.getApiBaseUrl();
      const queryUrl = `${apiBase}/weather?location=${encodeURIComponent(location.trim())}&demo=true`;
      
      const response = await fetch(queryUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return {
          locationName: data.locationName || location,
          temperatureC: Number(data.temperatureC),
          humidityPercent: Number(data.humidityPercent),
          uvIndex: Number(data.uvIndex || 0),
          wetBulbTempC: Number(data.wetBulbTempC || 0),
          windSpeedKmh: Number(data.windSpeedKmh || 0),
          conditionText: data.conditionText || 'Clear',
          isDemo: Boolean(data.isDemo),
          dataSourceStatus: data.dataSourceStatus || 'live_sensor',
          fetchedAt: data.fetchedAt || new Date().toISOString(),
          observationTime: data.observationTime || data.fetchedAt || new Date().toISOString(),
          latitude: data.latitude,
          longitude: data.longitude
        };
      }
    } catch {
      // Fallback
    }

    return this.mockService.getCurrentWeather(location, coords);
  }

  async getForecastByCoords(lat: number, lon: number): Promise<ForecastDataPoint[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const apiBase = this.getApiBaseUrl();
      const queryUrl = `${apiBase}/forecast?lat=${lat}&lon=${lon}&demo=true`;

      const response = await fetch(queryUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((item: any) => ({
            timestamp: item.timestamp,
            temperatureC: Number(item.temperatureC),
            humidityPercent: Number(item.humidityPercent),
            conditionText: item.conditionText || 'Clear'
          }));
        }
      }
    } catch {
      // Fallback
    }

    return this.mockService.getForecastByCoords(lat, lon);
  }

  async getForecast(location: string): Promise<ForecastDataPoint[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const apiBase = this.getApiBaseUrl();
      const queryUrl = `${apiBase}/forecast?location=${encodeURIComponent(location.trim())}&demo=true`;

      const response = await fetch(queryUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((item: any) => ({
            timestamp: item.timestamp,
            temperatureC: Number(item.temperatureC),
            humidityPercent: Number(item.humidityPercent),
            conditionText: item.conditionText || 'Clear'
          }));
        }
      }
    } catch {
      // Fallback
    }

    return this.mockService.getForecast(location);
  }

  async getOvernightForecast(lat: number, lon: number): Promise<any> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const apiBase = this.getApiBaseUrl();
      const queryUrl = `${apiBase}/overnight-forecast?lat=${lat}&lon=${lon}&demo=true`;

      const response = await fetch(queryUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fallback
    }

    return null;
  }
}

export const weatherService = new HybridWeatherService();

