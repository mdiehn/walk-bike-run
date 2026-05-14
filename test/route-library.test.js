import { describe, expect, it } from 'vitest';

import {
  addPoint,
  createRoute,
  totalDistanceMeters,
} from '../src/route-model.js';
import {
  addRouteHistoryEntry,
  clearRouteHistory,
  createSavedRoute,
  deleteRouteHistoryEntry,
  deleteSavedRoute,
  duplicateSavedRoute,
  loadRouteLibrary,
  saveRouteLibrary,
  savedRouteToRoute,
  upsertSavedRoute,
} from '../src/route-library.js';

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

describe('route library', () => {
  it('saves and loads route library entries', () => {
    const storage = new MemoryStorage();
    const route = createRoute({
      name: 'Morning walk',
      points: [{ id: 'a', name: 'A', lat: 43, lng: -72 }],
    });

    const savedRoute = createSavedRoute(route, {
      id: 'saved-a',
      now: '2026-05-03T12:00:00.000Z',
    });
    saveRouteLibrary([savedRoute], storage);

    expect(loadRouteLibrary(storage)).toEqual([savedRoute]);
  });

  it('adds schemaVersion when normalizing older saved routes', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'walk-bike-run.routeLibrary.v1',
      JSON.stringify([
        {
          id: 'saved-a',
          name: 'Old route',
          activityType: 'walk',
          loop: false,
          points: [],
          createdAt: '2026-05-03T12:00:00.000Z',
          updatedAt: '2026-05-03T12:00:00.000Z',
        },
      ]),
    );

    expect(loadRouteLibrary(storage)[0].schemaVersion).toBe(1);
  });

  it('returns an empty library when stored data is missing or invalid', () => {
    const storage = new MemoryStorage();
    expect(loadRouteLibrary(storage)).toEqual([]);

    storage.setItem('walk-bike-run.routeLibrary.v1', '{not json');
    expect(loadRouteLibrary(storage)).toEqual([]);
  });

  it('keeps saved route library order when loading', () => {
    const first = createSavedRoute(createRoute({ name: 'First' }), {
      id: 'saved-a',
      now: '2026-05-03T12:00:00.000Z',
    });
    const second = createSavedRoute(createRoute({ name: 'Second' }), {
      id: 'saved-b',
      now: '2026-05-03T13:00:00.000Z',
    });
    const storage = new MemoryStorage();

    saveRouteLibrary([first, second], storage);

    expect(loadRouteLibrary(storage).map((entry) => entry.id)).toEqual([
      'saved-a',
      'saved-b',
    ]);
  });

  it('updates an existing saved route in place without changing its created date', () => {
    const first = createSavedRoute(createRoute({ name: 'First' }), {
      id: 'saved-a',
      now: '2026-05-03T12:00:00.000Z',
    });
    const original = createSavedRoute(createRoute({ name: 'Lunch walk' }), {
      id: 'saved-b',
      now: '2026-05-03T12:30:00.000Z',
    });
    const third = createSavedRoute(createRoute({ name: 'Third' }), {
      id: 'saved-c',
      now: '2026-05-03T13:00:00.000Z',
    });
    const updatedRoute = addPoint(savedRouteToRoute(original), {
      id: 'p1',
      name: 'Point 1',
      lat: 43,
      lng: -72,
    });

    const library = upsertSavedRoute([first, original, third], updatedRoute, {
      id: 'saved-b',
      now: '2026-05-03T14:00:00.000Z',
    });

    expect(library.map((entry) => entry.id)).toEqual([
      'saved-a',
      'saved-b',
      'saved-c',
    ]);
    expect(library[1].createdAt).toBe('2026-05-03T12:30:00.000Z');
    expect(library[1].updatedAt).toBe('2026-05-03T14:00:00.000Z');
    expect(library[1].points).toHaveLength(1);
  });

  it('puts newly saved routes at the top of the library', () => {
    const existing = createSavedRoute(createRoute({ name: 'Existing' }), {
      id: 'saved-a',
      now: '2026-05-03T12:00:00.000Z',
    });

    const library = upsertSavedRoute(
      [existing],
      createRoute({ name: 'New route' }),
      {
        now: '2026-05-03T13:00:00.000Z',
      },
    );

    expect(library).toHaveLength(2);
    expect(library[0].name).toBe('New route');
    expect(library[1].id).toBe('saved-a');
  });

  it('duplicates a saved route next to the source route', () => {
    const first = createSavedRoute(createRoute({ name: 'First' }), {
      id: 'saved-a',
      now: '2026-05-03T12:00:00.000Z',
    });
    const second = createSavedRoute(createRoute({ name: 'Bike loop' }), {
      id: 'saved-b',
      now: '2026-05-03T13:00:00.000Z',
    });

    const duplicated = duplicateSavedRoute([first, second], 'saved-a', {
      now: '2026-05-03T14:00:00.000Z',
    });

    expect(duplicated).toHaveLength(3);
    expect(duplicated.map((entry) => entry.name)).toEqual([
      'First',
      'First copy',
      'Bike loop',
    ]);
  });

  it('saves edited points without letting stale geometry replace route stats', () => {
    const route = createRoute({
      points: [
        { id: 'a', name: 'A', lat: 43, lng: -72 },
        { id: 'b', name: 'B', lat: 43.01, lng: -72.01 },
      ],
      routedGeometry: {
        routeKey: 'old-route-key',
        provider: 'osrm',
        status: 'routed',
        isStale: true,
        distanceMeters: 999999,
        durationSeconds: 999999,
        updatedAt: '2026-05-03T12:00:00.000Z',
        segments: [
          {
            fromIndex: 0,
            toIndex: 1,
            distance: 999999,
            duration: 999999,
            coordinates: [
              [42, -71],
              [42.01, -71.01],
            ],
          },
        ],
      },
    });

    const savedRoute = createSavedRoute(route, {
      id: 'saved-stale',
      now: '2026-05-03T12:00:00.000Z',
    });

    expect(savedRoute.points).toEqual(route.points);
    expect(savedRoute.routedGeometry.isStale).toBe(true);
    expect(savedRoute.distanceMeters).toBe(totalDistanceMeters(route));
  });

  it('attaches completed Go history to the active saved route', () => {
    const savedRoute = createSavedRoute(
      createRoute({
        name: 'Rail trail loop',
        points: [
          { id: 'a', name: 'A', lat: 43, lng: -72 },
          { id: 'b', name: 'B', lat: 43.01, lng: -72.01 },
        ],
      }),
      {
        id: 'saved-a',
        now: '2026-05-03T12:00:00.000Z',
      },
    );

    const result = addRouteHistoryEntry(
      [savedRoute],
      savedRouteToRoute(savedRoute),
      {
        savedRouteId: 'saved-a',
        now: '2026-05-08T12:00:00.000Z',
        stats: {
          distanceMeters: 1234,
          elapsedSeconds: 600,
          distance: '0.77 mi',
          elapsed: '10:00',
          pace: '12:59 /mi',
          splits: [
            {
              index: 1,
              label: '1 mi',
              distanceMeters: 1609.344,
              elapsedSeconds: 480,
              splitSeconds: 480,
              displayElapsed: '8:00',
              displaySplit: '8:00',
            },
          ],
          completedAt: '2026-05-08T12:00:00.000Z',
        },
      },
    );

    expect(result.savedRouteId).toBe('saved-a');
    expect(result.library).toHaveLength(1);
    expect(result.library[0].history).toHaveLength(1);
    expect(result.library[0].history[0]).toMatchObject({
      routeId: 'saved-a',
      routeName: 'Rail trail loop',
      distanceMeters: 1234,
      elapsedSeconds: 600,
      displayDistance: '0.77 mi',
      displayElapsed: '10:00',
      displayPace: '12:59 /mi',
      splits: [
        {
          index: 1,
          label: '1 mi',
          distanceMeters: 1609.344,
          elapsedSeconds: 480,
          splitSeconds: 480,
          displayElapsed: '8:00',
          displaySplit: '8:00',
        },
      ],
      finishedAt: '2026-05-08T12:00:00.000Z',
    });
    expect(result.library[0].history[0].routeSnapshot.name).toBe(
      'Rail trail loop',
    );
  });

  it('creates an unnamed route for completed Go history without an active saved route', () => {
    const route = createRoute({
      name: 'New route',
      points: [
        { id: 'a', name: 'A', lat: 43, lng: -72 },
        { id: 'b', name: 'B', lat: 43.01, lng: -72.01 },
      ],
    });

    const result = addRouteHistoryEntry([], route, {
      now: '2026-05-08T12:00:00.000Z',
      stats: {
        distanceMeters: 1234,
        elapsedSeconds: 0,
        completedAt: '2026-05-08T12:00:00.000Z',
      },
    });

    expect(result.savedRouteId).toBe(result.library[0].id);
    expect(result.library).toHaveLength(1);
    expect(result.library[0].name).toBe('Unnamed route');
    expect(result.library[0].history).toHaveLength(1);
    expect(result.library[0].history[0].routeId).toBe(result.library[0].id);
    expect(result.library[0].history[0].routeSnapshot.name).toBe(
      'Unnamed route',
    );
  });

  it('deletes one Go history entry from a saved route', () => {
    const savedRoute = createSavedRoute(createRoute({ name: 'History route' }), {
      id: 'saved-a',
      now: '2026-05-03T12:00:00.000Z',
    });
    const withFirst = addRouteHistoryEntry([savedRoute], savedRouteToRoute(savedRoute), {
      savedRouteId: 'saved-a',
      now: '2026-05-08T12:00:00.000Z',
      stats: {
        elapsedSeconds: 600,
        completedAt: '2026-05-08T12:00:00.000Z',
      },
    }).library;
    const withSecond = addRouteHistoryEntry(withFirst, savedRouteToRoute(savedRoute), {
      savedRouteId: 'saved-a',
      now: '2026-05-09T12:00:00.000Z',
      stats: {
        elapsedSeconds: 700,
        completedAt: '2026-05-09T12:00:00.000Z',
      },
    }).library;

    const deleted = deleteRouteHistoryEntry(
      withSecond,
      'saved-a',
      withSecond[0].history[0].id,
      { now: '2026-05-10T12:00:00.000Z' },
    );

    expect(deleted[0].history).toHaveLength(1);
    expect(deleted[0].history[0].finishedAt).toBe(
      '2026-05-08T12:00:00.000Z',
    );
    expect(deleted[0].updatedAt).toBe('2026-05-10T12:00:00.000Z');
  });

  it('clears Go history from one saved route', () => {
    const savedRoute = createSavedRoute(createRoute({ name: 'History route' }), {
      id: 'saved-a',
      now: '2026-05-03T12:00:00.000Z',
    });
    const result = addRouteHistoryEntry([savedRoute], savedRouteToRoute(savedRoute), {
      savedRouteId: 'saved-a',
      now: '2026-05-08T12:00:00.000Z',
      stats: {
        elapsedSeconds: 600,
        completedAt: '2026-05-08T12:00:00.000Z',
      },
    });

    const cleared = clearRouteHistory(result.library, 'saved-a', {
      now: '2026-05-10T12:00:00.000Z',
    });

    expect(cleared[0].history).toEqual([]);
    expect(cleared[0].updatedAt).toBe('2026-05-10T12:00:00.000Z');
  });

  it('deletes saved routes without reordering the remaining routes', () => {
    const first = createSavedRoute(createRoute({ name: 'First' }), {
      id: 'saved-a',
      now: '2026-05-03T12:00:00.000Z',
    });
    const second = createSavedRoute(createRoute({ name: 'Second' }), {
      id: 'saved-b',
      now: '2026-05-03T13:00:00.000Z',
    });
    const third = createSavedRoute(createRoute({ name: 'Third' }), {
      id: 'saved-c',
      now: '2026-05-03T14:00:00.000Z',
    });

    const deleted = deleteSavedRoute([first, second, third], 'saved-b');

    expect(deleted.map((entry) => entry.id)).toEqual(['saved-a', 'saved-c']);
  });
});
