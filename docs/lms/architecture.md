# Architecture (proposed)

Everything here is a **proposal**. Accepted choices are recorded in [decisions.md](decisions.md).

## Shape in the monorepo

```
apps/lms          Next.js App Router, TypeScript (strict). UI, route handlers, server actions
packages/db       Drizzle schema, SQL migrations, typed query helpers (new package)
docs/lms          These planning docs
```

`apps/lms` is deployed as its own Vercel project, in the same way `apps/docs` is deployed separately. It shares nothing at runtime with `apps/web`. The existing `packages/ui` is **not** reused: it is JS-heavy, carries its own Firebase/PayFast copies, and is out of scope for this work.

Env vars for the LMS are registered in the root `turbo.json` `tasks.build.env`, following repo convention. Values live only in Vercel project settings and untracked `.env.local` files, never in the repo.

## Stack choices

### 1. Application: Next.js App Router + TypeScript in `apps/lms`

- **Picked because:** it matches the team's existing Next.js/Vercel experience, Server Components keep answer keys and grading on the server, and route handlers and server actions cover the API surface.
- **Alternative: add LMS routes to `apps/web`.** Rejected. It would mix a public marketing site with authenticated learner data, its security headers and CSP differ, it is mostly JS, and a separate deploy reduces blast radius.
- **Alternative: Remix / React Router v7.** A good fit for forms, but it adds a second framework to maintain.

### 2. Database: Postgres via Drizzle in `packages/db`

- **Picked Drizzle because:** it is TypeScript-first and its schema is plain TS. It generates readable SQL migration files that are committed and reviewed, and it has no binary query engine, so it starts quickly in serverless functions and works with pooled connections.
- **Alternative: Prisma.** It has a mature ecosystem and Studio, but its heavier client/engine and separate schema DSL make raw SQL less natural for audit and outbox patterns.
- **Alternative: Supabase (Postgres + auth + storage).** Rejected as the primary choice. It bundles auth and storage decisions we want to make separately, and region options matter for POPIA (see open questions).
- **Rule:** every schema change ships with a migration file. Production never uses `push`.

### 3. Object storage: S3-compatible, signed direct uploads

Used for practical submissions (POE files), facilitator attachments and exports.

- **Proposed:** an S3-compatible bucket behind a small `storage` interface (`createUploadUrl`, `createDownloadUrl`, `head`, `delete`). The candidate is **AWS S3 `af-south-1` (Cape Town)**, which keeps POE data in South Africa. The browser uploads **directly** to the bucket with a short-lived presigned URL. The server then confirms the object (size, type, checksum) and creates the `Submission` row.
- **Alternative: Vercel Blob client uploads.** Already used by `apps/web`, simplest to operate, and supports token-based client uploads. Data region choice is limited.
- **Alternative: Cloudflare R2.** No egress fees and S3-compatible, but jurisdiction controls may not include South Africa.
- Files are private by default. Downloads use short-lived signed URLs, and each issue is written to `AuditLog`.

### 4. Video and audio: hosted (Mux)

Text is the core of every content item. Audio and video are optional attachments.

- **Picked Mux because:** `apps/web` already uses `@mux/mux-player-react`. It handles adaptive streaming (important on mobile data), supports audio-only assets, signed playback, and captions/transcripts.
- **Alternative: Cloudflare Stream.** Similar features and simple pricing, but a new vendor.
- **Alternative: unlisted YouTube.** Free, but it has ads/recommendations, no signed playback, and weak access control.
- Low-bandwidth rule: media never autoplays, and every audio/video item has a text equivalent.

### 5. Authentication: passkeys (WebAuthn)

- **Proposed:** `@simplewebauthn/server` + `@simplewebauthn/browser`, with sessions stored in Postgres (httpOnly, secure, SameSite=Lax cookie holding an opaque session id).
- **Onboarding:** an admin invites a learner. The learner gets an email with a single-use, short-lived invite link and registers a passkey on their device. A user can register several passkeys (`PasskeyCredential`).
- **Recovery:** an admin re-issues an invite after identity is checked in person or by a known channel. There are no passwords and no public sign-up.
- **Alternative: Better Auth (passkey plugin).** Less code, but adds a framework with its own schema conventions.
- **Alternative: Clerk (hosted).** Fastest to ship, but user data sits with a third party, which affects POPIA and cost per user.
- **Risk:** shared lab computers on assessment days. A passkey on a shared machine is not personal. See open questions.

### 6. Email

- **Proposed:** a single provider behind a `sendEmail({to, subject, html, text})` interface in `apps/lms`. This is the same shape as `apps/web/services/*.service.js`, but there is only one implementation. Resend is the candidate (it is already in `turbo.json`).
- **Alternative: SendGrid** (also already in use).
- Email content holds links only. It never includes assessment content, marks or personal documents.

### 7. Airtable: one-way sync

- **Proposed:** a transactional **outbox**. Domain writes (enrolment, attendance, result) insert a `SyncOutbox` row in the same DB transaction. A scheduled worker (Vercel Cron → route handler) sends pending rows to Airtable in batches, with retries and backoff.
- Only minimal, agreed fields are sent (data minimisation). Airtable edits **never** flow back.
- **Alternative: push to Airtable inline on each write.** Simpler, but it couples user requests to Airtable latency and rate limits and loses events on failure.
- **Alternative: periodic CSV export.** Robust, but manual and stale.

### 8. Testing (for `apps/lms` only)

- Vitest for unit/integration tests (randomization, grading, permissions, migrations against a disposable Postgres). Playwright for end-to-end flows, using WebAuthn virtual authenticators.

## Vercel platform limits that shape the design

Verify the current values against Vercel documentation at build time. Limits change between plans and over time.

- **Function request/response body size is about 4.5 MB.** POE uploads (photos, video, zipped project files) will exceed this, so **files must never pass through a function**. Use presigned direct-to-storage uploads, and keep function payloads small (metadata only).
- **Function max duration depends on the plan and on whether Fluid compute is enabled.** Long jobs (bulk exports of POEs, ZIP generation, Airtable backfills) must be chunked, resumable, or run as background/cron work. They cannot run as one request.
- **Cron frequency and count are plan-limited.** This affects how quickly the Airtable outbox drains.
- **Region:** functions should run near the database. Vercel has a Cape Town region (`cpt1`). The database and bucket region should match.

## Security baseline

- Answer keys, grading and blueprint resolution are server-only (see [randomization.md](randomization.md)).
- Authorization is checked in a server-side data-access layer. UI hiding is never the control.
- Every assessment decision, moderation record, role change and file download is written to an append-only `AuditLog`.
- Strict CSP, no third-party scripts on assessment pages, and no analytics on learner content beyond what consent allows.
- No secrets, personal data or real learner data in the repo, test fixtures or seed scripts. Seeds use synthetic data.

## Open questions

1. **DB and storage region.** South Africa (AWS `af-south-1` / Vercel `cpt1`) vs EU. Which managed Postgres providers offer a South African region? Is cross-border transfer acceptable under POPIA section 72?
2. **POPIA.** Who is the Information Officer? Do we have operator agreements with each processor (DB host, storage, Mux, email, Airtable)? What are the retention periods for POE and assessment records (QCTO record-keeping vs POPIA minimisation)? How are data subject access/correction requests handled? Is a Privacy notice for learners in place?
3. **Backups.** What backup frequency, retention and restore-test schedule do we need? Form 5 4.1 asks for this evidence. Do we need point-in-time recovery?
4. **Shared devices.** On assessment days, do learners use their own phones as roaming passkeys (hybrid/QR flow) on hub machines, or are hub machines enrolled per learner? Do we need a supervised "assessment-day session" issued by staff?
5. **Connectivity.** Do we need offline-tolerant behaviour for load-shedding/outages during in-person assessments (for example, local autosave and resume)?
6. **"LMS licence" evidence** for a self-built LMS. See the note in [compliance/form5-mapping.md](compliance/form5-mapping.md).
