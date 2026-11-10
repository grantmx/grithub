# LMS Capability and Security Dossier

**What this is:** the evidence set describing what GRIT Hub Learning (the LMS in `apps/lms`) does, who runs it, how it protects learners' data and assessment integrity, how it is backed up, and how an evaluator can see it working. It supports QCTO Form 5 section 4 and GRIT Hub's POPIA obligations.

**Readers:** QCTO and quality-partner evaluators, GRIT Hub management, the Information Officer and the technical custodian.

**This repository is public.** The dossier contains no secrets, no personal data and no real names. Contracts, signed copies, named contacts and incident records are kept by GRIT Hub elsewhere; where this dossier needs them it says **TODO** and the item is listed below.

**Status:** draft, 2026-11-10. Facts describe the system as built on that date. Nothing here is signed yet.

## Contents

| #   | Document                                                                       | Answers                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | [System description](01-system-description.md)                                 | What the LMS is, who uses it, how it is built (Form 5 4.1.2)                                                                                                                                                                                |
| 02  | [Ownership and third-party services](02-ownership-and-third-party-services.md) | Who owns it; every service, its role, plan, data and region (4.1.3)                                                                                                                                                                         |
| 03  | [Capacity and load test](03-capacity-and-load-test.md)                         | How capacity is measured: k6 script ([`k6/lms-load.js`](k6/lms-load.js)) and report template. **No figures yet.**                                                                                                                           |
| 04  | [POPIA pack](04-popia-pack.md)                                                 | Processing register, purpose per field, special personal information, encryption and keys, QCTO as recipient, LEISA file handling, retention, export logging, operators, cross-border, consent versions, breach and data-subject procedures |
| 05  | [Security controls](05-security-controls.md)                                   | Passkeys and MFA, hardening, access-control matrix, audit log, encryption, question-bank and randomisation integrity                                                                                                                        |
| 06  | [Backup and restore](06-backup-and-restore.md)                                 | Nightly backup, restore procedure, restore-test log template (4.1.6)                                                                                                                                                                        |
| 07  | [Evaluator demo guide](07-evaluator-demo-guide.md)                             | Walkthrough with the read-only evaluator account and DEMO cohort, mapped to 4.1–4.3; 4.4 not applicable                                                                                                                                     |

## Keeping it current

- Every LMS change that affects a statement here updates the dossier in the same pull request, as with `docs/lms/compliance/form5-mapping.md`.
- When a TODO is resolved, replace it with the fact (never a name or contract number; refer to "the signed agreement held by GRIT Hub") and strike it from the list below with the date.
- Measured figures (load tests, restore times) go in only after a real run.

## TODO register: decisions and signatures needed

Type: **D** decision · **S** signature or approval · **C** configuration a person must do (needs access GRIT Hub controls).

| ID   | Type | What is needed                                                                                                                                                                                                                                   | Where                   |
| ---- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| T-01 | D, S | Name the system owner role and technical custodian role; sign the dossier; decide on any real production recovery.                                                                                                                               | 02 §1, 04 §14, 06 §4    |
| T-02 | D, S | Appoint and register the Information Officer (and deputy); put their contact in the learner notice; sign the POPIA pack.                                                                                                                         | 04 §1, §14              |
| T-03 | D    | Hosting regions: Vercel functions, database, both Blob stores, Resend sending region (South Africa vs elsewhere).                                                                                                                                | 01, 02, 04 §10          |
| T-04 | D    | Database provider and plan; its own backups and point-in-time recovery; confirm encryption at rest for the database and Blob.                                                                                                                    | 02, 04 §5, 05 §5, 06    |
| T-05 | D    | Record the plan held for each service (Vercel, database, Blob, Mux, Resend, Airtable, Zoom, GitHub, domain).                                                                                                                                     | 02 §2, 03 §1            |
| T-06 | S    | Written operator agreements (s21) with Vercel, the database host, Mux, Resend, Airtable and Zoom; note each one's data retention.                                                                                                                | 02 §2, 04 §2, §10       |
| T-07 | D, S | Information Officer confirms the s72 cross-border ground for each operator outside South Africa.                                                                                                                                                 | 04 §10                  |
| T-08 | D, S | Retention periods for every record type in the schedule, including LEISA submission files.                                                                                                                                                       | 04 §8                   |
| T-09 | D, S | Lawful basis for race and disability (s27 / s29 / s32); final wording of the POPIA notice and QCTO sharing consent (versions leave "draft"); what to offer a learner who refuses QCTO sharing.                                                   | 04 §4, §6, §11          |
| T-10 | D, S | Accept or reverse two owner decisions with privacy risk: LEISA file emailed as a plain attachment; full QCTO profile (incl. ID, race, disability) copied to Airtable. Recommended: encrypted file or portal; no special information in Airtable. | 04 §2, §4, §7           |
| T-11 | D, C | Key custody: two roles hold offline copies of `PII_ENCRYPTION_KEYS`, `PII_BLIND_INDEX_KEY` and `BACKUP_ENCRYPTION_KEY`; where; rotation schedule.                                                                                                | 02, 04 §5, 06 §1        |
| T-12 | C    | **Create a separate private Vercel Blob store for backups and set `BACKUP_BLOB_READ_WRITE_TOKEN` in Vercel.** Until this is done, every nightly backup is logged as failed (the job no longer writes to the evidence store).                     | 02, 06                  |
| T-13 | C    | Production database: run `yarn workspace db db:grants` as the owner, set the `lms_app` password, switch Vercel's `DATABASE_URL` to `lms_app`; keep the owner URL for migrations only.                                                            | 05 §2                   |
| T-14 | D, C | Name who checks backup status weekly and runs restore tests every 90 days; run the first restore test on a production backup.                                                                                                                    | 06 §2, §6               |
| T-15 | D, C | Agree load-test targets and whether to script an assessment-day scenario; run the test on staging; write the capacity statement.                                                                                                                 | 03                      |
| T-16 | D, C | Choose and connect a virus scanner for uploaded evidence (today files are labelled "not scanned").                                                                                                                                               | 05 §2                   |
| T-17 | D    | Breach contacts; confirm the Information Regulator's current notification form and channel.                                                                                                                                                      | 04 §12                  |
| T-18 | D, S | Who handles data-subject requests; response period; approve the procedure.                                                                                                                                                                       | 04 §13                  |
| T-19 | D    | Standing demo environment for evaluators; who issues evaluator accounts and the standard expiry.                                                                                                                                                 | 07 §1                   |
| T-20 | D    | Confirm against each real curriculum document that there is no Workplace module (4.4 not applicable).                                                                                                                                            | 07 §4                   |
| T-21 | D    | Confirm with the QCTO or quality partner what they accept as licence evidence for a self-built LMS (4.1.3).                                                                                                                                      | 02 §1, 07 §4            |
| T-22 | D    | Whether to commission an independent security review or penetration test before the first real cohort.                                                                                                                                           | this list               |
| T-23 | C    | Make the "LMS checks" GitHub workflow a required status check on `main` (repository settings).                                                                                                                                                   | 05 §2                   |
| T-24 | D    | Whether step-up should also require a recent passkey sign-in (deferred 2026-11-07).                                                                                                                                                              | 05 §1                   |
| T-25 | D    | Passkeys on shared lab computers: learners' own phones (QR flow), per-learner enrolment of hub machines, or staff-supervised sessions.                                                                                                           | `docs/lms/decisions.md` |
| T-26 | C    | Enforce MFA on every human account on Vercel, the database host, GitHub, Mux, Resend, Airtable and the password manager; keep the admin list (by role) outside this repository; confirm who can access the backup store.                         | 02 §3, 04 §9, 05 §1     |
| T-27 | D    | Whether Blob files (evidence, learner guides, LEISA files) need a second copy; they are not in the nightly database backup.                                                                                                                      | 04 §7, 06 §1            |
| T-28 | D    | Recovery time objective for a production restore.                                                                                                                                                                                                | 06 §2                   |

## Engineering follow-ups

Work that needs no human decision, found during this review and not yet done.

| ID   | Gap                                                                                                                                                                             | Risk                                                                                                                |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| E-01 | Some pages pass URL parameters (e.g. `?cohort=`, `?module=`) to database queries without a UUID check. Server actions and the scroll endpoint now validate; page loaders don't. | A malformed URL gives an error page (HTTP 500) instead of "not found". No data exposure: access checks still apply. |
| E-02 | No audit-log viewer screen. `roles.md` gives SDP admins and evaluators read access; today custodians query the database.                                                        | Evaluators can't browse the audit log themselves.                                                                   |
| E-03 | No bulk re-encryption job for PII key rotation (rows can be found by key version, but not yet re-sealed).                                                                       | Old keys must be kept until this exists.                                                                            |
| E-04 | The LEISA exporter and the Airtable sync are not built. The exporter must meet requirements L1–L8 in [04 §7](04-popia-pack.md#7-leisa-files-secure-handling-and-retention).     | None until built.                                                                                                   |
| E-05 | The CSP allows inline scripts (Next.js streams its page data inline). A nonce-based CSP would remove this, at the cost of fully dynamic rendering.                              | Mitigated: no raw HTML anywhere (tested), restricted Markdown.                                                      |

## Hardening changes on 2026-11-10 (summary)

For reviewers comparing with earlier versions. Details in [05](05-security-controls.md) and [06](06-backup-and-restore.md).

- Security headers: CSP, HSTS, COOP/CORP, wider Permissions-Policy, more no-store routes.
- Server-side input validation on every server action (`lib/server/input.ts`, guard test).
- File content (magic-byte) checks on evidence uploads.
- Least-privilege database role script and test (`packages/db/sql/least-privilege.sql`).
- Backups moved to a separate private store, with per-table row counts; tested restore script (`backup:restore`).
- CI for the LMS and database: typecheck, lint, drift, tests on real Postgres, dependency audit (also nightly), secret scan, env-file check.
- Dependencies: unused shared UI package removed from the LMS; `drizzle-orm` 0.45.4 (SQL-identifier advisory); scoped `zod` fix. LMS and database production dependencies now have no known advisories.
- Answer keys: static boundary test added to the existing runtime tests; inherited-key tokens rejected.
- Every page an external evaluator opens is audit-logged.
