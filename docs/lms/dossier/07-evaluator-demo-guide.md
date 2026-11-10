# 07 Evaluator demo guide

**What this is:** a walkthrough of GRIT Hub Learning for a QCTO or quality-partner evaluator, using the **read-only external evaluator account** and the **seeded DEMO cohort**, mapped to QCTO Form 5 section 4 (items 4.1 to 4.3; 4.4 is not applicable). Written for the evaluator and for the GRIT Hub staff member running the session.

Everything in the DEMO data is fake: names say "Demo … (fake)", emails use the reserved `example.invalid` domain, and the qualification is `DEMO-0000-NOT-A-REAL-CURRICULUM`. No real learner appears.

## 1. Before the session (GRIT Hub staff)

1. **Environment.** Use a staging or preview deployment with its **own** database, never production. **TODO(T-19)**: decide the standing demo environment and who maintains it.
2. **Seed the DEMO data and evidence:**
   ```bash
   ALLOW_DEMO_SEED=true yarn workspace db db:seed          # DEMO users, qualification, banks, cohort
   ALLOW_DEMO_SEED=true yarn workspace lms demo:evidence   # assessments sat, marked, moderated, released;
                                                            # messages, tickets, sessions, notes, 4.4 reference,
                                                            # a restore test, and a backup if the key and store are set
   ```
   Both refuse production and non-local databases unless `ALLOW_DEMO_SEED=true`.
3. **Evaluator account.** The seed creates `demo.evaluator@example.invalid` with an evaluator grant that **expires after 30 days**. For a real visit, create a named evaluator account instead (SDP admin → People) with an expiry on the day after the visit. **TODO(T-19)**: who issues evaluator accounts, and the standard expiry.
4. **Signing in to the DEMO account.** `example.invalid` addresses can't receive email. On a local or staging deployment with `EMAIL_TRANSPORT=console`, request a sign-in link at `/signin` and copy it from the server log. A named evaluator signs in with their own email link or passkey.

## 2. What the evaluator can and can't do

- **Can:** read the Form 5 readiness dashboard, the evidence pack (including a sample exact paper with its answer key and a moderation report), the communication log, the learner guide, and the backup and restore log. The role may also open paper replays and practical evidence (`/staff/attempts/…`, `/staff/submissions/…`) when given a link.
- **Can't:** change anything, see the QCTO learner profiles, manage people, or see screens outside the Evidence area. Trying is refused and audit-logged.
- **Audited:** every page the evaluator opens is recorded (path only), as is every export and file view.
- **Expires:** access ends automatically at the grant's expiry; the proxy refuses an expired grant.

## 3. Walkthrough

Sign in, then open **Staff → Evidence**. There are three entry points: **Form 5 readiness**, **Communication log**, and the evidence pack (from the dashboard).

### Step 1: Form 5 readiness dashboard (`/staff/evidence/form5`)

One row per Form 5 section 4 item, with a live status (✓ Ready · ! Needs attention · ▢ Manual document needed · – Not applicable), the figures behind it and links to the evidence. Statuses come from live data, not from a checklist someone ticks.

### Step 2: Evidence pack (dashboard → Evidence pack)

One PDF with a contents page: dashboard snapshot, assessment schedule, a sample randomised paper (**with answer keys, only in evaluator exports**), a sample moderation report, a communication-log sample and the backup and restore log. Learners are pseudonymised ("Learner A"). The export's SHA-256 is audit-logged.

### Step 3: Communication log (`/staff/evidence/communication`)

Choose the DEMO cohort and a date range: announcements, discussions, direct messages, tickets with response times, live sessions with attendance, and facilitator notes. Export as PDF or CSV (audited).

## 4. Form 5 mapping

| Item    | Form 5 asks                                               | Where to look in the demo                                                                                                  | Notes                                                                                                                                                                                 |
| ------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1.1   | Operating-system licence                                  | Dashboard row 4.1.1 (document reference)                                                                                   | Manual document, kept by GRIT Hub                                                                                                                                                     |
| 4.1.2   | Name of the LMS                                           | Dashboard row 4.1.2: GRIT Hub Learning                                                                                     | [01](01-system-description.md)                                                                                                                                                        |
| 4.1.3   | LMS licence and number of learners                        | Dashboard row 4.1.3 (active learners and cohorts; document reference)                                                      | Self-built: ownership + hosting + capacity ([02](02-ownership-and-third-party-services.md), [03](03-capacity-and-load-test.md)); **TODO(T-21)**                                       |
| 4.1.4   | Connectivity and how it is guaranteed                     | Dashboard row 4.1.4 (resilience facts; document reference)                                                                 | Manual connectivity statement                                                                                                                                                         |
| 4.1.5   | ISP contract                                              | Dashboard row 4.1.5 (document reference and expiry)                                                                        | Manual document                                                                                                                                                                       |
| 4.1.6   | Data storage, backup, protection, frequency               | Dashboard row 4.1.6 → Backup and restore log; evidence pack backup section                                                 | [05](05-security-controls.md), [06](06-backup-and-restore.md)                                                                                                                         |
| 4.2.1   | How Knowledge-module activities are delivered             | Dashboard row 4.2.1 figures; evidence pack                                                                                 | Section → content → check question                                                                                                                                                    |
| 4.2.2   | All knowledge material loaded and covering the curriculum | Dashboard row 4.2.2 → Learner guide (PDF)                                                                                  | DEMO guide is placeholder content                                                                                                                                                     |
| 4.2.3   | Formative activities loaded and covering the modules      | Dashboard row 4.2.3 figures                                                                                                | Workplace not applicable                                                                                                                                                              |
| 4.2.4   | How formative assessments are conducted                   | Dashboard row 4.2.4; evidence pack: schedule and sample randomised paper                                                   | Different paper per learner, equal coverage                                                                                                                                           |
| 4.2.5   | Moderation of formatives                                  | Dashboard row 4.2.5; evidence pack: sample moderation report                                                               | Sampling rate per cohort; release at close                                                                                                                                            |
| 4.2.6   | Facilitator–learner communication                         | Communication log: announcements, discussions, messages                                                                    |                                                                                                                                                                                       |
| 4.2.7   | Digital library                                           | Dashboard row 4.2.7 figures                                                                                                |                                                                                                                                                                                       |
| 4.2.8   | Webinar platform and features                             | Communication log: live sessions with attendance and recordings                                                            | Zoom                                                                                                                                                                                  |
| 4.2.9   | Conferencing licence                                      | Dashboard row 4.2.9 (document reference)                                                                                   | Manual document                                                                                                                                                                       |
| 4.2.10  | Facilitator notes or recordings                           | Communication log: section notes                                                                                           |                                                                                                                                                                                       |
| 4.2.11  | Academic support                                          | Communication log: tickets with first-reply and resolution times                                                           | Targets: first reply 1 working day, resolution 5                                                                                                                                      |
| 4.3.1   | How Practical-module activities are delivered             | Dashboard row 4.3.1 figures                                                                                                | Brief with a fixed variant per learner                                                                                                                                                |
| 4.3.2   | All practical content loaded                              | Dashboard row 4.3.2 → Learner guide                                                                                        |                                                                                                                                                                                       |
| 4.3.3   | Practical formatives loaded                               | Dashboard row 4.3.3 figures                                                                                                | Met / Not yet met criteria                                                                                                                                                            |
| 4.3.4   | How practical assessments are conducted                   | Evidence pack: schedule; practical evidence opened through audited links                                                   | Upload or allow-listed link; observed tasks                                                                                                                                           |
| 4.3.5   | Moderation of practicals                                  | Evidence pack: moderation report                                                                                           | Same sampling and release rules                                                                                                                                                       |
| **4.4** | **Workplace module (4.4.1 to 4.4.3)**                     | Dashboard rows 4.4.x show **Not applicable** once the curriculum reference is recorded (the DEMO data includes a fake one) | **Not applicable**: programmes have only Knowledge and Practical modules; no workplace module, logbook or mentor role. **TODO(T-20)**: confirm against each real curriculum document. |

## 5. Points to show on security and integrity

- **Answer keys:** papers in the pack and replays show keys only to evaluators, assessors and moderators. Learners never receive option ids or correctness while writing (automated tests, [05 §6](05-security-controls.md#6-question-bank-and-randomisation-integrity)).
- **Personal information:** the evaluator never sees ID numbers, race or disability; the pack pseudonymises learners. Free text in messages is not rewritten, so the pack is still treated as personal information.
- **Accountability:** every evaluator page view and export is in the audit log.

## 6. After the session

1. Let the evaluator account expire, or set its expiry to now (SDP admin).
2. Keep the exported files only as long as the visit needs, in GRIT Hub's evidence store, not on personal devices.
3. Note any findings against the TODO list in [README.md](README.md).
