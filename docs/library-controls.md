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
