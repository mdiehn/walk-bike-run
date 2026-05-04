import { createRoute } from "./route-model.js";

const GPX_XMLNS = "http://www.topografix.com/GPX/1/1";
const LOOP_COORDINATE_TOLERANCE = 0.000001;

export function serializeRouteGpx(
  route,
  { appVersion = "dev", now = new Date().toISOString() } = {},
) {
  const normalizedRoute = createRoute(route);
  const exportedAt = normalizeDate(now);
  const points = getExportPoints(normalizedRoute);

  const routePoints = points
    .map(
      (
        point,
      ) => `    <rtept lat="${formatCoordinate(point.lat)}" lon="${formatCoordinate(point.lng)}">
      <name>${escapeXml(point.name)}</name>
    </rtept>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Walk Bike Run ${escapeXml(appVersion)}" xmlns="${GPX_XMLNS}">
  <metadata>
    <name>${escapeXml(normalizedRoute.name)}</name>
    <time>${exportedAt}</time>
  </metadata>
  <rte>
    <name>${escapeXml(normalizedRoute.name)}</name>
    <type>${escapeXml(normalizedRoute.activityType)}</type>
${routePoints}
  </rte>
</gpx>
`;
}

export function parseRouteGpx(text) {
  const xml = String(text ?? "");

  if (!/<gpx\b/i.test(xml)) {
    throw new Error("GPX file does not contain a GPX document.");
  }

  const routeBlock = firstBlock(xml, "rte");
  const trackBlock = firstBlock(xml, "trk");
  const block = routeBlock || trackBlock || xml;
  const pointTags = routeBlock
    ? matchPointTags(block, "rtept")
    : matchPointTags(block, "trkpt");

  if (pointTags.length === 0) {
    throw new Error("GPX file does not contain route or track points.");
  }

  const points = pointTags.map((pointTag, index) => {
    const lat = getAttribute(pointTag.openTag, "lat");
    const lng = getAttribute(pointTag.openTag, "lon");

    if (lat === null || lng === null) {
      throw new Error("GPX point is missing lat or lon coordinates.");
    }

    return {
      name:
        extractFirstElement(pointTag.innerXml, "name") ||
        `GPX point ${index + 1}`,
      lat: Number(lat),
      lng: Number(lng),
    };
  });

  const loop = pointsFormLoop(points);
  const routePoints = loop ? points.slice(0, -1) : points;

  if (routePoints.length === 0) {
    throw new Error("GPX file does not contain route or track points.");
  }

  return createRoute({
    name:
      extractFirstElement(block, "name") ||
      extractFirstElement(xml, "name") ||
      "Imported GPX route",
    activityType: extractFirstElement(block, "type") || "walk",
    loop,
    points: routePoints,
  });
}

function getExportPoints(route) {
  if (route.loop && route.points.length > 2) {
    return [...route.points, route.points[0]];
  }

  return route.points;
}

function firstBlock(xml, tagName) {
  const match = xml.match(
    new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}>`, "i"),
  );
  return match?.[0] ?? null;
}

function matchPointTags(xml, tagName) {
  return [
    ...xml.matchAll(
      new RegExp(
        `(<${tagName}\\b[^>]*\\/>|<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>)`,
        "gi",
      ),
    ),
  ].map((match) => ({
    openTag: match[1],
    innerXml: match[2] ?? "",
  }));
}

function getAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}=["']([^"']+)["']`, "i"));
  return match?.[1] ?? null;
}

function extractFirstElement(xml, tagName) {
  const match = xml.match(
    new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"),
  );
  if (!match) return null;

  const value = decodeXml(match[1]).trim();
  return value || null;
}

function pointsFormLoop(points) {
  if (points.length < 4) return false;

  const first = points[0];
  const last = points[points.length - 1];

  return (
    Math.abs(first.lat - last.lat) <= LOOP_COORDINATE_TOLERANCE &&
    Math.abs(first.lng - last.lng) <= LOOP_COORDINATE_TOLERANCE
  );
}

function formatCoordinate(value) {
  return Number(value).toFixed(7).replace(/0+$/, "").replace(/\.$/, "");
}

function normalizeDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function decodeXml(value) {
  return String(value ?? "")
    .replaceAll("&apos;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
}
