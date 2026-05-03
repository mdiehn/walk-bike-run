# Phase 2: Basic route editing

Goal: make Walk Bike Run useful as a small manual route sketcher before adding GPX, routing engines, GPS recording, or PWA caching.

## Current Phase 2 features

- Click or tap the map to add a route point.
- Add a point at the current map center.
- Show route points in a list.
- Rename route points.
- Move route points up and down in the list.
- Delete individual route points.
- Clear the route.
- Drag numbered map markers to move points.
- Toggle loop-back-to-start.
- Show straight-line distance.
- Fit the map to the current route.
- Save the current route to a local browser route library.
- Load, duplicate, and delete saved local routes.
- Start a new route without clearing the local library.

## Route library behavior

The route library uses `localStorage` for now.

This is good enough for the early app loop because it is simple and works without a backend. It is not a backup or sync system.

Important limits:

- Saved routes are local to the current browser profile and device.
- Clearing site data can delete saved routes.
- Routes do not sync between desktop and phone yet.
- Export/import should come before anyone trusts this with important routes.

## Known limits

- Distance is straight-line distance, not road/path distance.
- There is no GPX or GeoJSON import/export yet.
- There is no route provider adapter yet.
- There is no GPS/current-location integration yet.
- There is no PWA/service-worker caching yet.

## Good next steps

1. Add JSON backup/export for the local library.
2. Add GPX export/import.
3. Improve mobile layout for the route library.
4. Add drag-to-reorder in the list or keep up/down buttons if that feels better.
5. Add a routing provider adapter after the manual route model feels solid.
