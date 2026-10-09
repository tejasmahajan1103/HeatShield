import type { WeatherData } from '../types';

export const SAMPLE_WEATHER_DATA: WeatherData = {
  locationName: 'Bengaluru Central District',
  temperatureC: 37.8,
  humidityPercent: 62,
  uvIndex: 9.4,
  wetBulbTempC: 29.2,
  windSpeedKmh: 8.5,
  conditionText: 'Hot & Humid with High Thermal Stress',
  isDemo: true,
  fetchedAt: new Date().toISOString()
};
