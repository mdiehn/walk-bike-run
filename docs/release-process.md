# Release process

Releases should be simple and repeatable.

## Versioning

Use tags like:

```text
v0.1.0
v0.2.0
v1.0.0
```

`VERSION` is the app version source of truth. Keep `VERSION`, the Git tag, and the changelog aligned.

During development, use versions like:

```text
0.1.0-dev
```

For a release, change `VERSION` to the final version before tagging:

```text
0.1.0
```

## Before release

From the release branch or milestone branch:

```sh
git status
npm run lint
npm test
npm run build
npm run test:e2e
```

Fix failures before tagging.

## Changelog

Update `CHANGELOG.md` before the release.

Use short sections such as:

```markdown
## v0.1.0 - YYYY-MM-DD

- Added initial Vite/Leaflet app shell.
- Added dev/test/build workflow.
- Added Phase 1 documentation.
```

## Build artifact

`npm run build` creates the deployable app under:

```text
dist/
```

It also writes:

```text
dist/build-info.json
```

Use that file later if there is confusion about what version was deployed.

## Merge to main

When ready:

```sh
git switch main
git pull --ff-only
git merge --no-ff dev/v0.1.0
```

## Tag

Create an annotated tag:

```sh
git tag -a v0.1.0 -m "Release v0.1.0"
```

Push main and the tag:

```sh
git push origin main v0.1.0
```

## GitHub release

Create a GitHub release from the tag when useful.

Use the changelog entry as the starting point for the release notes.

For early development versions, mark the release as a pre-release if the app is not yet useful to non-developers.

## After release

Start the next milestone branch:

```sh
git switch -c dev/v0.2.0
git push -u origin dev/v0.2.0
```

Then update `SESSION.md` with the new target.

## Update hygiene

Do not add a service worker or PWA caching casually.

When PWA support is added later, release notes should clearly describe update behavior and any cache-clearing escape hatch.
