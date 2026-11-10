import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { backupRuns, users } from "db";
import type { AccessContext, Requirement } from "@/lib/access";
import { writeAudit } from "./audit";
import { authorize } from "./auth";
import type { ServerCtx } from "./context";
import { sha256Hex } from "./crypto";
import { CommsError, claimJobRun } from "./comms";
import { evidenceStore } from "./evidenceStore";

/**
 * Nightly backups and the backup/restore log (design.md §14, 2026-11-09;
 * Form 5 4.1.6). Every table is exported as JSON lines, gzipped and
 * encrypted with AES-256-GCM under BACKUP_ENCRYPTION_KEY (kept apart from
 * the database), then stored privately. The last 7 copies are kept; older
 * files are deleted and the deletion logged. Restore tests are logged by an
 * SDP admin. The host's own backups still apply on top of this.
 */

export const KEEP_BACKUPS = 7;
const MAGIC = Buffer.from("LMSBK1");
const ADMIN: Requirement = { kind: "roles", anyOf: ["sdp_admin"], stepUp: true };
const VIEW: Requirement = { kind: "roles", anyOf: ["sdp_admin", "external_evaluator"], stepUp: false };

type Ctx = Pick<ServerCtx, "db" | "now" | "ipHash">;

/** BACKUP_ENCRYPTION_KEY: base64 of 32 random bytes. */
export function readBackupKey(env: NodeJS.ProcessEnv = process.env): Buffer | null {
  const raw = env.BACKUP_ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  return key.length === 32 ? key : null;
}

export function encryptBackup(plain: Uint8Array, key: Buffer): Uint8Array {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(MAGIC);
  const body = Buffer.concat([cipher.update(gzipSync(plain)), cipher.final()]);
  return new Uint8Array(Buffer.concat([MAGIC, iv, cipher.getAuthTag(), body]));
}

export function decryptBackup(bytes: Uint8Array, key: Buffer): Buffer {
  const b = Buffer.from(bytes);
  if (!b.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("Not an LMS backup file.");
  const iv = b.subarray(6, 18);
  const tag = b.subarray(18, 34);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(MAGIC);
  decipher.setAuthTag(tag);
  return gunzipSync(Buffer.concat([decipher.update(b.subarray(34)), decipher.final()]));
}

/** Every table as JSON lines: a header line, then one {"table","row"} line per row. */
async function dumpDatabase(ctx: Ctx): Promise<{ bytes: Uint8Array; tables: number; rows: number }> {
  const tables = await ctx.db.execute<{ name: string }>(sql`
    select table_name as name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  `);
  const lines: string[] = [JSON.stringify({ format: "lms-backup/1", createdAt: ctx.now().toISOString(), tables: tables.map((t) => t.name) })];
  let rows = 0;
  for (const t of tables) {
    const data = await ctx.db.execute<{ r: unknown }>(sql`select row_to_json(x) as r from ${sql.identifier(t.name)} x`);
    for (const d of data) {
      lines.push(JSON.stringify({ table: t.name, row: d.r }));
      rows++;
    }
  }
  return { bytes: new TextEncoder().encode(lines.join("\n") + "\n"), tables: tables.length, rows };
}

/** Nightly job (Vercel Cron, 02:00 SAST). Runs at most once per day. */
export async function runNightlyBackup(ctx: Ctx): Promise<{ ran: boolean; status?: "ok" | "failed"; pruned?: number }> {
  const now = ctx.now();
  const day = new Date(now.getTime() + 2 * 3_600_000).toISOString().slice(0, 10);
  if (!(await claimJobRun(ctx, "nightly-backup", day))) return { ran: false };
  const key = readBackupKey();
  const store = evidenceStore();
  const fail = async (notes: string) => {
    await ctx.db.insert(backupRuns).values({ kind: "backup", status: "failed", startedAt: now, finishedAt: ctx.now(), notes });
    return { ran: true, status: "failed" as const };
  };
  if (!key) return fail("BACKUP_ENCRYPTION_KEY is not set (or is not 32 bytes).");
  if (store.kind === "none") return fail("Private storage is not configured.");
  try {
    const dump = await dumpDatabase(ctx);
    const encrypted = encryptBackup(dump.bytes, key);
    const pathname = `backups/${day}-${randomBytes(6).toString("hex")}.lmsbak`;
    await store.put(pathname, encrypted, "application/octet-stream");
    await ctx.db.insert(backupRuns).values({
      kind: "backup",
      status: "ok",
      startedAt: now,
      finishedAt: ctx.now(),
      storagePathname: pathname,
      sizeBytes: encrypted.byteLength,
      sha256: sha256Hex(encrypted),
      tableCount: dump.tables,
      rowCount: dump.rows,
    });
  } catch (e) {
    return fail(`Backup failed: ${(e as Error).message}`.slice(0, 500));
  }
  const pruned = await pruneBackups(ctx);
  return { ran: true, status: "ok", pruned };
}

/** Delete backup files beyond the newest KEEP_BACKUPS; log the deletion. */
export async function pruneBackups(ctx: Ctx): Promise<number> {
  const live = await ctx.db
    .select({ id: backupRuns.id, pathname: backupRuns.storagePathname })
    .from(backupRuns)
    .where(and(eq(backupRuns.kind, "backup"), eq(backupRuns.status, "ok"), isNull(backupRuns.prunedAt)))
    .orderBy(desc(backupRuns.startedAt));
  const old = live.slice(KEEP_BACKUPS);
  if (old.length === 0) return 0;
  const store = evidenceStore();
  const started = ctx.now();
  for (const b of old) {
    if (b.pathname) await store.remove(b.pathname);
    await ctx.db.update(backupRuns).set({ prunedAt: ctx.now() }).where(eq(backupRuns.id, b.id));
  }
  await ctx.db.insert(backupRuns).values({
    kind: "prune",
    status: "ok",
    startedAt: started,
    finishedAt: ctx.now(),
    notes: `Deleted ${old.length} backup file${old.length === 1 ? "" : "s"} older than the newest ${KEEP_BACKUPS}.`,
  });
  return old.length;
}

/** An SDP admin logs a restore test (e.g. restored last night's backup to a scratch database). */
export async function logRestoreTest(
  ctx: Ctx,
  actor: AccessContext | null,
  input: { testedOn: string; result: string; notes: string },
): Promise<void> {
  const a = await authorize(ctx, actor, ADMIN, "backup.restoreTest");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.testedOn)) throw new CommsError("invalid", "Choose the date of the restore test.");
  const testedAt = new Date(`${input.testedOn}T12:00:00+02:00`);
  if (Number.isNaN(testedAt.getTime()) || testedAt > ctx.now()) throw new CommsError("invalid", "The test date can't be in the future.");
  if (input.result !== "ok" && input.result !== "failed") throw new CommsError("invalid", "Choose whether the restore worked.");
  const notes = input.notes.trim().slice(0, 2000);
  if (!notes) throw new CommsError("invalid", "Say what was restored and how you checked it.");
  const [row] = await ctx.db
    .insert(backupRuns)
    .values({ kind: "restore_test", status: input.result, startedAt: testedAt, finishedAt: testedAt, notes, recordedBy: a.userId })
    .returning({ id: backupRuns.id });
  await writeAudit(ctx, {
    action: "compliance.restore_test.logged",
    actorId: a.userId,
    entityType: "backup_run",
    entityId: row!.id,
    after: { result: input.result },
  });
}

export type BackupLogRow = {
  id: string;
  kind: "backup" | "restore_test" | "prune";
  status: "ok" | "failed";
  startedAt: Date;
  sizeBytes: number | null;
  sha256: string | null;
  tableCount: number | null;
  rowCount: number | null;
  notes: string;
  recordedBy: string | null;
  prunedAt: Date | null;
};

/** The log, newest first (no storage paths). */
export async function backupLogUnchecked(ctx: Pick<ServerCtx, "db">, limit = 60): Promise<BackupLogRow[]> {
  return ctx.db
    .select({
      id: backupRuns.id,
      kind: backupRuns.kind,
      status: backupRuns.status,
      startedAt: backupRuns.startedAt,
      sizeBytes: backupRuns.sizeBytes,
      sha256: backupRuns.sha256,
      tableCount: backupRuns.tableCount,
      rowCount: backupRuns.rowCount,
      notes: backupRuns.notes,
      recordedBy: users.displayName,
      prunedAt: backupRuns.prunedAt,
    })
    .from(backupRuns)
    .leftJoin(users, eq(users.id, backupRuns.recordedBy))
    .orderBy(desc(backupRuns.startedAt))
    .limit(limit);
}

export async function backupLog(ctx: Ctx, actor: AccessContext | null, limit = 60) {
  await authorize(ctx, actor, VIEW, "backup.log");
  return backupLogUnchecked(ctx, limit);
}

/** Latest successful backup and latest successful restore test (dashboard 4.1.6). */
export async function backupStatus(ctx: Pick<ServerCtx, "db">) {
  const latest = async (kind: "backup" | "restore_test") =>
    (
      await ctx.db
        .select({ at: backupRuns.startedAt })
        .from(backupRuns)
        .where(and(eq(backupRuns.kind, kind), eq(backupRuns.status, "ok")))
        .orderBy(desc(backupRuns.startedAt))
        .limit(1)
    )[0]?.at ?? null;
  const [lastFailure] = await ctx.db
    .select({ at: backupRuns.startedAt, notes: backupRuns.notes })
    .from(backupRuns)
    .where(and(eq(backupRuns.kind, "backup"), eq(backupRuns.status, "failed")))
    .orderBy(desc(backupRuns.startedAt))
    .limit(1);
  return { lastBackup: await latest("backup"), lastRestoreTest: await latest("restore_test"), lastFailure: lastFailure ?? null };
}
