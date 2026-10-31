import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { CoolSpotCard } from '../CoolSpotCard';
import type { CoolSpot } from '../../types';

describe('CoolSpotCard Opening Status UI Tests', () => {
  const baseSpot: CoolSpot = {
    id: 'cs-test-1',
    name: 'Test Sanctuary',
    category: 'park',
    categoryLabel: 'Park & Shade',
    distanceKm: 0.8,
    latitude: 12.9716,
    longitude: 77.5946,
    isIndoor: false,
    shadeVerified: true,
    waterVerified: true,
    openStatusVerified: true,
    isOpenNow: true,
    operatingHours: '24/7 Daily',
    lastVerifiedTimestamp: new Date().toISOString(),
    description: 'A shaded park sanctuary.',
    address: '123 Green Way, Bengaluru',
    amenities: ['Shade Coverage', 'Drinking Water'],
    isSampleData: false,
    dataSourceStatus: 'osm_live'
  };

  it('renders Open Now badge when isOpenNow is confirmed true (e.g. 24/7)', () => {
    const spot: CoolSpot = {
      ...baseSpot,
      isOpenNow: true,
      openStatusVerified: true,
      operatingHours: '24/7'
    };
    const html = renderToString(<CoolSpotCard spot={spot} />);
    expect(html).toContain('Open Now');
    expect(html).toContain('bg-emerald-100');
    expect(html).not.toContain('Closed');
    expect(html).not.toContain('Hours Listed');
    expect(html).not.toContain('Status Unknown');
  });

  it('renders Hours Listed badge (never Closed) when opening hours are mapped but real-time open status is unverified', () => {
    const spot: CoolSpot = {
      ...baseSpot,
      isOpenNow: false,
      openStatusVerified: true,
      operatingHours: '09:00 - 18:00 Mon-Fri'
    };
    const html = renderToString(<CoolSpotCard spot={spot} />);
    expect(html).toContain('Hours Listed');
    expect(html).toContain('bg-blue-50');
    // Must NOT display Closed merely because isOpenNow is false
    expect(html).not.toContain('Closed');
    expect(html).not.toContain('Open Now');
  });

  it('renders Closed badge when verified explicitly closed', () => {
    const spot: CoolSpot = {
      ...baseSpot,
      isOpenNow: false,
      openStatusVerified: true,
      operatingHours: 'Permanently Closed for Renovation'
    };
    const html = renderToString(<CoolSpotCard spot={spot} />);
    expect(html).toContain('Closed');
    expect(html).toContain('bg-rose-100');
    expect(html).not.toContain('Open Now');
    expect(html).not.toContain('Hours Listed');
  });

  it('renders Hours Listed (never Closed) when operating-hours string contains the word "closed" for non-active periods', () => {
    // Schedule mentioning closures on weekends
    const weekendClosedSpot: CoolSpot = {
      ...baseSpot,
      isOpenNow: false,
      openStatusVerified: true,
      operatingHours: 'Mon-Fri 09:00-18:00; Sat-Sun closed'
    };
    const weekendHtml = renderToString(<CoolSpotCard spot={weekendClosedSpot} />);
    expect(weekendHtml).toContain('Hours Listed');
    expect(weekendHtml).toContain('bg-blue-50');
    expect(weekendHtml).not.toContain('Closed');

    // Schedule mentioning closures on holidays
    const holidayClosedSpot: CoolSpot = {
      ...baseSpot,
      isOpenNow: false,
      openStatusVerified: true,
      operatingHours: 'Closed on public holidays'
    };
    const holidayHtml = renderToString(<CoolSpotCard spot={holidayClosedSpot} />);
    expect(holidayHtml).toContain('Hours Listed');
    expect(holidayHtml).toContain('bg-blue-50');
    expect(holidayHtml).not.toContain('bg-rose-100');
    expect(holidayHtml).not.toContain('text-rose-800');
  });

  it('renders Status Unknown badge when opening hours are not mapped or unverified', () => {
    const spot: CoolSpot = {
      ...baseSpot,
      isOpenNow: false,
      openStatusVerified: false,
      operatingHours: 'Public Access / Check Local Hours'
    };
    const html = renderToString(<CoolSpotCard spot={spot} />);
    expect(html).toContain('Status Unknown');
    expect(html).toContain('bg-stone-100');
    // Must NOT display Closed when status is unverified
    expect(html).not.toContain('Closed');
    expect(html).not.toContain('Open Now');
  });
});
