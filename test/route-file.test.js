import { describe, expect, it } from "vitest";

import { addPoint, createRoute, setLoop } from "../src/route-model.js";
import {
  createRouteFile,
  parseRouteFile,
  serializeRouteFile,
} from "../src/route-file.js";

function sampleRoute() {
  const route = createRoute({ name: "Morning loop", activityType: "run" });
  return setLoop(
    addPoint(
      addPoint(route, {
        id: "point-a",
        name: "Start",
        lat: 43.6426,
        lng: -72.2518,
      }),
      {
        id: "point-b",
        name: "Turnaround",
        lat: 43.6526,
        lng: -72.2618,
      },
    ),
    true,
  );
}

describe("route file", () => {
  it("creates a versioned route export envelope", () => {
    expect(
      createRouteFile(sampleRoute(), {
        appVersion: "0.2.0-dev",
        now: "2026-05-03T13:00:00.000Z",
      }),
    ).toMatchObject({
      schemaVersion: 1,
      kind: "walk-bike-run.route",
      appVersion: "0.2.0-dev",
      exportedAt: "2026-05-03T13:00:00.000Z",
      route: {
        name: "Morning loop",
        activityType: "run",
        loop: true,
        points: [
          { id: "point-a", name: "Start" },
          { id: "point-b", name: "Turnaround" },
        ],
      },
    });
  });

  it("round-trips a current route through JSON", () => {
    const route = sampleRoute();
    const json = serializeRouteFile(route, {
      appVersion: "0.2.0-dev",
      now: "2026-05-03T13:00:00.000Z",
    });

    expect(parseRouteFile(json)).toEqual(route);
  });

  it("rejects files that are not app route exports", () => {
    expect(() => parseRouteFile("{not json")).toThrow(
      "Route file is not valid JSON.",
    );
    expect(() => parseRouteFile("[]")).toThrow(
      "Route file does not contain a route export.",
    );
    expect(() =>
      parseRouteFile('{"kind":"something-else","schemaVersion":1}'),
    ).toThrow("Route file is not a Walk Bike Run route export.");
    expect(() =>
      parseRouteFile(
        '{"kind":"walk-bike-run.route","schemaVersion":99,"route":{}}',
      ),
    ).toThrow("Unsupported route file schema version: 99.");
  });
});
