import { describe, expect, it } from "vitest";

import {
  activitySpeedMph,
  addPoint,
  clearPoints,
  createRoute,
  deletePoint,
  estimatedDurationMinutes,
  movePoint,
  setLoop,
  totalDistanceMeters,
  updatePoint,
  updateRoute,
} from "../src/route-model.js";

describe("route model", () => {
  it("creates a route with safe defaults", () => {
    const route = createRoute();

    expect(route.name).toBe("Untitled route");
    expect(route.activityType).toBe("walk");
    expect(route.loop).toBe(false);
    expect(route.points).toHaveLength(0);
  });

  it("updates route metadata without touching points", () => {
    const route = createRoute({
      points: [{ id: "a", name: "A", lat: 43, lng: -72 }],
    });
    const updated = updateRoute(route, {
      name: "Lunch walk",
      activityType: "run",
    });

    expect(updated.name).toBe("Lunch walk");
    expect(updated.activityType).toBe("run");
    expect(updated.points).toEqual(route.points);
  });

  it("adds and deletes points without mutating the original route", () => {
    const route = createRoute();
    const withPoint = addPoint(route, {
      id: "a",
      name: "A",
      lat: 43,
      lng: -72,
    });
    const deleted = deletePoint(withPoint, "a");

    expect(route.points).toHaveLength(0);
    expect(withPoint.points).toHaveLength(1);
    expect(deleted.points).toHaveLength(0);
  });

  it("updates a point without mutating the original route", () => {
    const route = createRoute({
      points: [{ id: "a", name: "A", lat: 43, lng: -72 }],
    });
    const updated = updatePoint(route, "a", { name: "Moved point", lat: 44 });

    expect(route.points[0].name).toBe("A");
    expect(updated.points[0].name).toBe("Moved point");
    expect(updated.points[0].lat).toBe(44);
    expect(updated.points[0].lng).toBe(-72);
  });

  it("moves points up and down", () => {
    const route = createRoute({
      points: [
        { id: "a", name: "A", lat: 43, lng: -72 },
        { id: "b", name: "B", lat: 44, lng: -72 },
        { id: "c", name: "C", lat: 45, lng: -72 },
      ],
    });

    const movedDown = movePoint(route, "a", 1);
    const movedUp = movePoint(movedDown, "a", -1);

    expect(movedDown.points.map((point) => point.id)).toEqual(["b", "a", "c"]);
    expect(movedUp.points.map((point) => point.id)).toEqual(["a", "b", "c"]);
  });

  it("does not move a point past either end of the route", () => {
    const route = createRoute({
      points: [
        { id: "a", name: "A", lat: 43, lng: -72 },
        { id: "b", name: "B", lat: 44, lng: -72 },
      ],
    });

    expect(movePoint(route, "a", -1)).toBe(route);
    expect(movePoint(route, "b", 1)).toBe(route);
  });

  it("calculates distance between route points", () => {
    const route = createRoute({
      points: [
        { id: "a", name: "A", lat: 43.6426, lng: -72.2518 },
        { id: "b", name: "B", lat: 43.6476, lng: -72.2518 },
      ],
    });

    expect(totalDistanceMeters(route)).toBeGreaterThan(500);
  });

  it("adds loop distance when loop is enabled", () => {
    const route = createRoute({
      points: [
        { id: "a", name: "A", lat: 43.6426, lng: -72.2518 },
        { id: "b", name: "B", lat: 43.6476, lng: -72.2518 },
        { id: "c", name: "C", lat: 43.6476, lng: -72.2418 },
      ],
    });

    const openDistance = totalDistanceMeters(route);
    const loopDistance = totalDistanceMeters(setLoop(route, true));

    expect(loopDistance).toBeGreaterThan(openDistance);
  });

  it("uses simple activity speeds for estimates", () => {
    expect(activitySpeedMph("walk")).toBe(3);
    expect(activitySpeedMph("bike")).toBe(12);
    expect(activitySpeedMph("run")).toBe(6);
    expect(activitySpeedMph("unknown")).toBe(3);
  });

  it("estimates duration from straight-line distance and activity", () => {
    const walkRoute = createRoute({
      activityType: "walk",
      points: [
        { id: "a", name: "A", lat: 43.6426, lng: -72.2518 },
        { id: "b", name: "B", lat: 43.6626, lng: -72.2518 },
      ],
    });
    const bikeRoute = updateRoute(walkRoute, { activityType: "bike" });

    expect(estimatedDurationMinutes(walkRoute)).toBeGreaterThan(0);
    expect(estimatedDurationMinutes(bikeRoute)).toBeLessThan(
      estimatedDurationMinutes(walkRoute),
    );
    expect(estimatedDurationMinutes(createRoute())).toBe(0);
  });

  it("clears points", () => {
    const route = createRoute({
      points: [{ id: "a", name: "A", lat: 43, lng: -72 }],
    });

    expect(clearPoints(route).points).toHaveLength(0);
  });
});
