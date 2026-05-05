# GitHub Pages deployment

The app is deployed as a static Vite build through GitHub Actions.

## GitHub setting

In the GitHub repo:

```text
Settings -> Pages -> Build and deployment -> Source -> GitHub Actions
```

## Workflow

The deploy workflow lives at:

```text
.github/workflows/pages.yml
```

It runs on pushes to `main` and can also be started manually from the Actions tab.

The workflow:

1. installs dependencies with `npm ci`
2. runs lint and unit tests
3. builds the app with `npm run build`
4. uploads `dist/` as the GitHub Pages artifact
5. deploys that artifact to Pages

The full smoke-test workflow still lives in:

```text
.github/workflows/check.yml
```

## Base path

The workflow builds with:

```text
GITHUB_PAGES=true
GITHUB_PAGES_BASE=/walk-bike-run/
```

That matches the normal project site URL:

```text
https://<github-user>.github.io/walk-bike-run/
```

For a custom domain or a root `github.io` repo, change `GITHUB_PAGES_BASE` in `.github/workflows/pages.yml` to:

```text
/
```

Local dev and local builds still use `/` as the base path.
