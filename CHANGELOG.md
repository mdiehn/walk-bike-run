# Changelog

## Unreleased

Development has moved to `0.5.0-dev`. Planned focus:

- Split/lap tracking in Go mode.
- Better completion and route-history display.
- Pause/Resume/Finish control polish.
- Mobile dashboard polish.
- Optional movement replay/dev helper if manual testing becomes painful.

### Added

- Added first-pass automatic mile splits for Go sessions.
  - Splits appear in the expanded Go dashboard after each completed mile.
  - Completed Go stats now save splits into route history.
  - The completion screen shows saved splits when any were recorded.

### Changed

- Kept hidden Go completion split rows cleared until the completion panel is shown, avoiding duplicate split test IDs during active sessions.
- Tightened the expanded Go dashboard control layout so the main action and secondary controls share a compact three-column row.
- Tightened the expanded mobile Go dashboard stats into two compact three-column rows:
  - distance, elapsed, and pace/speed
  - remaining distance, estimated remaining time, and movement/status

## v0.4.0 - 2026-05-13

### Added

- Added a Plan / Go mode split.
  - Plan mode keeps the compact route editor.
  - Go mode provides larger activity-focused controls.

- Added the Go activity button flow.
  - Start begins an activity.
  - Pause pauses movement/timing.
  - Resume continues the activity.
  - Long-press Resume changes the control to Done.
  - Done saves completion stats and shows the completion screen.

- Added completed Go activity history.
  - Completed stats are attached to the active saved route when possible.
  - Unsaved routes create an Unnamed route with history attached.
  - Route library rows now show completion history.

- Added Go route-following marker support.
  - The marker uses walk/run/bike icons.
  - Marker color follows Go state.
  - Recenter focuses ahead of the marker using route direction.
  - Manual Go location override is available in Settings.

- Added route-level target pace/speed.
  - Walk/run routes use target pace.
  - Bike routes use target speed.
  - Settings now include default pace/speed values for each activity.
  - Saved routes preserve their target speed.

- Added estimated Go movement when live movement input is unavailable.
  - The Go marker advances along the route using the route target pace/speed.
  - Pause freezes estimated movement.
  - Resume continues from the paused position.
  - Loop routes wrap; non-loop routes clamp at the end.
  - Estimated positions are visually marked.

- Added a mobile Go dashboard bottom sheet.
  - Mobile Go mode makes the map the main full-screen surface.
  - Page scrolling is disabled while mobile Go mode is active.
  - Collapsed dashboard shows the main Go action, distance, elapsed time, and pace/speed.
  - Expanded dashboard shows route details, remaining distance, progress, Recenter, estimated time remaining, and a splits placeholder.

### Changed

- Go mode now locks route editing.
  - Route points cannot be added, deleted, dragged, renamed, reordered, cleared, undone, or redone while Go mode is active.
  - Map panning, zooming, Recenter, and Go marker updates remain available.
  - Returning to Plan mode restores editing.

- Go Recenter now uses activity-specific zoom levels and looks ahead of the current/estimated position.

- Desktop Go panel sizing was adjusted so the expanded panel can use more of the visible viewport height.

### Fixed

- Fixed the Go marker disappearing behind route markers on desktop.
- Fixed the Go elapsed timer so it advances while running and preserves pause/resume time.
- Fixed blank manual Go latitude/longitude fields being parsed as `0,0`.
- Fixed Go start fallback so the first route waypoint is used when no valid live/manual location is available.
- Fixed route marker drag handlers carrying into Go mode after switching from Plan.
- Fixed several Go e2e expectations after distance/pace semantics changed.

## v0.3.0 - 2026-05-07

Walk/Bike/Run now has a much stronger route editing workflow, saved route library, Google Drive backup support, and a cleaner compact UI.

### Added

- Added saved route library with route save, load, overwrite, duplicate, delete, import, and export support.
- Added Google Drive backup/sync controls for saving and loading the route library.
- Added support for configuring the Google OAuth Client ID in the app.
- Added support for configuring a routing Worker URL in the app.
- Added route dirty/stale state tracking so edited routes clearly require saving or replotting.
- Added route history support for Undo and Redo.
- Added Add/Del point tap mode for mobile-friendly route editing.
- Added route library sorting and filtering.
- Added route stats, including distance and estimated time.
- Added loop route support, including two-point loop handling.
- Added GPX import/export support.
- Added cached routed geometry handling with stale-cache detection.

### Changed

- Reworked the UI into a more compact, tool-like layout.
- Added Route, Library, and Settings tabs.
- Moved routing provider, Worker URL, Google Client ID, and Google Drive controls into Settings.
- Renamed Current route to Route.
- Moved Activity next to Route name.
- Changed route stats from large lozenges to a compact line.
- Tightened button, panel, row, tab, form, and mobile styling.
- Renamed Recalculate route to Replot.
- Improved route action button layout.
- Removed the Saved/Unsaved indicator row and now rely on the Save button enabled state.

### Fixed

- Fixed mobile route editing so new points can be added to a loaded route.
- Fixed loaded routes so edits mark the route dirty/stale correctly.
- Fixed two-point loop distance, route legs, fallback/routed geometry, GPX export/import, and stale cache detection.
- Fixed e2e tests for the current route library storage key and updated route controls.
- Fixed route action buttons crowding and overflowing in compact layouts.

## v0.2.0

- Persist routed geometry and route stats with current routes and saved library entries.
- Reuse valid cached routed geometry on reload without calling the routing service.
- Keep edited routes' previous routed geometry visible as a stale reference until manual recalculation.
- Replace automatic idle routing with an explicit **Recalculate route** action.
- Keep stale routed geometry from overriding edited route points or point-derived saved stats.
- Add route-level Undo and Redo buttons with a 50-snapshot history stack.
- Fix loop-back-to-start behavior for two-point routes across stats, plotting, routing, and GPX export/import.

- Add v0.2.0 stabilization notes.
- Fix e2e selector ambiguity for the route Clear button after adding Clear selection.

- Clarify saved-route selection vs loaded/current route behavior.
- Move saved-route Load, Copy, Delete actions into selected-route controls.
- Rename current-route save actions to make overwrite vs save-as-new behavior clearer.
- Document future destination/share support for route exports and library backups.

- Make saved route rows selectable without loading a different route.

- Add saved route library sort and activity filter controls.
- Keep saved order as the default library view while allowing temporary display sorting by name, distance, point count, updated date, or activity.
- Add route library view helper tests and Playwright assertions for sort/filter behavior.

- Guard against accidentally discarding unsaved route edits.
- Confirm before clearing, starting a new route, loading a saved route, or replacing the current route from import when unsaved changes exist.
- Simplify save status labels to `New unsaved route`, `Unsaved changes`, and `Saved`.

- Show saved route activity, distance, point count, estimated time, and updated date in the library.
- Add Playwright coverage for saved route library stats.

- Add route estimated time and default pace/speed display.
- Add simple activity speed helpers and route stat tests.

- Add GPX export/import for the current route.
- Stage GPX imports before replacing the editor route.
- Add GPX parser/serializer unit tests and Playwright coverage.

- Add app JSON export/import for the current route.
- Stage current-route JSON imports before replacing the editor route.
- Add route file validation, unit tests, docs, and Playwright coverage.

- Stage JSON library imports for review before replacing saved routes.
- Add import cancel/confirm coverage to Playwright tests.
- Add app JSON export/import for saved route library backups.
- Add backup validation and route backup unit tests.
- Bump development version to `0.2.0-dev`.

- Keep saved route order stable when re-saving existing routes.
- Add `schemaVersion` to saved route library entries.
- Place duplicated routes next to their source route.
- Document future library sorting and usage-history ideas.

- Add a local browser route library.
- Add save, save-as-copy, load, duplicate, delete, and new-route actions.
- Track whether the current route has unsaved changes.
- Save route library entries to `localStorage`.
- Add route library helpers and unit tests.
- Update Playwright tests for the local library flow.

- Start Phase 2 route editor features.
- Replace the hello-world test route with real route editing basics.
- Add route name and activity controls.
- Add route list rename, reorder, delete, and clear actions.
- Add draggable numbered map markers.
- Add fit-route action.
- Keep straight-line distance and loop-distance calculation.
- Add route model helpers for metadata, point updates, and point movement.
- Update unit and Playwright tests for the route editor.

- Added a Vitest config so unit tests only run files under `test/`.
- Kept Playwright browser tests separate under `e2e/`.

- Add a desktop/mobile hello-world app shell.
- Add a Leaflet map with OpenStreetMap dev tiles.
- Add click/tap test points and a simple route status panel.
- Add mobile testing notes.
