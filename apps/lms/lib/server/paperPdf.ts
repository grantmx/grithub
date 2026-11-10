import { PDFDocument, type PDFFont, type PDFPage, rgb, StandardFonts } from "pdf-lib";
import { VERDICT_LABEL, verdictOf } from "@/lib/moderation";
import type { Replay } from "./marking";

/**
 * Server-generated PDF of one learner's paper in the exact served order,
 * with answers, keys, marks, register details and decisions (design-gate
 * decision 2026-11-08: generated on demand from the immutable attempt
 * records; each export's SHA-256 is audit-logged).
 *
 * Deterministic: no "now" timestamps or random ids, so the same records
 * always produce byte-identical files (the checksum is meaningful).
 */

export const A4: [number, number] = [595.28, 841.89];
export const MARGIN = 50;
const SIZE = 10;
const LEADING = 14;

/** Standard PDF fonts only encode WinAnsi; map common Unicode and replace the rest. */
export function winAnsi(text: string): string {
  return text
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”‟]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[   ]/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, "  ")
    .replace(/[^\n\x20-\x7E\xA1-\xFF]/g, "?");
}

const fmt = (d: Date | null | undefined) =>
  d ? d.toISOString().replace("T", " ").slice(0, 16) + " UTC" : "-";

export class Writer {
  page!: PDFPage;
  y = 0;
  pages: PDFPage[] = [];
  constructor(
    private doc: PDFDocument,
    private font: PDFFont,
    private bold: PDFFont,
  ) {
    this.newPage();
  }
  newPage() {
    this.page = this.doc.addPage(A4);
    this.pages.push(this.page);
    this.y = A4[1] - MARGIN;
  }
  ensure(h: number) {
    if (this.y - h < MARGIN + 20) this.newPage();
  }
  wrap(text: string, font: PDFFont, size: number, width: number): string[] {
    const lines: string[] = [];
    for (const para of winAnsi(text).split("\n")) {
      let line = "";
      for (const word of para.split(/ +/)) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) <= width) line = next;
        else {
          if (line) lines.push(line);
          // Break very long words.
          let w = word;
          while (font.widthOfTextAtSize(w, size) > width && w.length > 1) {
            let cut = w.length - 1;
            while (cut > 1 && font.widthOfTextAtSize(w.slice(0, cut), size) > width) cut--;
            lines.push(w.slice(0, cut));
            w = w.slice(cut);
          }
          line = w;
        }
      }
      lines.push(line);
    }
    return lines;
  }
  text(text: string, opts: { bold?: boolean; size?: number; indent?: number; color?: [number, number, number] } = {}) {
    const font = opts.bold ? this.bold : this.font;
    const size = opts.size ?? SIZE;
    const indent = opts.indent ?? 0;
    const lead = size * 1.4;
    for (const line of this.wrap(text, font, size, A4[0] - 2 * MARGIN - indent)) {
      this.ensure(lead);
      this.page.drawText(line, {
        x: MARGIN + indent,
        y: this.y - size,
        size,
        font,
        color: opts.color ? rgb(...opts.color) : rgb(0, 0, 0),
      });
      this.y -= lead;
    }
  }
  gap(h = LEADING / 2) {
    this.y -= h;
  }
  rule() {
    this.ensure(8);
    this.page.drawLine({
      start: { x: MARGIN, y: this.y - 2 },
      end: { x: A4[0] - MARGIN, y: this.y - 2 },
      thickness: 0.5,
      color: rgb(0.6, 0.6, 0.6),
    });
    this.y -= 8;
  }
}

/**
 * `withKeys: false` (evidence pack exported by an SDP admin, who may not see
 * answer keys): no KEY markers and no per-question or rubric marks.
 */
export async function buildPaperPdf(r: Replay, opts: { withKeys?: boolean } = {}): Promise<Uint8Array> {
  const withKeys = opts.withKeys ?? true;
  const doc = await PDFDocument.create({ updateMetadata: false });
  const fixed = r.attempt.submittedAt ?? r.attempt.startedAt;
  doc.setTitle(winAnsi(`${r.blueprint.title} - attempt ${r.attempt.attemptNo}`));
  doc.setSubject("Assessment paper record");
  doc.setCreator("LMS assessment record");
  doc.setProducer("pdf-lib");
  doc.setCreationDate(fixed);
  doc.setModificationDate(fixed);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new Writer(doc, font, bold);

  w.text(r.blueprint.title, { bold: true, size: 14 });
  w.text(`${r.module.code} ${r.module.title} · ${r.blueprint.kind}`.replace("·", "-"));
  w.gap();
  w.text(`Learner: ${r.learner.name}    Cohort: ${r.cohort.name}`);
  w.text(`Attempt ${r.attempt.attemptNo}    Started: ${fmt(r.attempt.startedAt)}    Submitted: ${fmt(r.attempt.submittedAt)}${r.attempt.autoSubmitted ? " (time limit)" : ""}`);
  if (r.attempt.extraMinutes) w.text(`Extra time granted: ${r.attempt.extraMinutes} min`);
  if (r.sitting) {
    w.text(`Assessment day: ${r.sitting.heldOn ?? "-"} at ${r.sitting.venue ?? "-"}`);
    w.text(
      `Attendance: ${r.sitting.attendance ?? "not recorded"}    ID checked: ${r.sitting.idVerified ? "yes" : "no"}    Register signed off: ${
        r.sitting.signedOffBy ? `${r.sitting.signedOffBy}, ${fmt(r.sitting.signedOffAt)}` : "not yet"
      }`,
    );
  }
  w.text(
    `Score: ${r.score.raw}/${r.score.max} (${r.score.percent}%)${r.score.allMarked ? "" : " - marking incomplete"}    Pass mark: ${r.blueprint.passMarkPercent}%`,
  );
  w.text(withKeys ? "Served order exactly as the learner saw it. [x] = learner's answer, KEY = correct answer." : "Served order exactly as the learner saw it. [x] = learner's answer. Answer keys and marks are left out of this copy.", {
    size: 8,
    color: [0.35, 0.35, 0.35],
  });
  w.rule();

  for (const it of r.items) {
    w.ensure(LEADING * 3);
    const marks = !withKeys ? `-/${it.maxMarks}` : it.marksAwarded === null ? `-/${it.maxMarks}` : `${it.marksAwarded}/${it.maxMarks}`;
    w.text(`Question ${it.position}  (v${it.versionNo}, ${it.type.replace("_", " ")})  Marks: ${marks}${it.flagged ? "  [flagged by learner]" : ""}`, { bold: true });
    w.text(it.stem, { indent: 8 });
    if (it.type === "short_answer") {
      w.text("Learner's answer:", { indent: 8, bold: true, size: 9 });
      w.text(it.responseText?.trim() ? it.responseText : "(no answer)", { indent: 16 });
      for (const c of it.criteria) {
        w.text(`${c.label}: ${withKeys ? (c.marks ?? "-") : "-"}/${c.maxMarks}`, { indent: 16, size: 9 });
      }
      if (it.markerNote) w.text(`Assessor note: ${it.markerNote}`, { indent: 16, size: 9 });
    } else {
      it.options.forEach((o, i) => {
        const letter = String.fromCharCode(65 + i);
        w.text(`${o.chosen ? "[x]" : "[  ]"} ${letter}. ${o.label}${withKeys && o.correct ? "   KEY" : ""}`, { indent: 16 });
      });
      if (!it.options.some((o) => o.chosen)) w.text("(no answer)", { indent: 16, size: 9 });
    }
    w.gap();
  }

  w.rule();
  w.text("Decisions", { bold: true });
  if (r.decisions.length === 0) w.text("No decision recorded yet.");
  for (const d of r.decisions) {
    w.text(
      `${fmt(d.decidedAt)} - ${d.outcome === "competent" ? "Competent" : "Not yet competent"} by ${d.assessorName}${d.superseded ? " (superseded)" : ""}${
        d.releasedAt ? `, released ${fmt(d.releasedAt)}` : ""
      }`,
    );
    w.text(`Feedback: ${d.feedback}`, { indent: 12, size: 9 });
    for (const m of d.moderation) {
      w.text(`Moderation ${fmt(m.moderatedAt)} by ${m.moderatorName}: ${VERDICT_LABEL[verdictOf(m)]} - ${m.findings}`, { indent: 12, size: 9 });
      if (m.requiredActions) w.text(`Required actions: ${m.requiredActions}`, { indent: 12, size: 9 });
    }
    if (d.appeal) {
      w.text(`Appeal ${fmt(d.appeal.submittedAt)}: ${d.appeal.status}${d.appeal.outcomeNotes ? ` - ${d.appeal.outcomeNotes}` : ""}`, { indent: 12, size: 9 });
    }
  }

  const total = w.pages.length;
  w.pages.forEach((p, i) => {
    p.drawText(winAnsi(`Attempt ${r.attempt.id} · page ${i + 1} of ${total}`), {
      x: MARGIN,
      y: MARGIN - 20,
      size: 7,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  });
  return doc.save({ useObjectStreams: false });
}
