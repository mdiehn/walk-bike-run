# Library controls

The saved route library now has basic display controls.

## Sort

The default sort is **Saved order**. This preserves the route order stored in `localStorage`. Re-saving an existing route updates it in place and does not move it.

Other sort options change only the visible display order:

- Name A-Z
- Distance longest first
- Points most first
- Updated newest first
- Activity

These sort options do not rewrite the saved library order. Switching back to **Saved order** restores the stored order.

## Activity filter

The activity filter can show:

- All activities
- Walk
- Bike
- Run

Filtering only changes what is visible in the library list. It does not delete, move, or modify saved routes.

## Later

Likely future controls:

- route name search
- created-date sort
- last-used sort
- use-count sort
- best-time or recent-time display once activity recording exists

## Saved route selection

The saved route highlighted in the library is the selected library row. Clicking another saved route row moves the selection without loading it into the editor. The `Current` label still marks the saved route that is loaded in the editor.

## Current route vs selected saved route

The saved route library uses two related but separate ideas:

- **Current** means the saved route currently loaded into the editor.
- **Selected** means the saved library row highlighted for library actions.

Clicking a saved route row selects it. It does not load that route into the editor.

Use the selected-route buttons to act on the highlighted saved route:

- **Load selected** loads it into the editor.
- **Copy selected** creates a saved copy next to the source route.
- **Delete selected** removes it from the library.
- **Clear selection** removes the highlight without changing the current editor route.

Current-route saving is controlled separately:

- **Save route** saves a brand-new route.
- **Save changes** updates the saved route currently loaded in the editor.
- **Save as new** creates a separate saved route instead of overwriting the loaded route.

The selected row does not control where **Save changes** writes. Loading a route is what makes it the save target.
