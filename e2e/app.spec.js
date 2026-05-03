import { expect, test } from "@playwright/test";

test("loads the route editor shell", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Walk Bike Run/);
  await expect(
    page.getByRole("heading", { name: "Build a route." }),
  ).toBeVisible();
  await expect(page.getByTestId("map")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Route list" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Library backup" }),
  ).toBeVisible();
});

test("adds, renames, reorders, and clears route points", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Add point at map center" }).click();
  await page.getByRole("button", { name: "Add point at map center" }).click();

  await expect(page.getByTestId("point-count")).toHaveText("2");
  await expect(page.getByTestId("point-list")).toContainText("Map point 1");
  await expect(page.getByTestId("point-list")).toContainText("Map point 2");

  await page.getByLabel("Point 2 name").fill("Turnaround");
  await page.getByLabel("Point 2 name").blur();
  await expect(page.getByTestId("point-list")).toContainText("Turnaround");

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

  await page.getByRole("button", { name: "Load" }).click();
  await expect(page.getByLabel("Route name")).toHaveValue("Library test walk");
  await expect(page.getByTestId("point-count")).toHaveText("1");

  await page.getByRole("button", { name: "Copy" }).click();
  await expect(page.getByTestId("saved-route-list")).toContainText(
    "Library test walk copy",
  );

  await page.getByRole("button", { name: "Delete" }).first().click();
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
