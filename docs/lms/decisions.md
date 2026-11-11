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

> **Updated 2026-11-11 (owner's decision, design.md §14):** sign-in now leads with the **magic link** ("Send me a magic link"); the passkey becomes a second step after the link ("Confirm it's you", `/auth/confirm`) that anyone may skip, plus an optional "Sign in with passkey" shortcut. A magic link alone is a full sign-in (no limited mode, still no passwords). Step-up for staff screens is unchanged (an active passkey on the account). First SDP admin: one-off audited `admin:bootstrap` script.

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
  - Appeals within 7 days, decided by a moderator who did not make the decision: uphold, or reassess (one extra attempt). _Changed 2026-11-08 (ADR-015): there is one assessor per cohort, so the same assessor decides the reassessment, which is always moderated._
  - Paper PDFs are generated on demand with pdf-lib (deterministic; checksum audited); no file storage.
  - Question analytics (standard thresholds, `lib/questionStats.ts`) let assessors retire a question or create a new version. _Changed 2026-11-08 (ADR-015): moderators see analytics read-only and never edit question versions._
- **Consequences:** answer keys are visible only to assessors, moderators and external evaluators. Assessments need a connection. The moderation sampling rate is enforced since ADR-015. Learners are not yet notified by email when results are released.

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

## ADR-014: QCTO learner data model and application-level encryption

- **Status:** Accepted (2026-11-08)
- **Context:** The QCTO LEISA file (`compliance/qcto-leisa-mapping.md`) needs identity numbers, birth dates, addresses, phone numbers, race (equity) and disability. POPIA s26 treats race and health as special personal information. The repo is public and the hosting region is still open.
- **Decision:**
  - A learner QCTO profile per learner per tenant (`learner_qcto_profiles`), a QCTO record per enrolment (`enrolment_qcto_records`: readiness type, SOR status and date, FLC, AP-led SDP code override), provider and qualification accreditation periods, assessment centres, and EISA date and assessment centre per cohort. LEISA files are tracked in `qcto_submission_batches` and `qcto_submission_items` (row hash only, no PII copy).
  - QCTO code lists are GLOBAL reference tables loaded by migration from the spec; codes are kept exactly as QCTO writes them. The Stats SA area list is loaded separately from the official file.
  - Sensitive values are encrypted **in the application** (AES-256-GCM, `packages/db/src/pii.ts`), not with pgcrypto, so keys never reach the database, query logs or backups. Each value is bound to its table, column and row (AAD). Keys are versioned (`PII_ENCRYPTION_KEYS`) for rotation. ID-number uniqueness uses a keyed HMAC blind index (`PII_BLIND_INDEX_KEY`).
  - Equity and disability codes are encrypted, so they can't have foreign keys; the application validates them against the code tables before encrypting.
  - QCTO sharing consent (LEISA AH/AI) is a separate, versioned `consent_records` kind that can record a refusal.
  - Rules the database can check are enforced there (CHECKs and triggers; see `packages/db/README.md`). Rules that need decrypted values or decisions (ID check digit, gender and birth date vs ID, character sets, postal codes, "all modules competent" for SOR 01, accreditation periods, deadlines) belong to the LEISA exporter.
- **Consequences:** encrypted columns can't be searched, sorted or aggregated in SQL; equity and disability reports decrypt in the application. Losing `PII_ENCRYPTION_KEYS` loses the data, so the keys need a documented backup separate from the database backups. Changing `PII_BLIND_INDEX_KEY` means recomputing every blind index.

---

## ADR-015: Moderation sampling, verdicts and release

- **Status:** Accepted (2026-11-08). Design-gate answers in design.md §14.
- **Context:** Form 5 4.2.5 and 4.3.5 ask how moderation is conducted and how the moderator accesses formative assessments and practical evidence. ADR-012 left the sampling rate open (Q5).
- **Decision:**
  - One assessor per cohort (QCTO expects one per programme), enforced in the database. A reassessment ordered on appeal is decided by that assessor and is always in the sample.
  - The SDP admin sets a sampling rate per cohort (default 25%). The moderator picks which learners' work goes in each batch's sample; the minimum is the rate × decisions in the batch, rounded up. Moderated work can't leave the sample.
  - Verdicts: Agree, Agree with actions (the assessor ticks "Actions done" with a note) or Disagree (the assessor records a new decision; the moderator checks it again). One verdict per decision version, with comments and required actions.
  - The batch closes (and releases every result in it) only when the minimum is sampled and every sampled current decision is agreed with any actions done. The same rules are database triggers (`0017_moderation_rules.sql`).
  - Moderators work read-only on learner work, marks, decisions and question versions: the S7 view shows the exact paper (versions and option order from `AttemptItem`) or the evidence, the rubric/judgements and the decision history. They can't retire or version questions.
  - The assessor sees outcomes on the marking page and queue, a Moderation feedback list with a sidebar badge, and an email (link only) on Disagree or actions.
  - Per-batch moderation report as PDF and CSV (checksums audited). A read-only "Assessment materials" area shows banks with every version, keys and rubrics; formative blueprints with their learners' attempts (exact replays); and section checks. Formatives get no verdicts.
- **Consequences:** a cohort can't have a second or global assessor grant; changing assessor means removing the grant first. The staff notification system is not built; the badge is a count of unseen outcomes.

## ADR-016: Communication and academic support

- **Status:** Accepted (2026-11-08). Design-gate answers in design.md §14.
- **Context:** Form 5 4.2.6, 4.2.8, 4.2.10 and 4.2.11 ask how facilitators communicate with learners, which conferencing platform is used, whether facilitator notes and recordings exist, and how learners are supported.
- **Decision:**
  - One **Notification** row per recipient per event drives both the in-app bell and email. The recipient's preference for the optional types (announcements, discussions, messages, tickets) is instant, weekly digest or off; live-session schedule changes are essential and always emailed with an .ics invite. Emails carry no message text and no other learners' names, only a link.
  - Discussions are one board per module per cohort; only staff start threads; replies nest one level (database trigger). Direct messages are learner ↔ one named facilitator or the cohort's assessor, private to those two people. No attachments anywhere.
  - Abuse controls: Postgres fixed-window rate limits per user (learners 10 per 10 minutes and 60 per day; 3 tickets per day), learner reports, staff hide/dismiss. Reports on private messages go to SDP admins so a facilitator never reviews a report about themselves. Edits are allowed for 15 minutes and keep the earlier text (append-only `message_revisions`); posts, messages and ticket replies are never deleted.
  - Support-ticket targets are stamped at creation in working hours (Mon–Fri 08:00–17:00 SAST, SA public holidays computed, including Easter and Sunday→Monday); overdue status is computed on read. Vercel Cron runs the weekly digest and the daily overdue email; each run is claimed in `job_runs` so retries never email twice, and both endpoints require `CRON_SECRET`.
  - At-risk flags (7 days without learning activity; 2 sections with all 3 check tries wrong in 14 days) are computed on read for staff only.
  - Live sessions use Zoom links only (Form 5 4.2.8); attendance uses the same four statuses as assessment days.
  - A per-cohort communication log (CSV/PDF) includes hidden items and earlier versions; SDP admins and external evaluators export it, and each export's SHA-256 is audited.
- **Consequences:** facilitator notes are not yet in the admin coverage report (4.2.10 follow-up). One-off proclaimed public holidays (e.g. election days) are not in the working-hours calendar. Staff have no bell; they get sidebar badges and email.

## ADR-017: Form 5 readiness dashboard, evidence pack and backups

- **Status:** Accepted (2026-11-09). Design-gate answers in design.md §14.
- **Context:** QCTO Form 5 section 4 needs a Yes/No and evidence for 25 items. Evidence was scattered across screens, and nothing recorded backups or restore tests (4.1.6; architecture.md open question 3).
- **Decision:**
  - A per-qualification dashboard computes each item's status from live data on every load (`lib/server/readiness.ts`); nothing is cached or stored. Rules live in `lib/form5.ts`: backups within 7 days, restore tests within 90, document expiry warnings 30 days ahead, at least one check question per lesson and test question sets at least as large as the draw. Topic coverage isn't computed (every topic is always loaded); the uploaded learner guide is the coverage evidence.
  - Licences and contracts are **references only** (the repo is public and the documents stay with GRIT Hub). The learner guide is the one uploaded file: direct, private upload, verified as a PDF, checksummed, opened through audited 5-minute links.
  - The evidence pack is **one combined PDF** built by joining existing generators (paper, moderation report, communication log) behind a contents page. Learners are pseudonymised; SDP admins' exports leave out answer keys and per-question marks (`buildPaperPdf(…, { withKeys: false })`).
  - The LMS makes its own **nightly backup**: every table as JSON lines, gzipped, AES-256-GCM under `BACKUP_ENCRYPTION_KEY` (kept outside the database host), stored privately, last 7 kept. It complements, not replaces, the host's backups and point-in-time recovery.
  - Section-check retries re-ask the same question with the options reshuffled (supersedes "fresh question each time").
  - A DEMO walkthrough script drives the real server functions so the DEMO cohort has genuine evidence for every live item.
- **Consequences:** a JSON-lines dump is fine at current size but needs streaming (or host-native dumps) once the database grows; Vercel functions are capped at 300 s. Restoring means decrypting with the key and loading the rows into a scratch database (README); this is logged as a restore test by hand. The QCTO panel's "last submission batch" stays empty until the LEISA exporter is built.

## ADR-018: Hardening pass and the Capability and Security Dossier

- **Status:** Accepted (2026-11-10).
- **Context:** Before the first real cohort, the LMS needed a documented security baseline and an evidence dossier (`docs/lms/dossier/`) for QCTO evaluators and the Information Officer.
- **Decision:**
  - **Backups go to a separate private Blob store** (`BACKUP_BLOB_READ_WRITE_TOKEN`), never the evidence store; there is no fallback, so a missing store logs a failed run. Each file records row counts per table, and `backup:restore` restores into an empty scratch database and checks them (tested in CI).
  - **Least-privilege runtime role** `lms_app` (`packages/db/sql/least-privilege.sql`): row DML only, no DDL or TRUNCATE, no UPDATE/DELETE on append-only evidence tables. Migrations keep the owner role. A script, not a migration, because roles are cluster-wide and managed hosts differ.
  - **CSP with `'unsafe-inline'` scripts**, because Next.js streams page data inline and nonces would make every page dynamic. Compensated by "no raw HTML anywhere" (tested). Revisit if nonces become cheap (dossier E-05).
  - **Input boundary:** every server action reads input through `lib/server/input.ts` (UUID ids, capped text, no files or NUL bytes); a guard test enforces it.
  - **Uploads:** magic-byte checks on evidence after upload, in addition to the declared type and size.
  - **Dependency audit gate** in CI (and nightly): unwaived high/critical advisories in `lms` or `db` production dependencies fail the build; waivers expire within 90 days. `apps/lms` no longer depends on the unused `ui` package (it pulled Firebase into the LMS tree), and declares `drizzle-orm` itself.
  - External evaluators' page views are audit-logged in the proxy.
- **Consequences:** deploying this before the backup store exists makes nightly backups fail visibly on the dashboard (dossier T-12). The production database must be switched to `lms_app` by a person with owner access (T-13).

## Open questions

### Compliance and governance

1. Confirm against **each curriculum document** that there is no Workplace module (Form 5 4.4 marked N/A).
2. What does QCTO / the quality partner accept as "valid LMS licence" evidence (4.1.3) for a self-built LMS?
3. Which quality-assurance body applies to each programme now (QCTO directly, or a delegated body)? Confirm MICT SETA's current role.
4. Is internal summative assessment run by the SDP for these curricula, and what is the exact terminology/form expected (e.g. statement of results)?
5. ~~What moderation sampling rate is required?~~ Set per cohort by the SDP admin (default 25%), at least that share of each batch, picked by the moderator (ADR-015, 2026-11-08). Confirm the rate each quality partner expects.
6. What are the record retention periods for POE and assessment records?

### Data and POPIA

7. DB, storage and function region: South Africa (`af-south-1` / `cpt1`) vs EU. Which providers? Cross-border transfer basis if not SA.
8. Information Officer, operator agreements with each processor, privacy notice for learners, and data-subject request process.
9. Which minimal fields go to Airtable, and who has access there?
10. ~~Backup frequency, retention, PITR, and restore-test schedule (Form 5 4.1.6).~~ LMS nightly encrypted backup, 7 kept, restore test at least every 90 days (ADR-017). Still open: the host's own backup/PITR settings once the host is chosen.

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
