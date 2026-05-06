const EARTH_RADIUS_METERS = 6371008.8;
const MIN_LAT = -90;
const MAX_LAT = 90;
const MIN_LNG = -180;
const MAX_LNG = 180;
const METERS_PER_MILE = 1609.344;
const ROUTED_GEOMETRY_SCHEMA_VERSION = 1;

export const ACTIVITY_SPEEDS_MPH = {
  walk: 3,
  bike: 12,
  run: 6,
};

export function createRoute({
  name = 'Untitled route',
  activityType = 'walk',
  loop = false,
  points = [],
  routedGeometry = null,
} = {}) {
  const route = {
    name: normalizeRouteName(name),
    activityType: normalizeActivityType(activityType),
    loop,
    points: points.map(normalizePoint),
  };
  const cleanRoutedGeometry = normalizeRoutedGeometry(routedGeometry);

  if (cleanRoutedGeometry) {
    route.routedGeometry = normalizeRoutedGeometryForRoute(
      route,
      cleanRoutedGeometry,
    );
  }

  return route;
}

export function updateRoute(route, changes = {}) {
  const updated = {
    ...route,
    name:
      changes.name === undefined
        ? route.name
        : normalizeRouteName(changes.name),
    activityType:
      changes.activityType === undefined
        ? route.activityType
        : normalizeActivityType(changes.activityType),
    loop: changes.loop === undefined ? route.loop : Boolean(changes.loop),
  };

  if (Object.hasOwn(changes, 'routedGeometry')) {
    const cleanRoutedGeometry = normalizeRoutedGeometry(changes.routedGeometry);

    if (cleanRoutedGeometry) {
      updated.routedGeometry = normalizeRoutedGeometryForRoute(
        updated,
        cleanRoutedGeometry,
      );
    } else {
      delete updated.routedGeometry;
    }
  }

  return updated;
}

export function addPoint(route, point) {
  return {
    ...route,
    points: [...route.points, normalizePoint(point)],
  };
}

export function updatePoint(route, pointId, changes = {}) {
  return {
    ...route,
    points: route.points.map((point) =>
      point.id === pointId
        ? normalizePoint({ ...point, ...changes, id: point.id })
        : point,
    ),
  };
}

export function deletePoint(route, pointId) {
  return {
    ...route,
    points: route.points.filter((point) => point.id !== pointId),
  };
}

export function clearPoints(route) {
  return {
    ...route,
    points: [],
  };
}

export function setLoop(route, loop) {
  return updateRoute(route, { loop });
}

export function renamePoint(route, pointId, name) {
  return updatePoint(route, pointId, { name });
}

export function movePoint(route, pointId, delta) {
  const currentIndex = route.points.findIndex((point) => point.id === pointId);
  if (currentIndex === -1) return route;

  const nextIndex = clamp(currentIndex + delta, 0, route.points.length - 1);
  if (nextIndex === currentIndex) return route;

  const points = [...route.points];
  const [point] = points.splice(currentIndex, 1);
  points.splice(nextIndex, 0, point);

  return {
    ...route,
    points,
  };
}

export function activitySpeedMph(activityType) {
  return ACTIVITY_SPEEDS_MPH[normalizeActivityType(activityType)];
}

export function estimatedDurationMinutes(route) {
  const speedMph = activitySpeedMph(route.activityType);
  if (!speedMph) return 0;

  const distanceMiles = totalDistanceMeters(route) / METERS_PER_MILE;
  return (distanceMiles / speedMph) * 60;
}

export function routeDistanceMeters(route) {
  return !route.routedGeometry?.isStale
    ? (route.routedGeometry?.distanceMeters ?? totalDistanceMeters(route))
    : totalDistanceMeters(route);
}

export function routeDurationMinutes(route) {
  const durationSeconds = route.routedGeometry?.durationSeconds;
  if (
    !route.routedGeometry?.isStale &&
    Number.isFinite(durationSeconds) &&
    durationSeconds >= 0
  ) {
    return durationSeconds / 60;
  }

  return estimatedDurationMinutes(route);
}

export function totalDistanceMeters(route) {
  const points = route.points;
  if (points.length < 2) return 0;

  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += distanceMeters(points[index - 1], points[index]);
  }

  if (route.loop && points.length >= 2) {
    total += distanceMeters(points[points.length - 1], points[0]);
  }

  return total;
}

export function distanceMeters(a, b) {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLng = toRadians(b.lng - a.lng);

  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function normalizeRoutedGeometry(routedGeometry) {
  if (!routedGeometry || typeof routedGeometry !== 'object') return null;

  const routeKey = String(routedGeometry.routeKey ?? '').trim();
  if (!routeKey) return null;

  const segments = Array.isArray(routedGeometry.segments)
    ? routedGeometry.segments.map(normalizeRoutedSegment).filter(Boolean)
    : [];

  if (segments.length === 0) return null;

  const distanceMetersValue = normalizeNonNegativeNumber(
    routedGeometry.distanceMeters,
    segments.reduce((total, segment) => total + segment.distance, 0),
  );
  const durationSeconds = normalizeNonNegativeNumber(
    routedGeometry.durationSeconds,
    segments.reduce((total, segment) => total + segment.duration, 0),
  );

  return {
    schemaVersion: ROUTED_GEOMETRY_SCHEMA_VERSION,
    routeKey,
    provider:
      routedGeometry.provider === null || routedGeometry.provider === undefined
        ? null
        : String(routedGeometry.provider),
    status: normalizeRoutedStatus(routedGeometry.status),
    isStale: Boolean(routedGeometry.isStale),
    distanceMeters: distanceMetersValue,
    durationSeconds,
    segments,
    updatedAt: normalizeDate(routedGeometry.updatedAt),
  };
}

function normalizePoint(point) {
  if (!point) {
    throw new Error('Route point is required.');
  }

  const lat = Number(point.lat);
  const lng = Number(point.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Route points need numeric lat and lng values.');
  }

  if (lat < MIN_LAT || lat > MAX_LAT || lng < MIN_LNG || lng > MAX_LNG) {
    throw new Error(
      'Route point coordinates are outside valid latitude/longitude ranges.',
    );
  }

  return {
    id: point.id ?? crypto.randomUUID(),
    name: normalizePointName(point.name),
    lat,
    lng,
  };
}

function normalizeRoutedSegment(segment) {
  if (!segment || typeof segment !== 'object') return null;

  const coordinates = Array.isArray(segment.coordinates)
    ? segment.coordinates.map(normalizeCoordinate).filter(Boolean)
    : [];

  if (coordinates.length < 2) return null;

  return {
    fromIndex: normalizeInteger(segment.fromIndex, 0),
    toIndex: normalizeInteger(segment.toIndex, 0),
    label: String(segment.label ?? ''),
    isLoopReturn: Boolean(segment.isLoopReturn),
    provider:
      segment.provider === null || segment.provider === undefined
        ? null
        : String(segment.provider),
    fallback: Boolean(segment.fallback),
    distance: normalizeNonNegativeNumber(segment.distance, 0),
    duration: normalizeNonNegativeNumber(segment.duration, 0),
    coordinates,
  };
}

function normalizeRoutedGeometryForRoute(route, routedGeometry) {
  if (routedGeometry.segments.length === getExpectedRouteSegmentCount(route)) {
    return routedGeometry;
  }

  return {
    ...routedGeometry,
    isStale: true,
  };
}

function getExpectedRouteSegmentCount(route) {
  const pointCount = route.points.length;
  if (pointCount < 2) return 0;
  return pointCount - 1 + (route.loop ? 1 : 0);
}

function normalizeCoordinate(coordinate) {
  if (!Array.isArray(coordinate) || coordinate.length < 2) return null;

  const lat = Number(coordinate[0]);
  const lng = Number(coordinate[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < MIN_LAT || lat > MAX_LAT || lng < MIN_LNG || lng > MAX_LNG) {
    return null;
  }

  return [lat, lng];
}

function normalizeRoutedStatus(status) {
  return ['routed', 'partial-fallback', 'failed'].includes(status)
    ? status
    : 'routed';
}

function normalizeInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function normalizeNonNegativeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function normalizeDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function normalizeRouteName(name) {
  return String(name ?? '').trim() || 'Untitled route';
}

function normalizePointName(name) {
  return String(name ?? '').trim() || 'Map point';
}

function normalizeActivityType(activityType) {
  const normalized = String(activityType ?? 'walk').toLowerCase();
  return ['walk', 'bike', 'run'].includes(normalized) ? normalized : 'walk';
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}
