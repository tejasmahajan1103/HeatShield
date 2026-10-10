import type { WeatherData } from '../types';
import { SAMPLE_WEATHER_DATA } from '../data/sampleWeather';

export interface WeatherService {
  getCurrentWeather(location: string): Promise<WeatherData>;
}

export class MockWeatherService implements WeatherService {
  async getCurrentWeather(location: string): Promise<WeatherData> {
    const locLower = (location || '').trim().toLowerCase();
    let tempC = 37.8;
    let humidity = 62;
    let wetBulb = 29.2;
    let uv = 9.4;

    if (locLower.includes('delhi') || locLower.includes('north')) {
      tempC = 41.5;
      humidity = 48;
      wetBulb = 30.5;
      uv = 10.2;
    } else if (locLower.includes('mumbai') || locLower.includes('coastal')) {
      tempC = 34.2;
      humidity = 82;
      wetBulb = 31.0;
      uv = 8.8;
    } else if (locLower.includes('park') || locLower.includes('garden')) {
      tempC = 35.0;
      humidity = 58;
      wetBulb = 27.5;
      uv = 8.0;
    }

    return {
      ...SAMPLE_WEATHER_DATA,
      locationName: location || SAMPLE_WEATHER_DATA.locationName,
      temperatureC: Number(tempC.toFixed(1)),
      humidityPercent: Math.round(humidity),
      wetBulbTempC: Number(wetBulb.toFixed(1)),
      uvIndex: Number(uv.toFixed(1)),
      isDemo: true,
      dataSourceStatus: 'demo_simulated',
      fetchedAt: new Date().toISOString()
    };
  }
}

export class HybridWeatherService implements WeatherService {
  private mockService = new MockWeatherService();
  private getApiUrl(): string {
    const customBase = (import.meta.env?.VITE_API_BASE_URL as string) || (import.meta.env?.VITE_WEATHER_API_URL as string);
    if (customBase) {
      const cleanBase = customBase.replace(/\/+$/, '');
      return cleanBase.endsWith('/api/weather') ? cleanBase : `${cleanBase}/api/weather`;
    }
    return 'http://127.0.0.1:8000/api/weather';
  }

  async getCurrentWeather(location: string): Promise<WeatherData> {
    if (!location || !location.trim()) {
      throw new Error('Invalid location: A location name is required.');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const baseUrl = this.getApiUrl();
      const queryUrl = `${baseUrl}?location=${encodeURIComponent(location.trim())}`;
      
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
          fetchedAt: data.fetchedAt || new Date().toISOString()
        };
      }
    } catch {
      // Backend API server not reachable or network failure -> Fall back to simulated mock data
    }

    return this.mockService.getCurrentWeather(location);
  }
}

export const weatherService = new HybridWeatherService();

