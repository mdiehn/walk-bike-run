# Walk Bike Run

A small browser webapp for personal walking, biking, and running route planning.

This starts as a clean webapp inspired by the route-planning ideas from Portal Route, without IITC or Ingress-specific code.

## Phase 1 scope

Phase 1 is only the foundation:

- Vite app shell
- Leaflet map
- OSM-compatible tile layer for development
- route panel placeholder
- visible app version
- top-level `VERSION` file
- `build.js` for the installable/deployable build
- unit test setup
- Playwright smoke test setup
- GitHub Actions check workflow

Not included yet:

- service worker
- PWA offline caching
- backend
- route library
- GPS tracking
- GPX import/export
- road/path routing

## Development

Install dependencies:

```sh
npm install
```

Run the dev server:

```sh
npm run dev
```

Run checks:

```sh
npm run lint
npm test
npm run build
```

Run the Playwright smoke test:

```sh
npx playwright install chromium
npm run test:e2e
```

## Build and version

`VERSION` is the source of truth for the app version.

`build.js` reads `VERSION`, writes `src/version.js`, runs the Vite build, then writes build metadata to:

```text
dist/build-info.json
```

Useful commands:

```sh
npm run version:sync
npm run build
```

The app imports the generated `src/version.js` file so the displayed version stays tied to `VERSION`.

## Phone testing

The dev server runs with `--host 0.0.0.0`, so another device on the same LAN can usually reach it at:

```text
http://YOUR-COMPUTER-IP:5173/
```

Avoid service workers and PWA caching until the update behavior is well understood. Browser reloads should reflect dev changes directly.

## Tile usage note

The default tile layer uses the public OpenStreetMap tile endpoint for development only. A production deployment should use a proper tile provider or self-hosted tiles.
