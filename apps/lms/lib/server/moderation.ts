import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  appeals,
  assessmentAttempts,
  assessmentBlueprints,
  assessmentDecisions,
  cohorts,
  enrolments,
  moderationBatches,
  moderationRecords,
  users,
} from "db";
import type { AccessContext, Requirement } from "@/lib/access";
import { AssessmentError } from "./assessments";
import { writeAudit } from "./audit";
import { authorize } from "./auth";
import type { ServerCtx } from "./context";
import { assertCohortScope, cohortScope, inScope } from "./staffScope";

/**
 * Moderation (design.md S7) and appeals (design-gate decision 2026-11-08:
 * decided by a moderator who did not make the decision). Closing a batch
 * releases every decision in it to learners (database trigger).
 */

const MODERATOR: Requirement = { kind: "roles", anyOf: ["moderator"], stepUp: true };
type Ctx = ServerCtx;

const NOT_SUPERSEDED = sql`NOT EXISTS (SELECT 1 FROM "assessment_decisions" "newer" WHERE "newer"."supersedes_id" = "assessment_decisions"."id")`;

export async function listBatches(ctx: Ctx, actor: AccessContext | null) {
  const a = await authorize(ctx, actor, MODERATOR, "moderation.list");
  const scope = await cohortScope(ctx, a, ["moderator"]);
  const rows = await ctx.db
    .select({
      id: moderationBatches.id,
      status: moderationBatches.status,
      closedAt: moderationBatches.closedAt,
      cohortId: cohorts.id,
      cohortName: cohorts.name,
      title: assessmentBlueprints.title,
      decisions: sql<number>`(SELECT count(*)::int FROM "assessment_decisions" d WHERE d.batch_id = "moderation_batches"."id" AND NOT EXISTS (SELECT 1 FROM "assessment_decisions" n WHERE n.supersedes_id = d.id))`,
      moderated: sql<number>`(SELECT count(DISTINCT m.decision_id)::int FROM "moderation_records" m JOIN "assessment_decisions" d ON d.id = m.decision_id WHERE d.batch_id = "moderation_batches"."id")`,
    })
    .from(moderationBatches)
    .innerJoin(cohorts, eq(cohorts.id, moderationBatches.cohortId))
    .innerJoin(assessmentBlueprints, eq(assessmentBlueprints.id, moderationBatches.blueprintId))
    .orderBy(asc(moderationBatches.status), desc(moderationBatches.createdAt));
  return rows.filter((r) => inScope(scope, r.cohortId));
}

async function loadBatch(ctx: Ctx, batchId: string) {
  const [b] = await ctx.db
    .select({
      batch: moderationBatches,
      cohortName: cohorts.name,
      title: assessmentBlueprints.title,
    })
    .from(moderationBatches)
    .innerJoin(cohorts, eq(cohorts.id, moderationBatches.cohortId))
    .innerJoin(assessmentBlueprints, eq(assessmentBlueprints.id, moderationBatches.blueprintId))
    .where(eq(moderationBatches.id, batchId));
  if (!b) throw new AssessmentError("not_found", "Batch not found.");
  return b;
}

export async function getBatch(ctx: Ctx, actor: AccessContext | null, batchId: string) {
  const a = await authorize(ctx, actor, MODERATOR, "moderation.batch");
  const b = await loadBatch(ctx, batchId);
  await assertCohortScope(ctx, a, ["moderator"], b.batch.cohortId, "moderation.batch");
  const decisions = await ctx.db
    .select({
      id: assessmentDecisions.id,
      attemptId: assessmentDecisions.attemptId,
      outcome: assessmentDecisions.outcome,
      decidedAt: assessmentDecisions.decidedAt,
      assessorId: assessmentDecisions.assessorId,
      assessorName: users.displayName,
      learnerName: sql<string>`(SELECT u.display_name FROM "users" u JOIN "enrolments" e ON e.user_id = u.id JOIN "assessment_attempts" t ON t.enrolment_id = e.id WHERE t.id = "assessment_decisions"."attempt_id")`,
    })
    .from(assessmentDecisions)
    .innerJoin(users, eq(users.id, assessmentDecisions.assessorId))
    .where(and(eq(assessmentDecisions.batchId, batchId), NOT_SUPERSEDED))
    .orderBy(asc(assessmentDecisions.decidedAt));
  const ids = decisions.map((d) => d.id);
  const mods = ids.length
    ? await ctx.db
        .select()
        .from(moderationRecords)
        .where(inArray(moderationRecords.decisionId, ids))
        .orderBy(desc(moderationRecords.moderatedAt))
    : [];
  const learners = new Set(decisions.map((d) => d.attemptId)).size;
  return {
    ...b,
    decisions: decisions.map((d) => ({
      ...d,
      moderation: mods.find((m) => m.decisionId === d.id) ?? null,
      ownDecision: d.assessorId === a.userId,
    })),
    learnersToNotify: learners,
  };
}

export async function moderateDecision(
  ctx: Ctx,
  actor: AccessContext | null,
  decisionId: string,
  outcome: string,
  findings: string,
) {
  const a = await authorize(ctx, actor, MODERATOR, "moderation.record");
  if (outcome !== "upheld" && outcome !== "referred_back") {
    throw new AssessmentError("invalid_answer", "Choose Upheld or Referred back.");
  }
  const text = findings.trim();
  if (!text) throw new AssessmentError("invalid_answer", "Write your moderation findings.");
  const [d] = await ctx.db
    .select({ d: assessmentDecisions, batch: moderationBatches })
    .from(assessmentDecisions)
    .innerJoin(moderationBatches, eq(moderationBatches.id, assessmentDecisions.batchId))
    .where(eq(assessmentDecisions.id, decisionId));
  if (!d) throw new AssessmentError("not_found", "Decision not found.");
  await assertCohortScope(ctx, a, ["moderator"], d.batch.cohortId, "moderation.record");
  if (d.batch.status !== "open") throw new AssessmentError("submitted", "This batch is closed.");
  if (d.d.assessorId === a.userId) {
    throw new AssessmentError("invalid_answer", "You can't moderate a decision you made.");
  }
  const [m] = await ctx.db
    .insert(moderationRecords)
    .values({ decisionId, moderatorId: a.userId, outcome, findings: text.slice(0, 8000), moderatedAt: ctx.now() })
    .returning({ id: moderationRecords.id });
  await writeAudit(ctx, {
    action: "assessment.moderation.recorded",
    actorId: a.userId,
    entityType: "assessment_decision",
    entityId: decisionId,
    after: { outcome, moderationId: m!.id },
  });
}

/** Close the sample and release every decision in the batch to learners. */
export async function closeBatch(ctx: Ctx, actor: AccessContext | null, batchId: string): Promise<number> {
  const a = await authorize(ctx, actor, MODERATOR, "moderation.close");
  const b = await loadBatch(ctx, batchId);
  await assertCohortScope(ctx, a, ["moderator"], b.batch.cohortId, "moderation.close");
  if (b.batch.status !== "open") return 0;
  const count = await ctx.db
    .select({ n: sql<number>`count(*)::int` })
    .from(assessmentDecisions)
    .where(and(eq(assessmentDecisions.batchId, batchId), NOT_SUPERSEDED));
  const n = Number(count[0]?.n ?? 0);
  if (n === 0) throw new AssessmentError("invalid_answer", "There are no decisions to release.");
  const now = ctx.now();
  await ctx.db
    .update(moderationBatches)
    .set({ status: "closed", closedAt: now, closedBy: a.userId })
    .where(and(eq(moderationBatches.id, batchId), eq(moderationBatches.status, "open")));
  await writeAudit(ctx, {
    action: "assessment.batch.closed",
    actorId: a.userId,
    entityType: "moderation_batch",
    entityId: batchId,
    after: { released: n },
  });
  return n;
}

// ---------------------------------------------------------------------------
// Appeals
// ---------------------------------------------------------------------------

export async function listAppeals(ctx: Ctx, actor: AccessContext | null) {
  const a = await authorize(ctx, actor, MODERATOR, "appeals.list");
  const scope = await cohortScope(ctx, a, ["moderator"]);
  const rows = await ctx.db
    .select({
      id: appeals.id,
      status: appeals.status,
      submittedAt: appeals.submittedAt,
      decidedAt: appeals.decidedAt,
      attemptId: assessmentDecisions.attemptId,
      outcome: assessmentDecisions.outcome,
      assessorId: assessmentDecisions.assessorId,
      cohortId: enrolments.cohortId,
      cohortName: cohorts.name,
      learnerName: users.displayName,
      title: assessmentBlueprints.title,
    })
    .from(appeals)
    .innerJoin(assessmentDecisions, eq(assessmentDecisions.id, appeals.decisionId))
    .innerJoin(enrolments, eq(enrolments.id, appeals.enrolmentId))
    .innerJoin(cohorts, eq(cohorts.id, enrolments.cohortId))
    .innerJoin(users, eq(users.id, enrolments.userId))
    .innerJoin(assessmentAttempts, eq(assessmentAttempts.id, assessmentDecisions.attemptId))
    .innerJoin(assessmentBlueprints, eq(assessmentBlueprints.id, assessmentAttempts.blueprintId))
    .orderBy(asc(appeals.status), asc(appeals.submittedAt));
  return rows
    .filter((r) => inScope(scope, r.cohortId))
    .map((r) => ({ ...r, ownDecision: r.assessorId === a.userId }));
}

async function loadAppeal(ctx: Ctx, appealId: string) {
  const [row] = await ctx.db
    .select({ appeal: appeals, decision: assessmentDecisions, cohortId: enrolments.cohortId })
    .from(appeals)
    .innerJoin(assessmentDecisions, eq(assessmentDecisions.id, appeals.decisionId))
    .innerJoin(enrolments, eq(enrolments.id, appeals.enrolmentId))
    .where(eq(appeals.id, appealId));
  if (!row) throw new AssessmentError("not_found", "Appeal not found.");
  return row;
}

export async function getAppeal(ctx: Ctx, actor: AccessContext | null, appealId: string) {
  const a = await authorize(ctx, actor, MODERATOR, "appeals.view");
  const row = await loadAppeal(ctx, appealId);
  await assertCohortScope(ctx, a, ["moderator"], row.cohortId, "appeals.view");
  return { ...row, ownDecision: row.decision.assessorId === a.userId };
}

export async function decideAppeal(
  ctx: Ctx,
  actor: AccessContext | null,
  appealId: string,
  outcome: string,
  notes: string,
) {
  const a = await authorize(ctx, actor, MODERATOR, "appeals.decide");
  if (outcome !== "upheld" && outcome !== "reassess") {
    throw new AssessmentError("invalid_answer", "Choose Uphold or Reassess.");
  }
  const text = notes.trim();
  if (!text) throw new AssessmentError("invalid_answer", "Explain the outcome for the learner.");
  const row = await loadAppeal(ctx, appealId);
  await assertCohortScope(ctx, a, ["moderator"], row.cohortId, "appeals.decide");
  if (row.decision.assessorId === a.userId) {
    throw new AssessmentError("invalid_answer", "You made this decision, so another moderator must decide the appeal.");
  }
  if (row.appeal.status !== "open") throw new AssessmentError("submitted", "This appeal has been decided.");
  await ctx.db
    .update(appeals)
    .set({ status: outcome, decidedBy: a.userId, decidedAt: ctx.now(), outcomeNotes: text.slice(0, 4000) })
    .where(and(eq(appeals.id, appealId), eq(appeals.status, "open")));
  await writeAudit(ctx, {
    action: "assessment.appeal.decided",
    actorId: a.userId,
    entityType: "appeal",
    entityId: appealId,
    after: { outcome },
  });
}
