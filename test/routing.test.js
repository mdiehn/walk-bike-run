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
  it('uses the ORS/HEIGIT Worker in auto mode when a Worker URL exists', () => {
    expect(
      resolveRoutingProvider({
        provider: 'auto',
        orsBaseUrl: 'https://example.workers.dev',
      }),
    ).toBe(ROUTING_PROVIDER_OPENROUTESERVICE);
  });

  it('falls back to OSRM when the ORS/HEIGIT Worker has no URL', () => {
    expect(
      resolveRoutingProvider({
        provider: ROUTING_PROVIDER_OPENROUTESERVICE,
        orsBaseUrl: '',
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

  it('routes ORS/HEIGIT Worker GeoJSON responses', async () => {
    const fetchImpl = async (url, options) => {
      expect(url).toBe('https://example.workers.dev/route?profile=cycling-regular');
      expect(options.headers.Authorization).toBeUndefined();
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
      {
        provider: ROUTING_PROVIDER_OPENROUTESERVICE,
        orsBaseUrl: 'https://example.workers.dev/',
      },
      fetchImpl,
    );

    expect(plan.provider).toBe(ROUTING_PROVIDER_OPENROUTESERVICE);
    expect(plan.segments[0].fallback).toBe(false);
    expect(plan.segments[0].distance).toBe(1234);
    expect(plan.segments[0].duration).toBe(567);
  });
});
