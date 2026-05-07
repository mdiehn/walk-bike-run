import { describe, expect, it } from 'vitest';

import { addPoint, createRoute, setLoop } from '../src/route-model.js';
import { parseRouteGpx, serializeRouteGpx } from '../src/gpx.js';

function sampleRoute({ loop = false } = {}) {
  let route = createRoute({ name: 'Morning & evening', activityType: 'run' });
  route = addPoint(route, {
    id: 'point-a',
    name: 'Start <home>',
    lat: 43.6426,
    lng: -72.2518,
  });
  route = addPoint(route, {
    id: 'point-b',
    name: 'Turnaround',
    lat: 43.6526,
    lng: -72.2618,
  });
  route = addPoint(route, {
    id: 'point-c',
    name: 'Finish',
    lat: 43.6626,
    lng: -72.2718,
  });
  return setLoop(route, loop);
}

describe('GPX route files', () => {
  it('serializes the current route as GPX 1.1', () => {
    const gpx = serializeRouteGpx(sampleRoute(), {
      appVersion: '0.2.0-dev',
      now: '2026-05-03T13:00:00.000Z',
    });

    expect(gpx).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(gpx).toContain('<gpx version="1.1"');
    expect(gpx).toContain('Walk Bike Run 0.2.0-dev');
    expect(gpx).toContain('<name>Morning &amp; evening</name>');
    expect(gpx).toContain('<type>run</type>');
    expect(gpx).toContain('<rtept lat="43.6426" lon="-72.2518">');
    expect(gpx).toContain('<name>Start &lt;home&gt;</name>');
  });

  it('round-trips a GPX route into the route model', () => {
    const route = sampleRoute();
    const imported = parseRouteGpx(serializeRouteGpx(route));

    expect(imported).toMatchObject({
      name: 'Morning & evening',
      activityType: 'run',
      loop: false,
      points: [
        { name: 'Start <home>', lat: 43.6426, lng: -72.2518 },
        { name: 'Turnaround', lat: 43.6526, lng: -72.2618 },
        { name: 'Finish', lat: 43.6626, lng: -72.2718 },
      ],
    });
  });

  it('exports loop routes with a final repeated start point and imports them as loops', () => {
    const route = sampleRoute({ loop: true });
    const gpx = serializeRouteGpx(route);
    const imported = parseRouteGpx(gpx);

    expect(gpx.match(/<rtept\b/g)).toHaveLength(4);
    expect(imported.loop).toBe(true);
    expect(imported.points).toHaveLength(3);
  });

  it('exports and imports two-point loop routes', () => {
    const route = setLoop(
      createRoute({
        name: 'Two-point loop',
        activityType: 'walk',
        points: [
          { id: 'point-a', name: 'Start', lat: 43.6426, lng: -72.2518 },
          { id: 'point-b', name: 'Turnaround', lat: 43.6526, lng: -72.2618 },
        ],
      }),
      true,
    );
    const gpx = serializeRouteGpx(route);
    const imported = parseRouteGpx(gpx);

    expect(gpx.match(/<rtept\b/g)).toHaveLength(3);
    expect(imported.loop).toBe(true);
    expect(imported.points).toHaveLength(2);
  });

  it('imports simple GPX track points', () => {
    const imported = parseRouteGpx(`<?xml version="1.0"?>
<gpx version="1.1">
  <trk>
    <name>Imported track</name>
    <trkseg>
      <trkpt lat="43.1" lon="-72.1"><name>First</name></trkpt>
      <trkpt lat="43.2" lon="-72.2" />
    </trkseg>
  </trk>
</gpx>`);

    expect(imported).toMatchObject({
      name: 'Imported track',
      activityType: 'walk',
      points: [
        { name: 'First', lat: 43.1, lng: -72.1 },
        { name: 'GPX point 2', lat: 43.2, lng: -72.2 },
      ],
    });
  });

  it('rejects invalid GPX files', () => {
    expect(() => parseRouteGpx('not xml')).toThrow(
      'GPX file does not contain a GPX document.',
    );
    expect(() => parseRouteGpx('<gpx></gpx>')).toThrow(
      'GPX file does not contain route or track points.',
    );
    expect(() =>
      parseRouteGpx('<gpx><rte><rtept lat="43"></rtept></rte></gpx>'),
    ).toThrow('GPX point is missing lat or lon coordinates.');
  });
});
