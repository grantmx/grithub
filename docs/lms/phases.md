# Phases

Each phase lists its scope and acceptance criteria. A phase is done only when its criteria pass, tests cover them, and [compliance/form5-mapping.md](compliance/form5-mapping.md) is updated.

## Phase 0: Foundations

**Scope:** scaffold `apps/lms` (Next.js App Router, strict TS) and `packages/db` (Drizzle + migrations); CI lint/typecheck/test for these two workspaces; staging environment; env vars registered in `turbo.json`; resolve the region and POPIA questions; complete the design gate (`design.md`).

**Acceptance criteria**

- `yarn workspace lms build` and the test command pass in CI. Lint and typecheck are clean with `strict: true`.
- Migrations apply from empty to head on a disposable Postgres in CI.
- No secrets in the repo (secret scan passes). Staging uses synthetic seed data only.
- Region, backup policy and processor list are decided and recorded in `decisions.md`.

## Phase 1: MVP (pilot cohort)

**Scope**

- Admin invites users, assigns roles and enrolments; passkey registration and login; admin re-invite for recovery; POPIA notice acceptance.
- Qualification → Module (knowledge | practical) → Section → ContentItem (text + optional Mux audio/video).
- Section check question per section (seeded draw, server grading, feedback).
- Question banks with immutable versions; blueprint-based formative assessments; attempts with AttemptItem snapshots.
- Practical briefs and variants; direct-to-storage submissions; assessor decisions; moderation with replay.
- Cohorts, assessment days, attendance.
- Announcements with email notification.
- Audit log; one-way Airtable sync via outbox.
- Coverage reports (content and assessment vs curriculum components).

**Acceptance criteria**

- An invited learner can register a passkey and sign in on phone and laptop. There is no route that creates an account without an invite.
- Refreshing or resuming an attempt on another device shows identical questions and option order.
- Network inspection of every learner response shows no `isCorrect`, answer ids or memo content.
- Retry attempts contain no previously seen questions while the pool allows; pool exhaustion falls back to least-recently-seen and is flagged.
- A pinned "All of the above" always appears last.
- Editing a served question creates a new version; the old attempt still replays with the old version.
- A 200 MB practical file uploads without passing through a function, and the Submission row records checksum and size.
- A moderator cannot moderate their own decision; a moderated decision cannot be edited by the assessor.
- A learner cannot see any decision until the moderator closes the batch; closing it releases all decisions in that batch (sampled or not) and notifies the learners.
- Coverage report lists every curriculum component of a module with the content and assessments mapped to it.
- Airtable receives enrolment/attendance/result rows within the cron interval; a forced Airtable failure is retried and nothing is lost.
- Every decision, moderation, role change and file download appears in the audit log.
- Rows 4.1.2, 4.1.6, 4.2.1–4.2.6, 4.2.10–4.2.11 and 4.3.1–4.3.5 of the Form 5 mapping are at least `implemented`.

## Phase 2: Support and evidence

**Scope:** discussion threads; support tickets with SLA; digital library; external evaluator portal (time-boxed, read-only); POE export (PDF/ZIP, chunked/background); internal summative assessments on assessment days (supervised session mode).

**Acceptance criteria**

- An evaluator account expires automatically and cannot write anything (enforced server-side, covered by tests).
- POE export for a full cohort completes without hitting function time limits (chunked/resumable).
- Support tickets report response times by category.
- Form 5 rows 4.2.7 and 4.2.11 reach `evidence ready`.

## Phase 3: Insight and resilience

**Scope:** facilitator analytics (progress, at-risk learners, question item analysis); offline-tolerant assessment-day mode if needed; accessibility audit (WCAG 2.2 AA).

**Acceptance criteria**

- Item analysis flags questions with abnormal difficulty/discrimination for review.
- Assessment-day mode survives a simulated connectivity loss without losing answers.
- Accessibility audit has no open critical issues.

## DEFERRED

- **Public application and enrolment from the website** (`apps/web` → LMS), including payment. **Deferred.** QCTO guidance says SDPs should not advertise qualifications before accreditation is confirmed. Revisit only after accreditation is granted, and route any website copy through review.
- Workplace module, logbooks and mentor workflows. Out of scope; our programmes have no workplace component.
- Authoring LMS content in Sanity.
