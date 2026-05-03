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

Import JSON reads a Walk Bike Run route library backup and replaces the current saved route library.

For now, import does not merge routes. Replacing the library is simpler and safer while the route model is still young.

## Why this comes before GPX

The app route model is not final yet. JSON backup/restore gives us a way to protect local work before we commit to GPX import/export behavior.

GPX can come later as a portable route/activity format.

## Data model notes

Saved route entries currently use `schemaVersion: 1`.

The import path normalizes routes through `src/route-library.js`. Future route model migrations should happen there instead of scattering migration logic around the UI.
