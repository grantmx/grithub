import { and, asc, eq, inArray } from "drizzle-orm";
import {
  answerOptions,
  appeals,
  assessmentAttempts,
  assessmentBlueprints,
  assessmentDays,
  assessmentDecisions,
  assessmentSchedules,
  attemptItems,
  attendanceRecords,
  cohorts,
  decisionDrafts,
  enrolments,
  itemMarks,
  moderationActionCompletions,
  moderationBatches,
  moderationRecords,
  modules,
  questionVersions,
  registerSignoffs,
  rubricCriteria,
  users,
} from "db";
import type { AccessContext, Requirement, StaffRole } from "@/lib/access";
import { AssessmentError, currentDecision, finaliseExpired } from "./assessments";
import { writeAudit } from "./audit";
import { sampleReassessment } from "./moderation";
import { authorize } from "./auth";
import type { ServerCtx } from "./context";
import { assertCohortScope, cohortScope, inScope } from "./staffScope";

/**
 * Assessor marking (design.md S5/S6, design-gate decision 2026-11-08: per
 * learner split view). Short answers are marked per rubric criterion; the
 * assessor records Competent / Not yet competent with feedback. A recorded
 * decision is final: a change is a new decision that supersedes it (allowed
 * until the moderation batch closes). Marks lock once a decision exists.
 */

const ASSESSOR: Requirement = { kind: "roles", anyOf: ["assessor"], stepUp: true };
/** Who may see a paper replay with answer keys (decision 2026-11-08: not facilitators or admins). */
export const KEY_ROLES: readonly StaffRole[] = ["assessor", "moderator", "external_evaluator"];
const REPLAY: Requirement = { kind: "roles", anyOf: KEY_ROLES, stepUp: true };

type Ctx = ServerCtx;

export type QueueStatus = "needs_marking" | "ready" | "draft" | "referred_back" | "actions_due" | "agreed" | "decided";

/** Queue status for a recorded decision, from its moderation verdict (design.md §14, 2026-11-08). */
export async function moderatedStatus(
  ctx: Pick<Ctx, "db">,
  d: { id: string; releasedAt: Date | null },
): Promise<QueueStatus> {
  if (d.releasedAt) return "decided";
  const [m] = await ctx.db
    .select({ m: moderationRecords, done: moderationActionCompletions.id })
    .from(moderationRecords)
    .leftJoin(moderationActionCompletions, eq(moderationActionCompletions.moderationRecordId, moderationRecords.id))
    .where(eq(moderationRecords.decisionId, d.id))
    .limit(1);
  if (!m) return "decided";
  if (m.m.outcome === "referred_back") return "referred_back";
  if (m.m.requiredActions && !m.done) return "actions_due";
  return "agreed";
}

export type QueueRow = {
  attemptId: string;
  learnerName: string;
  cohortName: string;
  title: string;
  attemptNo: number;
  submittedAt: Date | null;
  toMark: number;
  status: QueueStatus;
  outcome: "competent" | "not_yet_competent" | null;
};

async function attemptRows(ctx: Ctx, scope: string[] | "all", attemptIds?: string[]) {
  const rows = await ctx.db
    .select({
      attempt: assessmentAttempts,
      learnerName: users.displayName,
      cohortId: cohorts.id,
      cohortName: cohorts.name,
      title: assessmentBlueprints.title,
      kind: assessmentBlueprints.kind,
    })
    .from(assessmentAttempts)
    .innerJoin(assessmentBlueprints, eq(assessmentBlueprints.id, assessmentAttempts.blueprintId))
    .innerJoin(enrolments, eq(enrolments.id, assessmentAttempts.enrolmentId))
    .innerJoin(users, eq(users.id, enrolments.userId))
    .innerJoin(cohorts, eq(cohorts.id, enrolments.cohortId))
    .where(
      and(
        eq(assessmentBlueprints.kind, "summative"),
        inArray(assessmentAttempts.status, ["submitted", "graded"]),
        attemptIds ? inArray(assessmentAttempts.id, attemptIds) : undefined,
      ),
    )
    .orderBy(asc(assessmentAttempts.submittedAt), asc(assessmentAttempts.id));
  return rows.filter((r) => inScope(scope, r.cohortId));
}

async function shortAnswerProgress(ctx: Ctx, attemptIds: string[]) {
  if (attemptIds.length === 0) return new Map<string, number>();
  const rows = await ctx.db
    .select({ attemptId: attemptItems.attemptId, marks: attemptItems.marksAwarded })
    .from(attemptItems)
    .innerJoin(questionVersions, eq(questionVersions.id, attemptItems.questionVersionId))
    .where(and(inArray(attemptItems.attemptId, attemptIds), eq(questionVersions.type, "short_answer")));
  const toMark = new Map<string, number>();
  for (const r of rows) if (r.marks === null) toMark.set(r.attemptId, (toMark.get(r.attemptId) ?? 0) + 1);
  return toMark;
}

export async function markingQueue(
  ctx: Ctx,
  actor: AccessContext | null,
  filter: { status?: QueueStatus | "all" } = {},
): Promise<QueueRow[]> {
  const a = await authorize(ctx, actor, ASSESSOR, "marking.queue");
  await finaliseExpired(ctx);
  const scope = await cohortScope(ctx, a, ["assessor"]);
  const rows = await attemptRows(ctx, scope);
  const ids = rows.map((r) => r.attempt.id);
  const toMark = await shortAnswerProgress(ctx, ids);
  const drafts = ids.length
    ? await ctx.db
        .select({ attemptId: decisionDrafts.attemptId })
        .from(decisionDrafts)
        .where(and(inArray(decisionDrafts.attemptId, ids), eq(decisionDrafts.assessorId, a.userId)))
    : [];
  const out: QueueRow[] = [];
  for (const r of rows) {
    const d = await currentDecision(ctx, r.attempt.id);
    let status: QueueStatus;
    if (d) status = await moderatedStatus(ctx, d);
    else if ((toMark.get(r.attempt.id) ?? 0) > 0) status = "needs_marking";
    else if (drafts.some((x) => x.attemptId === r.attempt.id)) status = "draft";
    else status = "ready";
    out.push({
      attemptId: r.attempt.id,
      learnerName: r.learnerName,
      cohortName: r.cohortName,
      title: r.title,
      attemptNo: r.attempt.attemptNo,
      submittedAt: r.attempt.submittedAt,
      toMark: toMark.get(r.attempt.id) ?? 0,
      status,
      outcome: d?.outcome ?? null,
    });
  }
  const want = filter.status && filter.status !== "all" ? filter.status : null;
  return want ? out.filter((r) => r.status === want) : out;
}

// ---------------------------------------------------------------------------
// Replay (exact served order, keys overlaid)
// ---------------------------------------------------------------------------

export type ReplayItem = {
  itemId: string;
  position: number;
  questionId: string;
  versionId: string;
  versionNo: number;
  type: "single" | "multi" | "short_answer";
  stem: string;
  explanation: string | null;
  maxMarks: number;
  options: { label: string; correct: boolean; chosen: boolean; pinned: boolean }[];
  responseText: string | null;
  answeredAt: Date | null;
  isCorrect: boolean | null;
  marksAwarded: number | null;
  markerNote: string | null;
  flagged: boolean;
  criteria: { id: string; label: string; guidance: string | null; maxMarks: number; marks: number | null }[];
};

export type Replay = Awaited<ReturnType<typeof loadReplay>>;

async function loadReplay(ctx: Ctx, attemptId: string) {
  const [row] = await ctx.db
    .select({
      attempt: assessmentAttempts,
      learnerName: users.displayName,
      learnerId: users.id,
      cohortId: cohorts.id,
      cohortName: cohorts.name,
      blueprint: assessmentBlueprints,
      moduleCode: modules.code,
      moduleTitle: modules.title,
    })
    .from(assessmentAttempts)
    .innerJoin(assessmentBlueprints, eq(assessmentBlueprints.id, assessmentAttempts.blueprintId))
    .innerJoin(modules, eq(modules.id, assessmentBlueprints.moduleId))
    .innerJoin(enrolments, eq(enrolments.id, assessmentAttempts.enrolmentId))
    .innerJoin(users, eq(users.id, enrolments.userId))
    .innerJoin(cohorts, eq(cohorts.id, enrolments.cohortId))
    .where(eq(assessmentAttempts.id, attemptId));
  if (!row) throw new AssessmentError("not_found", "Attempt not found.");

  const items = await ctx.db
    .select({ item: attemptItems, version: questionVersions })
    .from(attemptItems)
    .innerJoin(questionVersions, eq(questionVersions.id, attemptItems.questionVersionId))
    .where(eq(attemptItems.attemptId, attemptId))
    .orderBy(asc(attemptItems.position));
  const versionIds = items.map((i) => i.version.id);
  const opts = versionIds.length
    ? await ctx.db.select().from(answerOptions).where(inArray(answerOptions.questionVersionId, versionIds))
    : [];
  const crit = versionIds.length
    ? await ctx.db
        .select()
        .from(rubricCriteria)
        .where(inArray(rubricCriteria.questionVersionId, versionIds))
        .orderBy(asc(rubricCriteria.sortOrder))
    : [];
  const itemIds = items.map((i) => i.item.id);
  const marks = itemIds.length
    ? await ctx.db.select().from(itemMarks).where(inArray(itemMarks.attemptItemId, itemIds))
    : [];
  const byOpt = new Map(opts.map((o) => [o.id, o]));

  const replayItems: ReplayItem[] = items.map(({ item, version }) => ({
    itemId: item.id,
    position: item.position,
    questionId: version.questionId,
    versionId: version.id,
    versionNo: version.versionNo,
    type: version.type,
    stem: version.stem,
    explanation: version.feedback,
    maxMarks: version.maxMarks,
    options: item.servedOptionOrder.map((id) => {
      const o = byOpt.get(id)!;
      return {
        label: o.label,
        correct: o.isCorrect,
        chosen: (item.responseOptionIds ?? []).includes(id),
        pinned: o.pinnedPosition !== null,
      };
    }),
    responseText: item.responseText,
    answeredAt: item.answeredAt,
    isCorrect: item.isCorrect,
    marksAwarded: item.marksAwarded,
    markerNote: item.markerNote,
    flagged: item.flagged,
    criteria: crit
      .filter((c) => c.questionVersionId === version.id)
      .map((c) => ({
        id: c.id,
        label: c.label,
        guidance: c.guidance,
        maxMarks: c.maxMarks,
        marks: marks.find((m) => m.attemptItemId === item.id && m.criterionId === c.id)?.marks ?? null,
      })),
  }));

  // Sitting: schedule, day, register and sign-off (for the record and the PDF).
  let sitting: null | {
    heldOn: string | null;
    venue: string | null;
    attendance: string | null;
    idVerified: boolean;
    signedOffBy: string | null;
    signedOffAt: Date | null;
    unlockedAt: Date | null;
  } = null;
  if (row.attempt.scheduleId) {
    const [s] = await ctx.db
      .select({ dayId: assessmentDays.id, heldOn: assessmentDays.heldOn, venue: assessmentDays.venue })
      .from(assessmentSchedules)
      .leftJoin(assessmentDays, eq(assessmentDays.id, assessmentSchedules.assessmentDayId))
      .where(eq(assessmentSchedules.id, row.attempt.scheduleId));
    if (s?.dayId) {
      const [att] = await ctx.db
        .select()
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.assessmentDayId, s.dayId),
            eq(attendanceRecords.enrolmentId, row.attempt.enrolmentId),
          ),
        );
      const [so] = await ctx.db
        .select({ at: registerSignoffs.signedAt, by: users.displayName })
        .from(registerSignoffs)
        .innerJoin(users, eq(users.id, registerSignoffs.signedBy))
        .where(eq(registerSignoffs.assessmentDayId, s.dayId));
      sitting = {
        heldOn: s.heldOn,
        venue: s.venue,
        attendance: att?.status ?? null,
        idVerified: att?.idVerifiedAt != null,
        signedOffBy: so?.by ?? null,
        signedOffAt: so?.at ?? null,
        unlockedAt: null,
      };
    }
  }

  const decisions = await ctx.db
    .select({ d: assessmentDecisions, assessorName: users.displayName })
    .from(assessmentDecisions)
    .innerJoin(users, eq(users.id, assessmentDecisions.assessorId))
    .where(eq(assessmentDecisions.attemptId, attemptId))
    .orderBy(asc(assessmentDecisions.decidedAt));
  const decisionIds = decisions.map((x) => x.d.id);
  const moderation = decisionIds.length
    ? await ctx.db
        .select({ m: moderationRecords, moderatorName: users.displayName, completion: moderationActionCompletions })
        .from(moderationRecords)
        .innerJoin(users, eq(users.id, moderationRecords.moderatorId))
        .leftJoin(moderationActionCompletions, eq(moderationActionCompletions.moderationRecordId, moderationRecords.id))
        .where(inArray(moderationRecords.decisionId, decisionIds))
        .orderBy(asc(moderationRecords.moderatedAt))
    : [];
  const appealRows = decisionIds.length
    ? await ctx.db.select().from(appeals).where(inArray(appeals.decisionId, decisionIds))
    : [];

  const auto = replayItems.filter((i) => i.type !== "short_answer");
  const marked = replayItems.every((i) => i.marksAwarded !== null);
  const raw = replayItems.reduce((s, i) => s + (i.marksAwarded ?? 0), 0);
  const max = replayItems.reduce((s, i) => s + i.maxMarks, 0);
  return {
    attempt: row.attempt,
    learner: { id: row.learnerId, name: row.learnerName },
    cohort: { id: row.cohortId, name: row.cohortName },
    blueprint: row.blueprint,
    module: { code: row.moduleCode, title: row.moduleTitle },
    items: replayItems,
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
    score: {
      autoCorrect: auto.filter((i) => i.isCorrect).length,
      autoTotal: auto.length,
      raw,
      max,
      allMarked: marked,
      percent: max ? Math.round((raw / max) * 100) : 0,
      suggested: marked
        ? raw * 100 >= row.blueprint.passMarkPercent * max
          ? ("competent" as const)
          : ("not_yet_competent" as const)
        : null,
    },
  };
}

/** Read-only replay for assessors, moderators and evaluators (in their cohorts). */
export async function getReplay(ctx: Ctx, actor: AccessContext | null, attemptId: string) {
  const a = await authorize(ctx, actor, REPLAY, "attempt.replay");
  const replay = await loadReplay(ctx, attemptId);
  if (replay.attempt.status === "in_progress") {
    throw new AssessmentError("not_found", "This attempt is still being written.");
  }
  await assertCohortScope(ctx, a, KEY_ROLES, replay.cohort.id, "attempt.replay");
  return replay;
}

export async function getMarkingView(ctx: Ctx, actor: AccessContext | null, attemptId: string) {
  const a = await authorize(ctx, actor, ASSESSOR, "marking.view");
  const replay = await loadReplay(ctx, attemptId);
  await assertCohortScope(ctx, a, ["assessor"], replay.cohort.id, "marking.view");
  if (replay.blueprint.kind !== "summative" || replay.attempt.status === "in_progress") {
    throw new AssessmentError("not_found", "This attempt is not waiting for marking.");
  }
  const [draft] = await ctx.db
    .select()
    .from(decisionDrafts)
    .where(and(eq(decisionDrafts.attemptId, attemptId), eq(decisionDrafts.assessorId, a.userId)));
  const queue = await markingQueue(ctx, a);
  const idx = queue.findIndex((q) => q.attemptId === attemptId);
  const current = replay.decisions.find((d) => !d.superseded) ?? null;
  const batchOpen = current
    ? (await ctx.db.select({ s: moderationBatches.status }).from(moderationBatches).where(eq(moderationBatches.id, current.batchId)))[0]?.s === "open"
    : true;
  return {
    ...replay,
    draft: draft ?? null,
    current,
    canDecide: replay.score.allMarked && batchOpen,
    blockedReason: !replay.score.allMarked ? ("marking" as const) : !batchOpen ? ("released" as const) : null,
    prevId: idx > 0 ? queue[idx - 1]!.attemptId : null,
    nextId: idx >= 0 && idx < queue.length - 1 ? queue[idx + 1]!.attemptId : null,
  };
}

/** If this attempt is a reassessment ordered on appeal, the appealed decision. */
async function reassessmentSource(ctx: Ctx, attempt: typeof assessmentAttempts.$inferSelect) {
  if (attempt.attemptNo < 2 || !attempt.blueprintId) return null;
  const [prev] = await ctx.db
    .select({ id: assessmentAttempts.id })
    .from(assessmentAttempts)
    .where(
      and(
        eq(assessmentAttempts.enrolmentId, attempt.enrolmentId),
        eq(assessmentAttempts.blueprintId, attempt.blueprintId),
        eq(assessmentAttempts.attemptNo, attempt.attemptNo - 1),
      ),
    );
  if (!prev) return null;
  const [row] = await ctx.db
    .select({ assessorId: assessmentDecisions.assessorId })
    .from(appeals)
    .innerJoin(assessmentDecisions, eq(assessmentDecisions.id, appeals.decisionId))
    .where(and(eq(assessmentDecisions.attemptId, prev.id), eq(appeals.status, "reassess")));
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

async function assessorAttempt(ctx: Ctx, actor: AccessContext | null, attemptId: string, target: string) {
  const a = await authorize(ctx, actor, ASSESSOR, target);
  const [row] = await ctx.db
    .select({ attempt: assessmentAttempts, cohortId: enrolments.cohortId, blueprint: assessmentBlueprints })
    .from(assessmentAttempts)
    .innerJoin(enrolments, eq(enrolments.id, assessmentAttempts.enrolmentId))
    .innerJoin(assessmentBlueprints, eq(assessmentBlueprints.id, assessmentAttempts.blueprintId))
    .where(eq(assessmentAttempts.id, attemptId));
  if (!row || row.blueprint.kind !== "summative" || row.attempt.status === "in_progress") {
    throw new AssessmentError("not_found", "This attempt is not waiting for marking.");
  }
  await assertCohortScope(ctx, a, ["assessor"], row.cohortId, target);
  return { a, ...row };
}

/** Save rubric marks for one short-answer item (and an optional note). */
export async function saveItemMarks(
  ctx: Ctx,
  actor: AccessContext | null,
  attemptId: string,
  position: number,
  marks: Record<string, number>,
  note: string,
) {
  const { a } = await assessorAttempt(ctx, actor, attemptId, "marking.marks");
  if (await currentDecision(ctx, attemptId)) {
    throw new AssessmentError("submitted", "A decision has been recorded; marks are locked.");
  }
  const [item] = await ctx.db
    .select({ id: attemptItems.id, versionId: attemptItems.questionVersionId, type: questionVersions.type })
    .from(attemptItems)
    .innerJoin(questionVersions, eq(questionVersions.id, attemptItems.questionVersionId))
    .where(and(eq(attemptItems.attemptId, attemptId), eq(attemptItems.position, position)));
  if (!item || item.type !== "short_answer") throw new AssessmentError("not_found", "Question not found.");
  const crit = await ctx.db.select().from(rubricCriteria).where(eq(rubricCriteria.questionVersionId, item.versionId));
  for (const c of crit) {
    const m = marks[c.id];
    if (m === undefined) continue;
    if (!Number.isInteger(m) || m < 0 || m > c.maxMarks) {
      throw new AssessmentError("invalid_answer", `Marks for "${c.label}" must be 0 to ${c.maxMarks}.`);
    }
  }
  const now = ctx.now();
  await ctx.db.transaction(async (tx) => {
    for (const c of crit) {
      const m = marks[c.id];
      if (m === undefined) continue;
      await tx
        .insert(itemMarks)
        .values({ attemptItemId: item.id, criterionId: c.id, marks: m, markedBy: a.userId, markedAt: now })
        .onConflictDoUpdate({
          target: [itemMarks.attemptItemId, itemMarks.criterionId],
          set: { marks: m, markedBy: a.userId, markedAt: now },
        });
    }
    const saved = await tx.select().from(itemMarks).where(eq(itemMarks.attemptItemId, item.id));
    const complete = crit.every((c) => saved.some((s) => s.criterionId === c.id));
    await tx
      .update(attemptItems)
      .set({
        marksAwarded: complete ? saved.reduce((s, x) => s + x.marks, 0) : null,
        markerNote: note.trim().slice(0, 2000) || null,
      })
      .where(eq(attemptItems.id, item.id));
    // Fully marked paper: total the score and mark it graded.
    const all = await tx
      .select({ marks: attemptItems.marksAwarded })
      .from(attemptItems)
      .where(eq(attemptItems.attemptId, attemptId));
    const done = all.every((x) => x.marks !== null);
    await tx
      .update(assessmentAttempts)
      .set(
        done
          ? { status: "graded", scoreRaw: all.reduce((s, x) => s + (x.marks ?? 0), 0) }
          : { status: "submitted", scoreRaw: null },
      )
      .where(eq(assessmentAttempts.id, attemptId));
  });
  await writeAudit(ctx, {
    action: "assessment.marks.saved",
    actorId: a.userId,
    entityType: "assessment_attempt",
    entityId: attemptId,
    after: { position, criteria: Object.keys(marks).length },
  });
}

export async function saveDecisionDraft(
  ctx: Ctx,
  actor: AccessContext | null,
  attemptId: string,
  outcome: string | null,
  feedback: string,
) {
  const { a } = await assessorAttempt(ctx, actor, attemptId, "marking.draft");
  const o = outcome === "competent" || outcome === "not_yet_competent" ? outcome : null;
  await ctx.db
    .insert(decisionDrafts)
    .values({ attemptId, assessorId: a.userId, outcome: o, feedback: feedback.slice(0, 8000) })
    .onConflictDoUpdate({
      target: [decisionDrafts.attemptId, decisionDrafts.assessorId],
      set: { outcome: o, feedback: feedback.slice(0, 8000) },
    });
}

/** Find (or open) the cohort's open moderation batch for this blueprint. */
async function openBatch(ctx: Ctx, cohortId: string, blueprintId: string): Promise<string> {
  const find = async () =>
    (
      await ctx.db
        .select({ id: moderationBatches.id })
        .from(moderationBatches)
        .where(
          and(
            eq(moderationBatches.cohortId, cohortId),
            eq(moderationBatches.blueprintId, blueprintId),
            eq(moderationBatches.status, "open"),
          ),
        )
    )[0]?.id;
  const existing = await find();
  if (existing) return existing;
  const [created] = await ctx.db
    .insert(moderationBatches)
    .values({ cohortId, blueprintId })
    .onConflictDoNothing()
    .returning({ id: moderationBatches.id });
  return created?.id ?? (await find())!;
}

/** Record a final decision (a new version if one exists). Immutable once inserted. */
export async function recordDecision(
  ctx: Ctx,
  actor: AccessContext | null,
  attemptId: string,
  outcome: string,
  feedback: string,
): Promise<string> {
  const { a, attempt, cohortId, blueprint } = await assessorAttempt(ctx, actor, attemptId, "marking.decide");
  if (outcome !== "competent" && outcome !== "not_yet_competent") {
    throw new AssessmentError("invalid_answer", "Choose Competent or Not yet competent.");
  }
  const text = feedback.trim();
  if (text.length < 1 || text.length > 8000) {
    throw new AssessmentError("invalid_answer", "Write feedback for the learner.");
  }
  if (attempt.status !== "graded") {
    throw new AssessmentError("invalid_answer", "Mark every short answer before recording a decision.");
  }
  const previous = await currentDecision(ctx, attemptId);
  if (previous?.releasedAt) {
    throw new AssessmentError("submitted", "This result has been released. Changes go through an appeal.");
  }
  const batchId = previous?.batchId ?? (await openBatch(ctx, cohortId, blueprint.id));
  const [d] = await ctx.db
    .insert(assessmentDecisions)
    .values({
      assessorId: a.userId,
      attemptId,
      batchId,
      outcome,
      feedback: text,
      supersedesId: previous?.id ?? null,
      decidedAt: ctx.now(),
    })
    .returning({ id: assessmentDecisions.id });
  await ctx.db
    .delete(decisionDrafts)
    .where(and(eq(decisionDrafts.attemptId, attemptId), eq(decisionDrafts.assessorId, a.userId)));
  // A reassessment ordered on appeal is marked by the cohort's (only) assessor
  // and is always in the moderation sample (design.md §14, 2026-11-08).
  if (await reassessmentSource(ctx, attempt)) await sampleReassessment(ctx, batchId, { attemptId }, a.userId);
  await writeAudit(ctx, {
    action: "assessment.decision.recorded",
    actorId: a.userId,
    entityType: "assessment_decision",
    entityId: d!.id,
    after: { attemptId, outcome, supersedes: previous?.id ?? null },
  });
  return d!.id;
}
