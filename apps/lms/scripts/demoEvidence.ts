import { and, eq, inArray } from "drizzle-orm";
import {
  type Database,
  assessmentBlueprints,
  assessmentDecisions,
  assessmentSchedules,
  briefCriteria,
  cohorts,
  practicalBriefs,
  enrolments,
  moderationBatches,
  roleGrants,
  sections,
  modules,
  users,
} from "db";
import type { AccessContext, StaffRole } from "@/lib/access";
import { publishAnnouncement } from "@/lib/server/announcements";
import { beginAttempt, getAttemptView, saveAnswer, submitAttempt } from "@/lib/server/assessments";
import { logRestoreTest, readBackupKey, runNightlyBackup } from "@/lib/server/backup";
import { recordCurriculumReference } from "@/lib/server/complianceDocs";
import type { ServerCtx } from "@/lib/server/context";
import { createThread, replyToThread } from "@/lib/server/discussions";
import { readAuthConfig } from "@/lib/server/env";
import { backupStore } from "@/lib/server/evidenceStore";
import { scheduleSession, addRecording, setSessionAttendance, toSastLocal } from "@/lib/server/liveSessions";
import { getMarkingView, recordDecision, saveItemMarks } from "@/lib/server/marking";
import { sendMessage, startConversation } from "@/lib/server/messages";
import { closeBatch, moderateDecision, setSample } from "@/lib/server/moderation";
import { setAttendance, setIdVerified, unlockPaper } from "@/lib/server/register";
import { addLink, getBriefPage, submitPractical } from "@/lib/server/practical";
import { recordPracticalDecision, saveJudgements } from "@/lib/server/practicalMarking";
import { addSectionNote } from "@/lib/server/sectionNotes";
import { raiseTicket, replyToTicket } from "@/lib/server/tickets";

/**
 * DEMO evidence walkthrough (design.md §14, 2026-11-09). Builds on the DEMO
 * seed (`yarn workspace db db:seed`) so the DEMO cohort and the read-only
 * external evaluator can walk through every Form 5 item: two learners sit
 * the summative on today's assessment day, the assessor marks and decides,
 * the moderator samples, agrees and releases; the same for a practical task
 * (link evidence); plus a formative attempt,
 * discussion, messages, a support ticket, live sessions with attendance and
 * a recording, a section note, the 4.4 curriculum reference, a restore test
 * and (when BACKUP_ENCRYPTION_KEY and storage are configured) a real backup.
 * Everything is fake and labelled DEMO. It drives the real server functions,
 * so every rule and audit entry applies. Manual documents (licences,
 * contracts) and the learner guide are left for a person to add.
 *
 * The demo people have not signed in, so the script acts through access
 * contexts it builds for them (setup done, one passkey). Role and cohort
 * checks still come from their real grants. Local or disposable databases only.
 */

const DEMO_COHORT = "DEMO Cohort A (fake)";
const email = (k: string) => `demo.${k}@example.invalid`;

export async function seedEvidenceDemo(db: Database, now: () => Date = () => new Date()): Promise<{ created: boolean }> {
  const ctx: ServerCtx = { db, config: readAuthConfig(), ipHash: "demo-evidence-script", now };
  const [cohort] = await db.select().from(cohorts).where(eq(cohorts.name, DEMO_COHORT));
  if (!cohort) throw new Error("Run the DEMO seed first (yarn workspace db db:seed).");
  const closed = await db
    .select({ id: moderationBatches.id })
    .from(moderationBatches)
    .where(and(eq(moderationBatches.cohortId, cohort.id), eq(moderationBatches.status, "closed")));
  if (closed.length) return { created: false };

  const people = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(inArray(users.email, ["admin", "facilitator", "assessor", "moderator", "learner1", "learner2", "learner3"].map(email)));
  const grants = await db.select({ userId: roleGrants.userId, role: roleGrants.role }).from(roleGrants);
  const as = (k: string): AccessContext => {
    const id = people.find((p) => p.email === email(k))?.id;
    if (!id) throw new Error(`DEMO user ${k} not found.`);
    return {
      userId: id,
      sessionId: "demo-evidence-script",
      status: "active",
      setupComplete: true,
      roles: new Set(grants.filter((g) => g.userId === id).map((g) => g.role as StaffRole)),
      activePasskeys: 1,
    };
  };
  const admin = as("admin");
  const facilitator = as("facilitator");
  const assessor = as("assessor");
  const moderator = as("moderator");
  const learners = [as("learner1"), as("learner2")];
  const enrolmentOf = async (a: AccessContext) =>
    (await db.select({ id: enrolments.id }).from(enrolments).where(and(eq(enrolments.userId, a.userId), eq(enrolments.cohortId, cohort.id))))[0]!.id;

  const schedules = await db
    .select({ id: assessmentSchedules.id, kind: assessmentBlueprints.kind, dayId: assessmentSchedules.assessmentDayId })
    .from(assessmentSchedules)
    .innerJoin(assessmentBlueprints, eq(assessmentBlueprints.id, assessmentSchedules.blueprintId))
    .where(eq(assessmentSchedules.cohortId, cohort.id));
  const summative = schedules.find((s) => s.kind === "summative");
  const formative = schedules.find((s) => s.kind === "formative");
  if (!summative?.dayId || !formative) throw new Error("The DEMO seed's schedules are missing.");

  const answerAll = async (learner: AccessContext, attemptId: string) => {
    const first = await getAttemptView(ctx, learner, attemptId, 1);
    if (first.state !== "writing") throw new Error("Expected a paper being written.");
    for (const n of first.nav) {
      const v = await getAttemptView(ctx, learner, attemptId, n.position);
      if (v.state !== "writing") continue;
      if (v.question.type === "short_answer") await saveAnswer(ctx, learner, attemptId, n.position, { text: "[DEMO] A short written answer (fake)." });
      else await saveAnswer(ctx, learner, attemptId, n.position, { tokens: [v.question.options[0]!.token] });
    }
    await submitAttempt(ctx, learner, attemptId);
  };

  // Summative on today's assessment day: register, unlock, write, submit.
  const decisionIds: string[] = [];
  for (const learner of learners) {
    const enrolmentId = await enrolmentOf(learner);
    await setAttendance(ctx, assessor, summative.dayId, enrolmentId, "present");
    await setIdVerified(ctx, assessor, summative.dayId, enrolmentId, true);
    await unlockPaper(ctx, assessor, summative.id, enrolmentId);
    const attemptId = await beginAttempt(ctx, learner, summative.id);
    await answerAll(learner, attemptId);
    // Assessor marks the short answers and decides.
    const view = await getMarkingView(ctx, assessor, attemptId);
    for (const it of view.items.filter((i) => i.type === "short_answer")) {
      await saveItemMarks(ctx, assessor, attemptId, it.position, Object.fromEntries(it.criteria.map((c) => [c.id, c.maxMarks])), "[DEMO] Clear answer (fake).");
    }
    decisionIds.push(await recordDecision(ctx, assessor, attemptId, "competent", "[DEMO] Competent: all criteria met (fake)."));
  }
  // Moderator samples both, agrees and closes the batch (releases results).
  const [d0] = await db.select().from(assessmentDecisions).where(eq(assessmentDecisions.id, decisionIds[0]!));
  const sampled = await db.select({ attemptId: assessmentDecisions.attemptId }).from(assessmentDecisions).where(inArray(assessmentDecisions.id, decisionIds));
  await setSample(ctx, moderator, d0!.batchId, sampled.map((s) => s.attemptId!));
  for (const id of decisionIds) await moderateDecision(ctx, moderator, id, "agree", "[DEMO] Agree: marking is consistent with the memo (fake).");
  await closeBatch(ctx, moderator, d0!.batchId);

  // Practical: learner 1 submits link evidence for the evidence brief; the
  // assessor judges every criterion and decides; the moderator agrees and releases.
  const [briefSchedule] = await db
    .select({ id: assessmentSchedules.id, briefId: assessmentSchedules.briefId })
    .from(assessmentSchedules)
    .innerJoin(practicalBriefs, eq(practicalBriefs.id, assessmentSchedules.briefId))
    .where(and(eq(assessmentSchedules.cohortId, cohort.id), eq(practicalBriefs.mode, "submission")));
  if (briefSchedule?.briefId) {
    const page = await getBriefPage(ctx, learners[0]!, briefSchedule.id);
    const submissionId = page.draft!.submissionId;
    await addLink(ctx, learners[0]!, submissionId, "https://github.com/demo/fake-workstation-setup");
    await submitPractical(ctx, learners[0]!, submissionId, true);
    const criteria = await db.select({ id: briefCriteria.id }).from(briefCriteria).where(eq(briefCriteria.briefId, briefSchedule.briefId));
    await saveJudgements(ctx, assessor, submissionId, Object.fromEntries(criteria.map((c) => [c.id, { met: true, comment: "" }])));
    const pd = await recordPracticalDecision(ctx, assessor, submissionId, "competent", "[DEMO] Competent: every criterion met (fake).");
    const [pdRow] = await db.select().from(assessmentDecisions).where(eq(assessmentDecisions.id, pd));
    await setSample(ctx, moderator, pdRow!.batchId, [submissionId]);
    await moderateDecision(ctx, moderator, pd, "agree", "[DEMO] Agree: evidence meets the criteria (fake).");
    await closeBatch(ctx, moderator, pdRow!.batchId);
  }

  // A formative attempt (self-paced window).
  const formativeId = await beginAttempt(ctx, learners[0]!, formative.id);
  await answerAll(learners[0]!, formativeId);

  // Communication and support.
  const [km] = await db.select({ id: modules.id }).from(modules).where(and(eq(modules.qualificationId, cohort.qualificationId), eq(modules.type, "knowledge")));
  await publishAnnouncement(ctx, facilitator, { cohortId: cohort.id, title: "[DEMO] Live Q&A this week", body: "[DEMO] Bring your questions to Thursday's Zoom session (fake).", pin: true });
  const threadId = await createThread(ctx, facilitator, { cohortId: cohort.id, moduleId: km!.id, title: "[DEMO] Questions about this module", body: "[DEMO] Ask anything about the module here (fake)." });
  await replyToThread(ctx, learners[0]!, { threadId, body: "[DEMO] Is the summative open book? (fake)" });
  const conv = await startConversation(ctx, learners[1]!, { cohortId: cohort.id, staffId: facilitator.userId, body: "[DEMO] I may be late on Saturday (fake)." });
  await sendMessage(ctx, facilitator, conv, "[DEMO] Thanks for letting me know (fake).");
  const ticketId = await raiseTicket(ctx, learners[0]!, { category: "academic", subject: "[DEMO] Section 2 question", body: "[DEMO] I don't follow the second example (fake)." });
  await replyToTicket(ctx, facilitator, ticketId, "[DEMO] Let's go through it in Thursday's session (fake).", "staff");
  const t = now().getTime();
  const past = await scheduleSession(ctx, facilitator, {
    cohortId: cohort.id,
    moduleId: km!.id,
    title: "[DEMO] Module introduction",
    details: "[DEMO] Overview of the module (fake).",
    startsAt: toSastLocal(new Date(t - 2 * 86_400_000)),
    durationMinutes: 60,
    joinUrl: "https://zoom.us/j/0000000000",
  });
  for (const learner of [...learners, as("learner3")]) {
    await setSessionAttendance(ctx, facilitator, past, await enrolmentOf(learner), learner === learners[1] ? "late" : "present");
  }
  await addRecording(ctx, facilitator, past, "https://zoom.us/rec/share/demo-fake");
  await scheduleSession(ctx, facilitator, {
    cohortId: cohort.id,
    moduleId: km!.id,
    title: "[DEMO] Live Q&A",
    details: "[DEMO] Questions and answers (fake).",
    startsAt: toSastLocal(new Date(t + 3 * 86_400_000)),
    durationMinutes: 60,
    joinUrl: "https://zoom.us/j/0000000001",
  });
  const [firstSection] = await db.select({ id: sections.id }).from(sections).where(eq(sections.moduleId, km!.id)).orderBy(sections.sortOrder).limit(1);
  await addSectionNote(ctx, facilitator, {
    cohortId: cohort.id,
    sectionId: firstSection!.id,
    body: "[DEMO] Tip: watch the recording of the module introduction (fake).",
    recordingUrl: "https://zoom.us/rec/share/demo-fake",
    recordingLabel: "[DEMO] Module introduction",
  });

  // 4.4 curriculum reference, a restore test, and a real backup when configured.
  await recordCurriculumReference(ctx, admin, {
    qualificationId: cohort.qualificationId,
    documentTitle: "[DEMO] Curriculum document (fake)",
    curriculumCode: "DEMO-000000",
    version: "1.0",
    location: "Section 3: modules (fake)",
    note: "[DEMO] Lists Knowledge and Practical modules only (fake).",
  });
  if (readBackupKey() && backupStore().store.kind !== "none") await runNightlyBackup(ctx);
  await logRestoreTest(ctx, admin, {
    // Yesterday in SAST: the test is logged at 12:00 SAST, so "today" is in the future before noon.
    testedOn: new Date(t + 2 * 3_600_000 - 86_400_000).toISOString().slice(0, 10),
    result: "ok",
    notes: "[DEMO] Restored a backup to a scratch database and checked row counts (fake).",
  });
  return { created: true };
}
