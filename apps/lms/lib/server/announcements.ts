import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { announcements, cohorts, users } from "db";
import type { AccessContext, Requirement } from "@/lib/access";
import { MAX_TITLE } from "@/lib/comms";
import { writeAudit } from "./audit";
import { authorize } from "./auth";
import type { ServerCtx } from "./context";
import { CommsError, cohortLearnerIds, enforcePostLimit, learnerCohorts, requireText } from "./comms";
import { markReadByLink, notify } from "./notify";
import { assertCohortScope } from "./staffScope";

/**
 * Cohort announcements (design.md §14, 2026-11-08): facilitators and SDP
 * admins post to one cohort and may pin one announcement per cohort. Every
 * active learner in the cohort gets a notification, emailed per preferences.
 */

export const ANNOUNCE_ROLES = ["facilitator", "sdp_admin"] as const;
const STAFF: Requirement = { kind: "roles", anyOf: ANNOUNCE_ROLES, stepUp: false };
const USER: Requirement = { kind: "user" };

type Ctx = ServerCtx;

export async function listCohortAnnouncements(ctx: Ctx, actor: AccessContext | null, cohortId: string) {
  const a = await authorize(ctx, actor, STAFF, "announcements.list");
  await assertCohortScope(ctx, a, ANNOUNCE_ROLES, cohortId, "announcements.list");
  return ctx.db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      publishedAt: announcements.publishedAt,
      pinnedAt: announcements.pinnedAt,
      author: users.displayName,
    })
    .from(announcements)
    .innerJoin(users, eq(users.id, announcements.authorId))
    .where(eq(announcements.cohortId, cohortId))
    .orderBy(sql`${announcements.pinnedAt} DESC NULLS LAST`, desc(announcements.publishedAt));
}

export async function publishAnnouncement(
  ctx: Ctx,
  actor: AccessContext | null,
  input: { cohortId: string; title: string; body: string; pin: boolean },
): Promise<string> {
  const a = await authorize(ctx, actor, STAFF, "announcements.publish");
  await assertCohortScope(ctx, a, ANNOUNCE_ROLES, input.cohortId, "announcements.publish");
  const title = requireText(input.title, { max: MAX_TITLE, label: "The title" });
  const body = requireText(input.body, { max: 20000, label: "The announcement" });
  await enforcePostLimit(ctx, a);
  const now = ctx.now();
  const id = await ctx.db.transaction(async (tx) => {
    if (input.pin) {
      await tx.update(announcements).set({ pinnedAt: null }).where(eq(announcements.cohortId, input.cohortId));
    }
    const [row] = await tx
      .insert(announcements)
      .values({ cohortId: input.cohortId, authorId: a.userId, title, body, publishedAt: now, pinnedAt: input.pin ? now : null })
      .returning({ id: announcements.id });
    return row!.id;
  });
  await writeAudit(ctx, {
    action: "comms.announcement.published",
    actorId: a.userId,
    entityType: "announcement",
    entityId: id,
    after: { cohortId: input.cohortId, pinned: input.pin },
  });
  const [cohort] = await ctx.db.select({ name: cohorts.name }).from(cohorts).where(eq(cohorts.id, input.cohortId));
  await notify(ctx, await cohortLearnerIds(ctx, input.cohortId), {
    kind: "announcement",
    title: `Announcement: ${title}`,
    link: `/messages/announcements/${id}`,
    email: {
      subject: `New announcement: ${title}`,
      lines: [`There is a new announcement for ${cohort?.name ?? "your cohort"}: "${title}".`],
      cta: "Read the announcement",
    },
  });
  return id;
}

/** Pin (replacing any other pin in the cohort) or unpin an announcement. */
export async function setAnnouncementPinned(ctx: Ctx, actor: AccessContext | null, id: string, pinned: boolean) {
  const a = await authorize(ctx, actor, STAFF, "announcements.pin");
  const [row] = await ctx.db
    .select({ cohortId: announcements.cohortId })
    .from(announcements)
    .where(eq(announcements.id, id));
  if (!row) throw new CommsError("not_found", "Announcement not found.");
  await assertCohortScope(ctx, a, ANNOUNCE_ROLES, row.cohortId, "announcements.pin");
  await ctx.db.transaction(async (tx) => {
    await tx.update(announcements).set({ pinnedAt: null }).where(eq(announcements.cohortId, row.cohortId));
    if (pinned) await tx.update(announcements).set({ pinnedAt: ctx.now() }).where(eq(announcements.id, id));
  });
  await writeAudit(ctx, {
    action: pinned ? "comms.announcement.pinned" : "comms.announcement.unpinned",
    actorId: a.userId,
    entityType: "announcement",
    entityId: id,
  });
}

// --- Learner ----------------------------------------------------------------

export async function listLearnerAnnouncements(ctx: Ctx, actor: AccessContext | null, limit = 100) {
  const a = await authorize(ctx, actor, USER, "announcements.learnerList");
  const mine = (await learnerCohorts(ctx, a.userId)).map((c) => c.cohortId);
  if (mine.length === 0) return [];
  return ctx.db
    .select({
      id: announcements.id,
      title: announcements.title,
      publishedAt: announcements.publishedAt,
      pinnedAt: announcements.pinnedAt,
      cohortName: cohorts.name,
      unread: sql<boolean>`exists (select 1 from notifications n where n.user_id = ${a.userId} and n.read_at is null and n.link = '/messages/announcements/' || ${announcements.id}::text)`,
    })
    .from(announcements)
    .innerJoin(cohorts, eq(cohorts.id, announcements.cohortId))
    .where(and(inArray(announcements.cohortId, mine), isNotNull(announcements.publishedAt)))
    .orderBy(sql`${announcements.pinnedAt} DESC NULLS LAST`, desc(announcements.publishedAt))
    .limit(limit);
}

export async function getLearnerAnnouncement(ctx: Ctx, actor: AccessContext | null, id: string) {
  const a = await authorize(ctx, actor, USER, "announcements.learnerGet");
  const mine = (await learnerCohorts(ctx, a.userId)).map((c) => c.cohortId);
  const [row] = mine.length
    ? await ctx.db
        .select({
          id: announcements.id,
          title: announcements.title,
          body: announcements.body,
          publishedAt: announcements.publishedAt,
          pinnedAt: announcements.pinnedAt,
          author: users.displayName,
          cohortName: cohorts.name,
        })
        .from(announcements)
        .innerJoin(users, eq(users.id, announcements.authorId))
        .innerJoin(cohorts, eq(cohorts.id, announcements.cohortId))
        .where(and(eq(announcements.id, id), inArray(announcements.cohortId, mine), isNotNull(announcements.publishedAt)))
    : [];
  if (!row) throw new CommsError("not_found", "Announcement not found.");
  await markReadByLink(ctx, a.userId, `/messages/announcements/${id}`);
  return row;
}
