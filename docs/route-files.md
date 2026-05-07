# Route files

Walk Bike Run can export and import the current route as either:

- app JSON
- GPX

This is separate from the saved route library backup. A route file contains one route only.

## App JSON route files

**Export current route JSON** downloads the route currently shown in the editor using Walk Bike Run's app-local format.

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

**Import current route JSON** reads one Walk Bike Run route file and stages it for review.

## GPX route files

**Export current route GPX** downloads the route currently shown in the editor as GPX 1.1.

The GPX export uses a `<rte>` route with `<rtept>` points.

For loop routes with at least two points, export adds a final repeated start point so other GPX tools can see the loop shape. The app removes that repeated final point when importing the GPX again and restores the loop flag.

**Import current route GPX** accepts simple GPX route points (`<rtept>`) and track points (`<trkpt>`). Imported GPX is converted into the current Walk Bike Run route model.

For now, GPX import does not preserve every possible GPX field. It keeps the useful route-planning pieces:

- route or track name
- point names when present
- latitude/longitude coordinates
- activity type when a route `<type>` matches one of the app activity types
- loop behavior when the final point repeats the start point

## Import safety

Current-route imports are staged before replacing anything.

The app shows a short preview with:

- the file name
- the route name
- the number of points

Nothing is replaced until **Replace current route** is pressed.

If the current route has unsaved changes, the app asks for confirmation before replacing it. Canceling that browser confirmation leaves the staged import in place so it can still be reviewed or canceled.

Importing a current-route file replaces the route currently shown in the editor. It does not replace or merge the saved route library.

Use **Cancel route import** to discard the staged import without changing the current route.

## Choosing export destinations later

For now, route export uses the browser download flow. The app suggests a filename, and the browser decides where the file goes based on browser settings.

Later we should add a clearer destination/share flow for route exports, especially on mobile. Possible approaches:

- browser file picker/save dialog where supported
- share sheet integration where supported
- user-configured default export behavior
- clearer filename previews before export
