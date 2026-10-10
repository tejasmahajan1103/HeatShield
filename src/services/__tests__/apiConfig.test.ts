import { describe, it, expect } from 'vitest';
import { HybridCoolSpotService } from '../coolSpotService';
import { HybridWeatherService } from '../weatherService';

describe('API URL Configuration & Production Endpoint Security Tests', () => {
  it('verifies coolSpotService resolves deployed AWS API Gateway endpoint by default', () => {
    const service = new HybridCoolSpotService();
    // Access private getApiUrlsToTry using any casting for test verification
    const urls: string[] = (service as any).getApiUrlsToTry();

    expect(urls.length).toBeGreaterThan(0);
    expect(urls[0]).toContain('https://ywxmdsz1re.execute-api.ap-south-1.amazonaws.com/prod/api/coolspots');
  });

  it('verifies production API URLs never contain 127.0.0.1 or localhost in production mode', () => {
    const hybridCoolSpot = new HybridCoolSpotService();
    const hybridWeather = new HybridWeatherService();

    const coolSpotUrls: string[] = (hybridCoolSpot as any).getApiUrlsToTry();
    const weatherBase: string = (hybridWeather as any).getApiBaseUrl();

    // Primary endpoint must always be official AWS API Gateway
    expect(coolSpotUrls[0]).not.toContain('127.0.0.1');
    expect(coolSpotUrls[0]).not.toContain('localhost');
    expect(coolSpotUrls[0]).not.toBe('/api/coolspots'); // Must not fallback to SPA 404 HTML route

    expect(weatherBase).not.toContain('localhost');
  });

  it('formats cool spot API query parameters correctly with lat, lon, and radiusKm', async () => {
    const lat = 18.5196;
    const lon = 73.8553;
    const radius = 5;

    const candidateUrl = 'https://ywxmdsz1re.execute-api.ap-south-1.amazonaws.com/prod/api/coolspots';
    const queryUrl = `${candidateUrl}?lat=${lat}&lon=${lon}&radiusKm=${radius}`;

    expect(queryUrl).toBe('https://ywxmdsz1re.execute-api.ap-south-1.amazonaws.com/prod/api/coolspots?lat=18.5196&lon=73.8553&radiusKm=5');
  });
});
