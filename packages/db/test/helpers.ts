import { expect } from "vitest";
import type { Database } from "../src/client";
import * as s from "../src/schema";
export { createTestDb, type TestDb } from "../src/testing";

type PgLikeError = { code?: string; message?: string; cause?: unknown };

function pgError(err: unknown): PgLikeError {
  let e = err as PgLikeError | undefined;
  // Drizzle wraps driver errors; walk the cause chain to the Postgres error.
  for (let i = 0; i < 5 && e; i++) {
    if (typeof e.code === "string" && /^[0-9A-Z]{5}$/.test(e.code)) return e;
    e = e.cause as PgLikeError | undefined;
  }
  return (err as PgLikeError) ?? {};
}

/** Assert that a database operation fails with a given SQLSTATE (and message part). */
export async function expectPgError(
  op: Promise<unknown> | (() => Promise<unknown>),
  code: string,
  messagePart?: string | RegExp,
): Promise<void> {
  let caught: unknown;
  try {
    await (typeof op === "function" ? op() : op);
  } catch (err) {
    caught = err;
  }
  expect(
    caught,
    "expected the database to reject this operation",
  ).toBeDefined();
  const e = pgError(caught);
  expect(e.code).toBe(code);
  if (messagePart) expect(e.message ?? "").toMatch(messagePart);
}

export const PG = {
  restrictViolation: "23001",
  checkViolation: "23514",
  uniqueViolation: "23505",
  invalidEnum: "22P02",
} as const;

let counter = 0;
const uniq = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

/** Minimal graph used by the constraint tests (independent of the demo seed). */
export async function makeFixture(db: Database) {
  const one = <T>(rows: T[]): T => {
    const r = rows[0];
    if (!r) throw new Error("no row");
    return r;
  };
  const user = async (label: string) =>
    one(
      await db
        .insert(s.users)
        .values({
          displayName: `Test ${label}`,
          email: `test.${label}.${uniq()}@example.invalid`,
        })
        .returning(),
    );

  const learner = await user("learner");
  const assessor = await user("assessor");
  const moderator = await user("moderator");

  const qualification = one(
    await db
      .insert(s.qualifications)
      .values({
        curriculumCode: `TEST-${uniq()}`,
        title: "Test qualification",
        nqfLevel: 4,
      })
      .returning(),
  );
  const mod = one(
    await db
      .insert(s.modules)
      .values({
        qualificationId: qualification.id,
        code: "TEST-KM",
        type: "knowledge",
        title: "Test module",
        credits: 1,
      })
      .returning(),
  );
  const section = one(
    await db
      .insert(s.sections)
      .values({
        moduleId: mod.id,
        title: "Test section",
        curriculumComponentRef: "TEST-KT01",
      })
      .returning(),
  );
  const bank = one(
    await db
      .insert(s.questionBanks)
      .values({
        moduleId: mod.id,
        curriculumComponentRef: "TEST-KT01",
        title: "Test bank",
      })
      .returning(),
  );
  const question = one(
    await db.insert(s.questions).values({ bankId: bank.id }).returning(),
  );
  const version = one(
    await db
      .insert(s.questionVersions)
      .values({ questionId: question.id, versionNo: 1, stem: "Test stem?" })
      .returning(),
  );
  const options = await db
    .insert(s.answerOptions)
    .values([
      {
        questionVersionId: version.id,
        label: "Right",
        isCorrect: true,
        authorOrder: 1,
      },
      { questionVersionId: version.id, label: "Wrong", authorOrder: 2 },
    ])
    .returning();

  const cohort = one(
    await db
      .insert(s.cohorts)
      .values({
        qualificationId: qualification.id,
        name: `Test cohort ${uniq()}`,
        startsOn: "2030-01-01",
        endsOn: "2030-06-30",
      })
      .returning(),
  );
  const enrolment = one(
    await db
      .insert(s.enrolments)
      .values({ userId: learner.id, cohortId: cohort.id })
      .returning(),
  );
  const blueprint = one(
    await db
      .insert(s.assessmentBlueprints)
      .values({
        moduleId: mod.id,
        title: "Test formative",
        kind: "formative",
        passMarkPercent: 50,
      })
      .returning(),
  );

  let attemptNo = 0;
  const attempt = async () =>
    one(
      await db
        .insert(s.assessmentAttempts)
        .values({
          enrolmentId: enrolment.id,
          blueprintId: blueprint.id,
          attemptNo: ++attemptNo,
        })
        .returning(),
    );

  /** Serve the version in a new attempt (stamps first_served_at via trigger). */
  const serve = async (questionVersionId = version.id) => {
    const a = await attempt();
    return one(
      await db
        .insert(s.attemptItems)
        .values({
          attemptId: a.id,
          questionVersionId,
          position: 1,
          servedOptionOrder: options.map((o) => o.id).reverse(),
          optionTokens: { t1: must(options[0]).id, t2: must(options[1]).id },
          seed: `seed-${a.id}`,
        })
        .returning(),
    );
  };

  /** An open batch. Only one open batch may exist per cohort and blueprint, so each gets its own blueprint. */
  const batch = async () => {
    const bp = one(
      await db
        .insert(s.assessmentBlueprints)
        .values({
          moduleId: mod.id,
          title: "Test batch blueprint",
          kind: "formative",
          passMarkPercent: 50,
        })
        .returning(),
    );
    return one(
      await db
        .insert(s.moderationBatches)
        .values({ cohortId: cohort.id, blueprintId: bp.id })
        .returning(),
    );
  };

  const decision = async (batchId: string, assessorId = assessor.id) => {
    const a = await attempt();
    return one(
      await db
        .insert(s.assessmentDecisions)
        .values({
          assessorId,
          attemptId: a.id,
          batchId,
          outcome: "competent",
          feedback: "Test feedback",
        })
        .returning(),
    );
  };

  return {
    learner,
    assessor,
    moderator,
    qualification,
    module: mod,
    section,
    bank,
    question,
    version,
    options,
    cohort,
    enrolment,
    blueprint,
    attempt,
    serve,
    batch,
    decision,
    user,
  };
}

function must<T>(v: T | undefined): T {
  if (v === undefined) throw new Error("missing value");
  return v;
}
