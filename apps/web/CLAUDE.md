# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This directory (`apps/web`) is the public GRIT Hub website (grithub.org.za), built with Next.js. See the root `CLAUDE.md` for monorepo-wide commands and context; this file covers `apps/web` specifically.

## Commands

Run from this directory:

```bash
yarn dev      # next dev --port 3000
yarn build    # next build
yarn start    # next start (serve the production build)
yarn lint     # next lint
```

There is no test runner configured in this app — don't invent test commands.

## Routing: `app/` vs `pages/`

Next.js App Router (`app/`) and the legacy Pages Router (`pages/`) are both in use, split by responsibility:

- `app/` — every real page and layout. Route groups: `(home)` (landing page), `(pages)` (about, contact, programs, newsroom, cowork, terms/privacy, media-kit), `(interactions)` (portal, success, cancel — payment/registration outcome pages, own layout).
- `pages/` — kept alive *only* for `pages/api/*` API routes: `email/`, `eskomSE/`, `forms/`, `payfast/`, `upload/`, `yoco/`. New backend endpoints go here, not under `app/api`.

## Import alias

Use `@/*` for absolute imports from the `apps/web` root (configured in `tsconfig.json`, works in `.js`/`.jsx` files too, e.g. `@/services/payfast/payfast.service`, `@/components/schema/Organization`). There's also an older `jsconfig.json` with narrower `components/*`/`services/*`/`styles/*` paths — `@/*` is the one actually used throughout the codebase; prefer it for new code.

## Content: Sanity CMS

Site content (newsroom/blog posts) is fetched from Sanity via `services/sanity/sanity.service.js`, using GROQ queries against the Studio defined in `apps/cms` (projectId `67zfq8ba`, dataset `production`). Fetch helpers are wrapped in Next's `"use cache"` with explicit `cacheTag`/`cacheLife` calls (e.g. `latest-posts`, `post-${slug}`) — when changing a query's shape or adding a new one, keep tag names consistent with anything that needs to invalidate them. Schema changes belong in `apps/cms/schemaTypes`, not here.

## Payments & registrations

Two independent payment gateways are wired up, both used for course/program registrations and co-working bookings (`components/bookings/*`, `app/(pages)/programs/*/register`, `app/(pages)/cowork/book`):

- **PayFast** — `services/payfast/payfast.service.js` builds the signed param string (`lib/utils/generateSignature.js`); `pages/api/payfast/generatePayId.js` posts it to PayFast's onsite process endpoint.
- **Yoco** — `services/yoco/useYocoUrl.js` / `pages/api/yoco/getCheckoutUrl.js`.

Form submissions that aren't payments (internship applications, registrations) go through `pages/api/forms/*` and are persisted to **Google Sheets** (`services/google/googleSheets.js`) and/or **Airtable** (`services/airtable/airtable.service.js`) rather than a database — there is no SQL/ORM layer in this app. Transactional email on top of these flows goes through `services/sendgrid.service.js` / `services/nodemailer.service.js` (MJML-authored templates in `components/emails`), and `services/nodemailer.service.js`'s counterpart in `thirdparty`/Twilio handles SMS-adjacent notifications.

## Other integrations

- **Firebase** (`services/firebase`) — auxiliary data/auth. A separate, older copy of the Firebase service also exists in `packages/ui/services/firebase`; check which one a given component actually imports before editing.
- **EskomSePush** (`pages/api/eskomSE/getArea.js`) — loadshedding area lookups, exposed with permissive CORS headers set in `next.config.js`.
- **`@c15t/nextjs`** — cookie consent, mounted as `ConsentManager` in `app/layout.js`, with API calls proxied through the `/api/c15t/*` rewrite in `next.config.js` to `NEXT_PUBLIC_C15T_URL`.
- Analytics: `@vercel/analytics`, `@vercel/speed-insights`, and Google Analytics via `thirdparty/google` (`gtag.js`, `GoogleEventTracker`).

## Styling

SCSS Modules colocated with components/pages (`ComponentName.module.scss`), plus shared globals under `styles/globals/` (`_variables.scss`, `_mixins.scss`, `_utilities.scss`, etc.) imported through `styles/global.scss` in the root layout. Bootstrap is a dependency but usage is limited — check whether a page already leans on SCSS modules or Bootstrap classes before introducing a new pattern.

## Icons

`components/icons` holds a large hand-authored set of one-component-per-icon `.jsx` files (exported from `components/icons/index.js`). `packages/ui/components/icons` is a separate set used by the shared `ui` package — check both before adding a new icon to avoid duplicating one that already exists elsewhere.

## Config notes

- `next.config.js` sets `output: 'standalone'` (Vercel deployment), security headers, a strict CSP for `sw.js`, and permanent redirects for legacy program URLs (`/dojo` → `/programs/dojo`, `/incubation` → `/programs/incubation`).
- Env vars are declared centrally in the root `turbo.json` (`tasks.build.env`), not in a per-app `.env.example` — that list is the source of truth for what the build expects.
