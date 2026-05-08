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
    history: [],
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
    savedRoute.history = existing.history;
  }

  if (existingIndex >= 0) {
    const nextLibrary = [...library];
    nextLibrary[existingIndex] = savedRoute;
    return nextLibrary.map(normalizeSavedRoute).filter(Boolean);
  }

  return [savedRoute, ...library].map(normalizeSavedRoute).filter(Boolean);
}

export function addRouteHistoryEntry(
  library,
  route,
  { savedRouteId = null, stats = {}, now = new Date().toISOString() } = {},
) {
  const existingIndex = savedRouteId
    ? library.findIndex((entry) => entry.id === savedRouteId)
    : -1;
  const existing =
    existingIndex >= 0 ? normalizeSavedRoute(library[existingIndex]) : null;
  const routeName = existing
    ? route.name
    : route.name && !['New route', 'Untitled route'].includes(route.name)
      ? route.name
      : 'Unnamed route';
  const routeForHistory = createRoute({ ...route, name: routeName });
  const savedRoute = existing
    ? {
        ...existing,
        updatedAt: now,
      }
    : createSavedRoute(routeForHistory, { now });
  const historyEntry = createRouteHistoryEntry(routeForHistory, {
    routeId: savedRoute.id,
    stats,
    now,
  });
  const updatedSavedRoute = normalizeSavedRoute({
    ...savedRoute,
    history: [historyEntry, ...(savedRoute.history ?? [])],
    updatedAt: now,
  });

  if (!updatedSavedRoute) {
    return {
      library: library.map(normalizeSavedRoute).filter(Boolean),
      savedRouteId: savedRouteId ?? null,
      historyEntry,
    };
  }

  if (existingIndex >= 0) {
    const nextLibrary = [...library];
    nextLibrary[existingIndex] = updatedSavedRoute;
    return {
      library: nextLibrary.map(normalizeSavedRoute).filter(Boolean),
      savedRouteId: updatedSavedRoute.id,
      historyEntry,
    };
  }

  return {
    library: [updatedSavedRoute, ...library]
      .map(normalizeSavedRoute)
      .filter(Boolean),
    savedRouteId: updatedSavedRoute.id,
    historyEntry,
  };
}

export function createRouteHistoryEntry(
  route,
  {
    id = createHistoryId(),
    routeId = null,
    stats = {},
    now = new Date().toISOString(),
  } = {},
) {
  const routeSnapshot = createRoute(route);
  const finishedAt = normalizeDate(
    stats.finishedAt ?? stats.completedAt ?? stats.endedAt ?? now,
  );
  const elapsedSeconds = normalizeNonNegativeNumber(stats.elapsedSeconds, 0);
  const distanceMeters = normalizeNonNegativeNumber(
    stats.distanceMeters,
    routeDistanceMeters(routeSnapshot),
  );

  return {
    schemaVersion: ROUTE_LIBRARY_SCHEMA_VERSION,
    id: String(id),
    routeId: routeId ? String(routeId) : null,
    routeName: routeSnapshot.name,
    activityType: routeSnapshot.activityType,
    distanceMeters,
    elapsedSeconds,
    displayDistance: stats.distance ? String(stats.distance) : '',
    displayElapsed: stats.elapsed ? String(stats.elapsed) : '',
    displayPace: stats.pace ? String(stats.pace) : '',
    startedAt: normalizeDate(stats.startedAt ?? finishedAt),
    finishedAt,
    routeSnapshot,
  };
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
      history: normalizeRouteHistoryList(
        savedRoute.history,
        route,
        String(savedRoute.id || ''),
      ),
      createdAt,
      updatedAt,
    };
  } catch {
    return null;
  }
}

function normalizeRouteHistoryList(history, fallbackRoute, fallbackRouteId) {
  if (!Array.isArray(history)) return [];
  return history
    .map((entry) =>
      normalizeRouteHistoryEntry(entry, fallbackRoute, fallbackRouteId),
    )
    .filter(Boolean);
}

function normalizeRouteHistoryEntry(entry, fallbackRoute, fallbackRouteId) {
  if (!entry || typeof entry !== 'object') return null;

  try {
    const routeSnapshot = createRoute(entry.routeSnapshot ?? fallbackRoute);
    const finishedAt = normalizeDate(entry.finishedAt ?? entry.completedAt);
    const distanceMeters = normalizeNonNegativeNumber(
      entry.distanceMeters,
      routeDistanceMeters(routeSnapshot),
    );
    const elapsedSeconds = normalizeNonNegativeNumber(entry.elapsedSeconds, 0);

    return {
      schemaVersion: ROUTE_LIBRARY_SCHEMA_VERSION,
      id: String(entry.id || createHistoryId()),
      routeId: entry.routeId ? String(entry.routeId) : fallbackRouteId || null,
      routeName: entry.routeName ? String(entry.routeName) : routeSnapshot.name,
      activityType: routeSnapshot.activityType,
      distanceMeters,
      elapsedSeconds,
      displayDistance: entry.displayDistance
        ? String(entry.displayDistance)
        : '',
      displayElapsed: entry.displayElapsed ? String(entry.displayElapsed) : '',
      displayPace: entry.displayPace ? String(entry.displayPace) : '',
      startedAt: normalizeDate(entry.startedAt ?? finishedAt),
      finishedAt,
      routeSnapshot,
    };
  } catch {
    return null;
  }
}

function normalizeNonNegativeNumber(value, fallback) {
  const numberValue = Number(value);
  if (Number.isFinite(numberValue) && numberValue >= 0) return numberValue;
  return fallback;
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

function createHistoryId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `history-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
