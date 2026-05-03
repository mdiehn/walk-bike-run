# Phase 2: Basic route editing

Goal: make Walk Bike Run useful as a small manual route sketcher before adding save/load, GPX, routing engines, or GPS recording.

## Current Phase 2 starter features

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

## Known limits

- Distance is straight-line distance, not road/path distance.
- There is no save/load yet.
- There is no GPX or GeoJSON import/export yet.
- There is no route provider adapter yet.
- There is no GPS/current-location integration yet.
- There is no PWA/service-worker caching yet.

## Good next steps

1. Make the route list nicer on mobile.
2. Add drag-to-reorder in the list or keep up/down buttons if that feels better.
3. Add local save/load.
4. Add GPX export/import.
5. Add a routing provider adapter after the manual route model feels solid.
