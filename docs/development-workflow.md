# Development workflow

This project is young. The workflow should help us move quickly without losing context.

## Branches

Use focused branches.

Milestone branches are useful while the project is being shaped:

```text
dev/v0.1.0
dev/v0.2.0
```

Feature, fix, and docs branches should be short and specific:

```text
feat/click-to-add-points
feat/local-route-library
fix/map-load
docs/release-process
```

## Starting a milestone branch

From `main`:

```sh
git status
git switch main
git pull --ff-only
git switch -c dev/v0.1.0
git push -u origin dev/v0.1.0
```

Use the current target version in the branch name. For example, Phase 1 can use `dev/v0.1.0`.

## Daily dev loop

Run the app:

```sh
npm run dev
```

Run checks before committing:

```sh
npm run lint
npm test
npm run build
```

Run browser smoke tests when UI behavior changes:

```sh
npm run test:e2e
```

## Version sync

`npm run dev` and `npm run build` both sync the displayed app version from `VERSION`.

To sync only the generated version module:

```sh
npm run version:sync
```

Details live in `docs/build-and-version.md`.

## Phone testing

For phone testing, use the Vite dev server on the LAN when needed.

Example:

```sh
npm run dev -- --host 0.0.0.0
```

Then open the displayed LAN URL from the phone.

Do not add PWA caching or a service worker until update behavior is deliberately designed and tested.

## Commit style

Keep commits small and descriptive.

Good examples:

```text
Add Leaflet map shell
Document Phase 1 foundation work
Add route model distance helper
Fix map container sizing
```

Avoid mixing unrelated work in one commit.

## Merging milestone work

When the milestone branch is ready:

```sh
git switch main
git pull --ff-only
git merge --no-ff dev/v0.1.0
```

Then follow the release checklist in `docs/release-process.md`.

## Context handoff

Before stopping a work session, update `SESSION.md` with:

- what changed
- what works
- what is broken or uncertain
- the next intended step
- any commands or browser state that matter

AI assistants should also keep `AGENTS.md` current when durable conventions change.
