import { describe, expect, it } from "vitest";

import { createRoute } from "../src/route-model.js";
import { createSavedRoute } from "../src/route-library.js";
import { getVisibleSavedRoutes } from "../src/route-library-view.js";

const savedRoutes = [
  createSavedRoute(
    createRoute({
      name: "Zoo run",
      activityType: "run",
      points: [
        { id: "r1", name: "A", lat: 43, lng: -72 },
        { id: "r2", name: "B", lat: 43.02, lng: -72 },
      ],
    }),
    { id: "run", now: "2026-05-03T12:00:00.000Z" },
  ),
  createSavedRoute(
    createRoute({
      name: "Apple walk",
      activityType: "walk",
      points: [{ id: "w1", name: "A", lat: 43, lng: -72 }],
    }),
    { id: "walk", now: "2026-05-03T13:00:00.000Z" },
  ),
  createSavedRoute(
    createRoute({
      name: "Bike loop",
      activityType: "bike",
      points: [
        { id: "b1", name: "A", lat: 43, lng: -72 },
        { id: "b2", name: "B", lat: 43.1, lng: -72 },
        { id: "b3", name: "C", lat: 43.2, lng: -72 },
      ],
    }),
    { id: "bike", now: "2026-05-03T14:00:00.000Z" },
  ),
];

describe("route library view", () => {
  it("keeps saved order by default", () => {
    expect(getVisibleSavedRoutes(savedRoutes).map((route) => route.id)).toEqual(
      ["run", "walk", "bike"],
    );
  });

  it("filters by activity", () => {
    expect(
      getVisibleSavedRoutes(savedRoutes, { activityFilter: "bike" }).map(
        (route) => route.id,
      ),
    ).toEqual(["bike"]);
  });

  it("sorts by name", () => {
    expect(
      getVisibleSavedRoutes(savedRoutes, { sortBy: "name" }).map(
        (route) => route.name,
      ),
    ).toEqual(["Apple walk", "Bike loop", "Zoo run"]);
  });

  it("sorts by point count", () => {
    expect(
      getVisibleSavedRoutes(savedRoutes, { sortBy: "points" }).map(
        (route) => route.id,
      ),
    ).toEqual(["bike", "run", "walk"]);
  });

  it("sorts by updated date", () => {
    expect(
      getVisibleSavedRoutes(savedRoutes, { sortBy: "updated" }).map(
        (route) => route.id,
      ),
    ).toEqual(["bike", "walk", "run"]);
  });
});
