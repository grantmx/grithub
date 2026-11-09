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
    await f.sample(d);
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
    await f.moderate(d);
  });

  it("makes moderation records append-only", async () => {
    const f = await makeFixture(t.db);
    const batch = await f.batch();
    const d = await f.decision(batch.id);
    const m = await f.moderate(d);
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
  it("is final as soon as it is recorded (finalised)", async () => {
    const f = await makeFixture(t.db);
    const batch = await f.batch();
    const d = await f.decision(batch.id);
    await expectPgError(
      t.db
        .update(s.assessmentDecisions)
        .set({ outcome: "not_yet_competent", feedback: "Revised" })
        .where(eq(s.assessmentDecisions.id, d.id)),
      PG.restrictViolation,
      /is final/,
    );
  });

  it("changes only through a new version that supersedes it (same target, once)", async () => {
    const f = await makeFixture(t.db);
    const batch = await f.batch();
    const d = await f.decision(batch.id);
    const [v2] = await t.db
      .insert(s.assessmentDecisions)
      .values({
        assessorId: d.assessorId,
        attemptId: d.attemptId,
        submissionId: d.submissionId,
        batchId: batch.id,
        outcome: "not_yet_competent",
        feedback: "Revised (new version)",
        supersedesId: d.id,
      })
      .returning();
    expect(v2!.supersedesId).toBe(d.id);
    await expectPgError(
      t.db.insert(s.assessmentDecisions).values({
        assessorId: d.assessorId,
        attemptId: d.attemptId,
        submissionId: d.submissionId,
        batchId: batch.id,
        outcome: "competent",
        feedback: "A second branch",
        supersedesId: d.id,
      }),
      PG.uniqueViolation,
    );
  });

  it("is still locked once moderated", async () => {
    const f = await makeFixture(t.db);
    const batch = await f.batch();
    const d = await f.decision(batch.id);
    await f.moderate(d);
    await expectPgError(
      t.db
        .update(s.assessmentDecisions)
        .set({ outcome: "not_yet_competent" })
        .where(eq(s.assessmentDecisions.id, d.id)),
      PG.restrictViolation,
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
    await f.moderate(sampled);

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
    await f.moderate(await f.decision(a.id));
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
    await f.moderate(d);
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

describe("moderation sample and release gate (design.md §14, 2026-11-08)", () => {
  it("samples only work decided in the batch, and moderates only sampled work", async () => {
    const f = await makeFixture(t.db);
    const batch = await f.batch();
    const other = await f.batch();
    const d = await f.decision(batch.id);
    await expectPgError(
      t.db.insert(s.moderationSampleItems).values({ batchId: other.id, attemptId: d.attemptId, addedBy: f.moderator.id }),
      PG.checkViolation,
      /only work with a decision/,
    );
    await expectPgError(
      t.db.insert(s.moderationRecords).values({ decisionId: d.id, moderatorId: f.moderator.id, outcome: "upheld", findings: "x" }),
      PG.checkViolation,
      /add the learner to the sample/,
    );
  });

  it("allows one verdict per decision version, only on the current version", async () => {
    const f = await makeFixture(t.db);
    const batch = await f.batch();
    const d = await f.decision(batch.id);
    await f.moderate(d, { outcome: "referred_back" });
    await expectPgError(
      t.db.insert(s.moderationRecords).values({ decisionId: d.id, moderatorId: f.moderator.id, outcome: "upheld", findings: "again" }),
      PG.uniqueViolation,
    );
    const [v2] = await t.db
      .insert(s.assessmentDecisions)
      .values({ assessorId: d.assessorId, attemptId: d.attemptId, batchId: batch.id, outcome: "not_yet_competent", feedback: "Re-decided", supersedesId: d.id })
      .returning();
    // The re-decided version stays in the sample (sampled by work, not by version).
    await t.db.insert(s.moderationRecords).values({ decisionId: v2!.id, moderatorId: f.moderator.id, outcome: "upheld", findings: "Agree now" });
  });

  it("keeps moderated work in the sample", async () => {
    const f = await makeFixture(t.db);
    const batch = await f.batch();
    const d = await f.decision(batch.id);
    const unmoderated = await f.decision(batch.id);
    await f.moderate(d);
    const item = await f.sample(unmoderated);
    await expectPgError(
      t.db.delete(s.moderationSampleItems).where(eq(s.moderationSampleItems.batchId, batch.id)),
      PG.restrictViolation,
      /cannot be removed/,
    );
    await t.db.delete(s.moderationSampleItems).where(eq(s.moderationSampleItems.id, item.id));
  });

  it("closes only when the cohort's minimum is sampled and every sampled decision is agreed", async () => {
    const f = await makeFixture(t.db);
    await t.db.update(s.cohorts).set({ moderationRatePercent: 50 }).where(eq(s.cohorts.id, f.cohort.id));
    const batch = await f.batch();
    const [a, b, c] = [await f.decision(batch.id), await f.decision(batch.id), await f.decision(batch.id)];
    void c;
    // 50% of 3 rounds up to 2.
    await f.moderate(a!);
    await expectPgError(closeBatch(batch.id, f.moderator.id), PG.checkViolation, /sample 1 of minimum 2/);
    await f.sample(b!);
    await expectPgError(closeBatch(batch.id, f.moderator.id), PG.checkViolation, /not agreed yet/);
    await t.db.insert(s.moderationRecords).values({ decisionId: b!.id, moderatorId: f.moderator.id, outcome: "referred_back", findings: "Disagree" });
    await expectPgError(closeBatch(batch.id, f.moderator.id), PG.checkViolation, /not agreed yet/);
    const [b2] = await t.db
      .insert(s.assessmentDecisions)
      .values({ assessorId: b!.assessorId, attemptId: b!.attemptId, batchId: batch.id, outcome: "not_yet_competent", feedback: "Re-decided", supersedesId: b!.id })
      .returning();
    await t.db.insert(s.moderationRecords).values({ decisionId: b2!.id, moderatorId: f.moderator.id, outcome: "upheld", findings: "Agree" });
    await closeBatch(batch.id, f.moderator.id);
  });

  it("waits for the assessor to mark required actions done", async () => {
    const f = await makeFixture(t.db);
    const batch = await f.batch();
    const d = await f.decision(batch.id);
    const m = await f.moderate(d, { requiredActions: "Explain the NYC criteria in the feedback." });
    await expectPgError(closeBatch(batch.id, f.moderator.id), PG.checkViolation, /not agreed yet/);
    await expectPgError(
      t.db.insert(s.moderationActionCompletions).values({ moderationRecordId: m.id, doneBy: f.moderator.id, note: "Done" }),
      PG.checkViolation,
      /only the assessor/,
    );
    const [done] = await t.db
      .insert(s.moderationActionCompletions)
      .values({ moderationRecordId: m.id, doneBy: d.assessorId, note: "Feedback rewritten." })
      .returning();
    await expectPgError(
      t.db.update(s.moderationActionCompletions).set({ note: "Changed" }).where(eq(s.moderationActionCompletions.id, done!.id)),
      PG.restrictViolation,
    );
    await closeBatch(batch.id, f.moderator.id);
    // A closed batch's sample is final.
    await expectPgError(
      t.db.delete(s.moderationSampleItems).where(eq(s.moderationSampleItems.batchId, batch.id)),
      PG.restrictViolation,
      /closed/,
    );
  });

  it("refuses blank required actions", async () => {
    const f = await makeFixture(t.db);
    const batch = await f.batch();
    const d = await f.decision(batch.id);
    await expectPgError(f.moderate(d, { requiredActions: "   " }), PG.checkViolation);
  });
});

describe("one assessor per cohort", () => {
  it("refuses a second assessor grant on a cohort, and global assessor grants", async () => {
    const f = await makeFixture(t.db);
    await t.db.insert(s.roleGrants).values({ userId: f.assessor.id, role: "assessor", cohortId: f.cohort.id });
    const other = await f.user("assessor");
    await expectPgError(
      t.db.insert(s.roleGrants).values({ userId: other.id, role: "assessor", cohortId: f.cohort.id }),
      PG.uniqueViolation,
    );
    await expectPgError(t.db.insert(s.roleGrants).values({ userId: other.id, role: "assessor" }), PG.checkViolation);
  });
});
