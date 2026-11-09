import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { cohorts, contentReports, conversations, directMessages, discussionPosts, discussionThreads, users } from "db";
import type { AccessContext, Requirement } from "@/lib/access";
import { writeAudit } from "./audit";
import { authorize } from "./auth";
import type { ServerCtx } from "./context";
import { CommsError, enforceLimit, learnerCohorts } from "./comms";
import { RATE_LIMITS } from "./ratelimit";
import { cohortScope, inScope } from "./staffScope";

/**
 * Reports (design.md §14, 2026-11-08): a learner reports a discussion reply
 * or a message they received, with a reason. Staff hide the item (others see
 * "Removed by a facilitator"; the original is kept for the log) or dismiss
 * the report. Discussion reports go to the cohort's facilitators and SDP
 * admins; message reports go to SDP admins only, because the facilitator in
 * the conversation may be the person reported.
 */

export const REPORT_REASONS = ["offensive", "harassment", "spam", "personal_info", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const REASON_LABEL: Record<ReportReason, string> = {
  offensive: "Offensive or hurtful",
  harassment: "Bullying or harassment",
  spam: "Spam or advertising",
  personal_info: "Shares someone's personal information",
  other: "Something else",
};

export const REPORT_STAFF = ["facilitator", "sdp_admin"] as const;
const STAFF: Requirement = { kind: "roles", anyOf: REPORT_STAFF, stepUp: false };
const USER: Requirement = { kind: "user" };

type Ctx = ServerCtx;
type Target = "discussion_post" | "direct_message";

async function resolveTarget(ctx: Ctx, type: Target, id: string) {
  if (type === "discussion_post") {
    const [p] = await ctx.db
      .select({ authorId: discussionPosts.authorId, cohortId: discussionThreads.cohortId, hiddenAt: discussionPosts.hiddenAt })
      .from(discussionPosts)
      .innerJoin(discussionThreads, eq(discussionThreads.id, discussionPosts.threadId))
      .where(eq(discussionPosts.id, id));
    return p ? { ...p, learnerId: null as string | null } : null;
  }
  const [m] = await ctx.db
    .select({
      authorId: directMessages.authorId,
      cohortId: conversations.cohortId,
      hiddenAt: directMessages.hiddenAt,
      learnerId: conversations.learnerId,
    })
    .from(directMessages)
    .innerJoin(conversations, eq(conversations.id, directMessages.conversationId))
    .where(eq(directMessages.id, id));
  return m ?? null;
}

export async function reportContent(
  ctx: Ctx,
  actor: AccessContext | null,
  input: { targetType: string; targetId: string; reason: string; note?: string },
): Promise<void> {
  const a = await authorize(ctx, actor, USER, "reports.create");
  const type = input.targetType as Target;
  if (type !== "discussion_post" && type !== "direct_message") throw new CommsError("invalid", "Unknown item.");
  if (!REPORT_REASONS.includes(input.reason as ReportReason)) throw new CommsError("invalid", "Choose a reason.");
  const t = await resolveTarget(ctx, type, input.targetId);
  const mine = await learnerCohorts(ctx, a.userId);
  const canSee =
    t &&
    t.authorId !== a.userId &&
    (type === "discussion_post" ? mine.some((c) => c.cohortId === t.cohortId) : t.learnerId === a.userId);
  if (!t || !canSee) throw new CommsError("not_found", "That item can't be reported.");
  await enforceLimit(ctx, RATE_LIMITS.contentReport, a.userId, "You've sent a lot of reports today. Please try again tomorrow.");
  const note = String(input.note ?? "").trim().slice(0, 500) || null;
  const [row] = await ctx.db
    .insert(contentReports)
    .values({ cohortId: t.cohortId, targetType: type, targetId: input.targetId, reporterId: a.userId, reason: input.reason as ReportReason, note })
    .onConflictDoNothing()
    .returning({ id: contentReports.id });
  if (row) {
    await writeAudit(ctx, {
      action: "comms.report.created",
      actorId: a.userId,
      entityType: "content_report",
      entityId: row.id,
      after: { targetType: type, reason: input.reason },
    });
  }
}

/** Which reports this staff member reviews: discussion reports in scope; message reports for SDP admins. */
async function reviewScope(ctx: Ctx, a: AccessContext) {
  const scope = await cohortScope(ctx, a, REPORT_STAFF);
  const admin = a.roles.has("sdp_admin");
  return (r: { cohortId: string; targetType: Target }) =>
    r.targetType === "direct_message" ? admin : inScope(scope, r.cohortId);
}

export async function listReports(ctx: Ctx, actor: AccessContext | null, status: "open" | "closed" = "open") {
  const a = await authorize(ctx, actor, STAFF, "reports.list");
  const visible = await reviewScope(ctx, a);
  const rows = await ctx.db
    .select({
      id: contentReports.id,
      cohortId: contentReports.cohortId,
      cohortName: cohorts.name,
      targetType: contentReports.targetType,
      targetId: contentReports.targetId,
      reason: contentReports.reason,
      note: contentReports.note,
      status: contentReports.status,
      createdAt: contentReports.createdAt,
      reviewedAt: contentReports.reviewedAt,
    })
    .from(contentReports)
    .innerJoin(cohorts, eq(cohorts.id, contentReports.cohortId))
    .where(status === "open" ? eq(contentReports.status, "open") : sql`${contentReports.status} <> 'open'`)
    .orderBy(desc(contentReports.createdAt))
    .limit(200);
  const mine = rows.filter(visible);
  const postIds = mine.filter((r) => r.targetType === "discussion_post").map((r) => r.targetId);
  const msgIds = mine.filter((r) => r.targetType === "direct_message").map((r) => r.targetId);
  const posts = postIds.length
    ? await ctx.db
        .select({
          id: discussionPosts.id,
          body: discussionPosts.body,
          author: users.displayName,
          createdAt: discussionPosts.createdAt,
          hiddenAt: discussionPosts.hiddenAt,
          threadId: discussionPosts.threadId,
          threadTitle: discussionThreads.title,
        })
        .from(discussionPosts)
        .innerJoin(users, eq(users.id, discussionPosts.authorId))
        .innerJoin(discussionThreads, eq(discussionThreads.id, discussionPosts.threadId))
        .where(inArray(discussionPosts.id, postIds))
    : [];
  const msgs = msgIds.length
    ? await ctx.db
        .select({
          id: directMessages.id,
          body: directMessages.body,
          author: users.displayName,
          createdAt: directMessages.createdAt,
          hiddenAt: directMessages.hiddenAt,
        })
        .from(directMessages)
        .innerJoin(users, eq(users.id, directMessages.authorId))
        .where(inArray(directMessages.id, msgIds))
    : [];
  return mine.map((r) => {
    const item =
      r.targetType === "discussion_post"
        ? posts.find((p) => p.id === r.targetId)
        : msgs.find((m) => m.id === r.targetId);
    return {
      ...r,
      reasonLabel: REASON_LABEL[r.reason],
      item: item
        ? {
            body: item.body,
            author: item.author,
            createdAt: item.createdAt,
            hidden: item.hiddenAt !== null,
            where: "threadTitle" in item ? `Discussion: ${item.threadTitle}` : "Private message",
            threadId: "threadId" in item ? item.threadId : null,
          }
        : null,
    };
  });
}

export async function openReportCount(ctx: Ctx, actor: AccessContext): Promise<number> {
  if (!REPORT_STAFF.some((r) => actor.roles.has(r))) return 0;
  const visible = await reviewScope(ctx, actor);
  const rows = await ctx.db
    .select({ cohortId: contentReports.cohortId, targetType: contentReports.targetType })
    .from(contentReports)
    .where(eq(contentReports.status, "open"));
  return rows.filter(visible).length;
}

/** Hide the reported item (closing every open report on it) or dismiss this report. */
export async function resolveReport(ctx: Ctx, actor: AccessContext | null, reportId: string, outcome: "hide" | "dismiss") {
  const a = await authorize(ctx, actor, STAFF, "reports.resolve");
  const [r] = await ctx.db
    .select({
      id: contentReports.id,
      cohortId: contentReports.cohortId,
      targetType: contentReports.targetType,
      targetId: contentReports.targetId,
      status: contentReports.status,
    })
    .from(contentReports)
    .where(eq(contentReports.id, reportId));
  if (!r || !(await reviewScope(ctx, a))(r)) throw new CommsError("not_found", "Report not found.");
  if (r.status !== "open") throw new CommsError("invalid", "This report has already been reviewed.");
  const now = ctx.now();
  await ctx.db.transaction(async (tx) => {
    if (outcome === "hide") {
      const table = r.targetType === "discussion_post" ? discussionPosts : directMessages;
      await tx
        .update(table)
        .set({ hiddenAt: now, hiddenBy: a.userId })
        .where(and(eq(table.id, r.targetId), sql`${table.hiddenAt} IS NULL`));
      await tx
        .update(contentReports)
        .set({ status: "hidden", reviewedBy: a.userId, reviewedAt: now })
        .where(
          and(eq(contentReports.targetType, r.targetType), eq(contentReports.targetId, r.targetId), eq(contentReports.status, "open")),
        );
    } else {
      await tx
        .update(contentReports)
        .set({ status: "dismissed", reviewedBy: a.userId, reviewedAt: now })
        .where(eq(contentReports.id, reportId));
    }
  });
  await writeAudit(ctx, {
    action: outcome === "hide" ? "comms.report.hidden" : "comms.report.dismissed",
    actorId: a.userId,
    entityType: "content_report",
    entityId: reportId,
    after: { targetType: r.targetType },
  });
}
