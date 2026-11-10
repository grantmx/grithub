// Restore an LMS backup into an EMPTY scratch database and check row counts
// (restore procedure: docs/lms/dossier/06-backup-and-restore.md).
//
// Usage:
//   RESTORE_DATABASE_URL=<scratch db admin URL> BACKUP_ENCRYPTION_KEY=<key> \
//     yarn workspace lms backup:restore <file.lmsbak | file.jsonl>
//
// Prints a per-table report (table names and counts only, no row data).
// Refuses the app's DATABASE_URL, production environments, and any target
// that already has users. Migrate the scratch database first.
import { readFileSync } from "node:fs";
import { createDb, readDbConfig } from "db";
import { decryptBackup, readBackupKey } from "@/lib/server/backup";
import { RestoreError, restoreBackupInto } from "@/lib/server/restore";

async function main() {
  const file = process.argv[2];
  const target = process.env.RESTORE_DATABASE_URL;
  if (!file || !target) {
    console.error(
      "Usage: RESTORE_DATABASE_URL=<scratch db> [BACKUP_ENCRYPTION_KEY=<key>] backup:restore <file>",
    );
    process.exit(1);
  }
  // Platform-set guards, not build inputs.
  /* eslint-disable turbo/no-undeclared-env-vars */
  const production =
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production";
  /* eslint-enable turbo/no-undeclared-env-vars */
  if (production) {
    console.error("Refusing to run in a production environment.");
    process.exit(1);
  }
  if (process.env.DATABASE_URL && process.env.DATABASE_URL === target) {
    console.error(
      "RESTORE_DATABASE_URL is the app's DATABASE_URL. Restore only into a scratch database.",
    );
    process.exit(1);
  }

  const raw = readFileSync(file);
  let text: string;
  if (raw.subarray(0, 6).toString() === "LMSBK1") {
    const key = readBackupKey();
    if (!key) {
      console.error(
        "This file is encrypted: set BACKUP_ENCRYPTION_KEY (base64, 32 bytes).",
      );
      process.exit(1);
    }
    text = decryptBackup(raw, key).toString("utf8");
  } else {
    text = raw.toString("utf8");
  }

  const { db, close } = createDb(
    readDbConfig(process.env, "RESTORE_DATABASE_URL"),
  );
  try {
    const report = await restoreBackupInto(db, text);
    console.log(`Backup created ${report.createdAt} (${report.format})`);
    for (const t of report.tables) {
      const flag = t.expected === t.restored ? "ok " : "MISMATCH";
      console.log(
        `${flag.padEnd(8)} ${t.table.padEnd(40)} expected ${t.expected}  restored ${t.restored}`,
      );
    }
    const rows = report.tables.reduce((n, t) => n + t.restored, 0);
    console.log(
      `\n${report.ok ? "RESTORE OK" : "RESTORE FAILED"}: ${report.tables.length} tables, ${rows} rows.`,
    );
    console.log(
      "Record the result in the restore-test log (Admin → Form 5 readiness → Backups).",
    );
    process.exitCode = report.ok ? 0 : 2;
  } catch (e) {
    console.error(
      e instanceof RestoreError
        ? e.message
        : `Restore failed: ${(e as Error).message}`,
    );
    process.exitCode = 1;
  } finally {
    await close();
  }
}

void main();
