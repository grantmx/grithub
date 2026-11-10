# 06 Backup and restore

**What this is:** how GRIT Hub Learning's data is backed up, where, how often, and the step-by-step procedure to restore it, with the log template for restore tests (Form 5 item 4.1.6). Written for the technical custodian, GRIT Hub management and evaluators.

## 1. What is backed up

| Data                                                         | Backed up by                                                                   | Frequency              | Kept                 | Where                                                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------ | ---------------------- | -------------------- | ------------------------------------------------------------------------------------------------- |
| **Database** (every table)                                   | The LMS's own nightly job (`/api/cron/nightly-backup`, `lib/server/backup.ts`) | Daily, 02:00 SAST      | Newest 7 files       | **Separate** private Vercel Blob store (`BACKUP_BLOB_READ_WRITE_TOKEN`), never the evidence store |
| Database                                                     | The database host's own backups / point-in-time recovery                       | **TODO(T-04)**         | **TODO(T-04)**       | Database host                                                                                     |
| Practical evidence files, learner guides, LEISA files (Blob) | **Not covered by the LMS backup.** Vercel Blob's own durability only.          | n/a                    | n/a                  | Evidence store                                                                                    |
| Source code and migrations                                   | Git (GitHub)                                                                   | Every change           | Full history         | GitHub                                                                                            |
| Encryption keys                                              | Offline copies held by custodians                                              | On creation / rotation | Current and previous | **TODO(T-11)**                                                                                    |

**TODO(T-27)**: decide whether Blob files (evidence, learner guides, LEISA files) need a second copy, for example a periodic copy to another provider or region. Until then, losing the evidence store loses learner evidence files (their checksums and metadata are in the database backup).

## 2. How the nightly backup works

1. Vercel Cron calls the job at 00:00 UTC (02:00 SAST) with the `CRON_SECRET`. It runs at most once per South African calendar day.
2. It exports every table as JSON lines: a header (format, time, table list, **row count per table**) and one line per row. Encrypted QCTO fields stay encrypted inside the export.
3. The file is gzipped and encrypted with AES-256-GCM under `BACKUP_ENCRYPTION_KEY`, then written to the **separate backup store**. The job refuses to run if that store isn't configured or if its token points at the evidence store, and logs the run as failed.
4. The run is logged in `backup_runs` (time, size, SHA-256, table and row counts). Files older than the newest 7 are deleted and the deletion is logged.
5. The Form 5 readiness dashboard (item 4.1.6) shows **Ready** only when the last successful backup is within 7 days and the last successful restore test is within 90 days. It also shows the last failure.

Nobody downloads backups through the LMS. Custodians access the backup store in the Vercel dashboard.

**Recovery point:** at most about 24 hours of data with the LMS backup alone; shorter if the host's point-in-time recovery is enabled (**TODO(T-04)**). **Recovery time objective:** **TODO(T-28)** (agree a target, e.g. same working day).

**Monitoring:** **TODO(T-14)**: name the role that checks the dashboard weekly and acts on a failed backup.

## 3. Restore procedure

Use this for a **restore test** (into a scratch database, at least every 90 days) and, with the extra steps in §4, for a **real recovery**.

You need: the backup file, `BACKUP_ENCRYPTION_KEY` (from the offline key store), access to a Postgres server where you can create a database, and a checkout of the repository at the commit that is deployed in production (so migrations match the backup).

1. **Pick the file.** In the Vercel dashboard, open the backup Blob store and download the most recent `backups/<date>-<random>.lmsbak`. Note its date. Compare its SHA-256 (`shasum -a 256 <file>`) with the run on the dashboard's backup log.
2. **Create a scratch database** on a non-production server, for example a local Docker Postgres (`yarn workspace db db:up`) or a temporary database from the host. Never use the production database.
3. **Migrate it** to the same level as production:
   `DATABASE_URL=<scratch admin URL> yarn workspace db db:migrate`
4. **Restore and check row counts:**
   `RESTORE_DATABASE_URL=<scratch admin URL> BACKUP_ENCRYPTION_KEY=<key> yarn workspace lms backup:restore <file.lmsbak>`
   - The script decrypts the file in memory, refuses the app's `DATABASE_URL`, production environments and any database that already has users, loads every table with triggers paused for the load only, resets id sequences, and prints **expected and restored row counts for every table**. It ends with `RESTORE OK` or `RESTORE FAILED` (exit code 2) and prints no row data.
   - Use the scratch server's admin user: pausing triggers needs it. Never use `lms_app`.
5. **Spot-check** (optional): compare one or two totals in the scratch database with the live dashboard (for example the number of active learners on the backup date). Don't open individual learner records: the check needs counts only.
6. **Record the test** in the LMS (Admin → Form 5 readiness → Backups → Log a restore test): date, result, and a note (which file, row totals, any mismatch). Also fill in the log template below and keep it with GRIT Hub's evidence.
7. **Clean up:** drop the scratch database and delete the downloaded and any decrypted files.

Both the restore code and this procedure are tested on every change: `apps/lms/test/restore.test.ts` backs up a DEMO database, restores the encrypted file into a second freshly migrated database, checks every table's row count, checks id sequences and integrity triggers work afterwards, and checks that a non-empty target is refused.

## 4. Real recovery (production)

Only on the system owner's decision (**TODO(T-01)**), and log it as an incident.

1. Put the LMS in maintenance (for example, remove the production domain from the Vercel project or deploy the holding page) so no new writes arrive.
2. Prefer the database host's point-in-time recovery if available (**TODO(T-04)**). Otherwise:
3. Create a **new, empty** production database. Run `db:migrate` as the owner role, then the least-privilege grants: `DATABASE_URL=<owner URL> yarn workspace db db:grants`, and set the `lms_app` password interactively.
4. Run steps 1, 4 and 6 of §3 against the new database (as its owner/admin user).
5. Point Vercel's `DATABASE_URL` at the new database as `lms_app` and redeploy.
6. Check the dashboard, sign in as an SDP admin, check a cohort, then lift maintenance.
7. Tell users what was lost (anything after the backup time) if anything was, and record the incident ([04 §12](04-popia-pack.md#12-security-compromise-breach-procedure) if personal data was affected).

Encryption keys (`PII_ENCRYPTION_KEYS`, `PII_BLIND_INDEX_KEY`) must be the same as when the data was written, or encrypted fields can't be read.

## 5. Restore-test log template

Copy for every restore test.

```markdown
# LMS restore test

| Field                                   | Value                       |
| --------------------------------------- | --------------------------- |
| Date (SAST)                             |                             |
| Performed by (role)                     |                             |
| Witness (role, optional)                |                             |
| Backup file date                        |                             |
| Backup SHA-256 matches dashboard log    | Yes / No                    |
| Production commit (migration level)     |                             |
| Scratch database (where; never prod)    |                             |
| Tables restored                         |                             |
| Rows restored / expected                |                             |
| Result printed                          | RESTORE OK / RESTORE FAILED |
| Mismatches (table: expected → restored) |                             |
| Time taken (download to result)         |                             |
| Logged on the Form 5 dashboard          | Yes / No                    |
| Scratch database dropped, files deleted | Yes / No                    |
| Issues and follow-up                    |                             |

Signed: **********\_\_********** (role) Date: ****\_\_****
```

## 6. Responsibilities

| Task                               | Who            |
| ---------------------------------- | -------------- |
| Configure the backup store and key | **TODO(T-12)** |
| Watch backup status weekly         | **TODO(T-14)** |
| Restore test every 90 days         | **TODO(T-14)** |
| Hold offline key copies            | **TODO(T-11)** |
| Decide on a real recovery          | **TODO(T-01)** |
