# Airtable mapping: LMS → Hub Management Information System

Status: **proposal, awaiting owner approval** (Step 1 of the Airtable sync, branch `feat/lms-airtable-sync`). Nothing has been created or changed in Airtable.

The sync is **one-way**: the LMS is the system of record and Airtable receives a copy for hub management reporting (ADR-006). Edits made in Airtable never flow back. The LMS stays the only source for QCTO submission data.

- The schema was read on 2026-11-08 through the Airtable Meta API, using read-only `schema.bases:read`.
- The base ID and the token are never committed. They live in `AIRTABLE_BASE_ID` and `AIRTABLE_ACCESS_TOKEN` in untracked `.env.local` and in Vercel.
- Code refers to tables and fields **by ID**. Names appear below only so people can read this document.

## 1. Principles

1. **Allow-list, not deny-list.** One config file, `apps/lms/lib/server/airtable/fields.ts`, lists every Airtable field the LMS may write. For each field it gives the field ID, the LMS source and a purpose (the purposes are the ones in this document). A field that isn't listed is never sent. Fields excluded by default sit in a separate list that has to be switched on per field, and only once this document records the owner's approval.
2. **Payloads carry IDs, not personal data.** An outbox row stores the event type, the entity ID and counters only. The worker reads the current state from the database when it sends and builds the record from the allow-list. As a result:
   - names and emails never sit in the outbox;
   - a learner deleted before their row is sent is never sent;
   - retries always send the latest state.
3. **The LMS owns its rows, not the whole base.** The sync writes only to:

   - rows it created, or rows staff have explicitly linked by putting the LMS ID on them (see §5.3);
   - fields marked "LMS" below.

   It never overwrites staff-owned fields on shared tables (for example payment status or membership).

4. **Write links from the side the LMS owns.** Writing a link field replaces the whole list. So the LMS writes the link on its own child rows (for example `Attendance.Learner`), and Airtable fills the inverse field on the shared row (`Learners.Attendance Records`) without touching the links staff made.
5. **Idempotent upserts.** Every LMS-written table gets an **LMS ID** field (single line text, internal UUID). All writes use `performUpsert.fieldsToMergeOn = [LMS ID]`, so retries and replays update the same record and never duplicate it.
6. **Results only after release.** Assessment outcomes go to Airtable only once the decision is **released** to the learner. Hub staff never see an outcome before the learner does.

## 2. Airtable tables and what the sync does with each

| Airtable table                              | Table ID            | LMS entity                                                                            | Sync role                                                                         |
| ------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Learners                                    | `tblHcVfzBAeaye7EI` | `users` with a learner enrolment                                                      | Upsert a few LMS fields; shared with staff-owned fields                           |
| Courses                                     | `tblKvN7Lo0SzfnOyW` | `cohorts` (one run of a qualification)                                                | Upsert. Has start and end dates, so it matches an LMS cohort, not a qualification |
| Modules                                     | `tbl7LvbAeloDTD8R6` | `modules`                                                                             | Upsert (reference data, no personal data)                                         |
| Assessments                                 | `tblAzpqpMQEwpovKy` | knowledge `assessment_attempts` (formative and summative) and practical `submissions` | Upsert **one row per learner per attempt or submission**                          |
| Attendance                                  | `tblxnsGTspPNTtaW0` | `attendance_records`                                                                  | Upsert                                                                            |
| Certificates                                | `tbl53xFZQzjOIpSQi` | none (the QCTO issues certificates after the EISA)                                    | Not touched                                                                       |
| Feedback                                    | `tblpye8LcoMkCFR7u` | none (course feedback, not support)                                                   | Not touched                                                                       |
| Instructors, Events, Schedules, Assignments | —                   | none                                                                                  | Not touched                                                                       |

**New tables proposed**, because the base has nowhere to keep per-enrolment progress or support tickets:

| New table               | One row per                  | Why                                                                                                         |
| ----------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **LMS Enrolments**      | enrolment (learner × cohort) | Enrolment status, overall progress and last active date. The existing Learner↔Course link can't hold these |
| **LMS Module Progress** | enrolment × module           | Sections completed and section-check results summarised per module (see §4)                                 |
| **LMS Support Tickets** | support ticket               | Ticket opened or closed, category and timing. No subject or body                                            |

## 3. Field mapping

Key to the "Default" column:

- **Send**: in the allow-list.
- **Not sent**: never sent unless the owner approves that field in §6.
- **Not touched**: staff-owned; the LMS never writes it.
- **New**: a field to be added.

### 3.1 Learners (`tblHcVfzBAeaye7EI`)

| Field                                                                                          | Field ID            | Default       | LMS source                                                                                                  | Purpose                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------- | ------------------- | ------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LMS ID**                                                                                     | new                 | **New, Send** | `users.id`                                                                                                  | Upsert key; joins Airtable rows to the LMS                                                                                                                                      |
| First Name                                                                                     | `fldChnmMwE1CjuatC` | Send          | `learner_qcto_profiles.first_name`; before the profile is confirmed, the first word of `users.display_name` | So hub staff can recognise the learner                                                                                                                                          |
| Last Name                                                                                      | `fldri9kjqP7ny0qYd` | Send          | `learner_qcto_profiles.last_name`; before that, the rest of `display_name`                                  | Same                                                                                                                                                                            |
| Email Address                                                                                  | `fldJg9u4r1IzmXutB` | Send          | `users.email`                                                                                               | Contacting the learner about hub matters; matching to existing hub records                                                                                                      |
| Enrollment Date                                                                                | `fldunRsaGWRDL7KfX` | Send          | earliest `enrolments.enrolled_at`                                                                           | Intake reporting                                                                                                                                                                |
| POPIA Consent Status                                                                           | `fldbgLWuwhYP4NMot` | Send          | `true` when the current POPIA notice **and** the QCTO-sharing consent are accepted                          | Shows staff that the learner accepted the notice that names Airtable                                                                                                            |
| **LMS Account Status**                                                                         | new (single select) | **New, Send** | `users.status`: Invited, Active, Suspended                                                                  | Learner invited and learner activated events                                                                                                                                    |
| **LMS Invited On**                                                                             | new (date)          | **New, Send** | date of the first invitation `auth_tokens` row                                                              | Learner invited event                                                                                                                                                           |
| **LMS Activated On**                                                                           | new (date)          | **New, Send** | first-time setup completion                                                                                 | Learner activated event                                                                                                                                                         |
| **LMS Last Active**                                                                            | new (date)          | **New, Send** | latest `sessions.last_seen_at`, as a date only (no time)                                                    | Engagement and drop-out risk                                                                                                                                                    |
| Status                                                                                         | `fld4L1FqPNd23fyRx` | Not touched   | —                                                                                                           | Multi-select mixing payment states (Paid, Bursary) with learning states. Writing it would wipe the payment tags. LMS states go to LMS Account Status and LMS Enrolments instead |
| Membership, Company, GIT Hub                                                                   | —                   | Not touched   | —                                                                                                           | Staff-owned                                                                                                                                                                     |
| Courses Enrolled, Assessments Taken, Attendance Records, Certificates Earned, Feedback, Events | —                   | Not touched   | —                                                                                                           | Inverse links. Airtable fills them from the LMS-owned child rows                                                                                                                |
| Phone / WhatsApp Number                                                                        | `fldPxTOMXJn9nUgob` | **Not sent**  | (`learner_qcto_profiles.cell_phone_enc`)                                                                    | Excluded by default (§6)                                                                                                                                                        |
| SA ID                                                                                          | `fldZ2ENjz9R7QQm64` | **Not sent**  | (`national_id_enc`)                                                                                         | Excluded by default (§6)                                                                                                                                                        |
| Passport                                                                                       | `fldxozU6ysJP40Tku` | **Not sent**  | (`alternate_id_enc`)                                                                                        | Excluded by default (§6)                                                                                                                                                        |
| Population Group                                                                               | `fldLfgp1bu7r7EOZs` | **Not sent**  | (`equity_code_enc`). Special personal information                                                           | Excluded by default (§6)                                                                                                                                                        |
| Gender                                                                                         | `fld6fQzFo928dfN0z` | **Not sent**  | `learner_qcto_profiles.gender_code`                                                                         | Not on your exclusion list, but held back pending your approval (§6)                                                                                                            |
| Entry Qualification NQF                                                                        | `fld3MDKXiRhiI88RT` | Not touched   | The LMS doesn't hold it                                                                                     | —                                                                                                                                                                               |
| Unique Learner QCTO Registration Number                                                        | `fldgkFMwuh2iNgLwj` | Not touched   | The LMS doesn't hold it                                                                                     | —                                                                                                                                                                               |

### 3.2 Courses (`tblKvN7Lo0SzfnOyW`): one row per LMS cohort

| Field                                                                                                                  | Field ID            | Default       | LMS source                                        | Purpose                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **LMS ID**                                                                                                             | new                 | **New, Send** | `cohorts.id`                                      | Upsert key                                                                                                      |
| Course Name                                                                                                            | `fldBfgtwRryKIHlLG` | Send          | `qualifications.title` + " – " + `cohorts.name`   | Identifying the run                                                                                             |
| Curriculum Code                                                                                                        | `fldX0tLKAaKNGBY95` | Send          | `qualifications.curriculum_code`                  | Reporting                                                                                                       |
| NQF Level                                                                                                              | `fldHvpjehHrPoa36x` | Send          | `qualifications.nqf_level` (as text)              | Reporting                                                                                                       |
| Start Date                                                                                                             | `fldgXseNERoM71Fka` | Send          | `cohorts.starts_on`                               | Reporting                                                                                                       |
| End Date                                                                                                               | `fldoRspPPMhaV3RfN` | Send          | `cohorts.ends_on`                                 | Reporting                                                                                                       |
| Modules                                                                                                                | `fldFvU3eyNwjaeBnS` | Send          | the qualification's modules (Airtable record IDs) | Links the run to its modules                                                                                    |
| Learners                                                                                                               | `fld48kP4B1e2KkOmo` | Send          | the cohort's enrolled learners (record IDs)       | Written from the LMS-owned course row, so `Learners.Courses Enrolled` fills in without touching non-LMS courses |
| Credit Value, Duration, Description, Delivery Mode, Instructor, Qualification attachment, Feedback, Events, Attendance | —                   | Not touched   | —                                                 | Staff-owned                                                                                                     |

### 3.3 Modules (`tbl7LvbAeloDTD8R6`)

| Field                                                      | Field ID            | Default                                              | LMS source                                     |
| ---------------------------------------------------------- | ------------------- | ---------------------------------------------------- | ---------------------------------------------- |
| **LMS ID**                                                 | new                 | **New, Send**                                        | `modules.id`                                   |
| Module Code                                                | `fldW90kOH7WjQjoCd` | Send                                                 | `modules.code`                                 |
| Module Name                                                | `fldiOdzxaOK8XzGzc` | Send                                                 | `modules.title`                                |
| KM or PM Identifier                                        | `fldZovYLzDNoGUWcN` | Send                                                 | `modules.type`: knowledge → KM, practical → PM |
| Credits                                                    | `fldtldVXXJyJxbFK7` | Send                                                 | `modules.credits`                              |
| Course, Instructor, Description, Module Photo, Assessments | —                   | Not touched (Course is filled from the Courses side) | —                                              |

Purpose: reference data, so module progress and assessments can link to a module.

### 3.4 Assessments (`tblAzpqpMQEwpovKy`): one row per learner per attempt or submission

The table was built as "one assessment, many learners, one score", which can't hold per-learner results. LMS rows each carry **exactly one** learner. Staff-made rows are left alone.

| Field                           | Field ID            | Default       | LMS source                                                                                                                        | Purpose                                                   |
| ------------------------------- | ------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **LMS ID**                      | new                 | **New, Send** | `assessment_attempts.id` or `submissions.id`                                                                                      | Upsert key                                                |
| Assessment Title                | `fldEOttoMzQ8ieTGU` | Send          | module code + kind + attempt, e.g. "KM-01 Summative, attempt 1". **No learner name, no question text**                            | Readable row label                                        |
| Assessment Type                 | `fldvmKQYl2QItPyzx` | Send          | blueprint kind formative → Formative, summative → Summative; practical → Project                                                  | Reporting                                                 |
| Course                          | `fld71ubaZ9wFVePb9` | Send          | Course Name as in §3.2 (this field is text, not a link)                                                                           | Reporting                                                 |
| Learners                        | `fldy4tdIPpugup0UV` | Send          | the single learner's Airtable record ID                                                                                           | Fills `Learners.Assessments Taken`                        |
| Date Administered               | `fld41znswue6ANHmr` | Send          | `submitted_at` (date)                                                                                                             | Knowledge assessment submitted                            |
| Score (%)                       | `fldZ2sXF3LQAOzR1r` | Send          | knowledge only, after release: `score_raw / score_max`                                                                            | Result reporting                                          |
| Competency Achieved?            | `fldyhjRjTbFgN8Eyk` | Send          | the latest **released** `assessment_decisions.outcome`. **The field has no options yet**: add "Competent" and "Not Yet Competent" | Assessment decision                                       |
| Related Module / ELO            | `fldBN54KxLbOzoFLW` | Send          | `modules.code`                                                                                                                    | Reporting                                                 |
| **LMS Attempt No**              | new (number)        | **New, Send** | `attempt_no`                                                                                                                      | Retake reporting                                          |
| **LMS Status**                  | new (single select) | **New, Send** | Submitted → Awaiting decision → Decision released (practical: also Draft)                                                         | Practical submission status                               |
| Assessor Name                   | `fldFiGRIyDuFEOEvO` | **Not sent**  | assessor `display_name` (staff personal data)                                                                                     | Optional (§6)                                             |
| Assessment Evidence File Link   | `fldizcNL2HcX9bqYF` | **Never**     | —                                                                                                                                 | Evidence stays private in the LMS (CLAUDE.md)             |
| Moderator Comments, Description | —                   | **Never**     | —                                                                                                                                 | Free text may contain assessment content or personal data |

Section checks are **not** written here. At several per section they would flood the table. They're summarised per module (§4).

### 3.5 Attendance (`tblxnsGTspPNTtaW0`)

| Field           | Field ID            | Default       | LMS source                                                                        |
| --------------- | ------------------- | ------------- | --------------------------------------------------------------------------------- |
| **LMS ID**      | new                 | **New, Send** | `attendance_records.id`                                                           |
| Attendance ID   | `fld6G04zpBDLDnC08` | Send          | the assessment day's date + venue code (no learner name)                          |
| Learner         | `fldonhRp0Xf4OVME4` | Send          | the learner's Airtable record ID                                                  |
| Course          | `fldyqpu8QuOdMGuWp` | Send          | the cohort's Airtable record ID                                                   |
| Session Date    | `fldoJOERZ8DBoNsPP` | Send          | `assessment_days.held_on`                                                         |
| Presence Status | `fldJxRDW5NKrz8wPA` | Send          | present, absent and late map one to one; **excused needs a new "Excused" option** |
| Remarks         | `fldxAQOz0M87EvQqp` | Never         | —                                                                                 |
| Events          | —                   | Not touched   | —                                                                                 |

Purpose: attendance reporting. LMS attendance is recorded on **assessment days** only. The ID-verified flag isn't sent.

### 3.6 New table: LMS Enrolments

| Field              | Type                                        | LMS source                                       | Event or purpose                   |
| ------------------ | ------------------------------------------- | ------------------------------------------------ | ---------------------------------- |
| LMS ID (primary)   | single line text                            | `enrolments.id`                                  | Upsert key                         |
| Learner            | link → Learners                             | record ID                                        | Enrolment created                  |
| Course             | link → Courses                              | record ID                                        | Enrolment created                  |
| Status             | single select: Active, Completed, Withdrawn | `enrolments.status`                              | Enrolment status                   |
| Enrolled On        | date                                        | `enrolled_at`                                    | Enrolment created                  |
| Sections Completed | number                                      | count of `section_progress.completed_at`         | Section completed                  |
| Sections Total     | number                                      | count of published sections in the qualification | Progress denominator               |
| Progress %         | percent                                     | completed ÷ total                                | Module progress changed            |
| Last Active        | date                                        | latest `sessions.last_seen_at` or section view   | Last active date                   |
| Synced At          | date and time                               | time of the worker's write                       | Reconciliation and staleness check |

### 3.7 New table: LMS Module Progress

| Field                         | Type                  | LMS source                                        | Event                                         |
| ----------------------------- | --------------------- | ------------------------------------------------- | --------------------------------------------- |
| LMS ID (primary)              | single line text      | deterministic UUIDv5 of (enrolment id, module id) | Upsert key (stable across retries)            |
| Enrolment                     | link → LMS Enrolments | record ID                                         | —                                             |
| Module                        | link → Modules        | record ID                                         | —                                             |
| Sections Completed / Total    | number, number        | `section_progress`                                | Section completed, module progress changed    |
| Section Checks Passed / Total | number, number        | best `assessment_attempts` per section check      | Section check result                          |
| Section Check Average %       | percent               | mean of the best scores                           | Section check result (**score only**)         |
| Section Check Attempts        | number                | total section-check attempts in the module        | Section check result (**attempt count only**) |
| Updated At                    | date and time         | —                                                 | —                                             |

### 3.8 New table: LMS Support Tickets

| Field            | Type                                               | LMS source                            |
| ---------------- | -------------------------------------------------- | ------------------------------------- |
| LMS ID (primary) | single line text                                   | `support_tickets.id`                  |
| Learner          | link → Learners                                    | raised by (if a learner)              |
| Category         | single select: Academic, Technical, Admin          | `category`                            |
| Status           | single select: Open, In progress, Resolved, Closed | `status`                              |
| Opened On        | date                                               | `created_at`                          |
| Closed On        | date                                               | when status became resolved or closed |

Purpose: support load and response-time reporting. **Subject and body are never sent.**

## 4. Events → Airtable writes

| LMS event                      | Outbox `event_type`        | Airtable write                                                              |
| ------------------------------ | -------------------------- | --------------------------------------------------------------------------- |
| Learner invited                | `learner.invited`          | Learners upsert (status Invited, invited on)                                |
| Learner activated              | `learner.activated`        | Learners upsert (status Active, activated on, consent)                      |
| Enrolment created or changed   | `enrolment.upserted`       | Courses (if new) → Learners → LMS Enrolments → Courses.Learners             |
| Section completed              | `section.completed`        | LMS Module Progress + LMS Enrolments (counts)                               |
| Section check result           | `section_check.graded`     | LMS Module Progress (score and attempt count only)                          |
| Module progress changed        | `module_progress.changed`  | LMS Module Progress                                                         |
| Knowledge assessment submitted | `knowledge.submitted`      | Assessments (status Awaiting decision, date)                                |
| Practical submission status    | `practical.status_changed` | Assessments (status)                                                        |
| Assessment decision released   | `decision.released`        | Assessments (score, competent or not yet competent)                         |
| Attendance recorded            | `attendance.recorded`      | Attendance                                                                  |
| Support ticket opened, closed  | `ticket.changed`           | LMS Support Tickets                                                         |
| Last active date               | `learner.active`           | Learners + LMS Enrolments. Coalesced to **at most one per learner per day** |
| Learner deleted or anonymised  | `learner.erased`           | see §5.4                                                                    |

There are no workplace or logbook events.

The worker **coalesces** events. Several pending rows for the same entity become one upsert of the latest state, which keeps the request count well inside 5 requests per second.

## 5. Implementation notes (Step 2)

### 5.1 Outbox

`sync_outbox` already exists (`packages/db/src/schema/ops.ts`, migration 0000) and nothing uses it yet. A new migration would:

- rename `aggregate_type` and `aggregate_id` to `entity_type` and `entity_id`, to match the brief;
- add the `dead` value to `sync_status` (the dead-letter state, after N attempts, default 8);
- add `tenant_id`, required by the tenancy rule.

`sent_at` stays.

Worker:

- Route `/api/cron/airtable-sync` (Vercel Cron, `Authorization: Bearer CRON_SECRET`), with a rule in `lib/access.ts` and a row in `access.test.ts`.
- Batches of up to 10 records, at most 5 requests per second, and exponential backoff with jitter on 429 and 5xx (Airtable's 30-second penalty after a 429 is respected).
- `last_error` holds the HTTP status, the Airtable error type and the field ID only. Never values.

### 5.2 Record-ID map

Link fields need Airtable record IDs. A new table, `airtable_records`, would hold:

- `tenant_id`, `entity_type`, `entity_id`, `table_id`, `record_id`;
- `created_by_lms` (boolean, from `performUpsert`'s `createdRecords`).

It lets the worker resolve links without extra reads, and it drives deletion.

### 5.3 Existing learner rows (avoiding duplicates)

The Learners table already holds people entered by staff. Upserting on LMS ID alone would create a **second** row for anyone already there. Two options:

- **(a) Recommended.** Staff paste the LMS ID into the existing row's **LMS ID** field, from an admin export or the People page. The next upsert merges into that row. No automatic matching on personal data.
- **(b)** A one-off backfill that matches existing rows by email (a dry run first, then confirm). Faster, but wrong matches are possible.

The same applies to Courses rows for runs that already exist.

### 5.4 Deletion and anonymisation

The LMS has **no delete or anonymise flow yet**, so Step 2 would add a minimal one (an SDP admin with step-up, audited). The `learner.erased` event:

- **deletes** every LMS-created child row: Assessments, Attendance, LMS Enrolments, LMS Module Progress and LMS Support Tickets rows that carry this learner;
- on Learners:
  - if `created_by_lms`, **deletes** the row;
  - otherwise (a staff row that was linked) **clears every LMS-written field** and sets LMS Account Status to "Erased", so staff-owned hub data isn't destroyed.

It writes an `audit_log` entry (action `airtable.erase`, entity IDs and counts only).

### 5.5 Reconciliation

A nightly cron compares, per table, the LMS count with the count of Airtable records that have a non-empty LMS ID (paged 100 at a time). Any difference is flagged on the sync admin page and in the audit log.

### 5.6 Feature flag and dry run

- `AIRTABLE_SYNC_ENABLED` defaults to off. When it's off, outbox rows still accumulate (so nothing is lost), but nothing is sent.
- Dry-run mode prints each batch with names and emails masked (`J*** D***`, `j***@***`).
- New env var names to register: `AIRTABLE_SYNC_ENABLED`, `AIRTABLE_SYNC_DRY_RUN`, and optionally `AIRTABLE_ALLOWED_BASE_ID`.

## 6. Personal data held back: owner approval needed

By default the allow-list **does not send**:

- National ID (SA ID) and alternate ID (Passport);
- equity code (Population Group);
- disability status and rating (there is no Airtable field anyway);
- home and postal addresses (no Airtable field);
- phone and cell numbers (Phone / WhatsApp Number);
- passkey data;
- question and answer content, papers and evidence files.

Also held back: Gender and Assessor Name.

> **Conflict to resolve.** `design.md` §14 and `compliance/popia.md` record an owner decision dated 2026-11-08 that the **full QCTO profile** (including ID numbers, race and disability) is copied to Airtable, and the learner notice says so. The brief for this sync says the opposite by default. This proposal follows the brief. If you keep the minimal default, the "Full profile copied to Airtable" decision should be withdrawn in design.md and popia.md, and the notice can stay as it is (it names Airtable as a recipient, which remains true).

To include a field, approve it here:

| Field                          | Include? | Approved by and date |
| ------------------------------ | -------- | -------------------- |
| SA ID                          | no       |                      |
| Passport (alternate ID)        | no       |                      |
| Population Group (equity code) | no       |                      |
| Phone / WhatsApp Number        | no       |                      |
| Gender                         | no       |                      |
| Assessor Name                  | no       |                      |

## 7. Airtable changes needed (none made yet)

To be made in the base after approval, by you in the Airtable UI or by the sync's setup script with `schema.bases:write`:

1. Add **LMS ID** (single line text) to Learners, Courses, Modules, Assessments and Attendance.
2. Learners:
   - add **LMS Account Status** (Invited, Active, Suspended, Erased);
   - add **LMS Invited On**, **LMS Activated On** and **LMS Last Active** (all dates).
3. Assessments:
   - add the options **Competent** and **Not Yet Competent** to "Competency Achieved?";
   - add **LMS Attempt No** (number);
   - add **LMS Status** (Draft, Submitted, Awaiting decision, Decision released).
4. Attendance: add the option **Excused** to Presence Status.
5. Create the tables **LMS Enrolments**, **LMS Module Progress** and **LMS Support Tickets** (§3.6 to §3.8).

After that, the new field and table IDs are read once and committed to `fields.ts`.

## 8. Open questions for the owner

1. Approve the minimal default in §6, or approve specific fields, and resolve the conflict with the "full profile" decision.
2. Matching existing learners: option (a) manual LMS ID, or (b) a one-off email match (§5.3)?
3. On erasure, delete Learners rows the LMS created and only clear staff-created rows (§5.4)? Or always delete?
4. Who makes the Airtable changes in §7: you in the UI, or a setup script (which needs `schema.bases:write` on the token)?
5. **Token.** The current token can write to all five GRIT bases and is shared with the public website. Please create an LMS-only token: Hub Management Information System base only, scopes `data.records:read`, `data.records:write` and `schema.bases:read`.
6. **Airtable plan record limit.** LMS Module Progress adds about learners × modules rows. Is the base on a plan with room (Team: 50k records per base)?
7. Development uses this base directly (owner decision, 2026-11-08: not production-critical). LMS rows will be clearly marked by **LMS ID**. Should test runs use a "TEST –" Course Name prefix, so they're easy to filter and delete?
