# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The marketing/community website for GRIT Hub (Garden Route Innovation and Technology Hub, grithub.org.za), a Yarn/Turborepo monorepo:

- `apps/web` — the public Next.js site (App Router). This is where almost all work happens.
- `apps/cms` — a Sanity Studio (v3) content studio for blog/newsroom posts, deployed separately.
- `apps/docs` — the GRIT Hub SOP internal wiki (Nextra docs theme, Markdown in `apps/docs/content`), deployed as its own Vercel project. Edit only content there unless asked. Use the blank `>` line after `[!NOTE]`-style alerts and keep `zod` resolutions in the root `package.json` (newer zod breaks Nextra 4.6.1).
- `packages/ui` — shared React component library (`ui`) consumed by `apps/web` via the `ui` workspace alias. Has its own copies of several services (Firebase, PayFast, SendGrid, nodemailer) that overlap with `apps/web/services` — check both before assuming a service lives in only one place.
- `apps/lms` — the GRIT Hub learning platform (Next.js App Router + strict TypeScript), deployed as its own Vercel project: auth, learner pages, section checks and the knowledge assessment engine; see the LMS section below.
- `packages/eslint-config-custom` — shared **ESLint 9 flat config** (`eslint-config-next` 16 + turbo + prettier). Workspaces use it from their own `eslint.config.mjs` (`import custom from "eslint-config-custom"`). There is no root `.eslintrc.js` any more. `apps/web` still has a legacy `.eslintrc` and its `next lint` script is broken under Next 16 (`next lint` was removed); it needs migrating separately.
- `packages/tsconfig` — shared tsconfig presets (`base.json` is `strict: true`).

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
yarn workspace docs dev     # apps/docs (SOP site) on :3001; build also generates the pagefind search index
yarn workspace lms dev      # apps/lms on :3002 (also: lint, typecheck, test, build)
yarn workspace db db:migrate  # packages/db (Drizzle): also db:up, db:seed, db:generate, test — see packages/db/README.md
yarn workspace grithub-cms dev   # sanity dev — Sanity Studio local editor
```

`apps/cms` additionally has `deploy` (deploy the Studio) and `deploy-graphql` (deploy the GraphQL API) — these publish to Sanity's hosted infra, so don't run them without being asked.

The only test runner is **Vitest in `apps/lms`** (`yarn workspace lms test`, or `yarn test` → `turbo run test`). No other workspace has tests configured; don't invent test commands for them.

Installing/removing/upgrading a dependency in one workspace:

```bash
yarn workspace <workspace> add <package>
yarn workspace <workspace> remove <package>
yarn workspace <workspace> upgrade <package>
```

## Architecture notes (apps/web)

- **Routing is split between `app/` and `pages/`.** All real pages/layouts live under `app/` (App Router, route groups `(home)`, `(pages)`, `(interactions)`). `pages/` is kept alive _only_ for `pages/api/*` — API routes for email, PayFast, Yoco, EskomSePush, file uploads, and form submissions. When adding a new backend endpoint, it goes in `pages/api`, not `app/api`.
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

## LMS (apps/lms)

Planning docs live in `docs/lms/` (start at `docs/lms/README.md`). Conventions for all LMS work (`apps/lms`, `packages/db`):

- **Strict TypeScript.** `strict: true`, no `any` without a justifying comment, no `.js` source files.
- **No secrets in the repo.** This repo is public. No keys, tokens, credentials, real learner data or personal data in code, fixtures, seeds, docs or commit messages. Register every new LMS env var by name in `apps/lms/turbo.json` (`tasks.build.env`) and `apps/lms/.env.example`; values live only in Vercel and untracked `.env.local`.
- **Every schema change needs a migration.** Commit the generated SQL migration with the schema change; never rely on `push` against shared databases.
- **Every feature needs tests.** This overrides the repo-wide "no test runner" note for `apps/lms` and `packages/db` only (Vitest is set up; Playwright comes with the first end-to-end flow, see `docs/lms/decisions.md` ADR-009).
- **Every feature updates `docs/lms/compliance/form5-mapping.md`.** Move the affected rows' status forward and link the evidence.
- Programmes have only Knowledge and Practical modules: no Workplace module, logbook or mentor role.
- **Section content** is Markdown (subset in `apps/lms/lib/markdown.tsx`; images need alt text). Section checks must go through `lib/server/sectionCheck.ts`, and blueprint assessments through `lib/server/assessments.ts` (papers drawn by `lib/paper.ts`): never send option ids, correctness, explanations or rubrics to the browser before grading. Answer keys are for assessors, moderators and evaluators only (`KEY_ROLES` in `lib/server/marking.ts`).
- **Access control:** every new route needs a rule in `apps/lms/lib/access.ts` (used by `proxy.ts`) and a row in `apps/lms/test/access.test.ts`. Every server action that writes must call `authorize()` from `lib/server/auth.ts`. Never log personal data; audit payloads hold ids and counts only.
- **Tenancy readiness:** any new table must include a tenant_id column (nullable until the tenancy migration, defaulting to the GRIT tenant), per-tenant unique constraints where a uniqueness rule exists, and no hard-coded GRIT names, domains, emails or legal text (read them from settings or constants in one place). Reference data that is shared across tenants (QCTO codes, Stats SA areas, EISA schedule) is marked GLOBAL in a single config file.

**DESIGN GATE:** Before making any design, layout, typography, colour, navigation or interaction decision for apps/lms, STOP and ask me clarifying questions (use your question tool, in batches). Do not proceed until I answer. Record the answers in docs/lms/design.md.
