import { eq, sql } from "drizzle-orm";
import { users } from "db";
import { CURRENT_NOTICE, QCTO_SHARING_CONSENT } from "@/lib/popia";
import type { ServerCtx } from "./context";

/**
 * Where a user is in first-time setup. Learners (anyone with an enrolment)
 * also need the current QCTO sharing consent and a confirmed QCTO profile.
 * Used by the session loader (AccessContext.setupComplete) and /setup.
 */

export type SetupState = {
  status: "invited" | "active" | "suspended";
  noticeCurrent: boolean;
  /** Has at least one enrolment, so the QCTO consent and profile apply. */
  isLearner: boolean;
  qctoConsentCurrent: boolean;
  profileConfirmed: boolean;
};

/** SQL pieces shared by the session loader and the setup page. */
export const setupColumns = {
  isLearner: sql<boolean>`exists(select 1 from enrolments e where e.user_id = "users"."id")`,
  qctoConsentCurrent: sql<boolean>`coalesce((select c.granted and c.notice_version = ${QCTO_SHARING_CONSENT.version} from consent_records c where c.user_id = "users"."id" and c.kind = 'qcto_sharing' order by c.accepted_at desc, c.id desc limit 1), false)`,
  profileConfirmed: sql<boolean>`exists(select 1 from learner_qcto_profiles p where p.user_id = "users"."id" and p.confirmed_at is not null)`,
};

export function setupComplete(s: SetupState): boolean {
  return (
    s.status === "active" &&
    s.noticeCurrent &&
    (!s.isLearner || (s.qctoConsentCurrent && s.profileConfirmed))
  );
}

export async function getSetupState(
  ctx: Pick<ServerCtx, "db">,
  userId: string,
): Promise<SetupState | undefined> {
  const [row] = await ctx.db
    .select({
      status: users.status,
      noticeVersion: users.popiaNoticeVersion,
      ...setupColumns,
    })
    .from(users)
    .where(eq(users.id, userId));
  if (!row) return undefined;
  return {
    status: row.status,
    noticeCurrent: row.noticeVersion === CURRENT_NOTICE.version,
    isLearner: row.isLearner,
    qctoConsentCurrent: row.qctoConsentCurrent,
    profileConfirmed: row.profileConfirmed,
  };
}
