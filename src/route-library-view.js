import { routeDurationMinutes } from './route-model.js';

const SORTERS = {
  saved: () => 0,
  name: (left, right) => compareStrings(left.name, right.name),
  distance: (left, right) =>
    compareNumbers(left.distanceMeters, right.distanceMeters),
  estimatedTime: (left, right) =>
    compareNumbers(routeDurationMinutes(left), routeDurationMinutes(right)),
  points: (left, right) =>
    compareNumbers(left.points.length, right.points.length),
  updated: (left, right) => compareDates(left.updatedAt, right.updatedAt),
  created: (left, right) => compareDates(left.createdAt, right.createdAt),
  activity: (left, right) =>
    compareStrings(left.activityType, right.activityType) ||
    compareStrings(left.name, right.name),
};

export const DEFAULT_LIBRARY_SORT_DIRECTIONS = {
  saved: 'asc',
  name: 'asc',
  activity: 'asc',
  distance: 'desc',
  estimatedTime: 'desc',
  points: 'desc',
  updated: 'desc',
  created: 'desc',
};

export function getVisibleSavedRoutes(
  library,
  {
    activityFilter = 'all',
    nameFilter = '',
    distanceFilter = 'all',
    durationFilter = 'all',
    sortBy = 'saved',
    sortDirection,
  } = {},
) {
  const sorter = SORTERS[sortBy] ?? SORTERS.saved;
  const direction =
    sortDirection ?? DEFAULT_LIBRARY_SORT_DIRECTIONS[sortBy] ?? 'asc';
  const directionFactor = direction === 'desc' ? -1 : 1;

  return library
    .map((route, index) => ({ route, index }))
    .filter(({ route }) =>
      routeMatchesFilters(route, {
        activityFilter,
        nameFilter,
        distanceFilter,
        durationFilter,
      }),
    )
    .sort((left, right) => {
      const sortResult = sorter(left.route, right.route);
      if (sortResult !== 0) return sortResult * directionFactor;
      return compareNumbers(left.index, right.index);
    })
    .map(({ route }) => route);
}

function routeMatchesFilters(
  route,
  { activityFilter, nameFilter, distanceFilter, durationFilter },
) {
  if (activityFilter !== 'all' && route.activityType !== activityFilter) {
    return false;
  }

  if (
    nameFilter.trim() &&
    !route.name.toLowerCase().includes(nameFilter.trim().toLowerCase())
  ) {
    return false;
  }

  if (!distanceMatchesFilter(route.distanceMeters, distanceFilter)) {
    return false;
  }

  if (!durationMatchesFilter(routeDurationMinutes(route), durationFilter)) {
    return false;
  }

  return true;
}

function distanceMatchesFilter(distanceMeters, filter) {
  const distanceMiles = Number(distanceMeters ?? 0) / 1609.344;

  if (filter === 'lt3') return distanceMiles < 3;
  if (filter === '3to10') return distanceMiles >= 3 && distanceMiles < 10;
  if (filter === 'gte10') return distanceMiles >= 10;
  return true;
}

function durationMatchesFilter(minutes, filter) {
  const durationMinutes = Number(minutes ?? 0);

  if (filter === 'lt30') return durationMinutes < 30;
  if (filter === '30to60') return durationMinutes >= 30 && durationMinutes < 60;
  if (filter === 'gte60') return durationMinutes >= 60;
  return true;
}

function compareStrings(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''), undefined, {
    sensitivity: 'base',
    numeric: true,
  });
}

function compareNumbers(left, right) {
  return Number(left ?? 0) - Number(right ?? 0);
}

function compareDates(left, right) {
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();

  if (!Number.isFinite(leftTime) && !Number.isFinite(rightTime)) return 0;
  if (!Number.isFinite(leftTime)) return -1;
  if (!Number.isFinite(rightTime)) return 1;

  return leftTime - rightTime;
}
