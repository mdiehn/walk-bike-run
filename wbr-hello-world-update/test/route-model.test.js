import { describe, expect, it } from 'vitest';

import {
  addPoint,
  clearPoints,
  createRoute,
  deletePoint,
  setLoop,
  totalDistanceMeters,
} from '../src/route-model.js';

describe('route model', () => {
  it('adds and deletes points without mutating the original route', () => {
    const route = createRoute();
    const withPoint = addPoint(route, { id: 'a', name: 'A', lat: 43, lng: -72 });
    const deleted = deletePoint(withPoint, 'a');

    expect(route.points).toHaveLength(0);
    expect(withPoint.points).toHaveLength(1);
    expect(deleted.points).toHaveLength(0);
  });

  it('calculates distance between route points', () => {
    const route = createRoute({
      points: [
        { id: 'a', name: 'A', lat: 43.6426, lng: -72.2518 },
        { id: 'b', name: 'B', lat: 43.6476, lng: -72.2518 },
      ],
    });

    expect(totalDistanceMeters(route)).toBeGreaterThan(500);
  });

  it('adds loop distance when loop is enabled', () => {
    const route = createRoute({
      points: [
        { id: 'a', name: 'A', lat: 43.6426, lng: -72.2518 },
        { id: 'b', name: 'B', lat: 43.6476, lng: -72.2518 },
        { id: 'c', name: 'C', lat: 43.6476, lng: -72.2418 },
      ],
    });

    const openDistance = totalDistanceMeters(route);
    const loopDistance = totalDistanceMeters(setLoop(route, true));

    expect(loopDistance).toBeGreaterThan(openDistance);
  });

  it('clears points', () => {
    const route = createRoute({ points: [{ id: 'a', name: 'A', lat: 43, lng: -72 }] });

    expect(clearPoints(route).points).toHaveLength(0);
  });
});
