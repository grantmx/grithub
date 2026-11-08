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

// Learner display preferences (design.md: A-/A+ text size, Light/Dark/System).
export const textSize = pgEnum("text_size", ["s", "m", "l", "xl"]);
export const themePreference = pgEnum("theme_preference", [
  "system",
  "light",
  "dark",
]);

export const libraryResourceKind = pgEnum("library_resource_kind", [
  "link",
  "document",
]);
