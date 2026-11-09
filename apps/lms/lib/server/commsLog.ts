import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  announcements,
  cohorts,
  conversations,
  directMessages,
  discussionPosts,
  discussionThreads,
  enrolments,
  liveSessions,
  messageRevisions,
  modules,
  sectionNotes,
  sections,
  sessionAttendance,
  supportTickets,
  ticketReplies,
  users,
} from "db";
import type { AccessContext, Requirement } from "@/lib/access";
import { writeAudit } from "./audit";
import { authorize } from "./auth";
import type { ServerCtx } from "./context";
import { sha256Hex } from "./crypto";
import { CommsError, enforceLimit } from "./comms";
import { MARGIN, Writer, winAnsi } from "./paperPdf";
import { RATE_LIMITS } from "./ratelimit";

/**
 * Communication log (design.md §14, 2026-11-08; Form 5 4.2.6, 4.2.8,
 * 4.2.11): every announcement, discussion post, direct message, support
 * ticket, live session (with attendance) and section note for one cohort and
 * date range, including hidden items and earlier versions of edited text.
 * SDP admins and external evaluators export it as CSV or PDF; each export's
 * SHA-256 is audit-logged. Deterministic for the same data and range.
 */

export const LOG_ROLES = ["sdp_admin", "external_evaluator"] as const;
const VIEW: Requirement = { kind: "roles", anyOf: LOG_ROLES, stepUp: false };

type Ctx = ServerCtx;

export type LogEntry = {
  at: Date;
  channel: "Announcement" | "Discussion" | "Direct message" | "Support ticket" | "Live session" | "Attendance" | "Section note";
  context: string;
  author: string;
  authorRole: "Learner" | "Staff";
  recipient: string;
  text: string;
  flags: string;
};

export type CommsLog = { cohortId: string; cohortName: string; from: Date; to: Date; entries: LogEntry[]; actorId: string };

/** "2026-10-01" (inclusive) to "2026-10-31" (inclusive), South African dates. */
export function parseRange(from: string, to: string): { from: Date; to: Date } {
  const ok = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (!ok(from) || !ok(to)) throw new CommsError("invalid", "Choose a start and end date.");
  const start = new Date(`${from}T00:00:00+02:00`);
  const end = new Date(new Date(`${to}T00:00:00+02:00`).getTime() + 86_400_000);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start)
    throw new CommsError("invalid", "The end date must be on or after the start date.");
  if (end.getTime() - start.getTime() > 400 * 86_400_000) throw new CommsError("invalid", "Choose a range of at most about a year.");
  return { from: start, to: end };
}

export async function buildCommsLog(ctx: Ctx, actor: AccessContext | null, cohortId: string, from: Date, to: Date): Promise<CommsLog> {
  const a = await authorize(ctx, actor, VIEW, "commsLog.build");
  const [cohort] = await ctx.db.select({ name: cohorts.name }).from(cohorts).where(eq(cohorts.id, cohortId));
  if (!cohort) throw new CommsError("not_found", "Cohort not found.");
  const learnerIds = new Set(
    (await ctx.db.select({ id: enrolments.userId }).from(enrolments).where(eq(enrolments.cohortId, cohortId))).map((r) => r.id),
  );
  const role = (uid: string): LogEntry["authorRole"] => (learnerIds.has(uid) ? "Learner" : "Staff");
  const names = new Map<string, string>();
  const nameOf = async (ids: string[]) => {
    const missing = [...new Set(ids)].filter((id) => !names.has(id));
    if (missing.length) {
      for (const u of await ctx.db.select({ id: users.id, name: users.displayName }).from(users).where(inArray(users.id, missing)))
        names.set(u.id, u.name);
    }
  };
  const inRange = (col: Parameters<typeof gte>[0]) => and(gte(col, from), lt(col, to));
  const entries: LogEntry[] = [];

  // Announcements
  const anns = await ctx.db
    .select({ at: announcements.publishedAt, authorId: announcements.authorId, title: announcements.title, body: announcements.body, pinnedAt: announcements.pinnedAt })
    .from(announcements)
    .where(and(eq(announcements.cohortId, cohortId), inRange(announcements.publishedAt)));
  await nameOf(anns.map((r) => r.authorId));
  for (const r of anns)
    entries.push({
      at: r.at!,
      channel: "Announcement",
      context: r.title,
      author: names.get(r.authorId) ?? "",
      authorRole: role(r.authorId),
      recipient: "Cohort",
      text: r.body,
      flags: r.pinnedAt ? "pinned" : "",
    });

  // Discussions: threads and posts (with earlier versions of edited posts)
  const threads = await ctx.db
    .select({ id: discussionThreads.id, at: discussionThreads.createdAt, authorId: discussionThreads.authorId, title: discussionThreads.title, body: discussionThreads.body, code: modules.code })
    .from(discussionThreads)
    .innerJoin(modules, eq(modules.id, discussionThreads.moduleId))
    .where(eq(discussionThreads.cohortId, cohortId));
  const threadById = new Map(threads.map((t) => [t.id, t]));
  await nameOf(threads.map((t) => t.authorId));
  for (const t of threads.filter((t) => t.at >= from && t.at < to))
    entries.push({ at: t.at, channel: "Discussion", context: `${t.code}: ${t.title} (new thread)`, author: names.get(t.authorId) ?? "", authorRole: role(t.authorId), recipient: "Cohort", text: t.body, flags: "" });
  if (threads.length) {
    const posts = await ctx.db
      .select({ id: discussionPosts.id, threadId: discussionPosts.threadId, parentId: discussionPosts.parentId, at: discussionPosts.createdAt, authorId: discussionPosts.authorId, body: discussionPosts.body, editedAt: discussionPosts.editedAt, hiddenAt: discussionPosts.hiddenAt })
      .from(discussionPosts)
      .where(and(inArray(discussionPosts.threadId, threads.map((t) => t.id)), inRange(discussionPosts.createdAt)));
    await nameOf(posts.map((p) => p.authorId));
    const revs = posts.length
      ? await ctx.db
          .select({ targetId: messageRevisions.targetId, body: messageRevisions.body, at: messageRevisions.revisedAt })
          .from(messageRevisions)
          .where(and(eq(messageRevisions.targetType, "discussion_post"), inArray(messageRevisions.targetId, posts.map((p) => p.id))))
      : [];
    for (const p of posts) {
      const t = threadById.get(p.threadId)!;
      const flags = [p.parentId ? "reply to a reply" : "", p.editedAt ? "edited" : "", p.hiddenAt ? "hidden by a facilitator" : ""].filter(Boolean).join("; ");
      entries.push({ at: p.at, channel: "Discussion", context: `${t.code}: ${t.title}`, author: names.get(p.authorId) ?? "", authorRole: role(p.authorId), recipient: "Cohort", text: p.body, flags });
      for (const r of revs.filter((r) => r.targetId === p.id))
        entries.push({ at: p.at, channel: "Discussion", context: `${t.code}: ${t.title}`, author: names.get(p.authorId) ?? "", authorRole: role(p.authorId), recipient: "Cohort", text: r.body, flags: `earlier version (replaced ${r.at.toISOString().slice(0, 16).replace("T", " ")} UTC)` });
    }
  }

  // Direct messages
  const convs = await ctx.db
    .select({ id: conversations.id, learnerId: conversations.learnerId, staffId: conversations.staffId })
    .from(conversations)
    .where(eq(conversations.cohortId, cohortId));
  if (convs.length) {
    await nameOf(convs.flatMap((c) => [c.learnerId, c.staffId]));
    const convById = new Map(convs.map((c) => [c.id, c]));
    const msgs = await ctx.db
      .select({ id: directMessages.id, conversationId: directMessages.conversationId, at: directMessages.createdAt, authorId: directMessages.authorId, body: directMessages.body, editedAt: directMessages.editedAt, hiddenAt: directMessages.hiddenAt })
      .from(directMessages)
      .where(and(inArray(directMessages.conversationId, convs.map((c) => c.id)), inRange(directMessages.createdAt)));
    const revs = msgs.length
      ? await ctx.db
          .select({ targetId: messageRevisions.targetId, body: messageRevisions.body, at: messageRevisions.revisedAt })
          .from(messageRevisions)
          .where(and(eq(messageRevisions.targetType, "direct_message"), inArray(messageRevisions.targetId, msgs.map((m) => m.id))))
      : [];
    for (const m of msgs) {
      const c = convById.get(m.conversationId)!;
      const to = m.authorId === c.learnerId ? c.staffId : c.learnerId;
      const flags = [m.editedAt ? "edited" : "", m.hiddenAt ? "hidden after a report" : ""].filter(Boolean).join("; ");
      const base = { channel: "Direct message" as const, context: "Private conversation", author: names.get(m.authorId) ?? "", authorRole: role(m.authorId), recipient: names.get(to) ?? "" };
      entries.push({ ...base, at: m.at, text: m.body, flags });
      for (const r of revs.filter((r) => r.targetId === m.id))
        entries.push({ ...base, at: m.at, text: r.body, flags: `earlier version (replaced ${r.at.toISOString().slice(0, 16).replace("T", " ")} UTC)` });
    }
  }

  // Support tickets: the ticket itself and every reply
  const tickets = await ctx.db
    .select({ id: supportTickets.id, at: supportTickets.createdAt, raisedBy: supportTickets.raisedBy, subject: supportTickets.subject, body: supportTickets.body, status: supportTickets.status, category: supportTickets.category, firstResponseDueAt: supportTickets.firstResponseDueAt, firstRespondedAt: supportTickets.firstRespondedAt })
    .from(supportTickets)
    .where(eq(supportTickets.cohortId, cohortId));
  if (tickets.length) {
    await nameOf(tickets.map((t) => t.raisedBy));
    for (const t of tickets.filter((t) => t.at >= from && t.at < to)) {
      const reply = t.firstRespondedAt ? (t.firstRespondedAt <= t.firstResponseDueAt ? "first reply on time" : "first reply late") : "no reply yet";
      entries.push({ at: t.at, channel: "Support ticket", context: `${t.subject} (${t.category}, now ${t.status.replace("_", " ")})`, author: names.get(t.raisedBy) ?? "", authorRole: role(t.raisedBy), recipient: "Support", text: t.body, flags: reply });
    }
    const replies = await ctx.db
      .select({ ticketId: ticketReplies.ticketId, at: ticketReplies.createdAt, authorId: ticketReplies.authorId, body: ticketReplies.body })
      .from(ticketReplies)
      .where(and(inArray(ticketReplies.ticketId, tickets.map((t) => t.id)), inRange(ticketReplies.createdAt)));
    await nameOf(replies.map((r) => r.authorId));
    const byId = new Map(tickets.map((t) => [t.id, t]));
    for (const r of replies) {
      const t = byId.get(r.ticketId)!;
      entries.push({ at: r.at, channel: "Support ticket", context: t.subject, author: names.get(r.authorId) ?? "", authorRole: role(r.authorId), recipient: r.authorId === t.raisedBy ? "Support" : names.get(t.raisedBy) ?? "", text: r.body, flags: "" });
    }
  }

  // Live sessions (by start time) and their attendance
  const sess = await ctx.db
    .select()
    .from(liveSessions)
    .where(and(eq(liveSessions.cohortId, cohortId), inRange(liveSessions.startsAt)));
  if (sess.length) {
    await nameOf(sess.map((s) => s.createdBy));
    const att = await ctx.db
      .select({ sessionId: sessionAttendance.sessionId, status: sessionAttendance.status, name: users.displayName })
      .from(sessionAttendance)
      .innerJoin(enrolments, eq(enrolments.id, sessionAttendance.enrolmentId))
      .innerJoin(users, eq(users.id, enrolments.userId))
      .where(inArray(sessionAttendance.sessionId, sess.map((s) => s.id)))
      .orderBy(asc(users.displayName));
    for (const s of sess) {
      const mine = att.filter((x) => x.sessionId === s.id);
      const present = mine.filter((x) => x.status === "present" || x.status === "late").length;
      entries.push({
        at: s.startsAt,
        channel: "Live session",
        context: s.title,
        author: names.get(s.createdBy) ?? "",
        authorRole: "Staff",
        recipient: "Cohort",
        text: [`Zoom: ${s.joinUrl}`, `Ends ${s.endsAt.toISOString().slice(0, 16).replace("T", " ")} UTC`, s.recordingUrl ? `Recording: ${s.recordingUrl}` : "No recording link", `${present} of ${mine.length} marked learners attended`].join(" · "),
        flags: s.cancelledAt ? "cancelled" : "",
      });
      for (const x of mine)
        entries.push({ at: s.startsAt, channel: "Attendance", context: s.title, author: x.name, authorRole: "Learner", recipient: "", text: x.status, flags: "" });
    }
  }

  // Section notes
  const notes = await ctx.db
    .select({ at: sectionNotes.createdAt, authorId: sectionNotes.authorId, body: sectionNotes.body, recordingUrl: sectionNotes.recordingUrl, section: sections.title, archivedAt: sectionNotes.archivedAt })
    .from(sectionNotes)
    .innerJoin(sections, eq(sections.id, sectionNotes.sectionId))
    .where(and(eq(sectionNotes.cohortId, cohortId), inRange(sectionNotes.createdAt)));
  await nameOf(notes.map((n) => n.authorId));
  for (const n of notes)
    entries.push({ at: n.at, channel: "Section note", context: n.section, author: names.get(n.authorId) ?? "", authorRole: role(n.authorId), recipient: "Cohort", text: [n.body, n.recordingUrl ? `Recording: ${n.recordingUrl}` : ""].filter(Boolean).join(" · "), flags: n.archivedAt ? "removed" : "" });

  entries.sort((x, y) => x.at.getTime() - y.at.getTime() || x.channel.localeCompare(y.channel) || x.context.localeCompare(y.context) || x.text.localeCompare(y.text));
  return { cohortId, cohortName: cohort.name, from, to, entries, actorId: a.userId };
}

const fmt = (d: Date) => d.toISOString().replace("T", " ").slice(0, 16) + " UTC";

function cell(v: string): string {
  let s = v;
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function commsLogCsv(log: CommsLog): string {
  const header = ["Time", "Channel", "Where", "From", "From role", "To", "Text", "Notes"];
  const lines = [header.map(cell).join(",")];
  for (const e of log.entries) lines.push([fmt(e.at), e.channel, e.context, e.author, e.authorRole, e.recipient, e.text, e.flags].map(cell).join(","));
  return lines.join("\r\n") + "\r\n";
}

export async function commsLogPdf(log: CommsLog): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  doc.setTitle(winAnsi(`Communication log - ${log.cohortName}`));
  doc.setSubject("Communication log");
  doc.setCreator("LMS communication log");
  doc.setProducer("pdf-lib");
  doc.setCreationDate(log.to);
  doc.setModificationDate(log.to);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new Writer(doc, font, bold);
  const last = new Date(log.to.getTime() - 86_400_000);
  const day = (d: Date) => new Date(d.getTime() + 2 * 3_600_000).toISOString().slice(0, 10);
  w.text("Communication log", { bold: true, size: 14 });
  w.text(`${log.cohortName} - ${day(log.from)} to ${day(last)} (South African dates)`);
  const counts = new Map<string, number>();
  for (const e of log.entries) counts.set(e.channel, (counts.get(e.channel) ?? 0) + 1);
  w.text([...counts].map(([k, v]) => `${k}: ${v}`).join(" - ") || "No communication in this range.", { size: 9 });
  w.rule();
  for (const e of log.entries) {
    w.ensure(40);
    w.text(`${fmt(e.at)} - ${e.channel} - ${e.context}`, { bold: true, size: 9 });
    w.text(`From ${e.author || "-"} (${e.authorRole})${e.recipient ? ` to ${e.recipient}` : ""}${e.flags ? ` [${e.flags}]` : ""}`, { size: 8, color: [0.3, 0.3, 0.3] });
    w.text(e.text, { size: 9, indent: 12 });
    w.gap(4);
  }
  const total = w.pages.length;
  w.pages.forEach((p, i) => {
    p.drawText(winAnsi(`Communication log ${log.cohortName} - page ${i + 1} of ${total}`), { x: MARGIN, y: MARGIN - 20, size: 7, font, color: rgb(0.4, 0.4, 0.4) });
  });
  return doc.save({ useObjectStreams: false });
}

export async function exportCommsLog(
  ctx: Ctx,
  actor: AccessContext | null,
  input: { cohortId: string; from: string; to: string; format: "csv" | "pdf" },
): Promise<{ bytes: Uint8Array; sha256: string; filename: string; contentType: string }> {
  const range = parseRange(input.from, input.to);
  const log = await buildCommsLog(ctx, actor, input.cohortId, range.from, range.to);
  await enforceLimit(ctx, RATE_LIMITS.commsExport, log.actorId, "Too many exports. Please wait a few minutes.");
  const bytes = input.format === "pdf" ? await commsLogPdf(log) : new TextEncoder().encode("﻿" + commsLogCsv(log));
  const sha256 = sha256Hex(bytes);
  await writeAudit(ctx, {
    action: "comms.log.exported",
    actorId: log.actorId,
    entityType: "cohort",
    entityId: input.cohortId,
    after: { format: input.format, from: input.from, to: input.to, entries: log.entries.length, sha256, bytes: bytes.byteLength },
  });
  const safe = log.cohortName.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "cohort";
  return {
    bytes,
    sha256,
    filename: `communication-log-${safe}-${input.from}-to-${input.to}.${input.format}`,
    contentType: input.format === "pdf" ? "application/pdf" : "text/csv; charset=utf-8",
  };
}
