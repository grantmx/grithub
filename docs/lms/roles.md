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

## Onboarding flow (learners and staff)

1. SDP admin creates the user (name, email, mobile optional) and assigns a role or enrolment.
2. The system emails a single-use invite link (short expiry, for example 72 h) that can be re-issued.
3. The user opens the link and registers a passkey. They are prompted to add a second passkey (for example phone + laptop).
4. On first login the learner accepts the learner agreement and POPIA notice. The acceptance is recorded with timestamp and version.
5. Lost device: an admin revokes the old credential(s) and re-issues an invite after verifying identity.
