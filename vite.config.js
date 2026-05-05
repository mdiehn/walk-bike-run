import { defineConfig } from 'vite';

const githubPagesBase = process.env.GITHUB_PAGES_BASE || '/walk-bike-run/';

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? githubPagesBase : '/',
});
