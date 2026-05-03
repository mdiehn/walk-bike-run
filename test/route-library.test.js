import { describe, expect, it } from 'vitest';

import { addPoint, createRoute } from '../src/route-model.js';
import {
  createSavedRoute,
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

    const savedRoute = createSavedRoute(route, { id: 'saved-a', now: '2026-05-03T12:00:00.000Z' });
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

    expect(loadRouteLibrary(storage).map((entry) => entry.id)).toEqual(['saved-a', 'saved-b']);
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
    const updatedRoute = addPoint(savedRouteToRoute(original), { id: 'p1', name: 'Point 1', lat: 43, lng: -72 });

    const library = upsertSavedRoute([first, original, third], updatedRoute, {
      id: 'saved-b',
      now: '2026-05-03T14:00:00.000Z',
    });

    expect(library.map((entry) => entry.id)).toEqual(['saved-a', 'saved-b', 'saved-c']);
    expect(library[1].createdAt).toBe('2026-05-03T12:30:00.000Z');
    expect(library[1].updatedAt).toBe('2026-05-03T14:00:00.000Z');
    expect(library[1].points).toHaveLength(1);
  });

  it('puts newly saved routes at the top of the library', () => {
    const existing = createSavedRoute(createRoute({ name: 'Existing' }), {
      id: 'saved-a',
      now: '2026-05-03T12:00:00.000Z',
    });

    const library = upsertSavedRoute([existing], createRoute({ name: 'New route' }), {
      now: '2026-05-03T13:00:00.000Z',
    });

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
    expect(duplicated.map((entry) => entry.name)).toEqual(['First', 'First copy', 'Bike loop']);
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
