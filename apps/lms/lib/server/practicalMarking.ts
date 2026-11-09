import { and, asc, eq, inArray } from "drizzle-orm";
import {
  appeals,
  assessmentDays,
  assessmentDecisions,
  assessmentSchedules,
  attendanceRecords,
  briefVariants,
  cohorts,
  criterionJudgements,
  enrolments,
  evidenceItems,
  moderationActionCompletions,
  moderationBatches,
  moderationRecords,
  modules,
  practicalBriefs,
  practicalDecisionDrafts,
  registerSignoffs,
  submissions,
  users,
} from "db";
import type { AccessContext, Requirement } from "@/lib/access";
import { writeAudit } from "./audit";
import { authorize } from "./auth";
import type { ServerCtx } from "./context";
import { moderatedStatus, type QueueStatus } from "./marking";
import { sampleReassessment } from "./moderation";
import { criteriaOf, currentSubmissionDecision, EVIDENCE_ROLES, PracticalError } from "./practical";
import { assertCohortScope, cohortScope, inScope } from "./staffScope";
import { staffMayOpen } from "./virusScan";

/**
 * Practical marking (design.md S5, design-gate decisions 2026-11-08):
 * evidence on the left; Met / Not yet met per criterion with comments,
 * feedback and Competent / Not yet competent on the right. "Competent" is
 * suggested only when every criterion is met; the assessor decides. A
 * recorded decision is final (new versions only); judgements lock with it.
 */

const ASSESSOR: Requirement = { kind: "roles", anyOf: ["assessor"], stepUp: true };
const VIEW: Requirement = { kind: "roles", anyOf: EVIDENCE_ROLES, stepUp: true };
type Ctx = ServerCtx;

export type PracticalQueueRow = {
  submissionId: string;
  learnerName: string;
  cohortName: string;
  title: string;
  variantLabel: string;
  attemptNo: number;
  observed: boolean;
  submittedAt: Date | null;
  toJudge: number;
  status: QueueStatus;
  outcome: "competent" | "not_yet_competent" | null;
};

export async function practicalQueue(ctx: Ctx, actor: AccessContext | null): Promise<PracticalQueueRow[]> {
  const a = await authorize(ctx, actor, ASSESSOR, "practical.queue");
  const scope = await cohortScope(ctx, a, ["assessor"]);
  const rows = (
    await ctx.db
      .select({
        s: submissions,
        learnerName: users.displayName,
        cohortId: cohorts.id,
        cohortName: cohorts.name,
        title: practicalBriefs.title,
        variantLabel: briefVariants.label,
      })
      .from(submissions)
      .innerJoin(practicalBriefs, eq(practicalBriefs.id, submissions.briefId))
      .innerJoin(briefVariants, eq(briefVariants.id, submissions.briefVariantId))
      .innerJoin(enrolments, eq(enrolments.id, submissions.enrolmentId))
      .innerJoin(users, eq(users.id, enrolments.userId))
      .innerJoin(cohorts, eq(cohorts.id, enrolments.cohortId))
      .where(eq(submissions.status, "submitted"))
      .orderBy(asc(submissions.submittedAt), asc(submissions.id))
  ).filter((r) => inScope(scope, r.cohortId));
  const ids = rows.map((r) => r.s.id);
  const judged = ids.length
    ? await ctx.db
        .select({ submissionId: criterionJudgements.submissionId })
        .from(criterionJudgements)
        .where(inArray(criterionJudgements.submissionId, ids))
    : [];
  const drafts = ids.length
    ? await ctx.db
        .select({ submissionId: practicalDecisionDrafts.submissionId })
        .from(practicalDecisionDrafts)
        .where(and(inArray(practicalDecisionDrafts.submissionId, ids), eq(practicalDecisionDrafts.assessorId, a.userId)))
    : [];
  const out: PracticalQueueRow[] = [];
  for (const r of rows) {
    const total = (await criteriaOf(ctx, r.s.briefId)).length;
    const done = judged.filter((j) => j.submissionId === r.s.id).length;
    const d = await currentSubmissionDecision(ctx, r.s.id);
    let status: QueueStatus;
    if (d) status = await moderatedStatus(ctx, d);
    else if (done < total) status = "needs_marking";
    else if (drafts.some((x) => x.submissionId === r.s.id)) status = "draft";
    else status = "ready";
    out.push({
      submissionId: r.s.id,
      learnerName: r.learnerName,
      cohortName: r.cohortName,
      title: r.title,
      variantLabel: r.variantLabel,
      attemptNo: r.s.attemptNo,
      observed: r.s.observed,
      submittedAt: r.s.submittedAt,
      toJudge: total - done,
      status,
      outcome: d?.outcome ?? null,
    });
  }
  return out;
}

async function loadSubmission(ctx: Ctx, submissionId: string) {
  const [row] = await ctx.db
    .select({
      s: submissions,
      brief: practicalBriefs,
      variant: briefVariants,
      moduleCode: modules.code,
      learnerName: users.displayName,
      cohortId: cohorts.id,
      cohortName: cohorts.name,
    })
    .from(submissions)
    .innerJoin(practicalBriefs, eq(practicalBriefs.id, submissions.briefId))
    .innerJoin(briefVariants, eq(briefVariants.id, submissions.briefVariantId))
    .innerJoin(modules, eq(modules.id, practicalBriefs.moduleId))
    .innerJoin(enrolments, eq(enrolments.id, submissions.enrolmentId))
    .innerJoin(users, eq(users.id, enrolments.userId))
    .innerJoin(cohorts, eq(cohorts.id, enrolments.cohortId))
    .where(eq(submissions.id, submissionId));
  if (!row || row.s.status !== "submitted") throw new PracticalError("not_found", "Submission not found.");

  const evidence = (
    await ctx.db.select().from(evidenceItems).where(eq(evidenceItems.submissionId, submissionId)).orderBy(asc(evidenceItems.createdAt))
  ).map((e) => ({
    id: e.id,
    kind: e.kind,
    source: e.source,
    fileName: e.fileName,
    mimeType: e.mimeType,
    sizeBytes: e.sizeBytes,
    checksumSha256: e.checksumSha256,
    linkUrl: e.linkUrl,
    linkHost: e.linkHost,
    scanStatus: e.scanStatus,
    openable: e.kind === "link" || staffMayOpen(e.scanStatus),
    createdAt: e.createdAt,
  }));
  const criteria = await criteriaOf(ctx, row.brief.id);
  const judgements = await ctx.db.select().from(criterionJudgements).where(eq(criterionJudgements.submissionId, submissionId));
  const decisions = await ctx.db
    .select({ d: assessmentDecisions, assessorName: users.displayName })
    .from(assessmentDecisions)
    .innerJoin(users, eq(users.id, assessmentDecisions.assessorId))
    .where(eq(assessmentDecisions.submissionId, submissionId))
    .orderBy(asc(assessmentDecisions.decidedAt));
  const decisionIds = decisions.map((x) => x.d.id);
  const moderation = decisionIds.length
    ? await ctx.db
        .select({ m: moderationRecords, moderatorName: users.displayName, completion: moderationActionCompletions })
        .from(moderationRecords)
        .innerJoin(users, eq(users.id, moderationRecords.moderatorId))
        .leftJoin(moderationActionCompletions, eq(moderationActionCompletions.moderationRecordId, moderationRecords.id))
        .where(inArray(moderationRecords.decisionId, decisionIds))
    : [];
  const appealRows = decisionIds.length ? await ctx.db.select().from(appeals).where(inArray(appeals.decisionId, decisionIds)) : [];

  let sitting: null | { heldOn: string; venue: string; attendance: string | null; idVerified: boolean; signedOffBy: string | null } = null;
  if (row.s.scheduleId) {
    const [d] = await ctx.db
      .select({ id: assessmentDays.id, heldOn: assessmentDays.heldOn, venue: assessmentDays.venue })
      .from(assessmentSchedules)
      .innerJoin(assessmentDays, eq(assessmentDays.id, assessmentSchedules.assessmentDayId))
      .where(eq(assessmentSchedules.id, row.s.scheduleId));
    if (d) {
      const [att] = await ctx.db
        .select()
        .from(attendanceRecords)
        .where(and(eq(attendanceRecords.assessmentDayId, d.id), eq(attendanceRecords.enrolmentId, row.s.enrolmentId)));
      const [so] = await ctx.db
        .select({ by: users.displayName })
        .from(registerSignoffs)
        .innerJoin(users, eq(users.id, registerSignoffs.signedBy))
        .where(eq(registerSignoffs.assessmentDayId, d.id));
      sitting = { heldOn: d.heldOn, venue: d.venue, attendance: att?.status ?? null, idVerified: att?.idVerifiedAt != null, signedOffBy: so?.by ?? null };
    }
  }

  const judgedAll = criteria.every((c) => judgements.some((j) => j.criterionId === c.id));
  const allMet = judgedAll && judgements.filter((j) => criteria.some((c) => c.id === j.criterionId)).every((j) => j.met);
  return {
    submission: row.s,
    brief: row.brief,
    variant: row.variant,
    moduleCode: row.moduleCode,
    learner: { name: row.learnerName },
    cohort: { id: row.cohortId, name: row.cohortName },
    evidence,
    criteria: criteria.map((c) => {
      const j = judgements.find((x) => x.criterionId === c.id);
      return { ...c, met: j ? j.met : null, comment: j?.comment ?? null };
    }),
    judgedAll,
    suggested: judgedAll ? (allMet ? ("competent" as const) : ("not_yet_competent" as const)) : null,
    sitting,
    decisions: decisions.map((x) => ({
      ...x.d,
      assessorName: x.assessorName,
      superseded: decisions.some((y) => y.d.supersedesId === x.d.id),
      moderation: moderation
        .filter((m) => m.m.decisionId === x.d.id)
        .map((m) => ({ ...m.m, moderatorName: m.moderatorName, completion: m.completion })),
      appeal: appealRows.find((p) => p.decisionId === x.d.id) ?? null,
    })),
  };
}

export type PracticalReplay = Awaited<ReturnType<typeof loadSubmission>>;

/** Read-only view for assessors, moderators and evaluators (in their cohorts). */
export async function getSubmissionView(ctx: Ctx, actor: AccessContext | null, submissionId: string) {
  const a = await authorize(ctx, actor, VIEW, "practical.view");
  const v = await loadSubmission(ctx, submissionId);
  await assertCohortScope(ctx, a, EVIDENCE_ROLES, v.cohort.id, "practical.view");
  return v;
}

/** If this submission is a reassessment ordered on appeal, the appealed decision's assessor. */
async function reassessmentAssessor(ctx: Ctx, s: typeof submissions.$inferSelect): Promise<string | null> {
  if (s.attemptNo < 2) return null;
  const [prev] = await ctx.db
    .select({ id: submissions.id })
    .from(submissions)
    .where(and(eq(submissions.enrolmentId, s.enrolmentId), eq(submissions.briefId, s.briefId), eq(submissions.attemptNo, s.attemptNo - 1)));
  if (!prev) return null;
  const [row] = await ctx.db
    .select({ assessorId: assessmentDecisions.assessorId })
    .from(appeals)
    .innerJoin(assessmentDecisions, eq(assessmentDecisions.id, appeals.decisionId))
    .where(and(eq(assessmentDecisions.submissionId, prev.id), eq(appeals.status, "reassess")));
  return row?.assessorId ?? null;
}

export async function getPracticalMarkingView(ctx: Ctx, actor: AccessContext | null, submissionId: string) {
  const a = await authorize(ctx, actor, ASSESSOR, "practical.marking");
  const v = await loadSubmission(ctx, submissionId);
  await assertCohortScope(ctx, a, ["assessor"], v.cohort.id, "practical.marking");
  const [draft] = await ctx.db
    .select()
    .from(practicalDecisionDrafts)
    .where(and(eq(practicalDecisionDrafts.submissionId, submissionId), eq(practicalDecisionDrafts.assessorId, a.userId)));
  const current = v.decisions.find((d) => !d.superseded) ?? null;
  const batchOpen = current
    ? (await ctx.db.select({ s: moderationBatches.status }).from(moderationBatches).where(eq(moderationBatches.id, current.batchId)))[0]?.s === "open"
    : true;
  const queue = await practicalQueue(ctx, a);
  const idx = queue.findIndex((q) => q.submissionId === submissionId);
  return {
    ...v,
    draft: draft ?? null,
    current,
    canDecide: v.judgedAll && batchOpen,
    blockedReason: !v.judgedAll ? ("judging" as const) : !batchOpen ? ("released" as const) : null,
    prevId: idx > 0 ? queue[idx - 1]!.submissionId : null,
    nextId: idx >= 0 && idx < queue.length - 1 ? queue[idx + 1]!.submissionId : null,
  };
}

async function assessorSubmission(ctx: Ctx, actor: AccessContext | null, submissionId: string, target: string) {
  const a = await authorize(ctx, actor, ASSESSOR, target);
  const [row] = await ctx.db
    .select({ s: submissions, cohortId: enrolments.cohortId })
    .from(submissions)
    .innerJoin(enrolments, eq(enrolments.id, submissions.enrolmentId))
    .where(eq(submissions.id, submissionId));
  if (!row || row.s.status !== "submitted") throw new PracticalError("not_found", "Submission not found.");
  await assertCohortScope(ctx, a, ["assessor"], row.cohortId, target);
  return { a, s: row.s, cohortId: row.cohortId };
}

/** Save Met / Not yet met (and comments) for some or all criteria. */
export async function saveJudgements(
  ctx: Ctx,
  actor: AccessContext | null,
  submissionId: string,
  input: Record<string, { met: boolean; comment: string }>,
  observationNotes?: string,
) {
  const { a, s } = await assessorSubmission(ctx, actor, submissionId, "practical.judge");
  if (await currentSubmissionDecision(ctx, submissionId)) {
    throw new PracticalError("submitted", "A decision has been recorded; the judgements are locked.");
  }
  const criteria = await criteriaOf(ctx, s.briefId);
  const now = ctx.now();
  let n = 0;
  await ctx.db.transaction(async (tx) => {
    for (const c of criteria) {
      const j = input[c.id];
      if (!j) continue;
      n++;
      const comment = j.comment.trim().slice(0, 2000) || null;
      await tx
        .insert(criterionJudgements)
        .values({ submissionId, criterionId: c.id, met: j.met, comment, judgedBy: a.userId, judgedAt: now })
        .onConflictDoUpdate({
          target: [criterionJudgements.tenantId, criterionJudgements.submissionId, criterionJudgements.criterionId],
          set: { met: j.met, comment, judgedBy: a.userId, judgedAt: now },
        });
    }
    if (s.observed && observationNotes !== undefined) {
      await tx
        .update(submissions)
        .set({ observationNotes: observationNotes.trim().slice(0, 8000) || null })
        .where(eq(submissions.id, submissionId));
    }
  });
  await writeAudit(ctx, {
    action: "practical.judgements.saved",
    actorId: a.userId,
    entityType: "submission",
    entityId: submissionId,
    after: { criteria: n },
  });
}

export async function savePracticalDraft(ctx: Ctx, actor: AccessContext | null, submissionId: string, outcome: string | null, feedback: string) {
  const { a } = await assessorSubmission(ctx, actor, submissionId, "practical.draft");
  const o = outcome === "competent" || outcome === "not_yet_competent" ? outcome : null;
  await ctx.db
    .insert(practicalDecisionDrafts)
    .values({ submissionId, assessorId: a.userId, outcome: o, feedback: feedback.slice(0, 8000) })
    .onConflictDoUpdate({
      target: [practicalDecisionDrafts.submissionId, practicalDecisionDrafts.assessorId],
      set: { outcome: o, feedback: feedback.slice(0, 8000) },
    });
}

async function openBriefBatch(ctx: Ctx, cohortId: string, briefId: string): Promise<string> {
  const find = async () =>
    (
      await ctx.db
        .select({ id: moderationBatches.id })
        .from(moderationBatches)
        .where(and(eq(moderationBatches.cohortId, cohortId), eq(moderationBatches.briefId, briefId), eq(moderationBatches.status, "open")))
    )[0]?.id;
  const existing = await find();
  if (existing) return existing;
  const [created] = await ctx.db
    .insert(moderationBatches)
    .values({ cohortId, briefId })
    .onConflictDoNothing()
    .returning({ id: moderationBatches.id });
  return created?.id ?? (await find())!;
}

/** Record a final practical decision (a new version if one exists). */
export async function recordPracticalDecision(
  ctx: Ctx,
  actor: AccessContext | null,
  submissionId: string,
  outcome: string,
  feedback: string,
): Promise<string> {
  const { a, s, cohortId } = await assessorSubmission(ctx, actor, submissionId, "practical.decide");
  if (outcome !== "competent" && outcome !== "not_yet_competent") {
    throw new PracticalError("invalid", "Choose Competent or Not yet competent.");
  }
  const text = feedback.trim();
  if (text.length < 1 || text.length > 8000) throw new PracticalError("invalid", "Write feedback for the learner.");
  const criteria = await criteriaOf(ctx, s.briefId);
  const judged = await ctx.db.select({ c: criterionJudgements.criterionId }).from(criterionJudgements).where(eq(criterionJudgements.submissionId, submissionId));
  if (!criteria.every((c) => judged.some((j) => j.c === c.id))) {
    throw new PracticalError("invalid", "Judge every criterion before recording a decision.");
  }
  const previous = await currentSubmissionDecision(ctx, submissionId);
  if (previous?.releasedAt) throw new PracticalError("submitted", "This result has been released. Changes go through an appeal.");
  const batchId = previous?.batchId ?? (await openBriefBatch(ctx, cohortId, s.briefId));
  const [d] = await ctx.db
    .insert(assessmentDecisions)
    .values({
      assessorId: a.userId,
      submissionId,
      batchId,
      outcome,
      feedback: text,
      supersedesId: previous?.id ?? null,
      decidedAt: ctx.now(),
    })
    .returning({ id: assessmentDecisions.id });
  await ctx.db
    .delete(practicalDecisionDrafts)
    .where(and(eq(practicalDecisionDrafts.submissionId, submissionId), eq(practicalDecisionDrafts.assessorId, a.userId)));
  // A reassessment ordered on appeal is marked by the cohort's (only) assessor
  // and is always in the moderation sample (design.md §14, 2026-11-08).
  if (await reassessmentAssessor(ctx, s)) await sampleReassessment(ctx, batchId, { submissionId }, a.userId);
  await writeAudit(ctx, {
    action: "practical.decision.recorded",
    actorId: a.userId,
    entityType: "assessment_decision",
    entityId: d!.id,
    after: { submissionId, outcome, supersedes: previous?.id ?? null },
  });
  return d!.id;
}
