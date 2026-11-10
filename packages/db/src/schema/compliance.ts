import { sql } from "drizzle-orm";
import { check, date, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, tenantId, tenantKey } from "./columns";
import { backupRunKind, backupRunStatus } from "./enums";
import { qualifications } from "./curriculum";
import { users } from "./people";

/**
 * Form 5 readiness evidence (design.md §14, 2026-11-09). Licences, contracts
 * and the 4.4 curriculum confirmation are references only (no files: this
 * repo is public and those documents stay with GRIT Hub). The learner guide
 * is the one uploaded file (private storage). Replacing a record archives
 * the old one, so the history stays.
 */

const length = (col: unknown, min: number, max: number) =>
  sql`char_length(${col}) BETWEEN ${sql.raw(String(min))} AND ${sql.raw(String(max))}`;

/** A manual document for one Form 5 item (e.g. "4.1.5" ISP contract). */
export const complianceDocuments = pgTable(
  "compliance_documents",
  {
    id: id(),
    tenantId: tenantId(),
    itemCode: text().notNull(),
    title: text().notNull(),
    issuer: text().notNull().default(""),
    // Where the document is kept, e.g. "SharePoint > Compliance > ISP".
    location: text().notNull(),
    validUntil: date(),
    notes: text().notNull().default(""),
    recordedBy: uuid()
      .notNull()
      .references(() => users.id),
    archivedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("compliance_documents_current_uq")
      .on(tenantKey(t.tenantId), t.itemCode)
      .where(sql`${t.archivedAt} IS NULL`),
    check("compliance_documents_item_code", sql`${t.itemCode} ~ '^4\\.[1-4]\\.[0-9]{1,2}$'`),
    check("compliance_documents_title_length", length(t.title, 1, 200)),
    check("compliance_documents_location_length", length(t.location, 1, 300)),
    check("compliance_documents_notes_length", length(t.notes, 0, 2000)),
  ],
);

/** The curriculum document reference confirming there is no workplace module (Form 5 4.4). */
export const curriculumReferences = pgTable(
  "curriculum_references",
  {
    id: id(),
    tenantId: tenantId(),
    qualificationId: uuid()
      .notNull()
      .references(() => qualifications.id),
    documentTitle: text().notNull(),
    curriculumCode: text().notNull(),
    version: text().notNull(),
    // Page or section that lists the modules.
    location: text().notNull(),
    note: text().notNull().default(""),
    recordedBy: uuid()
      .notNull()
      .references(() => users.id),
    archivedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("curriculum_references_current_uq")
      .on(tenantKey(t.tenantId), t.qualificationId)
      .where(sql`${t.archivedAt} IS NULL`),
    check("curriculum_references_title_length", length(t.documentTitle, 1, 200)),
    check("curriculum_references_code_length", length(t.curriculumCode, 1, 60)),
    check("curriculum_references_version_length", length(t.version, 1, 40)),
    check("curriculum_references_location_length", length(t.location, 1, 200)),
    check("curriculum_references_note_length", length(t.note, 0, 1000)),
  ],
);

/** The learner guide PDF per qualification (coverage evidence for 4.2.2 and 4.3.2). */
export const learnerGuides = pgTable(
  "learner_guides",
  {
    id: id(),
    tenantId: tenantId(),
    qualificationId: uuid()
      .notNull()
      .references(() => qualifications.id),
    title: text().notNull(),
    version: text().notNull(),
    issuedOn: date().notNull(),
    storagePathname: text().notNull(),
    sizeBytes: integer().notNull(),
    sha256: text().notNull(),
    uploadedBy: uuid()
      .notNull()
      .references(() => users.id),
    archivedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("learner_guides_current_uq")
      .on(tenantKey(t.tenantId), t.qualificationId)
      .where(sql`${t.archivedAt} IS NULL`),
    check("learner_guides_sha256_format", sql`${t.sha256} ~ '^[0-9a-f]{64}$'`),
    check("learner_guides_size", sql`${t.sizeBytes} > 0`),
    check("learner_guides_title_length", length(t.title, 1, 200)),
    check("learner_guides_version_length", length(t.version, 1, 40)),
  ],
);

/**
 * Backup and restore log (Form 5 4.1.6): nightly encrypted backups (cron),
 * pruning of old copies, and restore tests logged by an admin.
 */
export const backupRuns = pgTable(
  "backup_runs",
  {
    id: id(),
    tenantId: tenantId(),
    kind: backupRunKind().notNull(),
    status: backupRunStatus().notNull(),
    startedAt: timestamp({ withTimezone: true }).notNull(),
    finishedAt: timestamp({ withTimezone: true }),
    storagePathname: text(),
    sizeBytes: integer(),
    sha256: text(),
    tableCount: integer(),
    rowCount: integer(),
    notes: text().notNull().default(""),
    // Null for the automatic job; the admin who logged a restore test.
    recordedBy: uuid().references(() => users.id),
    // When this backup's file was deleted by pruning (keep the last 7).
    prunedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("backup_runs_kind_idx").on(t.kind, t.startedAt),
    check("backup_runs_sha256_format", sql`${t.sha256} IS NULL OR ${t.sha256} ~ '^[0-9a-f]{64}$'`),
    check(
      "backup_runs_ok_backup_has_file",
      sql`${t.kind} <> 'backup' OR ${t.status} <> 'ok' OR (${t.storagePathname} IS NOT NULL AND ${t.sha256} IS NOT NULL AND ${t.sizeBytes} IS NOT NULL)`,
    ),
    check("backup_runs_restore_test_by_admin", sql`${t.kind} <> 'restore_test' OR ${t.recordedBy} IS NOT NULL`),
    check("backup_runs_notes_length", length(t.notes, 0, 2000)),
  ],
);
