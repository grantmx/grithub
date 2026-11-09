import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, it } from "vitest";
import * as s from "../src/schema";
import {
  createTestDb,
  expectPgError,
  makeFixture,
  PG,
  type TestDb,
} from "./helpers";

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
});
afterAll(async () => {
  await t?.teardown();
});

const one = <T>(rows: T[]): T => {
  const r = rows[0];
  if (!r) throw new Error("no row");
  return r;
};

/** A short-answer version with a two-criterion rubric (0-3 and 0-2). */
async function shortAnswer(f: Awaited<ReturnType<typeof makeFixture>>) {
  const q = one(
    await t.db.insert(s.questions).values({ bankId: f.bank.id }).returning(),
  );
  const v = one(
    await t.db
      .insert(s.questionVersions)
      .values({
        questionId: q.id,
        versionNo: 1,
        stem: "Explain (fake)",
        type: "short_answer",
        maxMarks: 5,
      })
      .returning(),
  );
  const criteria = await t.db
    .insert(s.rubricCriteria)
    .values([
      { questionVersionId: v.id, label: "Names parts", maxMarks: 3, sortOrder: 1 },
      { questionVersionId: v.id, label: "Explains", maxMarks: 2, sortOrder: 2 },
    ])
    .returning();
  const a = await f.attempt();
  const item = one(
    await t.db
      .insert(s.attemptItems)
      .values({
        attemptId: a.id,
        questionVersionId: v.id,
        position: 1,
        servedOptionOrder: [],
        optionTokens: {},
        seed: `seed-${a.id}`,
      })
      .returning(),
  );
  return { version: v, criteria, attempt: a, item };
}

describe("rubric criteria", () => {
  it("are frozen once the version is served", async () => {
    const f = await makeFixture(t.db);
    const { version, criteria } = await shortAnswer(f);
    await expectPgError(
      t.db
        .update(s.rubricCriteria)
        .set({ maxMarks: 10 })
        .where(eq(s.rubricCriteria.id, criteria[0]!.id)),
      PG.restrictViolation,
      /rubric .* immutable/,
    );
    await expectPgError(
      t.db.insert(s.rubricCriteria).values({
        questionVersionId: version.id,
        label: "Extra",
        maxMarks: 1,
        sortOrder: 3,
      }),
      PG.restrictViolation,
    );
  });
});

describe("attempt item responses", () => {
  it("can be autosaved while in progress and freeze on submission", async () => {
    const f = await makeFixture(t.db);
    const item = await f.serve();
    await t.db
      .update(s.attemptItems)
      .set({ responseOptionIds: [f.options[1]!.id], flagged: true })
      .where(eq(s.attemptItems.id, item.id));
    await t.db
      .update(s.assessmentAttempts)
      .set({ status: "submitted", submittedAt: new Date() })
      .where(eq(s.assessmentAttempts.id, item.attemptId));
    await expectPgError(
      t.db
        .update(s.attemptItems)
        .set({ responseOptionIds: [f.options[0]!.id] })
        .where(eq(s.attemptItems.id, item.id)),
      PG.restrictViolation,
      /cannot change after the attempt is submitted/,
    );
  });

  it("allows grading once after submission, but not regrading", async () => {
    const f = await makeFixture(t.db);
    const item = await f.serve();
    await t.db
      .update(s.assessmentAttempts)
      .set({ status: "submitted", submittedAt: new Date() })
      .where(eq(s.assessmentAttempts.id, item.attemptId));
    await t.db
      .update(s.attemptItems)
      .set({ isCorrect: false, marksAwarded: 0 })
      .where(eq(s.attemptItems.id, item.id));
    await expectPgError(
      t.db
        .update(s.attemptItems)
        .set({ isCorrect: true })
        .where(eq(s.attemptItems.id, item.id)),
      PG.restrictViolation,
    );
  });
});

describe("item marks", () => {
  it("stay within the criterion range and belong to the served version", async () => {
    const f = await makeFixture(t.db);
    const { item, criteria } = await shortAnswer(f);
    await t.db.insert(s.itemMarks).values({
      attemptItemId: item.id,
      criterionId: criteria[0]!.id,
      marks: 3,
      markedBy: f.assessor.id,
    });
    await expectPgError(
      t.db.insert(s.itemMarks).values({
        attemptItemId: item.id,
        criterionId: criteria[1]!.id,
        marks: 3,
        markedBy: f.assessor.id,
      }),
      PG.checkViolation,
      /exceed the criterion maximum/,
    );
    const other = await shortAnswer(f);
    await expectPgError(
      t.db.insert(s.itemMarks).values({
        attemptItemId: item.id,
        criterionId: other.criteria[0]!.id,
        marks: 1,
        markedBy: f.assessor.id,
      }),
      PG.checkViolation,
      /does not belong to the served question version/,
    );
  });

  it("lock (with the item's marks) once a decision is recorded", async () => {
    const f = await makeFixture(t.db);
    const { item, criteria, attempt } = await shortAnswer(f);
    const [mark] = await t.db
      .insert(s.itemMarks)
      .values({
        attemptItemId: item.id,
        criterionId: criteria[0]!.id,
        marks: 2,
        markedBy: f.assessor.id,
      })
      .returning();
    const batch = await f.batch();
    await t.db.insert(s.assessmentDecisions).values({
      assessorId: f.assessor.id,
      attemptId: attempt.id,
      batchId: batch.id,
      outcome: "competent",
      feedback: "Fine (fake)",
    });
    await expectPgError(
      t.db
        .update(s.itemMarks)
        .set({ marks: 3 })
        .where(eq(s.itemMarks.id, mark!.id)),
      PG.restrictViolation,
      /locked once a decision/,
    );
    await expectPgError(
      t.db
        .update(s.attemptItems)
        .set({ marksAwarded: 5 })
        .where(eq(s.attemptItems.id, item.id)),
      PG.restrictViolation,
      /locked once a decision/,
    );
  });
});

describe("appeals", () => {
  async function released(f: Awaited<ReturnType<typeof makeFixture>>) {
    const batch = await f.batch();
    const d = await f.decision(batch.id);
    await f.moderate(d);
    await t.db
      .update(s.moderationBatches)
      .set({ status: "closed", closedAt: new Date(), closedBy: f.moderator.id })
      .where(eq(s.moderationBatches.id, batch.id));
    return d;
  }

  it("are only possible against released decisions", async () => {
    const f = await makeFixture(t.db);
    const batch = await f.batch();
    const d = await f.decision(batch.id);
    await expectPgError(
      t.db.insert(s.appeals).values({
        decisionId: d.id,
        enrolmentId: f.enrolment.id,
        reason: "Please review (fake)",
      }),
      PG.checkViolation,
      /only released decisions/,
    );
  });

  it("cannot be decided by the decision's assessor, and are final once decided", async () => {
    const f = await makeFixture(t.db);
    const d = await released(f);
    const [appeal] = await t.db
      .insert(s.appeals)
      .values({
        decisionId: d.id,
        enrolmentId: f.enrolment.id,
        reason: "Please review (fake)",
      })
      .returning();
    await expectPgError(
      t.db
        .update(s.appeals)
        .set({ status: "upheld", decidedBy: f.assessor.id, decidedAt: new Date() })
        .where(eq(s.appeals.id, appeal!.id)),
      PG.checkViolation,
      /cannot decide its appeal/,
    );
    await t.db
      .update(s.appeals)
      .set({
        status: "reassess",
        decidedBy: f.moderator.id,
        decidedAt: new Date(),
        outcomeNotes: "Reassess (fake)",
      })
      .where(eq(s.appeals.id, appeal!.id));
    await expectPgError(
      t.db
        .update(s.appeals)
        .set({ outcomeNotes: "Changed" })
        .where(eq(s.appeals.id, appeal!.id)),
      PG.restrictViolation,
      /final/,
    );
  });
});

describe("assessment day register", () => {
  it("is locked once signed off; sign-offs and unlocks are append-only", async () => {
    const f = await makeFixture(t.db);
    const day = one(
      await t.db
        .insert(s.assessmentDays)
        .values({ cohortId: f.cohort.id, heldOn: "2030-02-01", venue: "Test venue" })
        .returning(),
    );
    const rec = one(
      await t.db
        .insert(s.attendanceRecords)
        .values({
          enrolmentId: f.enrolment.id,
          assessmentDayId: day.id,
          status: "present",
          recordedBy: f.assessor.id,
          idVerifiedAt: new Date(),
          idVerifiedBy: f.assessor.id,
        })
        .returning(),
    );
    const schedule = one(
      await t.db
        .insert(s.assessmentSchedules)
        .values({
          cohortId: f.cohort.id,
          blueprintId: f.blueprint.id,
          assessmentDayId: day.id,
          opensAt: new Date("2030-02-01T07:00:00Z"),
          closesAt: new Date("2030-02-01T15:00:00Z"),
        })
        .returning(),
    );
    const unlock = one(
      await t.db
        .insert(s.paperUnlocks)
        .values({
          scheduleId: schedule.id,
          enrolmentId: f.enrolment.id,
          attemptNo: 1,
          unlockedBy: f.assessor.id,
        })
        .returning(),
    );
    await expectPgError(
      t.db.delete(s.paperUnlocks).where(eq(s.paperUnlocks.id, unlock.id)),
      PG.restrictViolation,
    );
    await t.db
      .insert(s.registerSignoffs)
      .values({ assessmentDayId: day.id, signedBy: f.assessor.id });
    await expectPgError(
      t.db
        .update(s.attendanceRecords)
        .set({ status: "absent" })
        .where(eq(s.attendanceRecords.id, rec.id)),
      PG.restrictViolation,
      /signed off/,
    );
    await expectPgError(
      t.db
        .delete(s.registerSignoffs)
        .where(eq(s.registerSignoffs.assessmentDayId, day.id)),
      PG.restrictViolation,
    );
  });

  it("requires both ID-verified fields together", async () => {
    const f = await makeFixture(t.db);
    const day = one(
      await t.db
        .insert(s.assessmentDays)
        .values({ cohortId: f.cohort.id, heldOn: "2030-03-01", venue: "Test venue" })
        .returning(),
    );
    await expectPgError(
      t.db.insert(s.attendanceRecords).values({
        enrolmentId: f.enrolment.id,
        assessmentDayId: day.id,
        status: "present",
        recordedBy: f.assessor.id,
        idVerifiedAt: new Date(),
      }),
      PG.checkViolation,
    );
  });
});

describe("blueprints", () => {
  it("lock their rules and settings once published (title may change)", async () => {
    const f = await makeFixture(t.db);
    const bp = one(
      await t.db
        .insert(s.assessmentBlueprints)
        .values({
          moduleId: f.module.id,
          title: "Publish test",
          kind: "formative",
          passMarkPercent: 50,
        })
        .returning(),
    );
    const rule = one(
      await t.db
        .insert(s.blueprintRules)
        .values({
          blueprintId: bp.id,
          bankId: f.bank.id,
          curriculumComponentRef: "TEST-KT01",
          questionCount: 1,
        })
        .returning(),
    );
    await t.db
      .update(s.assessmentBlueprints)
      .set({ status: "published", publishedAt: new Date() })
      .where(eq(s.assessmentBlueprints.id, bp.id));
    await t.db
      .update(s.assessmentBlueprints)
      .set({ title: "Renamed" })
      .where(eq(s.assessmentBlueprints.id, bp.id));
    await expectPgError(
      t.db
        .update(s.assessmentBlueprints)
        .set({ maxAttempts: 5 })
        .where(eq(s.assessmentBlueprints.id, bp.id)),
      PG.restrictViolation,
      /published/,
    );
    await expectPgError(
      t.db
        .update(s.blueprintRules)
        .set({ questionCount: 2 })
        .where(eq(s.blueprintRules.id, rule.id)),
      PG.restrictViolation,
      /rules cannot change/,
    );
  });

  it("summative blueprints must be in-person only", async () => {
    const f = await makeFixture(t.db);
    await expectPgError(
      t.db.insert(s.assessmentBlueprints).values({
        moduleId: f.module.id,
        title: "Summative",
        kind: "summative",
        passMarkPercent: 50,
      }),
      PG.checkViolation,
    );
  });
});

describe("moderation batches", () => {
  it("allow only one open batch per cohort and blueprint", async () => {
    const f = await makeFixture(t.db);
    await t.db
      .insert(s.moderationBatches)
      .values({ cohortId: f.cohort.id, blueprintId: f.blueprint.id });
    await expectPgError(
      t.db
        .insert(s.moderationBatches)
        .values({ cohortId: f.cohort.id, blueprintId: f.blueprint.id }),
      PG.uniqueViolation,
    );
  });
});
