import { randomBytes } from "node:crypto";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  sql,
} from "drizzle-orm";
import {
  answerOptions,
  appeals,
  assessmentAttempts,
  assessmentBlueprints,
  assessmentDecisions,
  assessmentSchedules,
  attemptItems,
  blueprintRules,
  enrolments,
  modules,
  paperUnlocks,
  questions,
  questionVersions,
} from "db";
import type { AccessContext } from "@/lib/access";
import { drawPaper, PoolTooSmallError, type DrawRule } from "@/lib/paper";
import { seedFor } from "@/lib/randomization";
import { writeAudit } from "./audit";
import type { ServerCtx } from "./context";
import { requireEnrolment } from "./learning";
import { RATE_LIMITS, enforceRateLimit } from "./ratelimit";

/**
 * Knowledge assessments, learner side (docs/lms/randomization.md, design.md
 * L9–L11). Papers are drawn once with a seeded draw and stored as
 * attempt_items; every later read uses the stored rows. The browser only ever
 * receives stems, option labels and opaque per-attempt option tokens: never
 * option ids, correctness, explanations or rubrics before grading.
 * Time limits are enforced here; an expired attempt is submitted with its
 * autosaved answers the next time anyone touches it.
 */

export const APPEAL_WINDOW_DAYS = 7;
/** Network grace for an answer that was sent just before the deadline. */
const SAVE_GRACE_MS = 15_000;
const MAX_TEXT_ANSWER = 5000;

export class AssessmentError extends Error {
  constructor(
    public readonly code:
      | "not_found"
      | "not_open"
      | "no_attempts_left"
      | "needs_unlock"
      | "time_up"
      | "paused"
      | "submitted"
      | "invalid_answer"
      | "pool_too_small"
      | "appeal_closed",
    message: string,
  ) {
    super(message);
    this.name = "AssessmentError";
  }
}

type Db = Pick<ServerCtx, "db">;
type Ctx = Pick<ServerCtx, "db" | "now" | "ipHash">;
type RateCtx = Pick<ServerCtx, "db" | "now" | "ipHash" | "config">;

// ---------------------------------------------------------------------------
// Attempt allowance
// ---------------------------------------------------------------------------

/** The current (not superseded) decision for an attempt, if any. */
export async function currentDecision(ctx: Db, attemptId: string) {
  const [d] = await ctx.db
    .select()
    .from(assessmentDecisions)
    .where(
      and(
        eq(assessmentDecisions.attemptId, attemptId),
        sql`NOT EXISTS (SELECT 1 FROM "assessment_decisions" "newer" WHERE "newer"."supersedes_id" = "assessment_decisions"."id")`,
      ),
    )
    .limit(1);
  return d ?? null;
}

async function attemptsFor(ctx: Db, enrolmentId: string, blueprintId: string) {
  return ctx.db
    .select()
    .from(assessmentAttempts)
    .where(
      and(
        eq(assessmentAttempts.enrolmentId, enrolmentId),
        eq(assessmentAttempts.blueprintId, blueprintId),
      ),
    )
    .orderBy(asc(assessmentAttempts.attemptNo));
}

/** Reassessments ordered on appeal add attempts on top of the blueprint's limit. */
async function appealGrants(ctx: Db, enrolmentId: string, blueprintId: string) {
  const rows = await ctx.db
    .select({ n: sql<number>`count(*)::int` })
    .from(appeals)
    .innerJoin(
      assessmentDecisions,
      eq(assessmentDecisions.id, appeals.decisionId),
    )
    .innerJoin(
      assessmentAttempts,
      eq(assessmentAttempts.id, assessmentDecisions.attemptId),
    )
    .where(
      and(
        eq(appeals.enrolmentId, enrolmentId),
        eq(appeals.status, "reassess"),
        eq(assessmentAttempts.blueprintId, blueprintId),
      ),
    );
  return Number(rows[0]?.n ?? 0);
}

type Blueprint = typeof assessmentBlueprints.$inferSelect;

/**
 * May this learner start attempt N+1? Formative: after the previous attempt
 * is submitted, up to the limit. Summative: a reassessment only after a
 * released "Not yet competent" or an appeal that ordered a reassessment.
 */
export async function nextAttemptAllowance(
  ctx: Db,
  enrolmentId: string,
  bp: Blueprint,
): Promise<
  | { ok: true; attemptNo: number; allowed: number }
  | { ok: false; reason: "no_attempts_left" | "awaiting_result"; allowed: number }
> {
  const list = await attemptsFor(ctx, enrolmentId, bp.id);
  const grants = await appealGrants(ctx, enrolmentId, bp.id);
  const allowed = bp.maxAttempts + grants;
  const last = list.at(-1);
  if (!last) return { ok: true, attemptNo: 1, allowed };
  if (list.length >= allowed) return { ok: false, reason: "no_attempts_left", allowed };
  if (bp.kind === "summative") {
    const d = await currentDecision(ctx, last.id);
    const released = d?.releasedAt != null;
    const nyc = released && d!.outcome === "not_yet_competent";
    const [reassess] = d
      ? await ctx.db
          .select({ id: appeals.id })
          .from(appeals)
          .where(and(eq(appeals.decisionId, d.id), eq(appeals.status, "reassess")))
      : [];
    if (!nyc && !reassess) return { ok: false, reason: "awaiting_result", allowed };
  }
  return { ok: true, attemptNo: last.attemptNo + 1, allowed };
}

// ---------------------------------------------------------------------------
// Expiry and submission
// ---------------------------------------------------------------------------

function isExpired(
  a: { deadlineAt: Date | null; pausedAt: Date | null },
  now: Date,
  graceMs = 0,
) {
  return (
    a.deadlineAt !== null &&
    a.pausedAt === null &&
    now.getTime() > a.deadlineAt.getTime() + graceMs
  );
}

/**
 * Grade auto-marked items and close the attempt. Idempotent: only an
 * in-progress attempt changes. Short-answer items wait for the assessor
 * (status "submitted"); otherwise the attempt is "graded".
 */
export async function finaliseAttempt(
  ctx: Ctx,
  attemptId: string,
  opts: { auto: boolean; actorId: string | null },
): Promise<boolean> {
  const now = ctx.now();
  const changed = await ctx.db.transaction(async (tx) => {
    const [a] = await tx
      .select()
      .from(assessmentAttempts)
      .where(eq(assessmentAttempts.id, attemptId))
      .for("update");
    if (!a || a.status !== "in_progress") return null;

    const items = await tx
      .select({
        id: attemptItems.id,
        versionId: attemptItems.questionVersionId,
        response: attemptItems.responseOptionIds,
        type: questionVersions.type,
        maxMarks: questionVersions.maxMarks,
      })
      .from(attemptItems)
      .innerJoin(
        questionVersions,
        eq(questionVersions.id, attemptItems.questionVersionId),
      )
      .where(eq(attemptItems.attemptId, attemptId));
    const versionIds = items.map((i) => i.versionId);
    const keys = versionIds.length
      ? await tx
          .select({
            versionId: answerOptions.questionVersionId,
            id: answerOptions.id,
          })
          .from(answerOptions)
          .where(
            and(
              inArray(answerOptions.questionVersionId, versionIds),
              eq(answerOptions.isCorrect, true),
            ),
          )
      : [];
    let raw = 0;
    let max = 0;
    let needsMarking = false;
    for (const it of items) {
      max += it.maxMarks;
      if (it.type === "short_answer") {
        needsMarking = true;
        continue;
      }
      const correct = new Set(
        keys.filter((k) => k.versionId === it.versionId).map((k) => k.id),
      );
      const chosen = new Set(it.response ?? []);
      const ok =
        chosen.size > 0 &&
        chosen.size === correct.size &&
        [...chosen].every((c) => correct.has(c));
      if (ok) raw += it.maxMarks;
      await tx
        .update(attemptItems)
        .set({ isCorrect: ok, marksAwarded: ok ? it.maxMarks : 0 })
        .where(eq(attemptItems.id, it.id));
    }
    const submittedAt =
      opts.auto && a.deadlineAt && a.deadlineAt < now ? a.deadlineAt : now;
    await tx
      .update(assessmentAttempts)
      .set({
        status: needsMarking ? "submitted" : "graded",
        submittedAt,
        autoSubmitted: opts.auto,
        scoreRaw: needsMarking ? null : raw,
        scoreMax: max,
      })
      .where(eq(assessmentAttempts.id, attemptId));
    return { items: items.length, needsMarking };
  });
  if (!changed) return false;
  await writeAudit(ctx, {
    action: opts.auto
      ? "assessment.attempt.auto_submitted"
      : "assessment.attempt.submitted",
    actorId: opts.actorId,
    entityType: "assessment_attempt",
    entityId: attemptId,
    after: { items: changed.items, needsMarking: changed.needsMarking },
  });
  return true;
}

/** Submit every in-progress attempt past its deadline (optionally within some schedules). */
export async function finaliseExpired(ctx: Ctx, scheduleIds?: string[]) {
  if (scheduleIds && scheduleIds.length === 0) return 0;
  const rows = await ctx.db
    .select({ id: assessmentAttempts.id })
    .from(assessmentAttempts)
    .where(
      and(
        eq(assessmentAttempts.status, "in_progress"),
        isNotNull(assessmentAttempts.deadlineAt),
        isNull(assessmentAttempts.pausedAt),
        sql`${assessmentAttempts.deadlineAt} < ${ctx.now().toISOString()}::timestamptz`,
        scheduleIds
          ? inArray(assessmentAttempts.scheduleId, scheduleIds)
          : undefined,
      ),
    );
  let n = 0;
  for (const r of rows) {
    if (await finaliseAttempt(ctx, r.id, { auto: true, actorId: null })) n++;
  }
  return n;
}

// ---------------------------------------------------------------------------
// Listing and starting
// ---------------------------------------------------------------------------

export type AssessmentListItem = {
  scheduleId: string;
  blueprintId: string;
  title: string;
  moduleCode: string;
  kind: "formative" | "summative";
  opensAt: Date;
  closesAt: Date;
  questionCount: number;
  timeLimitMinutes: number | null;
  state: "open" | "in_progress" | "upcoming" | "awaiting_unlock" | "done" | "closed";
  attemptsUsed: number;
  attemptsAllowed: number;
  latestAttemptId: string | null;
  /** Formative: score of the latest graded attempt. */
  score: { raw: number; max: number } | null;
  /** Summative: released outcome of the latest attempt. */
  outcome: "competent" | "not_yet_competent" | null;
  awaitingResult: boolean;
};

async function schedulesForCohort(ctx: Db, cohortId: string, qualificationId: string) {
  return ctx.db
    .select({ schedule: assessmentSchedules, blueprint: assessmentBlueprints, moduleCode: modules.code })
    .from(assessmentSchedules)
    .innerJoin(
      assessmentBlueprints,
      eq(assessmentBlueprints.id, assessmentSchedules.blueprintId),
    )
    .innerJoin(modules, eq(modules.id, assessmentBlueprints.moduleId))
    .where(
      and(
        eq(assessmentSchedules.cohortId, cohortId),
        eq(modules.qualificationId, qualificationId),
        eq(assessmentBlueprints.status, "published"),
        inArray(assessmentBlueprints.kind, ["formative", "summative"]),
      ),
    )
    .orderBy(asc(assessmentSchedules.opensAt));
}

async function questionCount(ctx: Db, blueprintId: string) {
  const [r] = await ctx.db
    .select({ n: sql<number>`coalesce(sum(${blueprintRules.questionCount}), 0)::int` })
    .from(blueprintRules)
    .where(eq(blueprintRules.blueprintId, blueprintId));
  return Number(r?.n ?? 0);
}

export async function unusedUnlock(
  ctx: Db,
  scheduleId: string,
  enrolmentId: string,
  attemptNo: number,
) {
  const [u] = await ctx.db
    .select({ id: paperUnlocks.id })
    .from(paperUnlocks)
    .leftJoin(assessmentAttempts, eq(assessmentAttempts.unlockId, paperUnlocks.id))
    .where(
      and(
        eq(paperUnlocks.scheduleId, scheduleId),
        eq(paperUnlocks.enrolmentId, enrolmentId),
        eq(paperUnlocks.attemptNo, attemptNo),
        isNull(assessmentAttempts.id),
      ),
    );
  return u ?? null;
}

export async function listAssessments(
  ctx: Ctx,
  actor: AccessContext,
  qualificationId: string,
): Promise<AssessmentListItem[]> {
  const { enrolmentId, cohortId } = await requireEnrolment(ctx, actor, qualificationId);
  const rows = await schedulesForCohort(ctx, cohortId, qualificationId);
  await finaliseExpired(ctx, rows.map((r) => r.schedule.id));
  const now = ctx.now();
  const out: AssessmentListItem[] = [];
  for (const { schedule, blueprint, moduleCode } of rows) {
    const kind = blueprint.kind as "formative" | "summative";
    const list = await attemptsFor(ctx, enrolmentId, blueprint.id);
    const here = list.filter((a) => a.scheduleId === schedule.id);
    const latest = here.at(-1) ?? null;
    const allowance = await nextAttemptAllowance(ctx, enrolmentId, blueprint);
    const inWindow = now >= schedule.opensAt && now <= schedule.closesAt;

    let state: AssessmentListItem["state"];
    if (latest?.status === "in_progress") state = "in_progress";
    else if (now < schedule.opensAt) state = kind === "summative" ? "awaiting_unlock" : "upcoming";
    else if (!inWindow) state = latest ? "done" : "closed";
    else if (!allowance.ok) state = latest ? "done" : "closed";
    else if (kind === "summative") {
      const unlock = await unusedUnlock(ctx, schedule.id, enrolmentId, allowance.attemptNo);
      state = unlock ? "open" : latest ? "done" : "awaiting_unlock";
    } else state = "open";

    let outcome: AssessmentListItem["outcome"] = null;
    let awaitingResult = false;
    if (latest && latest.status !== "in_progress" && kind === "summative") {
      const d = await currentDecision(ctx, latest.id);
      if (d?.releasedAt) outcome = d.outcome;
      else awaitingResult = true;
    }
    out.push({
      scheduleId: schedule.id,
      blueprintId: blueprint.id,
      title: blueprint.title,
      moduleCode,
      kind,
      opensAt: schedule.opensAt,
      closesAt: schedule.closesAt,
      questionCount: await questionCount(ctx, blueprint.id),
      timeLimitMinutes: blueprint.timeLimitMinutes,
      state,
      attemptsUsed: list.length,
      attemptsAllowed: allowance.allowed,
      latestAttemptId: latest?.id ?? null,
      score:
        kind === "formative" && latest?.status === "graded" && latest.scoreMax
          ? { raw: latest.scoreRaw ?? 0, max: latest.scoreMax }
          : null,
      outcome,
      awaitingResult,
    });
  }
  return out;
}

async function loadSchedule(ctx: Db, scheduleId: string) {
  const [row] = await ctx.db
    .select({
      schedule: assessmentSchedules,
      blueprint: assessmentBlueprints,
      qualificationId: modules.qualificationId,
      moduleCode: modules.code,
    })
    .from(assessmentSchedules)
    .innerJoin(
      assessmentBlueprints,
      eq(assessmentBlueprints.id, assessmentSchedules.blueprintId),
    )
    .innerJoin(modules, eq(modules.id, assessmentBlueprints.moduleId))
    .where(eq(assessmentSchedules.id, scheduleId));
  if (!row || row.blueprint.status !== "published") {
    throw new AssessmentError("not_found", "Assessment not found.");
  }
  return row;
}

export type StartInfo = {
  scheduleId: string;
  qualificationId: string;
  title: string;
  moduleCode: string;
  kind: "formative" | "summative";
  questionCount: number;
  timeLimitMinutes: number | null;
  attemptNo: number | null;
  attemptsAllowed: number;
  inProgressAttemptId: string | null;
  canBegin: boolean;
  reason: "not_open" | "closed" | "needs_unlock" | "no_attempts_left" | "awaiting_result" | null;
};

export async function getStartInfo(
  ctx: Ctx,
  actor: AccessContext,
  scheduleId: string,
): Promise<StartInfo> {
  const { schedule, blueprint, qualificationId, moduleCode } = await loadSchedule(ctx, scheduleId);
  const { enrolmentId, cohortId } = await requireEnrolment(ctx, actor, qualificationId);
  if (cohortId !== schedule.cohortId) throw new AssessmentError("not_found", "Assessment not found.");
  await finaliseExpired(ctx, [scheduleId]);
  const now = ctx.now();
  const list = await attemptsFor(ctx, enrolmentId, blueprint.id);
  const inProgress = list.find((a) => a.status === "in_progress") ?? null;
  const allowance = await nextAttemptAllowance(ctx, enrolmentId, blueprint);

  let reason: StartInfo["reason"] = null;
  if (now < schedule.opensAt) reason = "not_open";
  else if (now > schedule.closesAt) reason = "closed";
  else if (!allowance.ok) reason = allowance.reason;
  else if (
    blueprint.kind === "summative" &&
    !(await unusedUnlock(ctx, scheduleId, enrolmentId, allowance.attemptNo))
  ) {
    reason = "needs_unlock";
  }
  return {
    scheduleId,
    qualificationId,
    title: blueprint.title,
    moduleCode,
    kind: blueprint.kind as "formative" | "summative",
    questionCount: await questionCount(ctx, blueprint.id),
    timeLimitMinutes: blueprint.timeLimitMinutes,
    attemptNo: allowance.ok ? allowance.attemptNo : null,
    attemptsAllowed: allowance.allowed,
    inProgressAttemptId: inProgress?.id ?? null,
    canBegin: reason === null && !inProgress,
    reason: inProgress ? null : reason,
  };
}

/** Eligible questions per rule: active, with a current version of an allowed type. */
async function rulesWithQuestions(
  ctx: Db,
  blueprintId: string,
  kind: string,
): Promise<DrawRule<{ id: string; pinnedPosition: number | null; authorOrder: number }>[]> {
  const rules = await ctx.db
    .select()
    .from(blueprintRules)
    .where(eq(blueprintRules.blueprintId, blueprintId));
  const types =
    kind === "summative"
      ? (["single", "multi", "short_answer"] as const)
      : (["single", "multi"] as const);
  const out = [];
  for (const r of rules) {
    const qs = await ctx.db
      .select({ questionId: questions.id, versionId: questionVersions.id })
      .from(questions)
      .innerJoin(questionVersions, eq(questionVersions.id, questions.currentVersionId))
      .where(
        and(
          eq(questions.bankId, r.bankId),
          eq(questions.status, "active"),
          inArray(questionVersions.type, [...types]),
        ),
      );
    const opts = qs.length
      ? await ctx.db
          .select({
            versionId: answerOptions.questionVersionId,
            id: answerOptions.id,
            pinnedPosition: answerOptions.pinnedPosition,
            authorOrder: answerOptions.authorOrder,
          })
          .from(answerOptions)
          .where(inArray(answerOptions.questionVersionId, qs.map((q) => q.versionId)))
      : [];
    out.push({
      ruleId: r.id,
      component: r.curriculumComponentRef,
      count: r.questionCount,
      questions: qs.map((q) => ({
        questionId: q.questionId,
        versionId: q.versionId,
        options: opts
          .filter((o) => o.versionId === q.versionId)
          .map(({ id, pinnedPosition, authorOrder }) => ({ id, pinnedPosition, authorOrder })),
      })),
    });
  }
  return out;
}

/** Question id → latest attempt number it was served to this enrolment in this blueprint. */
async function lastSeenFor(ctx: Db, enrolmentId: string, blueprintId: string) {
  const rows = await ctx.db
    .select({
      questionId: questionVersions.questionId,
      attemptNo: assessmentAttempts.attemptNo,
    })
    .from(attemptItems)
    .innerJoin(assessmentAttempts, eq(assessmentAttempts.id, attemptItems.attemptId))
    .innerJoin(questionVersions, eq(questionVersions.id, attemptItems.questionVersionId))
    .where(
      and(
        eq(assessmentAttempts.enrolmentId, enrolmentId),
        eq(assessmentAttempts.blueprintId, blueprintId),
      ),
    );
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.questionId, Math.max(map.get(r.questionId) ?? 0, r.attemptNo));
  return map;
}

const newToken = () => randomBytes(9).toString("base64url");

/** Start (or return the already-started) attempt for a schedule. */
export async function beginAttempt(
  ctx: RateCtx,
  actor: AccessContext,
  scheduleId: string,
): Promise<string> {
  await enforceRateLimit(ctx, RATE_LIMITS.attemptBegin, actor.userId);
  const info = await getStartInfo(ctx, actor, scheduleId);
  if (info.inProgressAttemptId) return info.inProgressAttemptId;
  if (!info.canBegin || info.attemptNo === null) {
    throw new AssessmentError(
      info.reason === "needs_unlock"
        ? "needs_unlock"
        : info.reason === "no_attempts_left"
          ? "no_attempts_left"
          : "not_open",
      "This assessment can't be started right now.",
    );
  }
  const { schedule, blueprint } = await loadSchedule(ctx, scheduleId);
  const { enrolmentId } = await requireEnrolment(ctx, actor, info.qualificationId);
  const attemptNo = info.attemptNo;
  const unlock =
    blueprint.kind === "summative"
      ? await unusedUnlock(ctx, scheduleId, enrolmentId, attemptNo)
      : null;

  const seed = seedFor(actor.userId, blueprint.id, attemptNo);
  let paper;
  try {
    paper = drawPaper({
      seed,
      rules: await rulesWithQuestions(ctx, blueprint.id, blueprint.kind),
      lastSeen: await lastSeenFor(ctx, enrolmentId, blueprint.id),
    });
  } catch (e) {
    if (e instanceof PoolTooSmallError) {
      throw new AssessmentError("pool_too_small", "This assessment isn't ready yet. Please tell your facilitator.");
    }
    throw e;
  }

  const now = ctx.now();
  const deadlineAt = blueprint.timeLimitMinutes
    ? new Date(now.getTime() + blueprint.timeLimitMinutes * 60_000)
    : null;
  let attemptId: string;
  try {
    attemptId = await ctx.db.transaction(async (tx) => {
      const [a] = await tx
        .insert(assessmentAttempts)
        .values({
          enrolmentId,
          blueprintId: blueprint.id,
          scheduleId: schedule.id,
          unlockId: unlock?.id ?? null,
          attemptNo,
          status: "in_progress",
          startedAt: now,
          deadlineAt,
          usedFallback: paper.usedFallback,
        })
        .returning({ id: assessmentAttempts.id });
      await tx.insert(attemptItems).values(
        paper.items.map((it) => {
          const tokens: Record<string, string> = {};
          for (const o of it.options) tokens[newToken()] = o.id;
          return {
            attemptId: a!.id,
            questionVersionId: it.versionId,
            position: it.position,
            servedOptionOrder: it.options.map((o) => o.id),
            optionTokens: tokens,
            seed,
          };
        }),
      );
      return a!.id;
    });
  } catch (err) {
    // Two tabs racing: the other request created this attempt; use it.
    if ((err as { cause?: { code?: string } }).cause?.code === "23505") {
      const again = await getStartInfo(ctx, actor, scheduleId);
      if (again.inProgressAttemptId) return again.inProgressAttemptId;
    }
    throw err;
  }
  await writeAudit(ctx, {
    action: "assessment.attempt.started",
    actorId: actor.userId,
    entityType: "assessment_attempt",
    entityId: attemptId,
    after: { attemptNo, items: paper.items.length, usedFallback: paper.usedFallback },
  });
  return attemptId;
}

// ---------------------------------------------------------------------------
// Taking the paper
// ---------------------------------------------------------------------------

async function ownedAttempt(ctx: Db, actor: AccessContext, attemptId: string) {
  const [row] = await ctx.db
    .select({ attempt: assessmentAttempts, userId: enrolments.userId })
    .from(assessmentAttempts)
    .innerJoin(enrolments, eq(enrolments.id, assessmentAttempts.enrolmentId))
    .where(eq(assessmentAttempts.id, attemptId));
  if (!row || row.userId !== actor.userId || !row.attempt.blueprintId) {
    throw new AssessmentError("not_found", "Attempt not found.");
  }
  return row.attempt;
}

export type LearnerOption = { token: string; label: string };

/** Exactly what the learner's browser may receive while writing. No answers. */
export type AttemptView =
  | { state: "submitted"; attemptId: string; scheduleId: string | null }
  | {
      state: "writing";
      attemptId: string;
      scheduleId: string | null;
      title: string;
      kind: "formative" | "summative";
      deadlineAt: string | null;
      paused: boolean;
      nav: { position: number; answered: boolean; flagged: boolean }[];
      question: {
        position: number;
        total: number;
        type: "single" | "multi" | "short_answer";
        stem: string;
        options: LearnerOption[];
        chosenTokens: string[];
        responseText: string;
        flagged: boolean;
      };
    };

export async function getAttemptView(
  ctx: Ctx,
  actor: AccessContext,
  attemptId: string,
  position: number,
): Promise<AttemptView> {
  let a = await ownedAttempt(ctx, actor, attemptId);
  if (a.status === "in_progress" && isExpired(a, ctx.now())) {
    await finaliseAttempt(ctx, attemptId, { auto: true, actorId: null });
    a = await ownedAttempt(ctx, actor, attemptId);
  }
  if (a.status !== "in_progress") {
    return { state: "submitted", attemptId, scheduleId: a.scheduleId };
  }
  const [bp] = await ctx.db
    .select({ title: assessmentBlueprints.title, kind: assessmentBlueprints.kind })
    .from(assessmentBlueprints)
    .where(eq(assessmentBlueprints.id, a.blueprintId!));
  const items = await ctx.db
    .select({
      position: attemptItems.position,
      versionId: attemptItems.questionVersionId,
      servedOptionOrder: attemptItems.servedOptionOrder,
      optionTokens: attemptItems.optionTokens,
      response: attemptItems.responseOptionIds,
      responseText: attemptItems.responseText,
      flagged: attemptItems.flagged,
      stem: questionVersions.stem,
      type: questionVersions.type,
    })
    .from(attemptItems)
    .innerJoin(questionVersions, eq(questionVersions.id, attemptItems.questionVersionId))
    .where(eq(attemptItems.attemptId, attemptId))
    .orderBy(asc(attemptItems.position));
  if (items.length === 0) throw new AssessmentError("not_found", "Attempt not found.");
  const current = items.find((i) => i.position === position) ?? items[0]!;
  const labels = await ctx.db
    .select({ id: answerOptions.id, label: answerOptions.label })
    .from(answerOptions)
    .where(eq(answerOptions.questionVersionId, current.versionId));
  const labelOf = new Map(labels.map((l) => [l.id, l.label]));
  const tokenOf = new Map(Object.entries(current.optionTokens).map(([t, id]) => [id, t]));
  return {
    state: "writing",
    attemptId,
    scheduleId: a.scheduleId,
    title: bp!.title,
    kind: bp!.kind as "formative" | "summative",
    deadlineAt: a.deadlineAt?.toISOString() ?? null,
    paused: a.pausedAt !== null,
    nav: items.map((i) => ({
      position: i.position,
      answered: (i.response?.length ?? 0) > 0 || Boolean(i.responseText?.trim()),
      flagged: i.flagged,
    })),
    question: {
      position: current.position,
      total: items.length,
      type: current.type,
      stem: current.stem,
      options: current.servedOptionOrder.map((id) => ({
        token: tokenOf.get(id)!,
        label: labelOf.get(id)!,
      })),
      chosenTokens: (current.response ?? []).map((id) => tokenOf.get(id)!).filter(Boolean),
      responseText: current.responseText ?? "",
      flagged: current.flagged,
    },
  };
}

async function writableItem(ctx: Ctx, actor: AccessContext, attemptId: string, position: number) {
  const a = await ownedAttempt(ctx, actor, attemptId);
  if (a.status !== "in_progress") throw new AssessmentError("submitted", "This attempt has been submitted.");
  if (a.pausedAt) throw new AssessmentError("paused", "Your assessor has paused this attempt.");
  if (isExpired(a, ctx.now(), SAVE_GRACE_MS)) {
    await finaliseAttempt(ctx, attemptId, { auto: true, actorId: null });
    throw new AssessmentError("time_up", "Time is up. Your saved answers were submitted.");
  }
  const [item] = await ctx.db
    .select({
      id: attemptItems.id,
      optionTokens: attemptItems.optionTokens,
      type: questionVersions.type,
    })
    .from(attemptItems)
    .innerJoin(questionVersions, eq(questionVersions.id, attemptItems.questionVersionId))
    .where(and(eq(attemptItems.attemptId, attemptId), eq(attemptItems.position, position)));
  if (!item) throw new AssessmentError("not_found", "Question not found.");
  return item;
}

/** Autosave one answer (option tokens for single/multi, text for short answers). */
export async function saveAnswer(
  ctx: RateCtx,
  actor: AccessContext,
  attemptId: string,
  position: number,
  answer: { tokens?: readonly string[]; text?: string },
): Promise<{ savedAt: string }> {
  await enforceRateLimit(ctx, RATE_LIMITS.answerSave, actor.userId);
  const item = await writableItem(ctx, actor, attemptId, position);
  const now = ctx.now();
  if (item.type === "short_answer") {
    const text = (answer.text ?? "").slice(0, MAX_TEXT_ANSWER + 1);
    if (text.length > MAX_TEXT_ANSWER) {
      throw new AssessmentError("invalid_answer", `Answers can be up to ${MAX_TEXT_ANSWER} characters.`);
    }
    await ctx.db
      .update(attemptItems)
      .set({ responseText: text, answeredAt: text.trim() ? now : null })
      .where(eq(attemptItems.id, item.id));
  } else {
    const tokens = [...new Set(answer.tokens ?? [])];
    if (item.type === "single" && tokens.length > 1) {
      throw new AssessmentError("invalid_answer", "Choose one answer.");
    }
    const ids = tokens.map((t) => item.optionTokens[t]);
    if (ids.some((id) => !id)) throw new AssessmentError("invalid_answer", "Choose one of the answers.");
    await ctx.db
      .update(attemptItems)
      .set({ responseOptionIds: ids as string[], answeredAt: ids.length ? now : null })
      .where(eq(attemptItems.id, item.id));
  }
  return { savedAt: now.toISOString() };
}

export async function setFlag(
  ctx: RateCtx,
  actor: AccessContext,
  attemptId: string,
  position: number,
  flagged: boolean,
): Promise<void> {
  await enforceRateLimit(ctx, RATE_LIMITS.answerSave, actor.userId);
  const item = await writableItem(ctx, actor, attemptId, position);
  await ctx.db.update(attemptItems).set({ flagged }).where(eq(attemptItems.id, item.id));
}

export async function submitAttempt(
  ctx: RateCtx,
  actor: AccessContext,
  attemptId: string,
): Promise<void> {
  await enforceRateLimit(ctx, RATE_LIMITS.attemptSubmit, actor.userId);
  const a = await ownedAttempt(ctx, actor, attemptId);
  if (a.status !== "in_progress") return; // idempotent
  if (a.pausedAt) throw new AssessmentError("paused", "Your assessor has paused this attempt.");
  const auto = isExpired(a, ctx.now(), SAVE_GRACE_MS);
  await finaliseAttempt(ctx, attemptId, { auto, actorId: actor.userId });
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export type ResultItem = {
  position: number;
  stem: string;
  type: "single" | "multi" | "short_answer";
  options: { label: string; chosen: boolean; correct: boolean }[];
  responseText: string | null;
  isCorrect: boolean | null;
  explanation: string | null;
};

export type AttemptResult = {
  attemptId: string;
  scheduleId: string | null;
  qualificationId: string;
  title: string;
  kind: "formative" | "summative";
  submittedAt: Date | null;
  autoSubmitted: boolean;
} & (
  | {
      kind: "formative";
      score: { raw: number; max: number } | null;
      passMarkPercent: number;
      /** Only when the blueprint shows answers (formative default). */
      items: ResultItem[] | null;
    }
  | {
      kind: "summative";
      released: null | {
        decisionId: string;
        outcome: "competent" | "not_yet_competent";
        feedback: string;
        releasedAt: Date;
        appeal:
          | { state: "can_appeal"; closesAt: Date }
          | { state: "closed" }
          | { state: "submitted"; status: "open" | "upheld" | "reassess"; outcomeNotes: string | null };
      };
    }
);

export async function getAttemptResult(
  ctx: Ctx,
  actor: AccessContext,
  attemptId: string,
): Promise<AttemptResult | null> {
  let a = await ownedAttempt(ctx, actor, attemptId);
  if (a.status === "in_progress" && isExpired(a, ctx.now())) {
    await finaliseAttempt(ctx, attemptId, { auto: true, actorId: null });
    a = await ownedAttempt(ctx, actor, attemptId);
  }
  if (a.status === "in_progress") return null;
  const [bp] = await ctx.db
    .select({ bp: assessmentBlueprints, qualificationId: modules.qualificationId })
    .from(assessmentBlueprints)
    .innerJoin(modules, eq(modules.id, assessmentBlueprints.moduleId))
    .where(eq(assessmentBlueprints.id, a.blueprintId!));
  const base = {
    attemptId,
    scheduleId: a.scheduleId,
    qualificationId: bp!.qualificationId,
    title: bp!.bp.title,
    submittedAt: a.submittedAt,
    autoSubmitted: a.autoSubmitted,
  };
  if (bp!.bp.kind !== "summative") {
    return {
      ...base,
      kind: "formative",
      score: a.status === "graded" && a.scoreMax ? { raw: a.scoreRaw ?? 0, max: a.scoreMax } : null,
      passMarkPercent: bp!.bp.passMarkPercent,
      items: bp!.bp.showAnswers ? await resultItems(ctx, attemptId) : null,
    };
  }
  const d = await currentDecision(ctx, attemptId);
  if (!d?.releasedAt) return { ...base, kind: "summative", released: null };
  const [appeal] = await ctx.db.select().from(appeals).where(eq(appeals.decisionId, d.id));
  const closesAt = new Date(d.releasedAt.getTime() + APPEAL_WINDOW_DAYS * 86_400_000);
  return {
    ...base,
    kind: "summative",
    released: {
      decisionId: d.id,
      outcome: d.outcome,
      feedback: d.feedback,
      releasedAt: d.releasedAt,
      appeal: appeal
        ? { state: "submitted", status: appeal.status, outcomeNotes: appeal.outcomeNotes }
        : ctx.now() <= closesAt
          ? { state: "can_appeal", closesAt }
          : { state: "closed" },
    },
  };
}

/** Graded paper with answers (used only after submission, when allowed). */
async function resultItems(ctx: Db, attemptId: string): Promise<ResultItem[]> {
  const items = await ctx.db
    .select({
      position: attemptItems.position,
      versionId: attemptItems.questionVersionId,
      order: attemptItems.servedOptionOrder,
      response: attemptItems.responseOptionIds,
      responseText: attemptItems.responseText,
      isCorrect: attemptItems.isCorrect,
      stem: questionVersions.stem,
      type: questionVersions.type,
      feedback: questionVersions.feedback,
    })
    .from(attemptItems)
    .innerJoin(questionVersions, eq(questionVersions.id, attemptItems.questionVersionId))
    .where(eq(attemptItems.attemptId, attemptId))
    .orderBy(asc(attemptItems.position));
  const opts = items.length
    ? await ctx.db
        .select()
        .from(answerOptions)
        .where(inArray(answerOptions.questionVersionId, items.map((i) => i.versionId)))
    : [];
  const byId = new Map(opts.map((o) => [o.id, o]));
  return items.map((i) => ({
    position: i.position,
    stem: i.stem,
    type: i.type,
    options: i.order.map((id) => ({
      label: byId.get(id)!.label,
      chosen: (i.response ?? []).includes(id),
      correct: byId.get(id)!.isCorrect,
    })),
    responseText: i.responseText,
    isCorrect: i.isCorrect,
    explanation: i.feedback,
  }));
}

/** Learner appeal against a released decision, within the appeal window. */
export async function submitAppeal(
  ctx: RateCtx,
  actor: AccessContext,
  attemptId: string,
  reason: string,
): Promise<void> {
  await enforceRateLimit(ctx, RATE_LIMITS.appealSubmit, actor.userId);
  const result = await getAttemptResult(ctx, actor, attemptId);
  if (!result || result.kind !== "summative" || !result.released) {
    throw new AssessmentError("not_found", "There is no released result to appeal.");
  }
  if (result.released.appeal.state !== "can_appeal") {
    throw new AssessmentError("appeal_closed", "This result can no longer be appealed.");
  }
  const text = reason.trim();
  if (text.length < 1 || text.length > 4000) {
    throw new AssessmentError("invalid_answer", "Tell us why you're appealing (up to 4000 characters).");
  }
  const a = await ownedAttempt(ctx, actor, attemptId);
  const [row] = await ctx.db
    .insert(appeals)
    .values({ decisionId: result.released.decisionId, enrolmentId: a.enrolmentId, reason: text })
    .onConflictDoNothing()
    .returning({ id: appeals.id });
  if (!row) return;
  await writeAudit(ctx, {
    action: "assessment.appeal.submitted",
    actorId: actor.userId,
    entityType: "appeal",
    entityId: row.id,
    after: { decisionId: result.released.decisionId },
  });
}

/** For the Home card: any open or in-progress assessment in this programme. */
export async function hasOpenAssessment(
  ctx: Ctx,
  actor: AccessContext,
  qualificationId: string,
): Promise<boolean> {
  const list = await listAssessments(ctx, actor, qualificationId);
  return list.some((i) => i.state === "open" || i.state === "in_progress");
}

/** Latest attempts by schedule (used by staff views). */
export async function latestAttemptForSchedule(ctx: Db, scheduleId: string, enrolmentId: string) {
  const [a] = await ctx.db
    .select()
    .from(assessmentAttempts)
    .where(
      and(
        eq(assessmentAttempts.scheduleId, scheduleId),
        eq(assessmentAttempts.enrolmentId, enrolmentId),
      ),
    )
    .orderBy(desc(assessmentAttempts.attemptNo))
    .limit(1);
  return a ?? null;
}
