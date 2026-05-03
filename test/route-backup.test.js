import { describe, expect, it } from "vitest";

import { createRoute } from "../src/route-model.js";
import { createSavedRoute } from "../src/route-library.js";
import {
  createRouteLibraryBackup,
  parseRouteLibraryBackup,
  serializeRouteLibraryBackup,
} from "../src/route-backup.js";

describe("route library backup", () => {
  it("creates a versioned backup envelope for saved routes", () => {
    const savedRoute = createSavedRoute(createRoute({ name: "Morning walk" }), {
      id: "saved-a",
      now: "2026-05-03T12:00:00.000Z",
    });

    expect(
      createRouteLibraryBackup([savedRoute], {
        appVersion: "0.2.0-dev",
        now: "2026-05-03T13:00:00.000Z",
      }),
    ).toMatchObject({
      schemaVersion: 1,
      kind: "walk-bike-run.route-library-backup",
      appVersion: "0.2.0-dev",
      exportedAt: "2026-05-03T13:00:00.000Z",
      routes: [savedRoute],
    });
  });

  it("round-trips saved routes through JSON", () => {
    const savedRoute = createSavedRoute(createRoute({ name: "Bike loop" }), {
      id: "saved-b",
      now: "2026-05-03T12:00:00.000Z",
    });

    const json = serializeRouteLibraryBackup([savedRoute], {
      appVersion: "0.2.0-dev",
      now: "2026-05-03T13:00:00.000Z",
    });

    expect(parseRouteLibraryBackup(json)).toEqual([savedRoute]);
  });

  it("normalizes older saved routes during import", () => {
    const routes = parseRouteLibraryBackup(
      JSON.stringify({
        schemaVersion: 1,
        kind: "walk-bike-run.route-library-backup",
        appVersion: "0.2.0-dev",
        exportedAt: "2026-05-03T13:00:00.000Z",
        routes: [
          {
            id: "saved-old",
            name: "Old route",
            activityType: "run",
            loop: false,
            points: [],
            createdAt: "2026-05-03T12:00:00.000Z",
            updatedAt: "2026-05-03T12:00:00.000Z",
          },
        ],
      }),
    );

    expect(routes[0].schemaVersion).toBe(1);
    expect(routes[0].name).toBe("Old route");
  });

  it("rejects files that are not app route library backups", () => {
    expect(() => parseRouteLibraryBackup("{not json")).toThrow(
      "Backup file is not valid JSON.",
    );
    expect(() => parseRouteLibraryBackup("[]")).toThrow(
      "Backup file does not contain a route library backup.",
    );
    expect(() =>
      parseRouteLibraryBackup(
        '{"kind":"something-else","schemaVersion":1,"routes":[]}',
      ),
    ).toThrow("Backup file is not a Walk Bike Run route library backup.");
    expect(() =>
      parseRouteLibraryBackup(
        '{"kind":"walk-bike-run.route-library-backup","schemaVersion":99,"routes":[]}',
      ),
    ).toThrow("Unsupported backup schema version: 99.");
  });
});
