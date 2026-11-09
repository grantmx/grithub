import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { AccessContext } from "@/lib/access";
import { SAMPLE_STATE_LABEL, VERDICT_LABEL } from "@/lib/moderation";
import { writeAudit } from "./audit";
import type { ServerCtx } from "./context";
import { sha256Hex } from "./crypto";
import { type ModerationReport, moderationReport } from "./moderation";
import { MARGIN, winAnsi, Writer } from "./paperPdf";
import { RATE_LIMITS, enforceRateLimit } from "./ratelimit";

/**
 * Moderation report per batch (design.md §14, 2026-11-08; Form 5 evidence
 * "sample moderation report"): rate, sample and, for each sampled learner,
 * every decision version with the verdict, comments, required actions and
 * their status. PDF for the POE file and CSV with the same rows. Each export
 * and its checksum are audit-logged. Deterministic: no "now" in the output.
 */

const fmt = (d: Date | null | undefined) => (d ? d.toISOString().replace("T", " ").slice(0, 16) + " UTC" : "");
const outcome = (o: "competent" | "not_yet_competent") => (o === "competent" ? "Competent" : "Not yet competent");

const CSV_HEADER = [
  "Learner",
  "Sample reason",
  "Version",
  "Current",
  "Assessor decision",
  "Assessor",
  "Decided at",
  "Score",
  "Verdict",
  "Moderator",
  "Moderated at",
  "Comments",
  "Required actions",
  "Actions done at",
  "Actions done note",
  "Released at",
];

/** Neutralise spreadsheet formulas and quote every field (RFC 4180). */
function cell(v: string | number | null | undefined): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function moderationReportCsv(r: ModerationReport): string {
  const lines = [CSV_HEADER.map(cell).join(",")];
  for (const row of r.sampled) {
    row.versions.forEach((v, i) => {
      const m = v.moderation;
      const current = v.id === row.current.id;
      lines.push(
        [
          row.learnerName,
          row.sample?.reason === "reassessment" ? "Appeal reassessment" : "Moderator",
          i + 1,
          current ? "yes" : "no",
          outcome(v.outcome),
          v.assessorName,
          fmt(v.decidedAt),
          current ? row.score : "",
          m ? VERDICT_LABEL[m.verdict] : "Not moderated",
          m?.moderatorName,
          fmt(m?.moderatedAt),
          m?.findings,
          m?.requiredActions,
          fmt(m?.completion?.doneAt),
          m?.completion?.note,
          fmt(v.releasedAt),
        ]
          .map(cell)
          .join(","),
      );
    });
  }
  return lines.join("\r\n") + "\r\n";
}

export async function moderationReportPdf(r: ModerationReport): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  const fixed = r.closedAt ?? new Date(0);
  doc.setTitle(winAnsi(`Moderation report - ${r.title} - ${r.cohortName}`));
  doc.setSubject("Moderation report");
  doc.setCreator("LMS moderation record");
  doc.setProducer("pdf-lib");
  doc.setCreationDate(fixed);
  doc.setModificationDate(fixed);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new Writer(doc, font, bold);
  const s = r.summary;

  w.text("Moderation report", { bold: true, size: 14 });
  w.text(`${r.title} (${r.kind}) - ${r.cohortName}`);
  w.text(
    r.status === "closed"
      ? `Closed ${fmt(r.closedAt)}${r.closedBy ? ` by ${r.closedBy}` : ""}; all ${s.decided} results released.`
      : "Open: moderation in progress; results not released.",
  );
  w.gap();
  w.text(`Sampling rate: ${s.rate}% (set by the SDP admin for the cohort)`);
  w.text(`Decisions in batch: ${s.decided} - minimum sample: ${s.minimum} - sampled: ${s.sampled} - agreed: ${s.agreed}`);
  if (s.blockers.length && r.status === "open") w.text(`Outstanding: ${s.blockers.join(" ")}`, { size: 9 });
  w.rule();

  for (const row of r.sampled) {
    w.ensure(60);
    w.text(`${row.learnerName}${row.sample?.reason === "reassessment" ? " (appeal reassessment)" : ""}`, { bold: true });
    const state = SAMPLE_STATE_LABEL[row.state].replace(/^[✓•!] /, "");
    w.text(`Status: ${state}${row.score ? ` - score ${row.score}` : ""}`, { size: 9 });
    row.versions.forEach((v, i) => {
      const label = v.id === row.current.id ? " (current)" : " (superseded)";
      w.text(`Decision ${i + 1}${label}: ${outcome(v.outcome)} by ${v.assessorName}, ${fmt(v.decidedAt)}`, { indent: 12, size: 9 });
      w.text(`Assessor feedback: ${v.feedback}`, { indent: 24, size: 9 });
      const m = v.moderation;
      if (!m) {
        w.text("Not moderated.", { indent: 24, size: 9 });
        return;
      }
      w.text(`Moderation: ${VERDICT_LABEL[m.verdict]} by ${m.moderatorName}, ${fmt(m.moderatedAt)}`, { indent: 24, size: 9, bold: true });
      w.text(`Comments: ${m.findings}`, { indent: 24, size: 9 });
      if (m.requiredActions) w.text(`Required actions: ${m.requiredActions}`, { indent: 24, size: 9 });
      if (m.completion) w.text(`Actions done ${fmt(m.completion.doneAt)}: ${m.completion.note}`, { indent: 24, size: 9 });
      else if (m.requiredActions) w.text("Actions not done yet.", { indent: 24, size: 9 });
    });
    w.gap();
  }
  if (r.sampled.length === 0) w.text("No learners have been sampled yet.");

  const total = w.pages.length;
  w.pages.forEach((p, i) => {
    p.drawText(winAnsi(`Moderation batch ${r.batchId} - page ${i + 1} of ${total}`), {
      x: MARGIN,
      y: MARGIN - 20,
      size: 7,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  });
  return doc.save({ useObjectStreams: false });
}

/** Build the report in one format; the export and its checksum are audited. */
export async function exportModerationReport(
  ctx: ServerCtx,
  actor: AccessContext | null,
  batchId: string,
  format: "pdf" | "csv",
): Promise<{ bytes: Uint8Array; sha256: string; filename: string; contentType: string }> {
  const r = await moderationReport(ctx, actor, batchId);
  await enforceRateLimit(ctx, RATE_LIMITS.paperExport, r.actorId);
  const bytes = format === "pdf" ? await moderationReportPdf(r) : new TextEncoder().encode("﻿" + moderationReportCsv(r));
  const sha256 = sha256Hex(bytes);
  await writeAudit(ctx, {
    action: "assessment.moderation.report_exported",
    actorId: r.actorId,
    entityType: "moderation_batch",
    entityId: batchId,
    after: { format, sha256, bytes: bytes.byteLength, sampled: r.sampled.length },
  });
  const safe = `${r.title}-${r.cohortName}`.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "batch";
  return {
    bytes,
    sha256,
    filename: `moderation-report-${safe}.${format}`,
    contentType: format === "pdf" ? "application/pdf" : "text/csv; charset=utf-8",
  };
}
