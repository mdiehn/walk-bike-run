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
