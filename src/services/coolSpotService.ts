import type { CoolSpot, CoolSpotCategory, RouteInfo } from '../types';
import { SAMPLE_COOLSPOTS } from '../data/sampleCoolSpots';

export type CoolSpotOriginType = 'current' | 'route' | 'destination';

export interface CoolSpotFilterOptions {
  category?: CoolSpotCategory | 'all';
  searchQuery?: string;
  maxDistanceKm?: number;
  userCoordinates?: { latitude: number; longitude: number };
  destinationCoordinates?: { latitude: number; longitude: number };
  route?: RouteInfo | null;
  originType?: CoolSpotOriginType;
  verifiedShadeOnly?: boolean;
  verifiedWaterOnly?: boolean;
  indoorOnly?: boolean;
  signal?: AbortSignal;
}

export interface CoolSpotService {
  getCoolSpots(filters?: CoolSpotFilterOptions): Promise<CoolSpot[]>;
  getCoolSpotById(id: string): Promise<CoolSpot | undefined>;
  getNearbyCoolSpots(lat: number, lng: number, radiusKm?: number): Promise<CoolSpot[]>;
  clearCache?(): void;
}

export class MockCoolSpotService implements CoolSpotService {
  private spots: CoolSpot[] = [...SAMPLE_COOLSPOTS];

  clearCache(): void {
    // No-op for mock service
  }

  async getCoolSpots(filters?: CoolSpotFilterOptions): Promise<CoolSpot[]> {
    let result = [...this.spots];

    if (!filters) return result;

    // Determine target coordinate for distance recalculation
    let targetLat: number | null = null;
    let targetLon: number | null = null;

    if (filters.originType === 'destination' && filters.destinationCoordinates) {
      targetLat = filters.destinationCoordinates.latitude;
      targetLon = filters.destinationCoordinates.longitude;
    } else if (filters.userCoordinates) {
      targetLat = filters.userCoordinates.latitude;
      targetLon = filters.userCoordinates.longitude;
    }

    if (targetLat !== null && targetLon !== null && isValidCoordinate(targetLat, targetLon)) {
      result = result.map(spot => {
        const dist = calculateHaversineDistance(targetLat!, targetLon!, spot.latitude, spot.longitude);
        return { ...spot, distanceKm: Number(dist.toFixed(1)) };
      });
      result.sort((a, b) => a.distanceKm - b.distanceKm);
    }

    return applyFilters(result, filters);
  }

  async getCoolSpotById(id: string): Promise<CoolSpot | undefined> {
    return this.spots.find(s => s.id === id);
  }

  async getNearbyCoolSpots(lat: number, lng: number, radiusKm: number = 5): Promise<CoolSpot[]> {
    if (!isValidCoordinate(lat, lng)) {
      return [];
    }

    const safeRadius = Math.max(0.1, Math.min(100, radiusKm));

    return this.spots
      .map(spot => {
        const dist = calculateHaversineDistance(lat, lng, spot.latitude, spot.longitude);
        return { ...spot, distanceKm: Number(dist.toFixed(1)) };
      })
      .filter(spot => spot.distanceKm <= safeRadius)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }
}

/**
 * Validates latitude (-90 to 90) and longitude (-180 to 180) ranges.
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Standard Haversine formula to compute great-circle distance in kilometers between two coordinates.
 */
export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    return Infinity;
  }

  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Samples key waypoints along a route geometry for corridor search.
 */
export function sampleRouteWaypoints(geometry: [number, number][], maxSamples: number = 4): [number, number][] {
  if (!geometry || geometry.length === 0) return [];
  if (geometry.length <= maxSamples) return geometry;

  const samples: [number, number][] = [geometry[0]];
  const step = (geometry.length - 1) / (maxSamples - 1);
  for (let i = 1; i < maxSamples - 1; i++) {
    const idx = Math.round(i * step);
    samples.push(geometry[idx]);
  }
  samples.push(geometry[geometry.length - 1]);
  return samples;
}

/**
 * Calculates minimum distance in km from a coordinate to any point on a route polyline.
 */
export function calculateMinDistanceToRoute(lat: number, lon: number, geometry: [number, number][]): number {
  if (!geometry || geometry.length === 0) return Infinity;
  let minDist = Infinity;
  for (const point of geometry) {
    const d = calculateHaversineDistance(lat, lon, point[0], point[1]);
    if (d < minDist) minDist = d;
  }
  return Number(minDist.toFixed(1));
}

function applyFilters(spots: CoolSpot[], filters?: CoolSpotFilterOptions): CoolSpot[] {
  if (!filters) return spots;
  let result = [...spots];

  if (filters.category && filters.category !== 'all') {
    result = result.filter(spot => spot.category === filters.category);
  }

  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase().trim();
    result = result.filter(
      spot =>
        spot.name.toLowerCase().includes(q) ||
        spot.address.toLowerCase().includes(q) ||
        spot.description.toLowerCase().includes(q) ||
        (spot.categoryLabel && spot.categoryLabel.toLowerCase().includes(q)) ||
        spot.amenities.some(a => a.toLowerCase().includes(q))
    );
  }

  if (filters.maxDistanceKm !== undefined && filters.maxDistanceKm > 0) {
    result = result.filter(spot => spot.distanceKm <= filters.maxDistanceKm!);
  }

  if (filters.verifiedShadeOnly) {
    result = result.filter(spot => spot.shadeVerified);
  }

  if (filters.verifiedWaterOnly) {
    result = result.filter(spot => spot.waterVerified);
  }

  if (filters.indoorOnly) {
    result = result.filter(spot => spot.isIndoor);
  }

  result.sort((a, b) => a.distanceKm - b.distanceKm);
  return result;
}

export interface ApiFetchResult {
  success: boolean;
  spots: CoolSpot[];
  status?: number;
  error?: string;
  durationMs: number;
}

export class HybridCoolSpotService implements CoolSpotService {
  private mockService = new MockCoolSpotService();
  // Cache raw geographic results so typing/searching/filtering does not repeatedly
  // hit the public Overpass service. Filtered views are still recalculated per call.
  private readonly responseCache = new Map<string, { expiresAt: number; spots: CoolSpot[] }>();
  private readonly cacheTtlMs = 90_000;

  clearCache(): void {
    this.responseCache.clear();
  }

  private cacheKey(lat: number, lon: number, radiusKm: number, filters?: CoolSpotFilterOptions): string {
    const origin = filters?.originType || 'current';
    const cat = filters?.category || 'all';
    const q = (filters?.searchQuery || '').trim().toLowerCase();
    const shade = filters?.verifiedShadeOnly ? '1' : '0';
    const water = filters?.verifiedWaterOnly ? '1' : '0';
    const indoor = filters?.indoorOnly ? '1' : '0';
    return `${lat.toFixed(4)}:${lon.toFixed(4)}:${radiusKm.toFixed(1)}:${origin}:${cat}:${q}:${shade}:${water}:${indoor}`;
  }

  private getCached(key: string): CoolSpot[] | undefined {
    const entry = this.responseCache.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.responseCache.delete(key);
      return undefined;
    }
    return entry.spots.map(spot => ({ ...spot, amenities: [...spot.amenities] }));
  }

  private setCached(key: string, spots: CoolSpot[]): void {
    if (this.responseCache.size >= 100) {
      const oldestKey = this.responseCache.keys().next().value;
      if (oldestKey) this.responseCache.delete(oldestKey);
    }
    this.responseCache.set(key, {
      expiresAt: Date.now() + this.cacheTtlMs,
      spots: spots.map(spot => ({ ...spot, amenities: [...spot.amenities] }))
    });
  }

  private getApiUrlsToTry(): string[] {
    const customBase = (import.meta.env?.VITE_API_BASE_URL as string) || (import.meta.env?.VITE_WEATHER_API_URL as string);
    if (customBase) {
      const cleanBase = customBase.replace(/\/+$/, '');
      const fullUrl = cleanBase.endsWith('/api/coolspots') ? cleanBase : `${cleanBase}/api/coolspots`;
      return [fullUrl];
    }
    const defaultProdEndpoint = 'https://ywxmdsz1re.execute-api.ap-south-1.amazonaws.com/prod/api/coolspots';
    if (import.meta.env?.DEV) {
      return [defaultProdEndpoint, 'http://127.0.0.1:8000/api/coolspots'];
    }
    return [defaultProdEndpoint];
  }

  private async fetchFromApiCandidate(baseUrl: string, lat: number, lon: number, radiusKm: number, signal?: AbortSignal): Promise<ApiFetchResult> {
    const startTime = Date.now();
    const queryUrl = `${baseUrl}?lat=${lat}&lon=${lon}&radiusKm=${radiusKm}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12-second sensible client timeout

    const onAbort = () => controller.abort();
    if (signal) signal.addEventListener('abort', onAbort);

    try {
      const response = await fetch(queryUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });

      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', onAbort);
      const durationMs = Date.now() - startTime;

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        console.warn(`[CoolSpot API Diagnostic] Received HTML response from ${baseUrl} (Duration: ${durationMs}ms). Skipping HTML fallback route.`);
        return { success: false, spots: [], status: response.status, error: 'HTML_RESPONSE', durationMs };
      }

      if (response.ok) {
        const json = await response.json();
        const rawArray = Array.isArray(json) ? json : (Array.isArray(json?.coolSpots) ? json.coolSpots : (Array.isArray(json?.data) ? json.data : null));

        if (rawArray === null) {
          console.warn(`[CoolSpot API Diagnostic] Invalid response schema from ${baseUrl} (Duration: ${durationMs}ms, Status: ${response.status})`);
          return { success: false, spots: [], status: response.status, error: 'INVALID_SCHEMA', durationMs };
        }

        const spots: CoolSpot[] = rawArray.map((item: any) => ({
          id: String(item.id),
          name: String(item.name),
          category: item.category as CoolSpotCategory,
          categoryLabel: String(item.categoryLabel || 'Cooling Sanctuary'),
          distanceKm: Number(item.distanceKm ?? 0),
          latitude: Number(item.latitude),
          longitude: Number(item.longitude),
          isIndoor: Boolean(item.isIndoor),
          shadeVerified: Boolean(item.shadeVerified),
          waterVerified: Boolean(item.waterVerified),
          openStatusVerified: Boolean(item.openStatusVerified),
          isOpenNow: Boolean(item.isOpenNow),
          operatingHours: String(item.operatingHours || 'Public Access'),
          lastVerifiedTimestamp: String(item.lastVerifiedTimestamp || new Date().toISOString()),
          description: String(item.description || ''),
          address: String(item.address || ''),
          amenities: Array.isArray(item.amenities) ? item.amenities.map(String) : [],
          isSampleData: Boolean(item.isSampleData)
        }));

        console.log(`[CoolSpot API Diagnostic] Successfully fetched ${spots.length} spots from ${baseUrl} (Duration: ${durationMs}ms, Status: 200)`);
        return { success: true, spots, status: 200, durationMs };
      } else {
        const errorCategory = response.status === 429 ? 'RATE_LIMITED' : `HTTP_${response.status}`;
        console.warn(`[CoolSpot API Diagnostic] HTTP ${response.status} (${errorCategory}) error from ${baseUrl} (Duration: ${durationMs}ms)`);
        return { success: false, spots: [], status: response.status, error: errorCategory, durationMs };
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', onAbort);
      const durationMs = Date.now() - startTime;
      const isTimeout = err?.name === 'AbortError' && !signal?.aborted;
      const errorCategory = isTimeout ? 'TIMEOUT' : (err?.name === 'AbortError' ? 'CANCELLED' : 'NETWORK_ERROR');
      console.warn(`[CoolSpot API Diagnostic] Request failed for ${baseUrl} [${errorCategory}] (Duration: ${durationMs}ms):`, err?.message || err);
      return { success: false, spots: [], error: errorCategory, durationMs };
    }
  }

  private async fetchFromApiCandidateWithRetry(baseUrl: string, lat: number, lon: number, radiusKm: number, signal?: AbortSignal, maxRetries: number = 1): Promise<ApiFetchResult> {
    let attempt = 0;
    while (attempt <= maxRetries) {
      if (signal?.aborted) {
        return { success: false, spots: [], error: 'CANCELLED', durationMs: 0 };
      }
      const res = await this.fetchFromApiCandidate(baseUrl, lat, lon, radiusKm, signal);
      if (res.success || signal?.aborted || res.error === 'HTML_RESPONSE' || res.error === 'CANCELLED') {
        return res;
      }

      const isRetryable = res.error === 'RATE_LIMITED' || res.error === 'TIMEOUT' || res.error === 'NETWORK_ERROR' || res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504;
      if (!isRetryable || attempt === maxRetries) {
        return res;
      }

      attempt++;
      const backoffMs = Math.min(3000, Math.floor(400 * Math.pow(2, attempt) + Math.random() * 150));
      console.log(`[CoolSpot API Diagnostic] Retrying ${baseUrl} [${res.error}] in ${backoffMs}ms (Attempt ${attempt}/${maxRetries})...`);
      await new Promise(r => setTimeout(r, backoffMs));
    }
    return { success: false, spots: [], error: 'NETWORK_ERROR', durationMs: 0 };
  }

  private async fetchFromApi(lat: number, lon: number, radiusKm: number, filters?: CoolSpotFilterOptions): Promise<ApiFetchResult> {
    const cacheKey = this.cacheKey(lat, lon, radiusKm, filters);
    const cachedSpots = this.getCached(cacheKey);
    if (cachedSpots) {
      return { success: true, spots: cachedSpots, status: 200, durationMs: 0 };
    }

    const urls = this.getApiUrlsToTry();
    let lastResult: ApiFetchResult = { success: false, spots: [], durationMs: 0 };

    for (const url of urls) {
      if (filters?.signal?.aborted) break;
      const res = await this.fetchFromApiCandidateWithRetry(url, lat, lon, radiusKm, filters?.signal);
      if (res.success) {
        this.setCached(cacheKey, res.spots);
        return res;
      }
      lastResult = res;
      // A browser network error often means the configured API is unreachable/CORS-blocked;
      // trying a local fallback URL in production cannot help and wastes time.
      if (res.error === 'NETWORK_ERROR' || res.error === 'TIMEOUT' || res.error === 'CANCELLED') break;
    }

    return lastResult;
  }

  async getCoolSpots(filters?: CoolSpotFilterOptions): Promise<CoolSpot[]> {
    if (filters?.signal?.aborted) {
      return [];
    }

    const originType = filters?.originType || 'current';
    const radiusKm = filters?.maxDistanceKm && filters.maxDistanceKm > 0 ? filters.maxDistanceKm : 5;

    let targetCoords: { latitude: number; longitude: number } | null = null;

    if (originType === 'destination') {
      if (filters?.destinationCoordinates && isValidCoordinate(filters.destinationCoordinates.latitude, filters.destinationCoordinates.longitude)) {
        targetCoords = filters.destinationCoordinates;
      }
    } else if (originType === 'route') {
      if (filters?.route?.geometry && filters.route.geometry.length > 0) {
        const waypoints = sampleRouteWaypoints(filters.route.geometry, 4);
        const resultsPerWaypoint = await Promise.all(
          waypoints.map(([wLat, wLon]) => this.fetchFromApi(wLat, wLon, radiusKm, filters))
        );

        const anySuccess = resultsPerWaypoint.some(r => r.success);
        if (anySuccess) {
          const spotMap = new Map<string, CoolSpot>();
          for (const res of resultsPerWaypoint) {
            if (res.success) {
              for (const spot of res.spots) {
                if (!spotMap.has(spot.id)) {
                  const distToRoute = calculateMinDistanceToRoute(spot.latitude, spot.longitude, filters.route.geometry);
                  spotMap.set(spot.id, { ...spot, distanceKm: distToRoute });
                }
              }
            }
          }
          const fetchedSpots = Array.from(spotMap.values());
          return applyFilters(fetchedSpots, filters);
        }
      } else if (filters?.userCoordinates) {
        targetCoords = filters.userCoordinates;
      }
    } else {
      if (filters?.userCoordinates && isValidCoordinate(filters.userCoordinates.latitude, filters.userCoordinates.longitude)) {
        targetCoords = filters.userCoordinates;
      }
    }

    if (targetCoords) {
      const apiRes = await this.fetchFromApi(targetCoords.latitude, targetCoords.longitude, radiusKm, filters);
      if (apiRes.success) {
        const fetchedSpots = apiRes.spots.map(spot => ({
          ...spot,
          distanceKm: Number(calculateHaversineDistance(targetCoords!.latitude, targetCoords!.longitude, spot.latitude, spot.longitude).toFixed(1))
        }));
        return applyFilters(fetchedSpots, filters);
      } else if (apiRes.error === 'CANCELLED') {
        return [];
      } else if (apiRes.error && apiRes.error !== 'HTML_RESPONSE') {
        const label = apiRes.error === 'RATE_LIMITED'
          ? 'RATE_LIMITED'
          : (apiRes.error === 'TIMEOUT' ? 'TIMEOUT' : (apiRes.status ? `HTTP_${apiRes.status}` : apiRes.error));
        throw new Error(`CoolSpot API Discovery Failed (${label}). Please click Retry.`);
      }
    }

    // Fallback to sample store if no coordinates provided or offline fallback
    const mockResult = await this.mockService.getCoolSpots(filters);
    return mockResult;
  }

  async getCoolSpotById(id: string): Promise<CoolSpot | undefined> {
    return this.mockService.getCoolSpotById(id);
  }

  async getNearbyCoolSpots(lat: number, lng: number, radiusKm: number = 5): Promise<CoolSpot[]> {
    return this.getCoolSpots({
      userCoordinates: { latitude: lat, longitude: lng },
      maxDistanceKm: radiusKm
    });
  }
}

export const coolSpotService = new HybridCoolSpotService();
