import { and, asc, desc, eq, gte, inArray, or, sql } from "drizzle-orm";
import { cohorts, roleGrants, supportTickets, ticketReplies, users } from "db";
import type { AccessContext, Requirement } from "@/lib/access";
import { MAX_TITLE, TICKET_FIRST_REPLY_HOURS, TICKET_RESOLVE_HOURS } from "@/lib/comms";
import { addWorkingHours } from "@/lib/workingTime";
import { writeAudit } from "./audit";
import { authorize } from "./auth";
import type { ServerCtx } from "./context";
import { CommsError, claimJobRun, cohortStaff, enforceLimit, enforcePostLimit, learnerCohorts, requireText } from "./comms";
import { notificationEmail, sendEmail } from "./email";
import { markReadByLink, notify } from "./notify";
import { RATE_LIMITS } from "./ratelimit";
import { cohortScope, inScope } from "./staffScope";

/**
 * Support tickets (design.md §14, 2026-11-08; Form 5 4.2.11). Targets: first
 * reply within 1 working day and resolved within 5 (Mon–Fri 08:00–17:00
 * SAST, skipping public holidays). Academic tickets go to the cohort's
 * facilitators; technical and admin tickets to SDP admins; staff can
 * reassign. Staff close tickets; a learner can reopen a resolved ticket
 * until it is closed. Overdue tickets show on staff lists and in one daily
 * email to each handler.
 */

export const TICKET_CATEGORIES = ["academic", "technical", "admin"] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];
export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  academic: "Help with my learning",
  technical: "Something isn't working",
  admin: "Admin (enrolment, documents, account)",
};
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

export const TICKET_STAFF = ["facilitator", "sdp_admin"] as const;
const STAFF: Requirement = { kind: "roles", anyOf: TICKET_STAFF, stepUp: false };
const USER: Requirement = { kind: "user" };

type Ctx = ServerCtx;

export const ticketLink = (id: string, side: "learner" | "staff") =>
  side === "staff" ? `/staff/tickets/${id}` : `/messages/help/${id}`;

export function ticketTargets(createdAt: Date) {
  return {
    firstResponseDueAt: addWorkingHours(createdAt, TICKET_FIRST_REPLY_HOURS),
    resolveDueAt: addWorkingHours(createdAt, TICKET_RESOLVE_HOURS),
  };
}

/** Is a ticket past one of its targets right now? */
export function isOverdue(
  t: { status: TicketStatus; firstRespondedAt: Date | null; firstResponseDueAt: Date; resolveDueAt: Date },
  now: Date,
): "first_reply" | "resolve" | null {
  if (t.status === "resolved" || t.status === "closed") return null;
  if (!t.firstRespondedAt && t.firstResponseDueAt < now) return "first_reply";
  if (t.resolveDueAt < now) return "resolve";
  return null;
}

async function sdpAdmins(ctx: Ctx): Promise<string[]> {
  const rows = await ctx.db
    .select({ userId: roleGrants.userId })
    .from(roleGrants)
    .innerJoin(users, eq(users.id, roleGrants.userId))
    .where(and(eq(roleGrants.role, "sdp_admin"), eq(users.status, "active")));
  return [...new Set(rows.map((r) => r.userId))];
}

/** Who handles a ticket: the assignee, else the queue for its category. */
async function handlers(ctx: Ctx, t: { category: TicketCategory; cohortId: string | null; assignedTo: string | null }) {
  if (t.assignedTo) return [t.assignedTo];
  if (t.category === "academic" && t.cohortId) {
    return (await cohortStaff(ctx, t.cohortId, ["facilitator"])).map((s) => s.userId);
  }
  return sdpAdmins(ctx);
}

// --- Learner ----------------------------------------------------------------

export async function raiseTicket(
  ctx: Ctx,
  actor: AccessContext | null,
  input: { category: string; cohortId?: string; subject: string; body: string },
): Promise<string> {
  const a = await authorize(ctx, actor, USER, "tickets.raise");
  const category = input.category as TicketCategory;
  if (!TICKET_CATEGORIES.includes(category)) throw new CommsError("invalid", "Choose what you need help with.");
  const mine = await learnerCohorts(ctx, a.userId);
  let cohortId: string | null = null;
  if (input.cohortId) {
    if (!mine.some((c) => c.cohortId === input.cohortId)) throw new CommsError("invalid", "Choose one of your programmes.");
    cohortId = input.cohortId;
  } else if (mine.length === 1) {
    cohortId = mine[0]!.cohortId;
  }
  if (category === "academic" && !cohortId) throw new CommsError("invalid", "Choose the programme this is about.");
  const subject = requireText(input.subject, { max: MAX_TITLE, label: "The subject" });
  const body = requireText(input.body, { label: "Your question" });
  await enforceLimit(ctx, RATE_LIMITS.ticketCreate, a.userId, "You can raise up to 3 tickets a day. Add to an open ticket instead, or try again tomorrow.");
  const now = ctx.now();
  const [row] = await ctx.db
    .insert(supportTickets)
    .values({ raisedBy: a.userId, category, cohortId, subject, body, ...ticketTargets(now), lastActivityAt: now })
    .returning({ id: supportTickets.id });
  await writeAudit(ctx, {
    action: "support.ticket.created",
    actorId: a.userId,
    entityType: "support_ticket",
    entityId: row!.id,
    after: { category, cohortId },
  });
  await notify(ctx, await handlers(ctx, { category, cohortId, assignedTo: null }), {
    kind: "ticket",
    title: `New support ticket: ${subject}`,
    link: ticketLink(row!.id, "staff"),
    email: { subject: "New support ticket", lines: ["A learner raised a support ticket. Please reply within 1 working day."], cta: "Open the ticket" },
  });
  return row!.id;
}

export async function listMyTickets(ctx: Ctx, actor: AccessContext | null) {
  const a = await authorize(ctx, actor, USER, "tickets.mine");
  return ctx.db
    .select({
      id: supportTickets.id,
      subject: supportTickets.subject,
      status: supportTickets.status,
      category: supportTickets.category,
      firstResponseDueAt: supportTickets.firstResponseDueAt,
      firstRespondedAt: supportTickets.firstRespondedAt,
      lastActivityAt: supportTickets.lastActivityAt,
      unread: sql<boolean>`exists (select 1 from notifications n where n.user_id = ${a.userId} and n.read_at is null and n.link = '/messages/help/' || ${supportTickets.id}::text)`,
    })
    .from(supportTickets)
    .where(eq(supportTickets.raisedBy, a.userId))
    .orderBy(desc(supportTickets.lastActivityAt));
}

// --- Shared -------------------------------------------------------------------

async function loadTicket(ctx: Ctx, id: string) {
  const [t] = await ctx.db
    .select({
      id: supportTickets.id,
      raisedBy: supportTickets.raisedBy,
      raisedByName: users.displayName,
      category: supportTickets.category,
      cohortId: supportTickets.cohortId,
      status: supportTickets.status,
      subject: supportTickets.subject,
      body: supportTickets.body,
      assignedTo: supportTickets.assignedTo,
      firstResponseDueAt: supportTickets.firstResponseDueAt,
      resolveDueAt: supportTickets.resolveDueAt,
      firstRespondedAt: supportTickets.firstRespondedAt,
      resolvedAt: supportTickets.resolvedAt,
      closedAt: supportTickets.closedAt,
      createdAt: supportTickets.createdAt,
    })
    .from(supportTickets)
    .innerJoin(users, eq(users.id, supportTickets.raisedBy))
    .where(eq(supportTickets.id, id));
  if (!t) throw new CommsError("not_found", "Ticket not found.");
  return t;
}

/** Staff who can see and work a ticket: SDP admins, the assignee, and facilitators of the cohort for academic tickets. */
type Ticketish = { category: TicketCategory; cohortId: string | null; assignedTo: string | null };

/** Build the handler check once (one scope query), then apply it to many tickets. */
async function handlerCheck(ctx: Ctx, a: AccessContext): Promise<(t: Ticketish) => boolean> {
  const scope = a.roles.has("facilitator") ? await cohortScope(ctx, a, ["facilitator"]) : [];
  return (t) =>
    a.roles.has("sdp_admin") ||
    t.assignedTo === a.userId ||
    (t.category === "academic" && t.cohortId !== null && inScope(scope, t.cohortId));
}

async function canHandle(ctx: Ctx, a: AccessContext, t: Ticketish) {
  return (await handlerCheck(ctx, a))(t);
}

export async function getTicket(ctx: Ctx, actor: AccessContext | null, id: string, side: "learner" | "staff") {
  const a = await authorize(ctx, actor, side === "staff" ? STAFF : USER, "tickets.get");
  const t = await loadTicket(ctx, id);
  const allowed = side === "learner" ? t.raisedBy === a.userId : await canHandle(ctx, a, t);
  if (!allowed) throw new CommsError("not_found", "Ticket not found.");
  const replies = await ctx.db
    .select({
      id: ticketReplies.id,
      authorId: ticketReplies.authorId,
      author: users.displayName,
      body: ticketReplies.body,
      createdAt: ticketReplies.createdAt,
    })
    .from(ticketReplies)
    .innerJoin(users, eq(users.id, ticketReplies.authorId))
    .where(eq(ticketReplies.ticketId, id))
    .orderBy(asc(ticketReplies.createdAt));
  await markReadByLink(ctx, a.userId, ticketLink(id, side));
  let assignees: { userId: string; name: string }[] = [];
  let cohortName: string | null = null;
  if (t.cohortId) {
    const [c] = await ctx.db.select({ name: cohorts.name }).from(cohorts).where(eq(cohorts.id, t.cohortId));
    cohortName = c?.name ?? null;
  }
  if (side === "staff") {
    const facs = t.cohortId ? await cohortStaff(ctx, t.cohortId, ["facilitator"]) : [];
    const adminIds = await sdpAdmins(ctx);
    const admins = adminIds.length
      ? await ctx.db.select({ userId: users.id, name: users.displayName }).from(users).where(inArray(users.id, adminIds))
      : [];
    const seen = new Set<string>();
    assignees = [...facs.map((f) => ({ userId: f.userId, name: `${f.name} (facilitator)` })), ...admins.map((x) => ({ userId: x.userId, name: `${x.name} (admin)` }))].filter(
      (x) => (seen.has(x.userId) ? false : (seen.add(x.userId), true)),
    );
  }
  return {
    ticket: { ...t, cohortName, overdue: isOverdue(t, ctx.now()) },
    replies: replies.map((r) => ({ ...r, fromLearner: r.authorId === t.raisedBy })),
    assignees,
  };
}

export async function replyToTicket(ctx: Ctx, actor: AccessContext | null, id: string, rawBody: string, side: "learner" | "staff") {
  const a = await authorize(ctx, actor, side === "staff" ? STAFF : USER, "tickets.reply");
  const t = await loadTicket(ctx, id);
  const allowed = side === "learner" ? t.raisedBy === a.userId : await canHandle(ctx, a, t);
  if (!allowed) throw new CommsError("not_found", "Ticket not found.");
  if (t.status === "closed") throw new CommsError("not_allowed", "This ticket is closed. Raise a new one if you still need help.");
  const body = requireText(rawBody, { label: "Your reply" });
  await enforcePostLimit(ctx, a);
  const now = ctx.now();
  await ctx.db.insert(ticketReplies).values({ ticketId: id, authorId: a.userId, body });
  const patch: Partial<typeof supportTickets.$inferInsert> = { lastActivityAt: now };
  if (side === "staff") {
    if (!t.firstRespondedAt) patch.firstRespondedAt = now;
    if (t.status === "open") patch.status = "in_progress";
  } else if (t.status === "resolved") {
    // Replying to a resolved ticket reopens it.
    patch.status = "open";
    patch.resolvedAt = null;
  }
  await ctx.db.update(supportTickets).set(patch).where(eq(supportTickets.id, id));
  await writeAudit(ctx, {
    action: "support.ticket.replied",
    actorId: a.userId,
    entityType: "support_ticket",
    entityId: id,
    after: { side, reopened: side === "learner" && t.status === "resolved" },
  });
  if (side === "staff") {
    await notify(ctx, [t.raisedBy], {
      kind: "ticket",
      title: `Reply to your ticket: ${t.subject}`,
      link: ticketLink(id, "learner"),
      email: { subject: "We replied to your support ticket", lines: ["There is a reply to your support ticket."], cta: "Read the reply" },
    });
  } else {
    await notify(ctx, (await handlers(ctx, t)).filter((u) => u !== a.userId), {
      kind: "ticket",
      title: `Learner replied: ${t.subject}`,
      link: ticketLink(id, "staff"),
      email: { subject: "A learner replied to a support ticket", lines: ["A learner added to a support ticket."], cta: "Open the ticket" },
    });
  }
}

/** Learner: "Still need help" on a resolved ticket reopens it. */
export async function reopenTicket(ctx: Ctx, actor: AccessContext | null, id: string) {
  const a = await authorize(ctx, actor, USER, "tickets.reopen");
  const t = await loadTicket(ctx, id);
  if (t.raisedBy !== a.userId) throw new CommsError("not_found", "Ticket not found.");
  if (t.status !== "resolved") throw new CommsError("not_allowed", "Only a resolved ticket can be reopened.");
  await ctx.db
    .update(supportTickets)
    .set({ status: "open", resolvedAt: null, lastActivityAt: ctx.now() })
    .where(eq(supportTickets.id, id));
  await writeAudit(ctx, {
    action: "support.ticket.status_changed",
    actorId: a.userId,
    entityType: "support_ticket",
    entityId: id,
    after: { from: "resolved", to: "open" },
  });
  await notify(ctx, await handlers(ctx, t), {
    kind: "ticket",
    title: `Ticket reopened: ${t.subject}`,
    link: ticketLink(id, "staff"),
    email: { subject: "A support ticket was reopened", lines: ["A learner still needs help with a resolved ticket."], cta: "Open the ticket" },
  });
}

// --- Staff ----------------------------------------------------------------------

export async function setTicketStatus(ctx: Ctx, actor: AccessContext | null, id: string, status: string) {
  const a = await authorize(ctx, actor, STAFF, "tickets.status");
  const t = await loadTicket(ctx, id);
  if (!(await canHandle(ctx, a, t))) throw new CommsError("not_found", "Ticket not found.");
  const to = status as TicketStatus;
  if (!["in_progress", "resolved", "closed"].includes(to)) throw new CommsError("invalid", "Choose a status.");
  if (t.status === "closed") throw new CommsError("not_allowed", "This ticket is closed.");
  const now = ctx.now();
  await ctx.db
    .update(supportTickets)
    .set({
      status: to,
      lastActivityAt: now,
      resolvedAt: to === "resolved" || to === "closed" ? (t.resolvedAt ?? now) : null,
      closedAt: to === "closed" ? now : null,
    })
    .where(eq(supportTickets.id, id));
  await writeAudit(ctx, {
    action: "support.ticket.status_changed",
    actorId: a.userId,
    entityType: "support_ticket",
    entityId: id,
    after: { from: t.status, to },
  });
  if (to === "resolved" || to === "closed") {
    await notify(ctx, [t.raisedBy], {
      kind: "ticket",
      title: `Ticket ${to === "resolved" ? "resolved" : "closed"}: ${t.subject}`,
      link: ticketLink(id, "learner"),
      email: {
        subject: `Your support ticket was ${to === "resolved" ? "resolved" : "closed"}`,
        lines: [
          to === "resolved"
            ? "Your support ticket was marked resolved. If you still need help, open it and choose “Still need help”."
            : "Your support ticket was closed.",
        ],
        cta: "Open the ticket",
      },
    });
  }
}

export async function reassignTicket(ctx: Ctx, actor: AccessContext | null, id: string, assigneeId: string) {
  const a = await authorize(ctx, actor, STAFF, "tickets.reassign");
  const t = await loadTicket(ctx, id);
  if (!(await canHandle(ctx, a, t))) throw new CommsError("not_found", "Ticket not found.");
  const facs = t.cohortId ? (await cohortStaff(ctx, t.cohortId, ["facilitator"])).map((s) => s.userId) : [];
  const eligible = new Set([...facs, ...(await sdpAdmins(ctx))]);
  const to = assigneeId || null;
  if (to && !eligible.has(to)) throw new CommsError("invalid", "Choose a facilitator of this cohort or an admin.");
  await ctx.db.update(supportTickets).set({ assignedTo: to, lastActivityAt: ctx.now() }).where(eq(supportTickets.id, id));
  await writeAudit(ctx, {
    action: "support.ticket.reassigned",
    actorId: a.userId,
    entityType: "support_ticket",
    entityId: id,
    after: { assigned: Boolean(to) },
  });
  if (to && to !== a.userId) {
    await notify(ctx, [to], {
      kind: "ticket",
      title: `Ticket assigned to you: ${t.subject}`,
      link: ticketLink(id, "staff"),
      email: { subject: "A support ticket was assigned to you", lines: ["A support ticket was assigned to you."], cta: "Open the ticket" },
    });
  }
}

export type StaffTicketFilter = "active" | "overdue" | "mine" | "resolved" | "all";

export async function listStaffTickets(ctx: Ctx, actor: AccessContext | null, filter: StaffTicketFilter = "active") {
  const a = await authorize(ctx, actor, STAFF, "tickets.staffList");
  const rows = await ctx.db
    .select({
      id: supportTickets.id,
      subject: supportTickets.subject,
      category: supportTickets.category,
      status: supportTickets.status,
      cohortId: supportTickets.cohortId,
      cohortName: cohorts.name,
      learner: users.displayName,
      assignedTo: supportTickets.assignedTo,
      firstResponseDueAt: supportTickets.firstResponseDueAt,
      resolveDueAt: supportTickets.resolveDueAt,
      firstRespondedAt: supportTickets.firstRespondedAt,
      lastActivityAt: supportTickets.lastActivityAt,
      createdAt: supportTickets.createdAt,
    })
    .from(supportTickets)
    .innerJoin(users, eq(users.id, supportTickets.raisedBy))
    .leftJoin(cohorts, eq(cohorts.id, supportTickets.cohortId))
    .orderBy(asc(supportTickets.firstResponseDueAt))
    .limit(500);
  const now = ctx.now();
  const handles = await handlerCheck(ctx, a);
  const out = [];
  for (const r of rows) {
    if (!handles(r)) continue;
    const overdue = isOverdue(r, now);
    const keep =
      filter === "all" ||
      (filter === "active" && (r.status === "open" || r.status === "in_progress")) ||
      (filter === "overdue" && overdue !== null) ||
      (filter === "mine" && r.assignedTo === a.userId && r.status !== "closed") ||
      (filter === "resolved" && (r.status === "resolved" || r.status === "closed"));
    if (keep) out.push({ ...r, overdue });
  }
  return out;
}

export async function overdueTicketCount(ctx: Ctx, actor: AccessContext): Promise<number> {
  if (!TICKET_STAFF.some((r) => actor.roles.has(r))) return 0;
  return (await listStaffTickets(ctx, actor, "overdue")).length;
}

/** Response-time summary for the Form 5 4.2.11 SLA report (tickets raised since `since`). */
export async function ticketSummary(ctx: Ctx, actor: AccessContext | null, since: Date) {
  const a = await authorize(ctx, actor, STAFF, "tickets.summary");
  const rows = (await listStaffTickets(ctx, a, "all")).filter((r) => r.createdAt >= since);
  const answered = rows.filter((r) => r.firstRespondedAt);
  const onTime = answered.filter((r) => r.firstRespondedAt! <= r.firstResponseDueAt).length;
  const resolvedRows = rows.length
    ? await ctx.db
        .select({ resolvedAt: supportTickets.resolvedAt, resolveDueAt: supportTickets.resolveDueAt })
        .from(supportTickets)
        .where(and(inArray(supportTickets.id, rows.map((r) => r.id)), gte(supportTickets.createdAt, since)))
    : [];
  const resolved = resolvedRows.filter((r) => r.resolvedAt);
  return {
    raised: rows.length,
    answered: answered.length,
    firstReplyOnTime: onTime,
    resolved: resolved.length,
    resolvedOnTime: resolved.filter((r) => r.resolvedAt! <= r.resolveDueAt).length,
  };
}

/**
 * Daily 07:00 SAST: one email to each handler listing how many of their
 * tickets are overdue (no learner names). Runs once per day.
 */
export async function runOverdueTicketEmails(ctx: Ctx): Promise<{ ran: boolean; emails: number }> {
  const day = new Date(ctx.now().getTime() + 2 * 3_600_000).toISOString().slice(0, 10);
  if (!(await claimJobRun(ctx, "overdue-tickets", day))) return { ran: false, emails: 0 };
  const now = ctx.now();
  const open = await ctx.db
    .select({
      id: supportTickets.id,
      category: supportTickets.category,
      cohortId: supportTickets.cohortId,
      assignedTo: supportTickets.assignedTo,
      status: supportTickets.status,
      firstRespondedAt: supportTickets.firstRespondedAt,
      firstResponseDueAt: supportTickets.firstResponseDueAt,
      resolveDueAt: supportTickets.resolveDueAt,
    })
    .from(supportTickets)
    .where(or(eq(supportTickets.status, "open"), eq(supportTickets.status, "in_progress")));
  const perHandler = new Map<string, number>();
  for (const t of open) {
    if (!isOverdue(t, now)) continue;
    for (const h of await handlers(ctx, t)) perHandler.set(h, (perHandler.get(h) ?? 0) + 1);
  }
  if (perHandler.size === 0) return { ran: true, emails: 0 };
  const people = await ctx.db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(and(inArray(users.id, [...perHandler.keys()]), eq(users.status, "active")));
  let emails = 0;
  for (const p of people) {
    const n = perHandler.get(p.id)!;
    try {
      await sendEmail(
        notificationEmail(
          p.email,
          `${n} overdue support ticket${n === 1 ? "" : "s"}`,
          [`You have ${n} support ticket${n === 1 ? "" : "s"} past the response target.`],
          `${ctx.config.appUrl}/staff/tickets?filter=overdue`,
          "See overdue tickets",
        ),
      );
      emails++;
    } catch (e) {
      console.error(`[tickets] overdue email failed: ${(e as Error).message}`);
    }
  }
  return { ran: true, emails };
}
