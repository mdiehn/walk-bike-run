import { normalizeSavedRoute } from "./route-library.js";

export const ROUTE_LIBRARY_BACKUP_KIND = "walk-bike-run.route-library-backup";
export const ROUTE_LIBRARY_BACKUP_SCHEMA_VERSION = 1;

export function createRouteLibraryBackup(
  library,
  { appVersion = "dev", now = new Date().toISOString() } = {},
) {
  return {
    schemaVersion: ROUTE_LIBRARY_BACKUP_SCHEMA_VERSION,
    kind: ROUTE_LIBRARY_BACKUP_KIND,
    appVersion: String(appVersion),
    exportedAt: normalizeDate(now),
    routes: normalizeRouteList(library),
  };
}

export function serializeRouteLibraryBackup(library, options = {}) {
  return `${JSON.stringify(createRouteLibraryBackup(library, options), null, 2)}\n`;
}

export function parseRouteLibraryBackup(text) {
  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Backup file is not valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Backup file does not contain a route library backup.");
  }

  if (parsed.kind !== ROUTE_LIBRARY_BACKUP_KIND) {
    throw new Error("Backup file is not a Walk Bike Run route library backup.");
  }

  if (parsed.schemaVersion !== ROUTE_LIBRARY_BACKUP_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported backup schema version: ${parsed.schemaVersion}.`,
    );
  }

  if (!Array.isArray(parsed.routes)) {
    throw new Error("Backup file does not contain a routes list.");
  }

  return normalizeRouteList(parsed.routes);
}

function normalizeRouteList(routes) {
  return routes.map(normalizeSavedRoute).filter(Boolean);
}

function normalizeDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}
