import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import {
  answerOptions,
  assessmentAttempts,
  attemptItems,
  enrolments,
  modules,
  questions,
  questionVersions,
  sectionPoolQuestions,
  sectionQuestionPools,
  sections,
} from "db";
import type { AccessContext } from "@/lib/access";
import {
  orderOptions,
  pickQuestion,
  rngFromSeed,
  seedFor,
} from "@/lib/randomization";
import type { ServerCtx } from "./context";
import { LearningError, requireEnrolment } from "./learning";

/**
 * Section check (randomization.md §1, design.md): ONE multiple-choice question
 * per section, drawn from the section's pool with a seeded draw and seeded
 * option order (seed = learner id : section id : attempt number). What was
 * served is stored in attempt_items; a reload always shows the stored question.
 * Grading is server-side; the learner payload carries only opaque per-attempt
 * option tokens, never option ids, correctness or the explanation, until the
 * answer is submitted. Up to 3 attempts (first + 2 retries), a fresh question
 * each time, preferring questions the learner hasn't seen.
 */
export const SECTION_CHECK_MAX_ATTEMPTS = 3;

export type CheckOption = { token: string; label: string };

/** What the browser may receive. Keep this free of answers until graded. */
export type CheckView =
  | { state: "none" }
  | {
      state: "question";
      attemptId: string;
      attemptNo: number;
      maxAttempts: number;
      stem: string;
      options: CheckOption[];
    }
  | {
      state: "result";
      attemptId: string;
      attemptNo: number;
      maxAttempts: number;
      stem: string;
      options: CheckOption[];
      correct: boolean;
      chosenToken: string | null;
      correctToken: string | null;
      explanation: string | null;
      canRetry: boolean;
    };

type Enrolment = { enrolmentId: string; userId: string };

async function enrolmentFor(
  ctx: Pick<ServerCtx, "db">,
  actor: AccessContext,
  sectionId: string,
): Promise<Enrolment> {
  const [row] = await ctx.db
    .select({ qualificationId: modules.qualificationId })
    .from(sections)
    .innerJoin(modules, eq(modules.id, sections.moduleId))
    .where(eq(sections.id, sectionId));
  if (!row) throw new LearningError("not_found", "Section not found.");
  const { enrolmentId } = await requireEnrolment(
    ctx,
    actor,
    row.qualificationId,
  );
  return { enrolmentId, userId: actor.userId };
}

async function latestAttempt(
  ctx: Pick<ServerCtx, "db">,
  enrolmentId: string,
  sectionId: string,
) {
  const [a] = await ctx.db
    .select()
    .from(assessmentAttempts)
    .where(
      and(
        eq(assessmentAttempts.enrolmentId, enrolmentId),
        eq(assessmentAttempts.sectionId, sectionId),
      ),
    )
    .orderBy(desc(assessmentAttempts.attemptNo))
    .limit(1);
  return a ?? null;
}

/** Active, single-answer questions in the section's pool, with their current version. */
async function poolQuestions(ctx: Pick<ServerCtx, "db">, sectionId: string) {
  return ctx.db
    .select({ questionId: questions.id, versionId: questions.currentVersionId })
    .from(sectionQuestionPools)
    .innerJoin(
      sectionPoolQuestions,
      eq(sectionPoolQuestions.poolId, sectionQuestionPools.id),
    )
    .innerJoin(questions, eq(questions.id, sectionPoolQuestions.questionId))
    .innerJoin(
      questionVersions,
      eq(questionVersions.id, questions.currentVersionId),
    )
    .where(
      and(
        eq(sectionQuestionPools.sectionId, sectionId),
        eq(questions.status, "active"),
        isNotNull(questions.currentVersionId),
        eq(questionVersions.type, "single"),
      ),
    );
}

/** Question ids this learner has been served in this section → latest attempt number. */
async function lastSeenMap(
  ctx: Pick<ServerCtx, "db">,
  enrolmentId: string,
  sectionId: string,
) {
  const rows = await ctx.db
    .select({
      questionId: questionVersions.questionId,
      attemptNo: assessmentAttempts.attemptNo,
    })
    .from(attemptItems)
    .innerJoin(
      assessmentAttempts,
      eq(assessmentAttempts.id, attemptItems.attemptId),
    )
    .innerJoin(
      questionVersions,
      eq(questionVersions.id, attemptItems.questionVersionId),
    )
    .where(
      and(
        eq(assessmentAttempts.enrolmentId, enrolmentId),
        eq(assessmentAttempts.sectionId, sectionId),
      ),
    );
  const map = new Map<string, number>();
  for (const r of rows)
    map.set(r.questionId, Math.max(map.get(r.questionId) ?? 0, r.attemptNo));
  return map;
}

/** Create attempt N with a seeded draw and seeded option order, stored in attempt_items. */
async function startAttempt(
  ctx: Pick<ServerCtx, "db" | "now">,
  e: Enrolment,
  sectionId: string,
  attemptNo: number,
): Promise<string | null> {
  const pool = await poolQuestions(ctx, sectionId);
  if (pool.length === 0) return null;

  const seed = seedFor(e.userId, sectionId, attemptNo);
  const rng = rngFromSeed(seed);
  const { questionId } = pickQuestion(
    pool.map((p) => p.questionId),
    await lastSeenMap(ctx, e.enrolmentId, sectionId),
    rng,
  );
  const versionId = pool.find((p) => p.questionId === questionId)!.versionId!;
  const opts = await ctx.db
    .select({
      id: answerOptions.id,
      pinnedPosition: answerOptions.pinnedPosition,
      authorOrder: answerOptions.authorOrder,
    })
    .from(answerOptions)
    .where(eq(answerOptions.questionVersionId, versionId));
  const ordered = orderOptions(opts, rng);
  const tokens: Record<string, string> = {};
  for (const o of ordered) tokens[randomBytes(9).toString("base64url")] = o.id;

  try {
    return await ctx.db.transaction(async (tx) => {
      const [attempt] = await tx
        .insert(assessmentAttempts)
        .values({
          enrolmentId: e.enrolmentId,
          sectionId,
          attemptNo,
          status: "in_progress",
          startedAt: ctx.now(),
        })
        .returning({ id: assessmentAttempts.id });
      // Inserting the item stamps question_versions.first_served_at (immutable from now on).
      await tx.insert(attemptItems).values({
        attemptId: attempt!.id,
        questionVersionId: versionId,
        position: 1,
        servedOptionOrder: ordered.map((o) => o.id),
        optionTokens: tokens,
        seed,
      });
      return attempt!.id;
    });
  } catch (err) {
    // Two tabs racing to create the same attempt: the other one won; use it.
    if ((err as { cause?: { code?: string } }).cause?.code === "23505") {
      return (await latestAttempt(ctx, e.enrolmentId, sectionId))?.id ?? null;
    }
    throw err;
  }
}

async function buildView(
  ctx: Pick<ServerCtx, "db">,
  attemptId: string,
): Promise<CheckView> {
  const [row] = await ctx.db
    .select({
      attemptNo: assessmentAttempts.attemptNo,
      status: assessmentAttempts.status,
      stem: questionVersions.stem,
      feedback: questionVersions.feedback,
      versionId: questionVersions.id,
      servedOptionOrder: attemptItems.servedOptionOrder,
      optionTokens: attemptItems.optionTokens,
      responseOptionIds: attemptItems.responseOptionIds,
      isCorrect: attemptItems.isCorrect,
    })
    .from(assessmentAttempts)
    .innerJoin(attemptItems, eq(attemptItems.attemptId, assessmentAttempts.id))
    .innerJoin(
      questionVersions,
      eq(questionVersions.id, attemptItems.questionVersionId),
    )
    .where(eq(assessmentAttempts.id, attemptId));
  if (!row) throw new LearningError("not_found", "Check not found.");

  const opts = await ctx.db
    .select({
      id: answerOptions.id,
      label: answerOptions.label,
      isCorrect: answerOptions.isCorrect,
    })
    .from(answerOptions)
    .where(eq(answerOptions.questionVersionId, row.versionId))
    .orderBy(asc(answerOptions.authorOrder));
  const byId = new Map(opts.map((o) => [o.id, o]));
  const tokenFor = new Map(
    Object.entries(row.optionTokens).map(([token, id]) => [id, token]),
  );
  // Options in exactly the stored (served) order, identified only by token.
  const options: CheckOption[] = row.servedOptionOrder.map((id) => ({
    token: tokenFor.get(id)!,
    label: byId.get(id)!.label,
  }));

  if (row.status !== "graded") {
    return {
      state: "question",
      attemptId,
      attemptNo: row.attemptNo,
      maxAttempts: SECTION_CHECK_MAX_ATTEMPTS,
      stem: row.stem,
      options,
    };
  }
  const chosenId = row.responseOptionIds?.[0] ?? null;
  const correctId = opts.find((o) => o.isCorrect)?.id ?? null;
  return {
    state: "result",
    attemptId,
    attemptNo: row.attemptNo,
    maxAttempts: SECTION_CHECK_MAX_ATTEMPTS,
    stem: row.stem,
    options,
    correct: row.isCorrect === true,
    chosenToken: chosenId ? (tokenFor.get(chosenId) ?? null) : null,
    correctToken: correctId ? (tokenFor.get(correctId) ?? null) : null,
    explanation: row.feedback,
    canRetry:
      row.isCorrect !== true && row.attemptNo < SECTION_CHECK_MAX_ATTEMPTS,
  };
}

/**
 * The check for a section as the learner should see it now. Starts attempt 1
 * on first view; an unanswered attempt is shown again unchanged on reload.
 */
export async function getCheckView(
  ctx: Pick<ServerCtx, "db" | "now">,
  actor: AccessContext,
  sectionId: string,
): Promise<CheckView> {
  const e = await enrolmentFor(ctx, actor, sectionId);
  const latest = await latestAttempt(ctx, e.enrolmentId, sectionId);
  const attemptId = latest
    ? latest.id
    : await startAttempt(ctx, e, sectionId, 1);
  return attemptId ? buildView(ctx, attemptId) : { state: "none" };
}

/** Grade the learner's answer on the server and reveal the result. */
export async function submitCheckAnswer(
  ctx: Pick<ServerCtx, "db" | "now">,
  actor: AccessContext,
  attemptId: string,
  token: string,
): Promise<CheckView> {
  const [row] = await ctx.db
    .select({
      sectionId: assessmentAttempts.sectionId,
      status: assessmentAttempts.status,
      userId: enrolments.userId,
      itemId: attemptItems.id,
      versionId: attemptItems.questionVersionId,
      optionTokens: attemptItems.optionTokens,
    })
    .from(assessmentAttempts)
    .innerJoin(enrolments, eq(enrolments.id, assessmentAttempts.enrolmentId))
    .innerJoin(attemptItems, eq(attemptItems.attemptId, assessmentAttempts.id))
    .where(eq(assessmentAttempts.id, attemptId));
  if (!row || !row.sectionId || row.userId !== actor.userId) {
    throw new LearningError("not_found", "Check not found.");
  }
  if (row.status !== "in_progress") return buildView(ctx, attemptId); // already answered: idempotent

  const optionId = row.optionTokens[token];
  if (!optionId)
    throw new LearningError("not_found", "Choose one of the answers.");
  const [opt] = await ctx.db
    .select({ isCorrect: answerOptions.isCorrect })
    .from(answerOptions)
    .where(
      and(
        eq(answerOptions.id, optionId),
        eq(answerOptions.questionVersionId, row.versionId),
      ),
    );
  if (!opt) throw new LearningError("not_found", "Choose one of the answers.");

  const now = ctx.now();
  await ctx.db.transaction(async (tx) => {
    await tx
      .update(attemptItems)
      .set({
        responseOptionIds: [optionId],
        isCorrect: opt.isCorrect,
        answeredAt: now,
      })
      .where(eq(attemptItems.id, row.itemId));
    await tx
      .update(assessmentAttempts)
      .set({
        status: "graded",
        submittedAt: now,
        scoreRaw: opt.isCorrect ? 1 : 0,
        scoreMax: 1,
      })
      .where(
        and(
          eq(assessmentAttempts.id, attemptId),
          eq(assessmentAttempts.status, "in_progress"),
        ),
      );
  });
  return buildView(ctx, attemptId);
}

/** "Try another question": next attempt, unseen question preferred (max 3 attempts). */
export async function retryCheck(
  ctx: Pick<ServerCtx, "db" | "now">,
  actor: AccessContext,
  sectionId: string,
): Promise<CheckView> {
  const e = await enrolmentFor(ctx, actor, sectionId);
  const latest = await latestAttempt(ctx, e.enrolmentId, sectionId);
  if (!latest) return getCheckView(ctx, actor, sectionId);
  const view = await buildView(ctx, latest.id);
  if (view.state !== "result" || !view.canRetry) return view;
  const attemptId = await startAttempt(ctx, e, sectionId, latest.attemptNo + 1);
  return attemptId ? buildView(ctx, attemptId) : view;
}
