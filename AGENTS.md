# AGENTS.md

This file is for AI assistants and coding agents working in this repo.

Its job is to preserve project context, working style, and coordination notes so that work can continue cleanly across tools and sessions.

## Project

Repo: `walk-bike-run`

Short internal name may be `wbr`.

Goal: build a browser-based walk, bike, and run route planner inspired by Portal Route, but not tied to IITC or Ingress.

The app should eventually replace the useful route-planning parts of MapMyRun / MapMyFitness for Mike and his wife.

## People and agents

### Mike

Mike owns the repo and the product direction.

Preferences:

- Short, plain, practical explanations
- Small reviewable changes
- Whole-file replacements or tarballs when useful
- Avoid corporate-sounding docs
- Avoid overengineering
- Keep the dev loop smooth
- Document decisions as they happen

### Frank

Frank is ChatGPT in Mike's workflow.

Frank helps with:

- Design discussion
- Architecture planning
- Docs
- Code generation
- Tarball-based updates
- Reviewing and tasking work for other agents

### Mira

Mira is Mike's Codex agent in VSCodium.

Pronouns: they/them.

Mira may work directly in the repo and should update this file or `SESSION.md` when they make decisions, change direction, or leave useful context for the next session.

## Working style

Prefer:

- Boring, obvious code
- Plain JavaScript unless there is a strong reason to use a framework
- Small commits
- Clear commit messages
- Tests for route model/actions/import/export behavior
- Playwright smoke tests for app behavior
- A clean local dev loop
- A clear build path for the app artifact

Avoid:

- Big rewrites without discussion
- Framework migration without a reason
- Early backend work
- Early service worker / PWA caching
- Clever abstractions before the second implementation exists
- Hidden manual build steps

## Important design direction

This app should reuse ideas from Portal Route, especially:

- Route list interaction
- Add/delete/reorder/edit points
- Loop route option
- Distance/time totals
- Save/load route library
- Import/export
- Phone-friendly controls
- Visible version/update hygiene

But this app should not inherit IITC-specific assumptions:

- No IITC wrapper
- No portal namespace
- No Ingress portal details
- No IITC dialogs
- No IITC layer chooser assumptions

## Architecture direction

Early structure should keep these concerns separate:

- App shell
- Map adapter
- Route model
- Route actions
- Storage
- Import/export
- UI rendering
- Tests/fixtures
- Build/version plumbing

Potential future adapter seams:

- Tile provider
- Routing provider
- Storage backend
- GPS/current-location provider
- Export/import formats

Do not over-abstract these before there is pressure from real features.

## Dev-loop requirements

The repo should keep these commands working:

```sh
npm install
npm run dev
npm run build
npm run preview
npm test
npm run lint
npm run format
npm run test:e2e
```

CI should run at least:

```sh
npm run lint
npm test
npm run build
npm run test:e2e
```

## Build/version requirements

`VERSION` is the app version source of truth.

`build.js` is the repo-level build entry point. It should:

- read `VERSION`
- sync the app-facing version module
- run the Vite build
- write build metadata under `dist/`

Do not add hidden build steps. If the installed/deployed artifact needs something, it should happen through `npm run build`.

## Update/release hygiene

Keep update behavior boring and visible.

Requirements:

- Single obvious version source
- Visible version display in dev builds
- `CHANGELOG.md` updated for user-visible changes
- Git tags/releases for meaningful milestones
- No service worker until update behavior is intentionally designed
- No PWA offline cache until stale-cache handling is solved

## Documentation files

- `README.md`: how to run and use the project now
- `ROADMAP.md`: phased project plan
- `CHANGELOG.md`: release history
- `AGENTS.md`: persistent agent/project coordination notes
- `SESSION.md`: volatile session backup and current working context
- `docs/build-and-version.md`: build and version behavior
- `docs/development-workflow.md`: branch/dev workflow
- `docs/release-process.md`: release checklist

## When leaving work for another agent

Update `SESSION.md` with:

- What changed
- What was tested
- What is broken or unknown
- Next recommended step
- Any files that deserve special attention

Keep it short, but useful.
