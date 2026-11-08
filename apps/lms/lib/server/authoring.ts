import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  answerOptions,
  assessmentBlueprints,
  assessmentDays,
  assessmentSchedules,
  blueprintRules,
  cohorts,
  modules,
  qualifications,
  questionBanks,
  questions,
  questionVersions,
  rubricCriteria,
  sections,
} from "db";
import type { AccessContext, Requirement } from "@/lib/access";
import { AssessmentError } from "./assessments";
import { writeAudit } from "./audit";
import { authorize } from "./auth";
import type { ServerCtx } from "./context";

/**
 * Authoring (design-gate decision 2026-11-08): SDP admins build blueprints
 * and cohort schedules; assessors and moderators retire questions or create
 * new versions from analytics. Served versions are never edited (database
 * trigger); a published blueprint is fixed (database trigger).
 */

const ADMIN: Requirement = { kind: "roles", anyOf: ["sdp_admin"], stepUp: true };
const QUESTION_EDITOR: Requirement = { kind: "roles", anyOf: ["assessor", "moderator"], stepUp: true };
type Ctx = ServerCtx;

export async function listBlueprints(ctx: Ctx, actor: AccessContext | null) {
  await authorize(ctx, actor, ADMIN, "authoring.listBlueprints");
  return ctx.db
    .select({
      id: assessmentBlueprints.id,
      title: assessmentBlueprints.title,
      kind: assessmentBlueprints.kind,
      status: assessmentBlueprints.status,
      maxAttempts: assessmentBlueprints.maxAttempts,
      timeLimitMinutes: assessmentBlueprints.timeLimitMinutes,
      moduleCode: modules.code,
      qualificationTitle: qualifications.title,
      questionCount: sql<number>`(SELECT coalesce(sum(r.question_count), 0)::int FROM "blueprint_rules" r WHERE r.blueprint_id = "assessment_blueprints"."id")`,
    })
    .from(assessmentBlueprints)
    .innerJoin(modules, eq(modules.id, assessmentBlueprints.moduleId))
    .innerJoin(qualifications, eq(qualifications.id, modules.qualificationId))
    .where(inArray(assessmentBlueprints.kind, ["formative", "summative"]))
    .orderBy(asc(qualifications.title), asc(modules.code), asc(assessmentBlueprints.title));
}

export async function knowledgeModules(ctx: Ctx, actor: AccessContext | null) {
  await authorize(ctx, actor, ADMIN, "authoring.modules");
  return ctx.db
    .select({ id: modules.id, code: modules.code, title: modules.title, qualificationTitle: qualifications.title })
    .from(modules)
    .innerJoin(qualifications, eq(qualifications.id, modules.qualificationId))
    .where(eq(modules.type, "knowledge"))
    .orderBy(asc(qualifications.title), asc(modules.sortOrder));
}

export type BlueprintInput = {
  moduleId: string;
  title: string;
  kind: string;
  maxAttempts?: number;
  timeLimitMinutes?: number | null;
  passMarkPercent: number;
  showAnswers?: boolean;
};

/** Defaults (decision 2026-11-08): summative 1 + 1 reassessment, answers hidden; formative shows answers. */
export async function createBlueprint(ctx: Ctx, actor: AccessContext | null, input: BlueprintInput) {
  const a = await authorize(ctx, actor, ADMIN, "authoring.createBlueprint");
  if (input.kind !== "formative" && input.kind !== "summative") {
    throw new AssessmentError("invalid_answer", "Choose formative or summative.");
  }
  const summative = input.kind === "summative";
  const title = input.title.trim();
  if (!title) throw new AssessmentError("invalid_answer", "Give the assessment a title.");
  const maxAttempts = input.maxAttempts ?? (summative ? 2 : 3);
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
    throw new AssessmentError("invalid_answer", "Attempts must be 1 to 10.");
  }
  if (!Number.isInteger(input.passMarkPercent) || input.passMarkPercent < 0 || input.passMarkPercent > 100) {
    throw new AssessmentError("invalid_answer", "The pass mark must be 0 to 100%.");
  }
  const limit = input.timeLimitMinutes ?? null;
  if (limit !== null && (!Number.isInteger(limit) || limit < 1 || limit > 600)) {
    throw new AssessmentError("invalid_answer", "The time limit must be 1 to 600 minutes.");
  }
  const [mod] = await ctx.db.select({ type: modules.type }).from(modules).where(eq(modules.id, input.moduleId));
  if (mod?.type !== "knowledge") throw new AssessmentError("invalid_answer", "Choose a knowledge module.");
  const [bp] = await ctx.db
    .insert(assessmentBlueprints)
    .values({
      moduleId: input.moduleId,
      title,
      kind: input.kind,
      maxAttempts,
      timeLimitMinutes: limit,
      passMarkPercent: input.passMarkPercent,
      inPersonOnly: summative,
      showAnswers: input.showAnswers ?? !summative,
    })
    .returning({ id: assessmentBlueprints.id });
  await writeAudit(ctx, {
    action: "admin.blueprint.created",
    actorId: a.userId,
    entityType: "assessment_blueprint",
    entityId: bp!.id,
    after: { kind: input.kind },
  });
  return bp!.id;
}

async function draftBlueprint(ctx: Ctx, blueprintId: string) {
  const [bp] = await ctx.db.select().from(assessmentBlueprints).where(eq(assessmentBlueprints.id, blueprintId));
  if (!bp) throw new AssessmentError("not_found", "Assessment not found.");
  return bp;
}

export async function getBlueprint(ctx: Ctx, actor: AccessContext | null, blueprintId: string) {
  await authorize(ctx, actor, ADMIN, "authoring.blueprint");
  const bp = await draftBlueprint(ctx, blueprintId);
  const [mod] = await ctx.db.select().from(modules).where(eq(modules.id, bp.moduleId));
  const rules = await ctx.db
    .select({ rule: blueprintRules, bankTitle: questionBanks.title })
    .from(blueprintRules)
    .innerJoin(questionBanks, eq(questionBanks.id, blueprintRules.bankId))
    .where(eq(blueprintRules.blueprintId, blueprintId))
    .orderBy(asc(blueprintRules.curriculumComponentRef));
  const banks = await ctx.db
    .select({ id: questionBanks.id, title: questionBanks.title, component: questionBanks.curriculumComponentRef })
    .from(questionBanks)
    .where(eq(questionBanks.moduleId, bp.moduleId))
    .orderBy(asc(questionBanks.curriculumComponentRef));
  const schedules = await ctx.db
    .select({ s: assessmentSchedules, cohortName: cohorts.name, heldOn: assessmentDays.heldOn, venue: assessmentDays.venue })
    .from(assessmentSchedules)
    .innerJoin(cohorts, eq(cohorts.id, assessmentSchedules.cohortId))
    .leftJoin(assessmentDays, eq(assessmentDays.id, assessmentSchedules.assessmentDayId))
    .where(eq(assessmentSchedules.blueprintId, blueprintId))
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
  return {
    blueprint: bp,
    module: mod!,
    rules,
    banks,
    schedules,
    cohorts: cohortRows,
    days,
    validation: await validateBlueprint(ctx, blueprintId),
  };
}

export async function addRule(ctx: Ctx, actor: AccessContext | null, blueprintId: string, bankId: string, count: number) {
  const a = await authorize(ctx, actor, ADMIN, "authoring.addRule");
  const bp = await draftBlueprint(ctx, blueprintId);
  if (bp.status !== "draft") throw new AssessmentError("submitted", "This assessment is published and can't change.");
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw new AssessmentError("invalid_answer", "Questions per paper must be 1 to 100.");
  }
  const [bank] = await ctx.db.select().from(questionBanks).where(eq(questionBanks.id, bankId));
  if (!bank || bank.moduleId !== bp.moduleId) throw new AssessmentError("invalid_answer", "Choose a bank from this module.");
  await ctx.db
    .insert(blueprintRules)
    .values({ blueprintId, bankId, curriculumComponentRef: bank.curriculumComponentRef, questionCount: count })
    .onConflictDoUpdate({ target: [blueprintRules.blueprintId, blueprintRules.bankId], set: { questionCount: count } });
  await writeAudit(ctx, {
    action: "admin.blueprint.rule_added",
    actorId: a.userId,
    entityType: "assessment_blueprint",
    entityId: blueprintId,
    after: { bankId, count },
  });
}

export async function removeRule(ctx: Ctx, actor: AccessContext | null, blueprintId: string, ruleId: string) {
  const a = await authorize(ctx, actor, ADMIN, "authoring.removeRule");
  const bp = await draftBlueprint(ctx, blueprintId);
  if (bp.status !== "draft") throw new AssessmentError("submitted", "This assessment is published and can't change.");
  await ctx.db.delete(blueprintRules).where(and(eq(blueprintRules.id, ruleId), eq(blueprintRules.blueprintId, blueprintId)));
  await writeAudit(ctx, {
    action: "admin.blueprint.rule_removed",
    actorId: a.userId,
    entityType: "assessment_blueprint",
    entityId: blueprintId,
    after: { ruleId },
  });
}

export type Validation = { errors: string[]; warnings: string[] };

/**
 * randomization.md §2: every rule's bank has at least N eligible questions
 * (error) and ideally N × max attempts (warning); every curriculum component
 * of the module is covered by a rule (warning, shown in the coverage report).
 */
export async function validateBlueprint(ctx: Pick<Ctx, "db">, blueprintId: string): Promise<Validation> {
  const bp = await draftBlueprint(ctx as Ctx, blueprintId);
  const rules = await ctx.db.select().from(blueprintRules).where(eq(blueprintRules.blueprintId, blueprintId));
  const errors: string[] = [];
  const warnings: string[] = [];
  if (rules.length === 0) errors.push("Add at least one rule (a bank and how many questions to draw).");
  const types = bp.kind === "summative" ? ["single", "multi", "short_answer"] : ["single", "multi"];
  for (const r of rules) {
    const [row] = await ctx.db
      .select({ n: sql<number>`count(*)::int` })
      .from(questions)
      .innerJoin(questionVersions, eq(questionVersions.id, questions.currentVersionId))
      .where(
        and(
          eq(questions.bankId, r.bankId),
          eq(questions.status, "active"),
          inArray(questionVersions.type, types as ("single" | "multi" | "short_answer")[]),
        ),
      );
    const n = Number(row?.n ?? 0);
    if (n < r.questionCount) {
      errors.push(`${r.curriculumComponentRef}: needs ${r.questionCount} active questions, the bank has ${n}.`);
    } else if (n < r.questionCount * bp.maxAttempts) {
      warnings.push(
        `${r.curriculumComponentRef}: ${n} active questions; ${r.questionCount * bp.maxAttempts} are needed for fresh questions on every attempt.`,
      );
    }
  }
  const comps = await ctx.db
    .selectDistinct({ ref: sections.curriculumComponentRef })
    .from(sections)
    .where(eq(sections.moduleId, bp.moduleId));
  const covered = new Set(rules.map((r) => r.curriculumComponentRef));
  const missing = comps.map((c) => c.ref).filter((c) => !covered.has(c));
  if (missing.length) warnings.push(`Not covered by any rule: ${missing.sort().join(", ")}.`);
  return { errors, warnings };
}

export async function publishBlueprint(ctx: Ctx, actor: AccessContext | null, blueprintId: string) {
  const a = await authorize(ctx, actor, ADMIN, "authoring.publish");
  const bp = await draftBlueprint(ctx, blueprintId);
  if (bp.status === "published") return;
  const v = await validateBlueprint(ctx, blueprintId);
  if (v.errors.length) throw new AssessmentError("invalid_answer", v.errors.join(" "));
  await ctx.db
    .update(assessmentBlueprints)
    .set({ status: "published", publishedAt: ctx.now() })
    .where(eq(assessmentBlueprints.id, blueprintId));
  await writeAudit(ctx, {
    action: "admin.blueprint.published",
    actorId: a.userId,
    entityType: "assessment_blueprint",
    entityId: blueprintId,
    after: { warnings: v.warnings.length },
  });
}

export type ScheduleInput = {
  blueprintId: string;
  cohortId: string;
  opensAt: Date;
  closesAt: Date;
  /** Summative: an existing day, or a new one. */
  assessmentDayId?: string | null;
  newDay?: { heldOn: string; venue: string } | null;
};

export async function createSchedule(ctx: Ctx, actor: AccessContext | null, input: ScheduleInput) {
  const a = await authorize(ctx, actor, ADMIN, "authoring.schedule");
  const bp = await draftBlueprint(ctx, input.blueprintId);
  if (bp.status !== "published") throw new AssessmentError("invalid_answer", "Publish the assessment before scheduling it.");
  const [cohort] = await ctx.db.select().from(cohorts).where(eq(cohorts.id, input.cohortId));
  const [mod] = await ctx.db.select().from(modules).where(eq(modules.id, bp.moduleId));
  if (!cohort || cohort.qualificationId !== mod?.qualificationId) {
    throw new AssessmentError("invalid_answer", "Choose a cohort in this programme.");
  }
  if (!(input.opensAt instanceof Date) || Number.isNaN(input.opensAt.getTime()) || Number.isNaN(input.closesAt.getTime()) || input.closesAt <= input.opensAt) {
    throw new AssessmentError("invalid_answer", "The closing time must be after the opening time.");
  }
  let dayId: string | null = null;
  if (bp.kind === "summative") {
    if (input.assessmentDayId) {
      const [day] = await ctx.db.select().from(assessmentDays).where(eq(assessmentDays.id, input.assessmentDayId));
      if (!day || day.cohortId !== cohort.id) throw new AssessmentError("invalid_answer", "Choose an assessment day for this cohort.");
      dayId = day.id;
    } else if (input.newDay && /^\d{4}-\d{2}-\d{2}$/.test(input.newDay.heldOn) && input.newDay.venue.trim()) {
      const [day] = await ctx.db
        .insert(assessmentDays)
        .values({ cohortId: cohort.id, heldOn: input.newDay.heldOn, venue: input.newDay.venue.trim() })
        .onConflictDoNothing()
        .returning({ id: assessmentDays.id });
      dayId =
        day?.id ??
        (await ctx.db
          .select({ id: assessmentDays.id })
          .from(assessmentDays)
          .where(and(eq(assessmentDays.cohortId, cohort.id), eq(assessmentDays.heldOn, input.newDay.heldOn))))[0]!.id;
    } else {
      throw new AssessmentError("invalid_answer", "Summative assessments need an assessment day (date and venue).");
    }
  }
  const [s] = await ctx.db
    .insert(assessmentSchedules)
    .values({
      cohortId: cohort.id,
      blueprintId: bp.id,
      assessmentDayId: dayId,
      opensAt: input.opensAt,
      closesAt: input.closesAt,
      createdBy: a.userId,
    })
    .returning({ id: assessmentSchedules.id });
  await writeAudit(ctx, {
    action: "admin.schedule.created",
    actorId: a.userId,
    entityType: "assessment_schedule",
    entityId: s!.id,
    after: { blueprintId: bp.id, cohortId: cohort.id, assessmentDayId: dayId },
  });
  return s!.id;
}

/** Cohorts and published blueprints, for the coverage report picker. */
export async function coverageOptions(ctx: Ctx, actor: AccessContext | null) {
  await authorize(ctx, actor, ADMIN, "authoring.coverageOptions");
  return ctx.db
    .selectDistinct({
      blueprintId: assessmentSchedules.blueprintId,
      cohortId: assessmentSchedules.cohortId,
      title: assessmentBlueprints.title,
      cohortName: cohorts.name,
    })
    .from(assessmentSchedules)
    .innerJoin(assessmentBlueprints, eq(assessmentBlueprints.id, assessmentSchedules.blueprintId))
    .innerJoin(cohorts, eq(cohorts.id, assessmentSchedules.cohortId))
    .orderBy(asc(cohorts.name), asc(assessmentBlueprints.title));
}

// ---------------------------------------------------------------------------
// Questions: retire or create a new version (assessors and moderators)
// ---------------------------------------------------------------------------

export async function getQuestionForEdit(ctx: Ctx, actor: AccessContext | null, questionId: string) {
  await authorize(ctx, actor, QUESTION_EDITOR, "questions.view");
  const [q] = await ctx.db.select().from(questions).where(eq(questions.id, questionId));
  if (!q?.currentVersionId) throw new AssessmentError("not_found", "Question not found.");
  const [v] = await ctx.db.select().from(questionVersions).where(eq(questionVersions.id, q.currentVersionId));
  const options = await ctx.db
    .select()
    .from(answerOptions)
    .where(eq(answerOptions.questionVersionId, v!.id))
    .orderBy(asc(answerOptions.authorOrder));
  const criteria = await ctx.db
    .select()
    .from(rubricCriteria)
    .where(eq(rubricCriteria.questionVersionId, v!.id))
    .orderBy(asc(rubricCriteria.sortOrder));
  const [bank] = await ctx.db.select().from(questionBanks).where(eq(questionBanks.id, q.bankId));
  return { question: q, version: v!, options, criteria, bank: bank! };
}

export async function retireQuestion(ctx: Ctx, actor: AccessContext | null, questionId: string) {
  const a = await authorize(ctx, actor, QUESTION_EDITOR, "questions.retire");
  const [q] = await ctx.db
    .update(questions)
    .set({ status: "retired" })
    .where(and(eq(questions.id, questionId), inArray(questions.status, ["active", "draft"])))
    .returning({ id: questions.id });
  if (!q) return;
  await writeAudit(ctx, { action: "question.retired", actorId: a.userId, entityType: "question", entityId: questionId });
}

export type VersionInput = {
  stem: string;
  feedback: string;
  options: { label: string; correct: boolean; pinned: number | null }[];
  criteria: { label: string; guidance: string; maxMarks: number }[];
};

const ALL_NONE = /\b(all|none) of the above\b/i;

/** Validate a new version; errors block saving, warnings are shown. */
export function checkVersion(type: string, input: VersionInput): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!input.stem.trim()) errors.push("Write the question.");
  if (type === "short_answer") {
    if (input.criteria.length === 0) errors.push("Add at least one rubric criterion.");
    for (const c of input.criteria) {
      if (!c.label.trim()) errors.push("Every criterion needs a description.");
      if (!Number.isInteger(c.maxMarks) || c.maxMarks < 1 || c.maxMarks > 100) errors.push("Criterion marks must be 1 to 100.");
    }
  } else {
    const opts = input.options.filter((o) => o.label.trim());
    if (opts.length < 2) errors.push("Add at least two answers.");
    const correct = opts.filter((o) => o.correct).length;
    if (type === "single" && correct !== 1) errors.push("Mark exactly one correct answer.");
    if (type === "multi" && correct < 1) errors.push("Mark at least one correct answer.");
    for (const o of opts) {
      if (ALL_NONE.test(o.label) && o.pinned === null) warnings.push(`Pin "${o.label}" (usually last) so it isn't shuffled.`);
    }
  }
  return { errors, warnings };
}

export async function createQuestionVersion(
  ctx: Ctx,
  actor: AccessContext | null,
  questionId: string,
  input: VersionInput,
): Promise<{ versionId: string; warnings: string[] }> {
  const a = await authorize(ctx, actor, QUESTION_EDITOR, "questions.version");
  const current = await getQuestionForEdit(ctx, a, questionId);
  const type = current.version.type;
  const check = checkVersion(type, input);
  if (check.errors.length) throw new AssessmentError("invalid_answer", check.errors.join(" "));
  const [{ max } = { max: 0 }] = await ctx.db
    .select({ max: sql<number>`coalesce(max(${questionVersions.versionNo}), 0)::int` })
    .from(questionVersions)
    .where(eq(questionVersions.questionId, questionId));
  const versionId = await ctx.db.transaction(async (tx) => {
    const criteria = input.criteria;
    const [v] = await tx
      .insert(questionVersions)
      .values({
        questionId,
        versionNo: Number(max) + 1,
        stem: input.stem.trim(),
        type,
        feedback: input.feedback.trim() || null,
        maxMarks: type === "short_answer" ? criteria.reduce((s, c) => s + c.maxMarks, 0) : 1,
      })
      .returning({ id: questionVersions.id });
    if (type === "short_answer") {
      await tx.insert(rubricCriteria).values(
        criteria.map((c, i) => ({
          questionVersionId: v!.id,
          label: c.label.trim(),
          guidance: c.guidance.trim() || null,
          maxMarks: c.maxMarks,
          sortOrder: i + 1,
        })),
      );
    } else {
      await tx.insert(answerOptions).values(
        input.options
          .filter((o) => o.label.trim())
          .map((o, i) => ({
            questionVersionId: v!.id,
            label: o.label.trim(),
            isCorrect: o.correct,
            pinnedPosition: o.pinned,
            authorOrder: i + 1,
          })),
      );
    }
    await tx
      .update(questions)
      .set({ currentVersionId: v!.id, status: "active" })
      .where(eq(questions.id, questionId));
    return v!.id;
  });
  await writeAudit(ctx, {
    action: "question.versioned",
    actorId: a.userId,
    entityType: "question",
    entityId: questionId,
    after: { versionId, versionNo: Number(max) + 1 },
  });
  return { versionId, warnings: check.warnings };
}
