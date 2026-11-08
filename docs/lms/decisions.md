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

> **Updated 2026-11-08:** practical evidence uses **Vercel Blob with private access** (owner's decision), not S3. Same principles: direct browser uploads, private by default, confirm step with size/type/checksum, short-lived signed links. Region control is limited; the POPIA position is noted in compliance/popia.md.

- **Status:** Proposed
- **Decision:** S3-compatible storage behind an interface; presigned direct uploads; private by default; candidate region `af-south-1`.
- **Alternatives:** Vercel Blob; Cloudflare R2.
- **Consequences:** avoids the function body limit; requires a confirm-upload step and checksum verification.

## ADR-004: Hosted media via Mux

- **Status:** Proposed
- **Decision:** text is the core content; optional audio/video is hosted on Mux with signed playback.
- **Alternatives:** Cloudflare Stream; unlisted YouTube.

## ADR-005: Passkey-first authentication, invite-only accounts

- **Status:** Accepted (2026-11-07), revised
- **Decision:** WebAuthn via SimpleWebAuthn 14 (conditional UI) with DB sessions; **email magic links as fallback** and for first-time setup; admin invitations (single use, 72 h); admin-verified recovery that revokes all passkeys and sessions; no passwords, no SMS, no public sign-up. Assessors, moderators and SDP admins must have at least one active passkey to reach marking, moderation and admin screens (proxy + server actions). Rate limits are Postgres-backed; email goes through Resend.
- **Alternatives:** Better Auth; Clerk.
- **Consequences:** strong phishing resistance; needs a clear shared-device and lost-device procedure.

## ADR-006: One-way Airtable sync via transactional outbox

- **Status:** Proposed
- **Decision:** LMS is the system of record; `SyncOutbox` rows are drained by a cron worker; minimal fields; no write-back.

## ADR-007: Seeded randomization, persisted attempt snapshots, server-only grading

- **Status:** Accepted (2026-11-08), implemented for section checks and blueprint assessments (`apps/lms/lib/randomization.ts`, `lib/paper.ts`).
- **Decision:** as specified in [randomization.md](randomization.md).

## ADR-008: Immutable question versions and append-only decisions/audit

- **Status:** Accepted (2026-11-08), enforced by database triggers (`packages/db/migrations/0001`, `0007`).
- **Decision:** QuestionVersion (with its options and rubric) becomes immutable when first served. An AssessmentDecision is final as soon as it is recorded; a change is a new row that supersedes it (a single chain, only while its moderation batch is open). Rubric marks lock once a decision exists; appeals are final once decided; a signed-off register is final; AuditLog is append-only. (The earlier rule "editable until moderated" was replaced on 2026-11-08.)

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

## ADR-012: Knowledge assessment engine

- **Status:** Accepted (2026-11-08)
- **Context:** QCTO knowledge assessments need equal curriculum coverage, papers that differ per learner, server-only grading, supervised summatives, assessor decisions, moderation, appeals and evidence for the POE.
- **Decision:**
  - Blueprints (draft, then published and fixed) hold rules "N questions from bank X / component Y", type, attempts, time limit, pass mark and answer visibility. Cohort schedules give a window (formative) or an assessment day (summative).
  - Papers are drawn by `lib/paper.ts` (seed = learner : blueprint : attempt), stored as attempt items with opaque option tokens, and never re-drawn.
  - Formatives are auto-graded with answers shown (default). For summatives the assessor opens each learner's paper after attendance and ID check; short answers are marked per rubric criterion; the assessor records Competent / Not yet competent (the pass mark is a suggestion); results are released when the moderator closes the batch.
  - Appeals within 7 days, decided by a moderator who did not make the decision: uphold, or reassess (one extra attempt, decided by a different assessor).
  - Paper PDFs are generated on demand with pdf-lib (deterministic; checksum audited); no file storage.
  - Question analytics (standard thresholds, `lib/questionStats.ts`) let assessors and moderators retire a question or create a new version.
- **Consequences:** answer keys are visible only to assessors, moderators and external evaluators. Assessments need a connection. The moderation sampling rate is not enforced yet (Q5). Learners are not yet notified by email when results are released.

## ADR-013: Practical assessments

- **Status:** Accepted (2026-11-08)
- **Decision:**
  - A brief has Met / Not yet met criteria and equivalent variants sharing them; publishing locks both. Mode: evidence submission or observed on an assessment day.
  - Each attempt is a submission with a seeded, stored variant (seed = learner : brief : attempt; prefers variants not done before).
  - Evidence: Vercel Blob private client uploads confirmed on the server (prefix, type, 20 MB, SHA-256, scan hook), or allow-listed https links. Viewing via `/evidence/:id` → 5-minute signed link; staff views audited.
  - Draft until "Submit for assessment"; observed submissions are started by the assessor from the register after attendance and ID check.
  - Decisions, moderation batches (per brief and cohort), release, appeals and reassessment follow the knowledge rules (ADR-012). Judgements and evidence lock once a decision exists (database triggers).
  - There is no workplace module, logbook or mentor sign-off.
- **Consequences:** uploads need JavaScript (links work without). Video is link-only, so a learner could change a linked video after submission; the URL and time are recorded. The link allow-list is in code until an admin editor exists. A real virus scanner is still to be connected.

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

11. ~~Does a section check gate progress, or is it advisory?~~ Learner must answer (right or wrong) before "Mark as completed"; up to 3 attempts (design.md, implemented 2026-11-08).
12. ~~Max attempts, pass marks and feedback visibility per assessment kind.~~ Summative: 1 + 1 reassessment by default (configurable), answers hidden, assessor decides with the pass mark as a suggestion. Formative: answers and explanations shown after submitting, 3 attempts by default. Pass mark per blueprint. Appeals within 7 days (decided 2026-11-08).
13. ~~Should facilitators see answer keys/memos?~~ No. Only assessors, moderators and external evaluators see keys, replays and analytics (decided 2026-11-08).
14. Shared lab computers: own-phone passkeys (hybrid QR flow), per-learner enrolment of hub machines, or staff-issued supervised sessions?
15. ~~Offline/load-shedding tolerance needed on assessment days?~~ Online only: every answer saves to the server; a dropped connection keeps the unsent answer on screen and retries; learners resume on any device; the assessor can pause (the clock stops) and add extra time, all audited (decided 2026-11-08).
16. Conferencing platform and licence (Form 5 4.2.8–4.2.9).
17. Languages: English only, or additional languages for content/UI?
18. Content authoring and import: who writes content? Format decided 2026-11-08: Markdown subset (see apps/lms/lib/markdown.tsx); authoring/import UI still open.
19. Learner page weight: Next.js App Router + React 19 ship ~134 KB gzip of runtime, so the section page is ~197 KB on first load vs the 150 KB budget in design.md §11 (later navigations ~16 KB, within budget). Revise the budget or change approach?

### Engineering

19. Managed Postgres provider and connection pooling approach.
20. Upgrade path for the shared ESLint config (separate change, outside this phase).
21. ~~Which email provider becomes the single LMS sender?~~ Resend (decided 2026-11-07).
22. Bootstrap of the first production SDP admin (one-off audited CLI script).
23. Should step-up also require a _recent_ passkey sign-in (not just having a passkey)? Deferred by product owner on 2026-11-07.
