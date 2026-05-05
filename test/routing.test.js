import { describe, expect, it } from 'vitest';

import {
  createStraightSegment,
  getRouteLegs,
  resolveRoutingProvider,
  routeSegments,
  ROUTING_PROVIDER_OPENROUTESERVICE,
  ROUTING_PROVIDER_OSRM,
} from '../src/routing.js';
import { createRoute, setLoop } from '../src/route-model.js';

const route = createRoute({
  activityType: 'bike',
  points: [
    { id: 'a', name: 'A', lat: 43.64, lng: -72.25 },
    { id: 'b', name: 'B', lat: 43.65, lng: -72.26 },
  ],
});

describe('routing providers', () => {
  it('uses OpenRouteService in auto mode when a key exists', () => {
    expect(resolveRoutingProvider({ provider: 'auto', orsApiKey: 'key' })).toBe(
      ROUTING_PROVIDER_OPENROUTESERVICE,
    );
  });

  it('falls back to OSRM when OpenRouteService has no key', () => {
    expect(
      resolveRoutingProvider({
        provider: ROUTING_PROVIDER_OPENROUTESERVICE,
        orsApiKey: '',
      }),
    ).toBe(ROUTING_PROVIDER_OSRM);
  });

  it('builds adjacent route legs and loop return legs', () => {
    expect(getRouteLegs(route)).toHaveLength(1);
    expect(getRouteLegs(setLoop(route, true))).toHaveLength(1);

    const loopRoute = createRoute({
      loop: true,
      points: [
        { id: 'a', name: 'A', lat: 43, lng: -72 },
        { id: 'b', name: 'B', lat: 44, lng: -72 },
        { id: 'c', name: 'C', lat: 44, lng: -73 },
      ],
    });

    expect(getRouteLegs(loopRoute).at(-1).isLoopReturn).toBe(true);
  });

  it('creates a straight-line fallback segment', () => {
    const [leg] = getRouteLegs(route);
    const segment = createStraightSegment(leg, route.activityType);

    expect(segment.fallback).toBe(true);
    expect(segment.distance).toBeGreaterThan(0);
    expect(segment.duration).toBeGreaterThan(0);
    expect(segment.coordinates).toHaveLength(2);
  });

  it('routes OpenRouteService GeoJSON responses', async () => {
    const fetchImpl = async (url, options) => {
      expect(url).toContain('/v2/directions/cycling-regular/geojson');
      expect(options.headers.Authorization).toBe('key');
      expect(JSON.parse(options.body).coordinates).toHaveLength(2);

      return {
        ok: true,
        async json() {
          return {
            features: [
              {
                geometry: {
                  coordinates: [
                    [-72.25, 43.64],
                    [-72.26, 43.65],
                  ],
                },
                properties: {
                  summary: { distance: 1234, duration: 567 },
                },
              },
            ],
          };
        },
      };
    };

    const plan = await routeSegments(
      route,
      { provider: ROUTING_PROVIDER_OPENROUTESERVICE, orsApiKey: 'key' },
      fetchImpl,
    );

    expect(plan.provider).toBe(ROUTING_PROVIDER_OPENROUTESERVICE);
    expect(plan.segments[0].fallback).toBe(false);
    expect(plan.segments[0].distance).toBe(1234);
    expect(plan.segments[0].duration).toBe(567);
  });
});
