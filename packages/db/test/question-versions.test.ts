import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
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

describe("question versions are immutable once served", () => {
  it("can be edited before it is served", async () => {
    const f = await makeFixture(t.db);
    await t.db
      .update(s.questionVersions)
      .set({ stem: "Edited before serving" })
      .where(eq(s.questionVersions.id, f.version.id));
    await t.db
      .update(s.answerOptions)
      .set({ label: "Still editable" })
      .where(eq(s.answerOptions.id, f.options[0]!.id));

    const [row] = await t.db
      .select()
      .from(s.questionVersions)
      .where(eq(s.questionVersions.id, f.version.id));
    expect(row?.stem).toBe("Edited before serving");
    expect(row?.firstServedAt).toBeNull();
  });

  it("stamps first_served_at when an attempt item serves it", async () => {
    const f = await makeFixture(t.db);
    await f.serve();
    const [row] = await t.db
      .select()
      .from(s.questionVersions)
      .where(eq(s.questionVersions.id, f.version.id));
    expect(row?.firstServedAt).toBeInstanceOf(Date);
  });

  it("rejects UPDATE after it has been served", async () => {
    const f = await makeFixture(t.db);
    await f.serve();
    await expectPgError(
      t.db
        .update(s.questionVersions)
        .set({ stem: "Sneaky edit" })
        .where(eq(s.questionVersions.id, f.version.id)),
      PG.restrictViolation,
      /immutable/,
    );
  });

  it("rejects clearing first_served_at", async () => {
    const f = await makeFixture(t.db);
    await f.serve();
    await expectPgError(
      t.db
        .update(s.questionVersions)
        .set({ firstServedAt: null })
        .where(eq(s.questionVersions.id, f.version.id)),
      PG.restrictViolation,
    );
  });

  it("rejects DELETE after it has been served", async () => {
    const f = await makeFixture(t.db);
    await f.serve();
    await expectPgError(
      t.db
        .delete(s.questionVersions)
        .where(eq(s.questionVersions.id, f.version.id)),
      PG.restrictViolation,
      /immutable/,
    );
  });

  it("freezes the answer options of a served version (update, delete, insert)", async () => {
    const f = await makeFixture(t.db);
    await f.serve();
    const optionId = f.options[0]!.id;

    await expectPgError(
      t.db
        .update(s.answerOptions)
        .set({ isCorrect: false })
        .where(eq(s.answerOptions.id, optionId)),
      PG.restrictViolation,
    );
    await expectPgError(
      t.db.delete(s.answerOptions).where(eq(s.answerOptions.id, optionId)),
      PG.restrictViolation,
    );
    await expectPgError(
      t.db.insert(s.answerOptions).values({
        questionVersionId: f.version.id,
        label: "Late option",
        authorOrder: 9,
      }),
      PG.restrictViolation,
    );
  });

  it("still allows a new version of the same question", async () => {
    const f = await makeFixture(t.db);
    await f.serve();
    const [v2] = await t.db
      .insert(s.questionVersions)
      .values({
        questionId: f.question.id,
        versionNo: 2,
        stem: "Improved stem",
      })
      .returning();
    await t.db
      .update(s.questions)
      .set({ currentVersionId: v2!.id })
      .where(eq(s.questions.id, f.question.id));
    await t.db.insert(s.answerOptions).values({
      questionVersionId: v2!.id,
      label: "New option",
      isCorrect: true,
      authorOrder: 1,
    });

    // The old version is untouched and still served by the old attempt.
    const [old] = await t.db
      .select()
      .from(s.questionVersions)
      .where(eq(s.questionVersions.id, f.version.id));
    expect(old?.stem).toBe("Test stem?");
  });

  it("rejects duplicate version numbers for a question", async () => {
    const f = await makeFixture(t.db);
    await expectPgError(
      t.db
        .insert(s.questionVersions)
        .values({ questionId: f.question.id, versionNo: 1, stem: "Duplicate" }),
      PG.uniqueViolation,
    );
  });
});

describe("attempt items: what was served is frozen", () => {
  it("allows recording the learner's response", async () => {
    const f = await makeFixture(t.db);
    const item = await f.serve();
    await t.db
      .update(s.attemptItems)
      .set({
        responseOptionIds: [f.options[0]!.id],
        isCorrect: true,
        answeredAt: new Date(),
      })
      .where(eq(s.attemptItems.id, item.id));
  });

  it("rejects changing the served option order, seed or question", async () => {
    const f = await makeFixture(t.db);
    const item = await f.serve();
    await expectPgError(
      t.db
        .update(s.attemptItems)
        .set({ servedOptionOrder: f.options.map((o) => o.id) })
        .where(eq(s.attemptItems.id, item.id)),
      PG.restrictViolation,
    );
    await expectPgError(
      t.db
        .update(s.attemptItems)
        .set({ seed: "other" })
        .where(eq(s.attemptItems.id, item.id)),
      PG.restrictViolation,
    );
  });

  it("rejects deleting an attempt item", async () => {
    const f = await makeFixture(t.db);
    const item = await f.serve();
    await expectPgError(
      t.db.delete(s.attemptItems).where(eq(s.attemptItems.id, item.id)),
      PG.restrictViolation,
    );
  });
});
