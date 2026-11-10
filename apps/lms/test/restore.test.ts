import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { auditLog, backupRuns, consentRecords } from "db";
import { seedDemo } from "db/seed";
import { decryptBackup, readBackupKey } from "@/lib/server/backup";
import { writeAudit } from "@/lib/server/audit";
import { backupStore } from "@/lib/server/evidenceStore";
import {
  RestoreError,
  parseBackup,
  restoreBackupInto,
} from "@/lib/server/restore";
import { seedEvidenceDemo } from "@/scripts/demoEvidence";
import { createTestDb, makeCtx, type TestDb } from "./helpers";

/**
 * The documented restore procedure, run for real: back up a DEMO database,
 * restore the encrypted file into a second, freshly migrated database, and
 * check every table's row count (docs/lms/dossier/06-backup-and-restore.md).
 */

let source: TestDb;
let target: TestDb;
let plain: string;

beforeAll(async () => {
  process.env.EVIDENCE_STORE = "memory";
  process.env.BACKUP_STORE = "memory";
  process.env.BACKUP_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  source = await createTestDb();
  target = await createTestDb();
  await seedDemo(source.db);
  await seedEvidenceDemo(source.db);
  // seedEvidenceDemo runs the nightly backup (key and backup store are set above).
  const [r] = await source.db
    .select()
    .from(backupRuns)
    .where(eq(backupRuns.kind, "backup"));
  expect(r!.status).toBe("ok");
  const bytes = await backupStore().store.read(r!.storagePathname!);
  plain = decryptBackup(bytes!, readBackupKey()!).toString("utf8");
}, 120_000);

afterAll(async () => {
  delete process.env.EVIDENCE_STORE;
  delete process.env.BACKUP_STORE;
  delete process.env.BACKUP_ENCRYPTION_KEY;
  await source?.teardown();
  await target?.teardown();
});

describe("restore procedure", () => {
  it("restores every table with matching row counts", async () => {
    const report = await restoreBackupInto(target.db, plain);
    expect(report.missingTables).toEqual([]);
    const bad = report.tables.filter((t) => t.expected !== t.restored);
    expect(bad).toEqual([]);
    expect(report.ok).toBe(true);
    const users = report.tables.find((t) => t.table === "users");
    expect(users!.restored).toBeGreaterThan(0);
  });

  it("leaves a working database: sequences moved on, integrity triggers active again", async () => {
    const before = await target.db
      .select({ n: sql<number>`max(${auditLog.id})` })
      .from(auditLog);
    await writeAudit(makeCtx(target.db), {
      action: "compliance.restore_test.logged",
      entityType: "backup_run",
    });
    const after = await target.db
      .select({ n: sql<number>`max(${auditLog.id})` })
      .from(auditLog);
    expect(Number(after[0]!.n)).toBeGreaterThan(Number(before[0]!.n ?? 0));
    // Append-only consent records are still protected after the load.
    const [consent] = await target.db
      .select({ id: consentRecords.id })
      .from(consentRecords)
      .limit(1);
    if (consent) {
      await expect(
        target.db
          .delete(consentRecords)
          .where(eq(consentRecords.id, consent.id)),
      ).rejects.toThrow();
    }
  });

  it("refuses a target that already has users, and files that aren't backups", async () => {
    await expect(restoreBackupInto(target.db, plain)).rejects.toBeInstanceOf(
      RestoreError,
    );
    expect(() => parseBackup('{"format":"something-else"}\n')).toThrow(
      RestoreError,
    );
  });
});
