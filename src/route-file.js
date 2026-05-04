import { createRoute } from "./route-model.js";

export const ROUTE_FILE_KIND = "walk-bike-run.route";
export const ROUTE_FILE_SCHEMA_VERSION = 1;

export function createRouteFile(
  route,
  { appVersion = "dev", now = new Date().toISOString() } = {},
) {
  return {
    schemaVersion: ROUTE_FILE_SCHEMA_VERSION,
    kind: ROUTE_FILE_KIND,
    appVersion: String(appVersion),
    exportedAt: normalizeDate(now),
    route: createRoute(route),
  };
}

export function serializeRouteFile(route, options = {}) {
  return `${JSON.stringify(createRouteFile(route, options), null, 2)}\n`;
}

export function parseRouteFile(text) {
  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Route file is not valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Route file does not contain a route export.");
  }

  if (parsed.kind !== ROUTE_FILE_KIND) {
    throw new Error("Route file is not a Walk Bike Run route export.");
  }

  if (parsed.schemaVersion !== ROUTE_FILE_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported route file schema version: ${parsed.schemaVersion}.`,
    );
  }

  if (
    !parsed.route ||
    typeof parsed.route !== "object" ||
    Array.isArray(parsed.route)
  ) {
    throw new Error("Route file does not contain a route.");
  }

  try {
    return createRoute(parsed.route);
  } catch {
    throw new Error("Route file contains an invalid route.");
  }
}

function normalizeDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}
