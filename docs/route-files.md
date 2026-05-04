# Route files

Walk Bike Run can export and import the current route as app JSON.

This is separate from the saved route library backup. A route file contains one route only.

It is still an app-local format, not GPX.

## What export does

**Export current route JSON** downloads the route currently shown in the editor.

The file contains:

- route file schema version
- app marker/kind
- app version
- export timestamp
- one route

The exported route includes:

- name
- activity type
- loop setting
- points

## What import does

**Import current route JSON** reads one Walk Bike Run route file and stages it for review.

The app shows a short preview with:

- the file name
- the route name
- the number of points

Nothing is replaced until **Replace current route** is pressed.

Importing a current-route file replaces the route currently shown in the editor. It does not replace or merge the saved route library.

Use **Cancel route import** to discard the staged import without changing the current route.

## Why this comes before GPX

This gives us a small backup/share path for one route without committing to GPX behavior yet.

GPX export/import can come later when we decide how to represent planned routes, completed activities, and routed geometry.
