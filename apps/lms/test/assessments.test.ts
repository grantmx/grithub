import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { answerOptions, assessmentAttempts, attemptItems, enrolments, questionVersions } from "db";
import {
  AssessmentError,
  beginAttempt,
  getAttemptResult,
  getAttemptView,
  getStartInfo,
  listAssessments,
  saveAnswer,
  setFlag,
  submitAttempt,
  type AttemptView,
} from "@/lib/server/assessments";
import { RateLimitError } from "@/lib/server/ratelimit";
import { setAttendance, setIdVerified, unlockPaper } from "@/lib/server/register";
import { makeAssessmentWorld } from "./assessmentWorld";
import { actorFor, auditActions, createTestDb, makeCtx, type TestDb } from "./helpers";

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
});
afterAll(async () => {
  await t?.teardown();
});

const writing = (v: AttemptView) => {
  if (v.state !== "writing") throw new Error("expected a paper being written");
  return v;
};

async function paperSignature(attemptId: string) {
  const rows = await t.db
    .select({ position: attemptItems.position, versionId: attemptItems.questionVersionId, order: attemptItems.servedOptionOrder })
    .from(attemptItems)
    .where(eq(attemptItems.attemptId, attemptId))
    .orderBy(attemptItems.position);
  return rows.map((r) => `${r.versionId}:${r.order.join(",")}`).join("|");
}

/** All option ids and correct-option labels for an attempt (to check nothing leaks). */
async function secretsOf(attemptId: string) {
  const rows = await t.db
    .select({ id: answerOptions.id, label: answerOptions.label, isCorrect: answerOptions.isCorrect, feedback: questionVersions.feedback })
    .from(attemptItems)
    .innerJoin(answerOptions, eq(answerOptions.questionVersionId, attemptItems.questionVersionId))
    .innerJoin(questionVersions, eq(questionVersions.id, attemptItems.questionVersionId))
    .where(eq(attemptItems.attemptId, attemptId));
  return {
    optionIds: rows.map((r) => r.id),
    explanations: rows.map((r) => r.feedback).filter((f): f is string => Boolean(f)),
  };
}

describe("formative attempts", () => {
  it("draws a paper once: refresh and resume show the same paper", async () => {
    const w = await makeAssessmentWorld(t.db, { kind: "formative" });
    const ctx = makeCtx(t.db);
    const user = await w.learner();
    const { actor } = await actorFor(ctx, user.id);
    const id = await beginAttempt(ctx, actor, w.schedule.id);
    const before = await paperSignature(id);
    // Begin again (second tab / refresh) returns the same attempt, no re-draw.
    expect(await beginAttempt(ctx, actor, w.schedule.id)).toBe(id);
    expect(await paperSignature(id)).toBe(before);
    const v1 = writing(await getAttemptView(ctx, actor, id, 2));
    const v2 = writing(await getAttemptView(ctx, actor, id, 2));
    expect(v1.question).toEqual(v2.question);
    expect(v1.nav).toHaveLength(6); // 3 components × 2
    expect(await auditActions(t.db, user.id)).toContain("assessment.attempt.started");
  });

  it("gives different learners different papers with equal coverage", async () => {
    const w = await makeAssessmentWorld(t.db, { kind: "formative", bankSize: 8 });
    const ctx = makeCtx(t.db);
    const sigs = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const { actor } = await actorFor(ctx, (await w.learner()).id);
      const id = await beginAttempt(ctx, actor, w.schedule.id);
      sigs.add(await paperSignature(id));
      const items = await t.db
        .select({ versionId: attemptItems.questionVersionId })
        .from(attemptItems)
        .where(eq(attemptItems.attemptId, id));
      expect(items).toHaveLength(6);
    }
    expect(sigs.size).toBe(6);
  });

  it("never sends option ids, correctness or explanations while writing", async () => {
    const w = await makeAssessmentWorld(t.db, { kind: "formative" });
    const ctx = makeCtx(t.db);
    const { actor } = await actorFor(ctx, (await w.learner()).id);
    const id = await beginAttempt(ctx, actor, w.schedule.id);
    const secrets = await secretsOf(id);
    for (let p = 1; p <= 6; p++) {
      const view = writing(await getAttemptView(ctx, actor, id, p));
      await saveAnswer(ctx, actor, id, p, { tokens: [view.question.options[0]!.token] });
      const json = JSON.stringify(await getAttemptView(ctx, actor, id, p));
      for (const optionId of secrets.optionIds) expect(json).not.toContain(optionId);
      for (const e of secrets.explanations) expect(json).not.toContain(e);
      expect(json).not.toMatch(/isCorrect|"correct"|feedback|seed/i);
    }
    const start = JSON.stringify(await getStartInfo(ctx, actor, w.schedule.id));
    for (const optionId of secrets.optionIds) expect(start).not.toContain(optionId);
  });

  it("autosaves answers and flags, then grades on the server", async () => {
    const w = await makeAssessmentWorld(t.db, { kind: "formative" });
    const ctx = makeCtx(t.db);
    const { actor } = await actorFor(ctx, (await w.learner()).id);
    const id = await beginAttempt(ctx, actor, w.schedule.id);
    // Answer every question correctly by finding the "Right" label's token.
    for (let p = 1; p <= 6; p++) {
      const v = writing(await getAttemptView(ctx, actor, id, p));
      const right = v.question.options.find((o) => o.label.startsWith("Right"))!;
      await saveAnswer(ctx, actor, id, p, { tokens: [right.token] });
    }
    await setFlag(ctx, actor, id, 3, true);
    const v = writing(await getAttemptView(ctx, actor, id, 3));
    expect(v.question.flagged).toBe(true);
    expect(v.nav.every((n) => n.answered)).toBe(true);
    // A forged token is rejected.
    await expect(saveAnswer(ctx, actor, id, 1, { tokens: ["not-a-token"] })).rejects.toBeInstanceOf(AssessmentError);
    for (const inherited of ["__proto__", "constructor", "toString"]) {
      await expect(saveAnswer(ctx, actor, id, 1, { tokens: [inherited] })).rejects.toBeInstanceOf(AssessmentError);
    }
    // Single-answer questions take one answer only.
    await expect(
      saveAnswer(ctx, actor, id, 1, { tokens: v.question.options.slice(0, 2).map((o) => o.token) }),
    ).rejects.toBeInstanceOf(AssessmentError);

    await submitAttempt(ctx, actor, id);
    const [a] = await t.db.select().from(assessmentAttempts).where(eq(assessmentAttempts.id, id));
    expect(a!.status).toBe("graded");
    expect(a!.scoreRaw).toBe(6);
    expect(a!.scoreMax).toBe(6);
    // Answers are frozen after submission.
    await expect(saveAnswer(ctx, actor, id, 1, { tokens: [] })).rejects.toMatchObject({ code: "submitted" });
    // Formative result shows answers and explanations (blueprint default).
    const result = await getAttemptResult(ctx, actor, id);
    expect(result?.kind).toBe("formative");
    if (result?.kind === "formative") {
      expect(result.score).toEqual({ raw: 6, max: 6 });
      expect(result.items).toHaveLength(6);
      expect(result.items!.every((i) => i.options.some((o) => o.correct && o.chosen))).toBe(true);
      expect(result.items![0]!.explanation).toMatch(/Explanation/);
    }
  });

  it("hides answers in results when the blueprint doesn't show them", async () => {
    const w = await makeAssessmentWorld(t.db, { kind: "formative", showAnswers: false });
    const ctx = makeCtx(t.db);
    const { actor } = await actorFor(ctx, (await w.learner()).id);
    const id = await beginAttempt(ctx, actor, w.schedule.id);
    await submitAttempt(ctx, actor, id);
    const result = await getAttemptResult(ctx, actor, id);
    expect(result?.kind === "formative" && result.items).toBeNull();
    const json = JSON.stringify(result);
    for (const optionId of (await secretsOf(id)).optionIds) expect(json).not.toContain(optionId);
  });

  it("auto-submits at the time limit with the saved answers (server-enforced)", async () => {
    const w = await makeAssessmentWorld(t.db, { kind: "formative", timeLimitMinutes: 10 });
    let now = new Date();
    const ctx = makeCtx(t.db, { now: () => now });
    const { actor } = await actorFor(ctx, (await w.learner()).id);
    const id = await beginAttempt(ctx, actor, w.schedule.id);
    const v = writing(await getAttemptView(ctx, actor, id, 1));
    await saveAnswer(ctx, actor, id, 1, { tokens: [v.question.options.find((o) => o.label.startsWith("Right"))!.token] });
    now = new Date(now.getTime() + 11 * 60_000);
    await expect(saveAnswer(ctx, actor, id, 2, { tokens: [] })).rejects.toMatchObject({ code: "time_up" });
    const [a] = await t.db.select().from(assessmentAttempts).where(eq(assessmentAttempts.id, id));
    expect(a!.status).toBe("graded");
    expect(a!.autoSubmitted).toBe(true);
    expect(a!.scoreRaw).toBe(1);
    expect(a!.submittedAt!.getTime()).toBe(a!.deadlineAt!.getTime());
    expect((await getAttemptView(ctx, actor, id, 1)).state).toBe("submitted");
  });

  it("allows retries up to the limit, preferring unseen questions", async () => {
    const w = await makeAssessmentWorld(t.db, { kind: "formative", bankSize: 4, maxAttempts: 2 });
    const ctx = makeCtx(t.db);
    const { actor } = await actorFor(ctx, (await w.learner()).id);
    const first = await beginAttempt(ctx, actor, w.schedule.id);
    await submitAttempt(ctx, actor, first);
    const second = await beginAttempt(ctx, actor, w.schedule.id);
    expect(second).not.toBe(first);
    const qs = async (id: string) =>
      (
        await t.db
          .select({ q: questionVersions.questionId })
          .from(attemptItems)
          .innerJoin(questionVersions, eq(questionVersions.id, attemptItems.questionVersionId))
          .where(eq(attemptItems.attemptId, id))
      ).map((r) => r.q);
    const a = new Set(await qs(first));
    expect((await qs(second)).filter((q) => a.has(q))).toHaveLength(0);
    await submitAttempt(ctx, actor, second);
    await expect(beginAttempt(ctx, actor, w.schedule.id)).rejects.toMatchObject({ code: "no_attempts_left" });
    const list = await listAssessments(ctx, actor, w.qualificationId);
    expect(list[0]).toMatchObject({ state: "done", attemptsUsed: 2, attemptsAllowed: 2 });
  });

  it("refuses to start outside the window, or for another learner's attempt", async () => {
    const w = await makeAssessmentWorld(t.db, { kind: "formative", opensInMs: 3_600_000, closesInMs: 7_200_000 });
    const ctx = makeCtx(t.db);
    const { actor } = await actorFor(ctx, (await w.learner()).id);
    await expect(beginAttempt(ctx, actor, w.schedule.id)).rejects.toMatchObject({ code: "not_open" });
    const list = await listAssessments(ctx, actor, w.qualificationId);
    expect(list[0]!.state).toBe("upcoming");

    const open = await makeAssessmentWorld(t.db, { kind: "formative" });
    const { actor: owner } = await actorFor(ctx, (await open.learner()).id);
    const id = await beginAttempt(ctx, owner, open.schedule.id);
    const { actor: other } = await actorFor(ctx, (await open.learner()).id);
    await expect(getAttemptView(ctx, other, id, 1)).rejects.toMatchObject({ code: "not_found" });
    await expect(saveAnswer(ctx, other, id, 1, { tokens: [] })).rejects.toMatchObject({ code: "not_found" });
  });

  it("rate limits answer saves", async () => {
    const w = await makeAssessmentWorld(t.db, { kind: "formative" });
    const ctx = makeCtx(t.db);
    const user = await w.learner();
    const { actor } = await actorFor(ctx, user.id);
    const id = await beginAttempt(ctx, actor, w.schedule.id);
    let error: unknown;
    try {
      for (let i = 0; i < 1000; i++) await saveAnswer(ctx, actor, id, 1, { tokens: [] });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(RateLimitError);
  });
});

describe("summative attempts", () => {
  it("cannot be started until the assessor opens the paper", async () => {
    const w = await makeAssessmentWorld(t.db, { kind: "summative" });
    const ctx = makeCtx(t.db);
    const { actor } = await actorFor(ctx, (await w.learner()).id);
    await expect(beginAttempt(ctx, actor, w.schedule.id)).rejects.toMatchObject({ code: "needs_unlock" });
    const [info] = await listAssessments(ctx, actor, w.qualificationId);
    expect(info!.state).toBe("awaiting_unlock");
  });

  it("serves short answers and never reveals a summative key after submission", async () => {
    const w = await makeAssessmentWorld(t.db, { kind: "summative", shortAnswers: 1 });
    const ctx = makeCtx(t.db);
    const user = await w.learner();
    const { actor } = await actorFor(ctx, user.id);
    const assessor = await w.staff("assessor");
    const { actor: staff } = await actorFor(ctx, assessor.id);
    const enrolmentId = await enrolmentOf(user.id);
    await setAttendance(ctx, staff, w.dayId!, enrolmentId, "present");
    await setIdVerified(ctx, staff, w.dayId!, enrolmentId, true);
    await unlockPaper(ctx, staff, w.schedule.id, enrolmentId);
    const id = await beginAttempt(ctx, actor, w.schedule.id);
    const view = writing(await getAttemptView(ctx, actor, id, 1));
    expect(view.nav).toHaveLength(7); // 3 × 2 + 1 short answer
    const shortPos = await t.db
      .select({ position: attemptItems.position })
      .from(attemptItems)
      .innerJoin(questionVersions, eq(questionVersions.id, attemptItems.questionVersionId))
      .where(and(eq(attemptItems.attemptId, id), eq(questionVersions.type, "short_answer")));
    const sa = writing(await getAttemptView(ctx, actor, id, shortPos[0]!.position));
    expect(sa.question.type).toBe("short_answer");
    expect(sa.question.options).toEqual([]);
    expect(JSON.stringify(sa)).not.toMatch(/Names the parts|Explains why/); // rubric stays server-side
    await saveAnswer(ctx, actor, id, sa.question.position, { text: "The CPU, memory and storage (fake)." });
    await submitAttempt(ctx, actor, id);
    const [a] = await t.db.select().from(assessmentAttempts).where(eq(assessmentAttempts.id, id));
    expect(a!.status).toBe("submitted"); // waits for the assessor
    const result = await getAttemptResult(ctx, actor, id);
    expect(result).toMatchObject({ kind: "summative", released: null });
    const json = JSON.stringify(result);
    for (const optionId of (await secretsOf(id)).optionIds) expect(json).not.toContain(optionId);
  });
});

async function enrolmentOf(userId: string) {
  const [e] = await t.db.select({ id: enrolments.id }).from(enrolments).where(eq(enrolments.userId, userId));
  return e!.id;
}
