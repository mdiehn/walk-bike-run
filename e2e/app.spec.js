import { expect, test } from '@playwright/test';

test('loads the route editor shell', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Walk Bike Run/);
  await expect(
    page.getByRole('heading', { name: 'Build a route.' }),
  ).toBeVisible();
  await expect(page.getByTestId('map')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Route list' })).toBeVisible();
  await expect(page.getByTestId('distance-text')).toHaveText('0.00 mi');
  await expect(page.getByTestId('estimated-time')).toHaveText('0m');
  await expect(page.getByTestId('pace-text')).toHaveText('20:00 m/mi');
  await expect(page.getByRole('tab', { name: 'Library' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Current route backup' }),
  ).toBeVisible();
});

test('updates route stats when activity changes', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('pace-text')).toHaveText('20:00 m/mi');
  await page.locator('#activityType').selectOption('run');
  await expect(page.getByTestId('pace-text')).toHaveText('10:00 m/mi');
  await page.locator('#activityType').selectOption('bike');
  await expect(page.getByTestId('pace-text')).toHaveText('12.0 mph');
});

test('uses cached routed geometry on reload without routing again', async ({
  page,
}) => {
  let routeRequests = 0;
  const cachedRoute = createCachedRouteFixture();
  await page.route('https://router.project-osrm.org/**', async (route) => {
    routeRequests += 1;
    await route.abort();
  });
  await page.addInitScript((route) => {
    localStorage.setItem(
      'walkBikeRun.appState',
      JSON.stringify({
        route,
        routeDirty: false,
        activeRouteTab: 'current',
      }),
    );
  }, cachedRoute);

  await page.goto('/');

  await expect(page.getByTestId('distance-text')).toHaveText('1.55 mi');
  await expect(page.getByTestId('estimated-time')).toHaveText('30m');
  await expect(page.getByTestId('routing-status')).toHaveText(
    'Routed with OSRM.',
  );
  expect(routeRequests).toBe(0);
});

test('keeps cached geometry as stale reference after point edits', async ({
  page,
}) => {
  let routeRequests = 0;
  const cachedRoute = createCachedRouteFixture();
  await page.route('https://router.project-osrm.org/**', async (route) => {
    routeRequests += 1;
    await route.abort();
  });
  await page.addInitScript((route) => {
    localStorage.setItem(
      'walkBikeRun.appState',
      JSON.stringify({
        route,
        routeDirty: false,
        activeRouteTab: 'current',
      }),
    );
  }, cachedRoute);

  await page.goto('/');
  await addPointAtMap(page);

  await expect(page.getByTestId('routing-status')).toHaveText(
    'Route changed; showing stale routed geometry until you recalculate.',
  );
  await expect(page.getByTestId('recalculate-route-button')).toBeEnabled();
  expect(routeRequests).toBe(0);
});

test('adds, renames, reorders, and clears route points', async ({ page }) => {
  await page.goto('/');

  await addPointAtMap(page);
  await addPointAtMap(page);

  await expect(page.getByTestId('point-row')).toHaveCount(2);
  await expect(page.getByTestId('point-list')).toContainText('Point 1');
  await expect(page.getByTestId('point-list')).toContainText('Point 2');

  const secondPointName = page.getByLabel('Point 2 name');
  await secondPointName.fill('Turnaround');
  await secondPointName.blur();
  await expect(secondPointName).toHaveValue('Turnaround');

  await page.getByRole('button', { name: 'Up' }).last().click();
  await expect(page.getByLabel('Point 1 name')).toHaveValue('Turnaround');

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Clear this route');
    await dialog.accept();
  });
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByTestId('point-row')).toHaveCount(0);
  await expect(page.getByTestId('point-list')).toContainText('No points yet.');
});

test('guards clearing unsaved route changes', async ({ page }) => {
  await page.goto('/');

  await addPointAtMap(page);
  await expect(page.getByTestId('save-status')).toHaveText('New unsaved route');

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Clear this route');
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByTestId('point-row')).toHaveCount(1);

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Clear this route');
    await dialog.accept();
  });
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByTestId('point-row')).toHaveCount(0);
});

test('saves, loads, updates, and deletes routes in the local library', async ({
  page,
}) => {
  await page.goto('/');

  await page.getByLabel('Route name').fill('Library test walk');
  await page.getByLabel('Route name').blur();
  await addPointAtMap(page);
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await expect(page.getByTestId('save-status')).toHaveText('Saved');
  await openLibraryTab(page);
  await expect(page.getByTestId('saved-route-list')).toContainText(
    'Library test walk',
  );
  const savedRouteRow = page.getByTestId('saved-route-row').first();
  await expect(savedRouteRow.getByTestId('saved-route-mode')).toContainText(
    'Walk',
  );
  await expect(savedRouteRow.getByTestId('saved-route-distance')).toContainText(
    '0.00 mi',
  );
  await expect(savedRouteRow.getByTestId('saved-route-meta')).toContainText(
    '1 point',
  );
  await expect(savedRouteRow.getByTestId('saved-route-updated')).toContainText(
    'Updated',
  );

  await openCurrentRouteTab(page);
  await clearCurrentRoute(page);
  await expect(page.getByLabel('Route name')).toHaveValue('New route');

  await openLibraryTab(page);
  const libraryTestRow = page
    .getByTestId('saved-route-row')
    .filter({ hasText: 'Library test walk' });
  await expect(page.getByTestId('selected-route-status')).toHaveCount(0);
  await libraryTestRow.getByRole('button', { name: 'Load' }).click();
  await expect(page.getByLabel('Route name')).toHaveValue('Library test walk');
  await expect(page.getByTestId('point-row')).toHaveCount(1);

  await openCurrentRouteTab(page);
  await addPointAtMap(page);
  await openLibraryTab(page);
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Overwrite "Library test walk"');
    await dialog.accept();
  });
  await libraryTestRow.getByRole('button', { name: 'Overwrite' }).click();
  await expect(libraryTestRow.getByTestId('saved-route-meta')).toContainText(
    '2 points',
  );

  await libraryTestRow
    .getByRole('button', { name: 'Delete Library test walk' })
    .click();
  await expect(page.getByTestId('saved-route-list')).not.toContainText(
    'Library test walk',
  );
});

test('clicking a saved route row does not load it', async ({ page }) => {
  await page.goto('/');

  await addPointAtMap(page);
  await page.getByLabel('Route name').fill('First saved route');
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await clearCurrentRoute(page);
  await addPointAtMap(page);
  await page.getByLabel('Route name').fill('Second saved route');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await openLibraryTab(page);

  const rows = page.getByTestId('saved-route-row');
  await expect(rows.filter({ hasText: 'Second saved route' })).toHaveClass(
    /is-current/,
  );
  await expect(rows.filter({ hasText: 'First saved route' })).not.toHaveClass(
    /is-current/,
  );
  await expect(page.getByTestId('selected-route-status')).toHaveCount(0);

  await rows.filter({ hasText: 'First saved route' }).click();

  await expect(page.getByLabel('Route name')).toHaveValue('Second saved route');
  await expect(rows.filter({ hasText: 'First saved route' })).not.toHaveClass(
    /is-current/,
  );
  await expect(rows.filter({ hasText: 'Second saved route' })).toHaveClass(
    /is-current/,
  );
});

test('shows route library backup controls', async ({ page }) => {
  await page.goto('/');
  await openLibraryTab(page);

  await expect(
    page.getByRole('button', { name: 'Export library JSON' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Import library JSON' }),
  ).toBeVisible();
  await expect(page.getByTestId('backup-status')).toHaveText(
    'Back up saved routes as app JSON.',
  );
});

test('shows current route JSON controls', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('button', { name: 'Export route JSON' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Import route JSON' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export GPX' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Import GPX' })).toBeVisible();
  await expect(page.getByTestId('route-file-status')).toHaveText(
    'Back up or restore the current route as app JSON or GPX.',
  );
});

test('stages and cancels current route JSON import', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Route name').fill('Keep current route');
  await page.getByLabel('Route name').blur();

  await page.locator('#importCurrentRouteFile').setInputFiles({
    name: 'route.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify(createRouteFileFixture('Imported route')),
    ),
  });

  await expect(page.getByTestId('route-file-status')).toHaveText(
    'Review the route import before replacing the current route.',
  );
  await expect(page.getByTestId('route-import-preview')).toContainText(
    'route.json contains',
  );
  await expect(page.getByTestId('route-import-preview')).toContainText(
    'Imported route',
  );

  await page.getByRole('button', { name: 'Cancel route import' }).click();

  await expect(page.getByTestId('route-file-status')).toHaveText(
    'Route import canceled.',
  );
  await expect(page.getByTestId('route-import-preview')).toBeHidden();
  await expect(page.getByLabel('Route name')).toHaveValue('Keep current route');
});

test('confirms current route JSON import replacement', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Route name').fill('Replace current route');
  await page.getByLabel('Route name').blur();

  await page.locator('#importCurrentRouteFile').setInputFiles({
    name: 'route.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify(createRouteFileFixture('Imported route')),
    ),
  });

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Importing this route');
    await dialog.accept();
  });
  await page.getByRole('button', { name: 'Replace current route' }).click();

  await expect(page.getByTestId('route-file-status')).toHaveText(
    'Imported route: Imported route.',
  );
  await expect(page.getByTestId('route-import-preview')).toBeHidden();
  await expect(page.getByLabel('Route name')).toHaveValue('Imported route');
  await expect(page.getByTestId('point-row')).toHaveCount(1);
  await expect(page.getByTestId('saved-route-list')).toContainText(
    'No saved routes yet.',
  );
});

test('stages and confirms current route GPX import', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Route name').fill('Replace with GPX');
  await page.getByLabel('Route name').blur();

  await page.locator('#importCurrentRouteGpxFile').setInputFiles({
    name: 'morning-loop.gpx',
    mimeType: 'application/gpx+xml',
    buffer: Buffer.from(createGpxFixture('Imported GPX route')),
  });

  await expect(page.getByTestId('route-file-status')).toHaveText(
    'Review the GPX import before replacing the current route.',
  );
  await expect(page.getByTestId('route-import-preview')).toContainText(
    'morning-loop.gpx contains',
  );
  await expect(page.getByTestId('route-import-preview')).toContainText(
    'Imported GPX route',
  );

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Importing this route');
    await dialog.accept();
  });
  await page.getByRole('button', { name: 'Replace current route' }).click();

  await expect(page.getByTestId('route-file-status')).toHaveText(
    'Imported route: Imported GPX route.',
  );
  await expect(page.getByLabel('Route name')).toHaveValue('Imported GPX route');
  await expect(page.getByTestId('point-row')).toHaveCount(2);
});

test('stages and cancels route library JSON import', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Route name').fill('Keep this route');
  await page.getByLabel('Route name').blur();
  await addPointAtMap(page);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await openLibraryTab(page);

  await page.locator('#importLibraryFile').setInputFiles({
    name: 'routes.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify(createRouteLibraryBackupFixture('Imported route')),
    ),
  });

  await expect(page.getByTestId('backup-status')).toHaveText(
    'Review the import before replacing your library.',
  );
  await expect(page.getByTestId('import-preview')).toContainText(
    'routes.json contains 1 saved route',
  );
  await expect(page.getByTestId('import-preview')).toContainText(
    'current 1 saved route',
  );

  await page.getByRole('button', { name: 'Cancel import' }).click();

  await expect(page.getByTestId('backup-status')).toHaveText(
    'Import canceled.',
  );
  await expect(page.getByTestId('import-preview')).toBeHidden();
  await expect(page.getByTestId('saved-route-list')).toContainText(
    'Keep this route',
  );
  await expect(page.getByTestId('saved-route-list')).not.toContainText(
    'Imported route',
  );
});

test('confirms route library JSON import replacement', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Route name').fill('Replace this route');
  await page.getByLabel('Route name').blur();
  await addPointAtMap(page);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await openLibraryTab(page);

  await page.locator('#importLibraryFile').setInputFiles({
    name: 'routes.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify(createRouteLibraryBackupFixture('Imported route')),
    ),
  });

  await page.getByRole('button', { name: 'Replace library' }).click();

  await expect(page.getByTestId('backup-status')).toHaveText(
    'Imported 1 saved route.',
  );
  await expect(page.getByTestId('import-preview')).toBeHidden();
  await expect(page.getByTestId('saved-route-list')).toContainText(
    'Imported route',
  );
  await expect(page.getByTestId('saved-route-list')).not.toContainText(
    'Replace this route',
  );
});

test('sorts and filters saved routes in the library', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'walk-bike-run.routeLibrary.v1',
      JSON.stringify([
        createSavedRouteStorageEntry({
          id: 'run-route',
          name: 'Zoo run',
          activityType: 'run',
          updatedAt: '2026-05-03T12:00:00.000Z',
          points: [
            { id: 'run-a', name: 'Start', lat: 43, lng: -72 },
            { id: 'run-b', name: 'End', lat: 43.02, lng: -72 },
          ],
        }),
        createSavedRouteStorageEntry({
          id: 'walk-route',
          name: 'Apple walk',
          activityType: 'walk',
          updatedAt: '2026-05-03T13:00:00.000Z',
          points: [{ id: 'walk-a', name: 'Start', lat: 43, lng: -72 }],
        }),
        createSavedRouteStorageEntry({
          id: 'bike-route',
          name: 'Bike loop',
          activityType: 'bike',
          updatedAt: '2026-05-03T14:00:00.000Z',
          points: [
            { id: 'bike-a', name: 'Start', lat: 43, lng: -72 },
            { id: 'bike-b', name: 'Middle', lat: 43.08, lng: -72 },
            { id: 'bike-c', name: 'End', lat: 43.16, lng: -72 },
          ],
        }),
      ]),
    );

    function createSavedRouteStorageEntry({
      id,
      name,
      activityType,
      updatedAt,
      points,
    }) {
      return {
        schemaVersion: 1,
        id,
        name,
        activityType,
        loop: false,
        points,
        distanceMeters: 0,
        createdAt: updatedAt,
        updatedAt,
      };
    }
  });

  await page.goto('/');
  await openLibraryTab(page);

  expect(await savedRouteNames(page)).toEqual([
    'Zoo run',
    'Apple walk',
    'Bike loop',
  ]);
  await expect(page.getByTestId('library-status')).toContainText(
    '3 of 3 saved routes shown',
  );

  await page.getByTestId('library-sort-name-asc').click();
  expect(await savedRouteNames(page)).toEqual([
    'Apple walk',
    'Bike loop',
    'Zoo run',
  ]);

  await page.getByTestId('library-sort-distance-desc').click();
  expect(await savedRouteNames(page)).toEqual([
    'Bike loop',
    'Zoo run',
    'Apple walk',
  ]);

  await page.getByTestId('library-filter-activity').click();
  await page.getByTestId('library-activity-filter').selectOption('bike');
  expect(await savedRouteNames(page)).toEqual(['Bike loop']);
  await expect(page.getByTestId('library-status')).toContainText(
    '1 of 3 saved routes shown',
  );
  await expect(page.getByTestId('saved-route-list')).not.toContainText(
    'Apple walk',
  );
});

async function addPointAtMap(page) {
  const pointCount = await page.getByTestId('point-row').count();
  const clickPositions = [
    { x: 150, y: 150 },
    { x: 260, y: 190 },
    { x: 210, y: 260 },
    { x: 320, y: 230 },
  ];
  const position = clickPositions[pointCount % clickPositions.length];

  await page.getByTestId('map').click({ position });
}

async function clearCurrentRoute(page) {
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Clear this route');
    await dialog.accept();
  });
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
}

async function openCurrentRouteTab(page) {
  await page.getByRole('tab', { name: 'Current route' }).click();
}

async function openLibraryTab(page) {
  await page.getByRole('tab', { name: 'Library' }).click();
}

async function savedRouteNames(page) {
  return page
    .getByTestId('saved-route-name')
    .evaluateAll((nodes) => nodes.map((node) => node.textContent));
}

function createRouteLibraryBackupFixture(routeName) {
  return {
    schemaVersion: 1,
    kind: 'walk-bike-run.route-library-backup',
    appVersion: '0.2.0-dev',
    exportedAt: '2026-05-03T13:00:00.000Z',
    routes: [
      {
        schemaVersion: 1,
        id: 'saved-imported',
        name: routeName,
        activityType: 'walk',
        loop: false,
        points: [
          {
            id: 'point-imported',
            name: 'Imported point',
            lat: 43.6426,
            lng: -72.2518,
          },
        ],
        distanceMeters: 0,
        createdAt: '2026-05-03T12:00:00.000Z',
        updatedAt: '2026-05-03T12:00:00.000Z',
      },
    ],
  };
}

function createRouteFileFixture(routeName) {
  return {
    schemaVersion: 1,
    kind: 'walk-bike-run.route',
    appVersion: '0.2.0-dev',
    exportedAt: '2026-05-03T13:00:00.000Z',
    route: {
      name: routeName,
      activityType: 'bike',
      loop: false,
      points: [
        {
          id: 'point-imported-route',
          name: 'Imported route point',
          lat: 43.6426,
          lng: -72.2518,
        },
      ],
    },
  };
}

function createCachedRouteFixture() {
  const routeKey =
    'walk:false:osrm:no-worker-url:default-osrm:cached-a:43.000000,-72.000000|cached-b:43.010000,-72.010000';

  return {
    name: 'Cached routed walk',
    activityType: 'walk',
    loop: false,
    points: [
      { id: 'cached-a', name: 'Start', lat: 43, lng: -72 },
      { id: 'cached-b', name: 'Finish', lat: 43.01, lng: -72.01 },
    ],
    routedGeometry: {
      schemaVersion: 1,
      routeKey,
      provider: 'osrm',
      status: 'routed',
      isStale: false,
      distanceMeters: 2500,
      durationSeconds: 1800,
      updatedAt: '2026-05-05T12:00:00.000Z',
      segments: [
        {
          fromIndex: 0,
          toIndex: 1,
          label: 'From prev',
          provider: 'osrm',
          fallback: false,
          distance: 2500,
          duration: 1800,
          coordinates: [
            [43, -72],
            [43.005, -72.004],
            [43.01, -72.01],
          ],
        },
      ],
    },
  };
}

function createGpxFixture(routeName) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Walk Bike Run test">
  <rte>
    <name>${routeName}</name>
    <type>bike</type>
    <rtept lat="43.6426" lon="-72.2518"><name>Start</name></rtept>
    <rtept lat="43.6526" lon="-72.2618"><name>Turnaround</name></rtept>
  </rte>
</gpx>`;
}
