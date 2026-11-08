import { and, asc, eq, gt, isNull, or, sql } from "drizzle-orm";
import {
  assessmentAttempts,
  cohorts,
  enrolments,
  modules,
  qualifications,
  roleGrants,
  sectionProgress,
  sections,
  users,
} from "db";
import type { AccessContext, Requirement } from "@/lib/access";
import type { ServerCtx } from "./context";
import { writeAudit } from "./audit";
import { AccessDeniedError, authorize } from "./auth";

/**
 * Learner progress reports for facilitators (their own cohorts) and SDP admins.
 * Printable page + CSV (design-gate decision 2026-11-08).
 */
const REPORTS: Requirement = {
  kind: "roles",
  anyOf: ["facilitator", "sdp_admin"],
  stepUp: false,
};

/** Cohorts the actor may report on: all for SDP admins, granted cohorts for facilitators. */
export async function reportableCohortIds(
  ctx: Pick<ServerCtx, "db" | "now">,
  actor: AccessContext,
): Promise<string[] | "all"> {
  if (actor.roles.has("sdp_admin")) return "all";
  const rows = await ctx.db
    .select({ cohortId: roleGrants.cohortId })
    .from(roleGrants)
    .where(
      and(
        eq(roleGrants.userId, actor.userId),
        eq(roleGrants.role, "facilitator"),
        or(isNull(roleGrants.expiresAt), gt(roleGrants.expiresAt, ctx.now())),
      ),
    );
  return rows.map((r) => r.cohortId).filter((c): c is string => Boolean(c));
}

async function assertCohortAccess(
  ctx: ServerCtx,
  actor: AccessContext,
  cohortId: string,
  target: string,
) {
  const allowed = await reportableCohortIds(ctx, actor);
  if (allowed === "all" || allowed.includes(cohortId)) return;
  await writeAudit(ctx, {
    action: "auth.permission_denied",
    actorId: actor.userId,
    entityType: "cohort",
    entityId: cohortId,
    after: { target, result: "forbidden", reason: "cohort_not_assigned" },
  });
  throw new AccessDeniedError({ result: "forbidden", reason: "missing_role" });
}

export async function listReportCohorts(
  ctx: ServerCtx,
  actor: AccessContext | null,
) {
  const a = await authorize(ctx, actor, REPORTS, "reports.listCohorts");
  const allowed = await reportableCohortIds(ctx, a);
  const rows = await ctx.db
    .select({
      id: cohorts.id,
      name: cohorts.name,
      qualificationTitle: qualifications.title,
    })
    .from(cohorts)
    .innerJoin(qualifications, eq(qualifications.id, cohorts.qualificationId))
    .orderBy(asc(cohorts.name));
  return allowed === "all" ? rows : rows.filter((r) => allowed.includes(r.id));
}

export async function listCohortLearners(
  ctx: ServerCtx,
  actor: AccessContext | null,
  cohortId: string,
) {
  const a = await authorize(ctx, actor, REPORTS, "reports.listLearners");
  await assertCohortAccess(ctx, a, cohortId, "reports.listLearners");
  return ctx.db
    .select({
      enrolmentId: enrolments.id,
      name: users.displayName,
      status: enrolments.status,
      completed: sql<number>`(select count(*)::int from section_progress sp where sp.enrolment_id = "enrolments"."id" and sp.completed_at is not null)`,
      lastActive: sql<Date | null>`(select max(sp.last_viewed_at) from section_progress sp where sp.enrolment_id = "enrolments"."id")`,
    })
    .from(enrolments)
    .innerJoin(users, eq(users.id, enrolments.userId))
    .where(eq(enrolments.cohortId, cohortId))
    .orderBy(asc(users.displayName));
}

export type ReportRow = {
  moduleCode: string;
  moduleTitle: string;
  moduleType: "knowledge" | "practical";
  sectionNo: number;
  sectionTitle: string;
  status: "Not started" | "In progress" | "Complete";
  firstViewedAt: Date | null;
  lastViewedAt: Date | null;
  completedAt: Date | null;
  checkAttempts: number;
  checkLatestCorrect: boolean | null;
};

export type LearnerReport = {
  learnerName: string;
  learnerEmail: string;
  cohortName: string;
  qualificationTitle: string;
  generatedAt: Date;
  rows: ReportRow[];
  totals: { sections: number; complete: number };
};

export async function learnerReport(
  ctx: ServerCtx,
  actor: AccessContext | null,
  enrolmentId: string,
  purpose: "viewed" | "exported" = "viewed",
): Promise<LearnerReport> {
  const a = await authorize(ctx, actor, REPORTS, "reports.learnerReport");
  const [head] = await ctx.db
    .select({
      cohortId: cohorts.id,
      cohortName: cohorts.name,
      qualificationId: qualifications.id,
      qualificationTitle: qualifications.title,
      learnerName: users.displayName,
      learnerEmail: users.email,
    })
    .from(enrolments)
    .innerJoin(cohorts, eq(cohorts.id, enrolments.cohortId))
    .innerJoin(qualifications, eq(qualifications.id, cohorts.qualificationId))
    .innerJoin(users, eq(users.id, enrolments.userId))
    .where(eq(enrolments.id, enrolmentId));
  if (!head)
    throw new AccessDeniedError({
      result: "forbidden",
      reason: "missing_role",
    });
  await assertCohortAccess(ctx, a, head.cohortId, "reports.learnerReport");

  const structure = await ctx.db
    .select({
      moduleCode: modules.code,
      moduleTitle: modules.title,
      moduleType: modules.type,
      sectionId: sections.id,
      sectionTitle: sections.title,
    })
    .from(sections)
    .innerJoin(modules, eq(modules.id, sections.moduleId))
    .where(eq(modules.qualificationId, head.qualificationId))
    .orderBy(
      asc(modules.sortOrder),
      asc(modules.code),
      asc(sections.sortOrder),
      asc(sections.title),
    );
  const progress = await ctx.db
    .select()
    .from(sectionProgress)
    .where(eq(sectionProgress.enrolmentId, enrolmentId));
  const attempts = await ctx.db
    .select({
      sectionId: assessmentAttempts.sectionId,
      attemptNo: assessmentAttempts.attemptNo,
      scoreRaw: assessmentAttempts.scoreRaw,
      status: assessmentAttempts.status,
    })
    .from(assessmentAttempts)
    .where(eq(assessmentAttempts.enrolmentId, enrolmentId));

  const counters = new Map<string, number>();
  const rows: ReportRow[] = structure.map((s) => {
    const n = (counters.get(s.moduleCode) ?? 0) + 1;
    counters.set(s.moduleCode, n);
    const p = progress.find((x) => x.sectionId === s.sectionId);
    const graded = attempts
      .filter((x) => x.sectionId === s.sectionId && x.status === "graded")
      .sort((x, y) => y.attemptNo - x.attemptNo);
    return {
      moduleCode: s.moduleCode,
      moduleTitle: s.moduleTitle,
      moduleType: s.moduleType,
      sectionNo: n,
      sectionTitle: s.sectionTitle,
      status: p?.completedAt ? "Complete" : p ? "In progress" : "Not started",
      firstViewedAt: p?.firstViewedAt ?? null,
      lastViewedAt: p?.lastViewedAt ?? null,
      completedAt: p?.completedAt ?? null,
      checkAttempts: graded.length,
      checkLatestCorrect: graded[0] ? graded[0].scoreRaw === 1 : null,
    };
  });

  await writeAudit(ctx, {
    action:
      purpose === "exported"
        ? "report.progress.exported"
        : "report.progress.viewed",
    actorId: a.userId,
    entityType: "enrolment",
    entityId: enrolmentId,
  });
  return {
    learnerName: head.learnerName,
    learnerEmail: head.learnerEmail,
    cohortName: head.cohortName,
    qualificationTitle: head.qualificationTitle,
    generatedAt: ctx.now(),
    rows,
    totals: {
      sections: rows.length,
      complete: rows.filter((r) => r.status === "Complete").length,
    },
  };
}

/** CSV cell: quoted, and protected against spreadsheet formula injection. */
export function csvCell(
  value: string | number | boolean | null | undefined,
): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function reportToCsv(report: LearnerReport): string {
  const iso = (d: Date | null) => (d ? d.toISOString() : "");
  const header = [
    "learner",
    "cohort",
    "programme",
    "module_code",
    "module_title",
    "module_type",
    "section_no",
    "section_title",
    "status",
    "first_viewed_at",
    "last_viewed_at",
    "completed_at",
    "check_attempts",
    "check_latest_correct",
  ];
  const lines = report.rows.map((r) =>
    [
      report.learnerName,
      report.cohortName,
      report.qualificationTitle,
      r.moduleCode,
      r.moduleTitle,
      r.moduleType,
      r.sectionNo,
      r.sectionTitle,
      r.status,
      iso(r.firstViewedAt),
      iso(r.lastViewedAt),
      iso(r.completedAt),
      r.checkAttempts,
      r.checkLatestCorrect === null ? "" : r.checkLatestCorrect ? "yes" : "no",
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.map(csvCell).join(","), ...lines].join("\r\n") + "\r\n";
}
