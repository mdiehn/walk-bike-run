# Route stats

Route stats are intentionally simple right now.

The app currently shows:

- straight-line distance
- estimated time
- default pace/speed

Distance is calculated from point to point using latitude/longitude. If loop mode is enabled, the app includes the final segment back to the first point.

Estimated time uses the current activity type and a fixed default speed:

| Activity | Default                |
| -------- | ---------------------- |
| Walk     | 3 mph / 20:00 per mile |
| Run      | 6 mph / 10:00 per mile |
| Bike     | 12 mph                 |

These are planning estimates only. They do not yet account for roads, trails, terrain, traffic, pauses, elevation, or personal pace.

Later ideas:

- configurable default pace/speed
- per-route target pace
- activity history
- best/last time for repeated routes
- moving time vs elapsed time
- elevation-aware estimates
