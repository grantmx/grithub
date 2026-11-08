import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  assessmentDays,
  assessmentSchedules,
  briefCriteria,
  briefVariants,
  cohorts,
  modules,
  practicalBriefs,
  qualifications,
} from "db";
import type { AccessContext, Requirement } from "@/lib/access";
import { writeAudit } from "./audit";
import { authorize } from "./auth";
import type { ServerCtx } from "./context";
import { PracticalError } from "./practical";

/**
 * Admin authoring for practical briefs: rubric criteria and equivalent
 * variants are added while the brief is a draft; publishing locks them
 * (database trigger), so every variant shares the same criteria and
 * curriculum component. Schedules give a window (evidence briefs) or an
 * assessment day (observed briefs).
 */

const ADMIN: Requirement = { kind: "roles", anyOf: ["sdp_admin"], stepUp: true };
type Ctx = ServerCtx;

export async function listBriefs(ctx: Ctx, actor: AccessContext | null) {
  await authorize(ctx, actor, ADMIN, "briefs.list");
  return ctx.db
    .select({
      id: practicalBriefs.id,
      title: practicalBriefs.title,
      mode: practicalBriefs.mode,
      status: practicalBriefs.status,
      maxAttempts: practicalBriefs.maxAttempts,
      component: practicalBriefs.curriculumComponentRef,
      moduleCode: modules.code,
      qualificationTitle: qualifications.title,
      criteria: sql<number>`(SELECT count(*)::int FROM "brief_criteria" c WHERE c.brief_id = "practical_briefs"."id")`,
      variants: sql<number>`(SELECT count(*)::int FROM "brief_variants" v WHERE v.brief_id = "practical_briefs"."id" AND v.status = 'active')`,
    })
    .from(practicalBriefs)
    .innerJoin(modules, eq(modules.id, practicalBriefs.moduleId))
    .innerJoin(qualifications, eq(qualifications.id, modules.qualificationId))
    .orderBy(asc(qualifications.title), asc(modules.code), asc(practicalBriefs.title));
}

export async function practicalModules(ctx: Ctx, actor: AccessContext | null) {
  await authorize(ctx, actor, ADMIN, "briefs.modules");
  return ctx.db
    .select({ id: modules.id, code: modules.code, title: modules.title, qualificationTitle: qualifications.title })
    .from(modules)
    .innerJoin(qualifications, eq(qualifications.id, modules.qualificationId))
    .where(eq(modules.type, "practical"))
    .orderBy(asc(qualifications.title), asc(modules.sortOrder));
}

export async function createBrief(
  ctx: Ctx,
  actor: AccessContext | null,
  input: { moduleId: string; title: string; component: string; instructions: string; mode: string; maxAttempts?: number },
): Promise<string> {
  const a = await authorize(ctx, actor, ADMIN, "briefs.create");
  if (input.mode !== "submission" && input.mode !== "observed") throw new PracticalError("invalid", "Choose how the task is assessed.");
  const title = input.title.trim();
  const component = input.component.trim();
  const instructions = input.instructions.trim();
  if (!title || !component || !instructions) throw new PracticalError("invalid", "Title, curriculum component and instructions are required.");
  const maxAttempts = input.maxAttempts ?? 2;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) throw new PracticalError("invalid", "Attempts must be 1 to 10.");
  const [mod] = await ctx.db.select({ type: modules.type }).from(modules).where(eq(modules.id, input.moduleId));
  if (mod?.type !== "practical") throw new PracticalError("invalid", "Choose a practical module.");
  const [b] = await ctx.db
    .insert(practicalBriefs)
    .values({
      moduleId: input.moduleId,
      title,
      curriculumComponentRef: component,
      instructions,
      assessmentCriteria: "",
      mode: input.mode,
      maxAttempts,
    })
    .returning({ id: practicalBriefs.id });
  await writeAudit(ctx, { action: "admin.brief.created", actorId: a.userId, entityType: "practical_brief", entityId: b!.id, after: { mode: input.mode } });
  return b!.id;
}

async function draftBrief(ctx: Ctx, briefId: string) {
  const [b] = await ctx.db.select().from(practicalBriefs).where(eq(practicalBriefs.id, briefId));
  if (!b) throw new PracticalError("not_found", "Task not found.");
  return b;
}

export async function getBriefForAdmin(ctx: Ctx, actor: AccessContext | null, briefId: string) {
  await authorize(ctx, actor, ADMIN, "briefs.view");
  const brief = await draftBrief(ctx, briefId);
  const [mod] = await ctx.db.select().from(modules).where(eq(modules.id, brief.moduleId));
  const criteria = await ctx.db.select().from(briefCriteria).where(eq(briefCriteria.briefId, briefId)).orderBy(asc(briefCriteria.sortOrder));
  const variants = await ctx.db.select().from(briefVariants).where(eq(briefVariants.briefId, briefId)).orderBy(asc(briefVariants.label));
  const schedules = await ctx.db
    .select({ s: assessmentSchedules, cohortName: cohorts.name, heldOn: assessmentDays.heldOn, venue: assessmentDays.venue })
    .from(assessmentSchedules)
    .innerJoin(cohorts, eq(cohorts.id, assessmentSchedules.cohortId))
    .leftJoin(assessmentDays, eq(assessmentDays.id, assessmentSchedules.assessmentDayId))
    .where(eq(assessmentSchedules.briefId, briefId))
    .orderBy(desc(assessmentSchedules.opensAt));
  const cohortRows = await ctx.db
    .select({ id: cohorts.id, name: cohorts.name })
    .from(cohorts)
    .where(eq(cohorts.qualificationId, mod!.qualificationId))
    .orderBy(asc(cohorts.name));
  const days = cohortRows.length
    ? await ctx.db
        .select({ id: assessmentDays.id, cohortId: assessmentDays.cohortId, heldOn: assessmentDays.heldOn, venue: assessmentDays.venue })
        .from(assessmentDays)
        .where(inArray(assessmentDays.cohortId, cohortRows.map((c) => c.id)))
        .orderBy(desc(assessmentDays.heldOn))
    : [];
  return { brief, module: mod!, criteria, variants, schedules, cohorts: cohortRows, days, problems: publishProblems(criteria.length, variants.filter((v) => v.status === "active").length) };
}

function publishProblems(criteria: number, activeVariants: number): string[] {
  const p: string[] = [];
  if (criteria === 0) p.push("Add at least one assessment criterion.");
  if (activeVariants === 0) p.push("Add at least one variant (the task learners get).");
  return p;
}

async function assertDraft(ctx: Ctx, briefId: string) {
  const b = await draftBrief(ctx, briefId);
  if (b.status !== "draft") throw new PracticalError("submitted", "This task is published and can't change.");
  return b;
}

export async function addCriterion(ctx: Ctx, actor: AccessContext | null, briefId: string, code: string, label: string, guidance: string) {
  await authorize(ctx, actor, ADMIN, "briefs.addCriterion");
  await assertDraft(ctx, briefId);
  if (!code.trim() || !label.trim()) throw new PracticalError("invalid", "Each criterion needs a code (e.g. AC1) and a description.");
  const [{ max } = { max: 0 }] = await ctx.db
    .select({ max: sql<number>`coalesce(max(${briefCriteria.sortOrder}), 0)::int` })
    .from(briefCriteria)
    .where(eq(briefCriteria.briefId, briefId));
  const inserted = await ctx.db
    .insert(briefCriteria)
    .values({ briefId, code: code.trim().slice(0, 20), label: label.trim().slice(0, 500), guidance: guidance.trim() || null, sortOrder: Number(max) + 1 })
    .onConflictDoNothing()
    .returning({ id: briefCriteria.id });
  if (inserted.length === 0) throw new PracticalError("invalid", "That criterion code is already used.");
}

export async function removeCriterion(ctx: Ctx, actor: AccessContext | null, briefId: string, criterionId: string) {
  await authorize(ctx, actor, ADMIN, "briefs.removeCriterion");
  await assertDraft(ctx, briefId);
  await ctx.db.delete(briefCriteria).where(and(eq(briefCriteria.id, criterionId), eq(briefCriteria.briefId, briefId)));
}

export async function addVariant(ctx: Ctx, actor: AccessContext | null, briefId: string, label: string, instructions: string) {
  await authorize(ctx, actor, ADMIN, "briefs.addVariant");
  await assertDraft(ctx, briefId);
  if (!label.trim() || !instructions.trim()) throw new PracticalError("invalid", "Each variant needs a label and instructions.");
  const inserted = await ctx.db
    .insert(briefVariants)
    .values({ briefId, label: label.trim().slice(0, 20), variantInstructions: instructions.trim(), status: "active" })
    .onConflictDoNothing()
    .returning({ id: briefVariants.id });
  if (inserted.length === 0) throw new PracticalError("invalid", "That variant label is already used.");
}

export async function removeVariant(ctx: Ctx, actor: AccessContext | null, briefId: string, variantId: string) {
  await authorize(ctx, actor, ADMIN, "briefs.removeVariant");
  await assertDraft(ctx, briefId);
  await ctx.db.delete(briefVariants).where(and(eq(briefVariants.id, variantId), eq(briefVariants.briefId, briefId)));
}

export async function publishBrief(ctx: Ctx, actor: AccessContext | null, briefId: string) {
  const a = await authorize(ctx, actor, ADMIN, "briefs.publish");
  const b = await draftBrief(ctx, briefId);
  if (b.status === "published") return;
  const criteria = await ctx.db.select({ code: briefCriteria.code, label: briefCriteria.label }).from(briefCriteria).where(eq(briefCriteria.briefId, briefId)).orderBy(asc(briefCriteria.sortOrder));
  const variants = await ctx.db.select({ id: briefVariants.id }).from(briefVariants).where(and(eq(briefVariants.briefId, briefId), eq(briefVariants.status, "active")));
  const problems = publishProblems(criteria.length, variants.length);
  if (problems.length) throw new PracticalError("invalid", problems.join(" "));
  await ctx.db
    .update(practicalBriefs)
    .set({
      status: "published",
      publishedAt: ctx.now(),
      // Keep the plain-text summary in step with the structured rubric.
      assessmentCriteria: criteria.map((c) => `${c.code} ${c.label}`).join(". "),
    })
    .where(eq(practicalBriefs.id, briefId));
  await writeAudit(ctx, { action: "admin.brief.published", actorId: a.userId, entityType: "practical_brief", entityId: briefId, after: { criteria: criteria.length, variants: variants.length } });
}

export async function scheduleBrief(
  ctx: Ctx,
  actor: AccessContext | null,
  input: { briefId: string; cohortId: string; opensAt: Date; closesAt: Date; assessmentDayId?: string | null; newDay?: { heldOn: string; venue: string } | null },
): Promise<string> {
  const a = await authorize(ctx, actor, ADMIN, "briefs.schedule");
  const b = await draftBrief(ctx, input.briefId);
  if (b.status !== "published") throw new PracticalError("invalid", "Publish the task before scheduling it.");
  const [cohort] = await ctx.db.select().from(cohorts).where(eq(cohorts.id, input.cohortId));
  const [mod] = await ctx.db.select().from(modules).where(eq(modules.id, b.moduleId));
  if (!cohort || cohort.qualificationId !== mod?.qualificationId) throw new PracticalError("invalid", "Choose a cohort in this programme.");
  if (Number.isNaN(input.opensAt.getTime()) || Number.isNaN(input.closesAt.getTime()) || input.closesAt <= input.opensAt) {
    throw new PracticalError("invalid", "The closing time must be after the opening time.");
  }
  let dayId: string | null = null;
  if (b.mode === "observed") {
    if (input.assessmentDayId) {
      const [day] = await ctx.db.select().from(assessmentDays).where(eq(assessmentDays.id, input.assessmentDayId));
      if (!day || day.cohortId !== cohort.id) throw new PracticalError("invalid", "Choose an assessment day for this cohort.");
      dayId = day.id;
    } else if (input.newDay && /^\d{4}-\d{2}-\d{2}$/.test(input.newDay.heldOn) && input.newDay.venue.trim()) {
      const [day] = await ctx.db
        .insert(assessmentDays)
        .values({ cohortId: cohort.id, heldOn: input.newDay.heldOn, venue: input.newDay.venue.trim() })
        .onConflictDoNothing()
        .returning({ id: assessmentDays.id });
      dayId =
        day?.id ??
        (await ctx.db.select({ id: assessmentDays.id }).from(assessmentDays).where(and(eq(assessmentDays.cohortId, cohort.id), eq(assessmentDays.heldOn, input.newDay.heldOn))))[0]!.id;
    } else {
      throw new PracticalError("invalid", "Observed tasks need an assessment day (date and venue).");
    }
  }
  const [s] = await ctx.db
    .insert(assessmentSchedules)
    .values({ cohortId: cohort.id, briefId: b.id, assessmentDayId: dayId, opensAt: input.opensAt, closesAt: input.closesAt, createdBy: a.userId })
    .returning({ id: assessmentSchedules.id });
  await writeAudit(ctx, { action: "admin.schedule.created", actorId: a.userId, entityType: "assessment_schedule", entityId: s!.id, after: { briefId: b.id, cohortId: cohort.id, assessmentDayId: dayId } });
  return s!.id;
}
