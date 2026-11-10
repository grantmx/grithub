import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  answerOptions,
  assessmentAttempts,
  attemptItems,
  modules,
  questionVersions,
  sections,
  users,
} from "db";
import { seedDemo } from "db/seed";
import {
  orderOptions,
  pickQuestion,
  rngFromSeed,
  seedFor,
} from "@/lib/randomization";
import { LearningError } from "@/lib/server/learning";
import {
  SECTION_CHECK_MAX_ATTEMPTS,
  getCheckView,
  retryCheck,
  submitCheckAnswer,
  type CheckView,
} from "@/lib/server/sectionCheck";
import { actorFor, createTestDb, makeCtx, type TestDb } from "./helpers";

let t: TestDb;
let sectionId: string;

beforeAll(async () => {
  t = await createTestDb();
  const { qualificationId } = await seedDemo(t.db);
  const [s] = await t.db
    .select({ id: sections.id })
    .from(sections)
    .innerJoin(modules, eq(modules.id, sections.moduleId))
    .where(eq(modules.qualificationId, qualificationId))
    .orderBy(modules.sortOrder, sections.sortOrder)
    .limit(1);
  sectionId = s!.id;
});
afterAll(async () => {
  await t?.teardown();
});

async function learner(n: 1 | 2 | 3) {
  const [u] = await t.db
    .select()
    .from(users)
    .where(eq(users.email, `demo.learner${n}@example.invalid`));
  const ctx = makeCtx(t.db);
  return { ctx, actor: (await actorFor(ctx, u!.id)).actor, userId: u!.id };
}

async function correctTokenFor(
  view: Extract<CheckView, { state: "question" }>,
) {
  const [item] = await t.db
    .select()
    .from(attemptItems)
    .where(eq(attemptItems.attemptId, view.attemptId));
  const opts = await t.db
    .select()
    .from(answerOptions)
    .where(eq(answerOptions.questionVersionId, item!.questionVersionId));
  const correctId = opts.find((o) => o.isCorrect)!.id;
  const tokens = item!.optionTokens;
  return {
    correct: Object.keys(tokens).find((k) => tokens[k] === correctId)!,
    wrong: Object.keys(tokens).find((k) => tokens[k] !== correctId)!,
    item: item!,
    opts,
  };
}

describe("section check: what the browser receives", () => {
  it("never contains option ids, correctness or the explanation before submitting", async () => {
    const { ctx, actor } = await learner(1);
    const view = await getCheckView(ctx, actor, sectionId);
    expect(view.state).toBe("question");
    if (view.state !== "question") return;
    const { opts, item } = await correctTokenFor(view);
    const payload = JSON.stringify(view);

    for (const o of opts) expect(payload).not.toContain(o.id);
    expect(payload).not.toContain(item.questionVersionId);
    expect(payload).not.toMatch(
      /isCorrect|correctToken|explanation|feedback|"correct"/i,
    );
    const [version] = await t.db
      .select()
      .from(questionVersions)
      .where(eq(questionVersions.id, item.questionVersionId));
    if (version?.feedback) expect(payload).not.toContain(version.feedback);
    // Only the documented keys are present.
    expect(Object.keys(view).sort()).toEqual([
      "attemptId",
      "attemptNo",
      "maxAttempts",
      "options",
      "state",
      "stem",
    ]);
    for (const o of view.options)
      expect(Object.keys(o).sort()).toEqual(["label", "token"]);
  });

  it("grades on the server and reveals the correct answer only after submitting", async () => {
    const { ctx, actor } = await learner(1);
    const view = await getCheckView(ctx, actor, sectionId);
    if (view.state !== "question") throw new Error("expected question");
    const { wrong, correct } = await correctTokenFor(view);
    const result = await submitCheckAnswer(ctx, actor, view.attemptId, wrong);
    expect(result).toMatchObject({
      state: "result",
      correct: false,
      chosenToken: wrong,
      correctToken: correct,
      canRetry: true,
    });
    if (result.state === "result") expect(result.explanation).toBeTruthy();
  });

  it("rejects tokens that weren't served, and other learners' attempts", async () => {
    const { ctx, actor } = await learner(2);
    const view = await getCheckView(ctx, actor, sectionId);
    if (view.state !== "question") throw new Error("expected question");
    await expect(
      submitCheckAnswer(ctx, actor, view.attemptId, "made-up-token"),
    ).rejects.toBeInstanceOf(LearningError);
    const other = await learner(3);
    await expect(
      submitCheckAnswer(
        other.ctx,
        other.actor,
        view.attemptId,
        view.options[0]!.token,
      ),
    ).rejects.toBeInstanceOf(LearningError);
  });
});

describe("section check: seeded draw and stored evidence", () => {
  it("serves exactly the seeded question and option order, and stores both", async () => {
    const { ctx, actor, userId } = await learner(2);
    const view = await getCheckView(ctx, actor, sectionId);
    if (view.state !== "question") throw new Error("expected question");
    const [attempt] = await t.db
      .select()
      .from(assessmentAttempts)
      .where(eq(assessmentAttempts.id, view.attemptId));
    const { item, opts } = await correctTokenFor(view);

    // Recompute with the documented algorithm.
    const seed = seedFor(userId, sectionId, attempt!.attemptNo);
    expect(item.seed).toBe(seed);
    const rng = rngFromSeed(seed);
    const pool = await t.db.execute<{ question_id: string }>(sql`
      select q.id as question_id
        from section_question_pools p
        join section_pool_questions pq on pq.pool_id = p.id
        join questions q on q.id = pq.question_id
       where p.section_id = ${sectionId}`);
    const pick = pickQuestion(
      pool.map((r) => r.question_id),
      new Map(),
      rng,
    );
    const [version] = await t.db
      .select()
      .from(questionVersions)
      .where(eq(questionVersions.id, item.questionVersionId));
    expect(version!.questionId).toBe(pick.questionId);
    expect(item.servedOptionOrder).toEqual(
      orderOptions(opts, rng).map((o) => o.id),
    );

    // The view shows options in exactly the stored order.
    const labelById = new Map(opts.map((o) => [o.id, o.label]));
    expect(view.options.map((o) => o.label)).toEqual(
      item.servedOptionOrder.map((id) => labelById.get(id)),
    );
    // Serving made the version immutable.
    expect(version!.firstServedAt).toBeInstanceOf(Date);
  });

  it("shows the same question and order on reload (stored rows win)", async () => {
    const { ctx, actor } = await learner(2);
    const a = await getCheckView(ctx, actor, sectionId);
    const b = await getCheckView(makeCtx(t.db), actor, sectionId);
    expect(b).toEqual(a);
  });

  it("gives different learners different draws or option orders (seeded per learner)", async () => {
    const served = new Set<string>();
    for (const n of [1, 2, 3] as const) {
      const { ctx, actor, userId } = await learner(n);
      await getCheckView(ctx, actor, sectionId);
      served.add(JSON.stringify(await firstItem(userId)));
    }
    expect(served.size).toBeGreaterThan(1);
  });
});

describe("section check: retries", () => {
  it(`allows up to ${SECTION_CHECK_MAX_ATTEMPTS} attempts of the same question, options reshuffled`, async () => {
    const { ctx, actor } = await learner(3);
    const seenVersions: string[] = [];
    const orders: string[] = [];
    let view = await getCheckView(ctx, actor, sectionId);
    for (let attempt = 1; attempt <= SECTION_CHECK_MAX_ATTEMPTS; attempt++) {
      if (view.state !== "question")
        throw new Error(`attempt ${attempt}: expected a question`);
      expect(view.attemptNo).toBe(attempt);
      const { wrong, item } = await correctTokenFor(view);
      seenVersions.push(item.questionVersionId);
      orders.push(item.servedOptionOrder.join());
      const result = await submitCheckAnswer(ctx, actor, view.attemptId, wrong);
      // The correct answer and explanation are still shown after a wrong try.
      expect(result).toMatchObject({ state: "result", correct: false });
      expect(result.state === "result" && result.correctToken).toBeTruthy();
      expect(result.state === "result" && result.canRetry).toBe(
        attempt < SECTION_CHECK_MAX_ATTEMPTS,
      );
      view = await retryCheck(ctx, actor, sectionId);
    }
    // design.md §14, 2026-11-09: same question every try, new option order each time.
    expect(new Set(seenVersions).size).toBe(1);
    expect(orders[1]).not.toBe(orders[0]);
    expect(orders[2]).not.toBe(orders[1]);
    // After the last attempt, retry does nothing.
    expect(view.state === "result" && view.attemptNo).toBe(
      SECTION_CHECK_MAX_ATTEMPTS,
    );
  });

  it("offers no retry after a correct answer", async () => {
    const { ctx, actor } = await learner(1);
    // learner 1 answered wrong earlier; retry the same question and answer correctly.
    const next = await retryCheck(ctx, actor, sectionId);
    if (next.state !== "question") throw new Error("expected question");
    const { correct } = await correctTokenFor(next);
    const result = await submitCheckAnswer(ctx, actor, next.attemptId, correct);
    expect(result).toMatchObject({
      state: "result",
      correct: true,
      canRetry: false,
    });
    const after = await retryCheck(ctx, actor, sectionId);
    expect(after.state === "result" && after.attemptNo).toBe(next.attemptNo);
  });

  it("submitting twice is harmless (idempotent)", async () => {
    const { ctx, actor } = await learner(1);
    const view = await getCheckView(ctx, actor, sectionId);
    if (view.state !== "result") throw new Error("expected result");
    const again = await submitCheckAnswer(
      ctx,
      actor,
      view.attemptId,
      view.options[0]!.token,
    );
    expect(again).toEqual(view);
  });
});

async function firstItem(userId: string) {
  const rows = await t.db.execute<{
    question_version_id: string;
    served_option_order: string[];
  }>(sql`
    select ai.question_version_id, ai.served_option_order
      from attempt_items ai
      join assessment_attempts a on a.id = ai.attempt_id
      join enrolments e on e.id = a.enrolment_id
     where e.user_id = ${userId} and a.section_id = ${sectionId}
     order by a.attempt_no
     limit 1`);
  return rows[0];
}
