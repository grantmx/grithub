import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import {
  appeals,
  assessmentAttempts,
  assessmentBlueprints,
  assessmentDecisions,
  cohorts,
  enrolments,
  moderationActionCompletions,
  moderationBatches,
  moderationFeedbackReads,
  moderationRecords,
  moderationSampleItems,
  practicalBriefs,
  submissions,
  users,
} from "db";
import type { AccessContext, Requirement } from "@/lib/access";
import {
  isAgreed,
  minimumSample,
  type SampleState,
  type Verdict,
  VERDICT_LABEL,
  verdictOf,
} from "@/lib/moderation";
import { AssessmentError } from "./assessments";
import { writeAudit } from "./audit";
import { authorize } from "./auth";
import type { ServerCtx } from "./context";
import { sendEmail } from "./email";
import { assertCohortScope, cohortScope, inScope } from "./staffScope";

/**
 * Moderation (design.md S7 and §14, design-gate decisions 2026-11-08) and
 * appeals. The SDP admin sets each cohort's sampling rate; the moderator
 * picks the sample (at least the rate, rounded up), records Agree / Agree with
 * actions / Disagree with comments and required actions, and closes the batch
 * only when every sampled decision is agreed (actions done). Closing releases
 * every decision in the batch to learners (database trigger). The database
 * enforces the same rules (migration 0017_moderation_rules).
 *
 * Moderators only read learner work, decisions and question versions: nothing
 * here writes to attempts, submissions, evidence, marks, judgements,
 * decisions or questions.
 */

const MODERATOR: Requirement = { kind: "roles", anyOf: ["moderator"], stepUp: true };
const ASSESSOR: Requirement = { kind: "roles", anyOf: ["assessor"], stepUp: true };
type Ctx = ServerCtx;

const TITLE = sql<string>`coalesce(${assessmentBlueprints.title}, ${practicalBriefs.title})`;
const KIND = sql<"knowledge" | "practical">`CASE WHEN ${moderationBatches.briefId} IS NULL THEN 'knowledge' ELSE 'practical' END`;

// ---------------------------------------------------------------------------
// Batch rows: one per learner's work (attempt or submission), all versions
// ---------------------------------------------------------------------------

type Record_ = typeof moderationRecords.$inferSelect & {
  moderatorName: string;
  verdict: Verdict;
  completion: (typeof moderationActionCompletions.$inferSelect) | null;
};

export type DecisionVersion = typeof assessmentDecisions.$inferSelect & {
  assessorName: string;
  moderation: Record_ | null;
};

export type BatchRow = {
  targetId: string;
  kind: "knowledge" | "practical";
  learnerName: string;
  score: string | null;
  current: DecisionVersion;
  /** Oldest first; the last one is `current`. */
  versions: DecisionVersion[];
  sample: { reason: "moderator" | "reassessment"; addedAt: Date } | null;
  state: SampleState;
  /** Something has been moderated for this work in this batch: it can't leave the sample. */
  locked: boolean;
};

async function loadBatch(ctx: Ctx, batchId: string) {
  const [b] = await ctx.db
    .select({
      batch: moderationBatches,
      cohortName: cohorts.name,
      rate: cohorts.moderationRatePercent,
      title: TITLE,
      kind: KIND,
    })
    .from(moderationBatches)
    .innerJoin(cohorts, eq(cohorts.id, moderationBatches.cohortId))
    .leftJoin(assessmentBlueprints, eq(assessmentBlueprints.id, moderationBatches.blueprintId))
    .leftJoin(practicalBriefs, eq(practicalBriefs.id, moderationBatches.briefId))
    .where(eq(moderationBatches.id, batchId));
  if (!b) throw new AssessmentError("not_found", "Batch not found.");
  return b;
}

async function batchRows(ctx: Ctx, batchId: string): Promise<BatchRow[]> {
  const decisions = await ctx.db
    .select({
      d: assessmentDecisions,
      assessorName: users.displayName,
      learnerName: sql<string>`(SELECT u.display_name FROM "users" u JOIN "enrolments" e ON e.user_id = u.id
        WHERE e.id = coalesce(
          (SELECT t.enrolment_id FROM "assessment_attempts" t WHERE t.id = "assessment_decisions"."attempt_id"),
          (SELECT s.enrolment_id FROM "submissions" s WHERE s.id = "assessment_decisions"."submission_id")))`,
      score: sql<string | null>`CASE WHEN "assessment_decisions"."attempt_id" IS NOT NULL THEN
          (SELECT CASE WHEN t.score_raw IS NOT NULL AND t.score_max > 0 THEN round(t.score_raw * 100.0 / t.score_max)::int || '%' END
             FROM "assessment_attempts" t WHERE t.id = "assessment_decisions"."attempt_id")
        ELSE
          (SELECT (SELECT count(*) FROM "criterion_judgements" j WHERE j.submission_id = s.id AND j.met) || ' of '
                  || (SELECT count(*) FROM "brief_criteria" c WHERE c.brief_id = s.brief_id) || ' criteria met'
             FROM "submissions" s WHERE s.id = "assessment_decisions"."submission_id")
        END`,
    })
    .from(assessmentDecisions)
    .innerJoin(users, eq(users.id, assessmentDecisions.assessorId))
    .where(eq(assessmentDecisions.batchId, batchId))
    .orderBy(asc(assessmentDecisions.decidedAt));
  const ids = decisions.map((x) => x.d.id);
  const mods = ids.length
    ? await ctx.db
        .select({ m: moderationRecords, moderatorName: users.displayName })
        .from(moderationRecords)
        .innerJoin(users, eq(users.id, moderationRecords.moderatorId))
        .where(inArray(moderationRecords.decisionId, ids))
    : [];
  const done = mods.length
    ? await ctx.db
        .select()
        .from(moderationActionCompletions)
        .where(inArray(moderationActionCompletions.moderationRecordId, mods.map((m) => m.m.id)))
    : [];
  const sample = await ctx.db.select().from(moderationSampleItems).where(eq(moderationSampleItems.batchId, batchId));

  const byTarget = new Map<string, typeof decisions>();
  for (const x of decisions) {
    const key = (x.d.attemptId ?? x.d.submissionId)!;
    byTarget.set(key, [...(byTarget.get(key) ?? []), x]);
  }
  const rows: BatchRow[] = [];
  for (const [targetId, list] of byTarget) {
    // Order the chain by supersedes links (a single chain per target).
    const ordered: typeof list = [];
    let next = list.find((x) => !x.d.supersedesId || !list.some((y) => y.d.id === x.d.supersedesId));
    while (next) {
      ordered.push(next);
      const id: string = next.d.id;
      next = list.find((y) => y.d.supersedesId === id);
    }
    const versions: DecisionVersion[] = ordered.map((x) => {
      const m = mods.find((r) => r.m.decisionId === x.d.id);
      return {
        ...x.d,
        assessorName: x.assessorName,
        moderation: m
          ? {
              ...m.m,
              moderatorName: m.moderatorName,
              verdict: verdictOf(m.m),
              completion: done.find((c) => c.moderationRecordId === m.m.id) ?? null,
            }
          : null,
      };
    });
    const current = versions[versions.length - 1]!;
    const first = ordered[0]!;
    const s = sample.find((i) => (i.attemptId ?? i.submissionId) === targetId);
    let state: SampleState = "not_sampled";
    if (s) {
      const m = current.moderation;
      if (!m) state = versions.slice(0, -1).some((v) => v.moderation?.verdict === "disagree") ? "recheck" : "to_check";
      else if (m.verdict === "disagree") state = "disagreed";
      else if (m.verdict === "agree") state = "agreed";
      else state = m.completion ? "actions_done" : "actions_open";
    }
    rows.push({
      targetId,
      kind: current.attemptId ? "knowledge" : "practical",
      learnerName: first.learnerName,
      score: ordered[ordered.length - 1]!.score,
      current,
      versions,
      sample: s ? { reason: s.reason as "moderator" | "reassessment", addedAt: s.addedAt } : null,
      state,
      locked: versions.some((v) => v.moderation),
    });
  }
  return rows.sort((a, b) => a.learnerName.localeCompare(b.learnerName) || a.targetId.localeCompare(b.targetId));
}

export type BatchSummary = {
  rate: number;
  decided: number;
  minimum: number;
  sampled: number;
  agreed: number;
  /** Why the batch can't close yet (empty when it can). */
  blockers: string[];
  canClose: boolean;
};

function summarise(rate: number, rows: BatchRow[], open: boolean): BatchSummary {
  const decided = rows.length;
  const minimum = minimumSample(rate, decided);
  const sampled = rows.filter((r) => r.sample).length;
  const agreed = rows.filter((r) => isAgreed(r.state)).length;
  const blockers: string[] = [];
  if (decided === 0) blockers.push("There are no decisions to release yet.");
  if (sampled < minimum) {
    blockers.push(`Add ${minimum - sampled} more learner${minimum - sampled === 1 ? "" : "s"} to the sample (minimum ${minimum}).`);
  }
  const count = (s: SampleState) => rows.filter((r) => r.state === s).length;
  const toCheck = count("to_check") + count("recheck");
  if (toCheck) blockers.push(`${toCheck} sampled decision${toCheck === 1 ? "" : "s"} not checked yet.`);
  if (count("disagreed")) blockers.push(`${count("disagreed")} waiting for the assessor to re-decide.`);
  if (count("actions_open")) blockers.push(`${count("actions_open")} waiting for the assessor to finish required actions.`);
  return { rate, decided, minimum, sampled, agreed, blockers, canClose: open && blockers.length === 0 };
}

// ---------------------------------------------------------------------------
// Moderator: batches, sample, S7 item
// ---------------------------------------------------------------------------

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
      rate: cohorts.moderationRatePercent,
      title: TITLE,
      kind: KIND,
      decisions: sql<number>`(SELECT count(*)::int FROM "assessment_decisions" d WHERE d.batch_id = "moderation_batches"."id" AND NOT EXISTS (SELECT 1 FROM "assessment_decisions" n WHERE n.supersedes_id = d.id))`,
      sampled: sql<number>`(SELECT count(*)::int FROM "moderation_sample_items" s WHERE s.batch_id = "moderation_batches"."id")`,
      moderated: sql<number>`(SELECT count(DISTINCT coalesce(d.attempt_id, d.submission_id))::int FROM "moderation_records" m JOIN "assessment_decisions" d ON d.id = m.decision_id WHERE d.batch_id = "moderation_batches"."id")`,
    })
    .from(moderationBatches)
    .innerJoin(cohorts, eq(cohorts.id, moderationBatches.cohortId))
    .leftJoin(assessmentBlueprints, eq(assessmentBlueprints.id, moderationBatches.blueprintId))
    .leftJoin(practicalBriefs, eq(practicalBriefs.id, moderationBatches.briefId))
    .orderBy(asc(moderationBatches.status), desc(moderationBatches.createdAt));
  return rows
    .filter((r) => inScope(scope, r.cohortId))
    .map((r) => ({ ...r, minimum: minimumSample(r.rate, r.decisions) }));
}

export async function getBatch(ctx: Ctx, actor: AccessContext | null, batchId: string) {
  const a = await authorize(ctx, actor, MODERATOR, "moderation.batch");
  const b = await loadBatch(ctx, batchId);
  await assertCohortScope(ctx, a, ["moderator"], b.batch.cohortId, "moderation.batch");
  const rows = await batchRows(ctx, batchId);
  const open = b.batch.status === "open";
  return {
    ...b,
    rows: rows.map((r) => ({ ...r, ownDecision: r.current.assessorId === a.userId })),
    summary: summarise(b.rate, rows, open),
    learnersToNotify: rows.length,
  };
}

/**
 * Save the moderator's sample: `selected` is the full set of learners' work
 * (attempt or submission ids) that should be in it. Moderated work and appeal
 * reassessments can't be removed.
 */
export async function setSample(ctx: Ctx, actor: AccessContext | null, batchId: string, selected: string[]) {
  const a = await authorize(ctx, actor, MODERATOR, "moderation.sample");
  const b = await loadBatch(ctx, batchId);
  await assertCohortScope(ctx, a, ["moderator"], b.batch.cohortId, "moderation.sample");
  if (b.batch.status !== "open") throw new AssessmentError("submitted", "This batch is closed. Its sample is final.");
  const rows = await batchRows(ctx, batchId);
  const want = new Set(selected);
  for (const id of want) {
    if (!rows.some((r) => r.targetId === id)) throw new AssessmentError("not_found", "That learner's work is not in this batch.");
  }
  const add = rows.filter((r) => want.has(r.targetId) && !r.sample);
  const remove = rows.filter((r) => !want.has(r.targetId) && r.sample);
  const stuck = remove.find((r) => r.locked || r.sample?.reason === "reassessment");
  if (stuck) {
    throw new AssessmentError(
      "invalid_answer",
      stuck.locked
        ? `${stuck.learnerName} has been moderated and stays in the sample.`
        : `${stuck.learnerName} is an appeal reassessment and is always moderated.`,
    );
  }
  if (!add.length && !remove.length) return { added: 0, removed: 0 };
  await ctx.db.transaction(async (tx) => {
    if (add.length) {
      await tx.insert(moderationSampleItems).values(
        add.map((r) => ({
          batchId,
          attemptId: r.kind === "knowledge" ? r.targetId : null,
          submissionId: r.kind === "practical" ? r.targetId : null,
          reason: "moderator",
          addedBy: a.userId,
          addedAt: ctx.now(),
        })),
      );
    }
    for (const r of remove) {
      await tx
        .delete(moderationSampleItems)
        .where(
          and(
            eq(moderationSampleItems.batchId, batchId),
            r.kind === "knowledge" ? eq(moderationSampleItems.attemptId, r.targetId) : eq(moderationSampleItems.submissionId, r.targetId),
          ),
        );
    }
  });
  await writeAudit(ctx, {
    action: "assessment.moderation.sample_changed",
    actorId: a.userId,
    entityType: "moderation_batch",
    entityId: batchId,
    after: { added: add.length, removed: remove.length },
  });
  return { added: add.length, removed: remove.length };
}

/** S7: one learner's work in a batch, the decision history and the moderation state. */
export async function getModerationItem(ctx: Ctx, actor: AccessContext | null, batchId: string, targetId: string) {
  const a = await authorize(ctx, actor, MODERATOR, "moderation.item");
  const b = await loadBatch(ctx, batchId);
  await assertCohortScope(ctx, a, ["moderator"], b.batch.cohortId, "moderation.item");
  const rows = await batchRows(ctx, batchId);
  const row = rows.find((r) => r.targetId === targetId);
  if (!row) throw new AssessmentError("not_found", "That learner's work is not in this batch.");
  const sampled = rows.filter((r) => r.sample);
  const idx = sampled.findIndex((r) => r.targetId === targetId);
  const ownDecision = row.current.assessorId === a.userId;
  const open = b.batch.status === "open";
  return {
    ...b,
    row,
    summary: summarise(b.rate, rows, open),
    position: idx >= 0 ? { index: idx + 1, of: sampled.length } : null,
    prevId: idx > 0 ? sampled[idx - 1]!.targetId : null,
    nextId: idx >= 0 && idx < sampled.length - 1 ? sampled[idx + 1]!.targetId : null,
    ownDecision,
    canModerate: open && !!row.sample && !row.current.moderation && !ownDecision,
  };
}

function cleanVerdict(verdict: string, comments: string, actions: string) {
  if (verdict !== "agree" && verdict !== "agree_with_actions" && verdict !== "disagree") {
    throw new AssessmentError("invalid_answer", "Choose Agree, Agree with actions or Disagree.");
  }
  const c = comments.trim();
  if (!c) throw new AssessmentError("invalid_answer", "Write your moderation comments.");
  if (c.length > 8000) throw new AssessmentError("invalid_answer", "Comments can be up to 8,000 characters.");
  const act = actions.trim();
  if (act.length > 4000) throw new AssessmentError("invalid_answer", "Required actions can be up to 4,000 characters.");
  if (verdict === "agree_with_actions" && !act) {
    throw new AssessmentError("invalid_answer", "Write the actions the assessor must take.");
  }
  if (verdict === "agree" && act) {
    throw new AssessmentError("invalid_answer", "Choose Agree with actions if the assessor must do something.");
  }
  return {
    verdict: verdict as Verdict,
    outcome: verdict === "disagree" ? ("referred_back" as const) : ("upheld" as const),
    findings: c,
    requiredActions: act || null,
  };
}

/** Record the moderator's verdict on the current decision of sampled work. */
export async function moderateDecision(
  ctx: Ctx,
  actor: AccessContext | null,
  decisionId: string,
  verdict: string,
  comments: string,
  actions = "",
) {
  const a = await authorize(ctx, actor, MODERATOR, "moderation.record");
  const v = cleanVerdict(verdict, comments, actions);
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
  const rows = await batchRows(ctx, d.batch.id);
  const row = rows.find((r) => r.current.id === decisionId);
  if (!row) throw new AssessmentError("invalid_answer", "The assessor has re-decided this. Moderate the latest decision.");
  if (!row.sample) throw new AssessmentError("invalid_answer", "Add this learner to the sample first.");
  if (row.current.moderation) throw new AssessmentError("submitted", "You have already moderated this decision.");
  const [m] = await ctx.db
    .insert(moderationRecords)
    .values({
      decisionId,
      moderatorId: a.userId,
      outcome: v.outcome,
      findings: v.findings,
      requiredActions: v.requiredActions,
      moderatedAt: ctx.now(),
    })
    .returning({ id: moderationRecords.id });
  await writeAudit(ctx, {
    action: "assessment.moderation.recorded",
    actorId: a.userId,
    entityType: "assessment_decision",
    entityId: decisionId,
    after: { verdict: v.verdict, moderationId: m!.id, actions: v.requiredActions ? 1 : 0 },
  });
  if (v.verdict !== "agree") await notifyAssessor(ctx, d.d.assessorId, v.verdict);
}

/** Email the assessor a link to their Moderation feedback list (no learner names or content). */
async function notifyAssessor(ctx: Ctx, assessorId: string, verdict: Verdict) {
  const [u] = await ctx.db.select({ email: users.email }).from(users).where(eq(users.id, assessorId));
  if (!u) return;
  const link = `${ctx.config.appUrl}/staff/moderation-feedback`;
  // TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
  const lines = [
    "Hello,",
    verdict === "disagree"
      ? "A moderator disagreed with one of your assessment decisions. Please review their comments and record a new decision."
      : "A moderator agreed with one of your assessment decisions and asked you to complete some actions.",
    "Results for this assessment are released only when moderation is complete.",
  ];
  const text = [...lines, "", `Open moderation feedback: ${link}`].join("\n");
  const html = lines.map((l) => `<p>${l}</p>`).join("\n") + `<p><a href="${link}">Open moderation feedback</a></p>`;
  try {
    await sendEmail({ to: u.email, subject: `Moderation feedback: ${VERDICT_LABEL[verdict]}`, text, html, link });
  } catch {
    // The feedback is on the assessor's list and sidebar badge; a failed email never blocks moderation.
    console.error("[moderation] assessor notification email failed");
  }
}

/** Close the sample and release every decision in the batch to learners. */
export async function closeBatch(ctx: Ctx, actor: AccessContext | null, batchId: string): Promise<number> {
  const a = await authorize(ctx, actor, MODERATOR, "moderation.close");
  const b = await loadBatch(ctx, batchId);
  await assertCohortScope(ctx, a, ["moderator"], b.batch.cohortId, "moderation.close");
  if (b.batch.status !== "open") return 0;
  const rows = await batchRows(ctx, batchId);
  const summary = summarise(b.rate, rows, true);
  if (!summary.canClose) throw new AssessmentError("invalid_answer", summary.blockers.join(" "));
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
    after: { released: rows.length, sampled: summary.sampled },
  });
  return rows.length;
}

// ---------------------------------------------------------------------------
// Assessor: moderation feedback, actions done
// ---------------------------------------------------------------------------

export async function moderationFeedback(ctx: Ctx, actor: AccessContext | null) {
  const a = await authorize(ctx, actor, ASSESSOR, "moderation.feedback");
  const rows = await ctx.db
    .select({
      m: moderationRecords,
      moderatorName: users.displayName,
      d: assessmentDecisions,
      batchStatus: moderationBatches.status,
      cohortName: cohorts.name,
      title: TITLE,
      completion: moderationActionCompletions,
      current: sql<boolean>`NOT EXISTS (SELECT 1 FROM "assessment_decisions" n WHERE n.supersedes_id = ${assessmentDecisions.id})`,
      learnerName: sql<string>`(SELECT u.display_name FROM "users" u JOIN "enrolments" e ON e.user_id = u.id
        WHERE e.id = coalesce(
          (SELECT t.enrolment_id FROM "assessment_attempts" t WHERE t.id = ${assessmentDecisions.attemptId}),
          (SELECT s.enrolment_id FROM "submissions" s WHERE s.id = ${assessmentDecisions.submissionId})))`,
    })
    .from(moderationRecords)
    .innerJoin(assessmentDecisions, eq(assessmentDecisions.id, moderationRecords.decisionId))
    .innerJoin(users, eq(users.id, moderationRecords.moderatorId))
    .innerJoin(moderationBatches, eq(moderationBatches.id, assessmentDecisions.batchId))
    .innerJoin(cohorts, eq(cohorts.id, moderationBatches.cohortId))
    .leftJoin(assessmentBlueprints, eq(assessmentBlueprints.id, moderationBatches.blueprintId))
    .leftJoin(practicalBriefs, eq(practicalBriefs.id, moderationBatches.briefId))
    .leftJoin(moderationActionCompletions, eq(moderationActionCompletions.moderationRecordId, moderationRecords.id))
    .where(eq(assessmentDecisions.assessorId, a.userId))
    .orderBy(desc(moderationRecords.moderatedAt));
  const [read] = await ctx.db
    .select({ seenAt: moderationFeedbackReads.seenAt })
    .from(moderationFeedbackReads)
    .where(eq(moderationFeedbackReads.userId, a.userId));
  return rows.map((r) => {
    const verdict = verdictOf(r.m);
    const open = r.batchStatus === "open";
    const todo =
      open && r.current && verdict === "disagree"
        ? ("redecide" as const)
        : open && verdict === "agree_with_actions" && !r.completion
          ? ("actions" as const)
          : null;
    return {
      id: r.m.id,
      outcome: r.m.outcome,
      verdict,
      findings: r.m.findings,
      requiredActions: r.m.requiredActions,
      moderatedAt: r.m.moderatedAt,
      moderatorName: r.moderatorName,
      completion: r.completion,
      decisionOutcome: r.d.outcome,
      learnerName: r.learnerName,
      cohortName: r.cohortName,
      title: r.title,
      href: r.d.attemptId ? `/staff/marking/${r.d.attemptId}` : `/staff/marking/practical/${r.d.submissionId}`,
      todo,
      unseen: !read || r.m.moderatedAt > read.seenAt,
    };
  });
}

/** The assessor opened their feedback list: clear the sidebar badge. */
export async function markFeedbackSeen(ctx: Ctx, actor: AccessContext | null) {
  const a = await authorize(ctx, actor, ASSESSOR, "moderation.feedback.seen");
  const now = ctx.now();
  await ctx.db
    .insert(moderationFeedbackReads)
    .values({ userId: a.userId, seenAt: now })
    .onConflictDoUpdate({ target: [moderationFeedbackReads.tenantId, moderationFeedbackReads.userId], set: { seenAt: now } });
}

/** Sidebar badge: moderation outcomes on my decisions since I last opened the list. Own data only. */
export async function unseenFeedbackCount(ctx: Pick<Ctx, "db">, userId: string): Promise<number> {
  const [read] = await ctx.db
    .select({ seenAt: moderationFeedbackReads.seenAt })
    .from(moderationFeedbackReads)
    .where(eq(moderationFeedbackReads.userId, userId));
  const [row] = await ctx.db
    .select({ n: sql<number>`count(*)::int` })
    .from(moderationRecords)
    .innerJoin(assessmentDecisions, eq(assessmentDecisions.id, moderationRecords.decisionId))
    .where(and(eq(assessmentDecisions.assessorId, userId), read ? gt(moderationRecords.moderatedAt, read.seenAt) : undefined));
  return Number(row?.n ?? 0);
}

/** The assessor marks an Agree-with-actions verdict's actions as done. */
export async function completeActions(ctx: Ctx, actor: AccessContext | null, moderationRecordId: string, note: string) {
  const a = await authorize(ctx, actor, ASSESSOR, "moderation.actions");
  const text = note.trim();
  if (!text) throw new AssessmentError("invalid_answer", "Say briefly what you did.");
  if (text.length > 2000) throw new AssessmentError("invalid_answer", "Keep the note under 2,000 characters.");
  const [row] = await ctx.db
    .select({ m: moderationRecords, d: assessmentDecisions, batch: moderationBatches })
    .from(moderationRecords)
    .innerJoin(assessmentDecisions, eq(assessmentDecisions.id, moderationRecords.decisionId))
    .innerJoin(moderationBatches, eq(moderationBatches.id, assessmentDecisions.batchId))
    .where(eq(moderationRecords.id, moderationRecordId));
  if (!row || row.d.assessorId !== a.userId) throw new AssessmentError("not_found", "Moderation feedback not found.");
  await assertCohortScope(ctx, a, ["assessor"], row.batch.cohortId, "moderation.actions");
  if (verdictOf(row.m) !== "agree_with_actions") throw new AssessmentError("invalid_answer", "There are no actions to complete.");
  if (row.batch.status !== "open") throw new AssessmentError("submitted", "These results have been released.");
  const [existing] = await ctx.db
    .select({ id: moderationActionCompletions.id })
    .from(moderationActionCompletions)
    .where(eq(moderationActionCompletions.moderationRecordId, moderationRecordId));
  if (existing) throw new AssessmentError("submitted", "You have already marked these actions done.");
  await ctx.db
    .insert(moderationActionCompletions)
    .values({ moderationRecordId, doneBy: a.userId, note: text, doneAt: ctx.now() });
  await writeAudit(ctx, {
    action: "assessment.moderation.actions_done",
    actorId: a.userId,
    entityType: "moderation_record",
    entityId: moderationRecordId,
  });
}

/** Called when a reassessment ordered on appeal is decided: it is always moderated. */
export async function sampleReassessment(
  ctx: Pick<Ctx, "db" | "now">,
  batchId: string,
  target: { attemptId: string } | { submissionId: string },
  assessorId: string,
) {
  await ctx.db
    .insert(moderationSampleItems)
    .values({
      batchId,
      attemptId: "attemptId" in target ? target.attemptId : null,
      submissionId: "submissionId" in target ? target.submissionId : null,
      reason: "reassessment",
      addedBy: assessorId,
      addedAt: ctx.now(),
    })
    .onConflictDoNothing();
}

// ---------------------------------------------------------------------------
// Moderation report (per batch): data for the PDF and CSV exports
// ---------------------------------------------------------------------------

export type ModerationReport = Awaited<ReturnType<typeof moderationReport>>;

export async function moderationReport(ctx: Ctx, actor: AccessContext | null, batchId: string) {
  const a = await authorize(ctx, actor, MODERATOR, "moderation.report");
  const b = await loadBatch(ctx, batchId);
  await assertCohortScope(ctx, a, ["moderator"], b.batch.cohortId, "moderation.report");
  const rows = await batchRows(ctx, batchId);
  const [closer] = b.batch.closedBy
    ? await ctx.db.select({ name: users.displayName }).from(users).where(eq(users.id, b.batch.closedBy))
    : [];
  return {
    actorId: a.userId,
    batchId,
    title: b.title,
    kind: b.kind,
    cohortName: b.cohortName,
    status: b.batch.status,
    closedAt: b.batch.closedAt,
    closedBy: closer?.name ?? null,
    summary: summarise(b.rate, rows, b.batch.status === "open"),
    sampled: rows.filter((r) => r.sample),
  };
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
      submissionId: assessmentDecisions.submissionId,
      outcome: assessmentDecisions.outcome,
      assessorId: assessmentDecisions.assessorId,
      cohortId: enrolments.cohortId,
      cohortName: cohorts.name,
      learnerName: users.displayName,
      title: sql<string>`coalesce(${assessmentBlueprints.title}, ${practicalBriefs.title})`,
    })
    .from(appeals)
    .innerJoin(assessmentDecisions, eq(assessmentDecisions.id, appeals.decisionId))
    .innerJoin(enrolments, eq(enrolments.id, appeals.enrolmentId))
    .innerJoin(cohorts, eq(cohorts.id, enrolments.cohortId))
    .innerJoin(users, eq(users.id, enrolments.userId))
    .leftJoin(assessmentAttempts, eq(assessmentAttempts.id, assessmentDecisions.attemptId))
    .leftJoin(assessmentBlueprints, eq(assessmentBlueprints.id, assessmentAttempts.blueprintId))
    .leftJoin(submissions, eq(submissions.id, assessmentDecisions.submissionId))
    .leftJoin(practicalBriefs, eq(practicalBriefs.id, submissions.briefId))
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
