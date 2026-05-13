# Walk Bike Run Roadmap

This project is a browser-based walk, bike, and run route planner inspired by the ideas we have been building in Portal Route.

The goal is not to clone MapMyRun or MapMyFitness feature-for-feature. The goal is to make a simple, fast, friendly route planner that works the way we want.

## Guiding principles

- Keep the app easy to run locally.
- Keep the dev/test/release loop clean.
- Prefer boring, reviewable changes.
- Avoid stale-cache and update confusion.
- Do not add a backend until local app behavior is solid.
- Do not add a service worker until update behavior is well understood.
- Reuse Portal Route ideas, but do not blindly copy IITC-specific structure.

## Released / completed milestones

### v0.1.0: Foundation and dev loop

- Vite app shell
- Leaflet map
- OpenStreetMap-compatible tile layer
- Version display
- npm dev/build/test/lint scripts
- Unit test framework
- Playwright smoke tests
- GitHub Actions build/test/deploy plumbing
- No service worker or PWA cache

### v0.2.0: Basic route editing and local route library

- Click/tap map to add route points
- Route point list
- Rename, delete, drag, and reorder points
- Clear route
- Loop route toggle
- Straight-line distance
- Estimated time
- Local browser route library
- Save/load/duplicate/delete routes
- Current-route JSON and GPX import/export
- Library backup import/export

### v0.3.0: Routing, cached geometry, Drive backup, and compact editor polish

- Route, Library, and Settings tabs
- OSRM / configured routing Worker support
- Replot flow for routed geometry
- Cached routed geometry reuse
- Stale routed geometry display after edits
- Undo/Redo
- Add/Del point tap mode
- Google Drive library backup/restore
- Improved route dirty/stale handling
- Mobile add-point fixes
- Two-point loop fixes

### v0.4.0: Go mode and activity-following foundation

- Plan / Go mode split
- Go button state machine: Start, Pause, Resume, hold-to-finish, Done
- Completed Go stats saved as route history
- Go position marker for walk/run/bike
- Manual Go location override
- Recenter look-ahead behavior
- Route editing locked while Go mode is active
- Route-level target pace/speed
- Per-activity default pace/speed settings
- Estimated/dead-reckoned Go movement when live movement input is unavailable
- Mobile Go dashboard bottom sheet

## Current target: v0.5.0-dev

Goal: turn the v0.4.0 Go foundation into a more useful activity screen and history view without making the app harder to maintain.

Good first slices:

1. **Split/lap tracking**
   - Track mile/km splits during Go mode.
   - Show simple split rows in the expanded dashboard.
   - Save split data into completed route history.

2. **Better completion and history display**
   - Show completed activity history more clearly in the route library.
   - Add a simple route-history detail view or selected-history display.
   - Make completion stats easier to review after Done.

3. **Pause/finish control polish**
   - On Pause, split the main button area into Resume and Hold to Finish.
   - Resume should immediately return to the single Pause button.
   - Hold to Finish should change the flow to Done.

4. **Dashboard polish**
   - Improve mobile collapsed/expanded dashboard spacing.
   - Replace the splits placeholder with real data once splits exist.
   - Improve estimated time remaining and distance remaining display.

5. **Testing and dev helpers**
   - Add a small movement replay/simulator only if manual testing becomes painful.
   - Prefer app-state and helper tests over brittle exact-pixel map assertions.

Defer for now:

- Full heading-up map rotation. Leaflet does not support map rotation natively, so this needs a separate dependency/design decision.
- Full GPS track recording. Go mode has stats/history, but not a complete recorded track model yet.
- PWA/offline support.

## Later targets

### v0.6.0: GPS recording and activity export

- Record live GPS track points.
- Separate planned route from actual recorded activity.
- Save completed activity track data.
- Export completed activity GPX.
- Consider moving time vs elapsed time.

### v0.7.0: More route planning helpers

- Distance targets.
- Extend route to about N miles/km.
- Printable/shareable route summary.
- Better destination/share controls for downloads.
- Optional elevation research.

### v0.8.0: PWA / installable app

- Installable PWA.
- Service worker.
- Offline app shell.
- Careful cache/version handling.
- Visible update-available behavior.
- Cache clearing/debug controls.

Do this late, not early. Service workers are useful, but they can cause confusing stale-version behavior if added before the app and release process are stable.

### v1.0.0

Goal: stable personal route planner.

Rough requirements:

- Route editing is reliable on desktop and mobile.
- Saved route library is trustworthy.
- Import/export works.
- Routing failures are recoverable and understandable.
- Go mode is useful for personal activity following.
- Update/release behavior is boring.
