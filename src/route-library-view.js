const SORTERS = {
  saved: () => 0,
  name: (left, right) => compareStrings(left.name, right.name),
  distance: (left, right) =>
    compareNumbers(right.distanceMeters, left.distanceMeters),
  points: (left, right) =>
    compareNumbers(right.points.length, left.points.length),
  updated: (left, right) => compareDates(right.updatedAt, left.updatedAt),
  activity: (left, right) =>
    compareStrings(left.activityType, right.activityType) ||
    compareStrings(left.name, right.name),
};

export function getVisibleSavedRoutes(
  library,
  { activityFilter = "all", sortBy = "saved" } = {},
) {
  const sorter = SORTERS[sortBy] ?? SORTERS.saved;

  return library
    .map((route, index) => ({ route, index }))
    .filter(({ route }) =>
      activityFilter === "all" ? true : route.activityType === activityFilter,
    )
    .sort(
      (left, right) =>
        sorter(left.route, right.route) ||
        compareNumbers(left.index, right.index),
    )
    .map(({ route }) => route);
}

function compareStrings(left, right) {
  return String(left ?? "").localeCompare(String(right ?? ""), undefined, {
    sensitivity: "base",
    numeric: true,
  });
}

function compareNumbers(left, right) {
  return Number(left ?? 0) - Number(right ?? 0);
}

function compareDates(left, right) {
  return new Date(left).getTime() - new Date(right).getTime();
}
