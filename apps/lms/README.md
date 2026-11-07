# apps/lms: GRIT Hub Learning

The GRIT Hub learning management system: a Next.js App Router + strict TypeScript app in the Yarn 1 + Turborepo monorepo.

> Status: **scaffold only.** No auth, database or real features yet. Planning and design live in [`docs/lms/`](../../docs/lms/README.md). Read [`design.md`](../../docs/lms/design.md) and the DESIGN GATE in the root `CLAUDE.md` before building any UI.

## Commands

From the repo root:

```bash
yarn workspace lms dev        # http://localhost:3002
yarn workspace lms build
yarn workspace lms lint       # ESLint 9 flat config (eslint-config-custom)
yarn workspace lms typecheck  # next typegen && tsc --noEmit
yarn workspace lms test       # Vitest

npx turbo run lint typecheck test build --filter=lms
```

Ports in use: `web` 3000, `docs` 3001, `lms` 3002.

## Structure

```
app/
  layout.tsx            Root layout: Inter (next/font), tokens, skip link, noindex
  styles/tokens.css     Design tokens from docs/lms/design.md §9 (light + dark)
  styles/globals.css    Base styles, focus ring, reduced motion
  HoldingPage.tsx       Minimal holding page (design-gate decision)
  (learn)/              Learner area → /, later /learn, /schedule …
  staff/                Staff area   → /staff/…
  admin/                Admin area   → /admin/…
  api/health/route.ts   GET /api/health → { status, service, time }
public/brand/           GRIT Hub logos (copied from apps/web)
turbo.json              Package-level Turbo config: LMS env var names
.env.example            Future env var names, no values
```

`packages/ui` is a dependency (`transpilePackages: ["ui"]`), but none of its components are rendered yet. They use apps/web's SCSS look and will be restyled with the LMS tokens first.

## Environment variables

- Names only in [`.env.example`](.env.example). Values never go in the repo.
- Every name is registered in [`turbo.json`](turbo.json) (`tasks.build.env`), so Turbo caching notices changes. This package-level file keeps LMS variables out of apps/web's cache key.
- Locally: copy `.env.example` to `.env.local` (git-ignored) when a feature needs a value. Nothing is required yet.

## Vercel setup

Create a **separate Vercel project** for the LMS (like `apps/docs`), connected to this repository.

| Setting                                  | Value                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| Framework Preset                         | Next.js                                                                   |
| Root Directory                           | `apps/lms`                                                                |
| Include files outside the Root Directory | Enabled (default; needed for `packages/*` and the root `yarn.lock`)       |
| Install Command                          | default (Vercel detects Yarn 1 from the root `yarn.lock`)                 |
| Build Command                            | default (`next build`), or `cd ../.. && npx turbo run build --filter=lms` |
| Output Directory                         | default                                                                   |
| Node.js Version                          | 22.x                                                                      |
| Ignored Build Step                       | `npx turbo-ignore --fallback=HEAD^1`                                      |
| Function region                          | pending decision (see `docs/lms/architecture.md`, open question 1)        |

### Ignored Build Step

`turbo-ignore` builds only when `apps/lms` **or one of its workspace dependencies** changed since the last deployed commit. It runs `turbo run build --filter=lms...[<ref>]`.

- Changes only in `apps/web`, `apps/docs` or `apps/cms`: **skipped**.
- Changes in `apps/lms`, `packages/ui`, `packages/eslint-config-custom`, `packages/tsconfig`, the root `turbo.json` or `yarn.lock`: **built**.
- `--fallback=HEAD^1` compares against the previous commit when Vercel has no earlier deployment to compare with.

(Vercel semantics: the command exits `0` to skip the build and `1` to build. `turbo-ignore` handles this.)

To make apps/web and apps/docs skip LMS-only changes the same way, give those projects `npx turbo-ignore --fallback=HEAD^1` as well. That's a separate change to their Vercel settings.

### Health check

`GET /api/health` returns `200` with `{"status":"ok","service":"lms","time":"…"}` and `Cache-Control: no-store`. It exposes no configuration. Use it for uptime monitoring.

## Conventions

See the "LMS" section of the root `CLAUDE.md`: strict TypeScript, no secrets, a migration for every schema change, tests for every feature, and `docs/lms/compliance/form5-mapping.md` updated with every feature.
