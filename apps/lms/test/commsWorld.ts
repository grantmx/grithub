import { eq, inArray } from "drizzle-orm";
import {
  type Database,
  cohorts,
  consentRecords,
  enrolments,
  learnerQctoProfiles,
  modules,
  roleGrants,
  sections,
  users,
} from "db";
import { seedDemo } from "db/seed";
import { CURRENT_NOTICE, QCTO_SHARING_CONSENT, sharingConsentSha256 } from "@/lib/popia";
import { actorFor, makeCtx, makeUser } from "./helpers";

/**
 * The demo seed (one cohort with a knowledge module, sections with check
 * pools, three learners and one person per staff role), with setup finished
 * for everyone, plus a second facilitator on the same cohort and a second
 * cohort (same programme) with its own facilitator and learner. All fake.
 */
export async function makeCommsWorld(db: Database) {
  const { qualificationId } = await seedDemo(db);
  const demo = await db.select().from(users).where(inArray(users.email, [
    "demo.admin@example.invalid",
    "demo.facilitator@example.invalid",
    "demo.assessor@example.invalid",
    "demo.moderator@example.invalid",
    "demo.evaluator@example.invalid",
    "demo.learner1@example.invalid",
    "demo.learner2@example.invalid",
    "demo.learner3@example.invalid",
  ]));
  const byKey = (k: string) => demo.find((u) => u.email === `demo.${k}@example.invalid`)!;
  await db
    .update(users)
    .set({ popiaNoticeAcceptedAt: new Date(), popiaNoticeVersion: CURRENT_NOTICE.version })
    .where(inArray(users.id, demo.map((u) => u.id)));
  for (const k of ["learner1", "learner2", "learner3"]) {
    const id = byKey(k).id;
    await db.insert(consentRecords).values({
      userId: id,
      kind: "qcto_sharing",
      noticeVersion: QCTO_SHARING_CONSENT.version,
      noticeSha256: sharingConsentSha256(),
    });
    await db.insert(learnerQctoProfiles).values({ userId: id, confirmedAt: new Date() }).onConflictDoNothing();
  }
  const [cohort] = await db.select().from(cohorts).where(eq(cohorts.qualificationId, qualificationId));
  const mods = await db.select().from(modules).where(eq(modules.qualificationId, qualificationId));
  const km = mods.find((m) => m.type === "knowledge")!;
  const secs = await db.select().from(sections).where(eq(sections.moduleId, km.id)).orderBy(sections.sortOrder);

  // Second facilitator on the same cohort.
  const facilitator2 = await makeUser(db, { roles: [] });
  await db.insert(roleGrants).values({ userId: facilitator2.id, role: "facilitator", cohortId: cohort!.id });

  // Second cohort of the same programme: its own facilitator and learner.
  const [otherCohort] = await db
    .insert(cohorts)
    .values({ qualificationId, name: "Other cohort (fake)", startsOn: "2030-01-01", endsOn: "2030-06-30" })
    .returning();
  const otherFacilitator = await makeUser(db, { roles: [] });
  await db.insert(roleGrants).values({ userId: otherFacilitator.id, role: "facilitator", cohortId: otherCohort!.id });
  const otherLearner = await makeUser(db, { cohortId: otherCohort!.id });

  const enrolmentOf = async (userId: string) =>
    (await db.select().from(enrolments).where(eq(enrolments.userId, userId)))[0]!;

  const as = async (userId: string, now?: () => Date) => {
    const ctx = makeCtx(db, now ? { now } : {});
    return { ctx, actor: (await actorFor(ctx, userId)).actor, userId };
  };

  return {
    qualificationId,
    cohort: cohort!,
    otherCohort: otherCohort!,
    km,
    pm: mods.find((m) => m.type === "practical")!,
    sections: secs,
    ids: {
      admin: byKey("admin").id,
      facilitator: byKey("facilitator").id,
      facilitator2: facilitator2.id,
      assessor: byKey("assessor").id,
      moderator: byKey("moderator").id,
      evaluator: byKey("evaluator").id,
      learner1: byKey("learner1").id,
      learner2: byKey("learner2").id,
      learner3: byKey("learner3").id,
      otherFacilitator: otherFacilitator.id,
      otherLearner: otherLearner.id,
    },
    enrolmentOf,
    as,
  };
}
