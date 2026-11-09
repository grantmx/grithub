import { pgEnum } from "drizzle-orm/pg-core";

// Programmes have ONLY Knowledge and Practical modules. There is deliberately
// no "workplace" value (docs/lms/README.md, domain-model.md).
export const moduleType = pgEnum("module_type", ["knowledge", "practical"]);

// Staff and evaluator roles. Learners get access through an enrolment, not a role grant.
export const staffRole = pgEnum("staff_role", [
  "facilitator",
  "assessor",
  "moderator",
  "sdp_admin",
  "external_evaluator",
]);

export const userStatus = pgEnum("user_status", [
  "invited",
  "active",
  "suspended",
]);

// Text is the core of every section; audio and video are optional extras.
export const contentKind = pgEnum("content_kind", [
  "text",
  "audio",
  "video",
  "document",
  "external_link",
]);

export const publishStatus = pgEnum("publish_status", ["draft", "published"]);
export const lifecycleStatus = pgEnum("lifecycle_status", [
  "draft",
  "active",
  "retired",
]);
export const qualificationStatus = pgEnum("qualification_status", [
  "draft",
  "active",
  "archived",
]);

// short_answer items are marked by an assessor against a rubric (summative only).
export const questionType = pgEnum("question_type", [
  "single",
  "multi",
  "short_answer",
]);
export const blueprintKind = pgEnum("blueprint_kind", [
  "section_check",
  "formative",
  "summative",
]);
export const attemptStatus = pgEnum("attempt_status", [
  "in_progress",
  "submitted",
  "graded",
  "void",
]);

export const decisionOutcome = pgEnum("decision_outcome", [
  "competent",
  "not_yet_competent",
]);
export const moderationOutcome = pgEnum("moderation_outcome", [
  "upheld",
  "referred_back",
]);
export const batchStatus = pgEnum("batch_status", ["open", "closed"]);

// A learner appeal against a released decision, decided by a moderator.
export const appealStatus = pgEnum("appeal_status", [
  "open",
  "upheld",
  "reassess",
]);

export const enrolmentStatus = pgEnum("enrolment_status", [
  "active",
  "completed",
  "withdrawn",
]);
export const attendanceStatus = pgEnum("attendance_status", [
  "present",
  "absent",
  "late",
  "excused",
]);

export const ticketCategory = pgEnum("ticket_category", [
  "academic",
  "technical",
  "admin",
]);
export const ticketStatus = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
]);

export const syncStatus = pgEnum("sync_status", ["pending", "sent", "failed"]);

// Communication (design.md §14, 2026-11-08).
// Email for optional notification types: instant, weekly digest, or off.
export const emailFrequency = pgEnum("email_frequency", [
  "instant",
  "digest",
  "off",
]);
export const notificationKind = pgEnum("notification_kind", [
  "announcement",
  "discussion",
  "message",
  "ticket",
  "session",
]);
// What a learner can report, and what an edit revision belongs to.
export const commsTarget = pgEnum("comms_target", [
  "discussion_post",
  "direct_message",
]);
export const reportReason = pgEnum("report_reason", [
  "offensive",
  "harassment",
  "spam",
  "personal_info",
  "other",
]);
export const reportStatus = pgEnum("report_status", [
  "open",
  "hidden",
  "dismissed",
]);

// Learner display preferences (design.md: A-/A+ text size, Light/Dark/System).
export const textSize = pgEnum("text_size", ["s", "m", "l", "xl"]);
export const themePreference = pgEnum("theme_preference", [
  "system",
  "light",
  "dark",
]);

// QCTO Learner Enrolment and Readiness for EISA (LEISA) submissions
// (docs/lms/compliance/qcto-leisa-mapping.md). The spec asks for an enrolment
// file within 21 days of enrolment and a readiness file 3 months before the EISA.
// Consents recorded in consent_records (append-only).
export const consentKind = pgEnum("consent_kind", [
  "popia_notice",
  "qcto_sharing",
]);

export const qctoSubmissionPurpose = pgEnum("qcto_submission_purpose", [
  "enrolment",
  "eisa_readiness",
]);
export const qctoSubmissionStatus = pgEnum("qcto_submission_status", [
  "draft",
  "generated",
  "submitted",
  "accepted",
  "rejected",
]);
export const qctoRowOutcome = pgEnum("qcto_row_outcome", [
  "pending",
  "accepted",
  "rejected",
]);

export const libraryResourceKind = pgEnum("library_resource_kind", [
  "link",
  "document",
]);

// Practical briefs: learners submit evidence, or an assessor observes on an assessment day.
export const briefMode = pgEnum("brief_mode", ["submission", "observed"]);
export const submissionStatus = pgEnum("submission_status", [
  "draft",
  "submitted",
]);
export const evidenceKind = pgEnum("evidence_kind", ["file", "link"]);
export const evidenceSource = pgEnum("evidence_source", ["learner", "assessor"]);
// Virus-scan hook. "not_scanned" = no scanner configured (placeholder).
export const scanStatus = pgEnum("scan_status", [
  "not_scanned",
  "pending",
  "clean",
  "infected",
]);
