import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  assessmentAttempts,
  assessmentBlueprints,
  assessmentDays,
  assessmentSchedules,
  attendanceRecords,
  cohorts,
  enrolments,
  paperUnlocks,
  registerSignoffs,
  users,
} from "db";
import type { AccessContext, Requirement } from "@/lib/access";
import {
  AssessmentError,
  finaliseExpired,
  nextAttemptAllowance,
  unusedUnlock,
} from "./assessments";
import { writeAudit } from "./audit";
import { authorize } from "./auth";
import type { ServerCtx } from "./context";
import { assertCohortScope, cohortScope, inScope } from "./staffScope";

/**
 * Assessment-day register (design-gate decision 2026-11-08: one row per
 * learner). Facilitators and assessors take attendance and check ID;
 * only an assessor (with a passkey) opens papers, pauses or extends an
 * attempt, and signs the register off. A signed-off register is final.
 */

const REGISTER_ROLES = ["facilitator", "assessor", "sdp_admin"] as const;
const VIEW: Requirement = { kind: "roles", anyOf: REGISTER_ROLES, stepUp: false };
const ASSESSOR: Requirement = { kind: "roles", anyOf: ["assessor"], stepUp: true };

type Ctx = ServerCtx;
export type AttendanceStatus = "present" | "late" | "absent" | "excused";
const STATUSES: readonly AttendanceStatus[] = ["present", "late", "absent", "excused"];

export async function listAssessmentDays(ctx: Ctx, actor: AccessContext | null) {
  const a = await authorize(ctx, actor, VIEW, "register.listDays");
  const scope = await cohortScope(ctx, a, REGISTER_ROLES);
  const rows = await ctx.db
    .select({
      id: assessmentDays.id,
      heldOn: assessmentDays.heldOn,
      venue: assessmentDays.venue,
      cohortId: cohorts.id,
      cohortName: cohorts.name,
      signedAt: registerSignoffs.signedAt,
      papers: sql<number>`(SELECT count(*)::int FROM "assessment_schedules" s WHERE s.assessment_day_id = "assessment_days"."id")`,
    })
    .from(assessmentDays)
    .innerJoin(cohorts, eq(cohorts.id, assessmentDays.cohortId))
    .leftJoin(registerSignoffs, eq(registerSignoffs.assessmentDayId, assessmentDays.id))
    .orderBy(desc(assessmentDays.heldOn));
  return rows.filter((r) => inScope(scope, r.cohortId));
}

async function loadDay(ctx: Ctx, dayId: string) {
  const [day] = await ctx.db
    .select({
      id: assessmentDays.id,
      heldOn: assessmentDays.heldOn,
      venue: assessmentDays.venue,
      cohortId: assessmentDays.cohortId,
      cohortName: cohorts.name,
    })
    .from(assessmentDays)
    .innerJoin(cohorts, eq(cohorts.id, assessmentDays.cohortId))
    .where(eq(assessmentDays.id, dayId));
  if (!day) throw new AssessmentError("not_found", "Assessment day not found.");
  return day;
}

export type RegisterRow = {
  enrolmentId: string;
  name: string;
  status: AttendanceStatus | null;
  idVerified: boolean;
  papers: {
    scheduleId: string;
    state: "locked" | "unlocked" | "writing" | "paused" | "submitted";
    attemptId: string | null;
    attemptNo: number | null;
    deadlineAt: Date | null;
    extraMinutes: number;
    canUnlock: boolean;
  }[];
};

export async function getRegister(ctx: Ctx, actor: AccessContext | null, dayId: string) {
  const a = await authorize(ctx, actor, VIEW, "register.view");
  const day = await loadDay(ctx, dayId);
  await assertCohortScope(ctx, a, REGISTER_ROLES, day.cohortId, "register.view");

  const schedules = await ctx.db
    .select({ schedule: assessmentSchedules, blueprint: assessmentBlueprints })
    .from(assessmentSchedules)
    .innerJoin(assessmentBlueprints, eq(assessmentBlueprints.id, assessmentSchedules.blueprintId))
    .where(eq(assessmentSchedules.assessmentDayId, dayId))
    .orderBy(asc(assessmentSchedules.opensAt));
  await finaliseExpired(ctx, schedules.map((s) => s.schedule.id));

  const learners = await ctx.db
    .select({ enrolmentId: enrolments.id, name: users.displayName })
    .from(enrolments)
    .innerJoin(users, eq(users.id, enrolments.userId))
    .where(and(eq(enrolments.cohortId, day.cohortId), eq(enrolments.status, "active")))
    .orderBy(asc(users.displayName));
  const attendance = await ctx.db
    .select()
    .from(attendanceRecords)
    .where(eq(attendanceRecords.assessmentDayId, dayId));
  const byEnrolment = new Map(attendance.map((r) => [r.enrolmentId, r]));
  const [signoff] = await ctx.db
    .select({ signedAt: registerSignoffs.signedAt, signedBy: users.displayName })
    .from(registerSignoffs)
    .innerJoin(users, eq(users.id, registerSignoffs.signedBy))
    .where(eq(registerSignoffs.assessmentDayId, dayId));

  const scheduleIds = schedules.map((s) => s.schedule.id);
  const attempts = scheduleIds.length
    ? await ctx.db
        .select()
        .from(assessmentAttempts)
        .where(inArray(assessmentAttempts.scheduleId, scheduleIds))
        .orderBy(asc(assessmentAttempts.attemptNo))
    : [];
  const unlocks = scheduleIds.length
    ? await ctx.db.select().from(paperUnlocks).where(inArray(paperUnlocks.scheduleId, scheduleIds))
    : [];

  const rows: RegisterRow[] = [];
  for (const l of learners) {
    const rec = byEnrolment.get(l.enrolmentId);
    const ready = (rec?.status === "present" || rec?.status === "late") && rec.idVerifiedAt !== null;
    const papers: RegisterRow["papers"] = [];
    for (const { schedule, blueprint } of schedules) {
      const attempt = attempts.filter((x) => x.scheduleId === schedule.id && x.enrolmentId === l.enrolmentId).at(-1);
      const hasUnusedUnlock = unlocks.some(
        (u) =>
          u.scheduleId === schedule.id &&
          u.enrolmentId === l.enrolmentId &&
          !attempts.some((x) => x.unlockId === u.id),
      );
      let state: RegisterRow["papers"][number]["state"] = "locked";
      if (attempt?.status === "in_progress") state = attempt.pausedAt ? "paused" : "writing";
      else if (hasUnusedUnlock) state = "unlocked";
      else if (attempt) state = "submitted";
      let canUnlock = false;
      if (ready && !signoff && state !== "writing" && state !== "paused" && state !== "unlocked") {
        const allowance = await nextAttemptAllowance(ctx, l.enrolmentId, blueprint);
        canUnlock = allowance.ok;
      }
      papers.push({
        scheduleId: schedule.id,
        state,
        attemptId: attempt?.id ?? null,
        attemptNo: attempt?.attemptNo ?? null,
        deadlineAt: attempt?.deadlineAt ?? null,
        extraMinutes: attempt?.extraMinutes ?? 0,
        canUnlock,
      });
    }
    rows.push({
      enrolmentId: l.enrolmentId,
      name: l.name,
      status: (rec?.status as AttendanceStatus | undefined) ?? null,
      idVerified: rec?.idVerifiedAt != null,
      papers,
    });
  }
  return {
    day,
    schedules: schedules.map((s) => ({
      id: s.schedule.id,
      title: s.blueprint.title,
      opensAt: s.schedule.opensAt,
      closesAt: s.schedule.closesAt,
      timeLimitMinutes: s.blueprint.timeLimitMinutes,
    })),
    rows,
    signoff: signoff ?? null,
    canAssess: a.roles.has("assessor") && a.activePasskeys > 0,
  };
}

async function requireEnrolledInDay(ctx: Ctx, dayId: string, enrolmentId: string) {
  const day = await loadDay(ctx, dayId);
  const [e] = await ctx.db
    .select({ id: enrolments.id })
    .from(enrolments)
    .where(and(eq(enrolments.id, enrolmentId), eq(enrolments.cohortId, day.cohortId)));
  if (!e) throw new AssessmentError("not_found", "Learner not found in this cohort.");
  return day;
}

export async function setAttendance(
  ctx: Ctx,
  actor: AccessContext | null,
  dayId: string,
  enrolmentId: string,
  status: string,
) {
  const a = await authorize(ctx, actor, VIEW, "register.attendance");
  if (!STATUSES.includes(status as AttendanceStatus)) {
    throw new AssessmentError("invalid_answer", "Choose an attendance status.");
  }
  const day = await requireEnrolledInDay(ctx, dayId, enrolmentId);
  await assertCohortScope(ctx, a, REGISTER_ROLES, day.cohortId, "register.attendance");
  const absent = status === "absent" || status === "excused";
  await ctx.db
    .insert(attendanceRecords)
    .values({
      enrolmentId,
      assessmentDayId: dayId,
      status: status as AttendanceStatus,
      recordedBy: a.userId,
    })
    .onConflictDoUpdate({
      target: [attendanceRecords.enrolmentId, attendanceRecords.assessmentDayId],
      set: {
        status: status as AttendanceStatus,
        recordedBy: a.userId,
        // An absent learner's ID check no longer applies.
        ...(absent ? { idVerifiedAt: null, idVerifiedBy: null } : {}),
      },
    });
  await writeAudit(ctx, {
    action: "assessment.attendance.recorded",
    actorId: a.userId,
    entityType: "assessment_day",
    entityId: dayId,
    after: { enrolmentId, status },
  });
}

export async function setIdVerified(
  ctx: Ctx,
  actor: AccessContext | null,
  dayId: string,
  enrolmentId: string,
  verified: boolean,
) {
  const a = await authorize(ctx, actor, VIEW, "register.idCheck");
  const day = await requireEnrolledInDay(ctx, dayId, enrolmentId);
  await assertCohortScope(ctx, a, REGISTER_ROLES, day.cohortId, "register.idCheck");
  const [rec] = await ctx.db
    .select()
    .from(attendanceRecords)
    .where(and(eq(attendanceRecords.enrolmentId, enrolmentId), eq(attendanceRecords.assessmentDayId, dayId)));
  if (!rec || (rec.status !== "present" && rec.status !== "late")) {
    throw new AssessmentError("invalid_answer", "Mark the learner present before checking ID.");
  }
  await ctx.db
    .update(attendanceRecords)
    .set(
      verified
        ? { idVerifiedAt: ctx.now(), idVerifiedBy: a.userId }
        : { idVerifiedAt: null, idVerifiedBy: null },
    )
    .where(eq(attendanceRecords.id, rec.id));
  await writeAudit(ctx, {
    action: "assessment.id.verified",
    actorId: a.userId,
    entityType: "assessment_day",
    entityId: dayId,
    after: { enrolmentId, verified },
  });
}

/** Assessor opens a learner's summative paper: present + ID checked, on the day, attempts left. */
export async function unlockPaper(
  ctx: Ctx,
  actor: AccessContext | null,
  scheduleId: string,
  enrolmentId: string,
) {
  const a = await authorize(ctx, actor, ASSESSOR, "register.unlock");
  const [row] = await ctx.db
    .select({ schedule: assessmentSchedules, blueprint: assessmentBlueprints })
    .from(assessmentSchedules)
    .innerJoin(assessmentBlueprints, eq(assessmentBlueprints.id, assessmentSchedules.blueprintId))
    .where(eq(assessmentSchedules.id, scheduleId));
  if (!row?.schedule.assessmentDayId) throw new AssessmentError("not_found", "Paper not found.");
  const dayId = row.schedule.assessmentDayId;
  const day = await requireEnrolledInDay(ctx, dayId, enrolmentId);
  await assertCohortScope(ctx, a, ["assessor"], day.cohortId, "register.unlock");

  const [signed] = await ctx.db.select().from(registerSignoffs).where(eq(registerSignoffs.assessmentDayId, dayId));
  if (signed) throw new AssessmentError("not_open", "The register is signed off.");
  const now = ctx.now();
  if (now < row.schedule.opensAt || now > row.schedule.closesAt) {
    throw new AssessmentError("not_open", "This paper is outside its time on the day.");
  }
  const [rec] = await ctx.db
    .select()
    .from(attendanceRecords)
    .where(and(eq(attendanceRecords.enrolmentId, enrolmentId), eq(attendanceRecords.assessmentDayId, dayId)));
  if (!rec || (rec.status !== "present" && rec.status !== "late") || !rec.idVerifiedAt) {
    throw new AssessmentError("needs_unlock", "Mark the learner present and check their ID first.");
  }
  const allowance = await nextAttemptAllowance(ctx, enrolmentId, row.blueprint);
  if (!allowance.ok) throw new AssessmentError("no_attempts_left", "This learner can't write this paper again.");
  if (await unusedUnlock(ctx, scheduleId, enrolmentId, allowance.attemptNo)) return;

  const [u] = await ctx.db
    .insert(paperUnlocks)
    .values({ scheduleId, enrolmentId, attemptNo: allowance.attemptNo, unlockedBy: a.userId, unlockedAt: now })
    .onConflictDoNothing()
    .returning({ id: paperUnlocks.id });
  if (u) {
    await writeAudit(ctx, {
      action: "assessment.paper.unlocked",
      actorId: a.userId,
      entityType: "paper_unlock",
      entityId: u.id,
      after: { scheduleId, enrolmentId, attemptNo: allowance.attemptNo },
    });
  }
}

async function scopedAttempt(ctx: Ctx, a: AccessContext, attemptId: string, target: string) {
  const [row] = await ctx.db
    .select({ attempt: assessmentAttempts, cohortId: enrolments.cohortId })
    .from(assessmentAttempts)
    .innerJoin(enrolments, eq(enrolments.id, assessmentAttempts.enrolmentId))
    .where(eq(assessmentAttempts.id, attemptId));
  if (!row) throw new AssessmentError("not_found", "Attempt not found.");
  await assertCohortScope(ctx, a, ["assessor"], row.cohortId, target);
  if (row.attempt.status !== "in_progress") {
    throw new AssessmentError("submitted", "This attempt has been submitted.");
  }
  return row.attempt;
}

/** Pause stops the clock (e.g. load-shedding); resume moves the deadline on by the pause. */
export async function setPaused(
  ctx: Ctx,
  actor: AccessContext | null,
  attemptId: string,
  paused: boolean,
) {
  const a = await authorize(ctx, actor, ASSESSOR, "register.pause");
  const attempt = await scopedAttempt(ctx, a, attemptId, "register.pause");
  const now = ctx.now();
  if (paused && !attempt.pausedAt) {
    await ctx.db
      .update(assessmentAttempts)
      .set({ pausedAt: now })
      .where(and(eq(assessmentAttempts.id, attemptId), eq(assessmentAttempts.status, "in_progress")));
  } else if (!paused && attempt.pausedAt) {
    const pausedMs = Math.max(0, now.getTime() - attempt.pausedAt.getTime());
    await ctx.db
      .update(assessmentAttempts)
      .set({
        pausedAt: null,
        deadlineAt: attempt.deadlineAt ? new Date(attempt.deadlineAt.getTime() + pausedMs) : null,
      })
      .where(eq(assessmentAttempts.id, attemptId));
  } else return;
  await writeAudit(ctx, {
    action: paused ? "assessment.attempt.paused" : "assessment.attempt.resumed",
    actorId: a.userId,
    entityType: "assessment_attempt",
    entityId: attemptId,
  });
}

/** Extra time (accommodation or disruption), in minutes. */
export async function addExtraTime(
  ctx: Ctx,
  actor: AccessContext | null,
  attemptId: string,
  minutes: number,
) {
  const a = await authorize(ctx, actor, ASSESSOR, "register.extraTime");
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 120) {
    throw new AssessmentError("invalid_answer", "Extra time must be 1 to 120 minutes.");
  }
  const attempt = await scopedAttempt(ctx, a, attemptId, "register.extraTime");
  if (!attempt.deadlineAt) return; // untimed
  await ctx.db
    .update(assessmentAttempts)
    .set({
      extraMinutes: attempt.extraMinutes + minutes,
      deadlineAt: new Date(attempt.deadlineAt.getTime() + minutes * 60_000),
    })
    .where(eq(assessmentAttempts.id, attemptId));
  await writeAudit(ctx, {
    action: "assessment.attempt.extra_time",
    actorId: a.userId,
    entityType: "assessment_attempt",
    entityId: attemptId,
    after: { minutes },
  });
}

export async function signOffRegister(ctx: Ctx, actor: AccessContext | null, dayId: string) {
  const a = await authorize(ctx, actor, ASSESSOR, "register.signOff");
  const day = await loadDay(ctx, dayId);
  await assertCohortScope(ctx, a, ["assessor"], day.cohortId, "register.signOff");
  const [row] = await ctx.db
    .insert(registerSignoffs)
    .values({ assessmentDayId: dayId, signedBy: a.userId, signedAt: ctx.now() })
    .onConflictDoNothing()
    .returning();
  if (!row) return;
  const present = await ctx.db
    .select({ n: sql<number>`count(*)::int` })
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.assessmentDayId, dayId),
        inArray(attendanceRecords.status, ["present", "late"]),
      ),
    );
  await writeAudit(ctx, {
    action: "assessment.register.signed_off",
    actorId: a.userId,
    entityType: "assessment_day",
    entityId: dayId,
    after: { present: Number(present[0]?.n ?? 0) },
  });
}
