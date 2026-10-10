import type { GeocodedLocation } from '../types';

export interface GeocodingService {
  searchLocations(query: string): Promise<GeocodedLocation[]>;
}

export const SAMPLE_LANDMARKS: GeocodedLocation[] = [
  {
    id: 'sample-1',
    name: 'Cubbon Park, Bengaluru',
    displayName: 'Cubbon Park, Kasturba Road, Sampangi Rama Nagar, Bengaluru, Karnataka, 560001',
    latitude: 12.9763,
    longitude: 77.5929,
    category: 'park',
    type: 'leisure'
  },
  {
    id: 'sample-2',
    name: 'IISc Campus, Bengaluru',
    displayName: 'Indian Institute of Science (IISc), CV Raman Road, Mathikere, Bengaluru, Karnataka, 560012',
    latitude: 13.0182,
    longitude: 77.5684,
    category: 'education',
    type: 'university'
  },
  {
    id: 'sample-3',
    name: 'Electronic City Tech Park',
    displayName: 'Electronic City Phase 1, Hosur Road, Bengaluru, Karnataka, 560100',
    latitude: 12.8452,
    longitude: 77.6602,
    category: 'office',
    type: 'commercial'
  },
  {
    id: 'sample-4',
    name: 'Indiranagar 100 Feet Road',
    displayName: '100 Feet Road, Indiranagar, Bengaluru, Karnataka, 560038',
    latitude: 12.9784,
    longitude: 77.6408,
    category: 'commercial',
    type: 'highway'
  },
  {
    id: 'sample-5',
    name: 'Vidhana Soudha Plaza',
    displayName: 'Vidhana Soudha, Ambedkar Veedhi, Sampangi Rama Nagar, Bengaluru, Karnataka, 560001',
    latitude: 12.9796,
    longitude: 77.5907,
    category: 'government',
    type: 'landmark'
  },
  {
    id: 'sample-6',
    name: 'AIIMS Campus, New Delhi',
    displayName: 'All India Institute of Medical Sciences (AIIMS), Sri Aurobindo Marg, Ansari Nagar, New Delhi, 110029',
    latitude: 28.5672,
    longitude: 77.2100,
    category: 'hospital',
    type: 'healthcare'
  },
  {
    id: 'sample-7',
    name: 'Bandra-Kurla Complex (BKC), Mumbai',
    displayName: 'Bandra Kurla Complex, Bandra East, Mumbai, Maharashtra, 400051',
    latitude: 19.0657,
    longitude: 72.8687,
    category: 'commercial',
    type: 'office'
  }
];

export class HybridGeocodingService implements GeocodingService {
  async searchLocations(query: string): Promise<GeocodedLocation[]> {
    const q = query.trim();
    if (!q || q.length < 2) {
      return [];
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const endpoint = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`;
      const response = await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'HeatShield-App/1.0'
        }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((item: any) => ({
            id: String(item.place_id || item.osm_id || Math.random()),
            displayName: item.display_name || item.name,
            name: (item.display_name || item.name).split(',')[0],
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            category: item.category || item.class,
            type: item.type
          }));
        }
      }
    } catch {
      // Network failure / rate limit / timeout -> fall back to matching sample landmarks
    }

    // Fallback: search sample landmarks
    const lowerQ = q.toLowerCase();
    const matched = SAMPLE_LANDMARKS.filter(
      item =>
        item.name.toLowerCase().includes(lowerQ) ||
        item.displayName.toLowerCase().includes(lowerQ) ||
        (item.category && item.category.toLowerCase().includes(lowerQ))
    );

    if (matched.length > 0) {
      return matched;
    }

    // Return sample landmarks list as suggestions if query doesn't match specific sample
    return SAMPLE_LANDMARKS.slice(0, 3);
  }
}

export const geocodingService = new HybridGeocodingService();
