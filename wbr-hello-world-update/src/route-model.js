const EARTH_RADIUS_METERS = 6371008.8;

export function createRoute({ name = 'Untitled route', loop = false, points = [] } = {}) {
  return {
    name,
    loop,
    points: points.map(normalizePoint),
  };
}

export function addPoint(route, point) {
  return {
    ...route,
    points: [...route.points, normalizePoint(point)],
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
  return {
    ...route,
    loop: Boolean(loop),
  };
}

export function renamePoint(route, pointId, name) {
  return {
    ...route,
    points: route.points.map((point) =>
      point.id === pointId ? { ...point, name: String(name).trim() || point.name } : point,
    ),
  };
}

export function totalDistanceMeters(route) {
  const points = route.points;
  if (points.length < 2) return 0;

  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += distanceMeters(points[index - 1], points[index]);
  }

  if (route.loop && points.length > 2) {
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

function normalizePoint(point) {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
    throw new Error('Route points need numeric lat and lng values.');
  }

  return {
    id: point.id ?? crypto.randomUUID(),
    name: String(point.name ?? 'Map point'),
    lat: point.lat,
    lng: point.lng,
  };
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}
