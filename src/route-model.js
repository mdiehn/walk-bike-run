const EARTH_RADIUS_METERS = 6371008.8;
const MIN_LAT = -90;
const MAX_LAT = 90;
const MIN_LNG = -180;
const MAX_LNG = 180;
const METERS_PER_MILE = 1609.344;

export const ACTIVITY_SPEEDS_MPH = {
  walk: 3,
  bike: 12,
  run: 6,
};

export function createRoute({
  name = "Untitled route",
  activityType = "walk",
  loop = false,
  points = [],
} = {}) {
  return {
    name: normalizeRouteName(name),
    activityType: normalizeActivityType(activityType),
    loop,
    points: points.map(normalizePoint),
  };
}

export function updateRoute(route, changes = {}) {
  return {
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
  if (!point) {
    throw new Error("Route point is required.");
  }

  const lat = Number(point.lat);
  const lng = Number(point.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Route points need numeric lat and lng values.");
  }

  if (lat < MIN_LAT || lat > MAX_LAT || lng < MIN_LNG || lng > MAX_LNG) {
    throw new Error(
      "Route point coordinates are outside valid latitude/longitude ranges.",
    );
  }

  return {
    id: point.id ?? crypto.randomUUID(),
    name: normalizePointName(point.name),
    lat,
    lng,
  };
}

function normalizeRouteName(name) {
  return String(name ?? "").trim() || "Untitled route";
}

function normalizePointName(name) {
  return String(name ?? "").trim() || "Map point";
}

function normalizeActivityType(activityType) {
  const normalized = String(activityType ?? "walk").toLowerCase();
  return ["walk", "bike", "run"].includes(normalized) ? normalized : "walk";
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}
