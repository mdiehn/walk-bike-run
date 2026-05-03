import { describe, expect, it } from 'vitest';
import { addPoint, createPoint, createRoute, movePoint, removePoint } from '../src/route-model.js';

describe('route model', () => {
  it('adds, moves, and removes points without mutating the original route', () => {
    const first = createPoint({ lat: 43.65, lng: -72.32, name: 'Start' });
    const second = createPoint({ lat: 43.66, lng: -72.33, name: 'Finish' });
    const original = createRoute({ name: 'Test route' });

    const withFirst = addPoint(original, first);
    const withSecond = addPoint(withFirst, second);
    const moved = movePoint(withSecond, 1, 0);
    const removed = removePoint(moved, first.id);

    expect(original.points).toHaveLength(0);
    expect(withSecond.points.map((point) => point.name)).toEqual(['Start', 'Finish']);
    expect(moved.points.map((point) => point.name)).toEqual(['Finish', 'Start']);
    expect(removed.points.map((point) => point.name)).toEqual(['Finish']);
  });
});
