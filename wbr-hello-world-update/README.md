# Walk Bike Run

Walk Bike Run is a small personal route-planning webapp for walking, biking, and running.

The first milestone is intentionally boring: a reliable dev loop, a Leaflet map, a visible version, tests, and a simple desktop/mobile hello-world screen.

## Current state

Phase 1 is the app foundation.

The app currently:

- starts with Vite
- displays a Leaflet map
- shows the app version
- lets you click/tap the map to add test points
- lets you add and clear a sample point from the panel
- shows simple desktop/mobile status info
- has unit and Playwright smoke tests

It does not yet have real route planning, save/load, GPX, routing providers, GPS recording, or PWA caching.

## Setup

```sh
npm install
```

## Dev server

```sh
npm run dev
```

Open the URL Vite prints, usually:

```text
http://localhost:5173/
```

For phone testing on the same LAN, use the Network URL Vite prints, often something like:

```text
http://192.168.1.50:5173/
```

The `dev` script binds to `0.0.0.0` so other devices on the LAN can reach it if your firewall allows the port.

## Checks

```sh
npm run lint
npm test
npm run build
```

For browser smoke tests:

```sh
npx playwright install chromium
npm run test:e2e
```

## Version

The top-level `VERSION` file is the source of truth.

```sh
npm run version:sync
```

That writes `src/version.js` from `VERSION`.

`npm run build` also syncs the version and writes `dist/build-info.json`.

## Mobile testing

See [docs/mobile-testing.md](docs/mobile-testing.md).

## Not yet

No service worker yet. No offline/PWA cache yet. Those come later, after update behavior is boring and predictable.
