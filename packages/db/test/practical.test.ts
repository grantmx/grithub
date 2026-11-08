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

const one = <T>(rows: T[]): T => {
  const r = rows[0];
  if (!r) throw new Error("no row");
  return r;
};

/** A published practical brief (2 criteria, 2 variants) and a draft submission. */
async function practical() {
  const f = await makeFixture(t.db);
  const mod = one(
    await t.db
      .insert(s.modules)
      .values({
        qualificationId: f.qualification.id,
        code: `TEST-PM-${Math.random().toString(36).slice(2, 7)}`,
        type: "practical",
        title: "Test practical (fake)",
        credits: 1,
      })
      .returning(),
  );
  const brief = one(
    await t.db
      .insert(s.practicalBriefs)
      .values({
        moduleId: mod.id,
        curriculumComponentRef: "TEST-PS01",
        title: "Test brief (fake)",
        instructions: "Do the thing (fake)",
        assessmentCriteria: "AC1, AC2",
      })
      .returning(),
  );
  const criteria = await t.db
    .insert(s.briefCriteria)
    .values([
      { briefId: brief.id, code: "AC1", label: "First (fake)", sortOrder: 1 },
      { briefId: brief.id, code: "AC2", label: "Second (fake)", sortOrder: 2 },
    ])
    .returning();
  const variants = await t.db
    .insert(s.briefVariants)
    .values([
      { briefId: brief.id, label: "A", variantInstructions: "A (fake)", status: "active" },
      { briefId: brief.id, label: "B", variantInstructions: "B (fake)", status: "active" },
    ])
    .returning();
  await t.db
    .update(s.practicalBriefs)
    .set({ status: "published", publishedAt: new Date() })
    .where(eq(s.practicalBriefs.id, brief.id));
  const submission = one(
    await t.db
      .insert(s.submissions)
      .values({
        enrolmentId: f.enrolment.id,
        briefId: brief.id,
        briefVariantId: variants[0]!.id,
        attemptNo: 1,
        seed: "seed-test",
      })
      .returning(),
  );
  const file = (submissionId = submission.id, source: "learner" | "assessor" = "learner") =>
    t.db
      .insert(s.evidenceItems)
      .values({
        submissionId,
        kind: "file",
        source,
        addedBy: source === "learner" ? f.learner.id : f.assessor.id,
        storagePathname: `evidence/${Math.random().toString(36).slice(2)}/photo.jpg`,
        fileName: "photo.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1234,
        checksumSha256: "a".repeat(64),
      })
      .returning();
  const submit = () =>
    t.db
      .update(s.submissions)
      .set({ status: "submitted", submittedAt: new Date(), linksConfirmed: true })
      .where(eq(s.submissions.id, submission.id));
  const batch = async () =>
    one(
      await t.db
        .insert(s.moderationBatches)
        .values({ cohortId: f.cohort.id, briefId: brief.id })
        .returning(),
    );
  return { f, mod, brief, criteria, variants, submission, file, submit, batch };
}

describe("practical briefs", () => {
  it("lock their criteria, variants and settings once published", async () => {
    const p = await practical();
    await expectPgError(
      t.db.insert(s.briefCriteria).values({ briefId: p.brief.id, code: "AC3", label: "x", sortOrder: 3 }),
      PG.restrictViolation,
      /published/,
    );
    await expectPgError(
      t.db.update(s.briefVariants).set({ variantInstructions: "changed" }).where(eq(s.briefVariants.id, p.variants[0]!.id)),
      PG.restrictViolation,
    );
    await expectPgError(
      t.db.update(s.practicalBriefs).set({ maxAttempts: 5 }).where(eq(s.practicalBriefs.id, p.brief.id)),
      PG.restrictViolation,
    );
    await t.db.update(s.practicalBriefs).set({ title: "Renamed (fake)" }).where(eq(s.practicalBriefs.id, p.brief.id));
  });
});

describe("submissions", () => {
  it("never change the assigned variant or seed", async () => {
    const p = await practical();
    await expectPgError(
      t.db.update(s.submissions).set({ briefVariantId: p.variants[1]!.id }).where(eq(s.submissions.id, p.submission.id)),
      PG.restrictViolation,
      /assigned variant/,
    );
  });

  it("are one per learner, brief and attempt", async () => {
    const p = await practical();
    await expectPgError(
      t.db.insert(s.submissions).values({
        enrolmentId: p.f.enrolment.id,
        briefId: p.brief.id,
        briefVariantId: p.variants[1]!.id,
        attemptNo: 1,
        seed: "other",
      }),
      PG.uniqueViolation,
    );
  });

  it("can't be un-submitted or deleted", async () => {
    const p = await practical();
    await p.submit();
    await expectPgError(
      t.db.update(s.submissions).set({ status: "draft", submittedAt: null }).where(eq(s.submissions.id, p.submission.id)),
      PG.restrictViolation,
    );
    await expectPgError(t.db.delete(s.submissions).where(eq(s.submissions.id, p.submission.id)), PG.restrictViolation);
  });
});

describe("evidence", () => {
  it("can change while draft, freezes for the learner at submission", async () => {
    const p = await practical();
    const [a] = await p.file();
    await t.db.delete(s.evidenceItems).where(eq(s.evidenceItems.id, a!.id));
    const [b] = await p.file();
    await p.submit();
    await expectPgError(p.file(), PG.restrictViolation, /after it is submitted/);
    await expectPgError(t.db.delete(s.evidenceItems).where(eq(s.evidenceItems.id, b!.id)), PG.restrictViolation);
    // The scan status can still be recorded.
    await t.db
      .update(s.evidenceItems)
      .set({ scanStatus: "clean", scannedAt: new Date() })
      .where(eq(s.evidenceItems.id, b!.id));
  });

  it("lets an assessor add evidence until a decision is recorded", async () => {
    const p = await practical();
    await p.submit();
    await p.file(p.submission.id, "assessor");
    const batch = await p.batch();
    await t.db.insert(s.assessmentDecisions).values({
      assessorId: p.f.assessor.id,
      submissionId: p.submission.id,
      batchId: batch.id,
      outcome: "competent",
      feedback: "Fine (fake)",
    });
    await expectPgError(p.file(p.submission.id, "assessor"), PG.restrictViolation, /locked once a decision/);
  });

  it("requires https links and verified file fields", async () => {
    const p = await practical();
    await expectPgError(
      t.db.insert(s.evidenceItems).values({
        submissionId: p.submission.id,
        kind: "link",
        addedBy: p.f.learner.id,
        linkUrl: "http://example.invalid/x",
        linkHost: "example.invalid",
      }),
      PG.checkViolation,
    );
    await expectPgError(
      t.db.insert(s.evidenceItems).values({
        submissionId: p.submission.id,
        kind: "file",
        addedBy: p.f.learner.id,
        storagePathname: "evidence/x",
        fileName: "x",
        mimeType: "image/png",
        sizeBytes: 10,
        checksumSha256: "not-a-checksum",
      }),
      PG.checkViolation,
    );
  });
});

describe("criterion judgements and decisions", () => {
  it("need submitted work and the brief's own criteria, and lock at decision", async () => {
    const p = await practical();
    await expectPgError(
      t.db.insert(s.criterionJudgements).values({
        submissionId: p.submission.id,
        criterionId: p.criteria[0]!.id,
        met: true,
        judgedBy: p.f.assessor.id,
      }),
      PG.checkViolation,
      /not been submitted/,
    );
    const batch = await p.batch();
    await expectPgError(
      t.db.insert(s.assessmentDecisions).values({
        assessorId: p.f.assessor.id,
        submissionId: p.submission.id,
        batchId: batch.id,
        outcome: "competent",
        feedback: "x",
      }),
      PG.checkViolation,
      /not been submitted/,
    );
    await p.submit();
    const other = await practical();
    await expectPgError(
      t.db.insert(s.criterionJudgements).values({
        submissionId: p.submission.id,
        criterionId: other.criteria[0]!.id,
        met: true,
        judgedBy: p.f.assessor.id,
      }),
      PG.checkViolation,
      /does not belong/,
    );
    const [j] = await t.db
      .insert(s.criterionJudgements)
      .values({ submissionId: p.submission.id, criterionId: p.criteria[0]!.id, met: false, judgedBy: p.f.assessor.id })
      .returning();
    await t.db.insert(s.assessmentDecisions).values({
      assessorId: p.f.assessor.id,
      submissionId: p.submission.id,
      batchId: batch.id,
      outcome: "not_yet_competent",
      feedback: "Not yet (fake)",
    });
    await expectPgError(
      t.db.update(s.criterionJudgements).set({ met: true }).where(eq(s.criterionJudgements.id, j!.id)),
      PG.restrictViolation,
    );
    expect(j!.tenantId).toBe("00000000-0000-4000-8000-000000000001");
  });
});
