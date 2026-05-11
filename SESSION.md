# SESSION.md

This file is a working-session backup. It should help recover context if VSCodium, ChatGPT, Codex, or a browser session loses state.

Update it freely while working. It is allowed to be messier than `README.md` or `ROADMAP.md`.

## Current project state

Project: Walk Bike Run

Repo name: `walk-bike-run`

Earlier temporary name: `wbr`

Current phase: Phase 1, foundation and dev loop.

The first scaffold was created as a small Vite + Leaflet app with tests and CI wiring.

Current intent: get the foundation clean before adding route-planning features.

## Latest session note

Changed routed geometry from an auto-refreshed UI cache into persisted route data:

- `route.routedGeometry` is normalized with a route key, segments, distance, duration, provider, update time, and `isStale`.
- Valid cached geometry draws immediately on reload and does not call the routing service.
- Point/activity/loop edits keep the old geometry as a dashed stale reference and show **Recalculate route**.
- Manual recalculation replaces the cache, updates routed stats, clears stale geometry state, and persists clean saved-route cache updates when safe.
- Stale geometry does not replace edited points or point-derived saved stats.

Tested:

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run test:e2e`

Known note:

- `npm run format:check` still reports broad pre-existing formatting drift outside this change; touched files were formatted with Prettier.

Added route-level undo/redo:

- Snapshot stack stores current route, dirty state, and active saved-route linkage before route edits.
- Undo/Redo buttons live under the main route action row and disable when unavailable.
- Stack is capped at 50 snapshots.
- Covered add/undo/redo in Playwright.

Tested again:

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run test:e2e`

Fixed two-point loop routes:

- Loop return legs now apply with at least two points in distance stats, routing legs, plotting fallback geometry, and GPX export/import.
- Added unit coverage for two-point loop distance, routing return legs, and GPX round-trip.
- Re-ran `npm test`, `npm run lint`, `npm run build`, and `npm run test:e2e`.

## v0.4.0 Go mode edit lockout

Current branch: `dev/v0.4.0`.

Changed in this pass:

- Go mode now treats route editing as locked. Map clicks, marker clicks, marker drags, route list delete/move/rename controls, route name/activity/loop edits, clear, undo, and redo are blocked or disabled while Go mode is active.
- Plan mode editing is preserved. Replot stays available.
- Added a first mobile Go layout shell: on small screens, Go mode uses a full-screen map with the Go panel as a bottom overlay and page scrolling disabled.
- Added Playwright coverage for Go-mode map/marker/list edit lockout and Plan-mode editing after returning from Go.

Validation run in this session should include:

```sh
npm run lint
npm test
npm run test:e2e
npm run build
```

Follow-up fix after desktop testing:

- Re-rendered route markers on mode switch so already-created Plan markers lose their Leaflet draggable handlers in Go mode.
- Moved the Go position/blip marker into a dedicated high-z-index Leaflet pane so it stays visible above route markers on desktop as well as mobile.
- Added a real elapsed Go timer with a 250 ms UI refresh while running, preserving elapsed time across pause/resume and saving elapsed seconds in completion history.
- Added Playwright assertions for visible Go blip and ticking elapsed time.


## Current product idea

Build a browser webapp for planning walking, biking, and running routes.

The interaction model is inspired by Portal Route, because Portal Route is already easier to use for route planning than the MapMyRun / MapMyFitness apps.

The app should use an OpenStreetMap-compatible base map instead of IITC.

Early target:

> Portal Route, but without portals: a personal walking/biking/running route planner on Leaflet.

## Current technical direction

Use:

- Vite
- Leaflet
- Plain JavaScript for now
- npm scripts
- Vitest or similar unit tests
- Playwright smoke tests
- GitHub Actions

Avoid for now:

- Service worker
- PWA offline caching
- Backend
- Account system
- Cloud sync
- GPS recording
- Routing engine

These can come later after the local app and update loop are solid.

## Decisions so far

- Repo should be named `walk-bike-run`, not just `wbr`.
- `wbr` is still fine as a short internal app id.
- Phase 1 should focus on foundation and dev loop, not route features.
- Update behavior is a first-class feature.
- Service worker/PWA support should wait until stale-cache behavior is deliberately designed.
- Portal Route ideas should be reused, but IITC/Ingress-specific code should not drive this app's structure.

## Current roadmap summary

Phase 1: Foundation and dev loop

- Vite app shell
- Leaflet map
- version display
- npm scripts
- tests
- GitHub Actions
- README/CHANGELOG

Phase 2: Basic route editing

- click to add points
- route list
- delete/rename/drag/reorder points
- clear route
- loop route
- straight-line distance

Phase 3: Local route library

- save/load/duplicate/delete/rename routes
- localStorage or IndexedDB
- route metadata

Phase 4: Import/export

- GPX
- GeoJSON
- simple backup JSON
- fixture tests

Phase 5: Road/path routing

- routing provider adapter
- walk/bike/run profiles
- routed polyline and routed distance

Phase 6: Mobile polish

- touch controls
- current location
- compact panel/bottom sheet
- phone testing over LAN

Phase 7: Activity planning features

- estimated time
- pace
- activity defaults
- distance targets

Phase 8: PWA/installable app

- service worker
- offline shell
- update handling
- cache debug controls

Phase 9: GPS recording

- record actual activities
- save completed activity
- export GPX

Phase 10: 1.0.0

- stable personal route planner

## Immediate next steps

1. Add these documentation files:
   - `ROADMAP.md`
   - `AGENTS.md`
   - `SESSION.md`

2. Confirm Phase 1 scaffold still works:

```sh
npm install
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

3. Commit the docs update.

Suggested commit message:

```text
Document roadmap and agent workflow
```

4. After Phase 1 is clean, start Phase 2 with basic route editing.

## Notes for Mira

Please keep this file updated while you work.

Useful updates include:

- branch name
- files changed
- tests run
- current blocker
- next action
- decisions made with Mike

Do not let this file become polished docs. It is a recovery log.
