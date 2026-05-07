import {
  createRoute,
  routeDistanceMeters,
  routeDurationMinutes,
} from './route-model.js';

export const ROUTE_LIBRARY_SCHEMA_VERSION = 1;
export const ROUTE_LIBRARY_STORAGE_KEY = 'walk-bike-run.routeLibrary.v1';

export function loadRouteLibrary(storage = globalThis.localStorage) {
  if (!storage) return [];

  const raw = storage.getItem(ROUTE_LIBRARY_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeSavedRoute).filter(Boolean);
  } catch {
    return [];
  }
}

export function saveRouteLibrary(library, storage = globalThis.localStorage) {
  if (!storage) return;
  storage.setItem(
    ROUTE_LIBRARY_STORAGE_KEY,
    JSON.stringify(library.map(normalizeSavedRoute).filter(Boolean)),
  );
}

export function createSavedRoute(
  route,
  { id = createId(), now = new Date().toISOString() } = {},
) {
  const cleanRoute = createRoute(route);

  return {
    schemaVersion: ROUTE_LIBRARY_SCHEMA_VERSION,
    id,
    name: cleanRoute.name,
    activityType: cleanRoute.activityType,
    loop: cleanRoute.loop,
    points: cleanRoute.points,
    distanceMeters: routeDistanceMeters(cleanRoute),
    durationSeconds: routeDurationMinutes(cleanRoute) * 60,
    routedGeometry: cleanRoute.routedGeometry,
    createdAt: now,
    updatedAt: now,
  };
}

export function savedRouteToRoute(savedRoute) {
  const normalized = normalizeSavedRoute(savedRoute);
  if (!normalized) return createRoute();

  return createRoute({
    name: normalized.name,
    activityType: normalized.activityType,
    loop: normalized.loop,
    points: normalized.points,
    routedGeometry: normalized.routedGeometry,
  });
}

export function upsertSavedRoute(
  library,
  route,
  { id, now = new Date().toISOString() } = {},
) {
  const existingIndex = id ? library.findIndex((entry) => entry.id === id) : -1;
  const existing =
    existingIndex >= 0 ? normalizeSavedRoute(library[existingIndex]) : null;
  const savedRoute = createSavedRoute(route, {
    id: existing?.id ?? id ?? createId(),
    now,
  });

  if (existing) {
    savedRoute.createdAt = existing.createdAt;
    savedRoute.updatedAt = now;
  }

  if (existingIndex >= 0) {
    const nextLibrary = [...library];
    nextLibrary[existingIndex] = savedRoute;
    return nextLibrary.map(normalizeSavedRoute).filter(Boolean);
  }

  return [savedRoute, ...library].map(normalizeSavedRoute).filter(Boolean);
}

export function duplicateSavedRoute(
  library,
  savedRouteId,
  { now = new Date().toISOString() } = {},
) {
  const sourceIndex = library.findIndex((entry) => entry.id === savedRouteId);
  if (sourceIndex === -1) return library;

  const source = library[sourceIndex];
  const route = savedRouteToRoute(source);
  const copy = createSavedRoute(
    {
      ...route,
      name: `${route.name} copy`,
    },
    { now },
  );

  const nextLibrary = [...library];
  nextLibrary.splice(sourceIndex + 1, 0, copy);
  return nextLibrary.map(normalizeSavedRoute).filter(Boolean);
}

export function deleteSavedRoute(library, savedRouteId) {
  return library
    .filter((entry) => entry.id !== savedRouteId)
    .map(normalizeSavedRoute)
    .filter(Boolean);
}

export function getSavedRoute(library, savedRouteId) {
  return library.find((entry) => entry.id === savedRouteId) ?? null;
}

export function normalizeSavedRoute(savedRoute) {
  if (!savedRoute || typeof savedRoute !== 'object') return null;

  try {
    const route = createRoute(savedRoute);
    const createdAt = normalizeDate(savedRoute.createdAt);
    const updatedAt = normalizeDate(
      savedRoute.updatedAt ?? savedRoute.createdAt,
    );

    return {
      schemaVersion: ROUTE_LIBRARY_SCHEMA_VERSION,
      id: String(savedRoute.id || createId()),
      name: route.name,
      activityType: route.activityType,
      loop: route.loop,
      points: route.points,
      distanceMeters: routeDistanceMeters(route),
      durationSeconds: routeDurationMinutes(route) * 60,
      routedGeometry: route.routedGeometry,
      createdAt,
      updatedAt,
    };
  } catch {
    return null;
  }
}

function normalizeDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `route-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
