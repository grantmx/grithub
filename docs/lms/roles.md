# Roles and permissions

## Principles

- **Invite-only.** An SDP admin creates every account and sends an invite. There is no public sign-up in this phase.
- **Scoped roles.** Facilitator, assessor and moderator roles are granted **per cohort** (or per qualification). Learner access comes from an `Enrolment`. SDP admin is global. External evaluator is global, read-only and **time-boxed** (with an expiry date).
- **One person, several roles is allowed**, with conflict-of-interest rules:
  - A moderator cannot moderate a decision they made as assessor.
  - An assessor cannot assess a learner they are related to, or their own work. This is self-declared and recorded.
  - Staff cannot be enrolled as learners in a cohort where they hold a staff role.
- **Least privilege.** Permissions are enforced on the server in the data-access layer. Hiding a button is not access control.
- **Everything sensitive is audited.** Decisions, moderation, role grants, exports and file downloads are recorded in `AuditLog`.

## Roles

| Role                   | Who                                   | Purpose                                                                                                                                 |
| ---------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Learner**            | Enrolled participant                  | Learns online, attempts checks and formative assessments, submits practical work, sees own results and feedback.                        |
| **Facilitator**        | Teaching staff                        | Delivers content, posts announcements and notes, answers discussions and tickets, marks attendance. Does not make competence decisions. |
| **Assessor**           | Registered assessor                   | Reviews evidence, records Competent / Not Yet Competent with feedback, and can grant a re-attempt.                                      |
| **Moderator**          | Registered moderator                  | Samples and reviews assessor decisions, and records moderation outcomes (upheld / referred back).                                       |
| **SDP admin**          | GRIT Hub operations                   | Manages users, cohorts, enrolments, qualifications, content structure, question banks, blueprints, exports and evaluator access.        |
| **External evaluator** | QCTO / quality-partner representative | Read-only view of content, assessments, POEs, moderation and audit evidence during a visit. Cannot see or change anything else.         |

## Permission matrix

Key: **C** create · **R** read · **U** update · **D** delete/archive · **own** = only their own records · **cohort** = only cohorts they are assigned to · **—** no access

| Resource                             | Learner                                 | Facilitator                  | Assessor                              | Moderator   | SDP admin                           | External evaluator |
| ------------------------------------ | --------------------------------------- | ---------------------------- | ------------------------------------- | ----------- | ----------------------------------- | ------------------ |
| Qualifications, modules, sections    | R (enrolled)                            | R                            | R                                     | R           | CRUD                                | R                  |
| Content items (text/audio/video)     | R (enrolled)                            | CRU (cohort's qualification) | R                                     | R           | CRUD                                | R                  |
| Question banks, questions, versions  | —                                       | R (no answer keys)           | R                                     | R           | CRUD (versions immutable once used) | R                  |
| Assessment blueprints                | —                                       | R                            | R                                     | R           | CRUD                                | R                  |
| Section checks / assessment attempts | C, R own (no answer keys before submit) | R cohort (results only)      | R cohort                              | R cohort    | R                                   | R                  |
| Practical briefs and variants        | R (assigned variant)                    | R                            | R                                     | R           | CRUD                                | R                  |
| Submissions (POE files)              | C, R own                                | R cohort                     | R cohort                              | R cohort    | R                                   | R                  |
| Assessment decisions                 | R own (after release)                   | R cohort                     | C, R cohort; U only before moderation | R cohort    | R                                   | R                  |
| Moderation records                   | —                                       | —                            | R (on own decisions)                  | C, R cohort | R                                   | R                  |
| Cohorts and enrolments               | R own                                   | R cohort                     | R cohort                              | R cohort    | CRUD                                | R                  |
| Attendance records                   | R own                                   | C, U cohort                  | R cohort                              | R cohort    | CRUD                                | R                  |
| Announcements                        | R (cohort)                              | C, U, D cohort               | R                                     | R           | CRUD                                | R                  |
| Discussion threads                   | C, R cohort; U own                      | C, R, U (moderate) cohort    | R cohort                              | R cohort    | CRUD                                | R                  |
| Support tickets                      | C, R own                                | R, U cohort                  | —                                     | —           | CRUD                                | R (summary)        |
| Users and role grants                | R/U own profile                         | —                            | —                                     | —           | CRUD                                | —                  |
| Passkey credentials                  | C, R, D own                             | own                          | own                                   | own         | R, D (revoke) any                   | own                |
| Exports (POE, results, attendance)   | own POE                                 | cohort attendance            | cohort                                | cohort      | all                                 | evidence pack      |
| Sync outbox (Airtable)               | —                                       | —                            | —                                     | —           | R, retry                            | —                  |
| Audit log                            | —                                       | —                            | —                                     | —           | R                                   | R                  |

Notes:

- **Answer keys** (`AnswerOption.isCorrect`, marking memos) are visible to SDP admin, assessors and moderators in staff views only. They are never sent to a learner session. Facilitators see questions but not keys, which reduces leakage to learners. This is an open question; some SDPs let facilitators see memos.
- **Result release (design.md, approved):** learners never see a decision straight after the assessor records it. Decisions are grouped in a `ModerationBatch` (one assessment or brief × one cohort). When the moderator closes the batch's sample, **every decision in the batch is released together** and learners are notified. Unsampled decisions are released with it.
- **Decision lock:** once a moderation record exists for a decision, the assessor cannot change it. Changes go through a referral back, which creates a new decision row that references the old one.
- **External evaluator** accounts expire automatically. Every page view is audited.

### Assessment engine (2026-11-08)

- **Answer keys, paper replays, PDFs and question analytics:** assessors, moderators and external evaluators (read-only) only; never facilitators or SDP admins.
- **Assessment-day register:** facilitators, assessors and SDP admins record attendance and ID checks; only an assessor (with a passkey) opens papers, pauses, adds extra time and signs off.
- **Decisions:** assessors (own cohorts); a reassessment ordered on appeal is decided by a different assessor.
- **Moderation, release and appeals:** moderators (own cohorts), never on their own decisions.
- **Blueprints, schedules, coverage report:** SDP admins. Retire / new question version: assessors and moderators.

### Practical assessments (2026-11-08)

- **Learner:** sees their own variant, adds and removes evidence while draft, submits, appeals; opens only their own evidence.
- **Practical evidence:** assessors, moderators and external evaluators (read-only) in scope, via signed links; staff views audited. Not facilitators or SDP admins.
- **Observed tasks:** facilitators/assessors take attendance and ID; only an assessor starts the observation and marks it.
- **Briefs:** SDP admins author, publish and schedule.

## Onboarding flow (learners and staff)

1. SDP admin creates a cohort and invites learners one by one or by CSV import (validated, previewed, then confirmed). Each learner is enrolled in the cohort.
2. The system emails a single-use invitation link (72 h). A newer invitation replaces the old one. Admins see each learner's status (Invited, Active, Expired invite, Deactivated).
3. First-time setup, one step per screen: confirm details → read and accept the POPIA notice (version, text hash and timestamp stored) → register a passkey. Learners may skip the passkey and use email links; staff who need step-up can't.
4. Sign-in afterwards: passkey (with autofill), or an email magic link (15 min, single use). After a magic-link sign-in without a passkey, the user is prompted to add one.
5. Lost device: magic link to the registered email, or admin-verified recovery (identity checked; all passkeys and sessions revoked; 30-minute recovery link; audit-logged). No SMS codes.
6. An admin can deactivate a learner: they're signed out everywhere and their outstanding links are revoked.
