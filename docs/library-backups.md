# Library backups

Walk Bike Run can export and import the saved route library as app JSON.

This is an early safety feature. It is not meant to be the final sharing format, and it is not GPX.

## What export does

Export JSON writes a backup file containing the saved local route library.

The backup file contains:

- backup schema version
- app marker/kind
- app version
- export timestamp
- saved routes

## What import does

Import JSON reads a Walk Bike Run route library backup and stages it for review.

The app shows a short preview with:

- the file name
- the number of saved routes in the import
- the number of saved routes currently in the local library

Nothing is replaced until **Replace library** is pressed.

For now, import replaces the whole route library. It does not merge routes yet. Replacing the library is simpler and safer while the route model is still young.

Use **Cancel import** to discard the staged import without changing the current saved routes.

## Why this comes before GPX

The app route model is not final yet. JSON backup/restore gives us a way to protect local work before we commit to GPX import/export behavior.

GPX can come later as a portable route/activity format.

## Data model notes

Saved route entries currently use `schemaVersion: 1`.

The import path normalizes routes through `src/route-library.js`. Future route model migrations should happen there instead of scattering migration logic around the UI.

## Choosing backup destinations later

For now, library backup export uses the browser download flow. The app suggests a filename, and the browser decides where the file goes based on browser settings.

Later we should add better destination support for backups, especially because backups protect local-only saved routes. Possible approaches:

- browser file picker/save dialog where supported
- share sheet integration where supported
- user-configured backup reminder/destination notes
- clearer filename previews before export
