import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  answerOptions,
  assessmentDecisions,
  attemptItems,
  criterionJudgements,
  enrolments,
  evidenceItems,
  questions,
  questionVersions,
  sectionPoolQuestions,
  sectionQuestionPools,
  sections,
  submissions,
} from "db";
import type { AccessContext } from "@/lib/access";
import { minimumSample } from "@/lib/moderation";
import { beginAttempt, getAttemptResult, getAttemptView, saveAnswer, submitAttempt } from "@/lib/server/assessments";
import { AccessDeniedError } from "@/lib/server/auth";
import { createQuestionVersion, getQuestionForEdit, retireQuestion } from "@/lib/server/authoring";
import { memoryOutbox } from "@/lib/server/email";
import { putTestObject } from "@/lib/server/evidenceStore";
import { getReplay, markingQueue, recordDecision, saveDecisionDraft, saveItemMarks } from "@/lib/server/marking";
import { getBankMaterials, getFormativeMaterials, getSectionCheckMaterials, listMaterials } from "@/lib/server/materials";
import {
  closeBatch,
  completeActions,
  getBatch,
  getModerationItem,
  listBatches,
  markFeedbackSeen,
  moderateDecision,
  moderationFeedback,
  setSample,
  unseenFeedbackCount,
} from "@/lib/server/moderation";
import { exportModerationReport } from "@/lib/server/moderationExport";
import { setModerationRate } from "@/lib/server/onboarding";
import { addLink, confirmUpload, getBriefPage, submitPractical, uploadPrefix } from "@/lib/server/practical";
import { getSubmissionView, recordPracticalDecision, savePracticalDraft, saveJudgements } from "@/lib/server/practicalMarking";
import { setAttendance, setIdVerified, unlockPaper } from "@/lib/server/register";
import { makeAssessmentWorld } from "./assessmentWorld";
import { makePracticalWorld } from "./practicalWorld";
import { actorFor, auditActions, createTestDb, makeCtx, type TestDb } from "./helpers";

let t: TestDb;
beforeAll(async () => {
  process.env.EVIDENCE_STORE = "memory";
  t = await createTestDb();
});
afterAll(async () => {
  delete process.env.EVIDENCE_STORE;
  await t?.teardown();
});
beforeEach(() => {
  memoryOutbox.length = 0;
});

/** A summative world where `n` learners have each written a paper and the (only) assessor decided it. */
async function decidedBatch(n: number, outcomes: ("competent" | "not_yet_competent")[] = []) {
  const w = await makeAssessmentWorld(t.db, { kind: "summative", shortAnswers: 1 });
  const ctx = makeCtx(t.db);
  const { actor: assessor } = await actorFor(ctx, (await w.staff("assessor")).id);
  const moderatorUser = await w.staff("moderator");
  const { actor: moderator } = await actorFor(ctx, moderatorUser.id);
  const { actor: admin } = await actorFor(ctx, (await w.staff("sdp_admin")).id);
  const learners: { actor: AccessContext; attemptId: string; decisionId: string; name: string }[] = [];
  for (let i = 0; i < n; i++) {
    const user = await w.learner();
    const { actor } = await actorFor(ctx, user.id);
    const [e] = await t.db.select({ id: enrolments.id }).from(enrolments).where(eq(enrolments.userId, user.id));
    await setAttendance(ctx, assessor, w.dayId!, e!.id, "present");
    await setIdVerified(ctx, assessor, w.dayId!, e!.id, true);
    await unlockPaper(ctx, assessor, w.schedule.id, e!.id);
    const attemptId = await beginAttempt(ctx, actor, w.schedule.id);
    const first = await getAttemptView(ctx, actor, attemptId, 1);
    if (first.state !== "writing") throw new Error("expected writing");
    for (const nav of first.nav) {
      const v = await getAttemptView(ctx, actor, attemptId, nav.position);
      if (v.state !== "writing") continue;
      if (v.question.type === "short_answer") await saveAnswer(ctx, actor, attemptId, nav.position, { text: "An answer (fake)." });
      else await saveAnswer(ctx, actor, attemptId, nav.position, { tokens: [v.question.options[0]!.token] });
    }
    await submitAttempt(ctx, actor, attemptId);
    const replay = await getReplay(ctx, assessor, attemptId);
    for (const item of replay.items.filter((x) => x.type === "short_answer")) {
      await saveItemMarks(ctx, assessor, attemptId, item.position, Object.fromEntries(item.criteria.map((c) => [c.id, 1])), "");
    }
    const decisionId = await recordDecision(ctx, assessor, attemptId, outcomes[i] ?? "competent", `Feedback ${i} (fake)`);
    learners.push({ actor, attemptId, decisionId, name: replay.learner.name });
  }
  const [d] = await t.db.select().from(assessmentDecisions).where(eq(assessmentDecisions.id, learners[0]!.decisionId));
  return { w, ctx, assessor, moderator, moderatorUser, admin, learners, batchId: d!.batchId };
}

describe("sampling (design.md §14, 2026-11-08)", () => {
  it("uses the cohort's rate set by the admin, rounded up; the moderator picks the sample", async () => {
    expect(minimumSample(25, 4)).toBe(1);
    expect(minimumSample(25, 5)).toBe(2);
    expect(minimumSample(30, 10)).toBe(3);
    expect(minimumSample(100, 3)).toBe(3);

    const b = await decidedBatch(4);
    let batch = await getBatch(b.ctx, b.moderator, b.batchId);
    expect(batch.summary).toMatchObject({ rate: 25, decided: 4, minimum: 1, sampled: 0, canClose: false });

    await expect(setModerationRate(b.ctx, b.moderator, b.w.cohort.id, 10)).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(setModerationRate(b.ctx, b.admin, b.w.cohort.id, 0)).rejects.toThrow(/1 to 100/);
    await setModerationRate(b.ctx, b.admin, b.w.cohort.id, 50);
    batch = await getBatch(b.ctx, b.moderator, b.batchId);
    expect(batch.summary.minimum).toBe(2);
    expect((await listBatches(b.ctx, b.moderator)).find((x) => x.id === b.batchId)).toMatchObject({ minimum: 2, sampled: 0, rate: 50 });

    const [l1, l2] = b.learners;
    expect(await setSample(b.ctx, b.moderator, b.batchId, [l1!.attemptId])).toEqual({ added: 1, removed: 0 });
    await moderateDecision(b.ctx, b.moderator, l1!.decisionId, "agree", "Marking is consistent (fake).");
    await expect(closeBatch(b.ctx, b.moderator, b.batchId)).rejects.toThrow(/Add 1 more learner/);
    // Moderated work stays in the sample.
    await expect(setSample(b.ctx, b.moderator, b.batchId, [l2!.attemptId])).rejects.toThrow(/stays in the sample/);
    await setSample(b.ctx, b.moderator, b.batchId, [l1!.attemptId, l2!.attemptId]);
    await expect(closeBatch(b.ctx, b.moderator, b.batchId)).rejects.toThrow(/not checked yet/);
    await expect(moderateDecision(b.ctx, b.moderator, b.learners[2]!.decisionId, "agree", "x")).rejects.toThrow(/sample first/);
    await moderateDecision(b.ctx, b.moderator, l2!.decisionId, "agree", "Fine (fake).");
    expect(await closeBatch(b.ctx, b.moderator, b.batchId)).toBe(4);
    // Unsampled work is released with the batch.
    expect(await getAttemptResult(b.ctx, b.learners[3]!.actor, b.learners[3]!.attemptId)).toMatchObject({ released: { outcome: "competent" } });
    await expect(setSample(b.ctx, b.moderator, b.batchId, [])).rejects.toThrow(/closed/);
    expect(await auditActions(t.db, b.moderator.userId)).toEqual(
      expect.arrayContaining(["assessment.moderation.sample_changed", "assessment.moderation.recorded", "assessment.batch.closed"]),
    );
  });
});

describe("verdicts", () => {
  it("validates Agree / Agree with actions / Disagree", async () => {
    const b = await decidedBatch(1);
    const [l] = b.learners;
    await setSample(b.ctx, b.moderator, b.batchId, [l!.attemptId]);
    await expect(moderateDecision(b.ctx, b.moderator, l!.decisionId, "upheld", "x")).rejects.toThrow(/Choose Agree/);
    await expect(moderateDecision(b.ctx, b.moderator, l!.decisionId, "agree", "  ")).rejects.toThrow(/comments/);
    await expect(moderateDecision(b.ctx, b.moderator, l!.decisionId, "agree_with_actions", "x", "")).rejects.toThrow(/actions the assessor/);
    await expect(moderateDecision(b.ctx, b.moderator, l!.decisionId, "agree", "x", "Do this")).rejects.toThrow(/Agree with actions/);
    // The assessor can't moderate (wrong role), and the moderator verdict is once per decision.
    await expect(moderateDecision(b.ctx, b.assessor, l!.decisionId, "agree", "x")).rejects.toBeInstanceOf(AccessDeniedError);
    await moderateDecision(b.ctx, b.moderator, l!.decisionId, "agree", "Fine (fake).");
    await expect(moderateDecision(b.ctx, b.moderator, l!.decisionId, "agree", "Again")).rejects.toThrow(/already moderated/);
  });

  it("Disagree sends it back: the assessor re-decides and the moderator checks again before release", async () => {
    const b = await decidedBatch(1, ["competent"]);
    const [l] = b.learners;
    await setSample(b.ctx, b.moderator, b.batchId, [l!.attemptId]);
    await moderateDecision(b.ctx, b.moderator, l!.decisionId, "disagree", "Q7 is not explained (fake).", "Re-mark Q7 against criterion 2.");
    expect((await getBatch(b.ctx, b.moderator, b.batchId)).rows[0]!.state).toBe("disagreed");
    expect((await markingQueue(b.ctx, b.assessor)).find((q) => q.attemptId === l!.attemptId)!.status).toBe("referred_back");
    await expect(closeBatch(b.ctx, b.moderator, b.batchId)).rejects.toThrow(/re-decide/);
    // Email: link only, no learner name or comments.
    expect(memoryOutbox).toHaveLength(1);
    expect(memoryOutbox[0]!.link).toMatch(/\/staff\/moderation-feedback$/);
    expect(memoryOutbox[0]!.text).not.toContain(l!.name);
    expect(memoryOutbox[0]!.text).not.toContain("Q7");

    const v2 = await recordDecision(b.ctx, b.assessor, l!.attemptId, "not_yet_competent", "Q7 needs the why (fake).");
    let item = await getModerationItem(b.ctx, b.moderator, b.batchId, l!.attemptId);
    expect(item.row).toMatchObject({ state: "recheck" });
    expect(item.row.versions.map((v) => v.moderation?.verdict ?? null)).toEqual(["disagree", null]);
    expect(item.canModerate).toBe(true);
    // The old version can't be moderated any more.
    await expect(moderateDecision(b.ctx, b.moderator, l!.decisionId, "agree", "x")).rejects.toThrow(/latest decision/);
    await moderateDecision(b.ctx, b.moderator, v2, "agree", "Now consistent (fake).");
    item = await getModerationItem(b.ctx, b.moderator, b.batchId, l!.attemptId);
    expect(item.row.state).toBe("agreed");
    await closeBatch(b.ctx, b.moderator, b.batchId);
    expect(await getAttemptResult(b.ctx, l!.actor, l!.attemptId)).toMatchObject({ released: { outcome: "not_yet_competent" } });
  });

  it("Agree with actions waits for the assessor's Actions done", async () => {
    const b = await decidedBatch(1);
    const [l] = b.learners;
    await setSample(b.ctx, b.moderator, b.batchId, [l!.attemptId]);
    await moderateDecision(b.ctx, b.moderator, l!.decisionId, "agree_with_actions", "Correct decision (fake).", "Add feedback on Q7 (fake).");
    expect((await markingQueue(b.ctx, b.assessor)).find((q) => q.attemptId === l!.attemptId)!.status).toBe("actions_due");
    await expect(closeBatch(b.ctx, b.moderator, b.batchId)).rejects.toThrow(/required actions/);

    // Assessor: badge, feedback list, then Actions done.
    expect(await unseenFeedbackCount(b.ctx, b.assessor.userId)).toBe(1);
    const [fb] = await moderationFeedback(b.ctx, b.assessor);
    expect(fb).toMatchObject({ verdict: "agree_with_actions", todo: "actions", unseen: true, requiredActions: "Add feedback on Q7 (fake)." });
    await markFeedbackSeen(b.ctx, b.assessor);
    expect(await unseenFeedbackCount(b.ctx, b.assessor.userId)).toBe(0);
    await expect(completeActions(b.ctx, b.moderator, fb!.id, "Done")).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(completeActions(b.ctx, b.assessor, fb!.id, " ")).rejects.toThrow(/what you did/);
    await completeActions(b.ctx, b.assessor, fb!.id, "Feedback expanded (fake).");
    await expect(completeActions(b.ctx, b.assessor, fb!.id, "Again")).rejects.toThrow(/already/);
    expect((await moderationFeedback(b.ctx, b.assessor))[0]!.todo).toBeNull();
    expect((await getBatch(b.ctx, b.moderator, b.batchId)).rows[0]!.state).toBe("actions_done");
    expect(await closeBatch(b.ctx, b.moderator, b.batchId)).toBe(1);
    expect(await auditActions(t.db, b.assessor.userId)).toContain("assessment.moderation.actions_done");
  });
});

describe("S7 moderation view", () => {
  it("shows the exact paper and option order the learner was served, and moves through the sample", async () => {
    const b = await decidedBatch(3);
    const ids = b.learners.map((l) => l.attemptId);
    await setSample(b.ctx, b.moderator, b.batchId, ids);
    const batch = await getBatch(b.ctx, b.moderator, b.batchId);
    const order = batch.rows.map((r) => r.targetId);
    const mid = await getModerationItem(b.ctx, b.moderator, b.batchId, order[1]!);
    expect(mid.position).toEqual({ index: 2, of: 3 });
    expect([mid.prevId, mid.nextId]).toEqual([order[0], order[2]]);

    const replay = await getReplay(b.ctx, b.moderator, order[1]!);
    const served = await t.db.select().from(attemptItems).where(eq(attemptItems.attemptId, order[1]!));
    const options = await t.db.select().from(answerOptions);
    for (const item of replay.items) {
      const row = served.find((s) => s.position === item.position)!;
      // The exact version served, and its options in the exact order the learner saw them.
      expect(item.versionId).toBe(row.questionVersionId);
      expect(item.options.map((o) => o.label)).toEqual(row.servedOptionOrder.map((id) => options.find((o) => o.id === id)!.label));
      expect(item.options.filter((o) => o.chosen).length).toBe((row.responseOptionIds ?? []).length);
    }
  });

  it("refuses moderators of other cohorts, and the decision's own assessor never moderates it", async () => {
    const b = await decidedBatch(1);
    const other = await makeAssessmentWorld(t.db, { kind: "summative" });
    const { actor: outsider } = await actorFor(b.ctx, (await other.staff("moderator")).id);
    await expect(getBatch(b.ctx, outsider, b.batchId)).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(getModerationItem(b.ctx, outsider, b.batchId, b.learners[0]!.attemptId)).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(setSample(b.ctx, outsider, b.batchId, [b.learners[0]!.attemptId])).rejects.toBeInstanceOf(AccessDeniedError);
  });
});

describe("moderation report", () => {
  it("exports PDF and CSV per batch with verdicts and actions, audited, deterministic once closed", async () => {
    const b = await decidedBatch(2, ["not_yet_competent", "competent"]);
    const [l1, l2] = b.learners;
    await setSample(b.ctx, b.moderator, b.batchId, [l1!.attemptId, l2!.attemptId]);
    await moderateDecision(b.ctx, b.moderator, l1!.decisionId, "disagree", "Score supports Competent (fake).");
    const v2 = await recordDecision(b.ctx, b.assessor, l1!.attemptId, "competent", "Competent after review (fake).");
    await moderateDecision(b.ctx, b.moderator, v2, "agree", "Agree now (fake).");
    await moderateDecision(b.ctx, b.moderator, l2!.decisionId, "agree_with_actions", "Fine (fake).", "=Expand feedback (fake).");
    const [fb] = (await moderationFeedback(b.ctx, b.assessor)).filter((f) => f.todo === "actions");
    await completeActions(b.ctx, b.assessor, fb!.id, "Expanded (fake).");
    await closeBatch(b.ctx, b.moderator, b.batchId);

    const csv = await exportModerationReport(b.ctx, b.moderator, b.batchId, "csv");
    const text = new TextDecoder().decode(csv.bytes);
    expect(text.split("\r\n").filter(Boolean)).toHaveLength(1 + 3); // header + 2 versions + 1
    expect(text).toContain('"Disagree"');
    expect(text).toContain('"Agree with actions"');
    expect(text).toContain(`"'=Expand feedback (fake)."`); // formula neutralised
    expect(text).toContain('"Expanded (fake)."');

    const pdf1 = await exportModerationReport(b.ctx, b.moderator, b.batchId, "pdf");
    const pdf2 = await exportModerationReport(b.ctx, b.moderator, b.batchId, "pdf");
    expect(new TextDecoder().decode(pdf1.bytes.slice(0, 5))).toBe("%PDF-");
    expect(pdf1.sha256).toBe(pdf2.sha256);
    expect(await auditActions(t.db, b.moderator.userId)).toContain("assessment.moderation.report_exported");
    await expect(exportModerationReport(b.ctx, b.assessor, b.batchId, "csv")).rejects.toBeInstanceOf(AccessDeniedError);
  });
});

describe("assessment materials (Form 5 4.2.5)", () => {
  it("lets a moderator browse banks, versions with keys, formatives with learner attempts and section checks, read-only", async () => {
    const w = await makeAssessmentWorld(t.db, { kind: "formative", rules: 1, bankSize: 3, perRule: 2 });
    const ctx = makeCtx(t.db);
    const { actor: moderator } = await actorFor(ctx, (await w.staff("moderator")).id);
    const { actor: learner } = await actorFor(ctx, (await w.learner()).id);
    const attemptId = await beginAttempt(ctx, learner, w.schedule.id);
    await submitAttempt(ctx, learner, attemptId);
    // A section check pool.
    const [section] = await t.db.select().from(sections).where(eq(sections.moduleId, w.module.id));
    const [pool] = await t.db.insert(sectionQuestionPools).values({ sectionId: section!.id, minPoolSize: 1 }).returning();
    await t.db.insert(sectionPoolQuestions).values({ poolId: pool!.id, questionId: w.banks[0]!.questionIds[0]! });

    const mods = await listMaterials(ctx, moderator);
    const mod = mods.find((m) => m.id === w.module.id)!;
    expect(mod.banks).toHaveLength(1);
    expect(mod.formatives.map((f) => f.id)).toEqual([w.blueprint.id]);
    expect(mod.checks.map((c) => c.sectionId)).toEqual([section!.id]);

    const bank = await getBankMaterials(ctx, moderator, w.banks[0]!.id);
    expect(bank.questions).toHaveLength(3);
    const v = bank.questions[0]!.versions[0]!;
    expect(v.options.filter((o) => o.correct)).toHaveLength(1);
    expect(v.explanation).toMatch(/Explanation/);

    const formative = await getFormativeMaterials(ctx, moderator, w.blueprint.id);
    expect(formative.rules).toHaveLength(1);
    expect(formative.attempts.map((a) => a.id)).toEqual([attemptId]);
    expect((await getReplay(ctx, moderator, attemptId)).items).toHaveLength(2);

    expect((await getSectionCheckMaterials(ctx, moderator, section!.id)).questions).toHaveLength(1);

    // Scope: another cohort's moderator, and assessors (not this screen) are refused.
    const other = await makeAssessmentWorld(t.db, { kind: "formative" });
    const { actor: outsider } = await actorFor(ctx, (await other.staff("moderator")).id);
    await expect(getBankMaterials(ctx, outsider, w.banks[0]!.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(getFormativeMaterials(ctx, outsider, w.blueprint.id)).rejects.toMatchObject({ code: "not_found" });
    const { actor: assessor } = await actorFor(ctx, (await w.staff("assessor")).id);
    await expect(listMaterials(ctx, assessor)).rejects.toBeInstanceOf(AccessDeniedError);
  });
});

describe("a moderator can never edit learner work, decisions or question versions", () => {
  async function snapshot(attemptIds: string[], questionIds: string[]) {
    const items = await t.db.select().from(attemptItems).where(inArray(attemptItems.attemptId, attemptIds));
    const decisions = await t.db.select().from(assessmentDecisions).where(inArray(assessmentDecisions.attemptId, attemptIds));
    const qs = await t.db.select().from(questions).where(inArray(questions.id, questionIds));
    const versions = await t.db.select().from(questionVersions).where(inArray(questionVersions.questionId, questionIds));
    return {
      items: items.sort((a, b) => a.id.localeCompare(b.id)),
      // released_at is set by closing the batch; everything else stays as the assessor recorded it.
      decisions: decisions.map((d) => ({ ...d, releasedAt: null })).sort((a, b) => a.id.localeCompare(b.id)),
      questions: qs.sort((a, b) => a.id.localeCompare(b.id)),
      versions: versions.sort((a, b) => a.id.localeCompare(b.id)),
    };
  }

  it("knowledge: no marks, drafts, decisions or answers; moderating and releasing leave the work and decisions unchanged", async () => {
    const b = await decidedBatch(2);
    const [l1, l2] = b.learners;
    const replay = await getReplay(b.ctx, b.moderator, l1!.attemptId);
    const qIds = replay.items.map((i) => i.questionId);
    const before = await snapshot([l1!.attemptId, l2!.attemptId], qIds);
    const m = b.moderator;
    const short = replay.items.find((i) => i.type === "short_answer")!;

    await expect(saveItemMarks(b.ctx, m, l1!.attemptId, short.position, { [short.criteria[0]!.id]: 0 }, "")).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(saveDecisionDraft(b.ctx, m, l1!.attemptId, "not_yet_competent", "x")).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(recordDecision(b.ctx, m, l1!.attemptId, "not_yet_competent", "x")).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(saveAnswer(b.ctx, m, l1!.attemptId, 1, { text: "changed" })).rejects.toThrow();
    await expect(submitAttempt(b.ctx, m, l1!.attemptId)).rejects.toThrow();
    await expect(getAttemptResult(b.ctx, m, l1!.attemptId)).rejects.toThrow();

    await expect(retireQuestion(b.ctx, m, qIds[0]!)).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(getQuestionForEdit(b.ctx, m, qIds[0]!)).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(
      createQuestionVersion(b.ctx, m, qIds[0]!, {
        stem: "Changed (fake)?",
        feedback: "",
        options: [
          { label: "A", correct: true, pinned: null },
          { label: "B", correct: false, pinned: null },
        ],
        criteria: [],
      }),
    ).rejects.toBeInstanceOf(AccessDeniedError);

    // Everything a moderator can do: sample, moderate, export, release.
    await setSample(b.ctx, m, b.batchId, [l1!.attemptId, l2!.attemptId]);
    await moderateDecision(b.ctx, m, l1!.decisionId, "agree", "Fine (fake).");
    await moderateDecision(b.ctx, m, l2!.decisionId, "agree", "Fine (fake).");
    await exportModerationReport(b.ctx, m, b.batchId, "csv");
    await closeBatch(b.ctx, m, b.batchId);

    expect(await snapshot([l1!.attemptId, l2!.attemptId], qIds)).toEqual(before);
  });

  it("practical: no judgements, drafts, decisions, evidence or submissions", async () => {
    const w = await makePracticalWorld(t.db);
    const ctx = makeCtx(t.db);
    const learner = await w.learner();
    const { actor: la } = await actorFor(ctx, learner.user.id);
    const page = await getBriefPage(ctx, la, w.schedule.id);
    const submissionId = page.draft!.submissionId;
    const pathname = `${uploadPrefix(submissionId)}x-photo.png`;
    putTestObject(pathname, new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]), "image/png");
    await confirmUpload(ctx, la, submissionId, pathname, "photo.png");
    await submitPractical(ctx, la, submissionId, false);
    const { actor: assessor } = await actorFor(ctx, (await w.staff("assessor")).id);
    const { actor: m } = await actorFor(ctx, (await w.staff("moderator")).id);
    const all = Object.fromEntries(w.criteria.map((c) => [c.id, { met: true, comment: "" }]));
    await saveJudgements(ctx, assessor, submissionId, all);
    const decisionId = await recordPracticalDecision(ctx, assessor, submissionId, "competent", "Good (fake).");

    const state = async () => ({
      s: await t.db.select().from(submissions).where(eq(submissions.id, submissionId)),
      e: await t.db.select().from(evidenceItems).where(eq(evidenceItems.submissionId, submissionId)),
      j: await t.db.select().from(criterionJudgements).where(eq(criterionJudgements.submissionId, submissionId)),
      d: (await t.db.select().from(assessmentDecisions).where(eq(assessmentDecisions.submissionId, submissionId))).map((d) => ({ ...d, releasedAt: null })),
    });
    const before = await state();

    expect((await getSubmissionView(ctx, m, submissionId)).evidence).toHaveLength(1); // read-only view works
    await expect(saveJudgements(ctx, m, submissionId, all)).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(savePracticalDraft(ctx, m, submissionId, "competent", "x")).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(recordPracticalDecision(ctx, m, submissionId, "not_yet_competent", "x")).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(addLink(ctx, m, submissionId, "https://example.com/x")).rejects.toThrow();
    await expect(confirmUpload(ctx, m, submissionId, pathname, "photo.png")).rejects.toThrow();
    await expect(submitPractical(ctx, m, submissionId, true)).rejects.toThrow();

    const [dec] = await t.db.select().from(assessmentDecisions).where(eq(assessmentDecisions.id, decisionId));
    await setSample(ctx, m, dec!.batchId, [submissionId]);
    await moderateDecision(ctx, m, decisionId, "agree", "Evidence supports it (fake).");
    await closeBatch(ctx, m, dec!.batchId);
    expect(await state()).toEqual(before);
  });
});
