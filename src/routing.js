import { activitySpeedMph, distanceMeters } from './route-model.js';

export const ROUTING_PROVIDER_AUTO = 'auto';
export const ROUTING_PROVIDER_OSRM = 'osrm';
export const ROUTING_PROVIDER_OPENROUTESERVICE = 'openrouteservice';

const METERS_PER_MILE = 1609.344;
const OSRM_BASE_URL = 'https://router.project-osrm.org';
const ORS_BASE_URL = 'https://api.openrouteservice.org';

export function resolveRoutingProvider({ provider, orsApiKey } = {}) {
  if (provider === ROUTING_PROVIDER_OPENROUTESERVICE && orsApiKey) {
    return ROUTING_PROVIDER_OPENROUTESERVICE;
  }

  if (provider === ROUTING_PROVIDER_AUTO && orsApiKey) {
    return ROUTING_PROVIDER_OPENROUTESERVICE;
  }

  return ROUTING_PROVIDER_OSRM;
}

export function getRouteLegs(route) {
  const legs = [];
  const points = route.points ?? [];

  for (let index = 1; index < points.length; index += 1) {
    legs.push({
      fromIndex: index - 1,
      toIndex: index,
      from: points[index - 1],
      to: points[index],
      label: 'From prev',
    });
  }

  if (route.loop && points.length > 2) {
    legs.push({
      fromIndex: points.length - 1,
      toIndex: 0,
      from: points[points.length - 1],
      to: points[0],
      label: 'Return',
      isLoopReturn: true,
    });
  }

  return legs;
}

export async function routeSegments(route, settings = {}, fetchImpl = fetch) {
  const provider = resolveRoutingProvider(settings);
  const legs = getRouteLegs(route);
  const segments = [];

  for (const leg of legs) {
    segments.push(await routeLeg(leg, route.activityType, provider, settings, fetchImpl));
  }

  return {
    provider,
    segments,
    status: segments.some((segment) => segment.fallback)
      ? 'partial-fallback'
      : 'routed',
  };
}

export function createStraightSegment(leg, activityType) {
  const distance = distanceMeters(leg.from, leg.to);
  const speedMph = activitySpeedMph(activityType);
  const distanceMiles = distance / METERS_PER_MILE;
  const duration = speedMph ? (distanceMiles / speedMph) * 3600 : 0;

  return {
    ...leg,
    provider: 'straight-line',
    fallback: true,
    distance,
    duration,
    coordinates: [
      [leg.from.lat, leg.from.lng],
      [leg.to.lat, leg.to.lng],
    ],
  };
}

async function routeLeg(leg, activityType, provider, settings, fetchImpl) {
  try {
    if (provider === ROUTING_PROVIDER_OPENROUTESERVICE) {
      return await routeOpenRouteServiceLeg(leg, activityType, settings, fetchImpl);
    }
    return await routeOsrmLeg(leg, activityType, fetchImpl);
  } catch {
    return createStraightSegment(leg, activityType);
  }
}

async function routeOsrmLeg(leg, activityType, fetchImpl) {
  const profile = activityType === 'bike' ? 'bike' : 'foot';
  const from = `${leg.from.lng},${leg.from.lat}`;
  const to = `${leg.to.lng},${leg.to.lat}`;
  const url = `${OSRM_BASE_URL}/route/v1/${profile}/${from};${to}?overview=full&geometries=geojson`;
  const response = await fetchImpl(url);

  if (!response.ok) throw new Error('OSRM route request failed.');

  const data = await response.json();
  const osrmRoute = data.routes?.[0];
  if (!osrmRoute?.geometry?.coordinates?.length) {
    throw new Error('OSRM returned no route geometry.');
  }

  return {
    ...leg,
    provider: ROUTING_PROVIDER_OSRM,
    fallback: false,
    distance: Number(osrmRoute.distance) || 0,
    duration: Number(osrmRoute.duration) || 0,
    coordinates: osrmRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
  };
}

async function routeOpenRouteServiceLeg(leg, activityType, settings, fetchImpl) {
  if (!settings.orsApiKey) {
    throw new Error('OpenRouteService API key is required.');
  }

  const profile = activityType === 'bike' ? 'cycling-regular' : 'foot-walking';
  const response = await fetchImpl(
    `${ORS_BASE_URL}/v2/directions/${profile}/geojson`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/geo+json, application/json',
        Authorization: settings.orsApiKey,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        coordinates: [
          [leg.from.lng, leg.from.lat],
          [leg.to.lng, leg.to.lat],
        ],
      }),
    },
  );

  if (!response.ok) throw new Error('OpenRouteService route request failed.');

  const data = await response.json();
  const feature = data.features?.[0];
  const coordinates = feature?.geometry?.coordinates;
  const summary = feature?.properties?.summary;

  if (!coordinates?.length || !summary) {
    throw new Error('OpenRouteService returned no route geometry.');
  }

  return {
    ...leg,
    provider: ROUTING_PROVIDER_OPENROUTESERVICE,
    fallback: false,
    distance: Number(summary.distance) || 0,
    duration: Number(summary.duration) || 0,
    coordinates: coordinates.map(([lng, lat]) => [lat, lng]),
  };
}
