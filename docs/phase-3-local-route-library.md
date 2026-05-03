# Phase 3: Local route library

Goal: make routes reusable before adding routing engines or GPS recording.

## Implemented starter behavior

- Save the current route.
- Save the current route as a separate copy.
- Load a saved route.
- Duplicate a saved route from the library list.
- Delete a saved route.
- Keep saved route metadata:
  - name
  - activity type
  - loop setting
  - point list
  - schema version
  - straight-line distance
  - created date
  - updated date

## Storage

Routes are stored in `localStorage` under:

```text
walk-bike-run.routeLibrary.v1
```

This keeps the first implementation small and easy to inspect.

Saved route objects currently carry `schemaVersion: 1`. The route data model is not final; saved routes are normalized through `route-library.js` so future changes can be migrated in one place.

## Library order

The library keeps a stable display order instead of sorting by update date automatically.

- Re-saving an existing route updates it in place.
- Newly saved routes appear at the top of the list for now.
- Duplicated routes appear next to the source route.
- Deleting a route does not reorder the remaining routes.

## Backup/import

The app now has JSON backup/restore for the saved local route library. This is app JSON, not GPX. Import currently replaces the saved library after confirmation instead of merging routes.

See [library-backups.md](library-backups.md).

## Not yet

- No cross-device sync.
- No backend.
- No GPX import/export.
- No full schema migration helper beyond the current normalization logic.
- No custom sort controls yet.
- No usage history or best-time tracking yet.

## Next library work

- Add confirmation or undo for delete/clear actions.
- Consider merge behavior for JSON import once the library UI is more mature.
- Add route search/filter once there are enough saved routes to need it.
- Add optional sorting by name, distance, point count, created date, updated date, last used date, or usage count.
- Add activity history fields later, such as last used, use count, best time, and recent times.
