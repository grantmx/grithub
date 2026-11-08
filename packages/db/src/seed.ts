import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { createDb, type Database } from "./client";
import { isLocalUrl, readDbConfig } from "./env";
import * as s from "./schema";
import {
  DEMO_QUALIFICATION_CODE,
  type DemoUserKey,
  demoBrief,
  demoKnowledgeSections,
  demoPracticalSection,
  demoLibrary,
  demoUsers,
} from "./seed-data";

const DAY_MS = 24 * 60 * 60 * 1000;

export type SeedResult = { created: boolean; qualificationId: string };

/**
 * Insert the DEMO qualification, content, question bank and demo users.
 * Idempotent: does nothing if the DEMO qualification already exists.
 */
export async function seedDemo(
  db: Database,
  now: Date = new Date(),
): Promise<SeedResult> {
  const existing = await db
    .select({ id: s.qualifications.id })
    .from(s.qualifications)
    .where(eq(s.qualifications.curriculumCode, DEMO_QUALIFICATION_CODE));
  if (existing[0]) {
    return { created: false, qualificationId: existing[0].id };
  }

  return db.transaction(async (tx) => {
    // Users: one per role, plus three learners. Learners get access via enrolment.
    const userIds = {} as Record<DemoUserKey, string>;
    for (const [key, u] of Object.entries(demoUsers) as [
      DemoUserKey,
      (typeof demoUsers)[DemoUserKey],
    ][]) {
      const [row] = await tx
        .insert(s.users)
        .values({ ...u, status: "active" })
        .returning({ id: s.users.id });
      userIds[key] = must(row).id;
    }

    const [qualification] = await tx
      .insert(s.qualifications)
      .values({
        curriculumCode: DEMO_QUALIFICATION_CODE,
        saqaId: "DEMO-SAQA-000000",
        title:
          "DEMO Qualification: Sample Occupational Certificate (fake data)",
        nqfLevel: 4,
        status: "draft",
      })
      .returning({ id: s.qualifications.id });
    const qualificationId = must(qualification).id;

    const [km] = await tx
      .insert(s.modules)
      .values({
        qualificationId,
        code: "DEMO-KM-01",
        type: "knowledge",
        title: "DEMO Knowledge Module: Computer basics (fake)",
        credits: 8,
        sortOrder: 1,
      })
      .returning({ id: s.modules.id });
    const [pm] = await tx
      .insert(s.modules)
      .values({
        qualificationId,
        code: "DEMO-PM-01",
        type: "practical",
        title: "DEMO Practical Module: Workstation setup (fake)",
        credits: 6,
        sortOrder: 2,
      })
      .returning({ id: s.modules.id });
    const kmId = must(km).id;
    const pmId = must(pm).id;

    // Knowledge sections: text (core) + optional media placeholder + bank + pool.
    const bankIds: string[] = [];
    for (const [i, sec] of demoKnowledgeSections.entries()) {
      const [section] = await tx
        .insert(s.sections)
        .values({
          moduleId: kmId,
          title: sec.title,
          curriculumComponentRef: sec.component,
          sortOrder: i + 1,
        })
        .returning({ id: s.sections.id });
      const sectionId = must(section).id;

      if (sec.media) {
        await tx.insert(s.contentItems).values({
          sectionId,
          kind: sec.media.kind,
          title: `DEMO ${sec.media.kind} placeholder`,
          mediaAssetId: sec.media.assetId,
          mediaPlaybackId: `${sec.media.assetId}-PLAYBACK`,
          mediaSizeBytes: sec.media.sizeBytes,
          durationSeconds: sec.media.durationSeconds,
          transcript: sec.media.transcript,
          transcriptIsSectionText: sec.media.transcript === null,
          captionsLanguage: sec.media.kind === "video" ? "en" : null,
          sortOrder: 0,
          status: "published",
        });
      }
      await tx.insert(s.contentItems).values({
        sectionId,
        kind: "text",
        title: sec.title,
        body: sec.body,
        sortOrder: 1,
        status: "published",
      });

      const [bank] = await tx
        .insert(s.questionBanks)
        .values({
          moduleId: kmId,
          curriculumComponentRef: sec.component,
          title: `DEMO bank: ${sec.component}`,
        })
        .returning({ id: s.questionBanks.id });
      const bankId = must(bank).id;
      bankIds.push(bankId);

      const [pool] = await tx
        .insert(s.sectionQuestionPools)
        .values({ sectionId, minPoolSize: 3 })
        .returning({ id: s.sectionQuestionPools.id });
      const poolId = must(pool).id;

      for (const q of sec.questions) {
        const [question] = await tx
          .insert(s.questions)
          .values({ bankId, status: "active" })
          .returning({ id: s.questions.id });
        const questionId = must(question).id;

        const [version] = await tx
          .insert(s.questionVersions)
          .values({
            questionId,
            versionNo: 1,
            stem: q.stem,
            feedback: q.feedback,
            type: "single",
          })
          .returning({ id: s.questionVersions.id });
        const versionId = must(version).id;

        await tx.insert(s.answerOptions).values(
          q.options.map((o, idx) => ({
            questionVersionId: versionId,
            label: o.label,
            isCorrect: o.correct ?? false,
            pinnedPosition: o.pinned ?? null,
            authorOrder: idx + 1,
          })),
        );
        await tx
          .update(s.questions)
          .set({ currentVersionId: versionId })
          .where(eq(s.questions.id, questionId));
        await tx.insert(s.sectionPoolQuestions).values({ poolId, questionId });
      }
    }

    // Practical module: one text section, one brief with two variants.
    const [psec] = await tx
      .insert(s.sections)
      .values({
        moduleId: pmId,
        title: demoPracticalSection.title,
        curriculumComponentRef: demoPracticalSection.component,
        sortOrder: 1,
      })
      .returning({ id: s.sections.id });
    await tx.insert(s.contentItems).values({
      sectionId: must(psec).id,
      kind: "text",
      title: demoPracticalSection.title,
      body: demoPracticalSection.body,
      status: "published",
    });
    const [brief] = await tx
      .insert(s.practicalBriefs)
      .values({
        moduleId: pmId,
        curriculumComponentRef: demoBrief.component,
        title: demoBrief.title,
        instructions: demoBrief.instructions,
        assessmentCriteria: demoBrief.assessmentCriteria,
      })
      .returning({ id: s.practicalBriefs.id });
    await tx.insert(s.briefVariants).values(
      demoBrief.variants.map((v) => ({
        ...v,
        briefId: must(brief).id,
        status: "active" as const,
      })),
    );

    await tx.insert(s.libraryResources).values(
      demoLibrary.map((r, i) => ({
        qualificationId,
        title: r.title,
        description: r.description,
        kind: "link" as const,
        url: r.url,
        sortOrder: i,
        published: true,
      })),
    );

    // Formative blueprint: 2 questions from each of the 3 banks.
    const [blueprint] = await tx
      .insert(s.assessmentBlueprints)
      .values({
        moduleId: kmId,
        title: "DEMO Formative assessment 1",
        kind: "formative",
        maxAttempts: 2,
        timeLimitMinutes: 30,
        passMarkPercent: 60,
      })
      .returning({ id: s.assessmentBlueprints.id });
    await tx.insert(s.blueprintRules).values(
      bankIds.map((bankId, i) => ({
        blueprintId: must(blueprint).id,
        bankId,
        curriculumComponentRef: must(demoKnowledgeSections[i]).component,
        questionCount: 2,
      })),
    );

    // Cohort, roles, enrolments.
    const [cohort] = await tx
      .insert(s.cohorts)
      .values({
        qualificationId,
        name: "DEMO Cohort A (fake)",
        startsOn: isoDate(now),
        endsOn: isoDate(new Date(now.getTime() + 180 * DAY_MS)),
      })
      .returning({ id: s.cohorts.id });
    const cohortId = must(cohort).id;

    await tx.insert(s.roleGrants).values([
      { userId: userIds.admin, role: "sdp_admin" },
      {
        userId: userIds.facilitator,
        role: "facilitator",
        cohortId,
        grantedBy: userIds.admin,
      },
      {
        userId: userIds.assessor,
        role: "assessor",
        cohortId,
        grantedBy: userIds.admin,
      },
      {
        userId: userIds.moderator,
        role: "moderator",
        cohortId,
        grantedBy: userIds.admin,
      },
      {
        userId: userIds.evaluator,
        role: "external_evaluator",
        expiresAt: new Date(now.getTime() + 30 * DAY_MS),
        grantedBy: userIds.admin,
      },
    ]);
    await tx.insert(s.enrolments).values(
      (["learner1", "learner2", "learner3"] as const).map((k) => ({
        userId: userIds[k],
        cohortId,
      })),
    );

    await tx.insert(s.assessmentDays).values({
      cohortId,
      heldOn: isoDate(new Date(now.getTime() + 14 * DAY_MS)),
      venue: "DEMO Venue (fake)",
    });
    await tx
      .insert(s.moderationBatches)
      .values({ cohortId, blueprintId: must(blueprint).id });
    await tx.insert(s.announcements).values({
      cohortId,
      authorId: userIds.facilitator,
      title: "[DEMO] Welcome to the demo cohort",
      body: "[DEMO] This is a fake announcement for testing.",
      publishedAt: now,
    });
    await tx.insert(s.auditLog).values({
      action: "seed.demo",
      entityType: "qualification",
      entityId: qualificationId,
      after: { note: "DEMO seed data created" },
    });

    return { created: true, qualificationId };
  });
}

function must<T>(row: T | undefined): T {
  if (row === undefined) throw new Error("Expected a row to be returned");
  return row;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Refuse to seed production-like targets unless explicitly allowed. */
export function assertSeedAllowed(
  env: Record<string, string | undefined>,
  url: string,
): void {
  if (env.NODE_ENV === "production" || env.VERCEL_ENV === "production") {
    throw new Error("Refusing to seed DEMO data in a production environment.");
  }
  if (!isLocalUrl(url) && env.ALLOW_DEMO_SEED !== "true") {
    throw new Error(
      "Refusing to seed a non-local database. Set ALLOW_DEMO_SEED=true if this is a disposable environment.",
    );
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const config = readDbConfig();
  assertSeedAllowed(process.env, config.url);
  const { db, close } = createDb(config);
  seedDemo(db)
    .then((r) => {
      console.log(
        r.created
          ? "DEMO seed created."
          : "DEMO seed already present; nothing to do.",
      );
    })
    .catch((error: unknown) => {
      console.error(
        "Seed failed:",
        error instanceof Error ? error.message : error,
      );
      process.exitCode = 1;
    })
    .finally(() => close());
}
