import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  answerOptions,
  assessmentAttempts,
  assessmentBlueprints,
  blueprintRules,
  cohorts,
  enrolments,
  modules,
  qualifications,
  questionBanks,
  questions,
  questionVersions,
  rubricCriteria,
  sectionPoolQuestions,
  sectionQuestionPools,
  sections,
  users,
} from "db";
import type { AccessContext, Requirement } from "@/lib/access";
import { AssessmentError } from "./assessments";
import { authorize } from "./auth";
import type { ServerCtx } from "./context";
import { cohortScope, inScope } from "./staffScope";

/**
 * Assessment materials, read-only, for moderators (design.md §14,
 * 2026-11-08; Form 5 4.2.5 "how the moderator accesses formative
 * assessments"): question banks with every version, keys and rubrics;
 * formative blueprints and their learner attempts (opening the exact replay);
 * section checks. Nothing here writes. Scope: the qualifications of the
 * moderator's cohorts.
 */

const MODERATOR: Requirement = { kind: "roles", anyOf: ["moderator"], stepUp: true };
type Ctx = ServerCtx;

async function scope(ctx: Ctx, actor: AccessContext | null, target: string) {
  const a = await authorize(ctx, actor, MODERATOR, target);
  const cohortIds = await cohortScope(ctx, a, ["moderator"]);
  const rows = await ctx.db.select({ id: cohorts.id, qualificationId: cohorts.qualificationId }).from(cohorts);
  const mine = rows.filter((c) => inScope(cohortIds, c.id));
  return {
    a,
    cohortIds: mine.map((c) => c.id),
    qualificationIds: [...new Set(mine.map((c) => c.qualificationId))],
  };
}

async function moduleInScope(ctx: Ctx, moduleId: string, qualificationIds: string[]) {
  const [m] = await ctx.db
    .select({ id: modules.id, code: modules.code, title: modules.title, qualificationId: modules.qualificationId })
    .from(modules)
    .where(eq(modules.id, moduleId));
  if (!m || !qualificationIds.includes(m.qualificationId)) throw new AssessmentError("not_found", "Not found.");
  return m;
}

export async function listMaterials(ctx: Ctx, actor: AccessContext | null) {
  const { qualificationIds } = await scope(ctx, actor, "materials.list");
  if (!qualificationIds.length) return [];
  const mods = await ctx.db
    .select({ id: modules.id, code: modules.code, title: modules.title, qualificationTitle: qualifications.title })
    .from(modules)
    .innerJoin(qualifications, eq(qualifications.id, modules.qualificationId))
    .where(and(inArray(modules.qualificationId, qualificationIds), eq(modules.type, "knowledge")))
    .orderBy(asc(qualifications.title), asc(modules.code));
  const ids = mods.map((m) => m.id);
  if (!ids.length) return [];
  const banks = await ctx.db
    .select({
      id: questionBanks.id,
      moduleId: questionBanks.moduleId,
      title: questionBanks.title,
      component: questionBanks.curriculumComponentRef,
      active: sql<number>`(SELECT count(*)::int FROM "questions" q WHERE q.bank_id = "question_banks"."id" AND q.status = 'active')`,
      total: sql<number>`(SELECT count(*)::int FROM "questions" q WHERE q.bank_id = "question_banks"."id")`,
    })
    .from(questionBanks)
    .where(inArray(questionBanks.moduleId, ids))
    .orderBy(asc(questionBanks.curriculumComponentRef));
  const formatives = await ctx.db
    .select({ id: assessmentBlueprints.id, moduleId: assessmentBlueprints.moduleId, title: assessmentBlueprints.title, status: assessmentBlueprints.status })
    .from(assessmentBlueprints)
    .where(and(inArray(assessmentBlueprints.moduleId, ids), eq(assessmentBlueprints.kind, "formative")))
    .orderBy(asc(assessmentBlueprints.title));
  const checks = await ctx.db
    .select({
      sectionId: sections.id,
      moduleId: sections.moduleId,
      title: sections.title,
      component: sections.curriculumComponentRef,
      questions: sql<number>`(SELECT count(*)::int FROM "section_pool_questions" p WHERE p.pool_id = ${sectionQuestionPools.id})`,
    })
    .from(sectionQuestionPools)
    .innerJoin(sections, eq(sections.id, sectionQuestionPools.sectionId))
    .where(inArray(sections.moduleId, ids))
    .orderBy(asc(sections.sortOrder));
  return mods.map((m) => ({
    ...m,
    banks: banks.filter((b) => b.moduleId === m.id),
    formatives: formatives.filter((f) => f.moduleId === m.id),
    checks: checks.filter((c) => c.moduleId === m.id),
  }));
}

/** Questions with every version (newest first), options with keys, rubric and explanation. */
async function questionsWithVersions(ctx: Ctx, questionIds: string[]) {
  if (!questionIds.length) return [];
  const qs = await ctx.db.select().from(questions).where(inArray(questions.id, questionIds)).orderBy(asc(questions.createdAt));
  const versions = await ctx.db
    .select()
    .from(questionVersions)
    .where(inArray(questionVersions.questionId, questionIds))
    .orderBy(asc(questionVersions.versionNo));
  const vIds = versions.map((v) => v.id);
  const opts = vIds.length
    ? await ctx.db.select().from(answerOptions).where(inArray(answerOptions.questionVersionId, vIds)).orderBy(asc(answerOptions.authorOrder))
    : [];
  const crit = vIds.length
    ? await ctx.db.select().from(rubricCriteria).where(inArray(rubricCriteria.questionVersionId, vIds)).orderBy(asc(rubricCriteria.sortOrder))
    : [];
  return qs.map((q) => ({
    id: q.id,
    status: q.status,
    versions: versions
      .filter((v) => v.questionId === q.id)
      .reverse()
      .map((v) => ({
        id: v.id,
        versionNo: v.versionNo,
        current: v.id === q.currentVersionId,
        type: v.type,
        stem: v.stem,
        explanation: v.feedback,
        maxMarks: v.maxMarks,
        firstServedAt: v.firstServedAt,
        options: opts
          .filter((o) => o.questionVersionId === v.id)
          .map((o) => ({ id: o.id, label: o.label, correct: o.isCorrect, pinned: o.pinnedPosition !== null })),
        criteria: crit
          .filter((c) => c.questionVersionId === v.id)
          .map((c) => ({ id: c.id, label: c.label, guidance: c.guidance, maxMarks: c.maxMarks })),
      })),
  }));
}

export type MaterialQuestion = Awaited<ReturnType<typeof questionsWithVersions>>[number];

export async function getBankMaterials(ctx: Ctx, actor: AccessContext | null, bankId: string) {
  const { qualificationIds } = await scope(ctx, actor, "materials.bank");
  const [bank] = await ctx.db.select().from(questionBanks).where(eq(questionBanks.id, bankId));
  if (!bank) throw new AssessmentError("not_found", "Bank not found.");
  const mod = await moduleInScope(ctx, bank.moduleId, qualificationIds);
  const ids = (await ctx.db.select({ id: questions.id }).from(questions).where(eq(questions.bankId, bankId))).map((q) => q.id);
  return { bank, module: mod, questions: await questionsWithVersions(ctx, ids) };
}

export async function getSectionCheckMaterials(ctx: Ctx, actor: AccessContext | null, sectionId: string) {
  const { qualificationIds } = await scope(ctx, actor, "materials.check");
  const [section] = await ctx.db.select().from(sections).where(eq(sections.id, sectionId));
  if (!section) throw new AssessmentError("not_found", "Section not found.");
  const mod = await moduleInScope(ctx, section.moduleId, qualificationIds);
  const [pool] = await ctx.db.select().from(sectionQuestionPools).where(eq(sectionQuestionPools.sectionId, sectionId));
  const ids = pool
    ? (await ctx.db.select({ id: sectionPoolQuestions.questionId }).from(sectionPoolQuestions).where(eq(sectionPoolQuestions.poolId, pool.id))).map(
        (r) => r.id,
      )
    : [];
  return { section, module: mod, minPoolSize: pool?.minPoolSize ?? null, questions: await questionsWithVersions(ctx, ids) };
}

/** A formative blueprint, its draw rules and its learners' attempts in my cohorts (each opens the exact replay). */
export async function getFormativeMaterials(ctx: Ctx, actor: AccessContext | null, blueprintId: string) {
  const { cohortIds, qualificationIds } = await scope(ctx, actor, "materials.formative");
  const [bp] = await ctx.db.select().from(assessmentBlueprints).where(eq(assessmentBlueprints.id, blueprintId));
  if (!bp || bp.kind !== "formative") throw new AssessmentError("not_found", "Formative assessment not found.");
  const mod = await moduleInScope(ctx, bp.moduleId, qualificationIds);
  const rules = await ctx.db
    .select({ id: blueprintRules.id, bankId: blueprintRules.bankId, bankTitle: questionBanks.title, component: blueprintRules.curriculumComponentRef, count: blueprintRules.questionCount })
    .from(blueprintRules)
    .innerJoin(questionBanks, eq(questionBanks.id, blueprintRules.bankId))
    .where(eq(blueprintRules.blueprintId, blueprintId))
    .orderBy(asc(blueprintRules.curriculumComponentRef));
  const attempts = cohortIds.length
    ? await ctx.db
        .select({
          id: assessmentAttempts.id,
          attemptNo: assessmentAttempts.attemptNo,
          status: assessmentAttempts.status,
          submittedAt: assessmentAttempts.submittedAt,
          scoreRaw: assessmentAttempts.scoreRaw,
          scoreMax: assessmentAttempts.scoreMax,
          learnerName: users.displayName,
          cohortName: cohorts.name,
        })
        .from(assessmentAttempts)
        .innerJoin(enrolments, eq(enrolments.id, assessmentAttempts.enrolmentId))
        .innerJoin(users, eq(users.id, enrolments.userId))
        .innerJoin(cohorts, eq(cohorts.id, enrolments.cohortId))
        .where(and(eq(assessmentAttempts.blueprintId, blueprintId), inArray(enrolments.cohortId, cohortIds), inArray(assessmentAttempts.status, ["submitted", "graded"])))
        .orderBy(asc(cohorts.name), asc(users.displayName), asc(assessmentAttempts.attemptNo))
    : [];
  return { blueprint: bp, module: mod, rules, attempts };
}
