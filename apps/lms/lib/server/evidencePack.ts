import { and, asc, desc, eq, inArray, isNotNull, or } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  assessmentAttempts,
  assessmentBlueprints,
  assessmentDays,
  assessmentDecisions,
  assessmentSchedules,
  cohorts,
  enrolments,
  moderationBatches,
  practicalBriefs,
  users,
} from "db";
import type { AccessContext, Requirement } from "@/lib/access";
import { SECTION_TITLES, STATUS_LABEL } from "@/lib/form5";
import { writeAudit } from "./audit";
import { authorize } from "./auth";
import { backupLogUnchecked } from "./backup";
import type { ServerCtx } from "./context";
import { sha256Hex } from "./crypto";
import { CommsError, enforceLimit } from "./comms";
import { buildCommsLog, commsLogPdf } from "./commsLog";
import { currentDocuments } from "./complianceDocs";
import { KEY_ROLES, replayUnchecked } from "./marking";
import { moderationReportUnchecked } from "./moderation";
import { moderationReportPdf } from "./moderationExport";
import { MARGIN, Writer, buildPaperPdf, winAnsi } from "./paperPdf";
import { RATE_LIMITS } from "./ratelimit";
import { readiness } from "./readiness";

/**
 * One-click Form 5 evidence pack (design.md §14, 2026-11-09): one combined
 * PDF with a contents page: dashboard snapshot, assessment schedule, a
 * sample randomised paper, a sample moderation report, a communication log
 * sample and the backup and restore log. Learners are pseudonymised
 * ("Learner A", "Learner B", consistent within the pack); staff names stay.
 * Answer keys appear only when an external evaluator exports it (SDP admins
 * never see keys). The export and its SHA-256 are audit-logged.
 */

const VIEW: Requirement = { kind: "roles", anyOf: ["sdp_admin", "external_evaluator"], stepUp: false };
type Ctx = ServerCtx;

const day = (d: Date) => new Date(d.getTime() + 2 * 3_600_000).toISOString().slice(0, 10);
const fmt = (d: Date | null | undefined) => (d ? d.toISOString().replace("T", " ").slice(0, 16) + " UTC" : "-");

export type PackOptions = { qualificationId: string; cohortId?: string; from?: string; to?: string };

export type PackSamples = {
  cohort: { id: string; name: string } | null;
  batchId: string | null;
  attemptId: string | null;
  from: string;
  to: string;
  cohorts: { id: string; name: string }[];
};

/** Default samples: the latest cohort with a closed moderation batch, a submitted summative paper, the last 30 days of its communication. */
export async function packSamples(ctx: Ctx, actor: AccessContext | null, opts: PackOptions): Promise<PackSamples> {
  await authorize(ctx, actor, VIEW, "evidencePack.samples");
  const cs = await ctx.db
    .select({ id: cohorts.id, name: cohorts.name, startsOn: cohorts.startsOn })
    .from(cohorts)
    .where(eq(cohorts.qualificationId, opts.qualificationId))
    .orderBy(desc(cohorts.startsOn));
  const today = day(ctx.now());
  const monthAgo = day(new Date(ctx.now().getTime() - 29 * 86_400_000));
  const range = { from: opts.from && /^\d{4}-\d{2}-\d{2}$/.test(opts.from) ? opts.from : monthAgo, to: opts.to && /^\d{4}-\d{2}-\d{2}$/.test(opts.to) ? opts.to : today };
  if (cs.length === 0) return { cohort: null, batchId: null, attemptId: null, ...range, cohorts: [] };
  if (opts.cohortId && !cs.some((c) => c.id === opts.cohortId)) throw new CommsError("invalid", "That cohort isn't part of this qualification.");
  const closed = await ctx.db
    .select({ id: moderationBatches.id, cohortId: moderationBatches.cohortId, blueprintId: moderationBatches.blueprintId })
    .from(moderationBatches)
    .where(and(inArray(moderationBatches.cohortId, opts.cohortId ? [opts.cohortId] : cs.map((c) => c.id)), eq(moderationBatches.status, "closed")))
    .orderBy(desc(moderationBatches.closedAt));
  const batch = closed.find((b) => b.blueprintId) ?? closed[0] ?? null;
  const cohortId = opts.cohortId ?? batch?.cohortId ?? cs[0]!.id;
  const cohort = cs.find((c) => c.id === cohortId)!;
  // A submitted summative paper: from the batch if it is a written assessment, else any in the cohort.
  let attemptId: string | null = null;
  if (batch?.blueprintId && batch.cohortId === cohortId) {
    const [d] = await ctx.db
      .select({ attemptId: assessmentDecisions.attemptId })
      .from(assessmentDecisions)
      .where(and(eq(assessmentDecisions.batchId, batch.id), isNotNull(assessmentDecisions.attemptId)))
      .orderBy(asc(assessmentDecisions.decidedAt))
      .limit(1);
    attemptId = d?.attemptId ?? null;
  }
  if (!attemptId) {
    const [x] = await ctx.db
      .select({ id: assessmentAttempts.id })
      .from(assessmentAttempts)
      .innerJoin(enrolments, eq(enrolments.id, assessmentAttempts.enrolmentId))
      .innerJoin(assessmentBlueprints, eq(assessmentBlueprints.id, assessmentAttempts.blueprintId))
      .where(
        and(
          eq(enrolments.cohortId, cohortId),
          eq(assessmentBlueprints.kind, "summative"),
          or(eq(assessmentAttempts.status, "submitted"), eq(assessmentAttempts.status, "graded")),
        ),
      )
      .orderBy(desc(assessmentAttempts.submittedAt))
      .limit(1);
    attemptId = x?.id ?? null;
  }
  return {
    cohort: { id: cohort.id, name: cohort.name },
    batchId: batch && batch.cohortId === cohortId ? batch.id : null,
    attemptId,
    ...range,
    cohorts: cs.map((c) => ({ id: c.id, name: c.name })),
  };
}

/** "Learner A", "Learner B", … per learner name (consistent within one pack). */
export function pseudonymiser(learnerNames: string[]) {
  const map = new Map<string, string>();
  const label = (i: number) => {
    let s = "";
    let k = i;
    do {
      s = String.fromCharCode(65 + (k % 26)) + s;
      k = Math.floor(k / 26) - 1;
    } while (k >= 0);
    return `Learner ${s}`;
  };
  [...new Set(learnerNames)].sort().forEach((name, i) => map.set(name, label(i)));
  return (name: string) => map.get(name) ?? name;
}

async function newDoc() {
  const doc = await PDFDocument.create({ updateMetadata: false });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  return { doc, w: new Writer(doc, font, bold) };
}

async function placeholder(title: string, reason: string): Promise<Uint8Array> {
  const { doc, w } = await newDoc();
  w.text(title, { bold: true, size: 14 });
  w.gap();
  w.text(`No sample available: ${reason}`);
  return doc.save({ useObjectStreams: false });
}

export async function exportEvidencePack(
  ctx: Ctx,
  actor: AccessContext | null,
  opts: PackOptions,
): Promise<{ bytes: Uint8Array; sha256: string; filename: string }> {
  const a = await authorize(ctx, actor, VIEW, "evidencePack.export");
  await enforceLimit(ctx, RATE_LIMITS.commsExport, a.userId, "Too many exports. Please wait a few minutes.");
  const r = await readiness(ctx, a, opts.qualificationId);
  const samples = await packSamples(ctx, a, opts);
  const withKeys = KEY_ROLES.some((role) => a.roles.has(role)) && !a.roles.has("sdp_admin");

  // Learner names across the qualification's cohorts, for pseudonymisation.
  const cohortIds = samples.cohorts.map((c) => c.id);
  const learnerNames = cohortIds.length
    ? (
        await ctx.db
          .select({ name: users.displayName })
          .from(enrolments)
          .innerJoin(users, eq(users.id, enrolments.userId))
          .where(inArray(enrolments.cohortId, cohortIds))
      ).map((x) => x.name)
    : [];
  const pseudo = pseudonymiser(learnerNames);

  const parts: { title: string; bytes: Uint8Array }[] = [];

  // 1. Dashboard snapshot
  {
    const { doc, w } = await newDoc();
    const docs = await currentDocuments(ctx);
    w.text("Form 5 readiness snapshot", { bold: true, size: 14 });
    w.text(`${r.qualification.title} (${r.qualification.code}, NQF ${r.qualification.nqfLevel})`);
    w.text(`Generated ${fmt(r.generatedAt)}. Ready ${r.counts.ready} - Needs attention ${r.counts.attention} - Manual document ${r.counts.manual} - Not applicable ${r.counts.na}`, { size: 9 });
    w.rule();
    for (const section of ["4.1", "4.2", "4.3", "4.4"] as const) {
      w.ensure(40);
      w.text(`${section} ${SECTION_TITLES[section]}`, { bold: true });
      for (const it of r.items.filter((i) => i.section === section)) {
        w.ensure(30);
        const s = STATUS_LABEL[it.status];
        w.text(`${it.code}  ${it.title}  [${s.icon} ${s.word}]`, { size: 9, bold: true, indent: 8 });
        for (const f of it.facts) w.text(f, { size: 8, indent: 20 });
        for (const p of it.problems) w.text(`! ${p}`, { size: 8, indent: 20 });
        if (it.document) w.text(`Document: ${it.document.title}${it.document.issuer ? `, ${it.document.issuer}` : ""}; kept at ${it.document.location}${it.document.validUntil ? `; valid until ${it.document.validUntil}` : ""}`, { size: 8, indent: 20 });
      }
      w.gap();
    }
    w.rule();
    w.text("Still needs a manual document", { bold: true });
    if (r.manualStillNeeded.length === 0) w.text("None: every manual document has a reference recorded.", { size: 9 });
    for (const m of r.manualStillNeeded) w.text(`${m.code}  ${m.label}`, { size: 9, indent: 8 });
    w.gap();
    w.text("Document references", { bold: true });
    if (docs.size === 0) w.text("None recorded.", { size: 9 });
    for (const d of docs.values()) w.text(`${d.itemCode}  ${d.title} - recorded by ${d.recordedBy}, ${day(d.createdAt)}`, { size: 9, indent: 8 });
    if (r.guide) w.text(`Learner guide: "${r.guide.title}" v${r.guide.version}, issued ${r.guide.issuedOn}, ${r.guide.sizeBytes} bytes, SHA-256 ${r.guide.sha256}`, { size: 9 });
    parts.push({ title: "Form 5 readiness snapshot", bytes: await doc.save({ useObjectStreams: false }) });
  }

  // 2. Assessment schedule
  {
    const { doc, w } = await newDoc();
    const rows = cohortIds.length
      ? await ctx.db
          .select({
            cohort: cohorts.name,
            blueprint: assessmentBlueprints.title,
            kind: assessmentBlueprints.kind,
            brief: practicalBriefs.title,
            opensAt: assessmentSchedules.opensAt,
            closesAt: assessmentSchedules.closesAt,
            heldOn: assessmentDays.heldOn,
            venue: assessmentDays.venue,
          })
          .from(assessmentSchedules)
          .innerJoin(cohorts, eq(cohorts.id, assessmentSchedules.cohortId))
          .leftJoin(assessmentBlueprints, eq(assessmentBlueprints.id, assessmentSchedules.blueprintId))
          .leftJoin(practicalBriefs, eq(practicalBriefs.id, assessmentSchedules.briefId))
          .leftJoin(assessmentDays, eq(assessmentDays.id, assessmentSchedules.assessmentDayId))
          .where(inArray(assessmentSchedules.cohortId, cohortIds))
          .orderBy(asc(cohorts.name), asc(assessmentSchedules.opensAt))
      : [];
    w.text("Assessment schedule", { bold: true, size: 14 });
    w.text(r.qualification.title);
    w.rule();
    if (rows.length === 0) w.text("Nothing scheduled yet.");
    for (const s of rows) {
      w.ensure(30);
      w.text(`${s.cohort} - ${s.blueprint ? `${s.blueprint} (${s.kind})` : `${s.brief} (practical)`}`, { bold: true, size: 9 });
      w.text(`Opens ${fmt(s.opensAt)} - closes ${fmt(s.closesAt)}${s.heldOn ? ` - assessment day ${s.heldOn} at ${s.venue}` : ""}`, { size: 8, indent: 12 });
    }
    parts.push({ title: "Assessment schedule", bytes: await doc.save({ useObjectStreams: false }) });
  }

  // 3. Sample randomised paper
  if (samples.attemptId) {
    const replay = await replayUnchecked(ctx, samples.attemptId);
    const bytes = await buildPaperPdf({ ...replay, learner: { ...replay.learner, name: pseudo(replay.learner.name) } }, { withKeys });
    parts.push({ title: `Sample randomised paper${withKeys ? "" : " (without answer keys)"}`, bytes });
  } else parts.push({ title: "Sample randomised paper", bytes: await placeholder("Sample randomised paper", "no submitted summative paper yet.") });

  // 4. Sample moderation report
  if (samples.batchId) {
    const rep = await moderationReportUnchecked(ctx, samples.batchId, a.userId);
    const bytes = await moderationReportPdf({ ...rep, sampled: rep.sampled.map((s) => ({ ...s, learnerName: pseudo(s.learnerName) })) });
    parts.push({ title: "Sample moderation report", bytes });
  } else parts.push({ title: "Sample moderation report", bytes: await placeholder("Sample moderation report", "no closed moderation batch yet.") });

  // 5. Communication log sample
  if (samples.cohort) {
    const from = new Date(`${samples.from}T00:00:00+02:00`);
    const to = new Date(new Date(`${samples.to}T00:00:00+02:00`).getTime() + 86_400_000);
    const log = await buildCommsLog(ctx, a, samples.cohort.id, from, to);
    const names = new Set(learnerNames);
    const bytes = await commsLogPdf({
      ...log,
      entries: log.entries.map((e) => ({
        ...e,
        author: names.has(e.author) ? pseudo(e.author) : e.author,
        recipient: names.has(e.recipient) ? pseudo(e.recipient) : e.recipient,
      })),
    });
    parts.push({ title: `Communication log sample (${samples.cohort.name}, ${samples.from} to ${samples.to})`, bytes });
  } else parts.push({ title: "Communication log sample", bytes: await placeholder("Communication log sample", "no cohort yet.") });

  // 6. Backup and restore log
  {
    const { doc, w } = await newDoc();
    const rows = await backupLogUnchecked(ctx, 120);
    w.text("Backup and restore log", { bold: true, size: 14 });
    w.text("Nightly encrypted backups (AES-256-GCM) to private storage; the last 7 are kept. Restore tests are logged by an SDP admin.", { size: 9 });
    w.rule();
    if (rows.length === 0) w.text("No backups or restore tests logged yet.");
    for (const b of rows) {
      w.ensure(26);
      const kind = b.kind === "backup" ? "Backup" : b.kind === "restore_test" ? "Restore test" : "Old backups deleted";
      w.text(`${fmt(b.startedAt)} - ${kind} - ${b.status === "ok" ? "OK" : "FAILED"}${b.recordedBy ? ` - ${b.recordedBy}` : ""}`, { bold: true, size: 9 });
      const detail = [
        b.sizeBytes ? `${b.sizeBytes} bytes` : "",
        b.tableCount ? `${b.tableCount} tables, ${b.rowCount} rows` : "",
        b.sha256 ? `SHA-256 ${b.sha256}` : "",
        b.prunedAt ? `file deleted ${day(b.prunedAt)}` : "",
        b.notes,
      ].filter(Boolean);
      if (detail.length) w.text(detail.join(" - "), { size: 8, indent: 12 });
    }
    parts.push({ title: "Backup and restore log", bytes: await doc.save({ useObjectStreams: false }) });
  }

  // Assemble: cover with contents, then every part.
  const loaded = await Promise.all(parts.map(async (p) => ({ ...p, doc: await PDFDocument.load(p.bytes) })));
  const pack = await PDFDocument.create({ updateMetadata: false });
  pack.setTitle(winAnsi(`Form 5 evidence pack - ${r.qualification.title}`));
  pack.setSubject("QCTO Form 5 section 4 evidence pack");
  pack.setCreator("LMS evidence pack");
  pack.setProducer("pdf-lib");
  pack.setCreationDate(ctx.now());
  pack.setModificationDate(ctx.now());
  const font = await pack.embedFont(StandardFonts.Helvetica);
  const bold = await pack.embedFont(StandardFonts.HelveticaBold);
  const cover = new Writer(pack, font, bold);
  cover.text("QCTO Form 5, section 4: evidence pack", { bold: true, size: 16 });
  cover.text(`${r.qualification.title} (${r.qualification.code})`);
  cover.text(`Generated ${fmt(ctx.now())}. Learners are shown as "Learner A", "Learner B" and so on; staff names are real.`, { size: 9 });
  cover.text(withKeys ? "This copy includes answer keys (external evaluator export)." : "Answer keys and per-question marks are left out of this copy.", { size: 9 });
  cover.rule();
  cover.text("Contents", { bold: true });
  let page = 2;
  for (const p of loaded) {
    cover.text(`${p.title} ....... page ${page}`, { size: 10, indent: 8 });
    page += p.doc.getPageCount();
  }
  for (const p of loaded) {
    const copied = await pack.copyPages(p.doc, p.doc.getPageIndices());
    for (const c of copied) pack.addPage(c);
  }
  const total = pack.getPageCount();
  pack.getPages().forEach((pg, i) => {
    pg.drawText(winAnsi(`Form 5 evidence pack - page ${i + 1} of ${total}`), { x: MARGIN, y: MARGIN - 32, size: 7, font, color: rgb(0.4, 0.4, 0.4) });
  });
  const bytes = await pack.save({ useObjectStreams: false });
  const sha256 = sha256Hex(bytes);
  await writeAudit(ctx, {
    action: "compliance.pack.exported",
    actorId: a.userId,
    entityType: "qualification",
    entityId: opts.qualificationId,
    after: { sha256, bytes: bytes.byteLength, pages: total, withKeys, cohortId: samples.cohort?.id ?? null, from: samples.from, to: samples.to },
  });
  const safe = r.qualification.title.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "qualification";
  return { bytes, sha256, filename: `form5-evidence-pack-${safe}-${day(ctx.now())}.pdf` };
}
