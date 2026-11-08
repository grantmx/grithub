import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assessmentAttempts, assessmentDecisions, attemptItems, enrolments, questionVersions, questions } from "db";
import { coverageReport, questionAnalytics } from "@/lib/server/analytics";
import {
  beginAttempt,
  getAttemptResult,
  getAttemptView,
  saveAnswer,
  submitAppeal,
  submitAttempt,
} from "@/lib/server/assessments";
import { AccessDeniedError } from "@/lib/server/auth";
import {
  addRule,
  createBlueprint,
  createQuestionVersion,
  createSchedule,
  publishBlueprint,
  retireQuestion,
  validateBlueprint,
} from "@/lib/server/authoring";
import { getMarkingView, getReplay, markingQueue, recordDecision, saveDecisionDraft, saveItemMarks } from "@/lib/server/marking";
import { closeBatch, decideAppeal, getBatch, listAppeals, moderateDecision } from "@/lib/server/moderation";
import { exportPaperPdf } from "@/lib/server/paperExport";
import {
  addExtraTime,
  getRegister,
  setAttendance,
  setIdVerified,
  setPaused,
  signOffRegister,
  unlockPaper,
} from "@/lib/server/register";
import { makeAssessmentWorld } from "./assessmentWorld";
import { actorFor, auditActions, createTestDb, makeCtx, makeUser, type TestDb } from "./helpers";

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
});
afterAll(async () => {
  await t?.teardown();
});

async function enrolmentOf(userId: string) {
  const [e] = await t.db.select({ id: enrolments.id }).from(enrolments).where(eq(enrolments.userId, userId));
  return e!.id;
}

/** A summative world with one learner who has written and submitted a paper. */
async function writtenPaper(opts: { shortAnswers?: number } = { shortAnswers: 1 }) {
  const w = await makeAssessmentWorld(t.db, { kind: "summative", shortAnswers: opts.shortAnswers });
  const ctx = makeCtx(t.db);
  const learnerUser = await w.learner();
  const { actor: learner } = await actorFor(ctx, learnerUser.id);
  const assessorUser = await w.staff("assessor");
  const { actor: assessor } = await actorFor(ctx, assessorUser.id);
  const moderatorUser = await w.staff("moderator");
  const { actor: moderator } = await actorFor(ctx, moderatorUser.id);
  const enrolmentId = await enrolmentOf(learnerUser.id);

  const sit = async () => {
    await unlockPaper(ctx, assessor, w.schedule.id, enrolmentId);
    const id = await beginAttempt(ctx, learner, w.schedule.id);
    const view = await getAttemptView(ctx, learner, id, 1);
    if (view.state !== "writing") throw new Error("expected writing");
    for (const n of view.nav) {
      const v = await getAttemptView(ctx, learner, id, n.position);
      if (v.state !== "writing") continue;
      if (v.question.type === "short_answer") await saveAnswer(ctx, learner, id, n.position, { text: "An answer (fake)." });
      else await saveAnswer(ctx, learner, id, n.position, { tokens: [v.question.options.find((o) => o.label.startsWith("Right"))!.token] });
    }
    await submitAttempt(ctx, learner, id);
    return id;
  };
  await setAttendance(ctx, assessor, w.dayId!, enrolmentId, "present");
  await setIdVerified(ctx, assessor, w.dayId!, enrolmentId, true);
  const attemptId = await sit();
  return { w, ctx, learner, learnerUser, assessor, assessorUser, moderator, moderatorUser, enrolmentId, attemptId, sit };
}

async function markAll(ctx: ReturnType<typeof makeCtx>, assessor: Awaited<ReturnType<typeof actorFor>>["actor"], attemptId: string) {
  const view = await getMarkingView(ctx, assessor, attemptId);
  for (const it of view.items.filter((i) => i.type === "short_answer")) {
    await saveItemMarks(ctx, assessor, attemptId, it.position, Object.fromEntries(it.criteria.map((c) => [c.id, c.maxMarks])), "Good (fake)");
  }
}

describe("assessment-day register", () => {
  it("needs present + ID before an assessor can open the paper; facilitators can't open papers", async () => {
    const w = await makeAssessmentWorld(t.db, { kind: "summative" });
    const ctx = makeCtx(t.db);
    const user = await w.learner();
    const enrolmentId = await enrolmentOf(user.id);
    const { actor: assessor } = await actorFor(ctx, (await w.staff("assessor")).id);
    const { actor: facilitator } = await actorFor(ctx, (await w.staff("facilitator")).id);

    await expect(unlockPaper(ctx, assessor, w.schedule.id, enrolmentId)).rejects.toMatchObject({ code: "needs_unlock" });
    await setAttendance(ctx, facilitator, w.dayId!, enrolmentId, "present");
    await expect(unlockPaper(ctx, assessor, w.schedule.id, enrolmentId)).rejects.toMatchObject({ code: "needs_unlock" });
    await setIdVerified(ctx, facilitator, w.dayId!, enrolmentId, true);
    await expect(unlockPaper(ctx, facilitator, w.schedule.id, enrolmentId)).rejects.toBeInstanceOf(AccessDeniedError);
    await unlockPaper(ctx, assessor, w.schedule.id, enrolmentId);

    const reg = await getRegister(ctx, facilitator, w.dayId!);
    expect(reg.rows).toHaveLength(1);
    expect(reg.rows[0]).toMatchObject({ status: "present", idVerified: true });
    expect(reg.rows[0]!.papers[0]!.state).toBe("unlocked");
  });

  it("lets the assessor pause, resume and extend; the register locks at sign-off", async () => {
    const w = await makeAssessmentWorld(t.db, { kind: "summative", timeLimitMinutes: 20 });
    let now = new Date();
    const ctx = makeCtx(t.db, { now: () => now });
    const user = await w.learner();
    const { actor: learner } = await actorFor(ctx, user.id);
    const enrolmentId = await enrolmentOf(user.id);
    const assessorUser = await w.staff("assessor");
    const { actor: assessor } = await actorFor(ctx, assessorUser.id);
    await setAttendance(ctx, assessor, w.dayId!, enrolmentId, "present");
    await setIdVerified(ctx, assessor, w.dayId!, enrolmentId, true);
    await unlockPaper(ctx, assessor, w.schedule.id, enrolmentId);
    const id = await beginAttempt(ctx, learner, w.schedule.id);
    const deadline = async () => (await t.db.select().from(assessmentAttempts).where(eq(assessmentAttempts.id, id)))[0]!;
    const start = (await deadline()).deadlineAt!.getTime();

    await setPaused(ctx, assessor, id, true);
    await expect(saveAnswer(ctx, learner, id, 1, { tokens: [] })).rejects.toMatchObject({ code: "paused" });
    now = new Date(now.getTime() + 5 * 60_000); // 5 min power cut
    await setPaused(ctx, assessor, id, false);
    expect((await deadline()).deadlineAt!.getTime()).toBe(start + 5 * 60_000);
    await addExtraTime(ctx, assessor, id, 10);
    expect((await deadline()).deadlineAt!.getTime()).toBe(start + 15 * 60_000);
    expect((await deadline()).extraMinutes).toBe(10);

    await submitAttempt(ctx, learner, id);
    await signOffRegister(ctx, assessor, w.dayId!);
    await expect(setAttendance(ctx, assessor, w.dayId!, enrolmentId, "absent")).rejects.toThrow();
    const actions = await auditActions(t.db, assessorUser.id);
    expect(actions).toEqual(
      expect.arrayContaining([
        "assessment.paper.unlocked",
        "assessment.attempt.paused",
        "assessment.attempt.resumed",
        "assessment.attempt.extra_time",
        "assessment.register.signed_off",
      ]),
    );
  });

  it("keeps staff to their own cohorts", async () => {
    const w = await makeAssessmentWorld(t.db, { kind: "summative" });
    const other = await makeAssessmentWorld(t.db, { kind: "summative" });
    const ctx = makeCtx(t.db);
    const { actor: assessor } = await actorFor(ctx, (await other.staff("assessor")).id);
    await expect(getRegister(ctx, assessor, w.dayId!)).rejects.toBeInstanceOf(AccessDeniedError);
  });
});

describe("marking and decisions", () => {
  it("queues the paper, marks short answers per rubric, and suggests from the pass mark", async () => {
    const { ctx, assessor, attemptId } = await writtenPaper();
    const queue = await markingQueue(ctx, assessor);
    expect(queue.find((q) => q.attemptId === attemptId)).toMatchObject({ status: "needs_marking", toMark: 1 });

    const view = await getMarkingView(ctx, assessor, attemptId);
    expect(view.canDecide).toBe(false);
    expect(view.blockedReason).toBe("marking");
    await expect(recordDecision(ctx, assessor, attemptId, "competent", "Fine")).rejects.toMatchObject({ code: "invalid_answer" });

    const sa = view.items.find((i) => i.type === "short_answer")!;
    await expect(
      saveItemMarks(ctx, assessor, attemptId, sa.position, { [sa.criteria[0]!.id]: 9 }, ""),
    ).rejects.toMatchObject({ code: "invalid_answer" });
    await markAll(ctx, assessor, attemptId);
    const marked = await getMarkingView(ctx, assessor, attemptId);
    expect(marked.score).toMatchObject({ raw: 11, max: 11, allMarked: true, suggested: "competent" });
    expect(marked.canDecide).toBe(true);
    const [a] = await t.db.select().from(assessmentAttempts).where(eq(assessmentAttempts.id, attemptId));
    expect(a!.status).toBe("graded");
  });

  it("records a final decision; a change is a new version; marks then lock", async () => {
    const { ctx, assessor, attemptId, assessorUser } = await writtenPaper();
    await markAll(ctx, assessor, attemptId);
    await saveDecisionDraft(ctx, assessor, attemptId, "competent", "Draft (fake)");
    expect((await markingQueue(ctx, assessor)).find((q) => q.attemptId === attemptId)!.status).toBe("draft");
    const first = await recordDecision(ctx, assessor, attemptId, "competent", "Well done (fake)");
    const second = await recordDecision(ctx, assessor, attemptId, "not_yet_competent", "Revised (fake)");
    const rows = await t.db.select().from(assessmentDecisions).where(eq(assessmentDecisions.attemptId, attemptId));
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.id === second)!.supersedesId).toBe(first);
    // The first decision itself never changed.
    expect(rows.find((r) => r.id === first)!.outcome).toBe("competent");
    const view = await getMarkingView(ctx, assessor, attemptId);
    const sa = view.items.find((i) => i.type === "short_answer")!;
    await expect(saveItemMarks(ctx, assessor, attemptId, sa.position, { [sa.criteria[0]!.id]: 0 }, "")).rejects.toMatchObject({
      code: "submitted",
    });
    expect(await auditActions(t.db, assessorUser.id)).toEqual(expect.arrayContaining(["assessment.marks.saved", "assessment.decision.recorded"]));
  });

  it("releases results only when the moderator closes the sample", async () => {
    const { ctx, assessor, moderator, learner, attemptId } = await writtenPaper();
    await markAll(ctx, assessor, attemptId);
    const decisionId = await recordDecision(ctx, assessor, attemptId, "not_yet_competent", "Revise section 2 (fake)");
    expect(await getAttemptResult(ctx, learner, attemptId)).toMatchObject({ released: null });

    const [d] = await t.db.select().from(assessmentDecisions).where(eq(assessmentDecisions.id, decisionId));
    const batch = await getBatch(ctx, moderator, d!.batchId);
    expect(batch.learnersToNotify).toBe(1);
    await moderateDecision(ctx, moderator, decisionId, "upheld", "Agree (fake)");
    expect(await closeBatch(ctx, moderator, d!.batchId)).toBe(1);

    const result = await getAttemptResult(ctx, learner, attemptId);
    expect(result).toMatchObject({ kind: "summative", released: { outcome: "not_yet_competent", feedback: "Revise section 2 (fake)" } });
    // Released: further decisions go through appeal, not the assessor.
    await expect(recordDecision(ctx, assessor, attemptId, "competent", "x")).rejects.toMatchObject({ code: "submitted" });
  });

  it("lets a learner reassess after a released Not yet competent (one extra attempt)", async () => {
    const { ctx, assessor, moderator, learner, attemptId, sit, w } = await writtenPaper({ shortAnswers: 0 });
    await recordDecision(ctx, assessor, attemptId, "not_yet_competent", "Try again (fake)");
    const [d] = await t.db.select().from(assessmentDecisions).where(eq(assessmentDecisions.attemptId, attemptId));
    await closeBatch(ctx, moderator, d!.batchId);
    const second = await sit();
    const [a2] = await t.db.select().from(assessmentAttempts).where(eq(assessmentAttempts.id, second));
    expect(a2!.attemptNo).toBe(2);
    // Default 1 + 1 reassessment: no third attempt.
    await recordDecision(ctx, assessor, second, "not_yet_competent", "Again (fake)");
    const [d2] = await t.db.select().from(assessmentDecisions).where(eq(assessmentDecisions.attemptId, second));
    await closeBatch(ctx, moderator, d2!.batchId);
    const enrolmentId = await enrolmentOf((await getReplay(ctx, assessor, second)).learner.id);
    await expect(unlockPaper(ctx, assessor, w.schedule.id, enrolmentId)).rejects.toMatchObject({ code: "no_attempts_left" });
    void learner;
  });
});

describe("appeals", () => {
  it("are decided by a moderator; reassessment adds an attempt marked by a different assessor", async () => {
    const env = await writtenPaper({ shortAnswers: 0 });
    const { ctx, assessor, moderator, learner, attemptId, w } = env;
    await recordDecision(ctx, assessor, attemptId, "not_yet_competent", "Not yet (fake)");
    const [d] = await t.db.select().from(assessmentDecisions).where(eq(assessmentDecisions.attemptId, attemptId));
    await closeBatch(ctx, moderator, d!.batchId);

    await submitAppeal(ctx, learner, attemptId, "I believe question 3 was marked wrongly (fake).");
    const result = await getAttemptResult(ctx, learner, attemptId);
    expect(result).toMatchObject({ released: { appeal: { state: "submitted", status: "open" } } });
    await expect(submitAppeal(ctx, learner, attemptId, "Again")).rejects.toMatchObject({ code: "appeal_closed" });

    const [appeal] = await listAppeals(ctx, moderator);
    await decideAppeal(ctx, moderator, appeal!.id, "reassess", "Reassess with another assessor (fake).");
    await expect(decideAppeal(ctx, moderator, appeal!.id, "upheld", "x")).rejects.toMatchObject({ code: "submitted" });

    // The learner sits again (1 + 1 + 1 granted by appeal is not needed here: attempt 2 is the reassessment).
    const second = await env.sit();
    await expect(recordDecision(ctx, assessor, second, "competent", "x")).rejects.toMatchObject({ code: "invalid_answer" });
    const { actor: other } = await actorFor(ctx, (await w.staff("assessor")).id);
    await recordDecision(ctx, other, second, "competent", "Competent on reassessment (fake)");
  });

  it("close after the appeal window", async () => {
    const env = await writtenPaper({ shortAnswers: 0 });
    const { assessor, moderator, attemptId, learnerUser } = env;
    await recordDecision(env.ctx, assessor, attemptId, "competent", "Fine (fake)");
    const [d] = await t.db.select().from(assessmentDecisions).where(eq(assessmentDecisions.attemptId, attemptId));
    await closeBatch(env.ctx, moderator, d!.batchId);
    const later = makeCtx(t.db, { now: () => new Date(Date.now() + 8 * 86_400_000) });
    const { actor } = await actorFor(later, learnerUser.id);
    await expect(submitAppeal(later, actor, attemptId, "Too late (fake)")).rejects.toMatchObject({ code: "appeal_closed" });
  });
});

describe("replay and PDF", () => {
  it("replays the exact served order with keys, for assessors/moderators/evaluators only", async () => {
    const { ctx, assessor, moderator, attemptId, w } = await writtenPaper();
    const replay = await getReplay(ctx, assessor, attemptId);
    const items = await t.db.select().from(attemptItems).where(eq(attemptItems.attemptId, attemptId)).orderBy(attemptItems.position);
    expect(replay.items.map((i) => i.versionId)).toEqual(items.map((i) => i.questionVersionId));
    expect(replay.items.filter((i) => i.type !== "short_answer").every((i) => i.options.some((o) => o.correct))).toBe(true);
    await getReplay(ctx, moderator, attemptId);
    const { actor: evaluator } = await actorFor(ctx, (await w.staff("external_evaluator")).id);
    await getReplay(ctx, evaluator, attemptId);
    const { actor: facilitator } = await actorFor(ctx, (await w.staff("facilitator")).id);
    await expect(getReplay(ctx, facilitator, attemptId)).rejects.toBeInstanceOf(AccessDeniedError);
    const { actor: admin } = await actorFor(ctx, (await w.staff("sdp_admin")).id);
    await expect(getReplay(ctx, admin, attemptId)).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it("exports a deterministic PDF and audits its checksum", async () => {
    const { ctx, assessor, assessorUser, attemptId } = await writtenPaper();
    const a = await exportPaperPdf(ctx, assessor, attemptId);
    const b = await exportPaperPdf(ctx, assessor, attemptId);
    expect(Buffer.from(a.bytes.slice(0, 5)).toString()).toBe("%PDF-");
    expect(a.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(b.sha256).toBe(a.sha256);
    expect(a.filename).toMatch(/attempt-1-[0-9a-f]{8}\.pdf$/);
    expect(await auditActions(t.db, assessorUser.id)).toContain("assessment.paper.exported");
  });
});

describe("analytics, retiring and new versions", () => {
  it("reports per-question statistics and lets an assessor retire or version a question", async () => {
    const w = await makeAssessmentWorld(t.db, { kind: "formative", bankSize: 2, rules: 1, perRule: 2 });
    const ctx = makeCtx(t.db);
    for (let i = 0; i < 4; i++) {
      const { actor } = await actorFor(ctx, (await w.learner()).id);
      const id = await beginAttempt(ctx, actor, w.schedule.id);
      for (const p of [1, 2]) {
        const v = await getAttemptView(ctx, actor, id, p);
        if (v.state === "writing") await saveAnswer(ctx, actor, id, p, { tokens: [v.question.options.find((o) => o.label.startsWith(i < 3 ? "Right" : "Wrong A"))!.token] });
      }
      await submitAttempt(ctx, actor, id);
    }
    const { actor: assessor } = await actorFor(ctx, (await w.staff("assessor")).id);
    const rows = await questionAnalytics(ctx, assessor, w.blueprint.id);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ responses: 4, correctRate: 0.75, flags: [] }); // below 20 responses: no flags
    expect(rows[0]!.options.find((o) => o.isCorrect)!.count).toBe(3);

    const qid = rows[0]!.questionId;
    await retireQuestion(ctx, assessor, qid);
    const [retired] = await t.db.select().from(questions).where(eq(questions.id, qid));
    expect(retired!.status).toBe("retired");
    const { warnings } = await createQuestionVersion(ctx, assessor, qid, {
      stem: "A clearer question (fake)?",
      feedback: "Why (fake)",
      options: [
        { label: "Right", correct: true, pinned: null },
        { label: "Wrong", correct: false, pinned: null },
        { label: "None of the above", correct: false, pinned: null },
      ],
      criteria: [],
    });
    expect(warnings[0]).toMatch(/Pin "None of the above"/);
    const [q] = await t.db.select().from(questions).where(eq(questions.id, qid));
    const [v] = await t.db.select().from(questionVersions).where(eq(questionVersions.id, q!.currentVersionId!));
    expect(v!.versionNo).toBe(2);
    expect(q!.status).toBe("active");
    // Served version 1 is untouched (immutable) and still in the history.
    const versions = await t.db.select().from(questionVersions).where(eq(questionVersions.questionId, qid));
    expect(versions.find((x) => x.versionNo === 1)!.firstServedAt).not.toBeNull();
  });

  it("checks blueprints at publish and reports coverage across a cohort's papers", async () => {
    const w = await makeAssessmentWorld(t.db, { kind: "formative", bankSize: 3, perRule: 2 });
    const ctx = makeCtx(t.db);
    const { actor: admin } = await actorFor(ctx, (await w.staff("sdp_admin")).id);
    const id = await createBlueprint(ctx, admin, { moduleId: w.module.id, title: "New formative (fake)", kind: "formative", passMarkPercent: 50 });
    expect((await validateBlueprint(ctx, id)).errors).toHaveLength(1); // no rules
    await addRule(ctx, admin, id, w.banks[0]!.id, 4); // bank has 3
    expect((await validateBlueprint(ctx, id)).errors[0]).toMatch(/needs 4 active questions/);
    await addRule(ctx, admin, id, w.banks[0]!.id, 2);
    const v = await validateBlueprint(ctx, id);
    expect(v.errors).toEqual([]);
    expect(v.warnings.join(" ")).toMatch(/Not covered by any rule: KM-KT02, KM-KT03/);
    await publishBlueprint(ctx, admin, id);
    await expect(addRule(ctx, admin, id, w.banks[1]!.id, 1)).rejects.toMatchObject({ code: "submitted" });
    await createSchedule(ctx, admin, {
      blueprintId: id,
      cohortId: w.cohort.id,
      opensAt: new Date(Date.now() - 1000),
      closesAt: new Date(Date.now() + 86_400_000),
    });

    for (let i = 0; i < 3; i++) {
      const { actor } = await actorFor(ctx, (await w.learner()).id);
      await beginAttempt(ctx, actor, w.schedule.id);
    }
    const report = await coverageReport(ctx, admin, w.blueprint.id, w.cohort.id);
    expect(report.papers).toBe(3);
    expect(report.allEqual).toBe(true);
    expect(report.rules.every((r) => r.minServed === 2 && r.maxServed === 2)).toBe(true);
    expect(report.uncovered).toEqual([]);
    const { actor: assessor } = await actorFor(ctx, (await w.staff("assessor")).id);
    await expect(coverageReport(ctx, assessor, w.blueprint.id, w.cohort.id)).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it("requires an assessment day for summative schedules", async () => {
    const w = await makeAssessmentWorld(t.db, { kind: "summative" });
    const ctx = makeCtx(t.db);
    const admin = await makeUser(t.db, { roles: ["sdp_admin"], passkeys: 1 });
    const { actor } = await actorFor(ctx, admin.id);
    await expect(
      createSchedule(ctx, actor, { blueprintId: w.blueprint.id, cohortId: w.cohort.id, opensAt: new Date(), closesAt: new Date(Date.now() + 3600_000) }),
    ).rejects.toMatchObject({ code: "invalid_answer" });
    await createSchedule(ctx, actor, {
      blueprintId: w.blueprint.id,
      cohortId: w.cohort.id,
      opensAt: new Date(),
      closesAt: new Date(Date.now() + 3600_000),
      newDay: { heldOn: "2031-03-01", venue: "Reassessment venue (fake)" },
    });
  });
});
