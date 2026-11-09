import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { assessmentDecisions, evidenceItems, submissions } from "db";
import { checkLink, fileProblem, MAX_FILE_BYTES } from "@/lib/evidenceRules";
import { AccessDeniedError } from "@/lib/server/auth";
import { putTestObject, evidenceStore } from "@/lib/server/evidenceStore";
import { closeBatch, decideAppeal, getBatch, listAppeals, moderateDecision, setSample } from "@/lib/server/moderation";
import {
  addLink,
  confirmUpload,
  evidenceUrl,
  getBriefPage,
  listPracticalTasks,
  removeEvidence,
  submitPractical,
  submitPracticalAppeal,
  uploadPolicy,
  uploadPrefix,
} from "@/lib/server/practical";
import {
  getPracticalMarkingView,
  getSubmissionView,
  practicalQueue,
  recordPracticalDecision,
  saveJudgements,
} from "@/lib/server/practicalMarking";
import { setAttendance, setIdVerified, startObservation } from "@/lib/server/register";
import { setVirusScanner } from "@/lib/server/virusScan";
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
afterEach(() => setVirusScanner(null));

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);

/** Simulate a finished direct upload, then confirm it. */
async function upload(
  ctx: ReturnType<typeof makeCtx>,
  actor: Awaited<ReturnType<typeof actorFor>>["actor"],
  submissionId: string,
  name = "photo.png",
  type = "image/png",
  bytes: Uint8Array = PNG,
  prefix = uploadPrefix(submissionId),
) {
  const pathname = `${prefix}${Math.random().toString(36).slice(2)}-${name}`;
  putTestObject(pathname, bytes, type);
  return { pathname, result: confirmUpload(ctx, actor, submissionId, pathname, name) };
}

async function draftFor(w: Awaited<ReturnType<typeof makePracticalWorld>>) {
  const ctx = makeCtx(t.db);
  const l = await w.learner();
  const { actor } = await actorFor(ctx, l.user.id);
  const page = await getBriefPage(ctx, actor, w.schedule.id);
  return { ctx, actor, l, page, submissionId: page.draft!.submissionId };
}

async function submitted(w: Awaited<ReturnType<typeof makePracticalWorld>>) {
  const d = await draftFor(w);
  await (await upload(d.ctx, d.actor, d.submissionId)).result;
  await submitPractical(d.ctx, d.actor, d.submissionId, false);
  return d;
}

describe("evidence rules", () => {
  it("accept only the agreed types up to 20 MB, and allow-listed https links", () => {
    expect(fileProblem("a.pdf", "application/pdf", 1000)).toBeNull();
    expect(fileProblem("a.mp4", "video/mp4", 1000)).toMatch(/link/);
    expect(fileProblem("a.exe", "application/pdf", 1000)).toMatch(/type/);
    expect(fileProblem("a.pdf", "application/pdf", MAX_FILE_BYTES + 1)).toMatch(/20 MB/);
    expect(checkLink("https://youtu.be/abc")).toMatchObject({ ok: true, host: "youtu.be" });
    expect(checkLink("https://contoso.sharepoint.com/x")).toMatchObject({ ok: true });
    expect(checkLink("https://github.com.evil.example/x")).toMatchObject({ ok: false });
    expect(checkLink("http://github.com/x")).toMatchObject({ ok: false });
    expect(checkLink("https://user:pw@github.com/x")).toMatchObject({ ok: false });
    expect(checkLink("not a link")).toMatchObject({ ok: false });
  });
});

describe("variant assignment", () => {
  it("is seeded and stored: the same learner always sees the same variant", async () => {
    const w = await makePracticalWorld(t.db);
    const d = await draftFor(w);
    const again = await getBriefPage(d.ctx, d.actor, w.schedule.id);
    expect(again.draft!.submissionId).toBe(d.submissionId);
    expect(again.variant).toEqual(d.page.variant);
    const [row] = await t.db.select().from(submissions).where(eq(submissions.id, d.submissionId));
    expect(row!.seed).toMatch(/^[0-9a-f]{64}$/);
  });

  it("spreads learners across equivalent variants that share the same criteria", async () => {
    const w = await makePracticalWorld(t.db, { variants: 3 });
    const labels = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const d = await draftFor(w);
      labels.add(d.page.variant!.label);
      expect(d.page.criteria.map((c) => c.code)).toEqual(["AC1", "AC2", "AC3"]);
    }
    expect(labels.size).toBeGreaterThan(1);
  });
});

describe("evidence and submission", () => {
  it("verifies uploads (prefix, type, size), records a checksum and the scan status", async () => {
    const w = await makePracticalWorld(t.db);
    const d = await draftFor(w);
    const ok = await (await upload(d.ctx, d.actor, d.submissionId)).result;
    expect(ok).toMatchObject({ kind: "file", fileName: "photo.png", scanStatus: "not_scanned" });
    const [row] = await t.db.select().from(evidenceItems).where(eq(evidenceItems.id, ok.id));
    expect(row!.checksumSha256).toMatch(/^[0-9a-f]{64}$/);

    const other = await draftFor(w);
    await expect((await upload(d.ctx, d.actor, d.submissionId, "x.png", "image/png", PNG, uploadPrefix(other.submissionId))).result).rejects.toMatchObject({ code: "invalid" });
    const bad = await upload(d.ctx, d.actor, d.submissionId, "clip.mp4", "video/mp4");
    await expect(bad.result).rejects.toMatchObject({ code: "invalid" });
    expect(await evidenceStore().head(bad.pathname)).toBeNull(); // rejected files are removed
    await expect(uploadPolicy(d.ctx, d.actor, d.submissionId, "elsewhere/x.png")).rejects.toMatchObject({ code: "invalid" });
    const policy = await uploadPolicy(d.ctx, d.actor, d.submissionId, `${uploadPrefix(d.submissionId)}a.png`);
    expect(policy.maximumSizeInBytes).toBe(20 * 1024 * 1024);
    expect(await auditActions(t.db, d.l.user.id)).toEqual(expect.arrayContaining(["practical.evidence.added", "practical.evidence.rejected"]));
  });

  it("rejects and removes infected files when a scanner is connected", async () => {
    setVirusScanner({ configured: true, scan: async () => "infected" });
    const w = await makePracticalWorld(t.db);
    const d = await draftFor(w);
    const up = await upload(d.ctx, d.actor, d.submissionId);
    await expect(up.result).rejects.toMatchObject({ code: "invalid" });
    expect(await evidenceStore().head(up.pathname)).toBeNull();
  });

  it("takes allow-listed links, needs the links confirmed, then locks on submit", async () => {
    const w = await makePracticalWorld(t.db);
    const d = await draftFor(w);
    await expect(addLink(d.ctx, d.actor, d.submissionId, "https://example.com/video")).rejects.toMatchObject({ code: "invalid" });
    await addLink(d.ctx, d.actor, d.submissionId, "https://youtu.be/demo-fake");
    await expect(submitPractical(d.ctx, d.actor, d.submissionId, false)).rejects.toMatchObject({ code: "invalid" });
    await submitPractical(d.ctx, d.actor, d.submissionId, true);
    await expect(addLink(d.ctx, d.actor, d.submissionId, "https://youtu.be/more")).rejects.toMatchObject({ code: "submitted" });
    const page = await getBriefPage(d.ctx, d.actor, w.schedule.id);
    expect(page.status).toBe("submitted");
    expect(page.draft).toBeNull(); // no new attempt until the result is released
    const [task] = await listPracticalTasks(d.ctx, d.actor, w.cohort.qualificationId);
    expect(task).toMatchObject({ status: "submitted", attemptsUsed: 1 });
  });

  it("needs at least one item, and lets the learner remove items while draft", async () => {
    const w = await makePracticalWorld(t.db);
    const d = await draftFor(w);
    await expect(submitPractical(d.ctx, d.actor, d.submissionId, false)).rejects.toMatchObject({ code: "invalid" });
    const item = await (await upload(d.ctx, d.actor, d.submissionId)).result;
    await removeEvidence(d.ctx, d.actor, item.id);
    const page = await getBriefPage(d.ctx, d.actor, w.schedule.id);
    expect(page.draft!.evidence).toHaveLength(0);
  });
});

describe("opening evidence", () => {
  it("gives the learner and in-scope assessors a 5-minute signed link; others are refused", async () => {
    const w = await makePracticalWorld(t.db);
    const d = await submitted(w);
    const [item] = await t.db.select().from(evidenceItems).where(eq(evidenceItems.submissionId, d.submissionId));
    expect(await evidenceUrl(d.ctx, d.actor, item!.id)).toMatch(/^https:\/\/memory\.invalid\/.*exp=/);
    const assessorUser = await w.staff("assessor");
    const { actor: assessor } = await actorFor(d.ctx, assessorUser.id);
    await evidenceUrl(d.ctx, assessor, item!.id);
    expect(await auditActions(t.db, assessorUser.id)).toContain("practical.evidence.viewed");
    const { actor: facilitator } = await actorFor(d.ctx, (await w.staff("facilitator")).id);
    await expect(evidenceUrl(d.ctx, facilitator, item!.id)).rejects.toMatchObject({ code: "not_found" });
    const other = await w.learner();
    const { actor: otherLearner } = await actorFor(d.ctx, other.user.id);
    await expect(evidenceUrl(d.ctx, otherLearner, item!.id)).rejects.toMatchObject({ code: "not_found" });
    // With a real scanner connected, unscanned files are hidden from staff.
    setVirusScanner({ configured: true, scan: async () => "clean" });
    await expect(evidenceUrl(d.ctx, assessor, item!.id)).rejects.toMatchObject({ code: "invalid" });
  });
});

describe("marking, moderation and appeals", () => {
  it("judges each criterion, suggests from them, records a final decision; judgements lock", async () => {
    const w = await makePracticalWorld(t.db);
    const d = await submitted(w);
    const assessorUser = await w.staff("assessor");
    const { actor: assessor } = await actorFor(d.ctx, assessorUser.id);
    const queue = await practicalQueue(d.ctx, assessor);
    expect(queue.find((q) => q.submissionId === d.submissionId)).toMatchObject({ status: "needs_marking", toJudge: 3 });
    await expect(recordPracticalDecision(d.ctx, assessor, d.submissionId, "competent", "x")).rejects.toMatchObject({ code: "invalid" });
    const [c1, c2, c3] = w.criteria;
    await saveJudgements(d.ctx, assessor, d.submissionId, {
      [c1!.id]: { met: true, comment: "" },
      [c2!.id]: { met: false, comment: "Not connected (fake)" },
      [c3!.id]: { met: true, comment: "" },
    });
    const view = await getPracticalMarkingView(d.ctx, assessor, d.submissionId);
    expect(view.suggested).toBe("not_yet_competent");
    expect(view.canDecide).toBe(true);
    const first = await recordPracticalDecision(d.ctx, assessor, d.submissionId, "not_yet_competent", "Fix AC2 (fake)");
    const second = await recordPracticalDecision(d.ctx, assessor, d.submissionId, "not_yet_competent", "Fix AC2, then resubmit (fake)");
    const [v2] = await t.db.select().from(assessmentDecisions).where(eq(assessmentDecisions.id, second));
    expect(v2!.supersedesId).toBe(first);
    await expect(saveJudgements(d.ctx, assessor, d.submissionId, { [c2!.id]: { met: true, comment: "" } })).rejects.toMatchObject({ code: "submitted" });
    expect(await auditActions(t.db, assessorUser.id)).toEqual(expect.arrayContaining(["practical.judgements.saved", "practical.decision.recorded"]));
  });

  it("releases on batch close; the learner appeals; reassess gives a new attempt (another variant, same assessor, always sampled)", async () => {
    const w = await makePracticalWorld(t.db, { variants: 2, maxAttempts: 1 });
    const d = await submitted(w);
    const { actor: assessor } = await actorFor(d.ctx, (await w.staff("assessor")).id);
    const { actor: moderator } = await actorFor(d.ctx, (await w.staff("moderator")).id);
    await saveJudgements(d.ctx, assessor, d.submissionId, Object.fromEntries(w.criteria.map((c) => [c.id, { met: false, comment: "" }])));
    const decisionId = await recordPracticalDecision(d.ctx, assessor, d.submissionId, "not_yet_competent", "Not yet (fake)");
    // Moderators see the practical batch and its evidence, read-only.
    const [dec] = await t.db.select().from(assessmentDecisions).where(eq(assessmentDecisions.id, decisionId));
    const batch = await getBatch(d.ctx, moderator, dec!.batchId);
    expect(batch.title).toBe(w.brief.title);
    expect(batch.rows[0]!.targetId).toBe(d.submissionId);
    const replay = await getSubmissionView(d.ctx, moderator, d.submissionId);
    expect(replay.evidence).toHaveLength(1);
    let page = await getBriefPage(d.ctx, d.actor, w.schedule.id);
    expect(page.history[0]!.result).toBeNull(); // not released yet
    await expect(closeBatch(d.ctx, moderator, dec!.batchId)).rejects.toMatchObject({ code: "invalid_answer" });
    await setSample(d.ctx, moderator, dec!.batchId, [d.submissionId]);
    await moderateDecision(d.ctx, moderator, decisionId, "agree", "Evidence supports NYC (fake).");
    await closeBatch(d.ctx, moderator, dec!.batchId);

    page = await getBriefPage(d.ctx, d.actor, w.schedule.id);
    expect(page.history[0]!.result).toMatchObject({ outcome: "not_yet_competent", appeal: { state: "can_appeal" } });
    expect(page.draft).toBeNull(); // max 1 attempt
    await submitPracticalAppeal(d.ctx, d.actor, d.submissionId, "My photo shows AC1 was met (fake).");
    const [appeal] = await listAppeals(d.ctx, moderator);
    expect(appeal!.title).toBe(w.brief.title);
    await decideAppeal(d.ctx, moderator, appeal!.id, "reassess", "Please redo with another assessor (fake).");

    page = await getBriefPage(d.ctx, d.actor, w.schedule.id);
    expect(page.draft!.attemptNo).toBe(2);
    const [s1] = await t.db.select().from(submissions).where(eq(submissions.id, d.submissionId));
    const [s2] = await t.db.select().from(submissions).where(eq(submissions.id, page.draft!.submissionId));
    expect(s2!.briefVariantId).not.toBe(s1!.briefVariantId); // prefers the other variant
    await (await upload(d.ctx, d.actor, s2!.id)).result;
    await submitPractical(d.ctx, d.actor, s2!.id, false);
    await saveJudgements(d.ctx, assessor, s2!.id, Object.fromEntries(w.criteria.map((c) => [c.id, { met: true, comment: "" }])));
    // One assessor per cohort: the same assessor decides the reassessment, which is always in the sample.
    const reDecision = await recordPracticalDecision(d.ctx, assessor, s2!.id, "competent", "Competent on reassessment (fake)");
    const [rd] = await t.db.select().from(assessmentDecisions).where(eq(assessmentDecisions.id, reDecision));
    const reBatch = await getBatch(d.ctx, moderator, rd!.batchId);
    expect(reBatch.rows.find((r) => r.targetId === s2!.id)!.sample).toMatchObject({ reason: "reassessment" });
    await expect(setSample(d.ctx, moderator, rd!.batchId, [])).rejects.toMatchObject({ code: "invalid_answer" });
  });

  it("keeps facilitators and other cohorts' staff out", async () => {
    const w = await makePracticalWorld(t.db);
    const d = await submitted(w);
    const { actor: facilitator } = await actorFor(d.ctx, (await w.staff("facilitator")).id);
    await expect(getSubmissionView(d.ctx, facilitator, d.submissionId)).rejects.toBeInstanceOf(AccessDeniedError);
    const elsewhere = await makePracticalWorld(t.db);
    const { actor: otherAssessor } = await actorFor(d.ctx, (await elsewhere.staff("assessor")).id);
    await expect(getPracticalMarkingView(d.ctx, otherAssessor, d.submissionId)).rejects.toBeInstanceOf(AccessDeniedError);
  });
});

describe("observed tasks on an assessment day", () => {
  it("start from the register after attendance and ID; the assessor attaches evidence, the learner can't", async () => {
    const w = await makePracticalWorld(t.db, { mode: "observed" });
    const ctx = makeCtx(t.db);
    const l = await w.learner();
    const { actor: learner } = await actorFor(ctx, l.user.id);
    const assessorUser = await w.staff("assessor");
    const { actor: assessor } = await actorFor(ctx, assessorUser.id);
    const page = await getBriefPage(ctx, learner, w.schedule.id);
    expect(page.mode).toBe("observed");
    expect(page.draft).toBeNull(); // nothing for the learner to upload
    await expect(startObservation(ctx, assessor, w.schedule.id, l.enrolmentId)).rejects.toMatchObject({ code: "needs_unlock" });
    await setAttendance(ctx, assessor, w.dayId!, l.enrolmentId, "present");
    await setIdVerified(ctx, assessor, w.dayId!, l.enrolmentId, true);
    const submissionId = await startObservation(ctx, assessor, w.schedule.id, l.enrolmentId);
    const [s] = await t.db.select().from(submissions).where(eq(submissions.id, submissionId));
    expect(s).toMatchObject({ observed: true, status: "submitted" });
    const item = await (await upload(ctx, assessor, submissionId)).result;
    expect(item.source).toBe("assessor");
    await expect((await upload(ctx, learner, submissionId)).result).rejects.toMatchObject({ code: "not_found" });
    await saveJudgements(ctx, assessor, submissionId, Object.fromEntries(w.criteria.map((c) => [c.id, { met: true, comment: "" }])), "Observed calmly (fake).");
    const view = await getPracticalMarkingView(ctx, assessor, submissionId);
    expect(view.suggested).toBe("competent");
    expect(view.submission.observationNotes).toBe("Observed calmly (fake).");
    expect(view.sitting).toMatchObject({ attendance: "present", idVerified: true });
  });
});
