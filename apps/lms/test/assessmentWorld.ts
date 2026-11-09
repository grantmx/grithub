import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  type Database,
  answerOptions,
  assessmentBlueprints,
  assessmentDays,
  assessmentSchedules,
  blueprintRules,
  modules,
  questionBanks,
  questions,
  questionVersions,
  roleGrants,
  rubricCriteria,
  sections,
} from "db";
import { makeCohort, makeUser } from "./helpers";

/** All data here is fake test data. */
export async function makeAssessmentWorld(
  db: Database,
  opts: {
    kind: "formative" | "summative";
    rules?: number;
    perRule?: number;
    bankSize?: number;
    timeLimitMinutes?: number | null;
    maxAttempts?: number;
    showAnswers?: boolean;
    /** Add a bank of short-answer questions (summative) and draw `shortAnswers` from it. */
    shortAnswers?: number;
    /** Schedule window relative to now (ms). */
    opensInMs?: number;
    closesInMs?: number;
  },
) {
  const cohort = await makeCohort(db);
  const [mod] = await db
    .insert(modules)
    .values({
      qualificationId: cohort.qualificationId,
      code: `KM-${randomBytes(3).toString("hex")}`,
      type: "knowledge",
      title: "Test knowledge module (fake)",
      credits: 4,
    })
    .returning();
  const ruleCount = opts.rules ?? 3;
  const bankSize = opts.bankSize ?? 6;
  const perRule = opts.perRule ?? 2;
  const banks: { id: string; component: string; questionIds: string[] }[] = [];

  for (let r = 1; r <= ruleCount; r++) {
    const component = `KM-KT0${r}`;
    await db.insert(sections).values({ moduleId: mod!.id, title: `Section ${r} (fake)`, curriculumComponentRef: component, sortOrder: r });
    const [bank] = await db
      .insert(questionBanks)
      .values({ moduleId: mod!.id, curriculumComponentRef: component, title: `Bank ${component} (fake)` })
      .returning();
    const questionIds: string[] = [];
    for (let i = 1; i <= bankSize; i++) {
      const [q] = await db.insert(questions).values({ bankId: bank!.id, status: "active" }).returning();
      const [v] = await db
        .insert(questionVersions)
        .values({ questionId: q!.id, versionNo: 1, stem: `${component} question ${i} (fake)?`, feedback: `Explanation ${component}-${i} (fake)` })
        .returning();
      await db.insert(answerOptions).values([
        { questionVersionId: v!.id, label: `Right ${component}-${i}`, isCorrect: true, authorOrder: 1 },
        { questionVersionId: v!.id, label: `Wrong A ${component}-${i}`, authorOrder: 2 },
        { questionVersionId: v!.id, label: `Wrong B ${component}-${i}`, authorOrder: 3 },
        { questionVersionId: v!.id, label: "None of the above", authorOrder: 4, pinnedPosition: -1 },
      ]);
      await db.update(questions).set({ currentVersionId: v!.id }).where(eq(questions.id, q!.id));
      questionIds.push(q!.id);
    }
    banks.push({ id: bank!.id, component, questionIds });
  }

  if (opts.shortAnswers) {
    const component = "KM-KT09";
    await db.insert(sections).values({ moduleId: mod!.id, title: "Short answers (fake)", curriculumComponentRef: component, sortOrder: 9 });
    const [bank] = await db
      .insert(questionBanks)
      .values({ moduleId: mod!.id, curriculumComponentRef: component, title: "Short-answer bank (fake)" })
      .returning();
    const questionIds: string[] = [];
    for (let i = 1; i <= opts.shortAnswers + 1; i++) {
      const [q] = await db.insert(questions).values({ bankId: bank!.id, status: "active" }).returning();
      const [v] = await db
        .insert(questionVersions)
        .values({ questionId: q!.id, versionNo: 1, stem: `Explain thing ${i} (fake)`, type: "short_answer", maxMarks: 5 })
        .returning();
      await db.insert(rubricCriteria).values([
        { questionVersionId: v!.id, label: "Names the parts", maxMarks: 3, sortOrder: 1 },
        { questionVersionId: v!.id, label: "Explains why", maxMarks: 2, sortOrder: 2 },
      ]);
      await db.update(questions).set({ currentVersionId: v!.id }).where(eq(questions.id, q!.id));
      questionIds.push(q!.id);
    }
    banks.push({ id: bank!.id, component, questionIds });
  }

  const summative = opts.kind === "summative";
  const [bp] = await db
    .insert(assessmentBlueprints)
    .values({
      moduleId: mod!.id,
      title: `Test ${opts.kind} (fake)`,
      kind: opts.kind,
      maxAttempts: opts.maxAttempts ?? (summative ? 2 : 3),
      timeLimitMinutes: opts.timeLimitMinutes === undefined ? 30 : opts.timeLimitMinutes,
      passMarkPercent: 60,
      inPersonOnly: summative,
      showAnswers: opts.showAnswers ?? !summative,
    })
    .returning();
  await db.insert(blueprintRules).values(
    banks.map((b) => ({
      blueprintId: bp!.id,
      bankId: b.id,
      curriculumComponentRef: b.component,
      questionCount: b.component === "KM-KT09" ? opts.shortAnswers! : perRule,
    })),
  );
  await db
    .update(assessmentBlueprints)
    .set({ status: "published", publishedAt: new Date() })
    .where(eq(assessmentBlueprints.id, bp!.id));

  const now = Date.now();
  let dayId: string | null = null;
  if (summative) {
    const [day] = await db
      .insert(assessmentDays)
      .values({ cohortId: cohort.id, heldOn: new Date(now).toISOString().slice(0, 10), venue: "Test venue (fake)" })
      .returning();
    dayId = day!.id;
  }
  const [schedule] = await db
    .insert(assessmentSchedules)
    .values({
      cohortId: cohort.id,
      blueprintId: bp!.id,
      assessmentDayId: dayId,
      opensAt: new Date(now + (opts.opensInMs ?? -3_600_000)),
      closesAt: new Date(now + (opts.closesInMs ?? 86_400_000)),
    })
    .returning();

  const learner = (setup = true) => makeUser(db, { cohortId: cohort.id, setupComplete: setup });
  /** Staff with a passkey and a grant for this cohort (global roles get a global grant). Not enrolled. */
  /** A cohort has one assessor (design.md §14, 2026-11-08): "assessor" always returns that person. */
  let assessorUser: Awaited<ReturnType<typeof makeUser>> | null = null;
  const staff = async (role: "assessor" | "moderator" | "facilitator" | "sdp_admin" | "external_evaluator") => {
    if (role === "assessor" && assessorUser) return assessorUser;
    const user = await makeUser(db, { passkeys: 1 });
    if (role === "assessor") assessorUser = user;
    const global = role === "sdp_admin" || role === "external_evaluator";
    await db.insert(roleGrants).values({
      userId: user.id,
      role,
      cohortId: global ? null : cohort.id,
      expiresAt: role === "external_evaluator" ? new Date(Date.now() + 86_400_000) : null,
    });
    return user;
  };

  return {
    cohort,
    module: mod!,
    blueprint: bp!,
    schedule: schedule!,
    dayId,
    banks,
    qualificationId: cohort.qualificationId,
    learner,
    staff,
  };
}
