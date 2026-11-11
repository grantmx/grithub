# apps/lms: GRIT Hub Learning

The GRIT Hub learning management system: a Next.js App Router + strict TypeScript app in the Yarn 1 + Turborepo monorepo.

> Status: **auth and onboarding in place**; learning features not built yet. Planning and design live in [`docs/lms/`](../../docs/lms/README.md). Read [`design.md`](../../docs/lms/design.md) and the DESIGN GATE in the root `CLAUDE.md` before building any UI.

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

## Authentication

Passkeys (WebAuthn) are the primary sign-in method, via **SimpleWebAuthn** (`@simplewebauthn/server` 14.0.3 / `browser` 14.0.0). It's actively maintained, supports conditional UI (autofill), and has no opinions about our user or session schema. Email magic links are the fallback.

| Piece                                                             | Where                                                                      |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Route rules (one source of truth)                                 | `lib/access.ts`                                                            |
| Proxy (Next 16 "middleware")                                      | `proxy.ts`: checks every page request                                      |
| Server-action guard                                               | `authorize()` in `lib/server/auth.ts`, called inside every admin operation |
| Page guard (defence in depth)                                     | `requirePage()` in `lib/server/page.ts`                                    |
| Passkeys, magic links, sessions                                   | `lib/server/auth.ts`, `tokens.ts`, `session.ts`                            |
| Onboarding (cohorts, invites, CSV, deactivate, recovery, consent) | `lib/server/onboarding.ts`                                                 |
| POPIA notice (versioned)                                          | `lib/popia.ts`; see `docs/lms/compliance/popia.md`                         |

**Rules**

- No public sign-up. Accounts exist only through an admin invitation (one-by-one or CSV import).
- **Step-up:** assessors, moderators and SDP admins need **at least one active passkey** before `/staff/marking`, `/staff/moderation` or `/admin`. This is enforced in the proxy and again in every admin server action. Such staff can't remove their last passkey.
- Sessions: random token in an httpOnly cookie (`__Host-lms_session` on https), SHA-256 hash in the database, 14-day maximum.
- Emailed links (invitation 72 h, sign-in 15 min, recovery 30 min) are single-use and stored only as hashes. Opening a link does nothing until the person presses a button, so email link scanners can't use it up.
- **Rate limits** on every auth entry point (Postgres-backed so they hold across serverless instances): see `RATE_LIMITS` in `lib/server/ratelimit.ts`.
- **Audit log:** sign-in (passkey, magic link, invitation, recovery, failures), passkey added/revoked, recovery started, consent accepted, permission denials (proxy, page and action), rate-limit hits, admin actions. No emails, names or CSV contents go in audit payloads.
- We never receive or store biometric data (`docs/lms/compliance/popia.md`).

### ⚠️ The domain is part of every passkey

`WEBAUTHN_RP_ID` (the domain) and `WEBAUTHN_ORIGIN` come from environment variables. **Every passkey is permanently bound to the RP ID.** If the LMS moves to a different domain, or `WEBAUTHN_RP_ID` changes, **all existing passkeys stop working** and every user must sign in with an email link and register a new passkey. Choose the production domain before inviting real users. A subdomain such as `learn.<domain>` can share an RP ID set to the parent domain, but only if that's decided up front.

### Admin-verified account recovery

For a user who lost their device and can't use an email link, or whose account may be compromised:

1. The person contacts GRIT Hub. **Never** use SMS codes, and never read a link out over the phone.
2. An SDP admin verifies identity: in person with ID, on a video call with ID shown, or by calling a phone number already on record.
3. Admin → People → ⋯ → **Start account recovery**. Record the verification method and a short reason.
4. The system revokes **all** the user's passkeys and sessions and any outstanding links, then emails a single-use recovery link (30 minutes).
5. The user opens the link, signs in, and is asked to add a new passkey.
6. Every step is in `audit_log`: `auth.recovery.started` (admin id, method, reason) and `auth.signin.recovery`.

An admin can't recover their own account; another SDP admin must do it.

### Local development

Create `apps/lms/.env.local` (git-ignored). Use values that only exist on your machine:

```bash
DATABASE_URL=<same as packages/db/.env>
DATABASE_SSL=disable
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=http://localhost:3002
SESSION_SECRET=<at least 32 random characters>
EMAIL_TRANSPORT=console   # prints only the subject and link, never the address
```

Then `yarn workspace db db:migrate && yarn workspace db db:seed`, start `yarn workspace lms dev`, and sign in as `demo.admin@example.invalid` with **Send me a magic link** (the link appears in the terminal). Go through setup and register a passkey to reach `/admin`.

Tests need `TEST_DATABASE_URL` (see `packages/db/README.md`). They drive real registration and sign-in through a software authenticator (`test/authenticator.ts`).

**First SDP admin in a new deployment** (one-off, audited; refuses once an admin exists):

```bash
DATABASE_URL=<target database URL> yarn workspace lms admin:bootstrap "<Display Name>" <email>
```

The person then signs in at `/signin` with **Send me a magic link** and completes setup, including a passkey (required for `/admin`).

## Learner experience

Follows the approved `docs/lms/design.md` (L4 Home, L5/L6 programme, L7 learning page; wireframe approved 2026-11-08).

| Route                               | What                                                                                            |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| `/`                                 | Home: one card per programme (status, progress, Continue), Coming up                            |
| `/learn`, `/learn/:qualificationId` | Programmes; modules with section checkmarks                                                     |
| `/learn/section/:sectionId`         | Learning page: outline, optional media, text, section check, Mark as completed, Go to next item |
| `/library`                          | Digital library (published resources per programme)                                             |
| `/more`                             | Account & passkeys, Help, Sign out                                                              |
| `/staff/progress`                   | Facilitators (own cohorts) and SDP admins: per-learner printable report + CSV                   |

- **Text is the lesson.** Section text is a Markdown subset rendered by `lib/markdown.tsx`: headings, lists, links, images (alt text required; images without it are never shown), code blocks, and callouts `> [!NOTE]`/`[!TIP]`/`[!WARNING]`. No raw HTML.
- **Media** (Mux): never autoplays. The learner sees "Watch · 6 min · ~25 MB" and presses it; only then are the Mux Player script and short-lived **signed** playback tokens fetched (`getPlaybackAction`). Every audio/video needs a transcript, or is flagged as narrating the section text. Published video needs captions (database checks). Without `MUX_SIGNING_KEY_ID` / `MUX_SIGNING_PRIVATE_KEY`, media shows "not available" and the text still works.
- **Section check:** one question per section, seeded draw and option order (`lib/randomization.ts`, `docs/lms/randomization.md`), stored per attempt, graded on the server. The page only ever receives option tokens and labels until the answer is submitted. Up to 3 attempts, each preferring an unseen question. "Mark as completed" unlocks once the check is answered.
- **Progress and resume:** each view is recorded; the reading position is saved with `sendBeacon` to `/api/progress/scroll`; Continue opens the last viewed section at that position (or the next incomplete one).
- **Works without JavaScript:** checks, completion and the Display menu are plain forms. JS only adds scroll memory, auto-opening the outline on wide screens, and the media player.
- **Display menu:** text size S/M/L/XL and theme System/Light/Dark, saved per user.

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
