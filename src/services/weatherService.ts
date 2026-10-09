import type { WeatherData } from '../types';
import { SAMPLE_WEATHER_DATA } from '../data/sampleWeather';

export interface WeatherService {
  getCurrentWeather(location: string): Promise<WeatherData>;
}

export class MockWeatherService implements WeatherService {
  async getCurrentWeather(location: string): Promise<WeatherData> {
    const locLower = location.trim().toLowerCase();
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
      fetchedAt: new Date().toISOString()
    };
  }
}

export const weatherService = new MockWeatherService();
