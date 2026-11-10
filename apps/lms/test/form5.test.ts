import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { backupRuns, cohorts, learnerQctoProfiles, providerAccreditations, users } from "db";
import { seedDemo } from "db/seed";
import type { AccessContext, StaffRole } from "@/lib/access";
import { backupItemStatus, documentStatus } from "@/lib/form5";
import { addWorkingDays, monthsBefore } from "@/lib/workingTime";
import { AccessDeniedError } from "@/lib/server/auth";
import { KEEP_BACKUPS, backupLog, decryptBackup, encryptBackup, logRestoreTest, readBackupKey, runNightlyBackup } from "@/lib/server/backup";
import { confirmGuideUpload, guidePrefix, guideUploadPolicy, guideUrl, recordDocument } from "@/lib/server/complianceDocs";
import { evidenceStore, putTestObject } from "@/lib/server/evidenceStore";
import { exportEvidencePack, packSamples, pseudonymiser } from "@/lib/server/evidencePack";
import { qctoPanel } from "@/lib/server/qctoPanel";
import { readiness } from "@/lib/server/readiness";
import { seedEvidenceDemo } from "@/scripts/demoEvidence";
import { auditActions, createTestDb, makeCtx, type TestDb } from "./helpers";

let t: TestDb;
let qualificationId: string;
const ids: Record<string, string> = {};

/** The DEMO people, signed in with setup done (as after the real flow). */
function actor(key: string, roles: StaffRole[]): AccessContext {
  return { userId: ids[key]!, sessionId: `test-${key}`, status: "active", setupComplete: true, roles: new Set(roles), activePasskeys: 1 };
}
const admin = () => actor("admin", ["sdp_admin"]);
const evaluator = () => actor("evaluator", ["external_evaluator"]);
const facilitator = () => actor("facilitator", ["facilitator"]);

beforeAll(async () => {
  process.env.EVIDENCE_STORE = "memory";
  process.env.BACKUP_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  t = await createTestDb();
  ({ qualificationId } = await seedDemo(t.db));
  for (const u of await t.db.select({ id: users.id, email: users.email }).from(users)) {
    const m = u.email.match(/^demo\.(\w+)@/);
    if (m) ids[m[1]!] = u.id;
  }
  const r = await seedEvidenceDemo(t.db);
  expect(r.created).toBe(true);
});
afterAll(async () => {
  delete process.env.EVIDENCE_STORE;
  delete process.env.BACKUP_ENCRYPTION_KEY;
  await t?.teardown();
});

describe("DEMO walkthrough: every Form 5 item, as the external evaluator", () => {
  it("shows live status for all 25 items, with only manual documents and the learner guide outstanding", async () => {
    const r = await readiness(makeCtx(t.db), evaluator(), qualificationId);
    expect(r.items).toHaveLength(25);
    expect(r.canEdit).toBe(false);
    const status = Object.fromEntries(r.items.map((i) => [i.code, i.status]));
    const problems = Object.fromEntries(r.items.map((i) => [i.code, i.problems]));
    for (const code of ["4.1.1", "4.1.3", "4.1.4", "4.1.5", "4.2.9"]) expect(status[code], code).toBe("manual");
    // Only the learner guide is missing among the live checks.
    for (const code of ["4.2.2", "4.3.2"]) expect(problems[code]).toEqual(["Upload the learner guide for this qualification"]);
    for (const code of ["4.1.2", "4.1.6", "4.2.1", "4.2.3", "4.2.4", "4.2.5", "4.2.6", "4.2.7", "4.2.8", "4.2.10", "4.2.11", "4.3.1", "4.3.3", "4.3.4", "4.3.5"])
      expect({ code, status: status[code], problems: problems[code] }).toEqual({ code, status: "ready", problems: [] });
    for (const code of ["4.4.1", "4.4.2", "4.4.3"]) {
      expect(status[code]).toBe("na");
      expect(r.items.find((i) => i.code === code)!.facts[0]).toBe("Not applicable: no workplace module");
    }
    expect(r.manualStillNeeded.map((m) => m.code)).toEqual(["4.1.1", "4.1.3", "4.1.4", "4.1.5", "4.2.9"]);
    // Evaluators only get links they can open.
    expect(r.items.flatMap((i) => i.links).some((l) => l.adminOnly)).toBe(false);
  });

  it("is for SDP admins and evaluators only", async () => {
    await expect(readiness(makeCtx(t.db), facilitator(), qualificationId)).rejects.toBeInstanceOf(AccessDeniedError);
  });
});

describe("references and the learner guide", () => {
  it("records manual document references; expiry within 30 days needs attention", async () => {
    const ctx = makeCtx(t.db);
    await expect(
      recordDocument(ctx, evaluator(), { itemCode: "4.1.5", title: "x", issuer: "", location: "y", validUntil: "", notes: "" }),
    ).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(
      recordDocument(ctx, admin(), { itemCode: "4.2.3", title: "x", issuer: "", location: "y", validUntil: "", notes: "" }),
    ).rejects.toMatchObject({ code: "invalid" });
    const soon = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    await recordDocument(ctx, admin(), { itemCode: "4.1.5", title: "ISP contract (fake)", issuer: "ISP (fake)", location: "Compliance drive > ISP", validUntil: soon, notes: "" });
    let r = await readiness(ctx, admin(), qualificationId);
    expect(r.items.find((i) => i.code === "4.1.5")).toMatchObject({ status: "attention", problems: [`Expires soon (${soon})`] });
    await recordDocument(ctx, admin(), { itemCode: "4.1.5", title: "ISP contract renewed (fake)", issuer: "ISP (fake)", location: "Compliance drive > ISP", validUntil: "2030-12-31", notes: "" });
    r = await readiness(ctx, admin(), qualificationId);
    expect(r.items.find((i) => i.code === "4.1.5")!.status).toBe("ready");
    expect(r.items.find((i) => i.code === "4.1.5")!.document!.title).toBe("ISP contract renewed (fake)");
    expect(r.manualStillNeeded.map((m) => m.code)).not.toContain("4.1.5");
  });

  it("uploads the learner guide as a verified PDF and opens it through an audited link", async () => {
    const ctx = makeCtx(t.db);
    const policy = await guideUploadPolicy(ctx, admin(), qualificationId, `${guidePrefix(qualificationId)}guide.pdf`);
    expect(policy.allowedContentTypes).toEqual(["application/pdf"]);
    await expect(guideUploadPolicy(ctx, admin(), qualificationId, "evidence/x/guide.pdf")).rejects.toMatchObject({ code: "invalid" });
    const notPdf = `${guidePrefix(qualificationId)}fake.pdf`;
    putTestObject(notPdf, new TextEncoder().encode("hello"), "application/pdf");
    await expect(
      confirmGuideUpload(ctx, admin(), { qualificationId, pathname: notPdf, title: "Guide", version: "1", issuedOn: "2026-11-01" }),
    ).rejects.toMatchObject({ code: "invalid" });
    expect(await evidenceStore().head(notPdf)).toBeNull();
    const pdf = await PDFDocument.create();
    pdf.addPage();
    const path = `${guidePrefix(qualificationId)}learner-guide.pdf`;
    putTestObject(path, await pdf.save(), "application/pdf");
    await confirmGuideUpload(ctx, admin(), { qualificationId, pathname: path, title: "Learner guide (fake)", version: "2.1", issuedOn: "2026-11-01" });
    const r = await readiness(ctx, evaluator(), qualificationId);
    expect(r.items.find((i) => i.code === "4.2.2")!.status).toBe("ready");
    expect(r.items.find((i) => i.code === "4.2.2")!.links[0]!.href).toBe(`/staff/evidence/form5/guide/${qualificationId}`);
    expect(await guideUrl(ctx, evaluator(), qualificationId)).toContain("memory.invalid");
    expect(await auditActions(t.db, ids.evaluator)).toContain("compliance.guide.viewed");
    await expect(guideUrl(ctx, facilitator(), qualificationId)).rejects.toBeInstanceOf(AccessDeniedError);
  });
});

describe("backups", () => {
  it("encrypts and decrypts a backup; a wrong key fails", () => {
    const key = randomBytes(32);
    const enc = encryptBackup(new TextEncoder().encode("hello"), key);
    expect(decryptBackup(enc, key).toString()).toBe("hello");
    expect(() => decryptBackup(enc, randomBytes(32))).toThrow();
  });

  it("the DEMO walkthrough ran a real backup: every table, decryptable, logged once per day", async () => {
    const [run] = await t.db.select().from(backupRuns).where(eq(backupRuns.kind, "backup"));
    expect(run!.status).toBe("ok");
    const bytes = await evidenceStore().read(run!.storagePathname!);
    const lines = decryptBackup(bytes!, readBackupKey()!).toString().trim().split("\n");
    const header = JSON.parse(lines[0]!) as { format: string; tables: string[] };
    expect(header.format).toBe("lms-backup/1");
    expect(header.tables).toContain("users");
    expect(lines.length - 1).toBe(run!.rowCount);
    expect((await runNightlyBackup(makeCtx(t.db))).ran).toBe(false);
  });

  it(`keeps the newest ${KEEP_BACKUPS} backups and logs the deletion`, async () => {
    for (let d = 1; d <= KEEP_BACKUPS + 1; d++) {
      await runNightlyBackup(makeCtx(t.db, { now: () => new Date(Date.now() + d * 86_400_000) }));
    }
    const runs = await t.db.select().from(backupRuns).where(eq(backupRuns.kind, "backup"));
    const live = runs.filter((r) => !r.prunedAt);
    expect(live).toHaveLength(KEEP_BACKUPS);
    for (const r of runs.filter((r) => r.prunedAt)) expect(await evidenceStore().head(r.storagePathname!)).toBeNull();
    const log = await backupLog(makeCtx(t.db), evaluator());
    expect(log.some((l) => l.kind === "prune")).toBe(true);
    expect(JSON.stringify(log)).not.toContain("backups/");
  });

  it("logs a failed run when the key is missing, and restore tests need an admin", async () => {
    const saved = process.env.BACKUP_ENCRYPTION_KEY;
    delete process.env.BACKUP_ENCRYPTION_KEY;
    const r = await runNightlyBackup(makeCtx(t.db, { now: () => new Date(Date.now() + 40 * 86_400_000) }));
    process.env.BACKUP_ENCRYPTION_KEY = saved;
    expect(r).toMatchObject({ ran: true, status: "failed" });
    await expect(logRestoreTest(makeCtx(t.db), evaluator(), { testedOn: "2026-11-01", result: "ok", notes: "x" })).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(logRestoreTest(makeCtx(t.db), admin(), { testedOn: "2099-01-01", result: "ok", notes: "x" })).rejects.toMatchObject({ code: "invalid" });
  });

  it("4.1.6 rules: backup within 7 days and restore test within 90", () => {
    const now = new Date("2026-11-09T12:00:00Z");
    const days = (n: number) => new Date(now.getTime() - n * 86_400_000);
    expect(backupItemStatus(days(3), days(30), now).status).toBe("ready");
    expect(backupItemStatus(days(8), days(30), now).problems[0]).toMatch(/8 days ago/);
    expect(backupItemStatus(days(1), days(91), now).problems[0]).toMatch(/91 days ago/);
    expect(backupItemStatus(null, null, now).problems).toEqual(["No successful backup yet", "No restore test logged yet"]);
    expect(documentStatus(null, now).status).toBe("manual");
    expect(documentStatus({ validUntil: "2026-11-01" }, now)).toEqual({ status: "attention", note: "Expired 2026-11-01" });
  });
});

describe("evidence pack", () => {
  it("picks the latest closed moderation batch, its paper and the last 30 days of communication", async () => {
    const s = await packSamples(makeCtx(t.db), evaluator(), { qualificationId });
    expect(s.batchId).not.toBeNull();
    expect(s.attemptId).not.toBeNull();
    expect(s.cohort?.name).toBe("DEMO Cohort A (fake)");
  });

  it("exports one combined PDF; keys only for the evaluator; audited with its checksum", async () => {
    const ev = await exportEvidencePack(makeCtx(t.db), evaluator(), { qualificationId });
    const doc = await PDFDocument.load(ev.bytes);
    expect(doc.getPageCount()).toBeGreaterThan(6);
    expect(ev.filename).toMatch(/^form5-evidence-pack-.*\.pdf$/);
    const ad = await exportEvidencePack(makeCtx(t.db), admin(), { qualificationId });
    expect(ad.sha256).not.toBe(ev.sha256);
    expect(await auditActions(t.db, ids.evaluator)).toContain("compliance.pack.exported");
    await expect(exportEvidencePack(makeCtx(t.db), facilitator(), { qualificationId })).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it("pseudonymises learners consistently", () => {
    const p = pseudonymiser(["Zed Learner", "Amy Learner", "Zed Learner"]);
    expect(p("Amy Learner")).toBe("Learner A");
    expect(p("Zed Learner")).toBe("Learner B");
    expect(p("Demo Facilitator")).toBe("Demo Facilitator");
  });
});

describe("QCTO submission panel", () => {
  it("lists incomplete and invalid profiles, unsent enrolments, EISA readiness and accreditation warnings", async () => {
    const ctx = makeCtx(t.db);
    await expect(qctoPanel(ctx, evaluator())).rejects.toBeInstanceOf(AccessDeniedError);
    // learner1: a confirmed but empty profile → validation errors; others: no profile.
    await t.db.insert(learnerQctoProfiles).values({ userId: ids.learner1!, confirmedAt: new Date() }).onConflictDoNothing();
    const [demo] = await t.db.select().from(cohorts).where(eq(cohorts.name, "DEMO Cohort A (fake)"));
    // EISA in 3 months + 20 days → readiness due in about 20 days.
    const eisa = new Date(Date.now() + 2 * 3_600_000);
    eisa.setUTCMonth(eisa.getUTCMonth() + 3);
    eisa.setUTCDate(eisa.getUTCDate() + 20);
    await t.db.update(cohorts).set({ eisaOn: eisa.toISOString().slice(0, 10) }).where(eq(cohorts.id, demo!.id));
    const ends = new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10);
    await t.db.insert(providerAccreditations).values({ legalName: "Test SDP (fake)", accreditationNumber: "ACC-FAKE-1", startsOn: "2024-01-01", endsOn: ends });

    const p = await qctoPanel(ctx, admin());
    expect(p.incomplete.map((l) => l.userId)).toEqual(expect.arrayContaining([ids.learner2, ids.learner3]));
    const invalid = p.invalid.find((l) => l.userId === ids.learner1);
    expect(invalid?.fields.length).toBeGreaterThan(0);
    expect(JSON.stringify(invalid)).not.toMatch(/\d{13}/); // field names, never values
    const due = p.enrolmentDue.find((e) => e.cohortId === demo!.id)!;
    expect(due.dueOn).toBe(addWorkingDays(demo!.startsOn, 21));
    expect(p.readinessDue.map((r) => r.cohortId)).toContain(demo!.id);
    expect(p.warnings.some((w) => w.level === "soon" && w.text.includes("ACC-FAKE-1"))).toBe(true);
    expect(p.warnings.some((w) => w.level === "overrun" && w.text.includes("DEMO Cohort A"))).toBe(true);
    expect(p.lastBatch).toBeNull();
  });

  it("counts working days and months for the deadlines", () => {
    // Fri 13 Nov 2026 + 1 working day = Mon 16 Nov; across the 16 Dec holiday.
    expect(addWorkingDays("2026-11-13", 1)).toBe("2026-11-16");
    expect(addWorkingDays("2026-12-15", 1)).toBe("2026-12-17");
    expect(addWorkingDays("2026-11-02", 21)).toBe("2026-12-01");
    expect(monthsBefore("2027-05-15", 3)).toBe("2027-02-15");
    expect(monthsBefore("2027-05-31", 3)).toBe("2027-02-28");
  });
});
