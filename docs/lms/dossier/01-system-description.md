# 01 System description

**What this is:** a plain description of GRIT Hub Learning, the learning management system (LMS) GRIT Hub uses for blended delivery of QCTO occupational qualifications. It is written for QCTO evaluators, quality partners, GRIT Hub management and the Information Officer.

**Status:** describes the system as built on 2026-11-10. Items that need a human decision are marked **TODO** and listed in [README.md](README.md).

## 1. Purpose

GRIT Hub Learning delivers the **Knowledge** and **Practical** modules of QCTO qualifications to enrolled learners, online and in person (blended mode), and keeps the records the QCTO asks for in Form 5, section 4. It is:

- **Self-built and owned by GRIT Hub.** There is no vendor licence; the source code is in GRIT Hub's own repository (`apps/lms` and `packages/db`). See [02](02-ownership-and-third-party-services.md).
- **Browser-based.** Learners and staff use any current browser on a phone, tablet or computer. Nothing is installed.
- **Invite-only.** There is no public sign-up. An SDP administrator creates every account.

Programmes have only Knowledge and Practical modules. **There is no Workplace module, logbook or mentor role**, so Form 5 item 4.4 is not applicable (see [07](07-evaluator-demo-guide.md)).

## 2. Who uses it

| Role               | What they do in the LMS                                                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Learner            | Studies sections, answers section checks, writes formative assessments, submits practical evidence, sees released results, messages staff, asks for help. |
| Facilitator        | Posts announcements and notes, runs discussions and live sessions, answers tickets, takes attendance. Makes no competence decisions.                      |
| Assessor           | Opens papers on assessment days, marks, records Competent / Not yet competent with feedback.                                                              |
| Moderator          | Samples assessor decisions, records verdicts, releases results by closing the moderation batch.                                                           |
| SDP admin          | Manages people, cohorts, assessments, briefs, Form 5 evidence and the QCTO submission panel.                                                              |
| External evaluator | Read-only access for a QCTO or quality-partner visit. The account expires automatically, and every page the evaluator opens is audit-logged.              |

The full permission matrix is in [05 Security controls](05-security-controls.md#3-access-control-matrix) and `docs/lms/roles.md`.

## 3. What it does (main functions)

| Area                      | Function                                                                                                                                                                                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Knowledge delivery        | Qualification → module → section → content (text first; optional hosted audio/video with transcripts). One check question per section. Progress per section. A library per qualification.                                                                                                         |
| Knowledge assessment      | Formative and summative papers drawn from question banks by blueprint: each learner gets a different paper with the same coverage per curriculum component. Server-side timing, autosave, resume; summatives only in person, opened per learner by the assessor after attendance and an ID check. |
| Practical delivery        | Practical briefs with criteria and equivalent variants; each learner gets a fixed, seeded variant. Evidence by private file upload or allow-listed link; observed tasks on assessment days.                                                                                                       |
| Marking and moderation    | Assessor marking with rubrics; moderation batches per assessment and cohort with a sampling rate; results are released only when the batch closes; appeals.                                                                                                                                       |
| Communication and support | Cohort announcements, module discussion boards, direct messages (learner ↔ facilitator or assessor), support tickets with response targets, live sessions (Zoom links) with attendance, facilitator notes. No attachments in communication channels.                                             |
| Compliance evidence       | Form 5 readiness dashboard with live status per item, evidence pack PDF (pseudonymised learners), communication log export, backup and restore-test log, QCTO learner profiles and submission panel.                                                                                              |

## 4. How it is built

| Layer        | Technology                                                                                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Application  | Next.js 16 (App Router), React 19, TypeScript in strict mode. Pages render on the server; answer keys and grading never leave the server.                                       |
| Hosting      | Vercel (serverless functions, scheduled jobs). Region: **TODO(T-03)**.                                                                                                          |
| Database     | PostgreSQL via Drizzle ORM. Schema changes only through committed SQL migrations. Integrity rules are enforced by database triggers. Provider and region: **TODO(T-04, T-03)**. |
| File storage | Vercel Blob, **private** stores: one for practical evidence and learner guides, and a **separate** one for backups.                                                             |
| Media        | Mux (hosted audio/video, signed playback).                                                                                                                                      |
| Email        | Resend (invitations, sign-in links, notifications; no message text in emails).                                                                                                  |
| Sign-in      | Passkeys (WebAuthn) first; single-use email links as a fallback. No passwords, no SMS codes.                                                                                    |
| Reporting    | Airtable one-way copy: **planned, not built** (an outbox table exists; nothing is sent yet).                                                                                    |

```text
Browser ──HTTPS──► Vercel (Next.js app + proxy access checks)
                     │  server only:
                     ├──► PostgreSQL (all records; QCTO identity and special
                     │     personal information encrypted in the application)
                     ├──► Vercel Blob: evidence store (private, signed 5-min links)
                     ├──► Vercel Blob: backup store (private, separate; nightly)
                     ├──► Mux (signed playback tokens)
                     └──► Resend (email)
Browser ──direct upload (short-lived token)──► Vercel Blob evidence store
Browser ──signed playback──► Mux
```

## 5. Data it holds

Accounts (name, email), consent records, enrolments, learning progress, assessment attempts and decisions, practical evidence files, communication records, attendance, an append-only audit log, and the QCTO learner profile (identity number, contact details, demographic codes including race and disability). The POPIA processing register is in [04](04-popia-pack.md).

## 6. Resilience

- Every answer saves to the server as it is given; a dropped connection keeps the unsent answer on screen and retries. Learners can resume on any device.
- Assessors can pause an attempt (the clock stops) and add extra time.
- Text-first content; media never autoplays (low data).
- Nightly encrypted backup to a separate private store, 7 kept, restore tested at least every 90 days ([06](06-backup-and-restore.md)).

## 7. Where things are documented

| Topic                    | Document                                                   |
| ------------------------ | ---------------------------------------------------------- |
| Architecture and choices | `docs/lms/architecture.md`, `docs/lms/decisions.md` (ADRs) |
| Data model               | `docs/lms/domain-model.md`, `packages/db/README.md`        |
| Roles                    | `docs/lms/roles.md`                                        |
| Randomisation            | `docs/lms/randomization.md`                                |
| Form 5 mapping           | `docs/lms/compliance/form5-mapping.md`                     |
| POPIA (working notes)    | `docs/lms/compliance/popia.md`                             |
| QCTO LEISA file mapping  | `docs/lms/compliance/qcto-leisa-mapping.md`                |
