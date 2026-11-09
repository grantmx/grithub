import { and, asc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { cohorts, enrolments, jobRuns, qualifications, roleGrants, users } from "db";
import type { AccessContext, StaffRole } from "@/lib/access";
import { type CleanText, cleanText } from "@/lib/comms";
import type { ServerCtx } from "./context";
import { RATE_LIMITS, RateLimitError, enforceRateLimit } from "./ratelimit";
import { cohortScope, inScope } from "./staffScope";

/**
 * Shared pieces for communication and support (design.md §14, 2026-11-08):
 * the error type, cohort membership lookups and messaging rate limits.
 */

export class CommsError extends Error {
  constructor(
    public readonly code:
      | "not_found"
      | "invalid"
      | "not_allowed"
      | "rate_limited"
      | "edit_window_closed",
    message: string,
  ) {
    super(message);
    this.name = "CommsError";
  }
}

export const RATE_LIMIT_MESSAGE = "You're sending messages quickly. Try again in a few minutes.";

/** Throw CommsError("invalid") unless the text passes the rules. */
export function requireText(raw: unknown, opts?: Parameters<typeof cleanText>[1]): string {
  const r: CleanText = cleanText(raw, opts);
  if (!r.ok) throw new CommsError("invalid", r.problem);
  return r.value;
}

const isStaff = (actor: AccessContext) => actor.roles.size > 0;

/** Posting limits: learners 10 per 10 minutes and 60 per day; staff higher. */
export async function enforcePostLimit(ctx: Pick<ServerCtx, "db" | "config" | "ipHash">, actor: AccessContext) {
  const [burst, daily] = isStaff(actor)
    ? [RATE_LIMITS.commsStaffBurst, RATE_LIMITS.commsStaffDaily]
    : [RATE_LIMITS.commsLearnerBurst, RATE_LIMITS.commsLearnerDaily];
  try {
    await enforceRateLimit(ctx, burst, actor.userId);
    await enforceRateLimit(ctx, daily, actor.userId);
  } catch (e) {
    if (e instanceof RateLimitError) throw new CommsError("rate_limited", RATE_LIMIT_MESSAGE);
    throw e;
  }
}

export async function enforceLimit(
  ctx: Pick<ServerCtx, "db" | "config" | "ipHash">,
  rule: (typeof RATE_LIMITS)[keyof typeof RATE_LIMITS],
  subject: string,
  message: string,
) {
  try {
    await enforceRateLimit(ctx, rule, subject);
  } catch (e) {
    if (e instanceof RateLimitError) throw new CommsError("rate_limited", message);
    throw e;
  }
}

export type LearnerCohort = {
  enrolmentId: string;
  cohortId: string;
  cohortName: string;
  qualificationId: string;
};

/** The learner's active enrolments. */
export async function learnerCohorts(ctx: Pick<ServerCtx, "db">, userId: string): Promise<LearnerCohort[]> {
  return ctx.db
    .select({
      enrolmentId: enrolments.id,
      cohortId: enrolments.cohortId,
      cohortName: cohorts.name,
      qualificationId: cohorts.qualificationId,
    })
    .from(enrolments)
    .innerJoin(cohorts, eq(cohorts.id, enrolments.cohortId))
    .where(and(eq(enrolments.userId, userId), eq(enrolments.status, "active")))
    .orderBy(asc(cohorts.name));
}

export async function requireLearnerCohort(ctx: Pick<ServerCtx, "db">, actor: AccessContext, cohortId: string) {
  const mine = await learnerCohorts(ctx, actor.userId);
  const hit = mine.find((c) => c.cohortId === cohortId);
  if (!hit) throw new CommsError("not_found", "That cohort isn't one of yours.");
  return hit;
}

/** Active learner user ids in a cohort (announcement and session recipients). */
export async function cohortLearnerIds(ctx: Pick<ServerCtx, "db">, cohortId: string): Promise<string[]> {
  const rows = await ctx.db
    .select({ userId: enrolments.userId })
    .from(enrolments)
    .innerJoin(users, eq(users.id, enrolments.userId))
    .where(and(eq(enrolments.cohortId, cohortId), eq(enrolments.status, "active"), eq(users.status, "active")));
  return rows.map((r) => r.userId);
}

export type StaffMember = { userId: string; name: string; role: StaffRole };

/**
 * Staff holding a role for a cohort: a grant for that cohort, or (for
 * facilitators and global roles) a grant without a cohort. Expired grants
 * and suspended accounts are left out.
 */
export async function cohortStaff(
  ctx: Pick<ServerCtx, "db" | "now">,
  cohortId: string,
  roles: readonly StaffRole[],
): Promise<StaffMember[]> {
  const rows = await ctx.db
    .select({ userId: roleGrants.userId, name: users.displayName, role: roleGrants.role })
    .from(roleGrants)
    .innerJoin(users, eq(users.id, roleGrants.userId))
    .where(
      and(
        inArray(roleGrants.role, [...roles]),
        or(eq(roleGrants.cohortId, cohortId), isNull(roleGrants.cohortId)),
        or(isNull(roleGrants.expiresAt), gt(roleGrants.expiresAt, ctx.now())),
        eq(users.status, "active"),
      ),
    )
    .orderBy(asc(users.displayName));
  const seen = new Set<string>();
  return rows.filter((r) => {
    const key = `${r.userId}:${r.role}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Claim one run of a scheduled job (e.g. "digest" for "2026-W46"). Returns
 * false when that run already happened, so retried cron calls never email twice.
 */
export async function claimJobRun(ctx: Pick<ServerCtx, "db">, job: string, runKey: string): Promise<boolean> {
  const rows = await ctx.db.insert(jobRuns).values({ job, runKey }).onConflictDoNothing().returning({ id: jobRuns.id });
  return rows.length > 0;
}

export type StaffCohort = { id: string; name: string; qualificationId: string; qualificationTitle: string };

/** Cohorts a staff member may act on for these roles (cohort grants, or all for global grants). */
export async function staffCohorts(
  ctx: Pick<ServerCtx, "db" | "now">,
  actor: AccessContext,
  roles: readonly StaffRole[],
): Promise<StaffCohort[]> {
  const scope = await cohortScope(ctx, actor, roles);
  const rows = await ctx.db
    .select({
      id: cohorts.id,
      name: cohorts.name,
      qualificationId: cohorts.qualificationId,
      qualificationTitle: qualifications.title,
    })
    .from(cohorts)
    .innerJoin(qualifications, eq(qualifications.id, cohorts.qualificationId))
    .orderBy(asc(cohorts.name));
  return rows.filter((r) => inScope(scope, r.id));
}
