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
  demoObservedBrief,
  demoShortAnswers,
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
    // Practical briefs: criteria and variants are added while draft, then the
    // brief is published (they lock). One evidence brief, one observed brief.
    const briefIds: Record<"evidence" | "observed", string> = { evidence: "", observed: "" };
    for (const [key, b, mode] of [
      ["evidence", demoBrief, "submission"],
      ["observed", demoObservedBrief, "observed"],
    ] as const) {
      const [brief] = await tx
        .insert(s.practicalBriefs)
        .values({
          moduleId: pmId,
          curriculumComponentRef: b.component,
          title: b.title,
          instructions: b.instructions,
          assessmentCriteria: b.assessmentCriteria,
          mode,
        })
        .returning({ id: s.practicalBriefs.id });
      const briefId = must(brief).id;
      briefIds[key] = briefId;
      await tx.insert(s.briefCriteria).values(
        b.criteria.map((c, i) => ({
          briefId,
          code: c.code,
          label: c.label,
          guidance: c.guidance || null,
          sortOrder: i + 1,
        })),
      );
      await tx.insert(s.briefVariants).values(
        b.variants.map((v) => ({ ...v, briefId, status: "active" as const })),
      );
      await tx
        .update(s.practicalBriefs)
        .set({ status: "published", publishedAt: now })
        .where(eq(s.practicalBriefs.id, briefId));
    }

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

    // Short-answer bank (summative only): assessor-marked with a rubric.
    const firstComponent = must(demoKnowledgeSections[0]).component;
    const [saBank] = await tx
      .insert(s.questionBanks)
      .values({
        moduleId: kmId,
        curriculumComponentRef: firstComponent,
        title: `DEMO short answers: ${firstComponent}`,
      })
      .returning({ id: s.questionBanks.id });
    for (const qa of demoShortAnswers) {
      const [question] = await tx
        .insert(s.questions)
        .values({ bankId: must(saBank).id, status: "active" })
        .returning({ id: s.questions.id });
      const [version] = await tx
        .insert(s.questionVersions)
        .values({
          questionId: must(question).id,
          versionNo: 1,
          stem: qa.stem,
          type: "short_answer",
          maxMarks: qa.criteria.reduce((sum, c) => sum + c.maxMarks, 0),
        })
        .returning({ id: s.questionVersions.id });
      await tx.insert(s.rubricCriteria).values(
        qa.criteria.map((c, i) => ({
          questionVersionId: must(version).id,
          label: c.label,
          guidance: c.guidance,
          maxMarks: c.maxMarks,
          sortOrder: i + 1,
        })),
      );
      await tx
        .update(s.questions)
        .set({ currentVersionId: must(version).id })
        .where(eq(s.questions.id, must(question).id));
    }

    // Formative blueprint: 2 questions from each of the 3 banks. Rules are
    // added while it is a draft, then it is published (rules lock).
    const [blueprint] = await tx
      .insert(s.assessmentBlueprints)
      .values({
        moduleId: kmId,
        title: "DEMO Formative assessment 1",
        kind: "formative",
        maxAttempts: 2,
        timeLimitMinutes: 30,
        passMarkPercent: 60,
        showAnswers: true,
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
    // Summative blueprint: 1 question per bank + 1 short answer, at an assessment day.
    const [summative] = await tx
      .insert(s.assessmentBlueprints)
      .values({
        moduleId: kmId,
        title: "DEMO Summative assessment",
        kind: "summative",
        maxAttempts: 2,
        timeLimitMinutes: 45,
        passMarkPercent: 60,
        inPersonOnly: true,
        showAnswers: false,
      })
      .returning({ id: s.assessmentBlueprints.id });
    await tx.insert(s.blueprintRules).values([
      ...bankIds.map((bankId, i) => ({
        blueprintId: must(summative).id,
        bankId,
        curriculumComponentRef: must(demoKnowledgeSections[i]).component,
        questionCount: 1,
      })),
      {
        blueprintId: must(summative).id,
        bankId: must(saBank).id,
        curriculumComponentRef: firstComponent,
        questionCount: 1,
      },
    ]);
    await tx
      .update(s.assessmentBlueprints)
      .set({ status: "published", publishedAt: now })
      .where(eq(s.assessmentBlueprints.moduleId, kmId));

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

    // Assessment day today (so the demo register works) and the schedules.
    const [day] = await tx
      .insert(s.assessmentDays)
      .values({ cohortId, heldOn: isoDate(now), venue: "DEMO Venue (fake)" })
      .returning({ id: s.assessmentDays.id });
    await tx.insert(s.assessmentSchedules).values([
      {
        cohortId,
        blueprintId: must(blueprint).id,
        opensAt: new Date(now.getTime() - DAY_MS),
        closesAt: new Date(now.getTime() + 60 * DAY_MS),
        createdBy: userIds.admin,
      },
      {
        cohortId,
        blueprintId: must(summative).id,
        assessmentDayId: must(day).id,
        opensAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        closesAt: new Date(now.getTime() + 18 * 60 * 60 * 1000),
        createdBy: userIds.admin,
      },
      {
        cohortId,
        briefId: briefIds.evidence,
        opensAt: new Date(now.getTime() - DAY_MS),
        closesAt: new Date(now.getTime() + 60 * DAY_MS),
        createdBy: userIds.admin,
      },
      {
        cohortId,
        briefId: briefIds.observed,
        assessmentDayId: must(day).id,
        opensAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        closesAt: new Date(now.getTime() + 18 * 60 * 60 * 1000),
        createdBy: userIds.admin,
      },
    ]);
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
