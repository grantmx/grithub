# SOP-DAT-003: LMS Data Backup and Protection

| Field | Detail |
| --- | --- |
| **SOP code** | SOP-DAT-003 |
| **Department** | Data Protection and Information Security |
| **Process owner** | [TBC: role, for example the technical custodian of the LMS] |
| **Approved by** | [TBC: per the Delegation of Authority] |
| **Version** | 0.1 (DRAFT - owner to review) |
| **Review cycle** | Annually, after any restore failure or incident, or when the hosting changes |
| **Related policy** | [POPIA Policy](/policies/popia-policy) |
| **QCTO Form 5** | Row [4.1.6](https://github.com/grantmx/grithub/blob/main/docs/lms/compliance/form5-mapping.md#41-documented-process-implementation-management-and-administration-of-online-delivery) (how LMS data is stored, backed up and protected; where; how often) |

> [!IMPORTANT]
>
> **DRAFT - owner to review.** Every item marked [TBC] must be completed by the process owner before the SOP is approved. The technical restore steps are in the [LMS backup and restore procedure](https://github.com/grantmx/grithub/blob/main/docs/lms/dossier/06-backup-and-restore.md).

## 1. Purpose and scope

This SOP explains how learner and assessment data in the LMS is protected, backed up and restored, and how often each step happens. It covers the LMS database, uploaded files, encryption keys and the people who can reach them.

## 2. Roles and responsibilities

| Role | Responsibility |
| --- | --- |
| **Technical custodian** | Keeps backups running, runs restore tests, manages hosting access and keys. [TBC: role] |
| **Second key holder** | Holds the second offline copy of the encryption keys. [TBC: role] |
| **SDP admin** (LMS role) | Records restore tests on the Form 5 readiness dashboard. |
| **Information Officer** | Approves this SOP; leads any incident ([SOP-DAT-001](/sops/data-protection/sop-dat-001-personal-information-incidents-and-requests)). |
| **External evaluator** (LMS role) | May view the backup and restore log during a visit (read-only). |

## 3. Step-by-step operating procedure

### Part A: How data is protected (standing controls)

1. **Access:** every person has their own account and only the roles they need. Administrators, assessors and moderators must sign in with a passkey. Every sensitive action, export and file view is recorded in an audit log that can't be changed or deleted.
2. **Encryption in transit:** all connections use HTTPS, and the database connection is encrypted.
3. **Sensitive learner data:** identity numbers, birth dates, contact details, race and disability are encrypted by the LMS before they are stored, so a copy of the database alone doesn't reveal them.
4. **Files:** practical evidence and learner guides are in private storage and open only through links that expire after five minutes, issued after a permission check.
5. **Database account:** the LMS connects with an account that can read and write records only. It can't change the database structure or alter the audit log and consent records.
6. **Secrets:** passwords, tokens and keys are kept only in the hosting provider's settings and an offline key store, never in documents, email or chat.

### Part B: Nightly backup (automatic)

1. **Every night at 02:00 (South African time),** the LMS exports the whole database, encrypts it, and saves it to a **separate** private storage area used only for backups. The newest seven backups are kept; older ones are deleted and the deletion is logged.
2. **Where:** [TBC: hosting region of the database and the backup storage]
3. The database host's own backups also apply. [TBC: frequency and point-in-time recovery, once the host is chosen]

> [!WARNING]
>
> The nightly backup covers the **database only**. Uploaded evidence files, learner guides and QCTO submission files are in file storage and are not in this backup. [TBC: decide whether files need a second copy]

### Part C: Checking backups (weekly)

1. **Every week,** the technical custodian opens the Form 5 readiness dashboard (row 4.1.6). It shows the last successful backup, the last restore test and any failure. [TBC: confirm weekly]
2. **If the last backup failed or is older than a day,** fix the cause the same working day and record what happened.

### Part D: Restore test (at least every 90 days)

1. **Restore the latest backup into a separate, empty test database,** never the live one, following the [technical procedure](https://github.com/grantmx/grithub/blob/main/docs/lms/dossier/06-backup-and-restore.md). The restore tool compares the number of records in every table with the backup and reports OK or FAILED.
2. **Record the test** on the dashboard (date, result, what was checked) and fill in the restore-test log. The dashboard shows row 4.1.6 as Ready only if the last backup is within 7 days and the last restore test within 90 days.
3. **Delete the test database and any downloaded files** straight after.

### Part E: Keys

1. **Two people each hold an offline copy** of the encryption keys, in [TBC: location, for example a password manager vault with multi-factor sign-in]. Without the keys, encrypted data and backups can't be read.
2. **Change keys** when a key holder leaves or a key may be exposed. [TBC: rotation schedule]

### Part F: Real recovery

1. **Only the system owner decides** to restore the live LMS from backup. [TBC: role] Treat it as an incident: record it, and if personal information may have been lost or exposed, follow [SOP-DAT-001](/sops/data-protection/sop-dat-001-personal-information-incidents-and-requests).

## 4. Required forms, records and evidence

| Record | Kept by | Retention |
| --- | --- | --- |
| Backup log (time, size, fingerprint, record counts, deletions) | LMS | Live system |
| Restore-test log entries | LMS dashboard and the signed restore-test log | [TBC] |
| Key holder list (roles only) and key location | [TBC] | Current |
| Hosting access list | Technical custodian | Current |

## 5. Quality checks and approval points

- Weekly: backup status checked. [TBC]
- Every 90 days: a restore test passed and is logged.
- Quarterly: hosting access list reviewed and leavers removed. [TBC]

## 6. Exceptions and escalation

| Situation | What to do |
| --- | --- |
| Backups fail two nights in a row | Technical custodian escalates to the process owner and fixes the cause. |
| A restore test fails | Record it, find the cause, and repeat the test within [TBC] working days. |
| A key is lost | Escalate at once. Losing a key loses the data it protects. |
| A key, backup or account may be exposed | Follow [SOP-DAT-001](/sops/data-protection/sop-dat-001-personal-information-incidents-and-requests). |

## 7. Related policies and regulatory requirements

- [POPIA Policy](/policies/popia-policy) (security safeguards)
- [SOP-DAT-001 Personal Information Incidents and Data Subject Requests](/sops/data-protection/sop-dat-001-personal-information-incidents-and-requests)
- [LMS security controls](https://github.com/grantmx/grithub/blob/main/docs/lms/dossier/05-security-controls.md) and [backup and restore procedure](https://github.com/grantmx/grithub/blob/main/docs/lms/dossier/06-backup-and-restore.md)

## 8. Document control and revision history

| Version | Date | Author | Summary of change |
| --- | --- | --- | --- |
| 0.1 | 2026-11-10 | LMS project team | Initial draft (DRAFT - owner to review) |
