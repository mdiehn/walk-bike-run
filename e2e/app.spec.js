import { expect, test } from "@playwright/test";

test("loads the route editor shell", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Walk Bike Run/);
  await expect(
    page.getByRole("heading", { name: "Build a route." }),
  ).toBeVisible();
  await expect(page.getByTestId("map")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Route list" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Route file" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Library", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Library backup" }),
  ).toBeVisible();
});

test("adds, renames, reorders, and clears route points", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Add point at map center" }).click();
  await page.getByRole("button", { name: "Add point at map center" }).click();

  await expect(page.getByTestId("point-count")).toHaveText("2");
  await expect(page.getByTestId("point-list")).toContainText("Point 1");
  await expect(page.getByTestId("point-list")).toContainText("Point 2");

  const secondPointName = page.getByLabel("Point 2 name");
  await secondPointName.fill("Turnaround");
  await secondPointName.blur();
  await expect(secondPointName).toHaveValue("Turnaround");

  await page.getByRole("button", { name: "Up" }).last().click();
  await expect(page.getByLabel("Point 1 name")).toHaveValue("Turnaround");

  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.getByTestId("point-count")).toHaveText("0");
  await expect(page.getByTestId("point-list")).toContainText("No points yet.");
});

test("saves, loads, copies, and deletes routes in the local library", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByLabel("Route name").fill("Library test walk");
  await page.getByLabel("Route name").blur();
  await page.getByRole("button", { name: "Add point at map center" }).click();
  await page.getByRole("button", { name: "Save route" }).click();

  await expect(page.getByTestId("save-status")).toHaveText(
    "Saved in route library",
  );
  await expect(page.getByTestId("saved-route-list")).toContainText(
    "Library test walk",
  );

  await page.getByRole("button", { name: "New route" }).click();
  await expect(page.getByLabel("Route name")).toHaveValue("New route");

  await page
    .getByTestId("saved-route-list")
    .getByRole("button", { name: "Load" })
    .click();
  await expect(page.getByLabel("Route name")).toHaveValue("Library test walk");
  await expect(page.getByTestId("point-count")).toHaveText("1");

  await page
    .getByTestId("saved-route-list")
    .getByRole("button", { name: "Copy" })
    .click();
  await expect(page.getByTestId("saved-route-list")).toContainText(
    "Library test walk copy",
  );

  await page
    .getByTestId("saved-route-list")
    .getByRole("button", { name: "Delete" })
    .first()
    .click();
  await expect(page.getByTestId("saved-route-list")).toContainText(
    "Library test walk",
  );
});

test("shows route library backup controls", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Export JSON" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Import JSON" })).toBeVisible();
  await expect(page.getByTestId("backup-status")).toHaveText(
    "Back up saved routes as app JSON.",
  );
});

test("shows current route JSON controls", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("button", { name: "Export current route JSON" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Import current route JSON" }),
  ).toBeVisible();
  await expect(page.getByTestId("route-file-status")).toHaveText(
    "Export or import one route as app JSON.",
  );
});

test("stages and cancels current route JSON import", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Route name").fill("Keep current route");
  await page.getByLabel("Route name").blur();

  await page.locator("#importCurrentRouteFile").setInputFiles({
    name: "route.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify(createRouteFileFixture("Imported route")),
    ),
  });

  await expect(page.getByTestId("route-file-status")).toHaveText(
    "Review the route import before replacing the current route.",
  );
  await expect(page.getByTestId("route-import-preview")).toContainText(
    "route.json contains",
  );
  await expect(page.getByTestId("route-import-preview")).toContainText(
    "Imported route",
  );

  await page.getByRole("button", { name: "Cancel route import" }).click();

  await expect(page.getByTestId("route-file-status")).toHaveText(
    "Route import canceled.",
  );
  await expect(page.getByTestId("route-import-preview")).toBeHidden();
  await expect(page.getByLabel("Route name")).toHaveValue("Keep current route");
});

test("confirms current route JSON import replacement", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Route name").fill("Replace current route");
  await page.getByLabel("Route name").blur();

  await page.locator("#importCurrentRouteFile").setInputFiles({
    name: "route.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify(createRouteFileFixture("Imported route")),
    ),
  });

  await page.getByRole("button", { name: "Replace current route" }).click();

  await expect(page.getByTestId("route-file-status")).toHaveText(
    "Imported route: Imported route.",
  );
  await expect(page.getByTestId("route-import-preview")).toBeHidden();
  await expect(page.getByLabel("Route name")).toHaveValue("Imported route");
  await expect(page.getByTestId("point-count")).toHaveText("1");
  await expect(page.getByTestId("saved-route-list")).toContainText(
    "No saved routes yet.",
  );
});

test("stages and cancels route library JSON import", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Route name").fill("Keep this route");
  await page.getByLabel("Route name").blur();
  await page.getByRole("button", { name: "Add point at map center" }).click();
  await page.getByRole("button", { name: "Save route" }).click();

  await page.locator("#importLibraryFile").setInputFiles({
    name: "routes.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify(createRouteLibraryBackupFixture("Imported route")),
    ),
  });

  await expect(page.getByTestId("backup-status")).toHaveText(
    "Review the import before replacing your library.",
  );
  await expect(page.getByTestId("import-preview")).toContainText(
    "routes.json contains 1 saved route",
  );
  await expect(page.getByTestId("import-preview")).toContainText(
    "current 1 saved route",
  );

  await page.getByRole("button", { name: "Cancel import" }).click();

  await expect(page.getByTestId("backup-status")).toHaveText(
    "Import canceled.",
  );
  await expect(page.getByTestId("import-preview")).toBeHidden();
  await expect(page.getByTestId("saved-route-list")).toContainText(
    "Keep this route",
  );
  await expect(page.getByTestId("saved-route-list")).not.toContainText(
    "Imported route",
  );
});

test("confirms route library JSON import replacement", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Route name").fill("Replace this route");
  await page.getByLabel("Route name").blur();
  await page.getByRole("button", { name: "Add point at map center" }).click();
  await page.getByRole("button", { name: "Save route" }).click();

  await page.locator("#importLibraryFile").setInputFiles({
    name: "routes.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify(createRouteLibraryBackupFixture("Imported route")),
    ),
  });

  await page.getByRole("button", { name: "Replace library" }).click();

  await expect(page.getByTestId("backup-status")).toHaveText(
    "Imported 1 saved route.",
  );
  await expect(page.getByTestId("import-preview")).toBeHidden();
  await expect(page.getByTestId("saved-route-list")).toContainText(
    "Imported route",
  );
  await expect(page.getByTestId("saved-route-list")).not.toContainText(
    "Replace this route",
  );
});

function createRouteLibraryBackupFixture(routeName) {
  return {
    schemaVersion: 1,
    kind: "walk-bike-run.route-library-backup",
    appVersion: "0.2.0-dev",
    exportedAt: "2026-05-03T13:00:00.000Z",
    routes: [
      {
        schemaVersion: 1,
        id: "saved-imported",
        name: routeName,
        activityType: "walk",
        loop: false,
        points: [
          {
            id: "point-imported",
            name: "Imported point",
            lat: 43.6426,
            lng: -72.2518,
          },
        ],
        distanceMeters: 0,
        createdAt: "2026-05-03T12:00:00.000Z",
        updatedAt: "2026-05-03T12:00:00.000Z",
      },
    ],
  };
}

function createRouteFileFixture(routeName) {
  return {
    schemaVersion: 1,
    kind: "walk-bike-run.route",
    appVersion: "0.2.0-dev",
    exportedAt: "2026-05-03T13:00:00.000Z",
    route: {
      name: routeName,
      activityType: "bike",
      loop: false,
      points: [
        {
          id: "point-imported-route",
          name: "Imported route point",
          lat: 43.6426,
          lng: -72.2518,
        },
      ],
    },
  };
}
