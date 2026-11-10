# 04 POPIA pack

**What this is:** how GRIT Hub Learning processes personal information under the Protection of Personal Information Act 4 of 2013 (POPIA): what is collected and why, who receives it, how it is protected, how long it is kept, and what to do when something goes wrong or a learner asks for their data. It is written for GRIT Hub's Information Officer, management and QCTO or quality-partner evaluators.

**Status: draft.** It must be reviewed and signed by the Information Officer before real learners are invited. Every decision or signature still needed is marked **TODO** and listed in [README.md](README.md). Section references ("s26") are to POPIA; the Information Officer should confirm each legal reading.

The working notes this pack builds on are in `docs/lms/compliance/popia.md`. Where the two differ, this pack is newer.

## 1. Responsible party and Information Officer

| Item                           | Value                                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| Responsible party              | GRIT Hub (Garden Route Innovation and Technology Hub)                                         |
| Information Officer            | **TODO(T-02)**: name, contact email and phone, date registered with the Information Regulator |
| Deputy Information Officer     | **TODO(T-02)**                                                                                |
| Where learners see the contact | The POPIA notice at first sign-in (`apps/lms/lib/popia.ts`, currently a placeholder)          |

## 2. Processing register

One row per processing activity. "Basis" is the s11 justification; consent (s11(1)(a)) is recorded separately where it is relied on.

| #   | Activity                                  | Data subjects                   | Personal information                                                                                                               | Purpose                                                              | Basis (s11)                                                      | Source                                | Recipients / operators                                    | Retention                   |
| --- | ----------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------- | --------------------------- |
| P1  | Accounts and sign-in                      | Learners, staff, evaluators     | Name, email, account status, passkey public keys, session and link hashes, HMAC of IP address                                      | Give access to the LMS securely                                      | Contract (s11(1)(b)) for learners; legitimate interest for staff | SDP admin (invite), the person        | Vercel, DB host, Resend                                   | §8                          |
| P2  | Notice acceptance and consent             | Learners, staff                 | Notice version, SHA-256 of the exact text, timestamp; QCTO sharing consent (yes/no, version, time)                                 | Prove what was accepted, when                                        | Legal obligation (s11(1)(c)): accountability                     | The person                            | Vercel, DB host                                           | §8                          |
| P3  | Learning and progress                     | Learners                        | Sections opened and completed, reading position, check answers, library use                                                        | Deliver the Knowledge module and show progress                       | Contract                                                         | The learner                           | Vercel, DB host                                           | §8                          |
| P4  | Assessment and moderation                 | Learners, assessors, moderators | Papers served, answers, marks, feedback, decisions, moderation verdicts, appeals, attendance and ID-check flags on assessment days | Assess competence as the QCTO requires; quality assurance            | Contract; legal obligation (QCTO assessment rules)               | Learner, assessor, moderator          | Vercel, DB host; QCTO / quality partner on inspection     | §8                          |
| P5  | Practical evidence                        | Learners                        | Uploaded files and links (may show faces, names, voices), file checksums                                                           | Assess the Practical module                                          | Contract; legal obligation                                       | The learner                           | Vercel (Blob evidence store)                              | §8                          |
| P6  | Communication and support                 | Learners, staff                 | Announcements, discussion posts, direct messages, tickets, notes, live-session attendance, notification preferences                | Facilitate learning and support (Form 5 4.2.6, 4.2.11)               | Contract                                                         | Learners, staff                       | Vercel, DB host, Resend (no message text in emails), Zoom | §8                          |
| P7  | QCTO learner profile and enrolment status | Learners                        | See §3.2 (identity number, birth date, contact details, race, disability and other LEISA fields)                                   | Register learners with the QCTO (LEISA enrolment and EISA readiness) | Legal obligation; **special information: §4**                    | The learner (or SDP admin correcting) | Vercel, DB host; **QCTO (recipient)**; Airtable (planned) | §8                          |
| P8  | Audit log                                 | All users                       | Who did what, when (ids, counts, field names; HMAC of IP). Never names, emails or content                                          | Accountability, security, evidence of controls                       | Legal obligation; legitimate interest (security)                 | The system                            | Vercel, DB host                                           | §8                          |
| P9  | Backups                                   | All                             | The whole database (encrypted file)                                                                                                | Recover from loss (Form 5 4.1.6)                                     | Legitimate interest; s19 safeguards                              | The system                            | Vercel (separate Blob backup store)                       | 7 nightly files             |
| P10 | Rate limiting                             | Anyone using the site           | HMAC of IP address or email, counters                                                                                              | Stop abuse                                                           | Legitimate interest                                              | The system                            | Vercel, DB host                                           | One time window             |
| P11 | Media playback                            | Learners                        | IP address and playback data, at Mux                                                                                               | Stream lesson media                                                  | Contract                                                         | The learner's browser                 | Mux                                                       | Mux's terms: **TODO(T-06)** |
| P12 | Management reporting (planned)            | Learners                        | Enrolment, attendance, results, full QCTO profile (owner decision 2026-11-08)                                                      | Management reporting                                                 | **TODO(T-10)**                                                   | The LMS (one-way copy)                | Airtable                                                  | **TODO(T-08)**              |

## 3. Purpose per field

### 3.1 Accounts, sign-in and activity

| Field (table)                                                                                | Purpose                                                       | Notes                                                                           |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Display name (`users`)                                                                       | Address the person; show staff who the learner is             |                                                                                 |
| Email (`users`)                                                                              | Sign-in identifier; invitations, sign-in links, notifications |                                                                                 |
| Status (`users`)                                                                             | Invited / active / deactivated                                | Deactivation signs the person out everywhere                                    |
| Passkey credential id, public key, counter, transports, device label (`passkey_credentials`) | Passwordless sign-in                                          | **No biometric data**: the fingerprint or face check happens only on the device |
| Session token hash, expiry, HMAC of IP (`sessions`)                                          | Keep the person signed in (14 days max)                       | The raw token is never stored                                                   |
| Link token hash (`auth_tokens`)                                                              | Single-use emailed links                                      | 15 min sign-in, 30 min recovery, 72 h invitation                                |
| Consent rows (`consent_records`)                                                             | Proof of notice acceptance and QCTO sharing consent           | Append-only                                                                     |
| Audit entries (`audit_log`)                                                                  | Accountability                                                | Append-only; ids and counts only                                                |
| Rate-limit keys (`rate_limit_buckets`)                                                       | Abuse protection                                              | HMAC of IP/email, never raw                                                     |
| Answers, marks, feedback (`attempt_items`, decisions)                                        | Assessment                                                    | Frozen after submission / decision                                              |
| Evidence files (`evidence_items`, Blob)                                                      | Practical assessment                                          | Private; 5-minute signed links; staff views audited                             |
| Messages, posts, tickets (`direct_messages`, `discussion_posts`, `support_tickets`, …)       | Learning support                                              | No attachments accepted, which keeps ID documents out                           |

### 3.2 QCTO learner profile (`learner_qcto_profiles`, `enrolment_qcto_records`)

Every field below exists only because the QCTO LEISA enrolment file requires it (column references in `docs/lms/compliance/qcto-leisa-mapping.md`). Learners enter it at first sign-in; SDP admins may correct it (audit lists the changed field names, never values).

| Field                                                                                                                                               | Purpose (LEISA)                       | Protection                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------ |
| National ID number / alternate ID and its type                                                                                                      | Identify the learner to the QCTO      | **Encrypted** (field level); blind index for duplicate checks; shown masked (last 4) |
| Birth date                                                                                                                                          | QCTO validation against the ID number | **Encrypted**                                                                        |
| Home and postal addresses, phone, cell, fax                                                                                                         | QCTO contact fields                   | **Encrypted**                                                                        |
| **Equity code (race)**                                                                                                                              | QCTO equity reporting                 | **Encrypted**; special personal information (§4)                                     |
| **Disability status and rating**                                                                                                                    | QCTO reporting                        | **Encrypted**; special personal information (§4)                                     |
| Names as on ID, title, gender, nationality, home language, citizen/resident status, socioeconomic status, immigrant status, province, Stats SA area | QCTO code-list fields                 | Plain codes (validated against QCTO lists); SDP admins only                          |
| Whether the sign-in email may go to the QCTO                                                                                                        | Learner's choice for the email column | Learner controls it                                                                  |
| Readiness type, statement-of-results status and date, FLC code and certificate number                                                               | Enrolment and EISA readiness          | Plain; SDP admins only                                                               |

## 4. Special personal information: race and disability

Race (equity code) and disability status and rating are **special personal information** (s26). POPIA prohibits processing it unless an authorisation in s27 (general) or the specific sections (s29 race or ethnic origin, s32 health, which covers disability) applies.

| Control                    | How it is applied                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lawful basis               | Collected **only** because the QCTO requires it for learner registration. Candidate bases: explicit consent (s27(1)(a)), and the specific authorisations for race (s29) and health (s32). **TODO(T-09)**: the Information Officer confirms the basis and signs it off.                                                                                                                                 |
| Explicit, separate consent | A separate, required tick at first sign-in to share details with the QCTO (consent kind `qcto_sharing`, version recorded). It is separate from the general notice and names race and disability.                                                                                                                                                                                                       |
| Minimum use                | Used only to build the QCTO enrolment file. Never used for at-risk flags, analytics, marking or any learner-facing feature, and never shown to facilitators, assessors or moderators.                                                                                                                                                                                                                  |
| Who can see it             | The learner (own profile) and SDP admins (with a passkey). The QCTO panel shows **which** fields fail validation, never the values.                                                                                                                                                                                                                                                                    |
| Encryption                 | Encrypted in the application before it reaches the database (§5). The database host and anyone with a database copy see only ciphertext.                                                                                                                                                                                                                                                               |
| Never in                   | Emails, audit payloads, logs, the evidence pack, the communication log, CSV progress exports or this repository.                                                                                                                                                                                                                                                                                       |
| Open risk                  | Two owner decisions (2026-11-08) widen exposure: the LEISA file emailed to the QCTO as a **plain .xlsx attachment**, and the **full profile copied to Airtable** (outside South Africa). Both are named in the learner notice. **TODO(T-10)**: the Information Officer accepts or reverses each; the recommended option is an encrypted file or portal upload, and no special information in Airtable. |

## 5. Field-level encryption and key management

| Item             | Detail                                                                                                                                                                                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Encrypted fields | `national_id_enc`, `alternate_id_enc`, `birth_date_enc`, `home_address_enc`, `postal_address_enc`, `phone_enc`, `cell_phone_enc`, `fax_enc`, `equity_code_enc`, `disability_status_enc`, `disability_rating_enc` (`packages/db/src/pii.ts`, ADR-014)                                             |
| Algorithm        | AES-256-GCM, random 96-bit IV per value. The authenticated data binds each ciphertext to its table, column and row, so a value copied to another row or column fails to decrypt.                                                                                                                 |
| Key versions     | `PII_ENCRYPTION_KEYS` holds `version:key` pairs (1–255). The highest version encrypts; every version decrypts. Each ciphertext records its key version.                                                                                                                                          |
| Duplicate checks | `PII_BLIND_INDEX_KEY` (HMAC-SHA-256) gives a blind index for ID numbers, so the database can enforce "one profile per ID" without storing the number. This key is **not** rotated routinely: changing it orphans every index.                                                                    |
| Other keys       | `BACKUP_ENCRYPTION_KEY` (backups, §P9); `SESSION_SECRET` (HMAC of IP addresses and emails for rate limits and audit). Each key has one job.                                                                                                                                                      |
| Where keys live  | Only in Vercel environment variables (production and preview kept separate) and an offline copy. Never in the repository, the database or backups.                                                                                                                                               |
| Custody          | **TODO(T-11)**: two named roles hold the offline copies (for example in a password manager vault with MFA); record where and who, outside this repository.                                                                                                                                       |
| Rotation         | Add a new version to `PII_ENCRYPTION_KEYS` and deploy: new writes use it at once. Existing rows keep the old version until re-encrypted, so the old key must stay until then. A bulk re-encryption job is **not built yet** (engineering gap E-03 in README). Rotation schedule: **TODO(T-11)**. |
| Key compromise   | Treat as a breach (§10): rotate the key, re-encrypt, and assess which rows were exposed.                                                                                                                                                                                                         |
| Loss             | Losing a PII key loses the data it sealed; losing the backup key makes backups unreadable. Hence the offline copies.                                                                                                                                                                             |

Data in transit uses HTTPS (HSTS enforced) and TLS to the database (`DATABASE_SSL=require` is the default for any non-local host). Encryption at rest by the database host and Blob storage is the provider's: **TODO(T-04)** confirm for the chosen host.

## 6. QCTO as a recipient

The QCTO is a **recipient** of learner information, not an operator: it receives the LEISA enrolment file to perform its own statutory function of registering learners and certification readiness.

| Item                 | Detail                                                                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What is sent         | One row per learner per qualification with the LEISA columns (§3.2), including identity number, race and disability. The sign-in email only if the learner chose to share it. |
| Why                  | QCTO learner registration (required for learners to be assessed and certified).                                                                                               |
| Learner is told      | The POPIA notice names the QCTO as a recipient; the separate QCTO sharing consent is required to finish setup.                                                                |
| If a learner refuses | They can't finish setup, so they can't be enrolled with the QCTO. **TODO(T-09)**: decide what GRIT Hub offers someone who refuses.                                            |
| Channel              | **Not built yet.** Current owner decision: email the file as a plain attachment. See §7 and **TODO(T-10)**.                                                                   |
| QCTO responses       | Acceptance or rejection is recorded per batch; response notes must not contain personal data.                                                                                 |
| Cross-border         | The QCTO is in South Africa. An email channel passes through Resend (outside South Africa) unless another channel is chosen.                                                  |

## 7. LEISA files: secure handling and retention

The LEISA exporter (which generates the file) is **not built yet**. The database already enforces the batch lifecycle; the rules below are **binding requirements** for the exporter and for staff handling the files.

What the database already enforces (`qcto_submission_batches`, `qcto_submission_items`, migrations 0008–0014):

- A batch moves draft → generated → submitted → accepted / rejected. A generated batch must record its file name, storage key, SHA-256, row count, and who generated it and when.
- Once submitted, the file reference is **frozen**; only drafts can be deleted.
- The file itself is never copied into the database: each row keeps only a SHA-256 of what was sent, which proves what was submitted without duplicating personal data.

Requirements for generated files:

| #   | Requirement                                                                                                                                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | Generated on the server only, by an SDP admin with a passkey (step-up). Decryption happens in memory for the duration of the export.                                                                                              |
| L2  | Stored in the **private** evidence store under a `qcto/` prefix with a random suffix; never a public link. Opened only through a 5-minute signed link issued after an access check.                                               |
| L3  | Every generation, download and submission is audit-logged with the batch id, row count and SHA-256, never the contents.                                                                                                           |
| L4  | Not saved to staff laptops, shared drives, chat or Airtable. If a local copy is unavoidable for upload, delete it the same day.                                                                                                   |
| L5  | Transmission to the QCTO: preferred is the QCTO's own portal or an encrypted file with the password sent by a different channel. A plain email attachment is the current owner decision and needs IO acceptance (**TODO(T-10)**). |
| L6  | The file name carries no learner names.                                                                                                                                                                                           |
| L7  | Before sending, re-check the SHA-256 of the file being sent against the batch record.                                                                                                                                             |
| L8  | Blob files are **not** in the nightly database backup (§P9 covers the database only). **TODO(T-27)**: decide whether stored LEISA files and evidence files need their own backup.                                                 |

## 8. Retention schedule

Periods marked **TODO(T-08)** are policy decisions for the Information Officer, taking QCTO record-keeping rules into account (POPIA s14: keep no longer than necessary, unless a law or the purpose requires it). Periods that are fixed by the system are stated as facts. **Nothing auto-deletes yet**, except where noted.

| Record                                                               | Retention                                                                                                                                                                            | How it ends                                                             |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Sign-in links (`auth_tokens`)                                        | 15 min / 30 min / 72 h validity (system)                                                                                                                                             | Expire; rows remain: **TODO(T-08)** purge period                        |
| Sessions                                                             | 14 days maximum (system)                                                                                                                                                             | Expire or revoked; rows remain: **TODO(T-08)**                          |
| Signed file links                                                    | 5 minutes (system)                                                                                                                                                                   | Expire                                                                  |
| Rate-limit counters                                                  | One window (minutes to 24 h; system)                                                                                                                                                 | Overwritten                                                             |
| Nightly backups                                                      | Newest 7 files (system)                                                                                                                                                              | Older files deleted by the job; deletion logged                         |
| Accounts (name, email)                                               | **TODO(T-08)**                                                                                                                                                                       | Deactivate, then delete or anonymise after the period                   |
| Consent records                                                      | **TODO(T-08)** (at least as long as the data they cover)                                                                                                                             | Append-only: deletion needs a controlled procedure                      |
| Audit log                                                            | **TODO(T-08)**                                                                                                                                                                       | Append-only: archive then delete by the owner role                      |
| Assessment records (attempts, marks, decisions, moderation, appeals) | **TODO(T-08)**: QCTO / quality-partner record-keeping period                                                                                                                         | Controlled deletion after the period                                    |
| Practical evidence files                                             | **TODO(T-08)**: same as assessment records                                                                                                                                           | Delete from Blob and record the deletion                                |
| Communication records                                                | Same as assessment evidence (design.md §14, 2026-11-08)                                                                                                                              | With assessment records                                                 |
| QCTO learner profile                                                 | **TODO(T-08)**                                                                                                                                                                       | Controlled deletion; blind index goes with the row                      |
| **LEISA submission files** (Blob)                                    | **TODO(T-08)**: proposed rule: keep until the QCTO has accepted the batch and the period for queries has passed, then delete the file; keep the batch record and row hashes as proof | Delete the Blob file, set a deletion note on the batch; row hashes stay |
| LEISA batch records and row hashes                                   | **TODO(T-08)**: with assessment records                                                                                                                                              | Contain no personal data beyond ids                                     |
| Airtable copy (planned)                                              | **TODO(T-08)**                                                                                                                                                                       | Delete in Airtable                                                      |

## 9. Access logging for exports

Every way personal information leaves the LMS in bulk, or a file is opened, is recorded in the append-only audit log with the actor, time, ids, counts and (for files) the SHA-256, never the contents.

| Export / access                          | Who may                                                 | Audit action                                                            | Logged                                                            |
| ---------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Learner progress report (view / CSV)     | Facilitators (own cohorts), SDP admins                  | `report.progress.viewed` / `.exported`                                  | Enrolment id                                                      |
| Exact paper PDF (with answer key)        | Assessors, moderators, external evaluators              | `assessment.paper.exported`                                             | Attempt id, SHA-256, size                                         |
| Moderation report (PDF / CSV)            | Moderators                                              | `assessment.moderation.report_exported`                                 | Batch id, format, SHA-256, sample size                            |
| Communication log (PDF / CSV)            | SDP admins, external evaluators                         | `comms.log.exported`                                                    | Cohort, format, date range, entry count, SHA-256                  |
| Form 5 evidence pack (pseudonymised)     | SDP admins, external evaluators                         | `compliance.pack.exported`                                              | Qualification, cohort, date range, SHA-256, whether keys included |
| Learner guide (signed link)              | SDP admins, external evaluators                         | `compliance.guide.viewed`                                               | Guide id                                                          |
| Practical evidence file (signed link)    | The learner; assessors, moderators, evaluators in scope | `practical.evidence.viewed`                                             | Evidence id                                                       |
| Any page opened by an external evaluator | External evaluators                                     | `evaluator.page.viewed` (added 2026-11-10)                              | Path (ids only, no query string)                                  |
| Permission denied                        | Anyone                                                  | `auth.permission_denied`                                                | Path, reason                                                      |
| LEISA file (when built)                  | SDP admins                                              | Required by L3                                                          | Batch id, rows, SHA-256                                           |
| Backup files                             | Nobody through the LMS; custodians via Vercel only      | Outside the LMS: **TODO(T-26)** confirm the Vercel account's access log | n/a                                                               |

The audit log can't be updated or deleted by the application (database triggers, and the runtime database role has no UPDATE or DELETE on it; see [05](05-security-controls.md)). There is **no audit-log viewer screen yet** (engineering gap E-02); custodians read it from the database.

## 10. Operators and cross-border transfers

| Operator                                                     | What it processes                                        | Location                                  | Written agreement (s21) |
| ------------------------------------------------------------ | -------------------------------------------------------- | ----------------------------------------- | ----------------------- |
| Vercel (hosting, functions, Blob evidence and backup stores) | Everything in transit; evidence files; encrypted backups | Function and store regions **TODO(T-03)** | **TODO(T-06)**          |
| Database host (**TODO(T-04)**)                               | All LMS records                                          | **TODO(T-03)**                            | **TODO(T-06)**          |
| Mux (video/audio host)                                       | Playback data, IP addresses                              | Outside South Africa                      | **TODO(T-06)**          |
| Resend (email)                                               | Names, email addresses, subjects                         | Outside South Africa                      | **TODO(T-06)**          |
| Airtable (planned)                                           | Full QCTO profile (owner decision)                       | Outside South Africa                      | **TODO(T-06, T-10)**    |
| Zoom (live sessions)                                         | Meeting participation                                    | Outside South Africa                      | **TODO(T-06)**          |

**Cross-border note (s72).** Personal information may go to a third party in a foreign country only if that party is bound by law, binding corporate rules or an agreement giving adequate protection, or the data subject consents, or another s72 ground applies. Resend, Mux, Airtable and Zoom are outside South Africa, and Vercel and the database may be too, depending on T-03. GRIT Hub relies on each operator's contractual data-protection terms. The learner notice names Airtable and the QCTO. **TODO(T-07)**: the Information Officer confirms the s72 ground for each operator. Choosing South African regions for the database, functions and Blob stores (T-03) removes most of the exposure.

## 11. Consent and notice versions

| Text                            | Current version   | Status | Where                   |
| ------------------------------- | ----------------- | ------ | ----------------------- |
| POPIA notice (all users)        | `2026-11-draft-2` | Draft  | `apps/lms/lib/popia.ts` |
| QCTO sharing consent (learners) | `2026-11-draft-1` | Draft  | `apps/lms/lib/popia.ts` |

- Each acceptance stores the version, a SHA-256 of the exact text and the time, in an append-only table.
- Any wording change needs a new version string; everyone whose accepted version differs is sent back through setup before they can continue.
- **TODO(T-09)**: the Information Officer approves final wording and the versions move from `draft` to a release name before the first real cohort.

## 12. Security compromise (breach) procedure

POPIA s22: when there are reasonable grounds to believe personal information was accessed or acquired by an unauthorised person, GRIT Hub must notify the Information Regulator and the affected people as soon as reasonably possible.

1. **Report internally at once.** Anyone who suspects a compromise tells the Information Officer and the technical custodian (contacts: **TODO(T-17)**). Write down what was seen, when and by whom. Do not delete evidence.
2. **Contain** (technical custodian), as relevant:
   - Deactivate affected accounts (SDP admin → People); this revokes their sessions and links.
   - Revoke all sessions if needed (owner database role: set `revoked_at` on every open row in `sessions`).
   - Rotate exposed secrets in Vercel (database password, API tokens, `SESSION_SECRET`; PII or backup keys per §5) and redeploy.
   - Revoke an evaluator grant early by setting its expiry to now.
3. **Assess** (within 24 hours where possible): what data, whose, how many people, whether the data was encrypted (ciphertext without keys is lower risk), likely consequences. Use the audit log (ids, times, actions) and provider logs.
4. **Decide and notify** (Information Officer): notify the Information Regulator using its prescribed form and channel (**TODO(T-17)**: confirm the current form and portal), and notify affected people in writing (email to the registered address, or another s22(4) method), with enough detail for them to protect themselves. Notify operators and, where relevant, the QCTO.
5. **Record** the incident, decisions, notifications and dates in GRIT Hub's incident register (outside this repository).
6. **Review** within 30 days: root cause, fixes, updates to this pack.

## 13. Data-subject requests

| Right                         | How the LMS supports it                                                                                                                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Access (s23)                  | The learner sees their own profile (ID masked), progress, results, evidence and messages. An SDP admin can export a progress report. Other records are compiled by the custodian from the database. |
| Correction (s24)              | Learners correct their own account details; SDP admins correct the QCTO profile (audited by field name).                                                                                            |
| Deletion or destruction (s24) | Possible where no law or QCTO rule requires keeping it (§8). Assessment evidence and append-only records are kept for their retention period; the account can be deactivated at once.               |
| Objection (s11(3))            | Handled by the Information Officer case by case.                                                                                                                                                    |

Procedure:

1. Receive the request in writing (email to the Information Officer, or the prescribed forms under the POPIA Regulations / PAIA manual).
2. **Verify identity** using the same methods as admin-verified account recovery (in person with ID, video call with ID, or a call to a number already on record). Record the method, never the ID number.
3. Log the request (date, type, requester's user id) in GRIT Hub's register.
4. Respond within the period the Information Officer sets (**TODO(T-18)**: confirm, e.g. the 30-day PAIA period), explaining anything that is refused and why.
5. Record the outcome.

**TODO(T-18)**: name who handles requests and approve this procedure.

## 14. Sign-off

| Role                | Name           | Signature | Date |
| ------------------- | -------------- | --------- | ---- |
| Information Officer | **TODO(T-02)** |           |      |
| System owner        | **TODO(T-01)** |           |      |
