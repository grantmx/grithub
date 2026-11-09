import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { cohorts, conversations, directMessages, enrolments, messageRevisions, users } from "db";
import type { AccessContext, Requirement, StaffRole } from "@/lib/access";
import { canEditOwn } from "@/lib/comms";
import { writeAudit } from "./audit";
import { authorize } from "./auth";
import type { ServerCtx } from "./context";
import { CommsError, cohortStaff, enforcePostLimit, learnerCohorts, requireText } from "./comms";
import { markReadByLink, notify } from "./notify";
import { cohortScope, inScope } from "./staffScope";

/**
 * Direct messages (design.md §14, 2026-11-08): a learner writes to one named
 * facilitator or to the cohort's assessor. Only those two people can read
 * the conversation (it also appears in the audited communication log
 * export). No learner-to-learner messages, no attachments.
 */

export const MESSAGE_STAFF_ROLES = ["facilitator", "assessor"] as const satisfies readonly StaffRole[];
const STAFF: Requirement = { kind: "roles", anyOf: MESSAGE_STAFF_ROLES, stepUp: false };
const USER: Requirement = { kind: "user" };

type Ctx = ServerCtx;

export const conversationLink = (id: string, side: "learner" | "staff") =>
  side === "staff" ? `/staff/messages/${id}` : `/messages/c/${id}`;

const ROLE_LABEL: Record<string, string> = { facilitator: "facilitator", assessor: "assessor" };

/** People a learner can write to, per cohort: the cohort's facilitators and its assessor. */
export async function messageRecipients(ctx: Ctx, actor: AccessContext | null) {
  const a = await authorize(ctx, actor, USER, "messages.recipients");
  const mine = await learnerCohorts(ctx, a.userId);
  const out: { cohortId: string; cohortName: string; userId: string; name: string; role: "facilitator" | "assessor" }[] = [];
  for (const c of mine) {
    for (const s of await cohortStaff(ctx, c.cohortId, MESSAGE_STAFF_ROLES)) {
      if (s.userId === a.userId) continue;
      out.push({ cohortId: c.cohortId, cohortName: c.cohortName, userId: s.userId, name: s.name, role: s.role as "facilitator" | "assessor" });
    }
  }
  return out;
}

async function upsertConversation(
  ctx: Ctx,
  v: { cohortId: string; learnerId: string; staffId: string; staffRole: "facilitator" | "assessor" },
): Promise<string> {
  const [existing] = await ctx.db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(eq(conversations.cohortId, v.cohortId), eq(conversations.learnerId, v.learnerId), eq(conversations.staffId, v.staffId)),
    );
  if (existing) return existing.id;
  const [row] = await ctx.db.insert(conversations).values(v).onConflictDoNothing().returning({ id: conversations.id });
  if (row) return row.id;
  return upsertConversation(ctx, v);
}

/** Learner starts (or continues) a conversation with a facilitator or the assessor of their cohort. */
export async function startConversation(
  ctx: Ctx,
  actor: AccessContext | null,
  input: { cohortId: string; staffId: string; body: string },
): Promise<string> {
  const a = await authorize(ctx, actor, USER, "messages.start");
  const recipient = (await messageRecipients(ctx, a)).find((r) => r.cohortId === input.cohortId && r.userId === input.staffId);
  if (!recipient) throw new CommsError("not_allowed", "You can message your cohort's facilitators and assessor only.");
  const body = requireText(input.body);
  const id = await upsertConversation(ctx, {
    cohortId: input.cohortId,
    learnerId: a.userId,
    staffId: input.staffId,
    staffRole: recipient.role,
  });
  await deliver(ctx, a, id, body, true);
  return id;
}

/** Staff (facilitator or assessor of the cohort) start a conversation with a learner, e.g. from an at-risk flag. */
export async function staffStartConversation(
  ctx: Ctx,
  actor: AccessContext | null,
  input: { enrolmentId: string; body: string },
): Promise<string> {
  const a = await authorize(ctx, actor, STAFF, "messages.staffStart");
  const [enr] = await ctx.db
    .select({ cohortId: enrolments.cohortId, learnerId: enrolments.userId })
    .from(enrolments)
    .where(and(eq(enrolments.id, input.enrolmentId), eq(enrolments.status, "active")));
  if (!enr) throw new CommsError("not_found", "Learner not found.");
  let role: "facilitator" | "assessor" | null = null;
  for (const r of MESSAGE_STAFF_ROLES) {
    if (a.roles.has(r) && inScope(await cohortScope(ctx, a, [r]), enr.cohortId)) {
      role = r;
      break;
    }
  }
  if (!role || enr.learnerId === a.userId) throw new CommsError("not_found", "Learner not found.");
  const body = requireText(input.body);
  const id = await upsertConversation(ctx, { cohortId: enr.cohortId, learnerId: enr.learnerId, staffId: a.userId, staffRole: role });
  await deliver(ctx, a, id, body, true);
  return id;
}

async function loadConversation(ctx: Ctx, a: AccessContext, id: string) {
  const [c] = await ctx.db
    .select({
      id: conversations.id,
      cohortId: conversations.cohortId,
      cohortName: cohorts.name,
      learnerId: conversations.learnerId,
      staffId: conversations.staffId,
      staffRole: conversations.staffRole,
      learnerReadAt: conversations.learnerReadAt,
      staffReadAt: conversations.staffReadAt,
    })
    .from(conversations)
    .innerJoin(cohorts, eq(cohorts.id, conversations.cohortId))
    .where(and(eq(conversations.id, id), or(eq(conversations.learnerId, a.userId), eq(conversations.staffId, a.userId))));
  if (!c) throw new CommsError("not_found", "Conversation not found.");
  return { ...c, side: (c.learnerId === a.userId ? "learner" : "staff") as "learner" | "staff" };
}

async function deliver(ctx: Ctx, a: AccessContext, conversationId: string, body: string, rateLimit: boolean) {
  const c = await loadConversation(ctx, a, conversationId);
  if (rateLimit) await enforcePostLimit(ctx, a);
  const now = ctx.now();
  const [row] = await ctx.db
    .insert(directMessages)
    .values({ conversationId, authorId: a.userId, body })
    .returning({ id: directMessages.id });
  await ctx.db
    .update(conversations)
    .set(c.side === "learner" ? { lastMessageAt: now, learnerReadAt: now } : { lastMessageAt: now, staffReadAt: now })
    .where(eq(conversations.id, conversationId));
  await writeAudit(ctx, {
    action: "comms.message.sent",
    actorId: a.userId,
    entityType: "direct_message",
    entityId: row!.id,
    after: { conversationId },
  });
  const [me] = await ctx.db.select({ name: users.displayName }).from(users).where(eq(users.id, a.userId));
  const to = c.side === "learner" ? c.staffId : c.learnerId;
  const toSide = c.side === "learner" ? "staff" : "learner";
  // Staff see the learner's name in-app; emails never carry names or message text.
  await notify(ctx, [to], {
    kind: "message",
    title: c.side === "learner" ? `New message from ${me?.name ?? "a learner"}` : `New message from your ${ROLE_LABEL[c.staffRole] ?? "facilitator"}`,
    link: conversationLink(conversationId, toSide),
    email: {
      subject: "You have a new message",
      lines: ["You have a new private message. Open it to read and reply."],
      cta: "Read the message",
    },
  });
  return row!.id;
}

export async function sendMessage(ctx: Ctx, actor: AccessContext | null, conversationId: string, rawBody: string) {
  const a = await authorize(ctx, actor, USER, "messages.send");
  const body = requireText(rawBody);
  return deliver(ctx, a, conversationId, body, true);
}

export async function editMessage(ctx: Ctx, actor: AccessContext | null, messageId: string, rawBody: string) {
  const a = await authorize(ctx, actor, USER, "messages.edit");
  const [m] = await ctx.db
    .select({
      authorId: directMessages.authorId,
      body: directMessages.body,
      createdAt: directMessages.createdAt,
      hiddenAt: directMessages.hiddenAt,
      conversationId: directMessages.conversationId,
    })
    .from(directMessages)
    .where(eq(directMessages.id, messageId));
  if (!m || m.authorId !== a.userId) throw new CommsError("not_found", "Message not found.");
  if (m.hiddenAt) throw new CommsError("not_allowed", "This message was removed.");
  if (!canEditOwn(m.createdAt, ctx.now()))
    throw new CommsError("edit_window_closed", "Messages can only be edited for 15 minutes after sending.");
  const body = requireText(rawBody);
  if (body !== m.body) {
    await ctx.db.transaction(async (tx) => {
      await tx.insert(messageRevisions).values({ targetType: "direct_message", targetId: messageId, body: m.body, revisedBy: a.userId });
      await tx.update(directMessages).set({ body, editedAt: ctx.now() }).where(eq(directMessages.id, messageId));
    });
    await writeAudit(ctx, { action: "comms.message.edited", actorId: a.userId, entityType: "direct_message", entityId: messageId });
  }
  return m.conversationId;
}

/** A conversation for one of its two participants; opening it marks it read. */
export async function getConversation(ctx: Ctx, actor: AccessContext | null, id: string) {
  const a = await authorize(ctx, actor, USER, "messages.get");
  const c = await loadConversation(ctx, a, id);
  const people = await ctx.db
    .select({ id: users.id, name: users.displayName })
    .from(users)
    .where(or(eq(users.id, c.learnerId), eq(users.id, c.staffId)));
  const nameOf = (uid: string) => people.find((p) => p.id === uid)?.name ?? "";
  const rows = await ctx.db
    .select({
      id: directMessages.id,
      authorId: directMessages.authorId,
      body: directMessages.body,
      createdAt: directMessages.createdAt,
      editedAt: directMessages.editedAt,
      hiddenAt: directMessages.hiddenAt,
    })
    .from(directMessages)
    .where(eq(directMessages.conversationId, id))
    .orderBy(asc(directMessages.createdAt));
  const now = ctx.now();
  await ctx.db
    .update(conversations)
    .set(c.side === "learner" ? { learnerReadAt: now } : { staffReadAt: now })
    .where(eq(conversations.id, id));
  await markReadByLink(ctx, a.userId, conversationLink(id, c.side));
  return {
    id: c.id,
    side: c.side,
    cohortName: c.cohortName,
    other: { name: nameOf(c.side === "learner" ? c.staffId : c.learnerId), role: c.side === "learner" ? c.staffRole : "learner" },
    messages: rows.map((r) => {
      const mine = r.authorId === a.userId;
      const hidden = r.hiddenAt !== null;
      return {
        id: r.id,
        mine,
        author: nameOf(r.authorId),
        body: hidden ? null : r.body,
        hidden,
        edited: r.editedAt !== null,
        createdAt: r.createdAt,
        canEdit: mine && !hidden && canEditOwn(r.createdAt, now),
        // Learners can report a message they received.
        canReport: !mine && !hidden && c.side === "learner",
      };
    }),
  };
}

const lastBody = sql<string | null>`(select m.body from direct_messages m where m.conversation_id = ${conversations.id} and m.hidden_at is null order by m.created_at desc limit 1)`;

export async function listLearnerConversations(ctx: Ctx, actor: AccessContext | null) {
  const a = await authorize(ctx, actor, USER, "messages.learnerList");
  return ctx.db
    .select({
      id: conversations.id,
      otherName: users.displayName,
      role: conversations.staffRole,
      cohortName: cohorts.name,
      lastMessageAt: conversations.lastMessageAt,
      unread: sql<boolean>`${conversations.learnerReadAt} is null or ${conversations.learnerReadAt} < ${conversations.lastMessageAt}`,
      preview: lastBody,
    })
    .from(conversations)
    .innerJoin(users, eq(users.id, conversations.staffId))
    .innerJoin(cohorts, eq(cohorts.id, conversations.cohortId))
    .where(eq(conversations.learnerId, a.userId))
    .orderBy(desc(conversations.lastMessageAt));
}

export async function listStaffConversations(ctx: Ctx, actor: AccessContext | null) {
  const a = await authorize(ctx, actor, STAFF, "messages.staffList");
  return ctx.db
    .select({
      id: conversations.id,
      otherName: users.displayName,
      role: conversations.staffRole,
      cohortName: cohorts.name,
      lastMessageAt: conversations.lastMessageAt,
      unread: sql<boolean>`${conversations.staffReadAt} is null or ${conversations.staffReadAt} < ${conversations.lastMessageAt}`,
      preview: lastBody,
    })
    .from(conversations)
    .innerJoin(users, eq(users.id, conversations.learnerId))
    .innerJoin(cohorts, eq(cohorts.id, conversations.cohortId))
    .where(eq(conversations.staffId, a.userId))
    .orderBy(desc(conversations.lastMessageAt));
}

/** Sidebar badge: staff conversations with unread messages. */
export async function unreadStaffConversations(ctx: Pick<ServerCtx, "db">, userId: string): Promise<number> {
  const [row] = await ctx.db
    .select({ n: sql<number>`count(*)::int` })
    .from(conversations)
    .where(
      and(
        eq(conversations.staffId, userId),
        sql`(${conversations.staffReadAt} is null or ${conversations.staffReadAt} < ${conversations.lastMessageAt})`,
      ),
    );
  return row?.n ?? 0;
}

/** Staff compose screen: the learner behind an enrolment, if the actor may message them (facilitator or assessor of the cohort). */
export async function staffMessageTarget(ctx: Ctx, actor: AccessContext | null, enrolmentId: string) {
  const a = await authorize(ctx, actor, STAFF, "messages.staffTarget");
  const [row] = await ctx.db
    .select({ cohortId: enrolments.cohortId, learnerId: enrolments.userId, name: users.displayName, cohortName: cohorts.name })
    .from(enrolments)
    .innerJoin(users, eq(users.id, enrolments.userId))
    .innerJoin(cohorts, eq(cohorts.id, enrolments.cohortId))
    .where(and(eq(enrolments.id, enrolmentId), eq(enrolments.status, "active")));
  if (!row || row.learnerId === a.userId) throw new CommsError("not_found", "Learner not found.");
  for (const r of MESSAGE_STAFF_ROLES) {
    if (a.roles.has(r) && inScope(await cohortScope(ctx, a, [r]), row.cohortId)) return { name: row.name, cohortName: row.cohortName };
  }
  throw new CommsError("not_found", "Learner not found.");
}
