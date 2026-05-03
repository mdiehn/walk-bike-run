# Walk Bike Run Roadmap

This project is a browser-based walk, bike, and run route planner inspired by the ideas we have been building in Portal Route.

The goal is not to clone MapMyRun or MapMyFitness feature-for-feature. The goal is to make a simple, fast, friendly route planner that works the way we want.

## Guiding principles

- Keep the app easy to run locally.
- Keep the dev/test/release loop clean from the start.
- Prefer boring, reviewable changes.
- Avoid stale-cache and update confusion.
- Do not add a backend until local app behavior is solid.
- Do not add a service worker until update behavior is well understood.
- Reuse Portal Route ideas, but do not blindly copy IITC-specific structure.

## Phase 1: Foundation and dev loop

Status: started.

Goal: make the repo pleasant to work in before app complexity starts.

Deliverables:

- Vite app shell
- Leaflet map loads
- OpenStreetMap-compatible tile layer
- Small version display in dev mode
- `npm` scripts for dev, build, preview, test, lint, and format
- Unit test framework
- Playwright smoke test
- GitHub Actions build/test workflow
- `README.md`
- `CHANGELOG.md`
- No service worker
- No PWA offline cache
- No backend

Close this phase when:

- Repo is named `walk-bike-run`
- Repo is pushed
- CI passes
- README matches reality
- One clean initial tag/release exists, likely `v0.1.0`

## Phase 2: Basic route editing

Goal: make the app useful as a manual route sketcher.

Features:

- Click map to add route points
- Show points in a route list
- Delete points
- Rename points
- Drag points on map
- Reorder points in list
- Show total straight-line distance
- Clear route
- Loop route toggle

Notes:

- No routing engine yet.
- No road/path snapping yet.
- Keep editing fast and predictable.

Likely version: `v0.2.0`

## Phase 3: Local route library

Goal: save and reuse routes.

Features:

- Save current route
- Load saved route
- Duplicate route
- Delete saved route
- Rename saved route
- Store routes in `localStorage` or IndexedDB
- Maybe store map center and zoom

Route metadata:

- Name
- Activity type: walk, bike, or run
- Created date
- Updated date
- Distance
- Loop/non-loop

Likely version: `v0.3.0`

## Phase 4: Import/export

Goal: make routes portable.

Features:

- Export GPX
- Import GPX
- Export GeoJSON
- Import GeoJSON
- Maybe export simple JSON backup
- Drag/drop file import
- Route fixture files for tests

Likely version: `v0.4.0`

## Phase 5: Road/path routing

Goal: convert point-to-point sketches into real walk/bike/run paths.

Features:

- Routing provider adapter
- Profile selector:
  - walk
  - bike
  - run, probably same as walk at first
- Route polyline from routing service
- Routed distance vs straight-line distance
- Recalculate when points move
- Clear fallback behavior when routing fails

Possible routing engines/providers to evaluate:

- OSRM
- GraphHopper
- Valhalla
- Hosted routing APIs
- Self-hosted routing later if worthwhile

Notes:

- Start with one provider adapter.
- Do not overbuild provider abstraction before we have one working provider.
- Treat routing failure as normal and recoverable.

Likely version: `v0.5.0`

## Phase 6: Mobile-first polish

Goal: make the app genuinely usable on a phone.

Features:

- Better touch controls
- Current location button
- Start-here action
- Larger hit targets
- Compact route list
- Bottom-sheet style panel
- Prevent accidental map movement while editing
- Phone testing over LAN

Likely version: `v0.6.0`

## Phase 7: Activity planning features

Goal: replace the parts of MapMyRun and MapMyFitness we actually care about.

Features:

- Estimated time
- Pace display
- Activity type defaults
- Distance targets
- Maybe extend route to about N miles
- Printable/shareable route summary

Notes:

- Elevation is useful, but not required here.
- Social features are not a goal unless we decide otherwise later.

Likely version: `v0.7.0`

## Phase 8: PWA / installable app

Goal: make the app feel app-like without causing update misery.

Features:

- Installable PWA
- Service worker
- Offline app shell
- Careful cache/version handling
- Visible update-available behavior
- Cache clearing/debug controls

Important:

Do this late, not early. Service workers are useful, but they can cause confusing stale-version behavior if added before the app and release process are stable.

Likely version: `v0.8.0`

## Phase 9: GPS recording

Goal: record actual walks, rides, and runs.

Features:

- Start/stop recording
- GPS track capture
- Elapsed time
- Moving time, maybe later
- Pace/speed
- Save completed activity
- Export completed activity as GPX

Likely version: `v0.9.0`

## Phase 10: 1.0.0

Goal: stable personal route planner.

Call this `1.0.0` when:

- Route editing is solid
- Save/load is solid
- GPX import/export works
- Phone use is good
- Update behavior is understood
- There are no scary data-loss bugs

## Later ideas

These are deliberately not part of the early phases:

- Account system
- Cloud sync
- Shared route libraries
- Multi-user editing
- Turn-by-turn navigation
- Live activity sharing
- Social feed
- Complex training plans
- Wearable integration
