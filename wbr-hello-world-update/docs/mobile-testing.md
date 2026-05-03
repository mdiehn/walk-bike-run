# Mobile testing

The dev server is set up so a phone can test the app over the same LAN.

## Start the dev server

```sh
npm run dev
```

Vite should print a local URL and one or more network URLs.

Use the network URL on your phone, for example:

```text
http://192.168.1.50:5173/
```

## Fedora firewall note

If the phone cannot reach the dev server, open the Vite dev port temporarily:

```sh
sudo firewall-cmd --add-port=5173/tcp
```

To remove it later:

```sh
sudo firewall-cmd --remove-port=5173/tcp
```

Do not add `--permanent` unless you really want the port kept open.

## What to check

On desktop and phone:

- the page loads
- the map appears
- the version pill appears
- the status panel shows viewport size
- clicking/tapping the map adds a point
- Add sample point works
- Clear works
- the layout is usable without zooming the page

## Cache note

There is no service worker yet, so normal browser refresh should be enough during Phase 1.

If the phone shows stale content anyway, use a private tab or clear site data for the dev-server URL.
