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

const closeBatch = (batchId: string, closedBy: string) =>
  t.db
    .update(s.moderationBatches)
    .set({ status: "closed", closedBy, closedAt: new Date() })
    .where(eq(s.moderationBatches.id, batchId));

describe("moderation", () => {
  it("rejects a moderator moderating their own decision", async () => {
    const f = await makeFixture(t.db);
    const batch = await f.batch();
    const d = await f.decision(batch.id, f.assessor.id);
    await expectPgError(
      t.db.insert(s.moderationRecords).values({
        decisionId: d.id,
        moderatorId: f.assessor.id,
        outcome: "upheld",
        findings: "Self-moderation attempt",
      }),
      PG.checkViolation,
      /cannot moderate a decision they made/,
    );
  });

  it("accepts moderation by a different person", async () => {
    const f = await makeFixture(t.db);
    const batch = await f.batch();
    const d = await f.decision(batch.id);
    await t.db.insert(s.moderationRecords).values({
      decisionId: d.id,
      moderatorId: f.moderator.id,
      outcome: "upheld",
      findings: "Fine",
    });
  });

  it("makes moderation records append-only", async () => {
    const f = await makeFixture(t.db);
    const batch = await f.batch();
    const d = await f.decision(batch.id);
    const [m] = await t.db
      .insert(s.moderationRecords)
      .values({
        decisionId: d.id,
        moderatorId: f.moderator.id,
        outcome: "upheld",
        findings: "Ok",
      })
      .returning();
    await expectPgError(
      t.db
        .update(s.moderationRecords)
        .set({ findings: "Changed" })
        .where(eq(s.moderationRecords.id, m!.id)),
      PG.restrictViolation,
    );
    await expectPgError(
      t.db.delete(s.moderationRecords).where(eq(s.moderationRecords.id, m!.id)),
      PG.restrictViolation,
    );
  });
});

describe("assessment decisions", () => {
  it("can be changed by the assessor before moderation", async () => {
    const f = await makeFixture(t.db);
    const batch = await f.batch();
    const d = await f.decision(batch.id);
    await t.db
      .update(s.assessmentDecisions)
      .set({ outcome: "not_yet_competent", feedback: "Revised" })
      .where(eq(s.assessmentDecisions.id, d.id));
  });

  it("is locked once moderated", async () => {
    const f = await makeFixture(t.db);
    const batch = await f.batch();
    const d = await f.decision(batch.id);
    await t.db.insert(s.moderationRecords).values({
      decisionId: d.id,
      moderatorId: f.moderator.id,
      outcome: "upheld",
      findings: "Ok",
    });
    await expectPgError(
      t.db
        .update(s.assessmentDecisions)
        .set({ outcome: "not_yet_competent" })
        .where(eq(s.assessmentDecisions.id, d.id)),
      PG.restrictViolation,
      /locked: it has been moderated/,
    );
  });

  it("can never be deleted", async () => {
    const f = await makeFixture(t.db);
    const batch = await f.batch();
    const d = await f.decision(batch.id);
    await expectPgError(
      t.db
        .delete(s.assessmentDecisions)
        .where(eq(s.assessmentDecisions.id, d.id)),
      PG.restrictViolation,
    );
  });

  it("must target exactly one of submission or attempt", async () => {
    const f = await makeFixture(t.db);
    const batch = await f.batch();
    await expectPgError(
      t.db.insert(s.assessmentDecisions).values({
        assessorId: f.assessor.id,
        batchId: batch.id,
        outcome: "competent",
        feedback: "No target",
      }),
      PG.checkViolation,
    );
  });
});

describe("results are released only when the moderation batch closes", () => {
  it("rejects setting released_at directly", async () => {
    const f = await makeFixture(t.db);
    const batch = await f.batch();
    const d = await f.decision(batch.id);
    await expectPgError(
      t.db
        .update(s.assessmentDecisions)
        .set({ releasedAt: new Date() })
        .where(eq(s.assessmentDecisions.id, d.id)),
      PG.checkViolation,
      /closing the moderation batch/,
    );
    await expectPgError(
      t.db.insert(s.assessmentDecisions).values({
        assessorId: f.assessor.id,
        attemptId: (await f.attempt()).id,
        batchId: batch.id,
        outcome: "competent",
        feedback: "Pre-released",
        releasedAt: new Date(),
      }),
      PG.checkViolation,
    );
  });

  it("releases every decision in the batch, sampled or not, when it closes", async () => {
    const f = await makeFixture(t.db);
    const batch = await f.batch();
    const sampled = await f.decision(batch.id);
    const unsampled = await f.decision(batch.id);
    await t.db.insert(s.moderationRecords).values({
      decisionId: sampled.id,
      moderatorId: f.moderator.id,
      outcome: "upheld",
      findings: "Sampled",
    });

    await closeBatch(batch.id, f.moderator.id);

    const rows = await t.db
      .select()
      .from(s.assessmentDecisions)
      .where(eq(s.assessmentDecisions.batchId, batch.id));
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.releasedAt instanceof Date)).toBe(true);
    expect(rows.map((r) => r.id).sort()).toEqual(
      [sampled.id, unsampled.id].sort(),
    );
  });

  it("does not release decisions in other batches", async () => {
    const f = await makeFixture(t.db);
    const a = await f.batch();
    const b = await f.batch();
    await f.decision(a.id);
    const other = await f.decision(b.id);
    await closeBatch(a.id, f.moderator.id);
    const [row] = await t.db
      .select()
      .from(s.assessmentDecisions)
      .where(eq(s.assessmentDecisions.id, other.id));
    expect(row?.releasedAt).toBeNull();
  });

  it("locks decisions and blocks new ones once the batch is closed", async () => {
    const f = await makeFixture(t.db);
    const batch = await f.batch();
    const d = await f.decision(batch.id);
    await closeBatch(batch.id, f.moderator.id);

    await expectPgError(
      t.db
        .update(s.assessmentDecisions)
        .set({ feedback: "After release" })
        .where(eq(s.assessmentDecisions.id, d.id)),
      PG.restrictViolation,
    );
    await expectPgError(
      () => f.decision(batch.id),
      PG.checkViolation,
      /closed/,
    );
  });

  it("never reopens a closed batch", async () => {
    const f = await makeFixture(t.db);
    const batch = await f.batch();
    await closeBatch(batch.id, f.moderator.id);
    await expectPgError(
      t.db
        .update(s.moderationBatches)
        .set({ status: "open", closedAt: null, closedBy: null })
        .where(eq(s.moderationBatches.id, batch.id)),
      PG.restrictViolation,
      /cannot be reopened/,
    );
  });

  it("requires closed_at and closed_by when closing", async () => {
    const f = await makeFixture(t.db);
    const batch = await f.batch();
    await expectPgError(
      t.db
        .update(s.moderationBatches)
        .set({ status: "closed" })
        .where(eq(s.moderationBatches.id, batch.id)),
      PG.checkViolation,
    );
  });
});
