import { and, asc, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import {
  announcements,
  assessmentAttempts,
  assessmentDays,
  cohorts,
  contentItems,
  enrolments,
  libraryResources,
  modules,
  qualifications,
  sectionProgress,
  sectionQuestionPools,
  sections,
  users,
} from "db";
import type { AccessContext } from "@/lib/access";
import type { ServerCtx } from "./context";

/**
 * Learner-facing reads and progress writes. Every function checks that the
 * learner is enrolled (active enrolment) in the programme the data belongs to.
 */

export class LearningError extends Error {
  constructor(
    public readonly code: "not_enrolled" | "not_found" | "check_required",
    message: string,
  ) {
    super(message);
    this.name = "LearningError";
  }
}

export type SectionState = "not_started" | "in_progress" | "complete";
export type ProgrammeStatus =
  | "not_started"
  | "in_progress"
  | "learning_complete";

export type OutlineSection = { id: string; title: string; state: SectionState };
export type OutlineModule = {
  id: string;
  code: string;
  title: string;
  type: "knowledge" | "practical";
  sections: OutlineSection[];
  completed: number;
};

type ProgressRow = {
  sectionId: string;
  lastViewedAt: Date;
  completedAt: Date | null;
  scrollPercent: number;
};

async function loadOutline(
  ctx: Pick<ServerCtx, "db">,
  qualificationId: string,
  progress: ProgressRow[],
): Promise<OutlineModule[]> {
  const rows = await ctx.db
    .select({
      moduleId: modules.id,
      code: modules.code,
      moduleTitle: modules.title,
      type: modules.type,
      sectionId: sections.id,
      sectionTitle: sections.title,
    })
    .from(modules)
    .leftJoin(sections, eq(sections.moduleId, modules.id))
    .where(eq(modules.qualificationId, qualificationId))
    .orderBy(
      asc(modules.sortOrder),
      asc(modules.code),
      asc(sections.sortOrder),
      asc(sections.title),
    );

  const byId = new Map(progress.map((p) => [p.sectionId, p]));
  const out: OutlineModule[] = [];
  for (const r of rows) {
    let m = out.at(-1);
    if (!m || m.id !== r.moduleId) {
      m = {
        id: r.moduleId,
        code: r.code,
        title: r.moduleTitle,
        type: r.type,
        sections: [],
        completed: 0,
      };
      out.push(m);
    }
    if (!r.sectionId) continue;
    const p = byId.get(r.sectionId);
    const state: SectionState = p?.completedAt
      ? "complete"
      : p
        ? "in_progress"
        : "not_started";
    if (state === "complete") m.completed++;
    m.sections.push({ id: r.sectionId, title: r.sectionTitle ?? "", state });
  }
  return out;
}

async function loadProgress(
  ctx: Pick<ServerCtx, "db">,
  enrolmentId: string,
): Promise<ProgressRow[]> {
  return ctx.db
    .select({
      sectionId: sectionProgress.sectionId,
      lastViewedAt: sectionProgress.lastViewedAt,
      completedAt: sectionProgress.completedAt,
      scrollPercent: sectionProgress.scrollPercent,
    })
    .from(sectionProgress)
    .where(eq(sectionProgress.enrolmentId, enrolmentId));
}

/**
 * Where "Continue" goes: the most recently viewed section; if that one is
 * complete, the next incomplete section after it; with no progress, the first.
 */
export function continueTarget(
  outline: OutlineModule[],
  progress: ProgressRow[],
): { sectionId: string; resume: boolean } | null {
  const flat = outline.flatMap((m) => m.sections);
  if (flat.length === 0) return null;
  const last = [...progress].sort(
    (a, b) => b.lastViewedAt.getTime() - a.lastViewedAt.getTime(),
  )[0];
  if (!last) return { sectionId: flat[0]!.id, resume: false };
  if (!last.completedAt) return { sectionId: last.sectionId, resume: true };
  const idx = flat.findIndex((s) => s.id === last.sectionId);
  const after = [...flat.slice(idx + 1), ...flat.slice(0, Math.max(0, idx))];
  const next = after.find((s) => s.state !== "complete");
  return next
    ? { sectionId: next.id, resume: next.state === "in_progress" }
    : { sectionId: last.sectionId, resume: false };
}

export type ProgrammeSummary = {
  enrolmentId: string;
  cohortName: string;
  qualificationId: string;
  qualificationTitle: string;
  totalSections: number;
  completedSections: number;
  modulesTotal: number;
  modulesLearningComplete: number;
  modulesCompetent: number;
  status: ProgrammeStatus;
  continueTo: { sectionId: string; resume: boolean } | null;
};

/** One card per programme on Home (design-gate decision 2026-11-08). */
export async function listProgrammes(
  ctx: Pick<ServerCtx, "db">,
  actor: AccessContext,
): Promise<ProgrammeSummary[]> {
  const rows = await ctx.db
    .select({
      enrolmentId: enrolments.id,
      cohortName: cohorts.name,
      qualificationId: qualifications.id,
      qualificationTitle: qualifications.title,
    })
    .from(enrolments)
    .innerJoin(cohorts, eq(cohorts.id, enrolments.cohortId))
    .innerJoin(qualifications, eq(qualifications.id, cohorts.qualificationId))
    .where(
      and(eq(enrolments.userId, actor.userId), eq(enrolments.status, "active")),
    )
    .orderBy(asc(qualifications.title));

  const result: ProgrammeSummary[] = [];
  for (const r of rows) {
    const progress = await loadProgress(ctx, r.enrolmentId);
    const outline = await loadOutline(ctx, r.qualificationId, progress);
    const totalSections = outline.reduce((n, m) => n + m.sections.length, 0);
    const completedSections = outline.reduce((n, m) => n + m.completed, 0);
    const modulesLearningComplete = outline.filter(
      (m) => m.sections.length > 0 && m.completed === m.sections.length,
    ).length;
    const modulesCompetent = await countCompetentModules(ctx, r.enrolmentId);
    result.push({
      ...r,
      totalSections,
      completedSections,
      modulesTotal: outline.length,
      modulesLearningComplete,
      modulesCompetent,
      status:
        completedSections === 0 && progress.length === 0
          ? "not_started"
          : totalSections > 0 && completedSections === totalSections
            ? "learning_complete"
            : "in_progress",
      continueTo: continueTarget(outline, progress),
    });
  }
  return result;
}

/** Modules with a RELEASED "competent" decision (released only after moderation). */
async function countCompetentModules(
  ctx: Pick<ServerCtx, "db">,
  enrolmentId: string,
): Promise<number> {
  const rows = await ctx.db.execute<{ n: number }>(sql`
    select count(distinct module_id)::int as n from (
      select b.module_id
        from assessment_decisions d
        join assessment_attempts a on a.id = d.attempt_id
        join assessment_blueprints b on b.id = a.blueprint_id
       where a.enrolment_id = ${enrolmentId} and d.released_at is not null and d.outcome = 'competent'
      union
      select pb.module_id
        from assessment_decisions d
        join submissions s on s.id = d.submission_id
        join brief_variants v on v.id = s.brief_variant_id
        join practical_briefs pb on pb.id = v.brief_id
       where s.enrolment_id = ${enrolmentId} and d.released_at is not null and d.outcome = 'competent'
    ) m
  `);
  return Number(rows[0]?.n ?? 0);
}

/** The learner's active enrolment for a programme, or throw. */
export async function requireEnrolment(
  ctx: Pick<ServerCtx, "db">,
  actor: AccessContext,
  qualificationId: string,
): Promise<{ enrolmentId: string; cohortId: string }> {
  const [row] = await ctx.db
    .select({ enrolmentId: enrolments.id, cohortId: enrolments.cohortId })
    .from(enrolments)
    .innerJoin(cohorts, eq(cohorts.id, enrolments.cohortId))
    .where(
      and(
        eq(enrolments.userId, actor.userId),
        eq(enrolments.status, "active"),
        eq(cohorts.qualificationId, qualificationId),
      ),
    )
    .limit(1);
  if (!row)
    throw new LearningError(
      "not_enrolled",
      "You're not enrolled in this programme.",
    );
  return row;
}

export async function getProgramme(
  ctx: Pick<ServerCtx, "db">,
  actor: AccessContext,
  qualificationId: string,
) {
  const { enrolmentId } = await requireEnrolment(ctx, actor, qualificationId);
  const [q] = await ctx.db
    .select({ id: qualifications.id, title: qualifications.title })
    .from(qualifications)
    .where(eq(qualifications.id, qualificationId));
  if (!q) throw new LearningError("not_found", "Programme not found.");
  const progress = await loadProgress(ctx, enrolmentId);
  const outline = await loadOutline(ctx, qualificationId, progress);
  return {
    qualification: q,
    outline,
    continueTo: continueTarget(outline, progress),
  };
}

export type SectionMedia = {
  id: string;
  kind: "audio" | "video";
  title: string;
  playbackId: string | null;
  durationSeconds: number | null;
  sizeBytes: number | null;
  transcript: string | null;
  transcriptIsSectionText: boolean;
  captionsLanguage: string | null;
};

export type SectionPage = {
  enrolmentId: string;
  qualification: { id: string; title: string };
  module: { id: string; code: string; title: string };
  section: { id: string; title: string };
  /** Markdown of the section's published text items, in order. */
  texts: { id: string; body: string }[];
  media: SectionMedia[];
  outline: OutlineModule[];
  position: { index: number; total: number };
  prevId: string | null;
  nextId: string | null;
  completedAt: Date | null;
  scrollPercent: number;
  hasCheck: boolean;
};

/** Load a section for an enrolled learner and record the visit (for "Continue"). */
export async function getSectionPage(
  ctx: Pick<ServerCtx, "db" | "now">,
  actor: AccessContext,
  sectionId: string,
): Promise<SectionPage> {
  const [row] = await ctx.db
    .select({
      sectionId: sections.id,
      sectionTitle: sections.title,
      moduleId: modules.id,
      moduleCode: modules.code,
      moduleTitle: modules.title,
      qualificationId: qualifications.id,
      qualificationTitle: qualifications.title,
    })
    .from(sections)
    .innerJoin(modules, eq(modules.id, sections.moduleId))
    .innerJoin(qualifications, eq(qualifications.id, modules.qualificationId))
    .where(eq(sections.id, sectionId));
  if (!row) throw new LearningError("not_found", "Section not found.");
  const { enrolmentId } = await requireEnrolment(
    ctx,
    actor,
    row.qualificationId,
  );

  await recordView(ctx, enrolmentId, sectionId);

  const items = await ctx.db
    .select()
    .from(contentItems)
    .where(
      and(
        eq(contentItems.sectionId, sectionId),
        eq(contentItems.status, "published"),
      ),
    )
    .orderBy(asc(contentItems.sortOrder));
  const progress = await loadProgress(ctx, enrolmentId);
  const outline = await loadOutline(ctx, row.qualificationId, progress);
  const moduleSections =
    outline.find((m) => m.id === row.moduleId)?.sections ?? [];
  const flat = outline.flatMap((m) => m.sections);
  const idx = flat.findIndex((s) => s.id === sectionId);
  const mine = progress.find((p) => p.sectionId === sectionId);
  const [pool] = await ctx.db
    .select({ id: sectionQuestionPools.id })
    .from(sectionQuestionPools)
    .where(eq(sectionQuestionPools.sectionId, sectionId));

  return {
    enrolmentId,
    qualification: { id: row.qualificationId, title: row.qualificationTitle },
    module: { id: row.moduleId, code: row.moduleCode, title: row.moduleTitle },
    section: { id: row.sectionId, title: row.sectionTitle },
    texts: items
      .filter((i) => i.kind === "text" && i.body)
      .map((i) => ({ id: i.id, body: i.body! })),
    media: items
      .filter(
        (i): i is typeof i & { kind: "audio" | "video" } =>
          i.kind === "audio" || i.kind === "video",
      )
      .map((i) => ({
        id: i.id,
        kind: i.kind,
        title: i.title,
        playbackId: i.mediaPlaybackId,
        durationSeconds: i.durationSeconds,
        sizeBytes: i.mediaSizeBytes,
        transcript: i.transcript,
        transcriptIsSectionText: i.transcriptIsSectionText,
        captionsLanguage: i.captionsLanguage,
      })),
    outline,
    position: {
      index: moduleSections.findIndex((s) => s.id === sectionId) + 1,
      total: moduleSections.length,
    },
    prevId: idx > 0 ? flat[idx - 1]!.id : null,
    nextId: idx >= 0 && idx < flat.length - 1 ? flat[idx + 1]!.id : null,
    completedAt: mine?.completedAt ?? null,
    scrollPercent: mine?.scrollPercent ?? 0,
    hasCheck: Boolean(pool),
  };
}

export async function recordView(
  ctx: Pick<ServerCtx, "db" | "now">,
  enrolmentId: string,
  sectionId: string,
) {
  const now = ctx.now();
  await ctx.db
    .insert(sectionProgress)
    .values({ enrolmentId, sectionId, firstViewedAt: now, lastViewedAt: now })
    .onConflictDoUpdate({
      target: [sectionProgress.enrolmentId, sectionProgress.sectionId],
      set: { lastViewedAt: now },
    });
}

async function enrolmentForSection(
  ctx: Pick<ServerCtx, "db">,
  actor: AccessContext,
  sectionId: string,
) {
  const [row] = await ctx.db
    .select({ qualificationId: modules.qualificationId })
    .from(sections)
    .innerJoin(modules, eq(modules.id, sections.moduleId))
    .where(eq(sections.id, sectionId));
  if (!row) throw new LearningError("not_found", "Section not found.");
  return requireEnrolment(ctx, actor, row.qualificationId);
}

export async function saveScrollPosition(
  ctx: Pick<ServerCtx, "db" | "now">,
  actor: AccessContext,
  sectionId: string,
  percent: number,
): Promise<void> {
  const { enrolmentId } = await enrolmentForSection(ctx, actor, sectionId);
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  await ctx.db
    .update(sectionProgress)
    .set({ scrollPercent: clamped })
    .where(
      and(
        eq(sectionProgress.enrolmentId, enrolmentId),
        eq(sectionProgress.sectionId, sectionId),
      ),
    );
}

/**
 * "Mark as completed" (design.md §7): allowed once the section check has been
 * answered at least once, right or wrong. Sections without a check can be
 * completed directly.
 */
export async function completeSection(
  ctx: Pick<ServerCtx, "db" | "now">,
  actor: AccessContext,
  sectionId: string,
): Promise<void> {
  const { enrolmentId } = await enrolmentForSection(ctx, actor, sectionId);
  const [pool] = await ctx.db
    .select({ id: sectionQuestionPools.id })
    .from(sectionQuestionPools)
    .where(eq(sectionQuestionPools.sectionId, sectionId));
  if (pool) {
    const [answered] = await ctx.db
      .select({ id: assessmentAttempts.id })
      .from(assessmentAttempts)
      .where(
        and(
          eq(assessmentAttempts.enrolmentId, enrolmentId),
          eq(assessmentAttempts.sectionId, sectionId),
          eq(assessmentAttempts.status, "graded"),
        ),
      )
      .limit(1);
    if (!answered)
      throw new LearningError(
        "check_required",
        "Answer the check question first.",
      );
  }
  const now = ctx.now();
  await ctx.db
    .insert(sectionProgress)
    .values({
      enrolmentId,
      sectionId,
      firstViewedAt: now,
      lastViewedAt: now,
      completedAt: now,
    })
    .onConflictDoUpdate({
      target: [sectionProgress.enrolmentId, sectionProgress.sectionId],
      // Keep the first completion time.
      set: {
        completedAt: sql`coalesce(${sectionProgress.completedAt}, excluded.completed_at)`,
      },
    });
}

/** Published media item for an enrolled learner (for minting playback tokens). */
export async function getMediaForLearner(
  ctx: Pick<ServerCtx, "db">,
  actor: AccessContext,
  contentItemId: string,
) {
  const [item] = await ctx.db
    .select({
      id: contentItems.id,
      sectionId: contentItems.sectionId,
      kind: contentItems.kind,
      playbackId: contentItems.mediaPlaybackId,
    })
    .from(contentItems)
    .where(
      and(
        eq(contentItems.id, contentItemId),
        eq(contentItems.status, "published"),
        inArray(contentItems.kind, ["audio", "video"]),
      ),
    );
  if (!item) throw new LearningError("not_found", "Media not found.");
  await enrolmentForSection(ctx, actor, item.sectionId);
  return item;
}

/** Digital library: published resources for each programme the learner is in. */
export async function listLibrary(
  ctx: Pick<ServerCtx, "db">,
  actor: AccessContext,
) {
  const programmes = await ctx.db
    .selectDistinct({ id: qualifications.id, title: qualifications.title })
    .from(enrolments)
    .innerJoin(cohorts, eq(cohorts.id, enrolments.cohortId))
    .innerJoin(qualifications, eq(qualifications.id, cohorts.qualificationId))
    .where(
      and(eq(enrolments.userId, actor.userId), eq(enrolments.status, "active")),
    );
  if (programmes.length === 0) return [];
  const resources = await ctx.db
    .select()
    .from(libraryResources)
    .where(
      and(
        inArray(
          libraryResources.qualificationId,
          programmes.map((p) => p.id),
        ),
        eq(libraryResources.published, true),
      ),
    )
    .orderBy(asc(libraryResources.sortOrder), asc(libraryResources.title));
  return programmes.map((p) => ({
    ...p,
    resources: resources
      .filter((r) => r.qualificationId === p.id)
      .map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        kind: r.kind,
        url: r.url,
      })),
  }));
}

/** "Coming up" on Home: upcoming assessment days and the latest announcement. */
export async function comingUp(
  ctx: Pick<ServerCtx, "db" | "now">,
  actor: AccessContext,
) {
  const mine = ctx.db
    .select({ cohortId: enrolments.cohortId })
    .from(enrolments)
    .where(
      and(eq(enrolments.userId, actor.userId), eq(enrolments.status, "active")),
    );
  const today = ctx.now().toISOString().slice(0, 10);
  const days = await ctx.db
    .select({
      id: assessmentDays.id,
      heldOn: assessmentDays.heldOn,
      venue: assessmentDays.venue,
      cohortName: cohorts.name,
    })
    .from(assessmentDays)
    .innerJoin(cohorts, eq(cohorts.id, assessmentDays.cohortId))
    .where(
      and(
        inArray(assessmentDays.cohortId, mine),
        gte(assessmentDays.heldOn, today),
      ),
    )
    .orderBy(asc(assessmentDays.heldOn))
    .limit(3);
  const [latest] = await ctx.db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      publishedAt: announcements.publishedAt,
    })
    .from(announcements)
    .where(
      and(
        inArray(announcements.cohortId, mine),
        isNotNull(announcements.publishedAt),
      ),
    )
    .orderBy(desc(announcements.publishedAt))
    .limit(1);
  return { assessmentDays: days, latestAnnouncement: latest ?? null };
}

export async function firstName(
  ctx: Pick<ServerCtx, "db">,
  userId: string,
): Promise<string> {
  const [u] = await ctx.db
    .select({ name: users.displayName })
    .from(users)
    .where(eq(users.id, userId));
  return (u?.name ?? "").split(/\s+/)[0] ?? "";
}
