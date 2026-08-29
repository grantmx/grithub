# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The marketing/community website for GRIT Hub (Garden Route Innovation and Technology Hub, grithub.org.za), a Yarn/Turborepo monorepo:

- `apps/web` — the public Next.js site (App Router). This is where almost all work happens.
- `apps/cms` — a Sanity Studio (v3) content studio for blog/newsroom posts, deployed separately.
- `apps/docs` — a mostly-unmaintained Turborepo boilerplate docs app (Next 13, old React 18); not part of the live product.
- `packages/ui` — shared React component library (`ui`) consumed by `apps/web`/`apps/docs` via the `ui` workspace alias. Has its own copies of several services (Firebase, PayFast, SendGrid, nodemailer) that overlap with `apps/web/services` — check both before assuming a service lives in only one place.
- `packages/eslint-config-custom`, `packages/tsconfig` — shared lint/tsconfig presets.

## Commands

Run from the repo root unless noted. Package manager is Yarn 1 (classic), Node >=18.

```bash
yarn dev            # turbo run dev --parallel — runs all apps' dev servers concurrently
yarn build          # turbo run build
yarn lint           # turbo run lint
yarn format         # prettier --write on ts/tsx/md/js/jsx
```

Per-app (from `apps/web`, `apps/cms`, or `apps/docs`), or via `yarn workspace <name> <script>` from the root:

```bash
yarn workspace web dev      # apps/web on :3000
yarn workspace docs dev     # apps/docs on :3001
yarn workspace grithub-cms dev   # sanity dev — Sanity Studio local editor
```

`apps/cms` additionally has `deploy` (deploy the Studio) and `deploy-graphql` (deploy the GraphQL API) — these publish to Sanity's hosted infra, so don't run them without being asked.

There is no test suite/runner configured anywhere in this repo (no jest/vitest/playwright). Don't assume one exists or try to invent test commands.

Installing/removing/upgrading a dependency in one workspace:

```bash
yarn workspace <workspace> add <package>
yarn workspace <workspace> remove <package>
yarn workspace <workspace> upgrade <package>
```

## Architecture notes (apps/web)

- **Routing is split between `app/` and `pages/`.** All real pages/layouts live under `app/` (App Router, route groups `(home)`, `(pages)`, `(interactions)`). `pages/` is kept alive *only* for `pages/api/*` — API routes for email, PayFast, Yoco, EskomSePush, file uploads, and form submissions. When adding a new backend endpoint, it goes in `pages/api`, not `app/api`.
- **Two payment gateways are integrated**: PayFast (`services/payfast`, `pages/api/payfast/generatePayId.js`) and Yoco (`services/yoco`, `pages/api/yoco/getCheckoutUrl.js`), used for course/program registrations and co-working bookings (`components/bookings/*`).
- **Content comes from Sanity**, fetched via `services/sanity/sanity.service.js` using GROQ queries against the project defined in `apps/cms/sanity.config.js` (projectId `67zfq8ba`, dataset `production`). Sanity fetch helpers use Next's `"use cache"` / `cacheTag` / `cacheLife` directives — when editing them, keep cache tags consistent with what's invalidated elsewhere (e.g. `latest-posts`, `post-${slug}`).
- **Firebase** (`services/firebase`) is used for auxiliary data/auth; there's a separate, older Firebase service under `packages/ui/services/firebase`.
- **Third-party integrations beyond payments/CMS**: SendGrid + nodemailer + MJML (transactional/marketing email), Twilio, Google Sheets API and Airtable (used as lightweight datastores for form submissions/registrations), Google Analytics via `thirdparty/google`, and `@c15t/nextjs` for consent management (wired through `ConsentManager` in the root layout and the `/api/c15t/*` rewrite in `next.config.js`).
- **Programs/courses** (`app/(pages)/programs/*`) are the largest content area — each program has its own route, and several have nested `register`/`success` flows that post to `pages/api/forms/*`.
- The site is deployed to Vercel (`output: 'standalone'`, `@vercel/analytics`, `@vercel/speed-insights`). `next.config.js` sets security headers, a strict CSP for `sw.js`, and permanent redirects for legacy program URLs (`/dojo`, `/incubation`).
- Styling is SCSS Modules (`*.module.scss`) alongside components, plus a global `styles/global.scss`; Bootstrap and Sass are both dependencies.
- Icons: `apps/web/components/icons` and `packages/ui/components/icons` are two separate, large hand-authored icon sets — check both before adding a new icon component to avoid duplicating an existing one.

## Environment configuration

Env vars are declared centrally in the root `turbo.json` under `tasks.build.env` (not per-app `.env.example` files) — that list is the source of truth for what secrets/config the build expects (Sanity, PayFast/Yoco keys, Twilio, SendGrid, Google service account, Airtable, EskomSePush, email server credentials, Vercel Blob token, etc.). When adding a new environment variable, register it there so Turborepo's caching picks up on changes to it.
