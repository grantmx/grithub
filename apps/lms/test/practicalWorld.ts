import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  type Database,
  assessmentDays,
  assessmentSchedules,
  briefCriteria,
  briefVariants,
  enrolments,
  modules,
  practicalBriefs,
  roleGrants,
} from "db";
import { makeCohort, makeUser } from "./helpers";

/** A published practical brief (3 criteria, `variants` variants) scheduled for a cohort. All fake. */
export async function makePracticalWorld(
  db: Database,
  opts: { mode?: "submission" | "observed"; variants?: number; maxAttempts?: number } = {},
) {
  const cohort = await makeCohort(db);
  const [mod] = await db
    .insert(modules)
    .values({
      qualificationId: cohort.qualificationId,
      code: `PM-${randomBytes(3).toString("hex")}`,
      type: "practical",
      title: "Test practical module (fake)",
      credits: 4,
    })
    .returning();
  const mode = opts.mode ?? "submission";
  const [brief] = await db
    .insert(practicalBriefs)
    .values({
      moduleId: mod!.id,
      curriculumComponentRef: "PM-PS01",
      title: `Test ${mode} brief (fake)`,
      instructions: "Do the task (fake).",
      assessmentCriteria: "AC1 AC2 AC3",
      mode,
      maxAttempts: opts.maxAttempts ?? 2,
    })
    .returning();
  const criteria = await db
    .insert(briefCriteria)
    .values(["AC1", "AC2", "AC3"].map((code, i) => ({ briefId: brief!.id, code, label: `Criterion ${code} (fake)`, sortOrder: i + 1 })))
    .returning();
  const variants = await db
    .insert(briefVariants)
    .values(
      Array.from({ length: opts.variants ?? 3 }, (_, i) => ({
        briefId: brief!.id,
        label: String.fromCharCode(65 + i),
        variantInstructions: `Variant ${String.fromCharCode(65 + i)} instructions (fake)`,
        status: "active" as const,
      })),
    )
    .returning();
  await db.update(practicalBriefs).set({ status: "published", publishedAt: new Date() }).where(eq(practicalBriefs.id, brief!.id));
  const now = Date.now();
  let dayId: string | null = null;
  if (mode === "observed") {
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
      briefId: brief!.id,
      assessmentDayId: dayId,
      opensAt: new Date(now - 3_600_000),
      closesAt: new Date(now + 86_400_000),
    })
    .returning();

  const learner = async () => {
    const user = await makeUser(db, { cohortId: cohort.id });
    const [e] = await db.select().from(enrolments).where(eq(enrolments.userId, user.id));
    return { user, enrolmentId: e!.id };
  };
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
      expiresAt: role === "external_evaluator" ? new Date(now + 86_400_000) : null,
    });
    return user;
  };
  return { cohort, module: mod!, brief: brief!, criteria, variants, schedule: schedule!, dayId, learner, staff };
}
