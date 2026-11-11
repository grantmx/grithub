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
  | "auth.passkey.confirmed"
  | "auth.passkey.confirm_failed"
  | "auth.recovery.started"
  | "auth.permission_denied"
  | "auth.rate_limited"
  | "evaluator.page.viewed"
  | "consent.accepted"
  | "consent.qcto_sharing.accepted"
  | "qcto_profile.part_saved"
  | "qcto_profile.confirmed"
  | "admin.qcto_profile.updated"
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
  | "assessment.moderation.sample_changed"
  | "assessment.moderation.actions_done"
  | "assessment.moderation.report_exported"
  | "admin.cohort.moderation_rate"
  | "admin.bootstrap.sdp_admin"
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
  | "question.versioned"
  | "practical.submission.started"
  | "practical.evidence.added"
  | "practical.evidence.removed"
  | "practical.evidence.rejected"
  | "practical.evidence.viewed"
  | "practical.submission.submitted"
  | "practical.observation.started"
  | "practical.judgements.saved"
  | "practical.decision.recorded"
  | "practical.appeal.submitted"
  | "admin.brief.created"
  | "admin.brief.published"
  | "comms.announcement.published"
  | "comms.announcement.pinned"
  | "comms.announcement.unpinned"
  | "comms.thread.created"
  | "comms.thread.pinned"
  | "comms.post.created"
  | "comms.post.edited"
  | "comms.message.sent"
  | "comms.message.edited"
  | "comms.report.created"
  | "comms.report.hidden"
  | "comms.report.dismissed"
  | "comms.log.exported"
  | "support.ticket.created"
  | "support.ticket.replied"
  | "support.ticket.status_changed"
  | "support.ticket.reassigned"
  | "support.note.created"
  | "support.note.archived"
  | "session.scheduled"
  | "session.updated"
  | "session.cancelled"
  | "session.recording_added"
  | "session.attendance.recorded"
  | "compliance.restore_test.logged"
  | "compliance.document.recorded"
  | "compliance.curriculum_reference.recorded"
  | "compliance.guide.uploaded"
  | "compliance.guide.rejected"
  | "compliance.guide.viewed"
  | "compliance.pack.exported"
  | "compliance.backup.downloaded";

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
