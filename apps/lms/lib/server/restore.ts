import { sql } from "drizzle-orm";
import type { Database } from "db";
import type { BackupHeader } from "./backup";

/**
 * Load a decrypted nightly backup (JSON lines, see backup.ts) into an EMPTY,
 * freshly migrated scratch database, then compare row counts per table with
 * the backup header. Used by scripts/restore-backup.ts and by the restore
 * test in test/restore.test.ts.
 *
 * - The target must be at the same migration level as the source (run
 *   `yarn workspace db db:migrate` against it first).
 * - Triggers and foreign keys are switched off for the load with
 *   session_replication_role = replica (append-only and frozen-evidence
 *   triggers would otherwise refuse historic rows). That needs a superuser
 *   or a role granted that setting: use the scratch server's admin user,
 *   never the app's least-privilege user.
 * - It refuses a target that already has users, so it can't overwrite a live
 *   database by mistake. Reference rows inserted by migrations (QCTO codes,
 *   Stats SA areas) are replaced by the backup's copy.
 */

export type RestoreReport = {
  ok: boolean;
  format: string;
  createdAt: string;
  tables: { table: string; expected: number; restored: number }[];
  missingTables: string[];
};

export class RestoreError extends Error {}

const BATCH = 500;

export function parseBackup(text: string): {
  header: BackupHeader;
  rows: Map<string, unknown[]>;
} {
  const lines = text.split("\n").filter((l) => l.length > 0);
  const header = JSON.parse(lines[0] ?? "{}") as BackupHeader;
  if (header.format !== "lms-backup/1")
    throw new RestoreError("Not an LMS backup (unknown format).");
  const rows = new Map<string, unknown[]>(header.tables.map((t) => [t, []]));
  for (const line of lines.slice(1)) {
    const { table, row } = JSON.parse(line) as { table: string; row: unknown };
    const list = rows.get(table);
    if (!list)
      throw new RestoreError(
        `Row for a table missing from the header: ${table}`,
      );
    list.push(row);
  }
  return { header, rows };
}

export async function restoreBackupInto(
  db: Database,
  text: string,
): Promise<RestoreReport> {
  const { header, rows } = parseBackup(text);

  const existing = await db.execute<{ name: string }>(sql`
    select table_name as name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  `);
  const present = new Set(existing.map((r) => r.name));
  const missingTables = header.tables.filter((t) => !present.has(t));
  if (missingTables.length > 0) {
    throw new RestoreError(
      `The target is missing tables (${missingTables.join(", ")}). Run the migrations first.`,
    );
  }
  const [{ n } = { n: 0 }] = await db.execute<{ n: number }>(
    sql`select count(*)::int as n from users`,
  );
  if (Number(n) > 0)
    throw new RestoreError(
      "The target database already has users. Restore only into an empty scratch database.",
    );

  await db.transaction(async (tx) => {
    await tx.execute(sql`set local session_replication_role = replica`);
    for (const table of header.tables) {
      const id = sql.identifier(table);
      await tx.execute(sql`delete from ${id}`);
      const list = rows.get(table) ?? [];
      for (let i = 0; i < list.length; i += BATCH) {
        const batch = JSON.stringify(list.slice(i, i + BATCH));
        await tx.execute(
          sql`insert into ${id} overriding system value select * from json_populate_recordset(null::${id}, ${batch}::json)`,
        );
      }
    }
    // Move identity / serial sequences past the restored ids.
    const seqs = await tx.execute<{
      table_name: string;
      column_name: string;
    }>(sql`
      select table_name, column_name from information_schema.columns
      where table_schema = 'public' and (is_identity = 'YES' or column_default like 'nextval(%')
    `);
    for (const s of seqs) {
      if (!header.tables.includes(s.table_name)) continue;
      const t = sql.identifier(s.table_name);
      const c = sql.identifier(s.column_name);
      await tx.execute(sql`
        select setval(pg_get_serial_sequence(${`public.${s.table_name}`}, ${s.column_name}),
                      coalesce((select max(${c}) from ${t}), 0) + 1, false)
      `);
    }
  });

  const tables: RestoreReport["tables"] = [];
  for (const table of header.tables) {
    const [{ n: restored } = { n: 0 }] = await db.execute<{ n: number }>(
      sql`select count(*)::int as n from ${sql.identifier(table)}`,
    );
    const expected = header.counts?.[table] ?? rows.get(table)?.length ?? 0;
    tables.push({ table, expected, restored: Number(restored) });
  }
  return {
    ok: tables.every((t) => t.expected === t.restored),
    format: header.format,
    createdAt: header.createdAt,
    tables,
    missingTables,
  };
}
