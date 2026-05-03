# Contributing

This repo is small and early. Keep changes boring, reviewable, and easy to back out.

## Start here

Install dependencies:

```sh
npm install
```

Run the local dev server:

```sh
npm run dev
```

Before committing, run the checks that apply to your change:

```sh
npm run lint
npm test
npm run build
```

For browser smoke tests:

```sh
npx playwright install chromium
npm run test:e2e
```

## How we work

Use short-lived branches for specific work. Milestone branches are okay while the app is young.

Examples:

```text
dev/v0.1.0
feat/click-to-add-points
fix/map-load
docs/roadmap
```

More detail lives in [docs/development-workflow.md](docs/development-workflow.md).

## Builds and versions

`VERSION` is the app version source of truth.

`npm run build` runs `build.js`, which syncs `src/version.js`, runs the Vite build, and writes build metadata under `dist/`.

More detail lives in [docs/build-and-version.md](docs/build-and-version.md).

## Releases

Each release should have:

- a version bump in `VERSION`
- a `CHANGELOG.md` entry
- passing checks
- a Git tag like `v0.1.0`
- GitHub release notes when useful

The release checklist lives in [docs/release-process.md](docs/release-process.md).

## Documentation expectations

Update docs in the same branch as the behavior change when practical.

Use:

- `README.md` for how to run and use the app
- `ROADMAP.md` for planned phases
- `CHANGELOG.md` for released changes
- `docs/` for process and design notes
- `AGENTS.md` for AI assistant conventions
- `SESSION.md` for current working context

## AI assistant notes

AI helpers should leave enough context behind that another assistant, editor, or human can continue the work.

Use:

- `AGENTS.md` for durable repo conventions and assistant roles
- `SESSION.md` for current state, next steps, and gotchas

Do not hide important project state only in chat history.

## Style

Prefer small commits. Prefer plain language. Avoid broad rewrites unless the branch is specifically for cleanup.
