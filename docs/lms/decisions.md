# Decisions (ADR log) and open questions

Format: each ADR has a status (`Proposed`, `Accepted`, `Superseded by ADR-NNN`), context, decision and consequences. Nothing below is accepted yet.

## ADR-001: LMS is a separate app in the monorepo (`apps/lms`)

- **Status:** Proposed
- **Context:** `apps/web` is a public marketing site, mostly JS, with its own CSP and payment flows.
- **Decision:** a new Next.js App Router + strict TypeScript app, deployed as its own Vercel project.
- **Consequences:** separate security posture and deploy; some duplicated utilities (email) by design, to avoid touching `apps/web`/`packages/ui`.

## ADR-002: Postgres + Drizzle in `packages/db`

- **Status:** Accepted (2026-11-07): Drizzle 0.44 + drizzle-kit 0.31, postgres.js driver; schema, migrations, triggers and tests in `packages/db`
- **Decision:** Drizzle ORM with committed SQL migrations; every schema change needs a migration.
- **Alternatives:** Prisma; Supabase.
- **Consequences:** typed schema shared by the app and scripts; migrations reviewed as SQL.

## ADR-003: Object storage with signed direct uploads

- **Status:** Proposed
- **Decision:** S3-compatible storage behind an interface; presigned direct uploads; private by default; candidate region `af-south-1`.
- **Alternatives:** Vercel Blob; Cloudflare R2.
- **Consequences:** avoids the function body limit; requires a confirm-upload step and checksum verification.

## ADR-004: Hosted media via Mux

- **Status:** Proposed
- **Decision:** text is the core content; optional audio/video is hosted on Mux with signed playback.
- **Alternatives:** Cloudflare Stream; unlisted YouTube.

## ADR-005: Passkey-only authentication, invite-only accounts

- **Status:** Proposed
- **Decision:** WebAuthn via SimpleWebAuthn with DB sessions; admin invite links; admin re-invite for recovery; no passwords; no public sign-up.
- **Alternatives:** Better Auth; Clerk.
- **Consequences:** strong phishing resistance; needs a clear shared-device and lost-device procedure.

## ADR-006: One-way Airtable sync via transactional outbox

- **Status:** Proposed
- **Decision:** LMS is the system of record; `SyncOutbox` rows are drained by a cron worker; minimal fields; no write-back.

## ADR-007: Seeded randomization, persisted attempt snapshots, server-only grading

- **Status:** Proposed
- **Decision:** as specified in [randomization.md](randomization.md).

## ADR-008: Immutable question versions and append-only decisions/audit

- **Status:** Proposed
- **Decision:** QuestionVersion becomes immutable when first served; AssessmentDecision changes create superseding rows; AuditLog is append-only.

## ADR-009: Tests required for `apps/lms`

- **Status:** Accepted (2026-11-07): Vitest 3 set up in the scaffold; Playwright to be added with the first e2e flow
- **Context:** the rest of the repo has no test runner.
- **Decision:** Vitest (unit/integration, including DB against disposable Postgres) and Playwright (e2e with WebAuthn virtual authenticator), scoped to `apps/lms` and `packages/db`.

## ADR-010: Lint/TS config for the new workspaces

- **Status:** Superseded by ADR-011
- **Context:** `packages/eslint-config-custom` pins ESLint 7 / `eslint-config-next` 13, which is too old for current Next.js, and `packages/*` must not change in this phase.
- **Decision:** `apps/lms` carries its own ESLint config initially and extends `packages/tsconfig/base.json` (already `strict: true`). Upgrading the shared config is a separate, later change.

## ADR-011: Upgrade the shared ESLint config; fix packages/ui React; reuse shared packages

- **Status:** Accepted (2026-11-07)
- **Context:** the scaffold must reuse `packages/ui`, the ESLint config and the tsconfig base. `eslint-config-custom` (ESLint 7, next 13) cannot lint Next 16. `packages/ui` bundled its own React 18.3.1, which would load a second React copy.
- **Decision:** `eslint-config-custom` becomes an ESLint 9 flat config (`eslint-config-next` 16.1.4, `eslint-config-turbo/flat`, `eslint-config-prettier/flat`) and the root `.eslintrc.js` is removed. `packages/ui` declares React as a peer dependency (`^18.3.1 || ^19.0.0`), uses @types/react 19 and lints with ESLint 9. `apps/lms` extends `tsconfig/base.json`, depends on `ui` with `transpilePackages`, but renders no ui components until they are restyled with LMS tokens (design gate).
- **Consequences:** apps/web and apps/lms resolve one React (19.2.3). apps/web keeps its own legacy `.eslintrc` + ESLint 7 (its `next lint` script was already broken under Next 16); migrating it is a follow-up. LMS env vars live in the package-level `apps/lms/turbo.json`.

---

## Open questions

### Compliance and governance

1. Confirm against **each curriculum document** that there is no Workplace module (Form 5 4.4 marked N/A).
2. What does QCTO / the quality partner accept as "valid LMS licence" evidence (4.1.3) for a self-built LMS?
3. Which quality-assurance body applies to each programme now (QCTO directly, or a delegated body)? Confirm MICT SETA's current role.
4. Is internal summative assessment run by the SDP for these curricula, and what is the exact terminology/form expected (e.g. statement of results)?
5. What moderation sampling rate is required (for example a percentage per assessor per cohort)?
6. What are the record retention periods for POE and assessment records?

### Data and POPIA

7. DB, storage and function region: South Africa (`af-south-1` / `cpt1`) vs EU. Which providers? Cross-border transfer basis if not SA.
8. Information Officer, operator agreements with each processor, privacy notice for learners, and data-subject request process.
9. Which minimal fields go to Airtable, and who has access there?
10. Backup frequency, retention, PITR, and restore-test schedule (Form 5 4.1.6).

### Product

11. Does a section check gate progress, or is it advisory?
12. Max attempts, pass marks and feedback visibility per assessment kind.
13. Should facilitators see answer keys/memos?
14. Shared lab computers: own-phone passkeys (hybrid QR flow), per-learner enrolment of hub machines, or staff-issued supervised sessions?
15. Offline/load-shedding tolerance needed on assessment days?
16. Conferencing platform and licence (Form 5 4.2.8–4.2.9).
17. Languages: English only, or additional languages for content/UI?
18. Content authoring and import: who writes content, and in what format (Word/Markdown import)?

### Engineering

19. Managed Postgres provider and connection pooling approach.
20. Upgrade path for the shared ESLint config (separate change, outside this phase).
21. Which email provider becomes the single LMS sender?
