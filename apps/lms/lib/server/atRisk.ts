import { sql } from "drizzle-orm";
import type { AccessContext, Requirement } from "@/lib/access";
import { type RiskReason, riskReasons } from "@/lib/comms";
import { authorize } from "./auth";
import type { ServerCtx } from "./context";
import { assertCohortScope, cohortScope } from "./staffScope";

/**
 * At-risk flags for facilitators (design.md §14, 2026-11-08): no learning
 * activity (section opened, check answered, work submitted) for 7 days, or
 * 2 sections with all 3 check tries wrong within 14 days. Staff only; the
 * learner never sees a risk label. Computed on read, nothing stored.
 */

export const RISK_ROLES = ["facilitator", "sdp_admin"] as const;
const STAFF: Requirement = { kind: "roles", anyOf: RISK_ROLES, stepUp: false };

type Ctx = Pick<ServerCtx, "db" | "now" | "ipHash">;

type Row = {
  enrolment_id: string;
  enrolled_at: Date | string;
  last_activity: Date | string | null;
  failed_at: (Date | string)[] | null;
};

async function riskRows(ctx: Ctx, cohortIds: string[] | "all") {
  const filter =
    cohortIds === "all"
      ? sql`true`
      : cohortIds.length
        ? sql`e.cohort_id in (${sql.join(cohortIds.map((id) => sql`${id}::uuid`), sql`, `)})`
        : sql`false`;
  return ctx.db.execute<Row>(sql`
    with enr as (
      select e.id, e.enrolled_at from enrolments e
      where e.status = 'active' and ${filter}
    ),
    failed as (
      select a.enrolment_id, a.section_id, max(i.answered_at) as failed_at
      from assessment_attempts a
      join attempt_items i on i.attempt_id = a.id
      where a.section_id is not null and a.enrolment_id in (select id from enr)
      group by a.enrolment_id, a.section_id
      having count(distinct a.id) filter (where i.answered_at is not null) >= 3
         and bool_and(i.answered_at is not null and i.is_correct = false)
    )
    select
      enr.id as enrolment_id,
      enr.enrolled_at,
      greatest(
        (select max(sp.last_viewed_at) from section_progress sp where sp.enrolment_id = enr.id),
        (select max(i.answered_at) from assessment_attempts a join attempt_items i on i.attempt_id = a.id where a.enrolment_id = enr.id),
        (select max(a.submitted_at) from assessment_attempts a where a.enrolment_id = enr.id),
        (select max(s.submitted_at) from submissions s where s.enrolment_id = enr.id)
      ) as last_activity,
      (select json_agg(f.failed_at) from failed f where f.enrolment_id = enr.id) as failed_at
    from enr
  `);
}

const toDate = (v: Date | string) => (v instanceof Date ? v : new Date(v));

function evaluate(rows: Row[], now: Date): Map<string, RiskReason[]> {
  const out = new Map<string, RiskReason[]>();
  for (const r of rows) {
    const reasons = riskReasons(
      {
        enrolledAt: toDate(r.enrolled_at),
        lastActivityAt: r.last_activity ? toDate(r.last_activity) : null,
        failedSectionsAt: (r.failed_at ?? []).map(toDate),
      },
      now,
    );
    if (reasons.length) out.set(r.enrolment_id, reasons);
  }
  return out;
}

/** Flags for every active learner in a cohort (enrolment id → reasons). */
export async function cohortRisk(ctx: Ctx, actor: AccessContext | null, cohortId: string) {
  const a = await authorize(ctx, actor, STAFF, "atRisk.cohort");
  await assertCohortScope(ctx, a, RISK_ROLES, cohortId, "atRisk.cohort");
  return evaluate([...(await riskRows(ctx, [cohortId]))], ctx.now());
}

/** Sidebar badge: flagged learners across the staff member's cohorts. */
export async function atRiskCount(ctx: Ctx, actor: AccessContext): Promise<number> {
  if (!RISK_ROLES.some((r) => actor.roles.has(r))) return 0;
  const scope = await cohortScope(ctx, actor, RISK_ROLES);
  return evaluate([...(await riskRows(ctx, scope))], ctx.now()).size;
}
