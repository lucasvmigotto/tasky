# TaskY documentation site

Static, accessible, internationalized documentation for TaskY, built from
the project's code, tests and specification artifacts (see
`../product/` and `../../specs/`). Labelled truth-first: every behavior
claim carries an Implemented / Partial / Planned / Unavailable status.

- Stack: Bun · React · TypeScript · Vite · Tailwind CSS · React Router (`HashRouter`) · Biome.
- Locales: `pt-BR` (default) and `en`, in typed locale files (`src/i18n/locales/`).
- LLM output: `public/llms.txt`, `public/llms-full.txt` and one
  `public/docs/<locale>/<page>.md` per page, generated from the same typed
  content the pages render (`scripts/build-llms.ts`).

## Commands

```bash
bun install --frozen-lockfile
bun run dev            # local dev server
bun run lint           # Biome
bun run typecheck      # tsc --noEmit
bun run test           # vitest (unit + a11y)
bun run build          # build:content + typecheck + vite build
bun run test:e2e       # Playwright smoke against the production build
bun run screenshots    # capture real UI (needs the dev stack, see below)
```

## Screenshots

`bun run screenshots` drives the running development stack with Playwright
and writes PNGs to `public/screenshots/`. It needs:

- the dev stack up, app at `TASKY_APP_URL` (default `http://localhost:5173`);
- mock OIDC enabled (`MOCK_OAUTH2_ENABLED=true`);
- synthetic data for non-empty screens: `TASKY_SEED_DATA=true`,
  preferably `TASKY_SEED_PROFILE=large`.

## Ship

- Container: `Containerfile` (Bun build → pinned nginx runtime). Build with
  the docs/site directory as context:
  `podman build -f docs/site/Containerfile docs/site`.
- Cloudflare R2: `.github/workflows/docs-ci.yml` builds and syncs `dist/`
  (hashed assets immutable; HTML/`llms.txt`/`.md` no-cache; `.md` served as
  `text/markdown`). Credentials come from repository Variables/Secrets.
