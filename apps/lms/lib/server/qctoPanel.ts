import { asc, desc, eq, inArray } from "drizzle-orm";
import {
  cohorts,
  enrolments,
  providerAccreditations,
  qctoSubmissionBatches,
  qualificationAccreditations,
  qualifications,
  users,
} from "db";
import type { AccessContext, Requirement } from "@/lib/access";
import { addWorkingDays, monthsBefore } from "@/lib/workingTime";
import { authorize } from "./auth";
import type { ServerCtx } from "./context";
import { profileProblems } from "./qctoProfile";

/**
 * QCTO submission panel (design.md §14, 2026-11-09), SDP admins only: learners
 * with incomplete profiles or validation errors (field names, never values),
 * every cohort whose enrolment details haven't been sent (due 21 working
 * days after the cohort starts), cohorts due for EISA readiness (3 months
 * before the EISA date, listed from 30 days before or when overdue), the last
 * submission batch, and accreditation date warnings (6 months ahead, cohorts
 * running past the end date, expired).
 */

const ADMIN: Requirement = { kind: "roles", anyOf: ["sdp_admin"], stepUp: true };
export const ENROLMENT_WORKING_DAYS = 21;
export const READINESS_MONTHS_BEFORE_EISA = 3;
export const READINESS_WINDOW_DAYS = 30;
export const ACCREDITATION_WARNING_MONTHS = 6;

type Ctx = ServerCtx;
const DAY = 86_400_000;
const daysUntil = (date: string, today: string) =>
  Math.round((new Date(`${date}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / DAY);

export async function qctoPanel(ctx: Ctx, actor: AccessContext | null) {
  await authorize(ctx, actor, ADMIN, "qcto.panel");
  const today = new Date(ctx.now().getTime() + 2 * 3_600_000).toISOString().slice(0, 10);

  const cs = await ctx.db
    .select({
      id: cohorts.id,
      name: cohorts.name,
      startsOn: cohorts.startsOn,
      endsOn: cohorts.endsOn,
      eisaOn: cohorts.eisaOn,
      qualificationId: cohorts.qualificationId,
      qualificationTitle: qualifications.title,
    })
    .from(cohorts)
    .innerJoin(qualifications, eq(qualifications.id, cohorts.qualificationId))
    .orderBy(asc(cohorts.startsOn));

  const batches = await ctx.db
    .select({
      id: qctoSubmissionBatches.id,
      purpose: qctoSubmissionBatches.purpose,
      status: qctoSubmissionBatches.status,
      cohortId: qctoSubmissionBatches.cohortId,
      fileName: qctoSubmissionBatches.fileName,
      rowCount: qctoSubmissionBatches.rowCount,
      submittedAt: qctoSubmissionBatches.submittedAt,
      createdAt: qctoSubmissionBatches.createdAt,
    })
    .from(qctoSubmissionBatches)
    .orderBy(desc(qctoSubmissionBatches.createdAt));
  const sent = (cohortId: string, purpose: "enrolment" | "eisa_readiness") =>
    batches.find((b) => b.cohortId === cohortId && b.purpose === purpose && (b.status === "submitted" || b.status === "accepted")) ?? null;

  // Learners: incomplete profiles and validation errors (active enrolments only).
  const learners = await ctx.db
    .select({ userId: enrolments.userId, enrolmentId: enrolments.id, name: users.displayName, cohortName: cohorts.name })
    .from(enrolments)
    .innerJoin(users, eq(users.id, enrolments.userId))
    .innerJoin(cohorts, eq(cohorts.id, enrolments.cohortId))
    .where(eq(enrolments.status, "active"))
    .orderBy(asc(cohorts.name), asc(users.displayName));
  const problems = await profileProblems(ctx, [...new Set(learners.map((l) => l.userId))]);
  const incomplete = learners
    .filter((l) => problems.get(l.userId)?.status !== "confirmed")
    .map((l) => ({ ...l, status: problems.get(l.userId)?.status ?? "not_started" }));
  const invalid = learners
    .filter((l) => (problems.get(l.userId)?.invalid.length ?? 0) > 0)
    .map((l) => ({ ...l, status: problems.get(l.userId)!.status, fields: problems.get(l.userId)!.invalid }));

  // Enrolment submissions: every unsent cohort, soonest first.
  const enrolmentDue = cs
    .filter((c) => !sent(c.id, "enrolment"))
    .map((c) => {
      const dueOn = addWorkingDays(c.startsOn, ENROLMENT_WORKING_DAYS);
      return { cohortId: c.id, name: c.name, qualificationTitle: c.qualificationTitle, startsOn: c.startsOn, dueOn, daysLeft: daysUntil(dueOn, today) };
    })
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn));

  // EISA readiness: due within 30 days or overdue; cohorts without an EISA date.
  const running = cs.filter((c) => c.endsOn >= today);
  const readinessDue = cs
    .filter((c) => c.eisaOn && !sent(c.id, "eisa_readiness"))
    .map((c) => {
      const dueOn = monthsBefore(c.eisaOn!, READINESS_MONTHS_BEFORE_EISA);
      return { cohortId: c.id, name: c.name, eisaOn: c.eisaOn!, dueOn, daysLeft: daysUntil(dueOn, today) };
    })
    .filter((c) => c.daysLeft <= READINESS_WINDOW_DAYS)
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn));
  const eisaNotSet = running.filter((c) => !c.eisaOn).map((c) => ({ cohortId: c.id, name: c.name }));

  // Last submission batch.
  const last = batches[0]
    ? { ...batches[0], cohortName: cs.find((c) => c.id === batches[0]!.cohortId)?.name ?? null }
    : null;

  // Accreditation warnings.
  const warnBefore = (() => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + ACCREDITATION_WARNING_MONTHS);
    return d.toISOString().slice(0, 10);
  })();
  const providers = await ctx.db
    .select({ id: providerAccreditations.id, name: providerAccreditations.legalName, number: providerAccreditations.accreditationNumber, endsOn: providerAccreditations.endsOn })
    .from(providerAccreditations);
  const quals = !providers.length ? [] : await ctx.db
    .select({
      qualificationId: qualificationAccreditations.qualificationId,
      endsOn: qualificationAccreditations.endsOn,
      title: qualifications.title,
    })
    .from(qualificationAccreditations)
    .innerJoin(qualifications, eq(qualifications.id, qualificationAccreditations.qualificationId))
    .where(inArray(qualificationAccreditations.providerAccreditationId, providers.map((p) => p.id)));
  type Warning = { level: "expired" | "soon" | "overrun"; text: string };
  const warnings: Warning[] = [];
  for (const p of providers) {
    if (p.endsOn < today) warnings.push({ level: "expired", text: `SDP accreditation ${p.number} (${p.name}) expired on ${p.endsOn}` });
    else if (p.endsOn <= warnBefore) warnings.push({ level: "soon", text: `SDP accreditation ${p.number} ends in under 6 months (${p.endsOn})` });
  }
  const latestQualEnd = new Map<string, string>();
  for (const q of quals) {
    if (q.endsOn < today) warnings.push({ level: "expired", text: `Accreditation for ${q.title} expired on ${q.endsOn}` });
    else if (q.endsOn <= warnBefore) warnings.push({ level: "soon", text: `Accreditation for ${q.title} ends in under 6 months (${q.endsOn})` });
    if ((latestQualEnd.get(q.qualificationId) ?? "") < q.endsOn) latestQualEnd.set(q.qualificationId, q.endsOn);
  }
  const providerEnd = providers.map((p) => p.endsOn).sort().at(-1) ?? null;
  for (const c of running) {
    const end = latestQualEnd.get(c.qualificationId) ?? providerEnd;
    if (end && c.endsOn > end) warnings.push({ level: "overrun", text: `${c.name} ends ${c.endsOn}, after the accreditation (${end})` });
  }
  if (providers.length === 0) warnings.push({ level: "soon", text: "No SDP accreditation recorded" });

  return {
    today,
    incomplete,
    invalid,
    enrolmentDue,
    readinessDue,
    eisaNotSet,
    lastBatch: last,
    warnings,
    summary: {
      incomplete: incomplete.length,
      invalid: invalid.length,
      enrolmentOverdue: enrolmentDue.filter((e) => e.daysLeft < 0).length,
      enrolmentNext: enrolmentDue.find((e) => e.daysLeft >= 0) ?? null,
      readinessDue: readinessDue.length,
      warnings: warnings.length,
    },
  };
}

export type QctoPanel = Awaited<ReturnType<typeof qctoPanel>>;

/** One-line summary for the readiness dashboard (SDP admins). */
export function panelSummaryLine(p: QctoPanel): string {
  const bits = [
    p.summary.incomplete ? `${p.summary.incomplete} learner${p.summary.incomplete === 1 ? "" : "s"} with incomplete profiles` : "",
    p.summary.invalid ? `${p.summary.invalid} with validation errors` : "",
    p.summary.enrolmentOverdue ? `${p.summary.enrolmentOverdue} enrolment submission${p.summary.enrolmentOverdue === 1 ? "" : "s"} overdue` : "",
    p.summary.enrolmentNext ? `next enrolment due ${p.summary.enrolmentNext.dueOn} (${p.summary.enrolmentNext.daysLeft} days)` : "",
    p.summary.readinessDue ? `${p.summary.readinessDue} EISA readiness due` : "",
    p.summary.warnings ? `${p.summary.warnings} accreditation warning${p.summary.warnings === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  return bits.length ? bits.join(" · ") : "Nothing due";
}
