import { and, asc, desc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { cohorts, enrolments, liveSessions, modules, sessionAttendance, users } from "db";
import type { AccessContext, Requirement } from "@/lib/access";
import { MAX_TITLE, buildIcs, checkRecordingLink, checkZoomLink } from "@/lib/comms";
import { writeAudit } from "./audit";
import { authorize } from "./auth";
import type { ServerCtx } from "./context";
import { CommsError, cohortLearnerIds, learnerCohorts, requireText } from "./comms";
import { notify } from "./notify";
import { assertCohortScope, cohortScope, inScope } from "./staffScope";

/**
 * Live sessions (design.md §14, 2026-11-08; Form 5 4.2.8): facilitators
 * schedule a Zoom session for a cohort; learners are emailed an .ics invite
 * when it is scheduled and whenever it changes or is cancelled (always sent).
 * Join links are always visible to the cohort. Facilitators mark attendance
 * on a phone-friendly register and add the recording link afterwards.
 */

export const SESSION_ROLES = ["facilitator", "sdp_admin"] as const;
const STAFF: Requirement = { kind: "roles", anyOf: SESSION_ROLES, stepUp: false };
const USER: Requirement = { kind: "user" };

type Ctx = ServerCtx;
export type AttendanceStatus = "present" | "late" | "absent" | "excused";
const STATUSES: readonly AttendanceStatus[] = ["present", "late", "absent", "excused"];

const SAST = "Africa/Johannesburg";
const whenFmt = new Intl.DateTimeFormat("en-ZA", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: SAST,
});

/** "2026-11-10T18:00" typed in South African time → Date. */
export function parseSastLocal(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(`${value}:00+02:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date → "2026-11-10T18:00" in South African time (for datetime-local inputs). */
export function toSastLocal(d: Date): string {
  return new Date(d.getTime() + 2 * 3_600_000).toISOString().slice(0, 16);
}

type SessionInput = {
  cohortId: string;
  moduleId?: string;
  title: string;
  details: string;
  startsAt: string;
  durationMinutes: string | number;
  joinUrl: string;
};

async function validate(ctx: Ctx, input: SessionInput) {
  const title = requireText(input.title, { max: MAX_TITLE, label: "The title" });
  const details = String(input.details ?? "").trim().slice(0, 2000);
  const startsAt = parseSastLocal(String(input.startsAt));
  if (!startsAt) throw new CommsError("invalid", "Choose a start date and time.");
  const minutes = Number(input.durationMinutes);
  if (!Number.isInteger(minutes) || minutes < 15 || minutes > 480)
    throw new CommsError("invalid", "Length must be between 15 minutes and 8 hours.");
  const link = checkZoomLink(String(input.joinUrl));
  if (!link.ok) throw new CommsError("invalid", link.problem);
  let moduleId: string | null = null;
  if (input.moduleId) {
    const [m] = await ctx.db
      .select({ id: modules.id })
      .from(modules)
      .innerJoin(cohorts, eq(cohorts.qualificationId, modules.qualificationId))
      .where(and(eq(modules.id, input.moduleId), eq(cohorts.id, input.cohortId)));
    if (!m) throw new CommsError("invalid", "That module isn't part of this cohort's programme.");
    moduleId = m.id;
  }
  return { title, details, startsAt, endsAt: new Date(startsAt.getTime() + minutes * 60_000), joinUrl: link.url, moduleId };
}

type SessionRow = typeof liveSessions.$inferSelect;

function icsFor(ctx: Ctx, s: SessionRow) {
  const host = new URL(ctx.config.appUrl).hostname;
  return buildIcs({
    uid: `${s.id}@${host}`,
    sequence: s.sequence,
    start: s.startsAt,
    end: s.endsAt,
    title: s.title,
    description: [s.details, `Join on Zoom: ${s.joinUrl}`].filter(Boolean).join("\n\n"),
    url: s.joinUrl,
    cancelled: s.cancelledAt !== null,
    stamp: ctx.now(),
  });
}

async function emailLearners(ctx: Ctx, s: SessionRow, change: "scheduled" | "changed" | "cancelled") {
  const when = whenFmt.format(s.startsAt);
  const subject =
    change === "scheduled" ? `New live session: ${s.title}` : change === "changed" ? `Session changed: ${s.title}` : `Session cancelled: ${s.title}`;
  const lines =
    change === "scheduled"
      ? [`A live session has been scheduled: "${s.title}", ${when} (South African time), on Zoom.`, "The calendar invite is attached."]
      : change === "changed"
        ? [`A live session has changed: "${s.title}" is now ${when} (South African time).`, "The updated calendar invite is attached."]
        : [`The live session "${s.title}" on ${when} has been cancelled.`];
  await notify(ctx, await cohortLearnerIds(ctx, s.cohortId), {
    kind: "session",
    title: subject,
    link: `/sessions/${s.id}`,
    essential: true,
    email: {
      subject,
      lines,
      cta: "See the session",
      attachments: [{ filename: "session.ics", contentType: "text/calendar; charset=utf-8", content: icsFor(ctx, s) }],
    },
  });
}

async function loadSession(ctx: Ctx, id: string) {
  const [s] = await ctx.db.select().from(liveSessions).where(eq(liveSessions.id, id));
  if (!s) throw new CommsError("not_found", "Session not found.");
  return s;
}

// --- Staff ----------------------------------------------------------------------

export async function listStaffSessions(ctx: Ctx, actor: AccessContext | null) {
  const a = await authorize(ctx, actor, STAFF, "sessions.list");
  const scope = await cohortScope(ctx, a, SESSION_ROLES);
  const rows = await ctx.db
    .select({
      id: liveSessions.id,
      cohortId: liveSessions.cohortId,
      cohortName: cohorts.name,
      title: liveSessions.title,
      startsAt: liveSessions.startsAt,
      endsAt: liveSessions.endsAt,
      cancelledAt: liveSessions.cancelledAt,
      recordingUrl: liveSessions.recordingUrl,
      moduleCode: modules.code,
      marked: sql<number>`(select count(*)::int from session_attendance sa where sa.session_id = ${liveSessions.id})`,
    })
    .from(liveSessions)
    .innerJoin(cohorts, eq(cohorts.id, liveSessions.cohortId))
    .leftJoin(modules, eq(modules.id, liveSessions.moduleId))
    .orderBy(desc(liveSessions.startsAt));
  return rows.filter((r) => inScope(scope, r.cohortId));
}

export async function scheduleSession(ctx: Ctx, actor: AccessContext | null, input: SessionInput): Promise<string> {
  const a = await authorize(ctx, actor, STAFF, "sessions.schedule");
  await assertCohortScope(ctx, a, SESSION_ROLES, input.cohortId, "sessions.schedule");
  const v = await validate(ctx, input);
  const [s] = await ctx.db
    .insert(liveSessions)
    .values({ cohortId: input.cohortId, createdBy: a.userId, ...v })
    .returning();
  await writeAudit(ctx, {
    action: "session.scheduled",
    actorId: a.userId,
    entityType: "live_session",
    entityId: s!.id,
    after: { cohortId: input.cohortId },
  });
  await emailLearners(ctx, s!, "scheduled");
  return s!.id;
}

export async function updateSession(ctx: Ctx, actor: AccessContext | null, id: string, input: Omit<SessionInput, "cohortId">) {
  const a = await authorize(ctx, actor, STAFF, "sessions.update");
  const s = await loadSession(ctx, id);
  await assertCohortScope(ctx, a, SESSION_ROLES, s.cohortId, "sessions.update");
  if (s.cancelledAt) throw new CommsError("not_allowed", "This session was cancelled.");
  const v = await validate(ctx, { ...input, cohortId: s.cohortId });
  const changed =
    v.startsAt.getTime() !== s.startsAt.getTime() ||
    v.endsAt.getTime() !== s.endsAt.getTime() ||
    v.joinUrl !== s.joinUrl ||
    v.title !== s.title;
  const [next] = await ctx.db
    .update(liveSessions)
    .set({ ...v, sequence: changed ? s.sequence + 1 : s.sequence })
    .where(eq(liveSessions.id, id))
    .returning();
  await writeAudit(ctx, { action: "session.updated", actorId: a.userId, entityType: "live_session", entityId: id, after: { notified: changed } });
  if (changed) await emailLearners(ctx, next!, "changed");
}

export async function cancelSession(ctx: Ctx, actor: AccessContext | null, id: string) {
  const a = await authorize(ctx, actor, STAFF, "sessions.cancel");
  const s = await loadSession(ctx, id);
  await assertCohortScope(ctx, a, SESSION_ROLES, s.cohortId, "sessions.cancel");
  if (s.cancelledAt) return;
  const [next] = await ctx.db
    .update(liveSessions)
    .set({ cancelledAt: ctx.now(), sequence: s.sequence + 1 })
    .where(eq(liveSessions.id, id))
    .returning();
  await writeAudit(ctx, { action: "session.cancelled", actorId: a.userId, entityType: "live_session", entityId: id });
  await emailLearners(ctx, next!, "cancelled");
}

export async function addRecording(ctx: Ctx, actor: AccessContext | null, id: string, rawUrl: string) {
  const a = await authorize(ctx, actor, STAFF, "sessions.recording");
  const s = await loadSession(ctx, id);
  await assertCohortScope(ctx, a, SESSION_ROLES, s.cohortId, "sessions.recording");
  const link = checkRecordingLink(rawUrl);
  if (!link.ok) throw new CommsError("invalid", link.problem);
  await ctx.db
    .update(liveSessions)
    .set({ recordingUrl: link.url, recordingAddedAt: ctx.now() })
    .where(eq(liveSessions.id, id));
  await writeAudit(ctx, { action: "session.recording_added", actorId: a.userId, entityType: "live_session", entityId: id });
  await notify(ctx, await cohortLearnerIds(ctx, s.cohortId), {
    kind: "session",
    title: `Recording added: ${s.title}`,
    link: `/sessions/${id}`,
    noEmail: true,
    email: { subject: "", lines: [] },
  });
}

/** Session with one register row per active learner (phone-friendly attendance). */
export async function getSessionRegister(ctx: Ctx, actor: AccessContext | null, id: string) {
  const a = await authorize(ctx, actor, STAFF, "sessions.register");
  const s = await loadSession(ctx, id);
  await assertCohortScope(ctx, a, SESSION_ROLES, s.cohortId, "sessions.register");
  const [cohort] = await ctx.db.select({ name: cohorts.name, qualificationId: cohorts.qualificationId }).from(cohorts).where(eq(cohorts.id, s.cohortId));
  const mods = await ctx.db
    .select({ id: modules.id, code: modules.code, title: modules.title })
    .from(modules)
    .where(eq(modules.qualificationId, cohort!.qualificationId))
    .orderBy(asc(modules.code));
  const rows = await ctx.db
    .select({ enrolmentId: enrolments.id, name: users.displayName, status: sessionAttendance.status })
    .from(enrolments)
    .innerJoin(users, eq(users.id, enrolments.userId))
    .leftJoin(sessionAttendance, and(eq(sessionAttendance.enrolmentId, enrolments.id), eq(sessionAttendance.sessionId, id)))
    .where(and(eq(enrolments.cohortId, s.cohortId), eq(enrolments.status, "active")))
    .orderBy(asc(users.displayName));
  return { session: s, cohortName: cohort!.name, modules: mods, rows };
}

export async function setSessionAttendance(ctx: Ctx, actor: AccessContext | null, id: string, enrolmentId: string, status: string) {
  const a = await authorize(ctx, actor, STAFF, "sessions.attendance");
  const s = await loadSession(ctx, id);
  await assertCohortScope(ctx, a, SESSION_ROLES, s.cohortId, "sessions.attendance");
  if (!STATUSES.includes(status as AttendanceStatus)) throw new CommsError("invalid", "Choose a status.");
  if (s.cancelledAt) throw new CommsError("not_allowed", "This session was cancelled.");
  if (s.startsAt > ctx.now()) throw new CommsError("not_allowed", "Attendance can be marked once the session has started.");
  const [enr] = await ctx.db
    .select({ id: enrolments.id })
    .from(enrolments)
    .where(and(eq(enrolments.id, enrolmentId), eq(enrolments.cohortId, s.cohortId)));
  if (!enr) throw new CommsError("not_found", "Learner not found in this cohort.");
  const st = status as AttendanceStatus;
  // The unique index includes the tenant key, so update first, then insert.
  const updated = await ctx.db
    .update(sessionAttendance)
    .set({ status: st, recordedBy: a.userId, recordedAt: ctx.now() })
    .where(and(eq(sessionAttendance.sessionId, id), eq(sessionAttendance.enrolmentId, enrolmentId)))
    .returning({ id: sessionAttendance.id });
  if (updated.length === 0) {
    await ctx.db.insert(sessionAttendance).values({ sessionId: id, enrolmentId, status: st, recordedBy: a.userId });
  }
  await writeAudit(ctx, {
    action: "session.attendance.recorded",
    actorId: a.userId,
    entityType: "live_session",
    entityId: id,
    after: { enrolmentId, status: st },
  });
}

// --- Learner ----------------------------------------------------------------------

const learnerColumns = {
  id: liveSessions.id,
  title: liveSessions.title,
  details: liveSessions.details,
  startsAt: liveSessions.startsAt,
  endsAt: liveSessions.endsAt,
  joinUrl: liveSessions.joinUrl,
  recordingUrl: liveSessions.recordingUrl,
  cancelledAt: liveSessions.cancelledAt,
  moduleCode: modules.code,
  cohortName: cohorts.name,
};

/** Upcoming and past sessions for the learner's cohort in a programme, with their attendance. */
export async function learnerSessions(ctx: Ctx, actor: AccessContext | null, qualificationId: string) {
  const a = await authorize(ctx, actor, USER, "sessions.learner");
  const cohort = (await learnerCohorts(ctx, a.userId)).find((c) => c.qualificationId === qualificationId);
  if (!cohort) return { upcoming: [], past: [] };
  const rows = await ctx.db
    .select({ ...learnerColumns, attendance: sessionAttendance.status })
    .from(liveSessions)
    .innerJoin(cohorts, eq(cohorts.id, liveSessions.cohortId))
    .leftJoin(modules, eq(modules.id, liveSessions.moduleId))
    .leftJoin(
      sessionAttendance,
      and(eq(sessionAttendance.sessionId, liveSessions.id), eq(sessionAttendance.enrolmentId, cohort.enrolmentId)),
    )
    .where(eq(liveSessions.cohortId, cohort.cohortId))
    .orderBy(asc(liveSessions.startsAt));
  const now = ctx.now();
  return {
    upcoming: rows.filter((r) => r.endsAt >= now),
    past: rows.filter((r) => r.endsAt < now).reverse(),
  };
}

/** Next sessions across the learner's cohorts (Home "Coming up"). */
export async function nextSessions(ctx: Ctx, actor: AccessContext, limit = 2) {
  const mine = (await learnerCohorts(ctx, actor.userId)).map((c) => c.cohortId);
  if (!mine.length) return [];
  return ctx.db
    .select(learnerColumns)
    .from(liveSessions)
    .innerJoin(cohorts, eq(cohorts.id, liveSessions.cohortId))
    .leftJoin(modules, eq(modules.id, liveSessions.moduleId))
    .where(and(inArray(liveSessions.cohortId, mine), gte(liveSessions.endsAt, ctx.now()), isNull(liveSessions.cancelledAt)))
    .orderBy(asc(liveSessions.startsAt))
    .limit(limit);
}

/** One session for a learner in its cohort, or staff with the cohort in scope. */
export async function getSessionForViewer(ctx: Ctx, actor: AccessContext | null, id: string) {
  const a = await authorize(ctx, actor, USER, "sessions.view");
  const s = await loadSession(ctx, id);
  const learner = (await learnerCohorts(ctx, a.userId)).find((c) => c.cohortId === s.cohortId);
  const staff = SESSION_ROLES.some((r) => a.roles.has(r)) && inScope(await cohortScope(ctx, a, SESSION_ROLES), s.cohortId);
  if (!learner && !staff) throw new CommsError("not_found", "Session not found.");
  let attendance: AttendanceStatus | null = null;
  if (learner) {
    const [row] = await ctx.db
      .select({ status: sessionAttendance.status })
      .from(sessionAttendance)
      .where(and(eq(sessionAttendance.sessionId, id), eq(sessionAttendance.enrolmentId, learner.enrolmentId)));
    attendance = row?.status ?? null;
  }
  const [cohort] = await ctx.db.select({ name: cohorts.name, qualificationId: cohorts.qualificationId }).from(cohorts).where(eq(cohorts.id, s.cohortId));
  const [mod] = s.moduleId ? await ctx.db.select({ code: modules.code, title: modules.title }).from(modules).where(eq(modules.id, s.moduleId)) : [];
  return { session: s, cohortName: cohort!.name, qualificationId: cohort!.qualificationId, module: mod ?? null, attendance, ics: icsFor(ctx, s) };
}

/** Sessions that ended in the last 14 days with no attendance marked (staff list hint). */
export async function unmarkedSessions(ctx: Ctx, actor: AccessContext) {
  const scope = await cohortScope(ctx, actor, SESSION_ROLES);
  const rows = await ctx.db
    .select({ id: liveSessions.id, cohortId: liveSessions.cohortId })
    .from(liveSessions)
    .where(
      and(
        lt(liveSessions.endsAt, ctx.now()),
        gte(liveSessions.endsAt, new Date(ctx.now().getTime() - 14 * 86_400_000)),
        isNull(liveSessions.cancelledAt),
        sql`not exists (select 1 from session_attendance sa where sa.session_id = ${liveSessions.id})`,
      ),
    );
  return rows.filter((r) => inScope(scope, r.cohortId)).length;
}

/** Schedule form: cohorts in scope and the modules of their programmes. */
export async function sessionFormOptions(ctx: Ctx, actor: AccessContext | null) {
  const a = await authorize(ctx, actor, STAFF, "sessions.formOptions");
  const scope = await cohortScope(ctx, a, SESSION_ROLES);
  const cs = (
    await ctx.db
      .select({ id: cohorts.id, name: cohorts.name, qualificationId: cohorts.qualificationId })
      .from(cohorts)
      .orderBy(asc(cohorts.name))
  ).filter((c) => inScope(scope, c.id));
  const quals = [...new Set(cs.map((c) => c.qualificationId))];
  const mods = quals.length
    ? await ctx.db
        .select({ id: modules.id, code: modules.code, title: modules.title, qualificationId: modules.qualificationId })
        .from(modules)
        .where(inArray(modules.qualificationId, quals))
        .orderBy(asc(modules.code))
    : [];
  return { cohorts: cs, modules: mods };
}
