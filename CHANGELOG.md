# Changelog

## Unreleased

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
