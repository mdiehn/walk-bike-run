# Walk Bike Run

Walk Bike Run is a small personal route-planning webapp for walking, biking, and running.

The app is inspired by Portal Route, but it is a normal Leaflet webapp instead of an IITC plugin.

## Current state

The app currently:

- starts with Vite
- displays a Leaflet map
- shows the app version
- lets you click/tap the map to add route points
- lets you add a route point at the current map center
- shows route points in a list
- lets you rename, reorder, and delete route points
- lets you drag map markers to move points
- lets you undo and redo recent route edits
- shows route distance and estimated time
- supports walk, run, and bike route modes
- stores a route-level target pace/speed
- can manually replot routed geometry through OSRM or a configured ORS/HEIGIT Worker
- persists valid routed geometry and reuses it on reload
- keeps stale routed geometry visible as a reference after route edits
- supports a loop-back-to-start toggle, including two-point loops
- can fit the map to the current route
- saves routes to a local browser route library
- loads, duplicates, and deletes saved local routes
- shows saved route activity, distance, point count, estimate, updated date, and Go history
- sorts and filters the saved route library view
- tracks whether the current route has unsaved changes
- confirms before destructive actions discard unsaved route edits
- keeps saved route order stable when routes are re-saved
- exports and imports the current route as app JSON
- exports and imports the current route as GPX
- exports and imports the saved route library as app JSON backups
- supports Google Drive library backup/restore when configured
- has a Plan / Go mode split
- locks route editing while Go mode is active
- shows a Go position marker for live/manual/estimated movement
- can estimate Go movement along the planned route when live movement input is unavailable
- saves completed Go stats to route history
- has a mobile Go dashboard bottom sheet
- has unit and Playwright smoke tests

It does not yet have full GPS track recording, split/lap tracking, account sync, or PWA caching.

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
npm run test:e2e
npm run build
```

Install Playwright's browser before the first e2e run:

```sh
npx playwright install chromium
```

## GitHub Pages

This repo includes a GitHub Actions workflow for deploying the Vite build to GitHub Pages.

In GitHub, set:

```text
Settings -> Pages -> Build and deployment -> Source -> GitHub Actions
```

The workflow publishes `dist/` from pushes to `main`. See [docs/github-pages.md](docs/github-pages.md).

`npm test` runs only the unit tests under `test/`. Playwright tests live under `e2e/` and run separately so Vitest does not try to load Playwright test files.

## Route library

Routes are saved in browser `localStorage` for now. This is intentionally local-only and simple. Saved routes currently use `schemaVersion: 1` and are normalized through `src/route-library.js`.

That means:

- saved routes stay in the browser/profile/device where they were created
- clearing site data can delete saved routes
- there is no account sync yet
- use **Export JSON** to back up saved routes
- use **Import JSON** to stage and review a saved-library replacement
- sort the visible library by saved order, name, distance, point count, updated date, or activity
- filter the visible library by activity
- select saved route rows without loading them
- use **Load selected**, **Copy selected**, and **Delete selected** for saved-row actions
- use **Save changes** to update the loaded route, or **Save as new** to create a separate saved route
- completed Go sessions are saved as route history when possible

## Plan and Go modes

Plan mode is the route editor. Use it to add, delete, drag, rename, reorder, save, load, import, export, and replot routes.

Go mode is the activity view. It has larger controls, a Go marker, mobile dashboard behavior, and route-use stats. Route editing is locked while Go mode is active so shaky hands, walking, running, or biking do not accidentally change the planned route.

When live/manual location is unavailable, Go mode can advance an estimated marker along the planned route using the route target pace/speed. Estimated movement is visibly marked and should be treated as planning/testing help, not a recorded GPS track.

## Route files and library backups

Current-route export/import supports both the app JSON route format and GPX.

Exports currently use the browser download flow. Better destination/share controls are planned for later.

- **Export current route JSON** saves just the route currently shown in the editor using the app format.
- **Import current route JSON** stages one app route file for review, then can replace the current editor route. If the current route has unsaved changes, the app asks for confirmation before replacing it.
- **Export current route GPX** saves the current route as GPX 1.1.
- **Import current route GPX** stages one GPX route or track for review, then can replace the current editor route. If the current route has unsaved changes, the app asks for confirmation before replacing it.
- **Export JSON** under Library backup saves the whole local route library.
- **Import JSON** under Library backup stages a full library replacement for review.

See [docs/route-files.md](docs/route-files.md), [docs/library-backups.md](docs/library-backups.md), [docs/library-controls.md](docs/library-controls.md), and [docs/route-stats.md](docs/route-stats.md).

## Version

The top-level `VERSION` file is the source of truth.

```sh
npm run version:sync
```

That writes `src/version.js` from `VERSION`.

`npm run build` also syncs the version and writes `dist/build-info.json`.

## Not yet

No service worker yet. No offline/PWA cache yet. Those come later, after update behavior is boring and predictable.
