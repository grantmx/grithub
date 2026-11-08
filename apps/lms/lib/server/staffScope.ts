import { and, eq, gt, isNull, or } from "drizzle-orm";
import { roleGrants } from "db";
import type { AccessContext, StaffRole } from "@/lib/access";
import { writeAudit } from "./audit";
import { AccessDeniedError } from "./auth";
import type { ServerCtx } from "./context";

/**
 * Cohorts a staff member may act on for a role: cohort-scoped grants
 * (assessor, moderator, facilitator). A grant without a cohort, or a global
 * role (SDP admin, external evaluator), covers every cohort.
 */
export async function cohortScope(
  ctx: Pick<ServerCtx, "db" | "now">,
  actor: AccessContext,
  roles: readonly StaffRole[],
): Promise<string[] | "all"> {
  const rows = await ctx.db
    .select({ role: roleGrants.role, cohortId: roleGrants.cohortId })
    .from(roleGrants)
    .where(
      and(
        eq(roleGrants.userId, actor.userId),
        or(isNull(roleGrants.expiresAt), gt(roleGrants.expiresAt, ctx.now())),
      ),
    );
  const relevant = rows.filter((r) => roles.includes(r.role));
  if (relevant.some((r) => r.cohortId === null)) return "all";
  return [...new Set(relevant.map((r) => r.cohortId!))];
}

export function inScope(scope: string[] | "all", cohortId: string): boolean {
  return scope === "all" || scope.includes(cohortId);
}

/** Throw (and audit) unless the cohort is within the actor's scope for these roles. */
export async function assertCohortScope(
  ctx: Pick<ServerCtx, "db" | "now" | "ipHash">,
  actor: AccessContext,
  roles: readonly StaffRole[],
  cohortId: string,
  target: string,
): Promise<void> {
  if (inScope(await cohortScope(ctx, actor, roles), cohortId)) return;
  await writeAudit(ctx, {
    action: "auth.permission_denied",
    actorId: actor.userId,
    entityType: "cohort",
    entityId: cohortId,
    after: { target, result: "forbidden", reason: "cohort_not_assigned" },
  });
  throw new AccessDeniedError({ result: "forbidden", reason: "missing_role" });
}
