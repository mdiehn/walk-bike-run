export function createRoute({ name = 'Untitled route', points = [] } = {}) {
  return {
    id: crypto.randomUUID(),
    name,
    points: [...points],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createPoint({ lat, lng, name } = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new TypeError('createPoint requires finite lat and lng values');
  }

  return {
    id: crypto.randomUUID(),
    lat,
    lng,
    name: name || `Point ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
  };
}

export function addPoint(route, point) {
  return touchRoute({
    ...route,
    points: [...route.points, point],
  });
}

export function removePoint(route, pointId) {
  return touchRoute({
    ...route,
    points: route.points.filter((point) => point.id !== pointId),
  });
}

export function movePoint(route, fromIndex, toIndex) {
  const points = [...route.points];

  if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) {
    throw new TypeError('movePoint requires integer indexes');
  }

  if (fromIndex < 0 || fromIndex >= points.length || toIndex < 0 || toIndex >= points.length) {
    throw new RangeError('movePoint indexes are out of range');
  }

  const [point] = points.splice(fromIndex, 1);
  points.splice(toIndex, 0, point);

  return touchRoute({ ...route, points });
}

function touchRoute(route) {
  return {
    ...route,
    updatedAt: new Date().toISOString(),
  };
}
