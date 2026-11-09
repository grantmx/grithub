import { and, asc, desc, eq, sql } from "drizzle-orm";
import { cohorts, discussionPosts, discussionThreads, messageRevisions, modules, users } from "db";
import type { AccessContext, Requirement } from "@/lib/access";
import { MAX_TITLE, canEditOwn } from "@/lib/comms";
import { writeAudit } from "./audit";
import { authorize } from "./auth";
import type { ServerCtx } from "./context";
import { CommsError, cohortLearnerIds, enforcePostLimit, learnerCohorts, requireText } from "./comms";
import { markReadByLink, notify } from "./notify";
import { assertCohortScope, cohortScope, inScope } from "./staffScope";

/**
 * Discussion boards (design.md §14, 2026-11-08): one board per module per
 * cohort. Only facilitators (and SDP admins) start threads; everyone in the
 * cohort replies, nested one level. Facilitators can pin a thread. Authors
 * may edit a reply for 15 minutes (earlier text kept); nobody self-deletes.
 * Hidden replies (after a report) show as "Removed by a facilitator".
 */

export const DISCUSSION_STAFF = ["facilitator", "sdp_admin"] as const;
const STAFF: Requirement = { kind: "roles", anyOf: DISCUSSION_STAFF, stepUp: false };
const USER: Requirement = { kind: "user" };

type Ctx = ServerCtx;

export const threadLink = (threadId: string, staff: boolean) =>
  staff ? `/staff/discussions/thread/${threadId}` : `/learn/discuss/thread/${threadId}`;

async function moduleInCohort(ctx: Ctx, cohortId: string, moduleId: string) {
  const [row] = await ctx.db
    .select({ id: modules.id, code: modules.code, title: modules.title, cohortName: cohorts.name })
    .from(modules)
    .innerJoin(cohorts, eq(cohorts.qualificationId, modules.qualificationId))
    .where(and(eq(cohorts.id, cohortId), eq(modules.id, moduleId)));
  if (!row) throw new CommsError("not_found", "That module isn't part of this cohort's programme.");
  return row;
}

const threadColumns = {
  id: discussionThreads.id,
  title: discussionThreads.title,
  pinnedAt: discussionThreads.pinnedAt,
  lastPostAt: discussionThreads.lastPostAt,
  createdAt: discussionThreads.createdAt,
  author: users.displayName,
  replies: sql<number>`(select count(*)::int from discussion_posts p where p.thread_id = ${discussionThreads.id})`,
};

// --- Staff --------------------------------------------------------------------

/** Modules of the cohort's programme with their thread counts. */
export async function listBoards(ctx: Ctx, actor: AccessContext | null, cohortId: string) {
  const a = await authorize(ctx, actor, STAFF, "discussions.boards");
  await assertCohortScope(ctx, a, DISCUSSION_STAFF, cohortId, "discussions.boards");
  return boardsFor(ctx, cohortId);
}

async function boardsFor(ctx: Ctx, cohortId: string) {
  return ctx.db
    .select({
      moduleId: modules.id,
      code: modules.code,
      title: modules.title,
      threads: sql<number>`(select count(*)::int from discussion_threads t where t.cohort_id = ${cohortId} and t.module_id = ${modules.id})`,
      lastPostAt: sql<Date | null>`(select max(t.last_post_at) from discussion_threads t where t.cohort_id = ${cohortId} and t.module_id = ${modules.id})`,
    })
    .from(modules)
    .innerJoin(cohorts, eq(cohorts.qualificationId, modules.qualificationId))
    .where(eq(cohorts.id, cohortId))
    .orderBy(asc(modules.code));
}

export async function listBoardThreads(ctx: Ctx, actor: AccessContext | null, cohortId: string, moduleId: string) {
  const a = await authorize(ctx, actor, STAFF, "discussions.threads");
  await assertCohortScope(ctx, a, DISCUSSION_STAFF, cohortId, "discussions.threads");
  const mod = await moduleInCohort(ctx, cohortId, moduleId);
  const threads = await threadsFor(ctx, cohortId, moduleId);
  return { module: mod, threads };
}

async function threadsFor(ctx: Ctx, cohortId: string, moduleId: string) {
  return ctx.db
    .select(threadColumns)
    .from(discussionThreads)
    .innerJoin(users, eq(users.id, discussionThreads.authorId))
    .where(and(eq(discussionThreads.cohortId, cohortId), eq(discussionThreads.moduleId, moduleId)))
    .orderBy(sql`${discussionThreads.pinnedAt} DESC NULLS LAST`, desc(discussionThreads.lastPostAt));
}

export async function createThread(
  ctx: Ctx,
  actor: AccessContext | null,
  input: { cohortId: string; moduleId: string; title: string; body: string },
): Promise<string> {
  const a = await authorize(ctx, actor, STAFF, "discussions.createThread");
  await assertCohortScope(ctx, a, DISCUSSION_STAFF, input.cohortId, "discussions.createThread");
  const mod = await moduleInCohort(ctx, input.cohortId, input.moduleId);
  const title = requireText(input.title, { max: MAX_TITLE, label: "The title" });
  const body = requireText(input.body, { label: "The opening post" });
  await enforcePostLimit(ctx, a);
  const [row] = await ctx.db
    .insert(discussionThreads)
    .values({ cohortId: input.cohortId, moduleId: input.moduleId, authorId: a.userId, title, body })
    .returning({ id: discussionThreads.id });
  await writeAudit(ctx, {
    action: "comms.thread.created",
    actorId: a.userId,
    entityType: "discussion_thread",
    entityId: row!.id,
    after: { cohortId: input.cohortId, moduleId: input.moduleId },
  });
  await notify(ctx, await cohortLearnerIds(ctx, input.cohortId), {
    kind: "discussion",
    title: `New discussion in ${mod.code}: ${title}`,
    link: threadLink(row!.id, false),
    email: {
      subject: `New discussion in ${mod.code}`,
      lines: [`Your facilitator started a discussion in ${mod.code}: "${title}".`],
      cta: "Join the discussion",
    },
  });
  return row!.id;
}

export async function setThreadPinned(ctx: Ctx, actor: AccessContext | null, threadId: string, pinned: boolean) {
  const a = await authorize(ctx, actor, STAFF, "discussions.pin");
  const thread = await loadThread(ctx, threadId);
  await assertCohortScope(ctx, a, DISCUSSION_STAFF, thread.cohortId, "discussions.pin");
  await ctx.db
    .update(discussionThreads)
    .set({ pinnedAt: pinned ? ctx.now() : null })
    .where(eq(discussionThreads.id, threadId));
  await writeAudit(ctx, {
    action: "comms.thread.pinned",
    actorId: a.userId,
    entityType: "discussion_thread",
    entityId: threadId,
    after: { pinned },
  });
}

// --- Learner ------------------------------------------------------------------

/** Thread counts per module for the learner's cohort in a programme (programme page). */
export async function learnerBoardSummaries(ctx: Ctx, actor: AccessContext | null, qualificationId: string) {
  const a = await authorize(ctx, actor, USER, "discussions.summaries");
  const cohort = (await learnerCohorts(ctx, a.userId)).find((c) => c.qualificationId === qualificationId);
  if (!cohort) return new Map<string, number>();
  const rows = await boardsFor(ctx, cohort.cohortId);
  return new Map(rows.map((r) => [r.moduleId, r.threads]));
}

export async function learnerBoard(ctx: Ctx, actor: AccessContext | null, moduleId: string) {
  const a = await authorize(ctx, actor, USER, "discussions.learnerBoard");
  const [mod] = await ctx.db
    .select({ qualificationId: modules.qualificationId })
    .from(modules)
    .where(eq(modules.id, moduleId));
  const cohort = mod ? (await learnerCohorts(ctx, a.userId)).find((c) => c.qualificationId === mod.qualificationId) : undefined;
  if (!cohort) throw new CommsError("not_found", "Discussion not found.");
  const info = await moduleInCohort(ctx, cohort.cohortId, moduleId);
  return { module: info, qualificationId: cohort.qualificationId, threads: await threadsFor(ctx, cohort.cohortId, moduleId) };
}

// --- Threads (staff and learners) ---------------------------------------------

async function loadThread(ctx: Ctx, threadId: string) {
  const [t] = await ctx.db
    .select({
      id: discussionThreads.id,
      cohortId: discussionThreads.cohortId,
      moduleId: discussionThreads.moduleId,
      authorId: discussionThreads.authorId,
      title: discussionThreads.title,
      body: discussionThreads.body,
      pinnedAt: discussionThreads.pinnedAt,
      createdAt: discussionThreads.createdAt,
      author: users.displayName,
      moduleCode: modules.code,
      moduleTitle: modules.title,
      qualificationId: modules.qualificationId,
      cohortName: cohorts.name,
    })
    .from(discussionThreads)
    .innerJoin(users, eq(users.id, discussionThreads.authorId))
    .innerJoin(modules, eq(modules.id, discussionThreads.moduleId))
    .innerJoin(cohorts, eq(cohorts.id, discussionThreads.cohortId))
    .where(eq(discussionThreads.id, threadId));
  if (!t) throw new CommsError("not_found", "Discussion not found.");
  return t;
}

/** Who may read and post: learners enrolled in the cohort, and staff with the cohort in scope. */
async function threadAccess(ctx: Ctx, a: AccessContext, cohortId: string): Promise<"learner" | "staff" | null> {
  if (DISCUSSION_STAFF.some((r) => a.roles.has(r))) {
    if (inScope(await cohortScope(ctx, a, DISCUSSION_STAFF), cohortId)) return "staff";
  }
  if ((await learnerCohorts(ctx, a.userId)).some((c) => c.cohortId === cohortId)) return "learner";
  return null;
}

export type ThreadPost = {
  id: string;
  author: string;
  authorIsStaff: boolean;
  body: string | null;
  hidden: boolean;
  edited: boolean;
  createdAt: Date;
  mine: boolean;
  canEdit: boolean;
  canReport: boolean;
  replies: ThreadPost[];
};

export async function getThread(ctx: Ctx, actor: AccessContext | null, threadId: string) {
  const a = await authorize(ctx, actor, USER, "discussions.thread");
  const thread = await loadThread(ctx, threadId);
  const as = await threadAccess(ctx, a, thread.cohortId);
  if (!as) throw new CommsError("not_found", "Discussion not found.");
  const rows = await ctx.db
    .select({
      id: discussionPosts.id,
      parentId: discussionPosts.parentId,
      authorId: discussionPosts.authorId,
      author: users.displayName,
      body: discussionPosts.body,
      editedAt: discussionPosts.editedAt,
      hiddenAt: discussionPosts.hiddenAt,
      createdAt: discussionPosts.createdAt,
      authorIsStaff: sql<boolean>`exists (select 1 from role_grants g where g.user_id = ${discussionPosts.authorId})`,
    })
    .from(discussionPosts)
    .innerJoin(users, eq(users.id, discussionPosts.authorId))
    .where(eq(discussionPosts.threadId, threadId))
    .orderBy(asc(discussionPosts.createdAt));
  const now = ctx.now();
  const toPost = (r: (typeof rows)[number]): ThreadPost => {
    const mine = r.authorId === a.userId;
    const hidden = r.hiddenAt !== null;
    return {
      id: r.id,
      author: r.author,
      authorIsStaff: r.authorIsStaff,
      body: hidden ? null : r.body,
      hidden,
      edited: r.editedAt !== null,
      createdAt: r.createdAt,
      mine,
      canEdit: mine && !hidden && canEditOwn(r.createdAt, now),
      canReport: !mine && !hidden && as === "learner",
      replies: [],
    };
  };
  const top: ThreadPost[] = [];
  const byId = new Map<string, ThreadPost>();
  for (const r of rows) {
    const p = toPost(r);
    byId.set(r.id, p);
    if (!r.parentId) top.push(p);
  }
  for (const r of rows) if (r.parentId) byId.get(r.parentId)?.replies.push(byId.get(r.id)!);
  await markReadByLink(ctx, a.userId, threadLink(threadId, as === "staff"));
  return { thread, posts: top, as, canPin: as === "staff" };
}

export async function replyToThread(
  ctx: Ctx,
  actor: AccessContext | null,
  input: { threadId: string; body: string; parentId?: string | null },
): Promise<string> {
  const a = await authorize(ctx, actor, USER, "discussions.reply");
  const thread = await loadThread(ctx, input.threadId);
  const as = await threadAccess(ctx, a, thread.cohortId);
  if (!as) throw new CommsError("not_found", "Discussion not found.");
  const body = requireText(input.body, { label: "Your reply" });
  let parentAuthor: string | null = null;
  if (input.parentId) {
    const [parent] = await ctx.db
      .select({ threadId: discussionPosts.threadId, parentId: discussionPosts.parentId, authorId: discussionPosts.authorId })
      .from(discussionPosts)
      .where(eq(discussionPosts.id, input.parentId));
    if (!parent || parent.threadId !== input.threadId) throw new CommsError("invalid", "That reply isn't in this discussion.");
    if (parent.parentId) throw new CommsError("invalid", "You can reply to a post, not to a reply.");
    parentAuthor = parent.authorId;
  }
  await enforcePostLimit(ctx, a);
  const now = ctx.now();
  const [row] = await ctx.db
    .insert(discussionPosts)
    .values({ threadId: input.threadId, parentId: input.parentId || null, authorId: a.userId, body })
    .returning({ id: discussionPosts.id });
  await ctx.db.update(discussionThreads).set({ lastPostAt: now }).where(eq(discussionThreads.id, input.threadId));
  await writeAudit(ctx, {
    action: "comms.post.created",
    actorId: a.userId,
    entityType: "discussion_post",
    entityId: row!.id,
    after: { threadId: input.threadId, nested: Boolean(input.parentId) },
  });
  // Notify the thread's facilitator and the author of the post replied to.
  const email = {
    subject: `New reply in ${thread.moduleCode}`,
    lines: [`There is a new reply in the ${thread.moduleCode} discussion "${thread.title}".`],
    cta: "Read the reply",
  };
  if (thread.authorId !== a.userId) {
    await notify(ctx, [thread.authorId], {
      kind: "discussion",
      title: `New reply in "${thread.title}"`,
      link: threadLink(input.threadId, true),
      email,
    });
  }
  if (parentAuthor && parentAuthor !== a.userId && parentAuthor !== thread.authorId) {
    const parentIsStaff = (await threadAccessForUser(ctx, parentAuthor, thread.cohortId)) === "staff";
    await notify(ctx, [parentAuthor], {
      kind: "discussion",
      title: `Someone replied to you in "${thread.title}"`,
      link: threadLink(input.threadId, parentIsStaff),
      email,
    });
  }
  return row!.id;
}

async function threadAccessForUser(ctx: Ctx, userId: string, cohortId: string) {
  const staff = await ctx.db.execute<{ n: number }>(
    sql`select count(*)::int as n from role_grants where user_id = ${userId} and role in ('facilitator','sdp_admin') and (cohort_id = ${cohortId} or cohort_id is null)`,
  );
  return Number(staff[0]?.n ?? 0) > 0 ? "staff" : "learner";
}

/** Authors edit their own reply within 15 minutes; the earlier text is kept. */
export async function editPost(ctx: Ctx, actor: AccessContext | null, postId: string, rawBody: string) {
  const a = await authorize(ctx, actor, USER, "discussions.edit");
  const [post] = await ctx.db
    .select({
      authorId: discussionPosts.authorId,
      body: discussionPosts.body,
      createdAt: discussionPosts.createdAt,
      hiddenAt: discussionPosts.hiddenAt,
      threadId: discussionPosts.threadId,
    })
    .from(discussionPosts)
    .where(eq(discussionPosts.id, postId));
  if (!post || post.authorId !== a.userId) throw new CommsError("not_found", "Reply not found.");
  if (post.hiddenAt) throw new CommsError("not_allowed", "This reply was removed by a facilitator.");
  if (!canEditOwn(post.createdAt, ctx.now()))
    throw new CommsError("edit_window_closed", "Replies can only be edited for 15 minutes after posting.");
  const body = requireText(rawBody, { label: "Your reply" });
  if (body === post.body) return post.threadId;
  await ctx.db.transaction(async (tx) => {
    await tx.insert(messageRevisions).values({ targetType: "discussion_post", targetId: postId, body: post.body, revisedBy: a.userId });
    await tx.update(discussionPosts).set({ body, editedAt: ctx.now() }).where(eq(discussionPosts.id, postId));
  });
  await writeAudit(ctx, { action: "comms.post.edited", actorId: a.userId, entityType: "discussion_post", entityId: postId });
  return post.threadId;
}
