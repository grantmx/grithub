import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import {
  answerOptions,
  assessmentAttempts,
  assessmentBlueprints,
  attemptItems,
  blueprintRules,
  cohorts,
  enrolments,
  modules,
  questionBanks,
  questions,
  questionVersions,
  sections,
} from "db";
import type { AccessContext, Requirement } from "@/lib/access";
import { versionStats, type StatFlag } from "@/lib/questionStats";
import { AssessmentError } from "./assessments";
import { writeAudit } from "./audit";
import { authorize } from "./auth";
import type { ServerCtx } from "./context";
import { cohortScope, inScope } from "./staffScope";

/**
 * Question analytics for assessors and moderators (they see keys), and the
 * blueprint coverage report for SDP admins (no keys). Analytics use graded
 * auto-marked items from blueprint attempts in the viewer's cohorts.
 */

const ANALYTICS: Requirement = { kind: "roles", anyOf: ["assessor", "moderator"], stepUp: true };
const COVERAGE: Requirement = { kind: "roles", anyOf: ["sdp_admin"], stepUp: true };
type Ctx = ServerCtx;

export async function analyticsBlueprints(ctx: Ctx, actor: AccessContext | null) {
  await authorize(ctx, actor, ANALYTICS, "analytics.list");
  return ctx.db
    .select({ id: assessmentBlueprints.id, title: assessmentBlueprints.title, kind: assessmentBlueprints.kind, moduleCode: modules.code })
    .from(assessmentBlueprints)
    .innerJoin(modules, eq(modules.id, assessmentBlueprints.moduleId))
    .where(inArray(assessmentBlueprints.kind, ["formative", "summative"]))
    .orderBy(asc(modules.code), asc(assessmentBlueprints.title));
}

export type QuestionRow = {
  questionId: string;
  versionId: string;
  versionNo: number;
  isCurrent: boolean;
  questionStatus: "draft" | "active" | "retired";
  component: string;
  stem: string;
  type: "single" | "multi" | "short_answer";
  responses: number;
  correctRate: number | null;
  discrimination: number | null;
  flags: StatFlag[];
  options: { id: string; label: string; isCorrect: boolean; count: number }[];
};

export async function questionAnalytics(
  ctx: Ctx,
  actor: AccessContext | null,
  blueprintId: string,
): Promise<QuestionRow[]> {
  const a = await authorize(ctx, actor, ANALYTICS, "analytics.view");
  const scope = await cohortScope(ctx, a, ["assessor", "moderator"]);
  const attempts = (
    await ctx.db
      .select({ id: assessmentAttempts.id, cohortId: enrolments.cohortId })
      .from(assessmentAttempts)
      .innerJoin(enrolments, eq(enrolments.id, assessmentAttempts.enrolmentId))
      .where(
        and(
          eq(assessmentAttempts.blueprintId, blueprintId),
          inArray(assessmentAttempts.status, ["submitted", "graded"]),
        ),
      )
  ).filter((r) => inScope(scope, r.cohortId));
  const attemptIds = attempts.map((x) => x.id);
  const items = attemptIds.length
    ? await ctx.db
        .select({
          attemptId: attemptItems.attemptId,
          versionId: attemptItems.questionVersionId,
          response: attemptItems.responseOptionIds,
          isCorrect: attemptItems.isCorrect,
        })
        .from(attemptItems)
        .where(and(inArray(attemptItems.attemptId, attemptIds), isNotNull(attemptItems.isCorrect)))
    : [];
  // Overall auto-marked score per attempt (short answers excluded so marking
  // progress doesn't move the statistics).
  const score = new Map<string, { c: number; n: number }>();
  for (const it of items) {
    const s = score.get(it.attemptId) ?? { c: 0, n: 0 };
    s.n++;
    if (it.isCorrect) s.c++;
    score.set(it.attemptId, s);
  }

  // Every question in the blueprint's banks (so unanswered questions show too).
  const bankRows = await ctx.db
    .select({ bankId: blueprintRules.bankId, component: blueprintRules.curriculumComponentRef })
    .from(blueprintRules)
    .where(eq(blueprintRules.blueprintId, blueprintId));
  const bankIds = bankRows.map((b) => b.bankId);
  if (bankIds.length === 0) return [];
  const versions = await ctx.db
    .select({ v: questionVersions, q: questions })
    .from(questionVersions)
    .innerJoin(questions, eq(questions.id, questionVersions.questionId))
    .where(inArray(questions.bankId, bankIds));
  const servedVersionIds = new Set(items.map((i) => i.versionId));
  const shown = versions.filter((x) => x.q.currentVersionId === x.v.id || servedVersionIds.has(x.v.id));
  const opts = shown.length
    ? await ctx.db
        .select()
        .from(answerOptions)
        .where(inArray(answerOptions.questionVersionId, shown.map((x) => x.v.id)))
        .orderBy(asc(answerOptions.authorOrder))
    : [];

  const rows: QuestionRow[] = shown.map(({ v, q }) => {
    const options = opts.filter((o) => o.questionVersionId === v.id);
    const responses = items
      .filter((i) => i.versionId === v.id)
      .map((i) => {
        const s = score.get(i.attemptId)!;
        return {
          attemptId: i.attemptId,
          attemptScore: s.n ? s.c / s.n : 0,
          isCorrect: i.isCorrect === true,
          chosenOptionIds: i.response ?? [],
        };
      });
    const st = versionStats(responses, options);
    return {
      questionId: q.id,
      versionId: v.id,
      versionNo: v.versionNo,
      isCurrent: q.currentVersionId === v.id,
      questionStatus: q.status,
      component: bankRows.find((b) => b.bankId === q.bankId)?.component ?? "",
      stem: v.stem,
      type: v.type,
      responses: st.responses,
      correctRate: st.correctRate,
      discrimination: st.discrimination,
      flags: st.flags,
      options: options.map((o) => ({ id: o.id, label: o.label, isCorrect: o.isCorrect, count: st.optionCounts.get(o.id) ?? 0 })),
    };
  });
  rows.sort((x, y) => y.flags.length - x.flags.length || x.component.localeCompare(y.component) || x.stem.localeCompare(y.stem));
  await writeAudit(ctx, {
    action: "assessment.analytics.viewed",
    actorId: a.userId,
    entityType: "assessment_blueprint",
    entityId: blueprintId,
    after: { attempts: attemptIds.length },
  });
  return rows;
}

// ---------------------------------------------------------------------------
// Coverage report
// ---------------------------------------------------------------------------

export type CoverageReport = {
  blueprint: { id: string; title: string; kind: string };
  cohort: { id: string; name: string };
  papers: number;
  fallbackPapers: number;
  rules: { component: string; required: number; minServed: number; maxServed: number; ok: boolean }[];
  /** Curriculum components of the module (from its sections) that no rule covers. */
  uncovered: string[];
  allEqual: boolean;
};

export async function coverageReport(
  ctx: Ctx,
  actor: AccessContext | null,
  blueprintId: string,
  cohortId: string,
): Promise<CoverageReport> {
  const a = await authorize(ctx, actor, COVERAGE, "coverage.view");
  const [bp] = await ctx.db.select().from(assessmentBlueprints).where(eq(assessmentBlueprints.id, blueprintId));
  const [cohort] = await ctx.db.select({ id: cohorts.id, name: cohorts.name }).from(cohorts).where(eq(cohorts.id, cohortId));
  if (!bp || !cohort) throw new AssessmentError("not_found", "Not found.");
  const rules = await ctx.db.select().from(blueprintRules).where(eq(blueprintRules.blueprintId, blueprintId));

  const attempts = await ctx.db
    .select({ id: assessmentAttempts.id, usedFallback: assessmentAttempts.usedFallback })
    .from(assessmentAttempts)
    .innerJoin(enrolments, eq(enrolments.id, assessmentAttempts.enrolmentId))
    .where(and(eq(assessmentAttempts.blueprintId, blueprintId), eq(enrolments.cohortId, cohortId)));
  const ids = attempts.map((x) => x.id);
  const served = ids.length
    ? await ctx.db
        .select({ attemptId: attemptItems.attemptId, bankId: questions.bankId })
        .from(attemptItems)
        .innerJoin(questionVersions, eq(questionVersions.id, attemptItems.questionVersionId))
        .innerJoin(questions, eq(questions.id, questionVersions.questionId))
        .where(inArray(attemptItems.attemptId, ids))
    : [];

  const ruleRows = rules
    .sort((x, y) => x.curriculumComponentRef.localeCompare(y.curriculumComponentRef))
    .map((r) => {
      const perPaper = ids.map((id) => served.filter((s) => s.attemptId === id && s.bankId === r.bankId).length);
      const minServed = perPaper.length ? Math.min(...perPaper) : 0;
      const maxServed = perPaper.length ? Math.max(...perPaper) : 0;
      return {
        component: r.curriculumComponentRef,
        required: r.questionCount,
        minServed,
        maxServed,
        ok: perPaper.every((n) => n === r.questionCount),
      };
    });

  const moduleComponents = await ctx.db
    .selectDistinct({ ref: sections.curriculumComponentRef })
    .from(sections)
    .where(eq(sections.moduleId, bp.moduleId));
  const bankComponents = await ctx.db
    .select({ ref: questionBanks.curriculumComponentRef })
    .from(questionBanks)
    .where(inArray(questionBanks.id, rules.length ? rules.map((r) => r.bankId) : ["00000000-0000-0000-0000-000000000000"]));
  const covered = new Set([...rules.map((r) => r.curriculumComponentRef), ...bankComponents.map((b) => b.ref)]);
  await writeAudit(ctx, {
    action: "assessment.coverage.viewed",
    actorId: a.userId,
    entityType: "assessment_blueprint",
    entityId: blueprintId,
    after: { cohortId, papers: ids.length },
  });
  return {
    blueprint: { id: bp.id, title: bp.title, kind: bp.kind },
    cohort,
    papers: ids.length,
    fallbackPapers: attempts.filter((x) => x.usedFallback).length,
    rules: ruleRows,
    uncovered: moduleComponents.map((m) => m.ref).filter((r) => !covered.has(r)).sort(),
    allEqual: ruleRows.every((r) => r.ok),
  };
}
