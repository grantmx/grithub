import { auditLog } from "db";
import type { ServerCtx } from "./context";

/**
 * Audit actions written by auth, onboarding, reports and assessments. Payloads carry ids, counts
 * and reasons only, never emails, names or CSV contents.
 */
export type AuditAction =
  | "auth.signin.passkey"
  | "auth.signin.magic_link"
  | "auth.signin.invitation"
  | "auth.signin.recovery"
  | "auth.signin.failed"
  | "auth.signout"
  | "auth.magic_link.requested"
  | "auth.link.rejected"
  | "auth.passkey.added"
  | "auth.passkey.revoked"
  | "auth.recovery.started"
  | "auth.permission_denied"
  | "auth.rate_limited"
  | "consent.accepted"
  | "admin.cohort.created"
  | "admin.invite.sent"
  | "admin.import.completed"
  | "admin.user.deactivated"
  | "report.progress.viewed"
  | "report.progress.exported"
  | "assessment.attempt.started"
  | "assessment.attempt.submitted"
  | "assessment.attempt.auto_submitted"
  | "assessment.attempt.paused"
  | "assessment.attempt.resumed"
  | "assessment.attempt.extra_time"
  | "assessment.paper.unlocked"
  | "assessment.paper.exported"
  | "assessment.attendance.recorded"
  | "assessment.id.verified"
  | "assessment.register.signed_off"
  | "assessment.marks.saved"
  | "assessment.decision.recorded"
  | "assessment.moderation.recorded"
  | "assessment.batch.closed"
  | "assessment.appeal.submitted"
  | "assessment.appeal.decided"
  | "assessment.analytics.viewed"
  | "assessment.coverage.viewed"
  | "admin.blueprint.created"
  | "admin.blueprint.rule_added"
  | "admin.blueprint.rule_removed"
  | "admin.blueprint.published"
  | "admin.schedule.created"
  | "question.retired"
  | "question.versioned";

export async function writeAudit(
  ctx: Pick<ServerCtx, "db" | "ipHash">,
  entry: {
    action: AuditAction;
    actorId?: string | null;
    entityType: string;
    entityId?: string | null;
    after?: Record<string, unknown>;
  },
): Promise<void> {
  await ctx.db.insert(auditLog).values({
    action: entry.action,
    actorId: entry.actorId ?? null,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    after: entry.after ?? null,
    ipHash: ctx.ipHash,
  });
}
