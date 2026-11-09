import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id, tenantId, tenantKey, updatedAt } from "./columns";
import {
  attendanceStatus,
  commsTarget,
  emailFrequency,
  notificationKind,
  reportReason,
  reportStatus,
  staffRole,
  ticketCategory,
  ticketStatus,
} from "./enums";
import { cohorts } from "./cohorts";
import { modules, sections } from "./curriculum";
import { enrolments, users } from "./people";

/**
 * Facilitator–learner communication and academic support (design.md §14,
 * 2026-11-08; Form 5 4.2.6, 4.2.8, 4.2.10, 4.2.11). Everything here is
 * per cohort and kept for the communication log export: hidden posts and
 * earlier versions of edited text are never deleted.
 */

const length = (col: unknown, min: number, max: number) =>
  sql`char_length(${col}) BETWEEN ${sql.raw(String(min))} AND ${sql.raw(String(max))}`;
const bothOrNeither = (a: unknown, b: unknown) =>
  sql`(${a} IS NULL) = (${b} IS NULL)`;

export const announcements = pgTable(
  "announcements",
  {
    id: id(),
    tenantId: tenantId(),
    cohortId: uuid()
      .notNull()
      .references(() => cohorts.id),
    authorId: uuid()
      .notNull()
      .references(() => users.id),
    title: text().notNull(),
    body: text().notNull(),
    publishedAt: timestamp({ withTimezone: true }),
    // At most one pinned announcement per cohort (shown first in Messages and on Home).
    pinnedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("announcements_cohort_idx").on(t.cohortId, t.publishedAt),
    uniqueIndex("announcements_one_pinned_per_cohort_uq")
      .on(t.cohortId)
      .where(sql`${t.pinnedAt} IS NOT NULL`),
    check("announcements_title_length", length(t.title, 1, 200)),
    check("announcements_body_length", length(t.body, 1, 20000)),
  ],
);

/** A discussion board is one module in one cohort; only facilitators start threads. */
export const discussionThreads = pgTable(
  "discussion_threads",
  {
    id: id(),
    tenantId: tenantId(),
    cohortId: uuid()
      .notNull()
      .references(() => cohorts.id),
    moduleId: uuid()
      .notNull()
      .references(() => modules.id),
    authorId: uuid()
      .notNull()
      .references(() => users.id),
    title: text().notNull(),
    body: text().notNull(),
    pinnedAt: timestamp({ withTimezone: true }),
    lastPostAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("discussion_threads_board_idx").on(t.cohortId, t.moduleId),
    check("discussion_threads_title_length", length(t.title, 1, 200)),
    check("discussion_threads_body_length", length(t.body, 1, 5000)),
  ],
);

/** Replies nest one level: a reply's parent is always a top-level post (enforced by trigger). */
export const discussionPosts = pgTable(
  "discussion_posts",
  {
    id: id(),
    tenantId: tenantId(),
    threadId: uuid()
      .notNull()
      .references(() => discussionThreads.id, { onDelete: "cascade" }),
    parentId: uuid().references((): AnyPgColumn => discussionPosts.id),
    authorId: uuid()
      .notNull()
      .references(() => users.id),
    body: text().notNull(),
    editedAt: timestamp({ withTimezone: true }),
    hiddenAt: timestamp({ withTimezone: true }),
    hiddenBy: uuid().references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("discussion_posts_thread_idx").on(t.threadId, t.createdAt),
    check("discussion_posts_body_length", length(t.body, 1, 5000)),
    check("discussion_posts_hidden_fields", bothOrNeither(t.hiddenAt, t.hiddenBy)),
  ],
);

/**
 * A private conversation between one learner and one named facilitator or the
 * cohort's assessor. Only those two people can read it (plus the export log).
 */
export const conversations = pgTable(
  "conversations",
  {
    id: id(),
    tenantId: tenantId(),
    cohortId: uuid()
      .notNull()
      .references(() => cohorts.id),
    learnerId: uuid()
      .notNull()
      .references(() => users.id),
    staffId: uuid()
      .notNull()
      .references(() => users.id),
    staffRole: staffRole().notNull(),
    lastMessageAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    learnerReadAt: timestamp({ withTimezone: true }),
    staffReadAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("conversations_tenant_pair_uq").on(
      tenantKey(t.tenantId),
      t.cohortId,
      t.learnerId,
      t.staffId,
    ),
    index("conversations_staff_idx").on(t.staffId, t.lastMessageAt),
    index("conversations_learner_idx").on(t.learnerId, t.lastMessageAt),
    check("conversations_two_people", sql`${t.learnerId} <> ${t.staffId}`),
    check(
      "conversations_staff_role",
      sql`${t.staffRole} IN ('facilitator', 'assessor')`,
    ),
  ],
);

export const directMessages = pgTable(
  "direct_messages",
  {
    id: id(),
    tenantId: tenantId(),
    conversationId: uuid()
      .notNull()
      .references(() => conversations.id),
    authorId: uuid()
      .notNull()
      .references(() => users.id),
    body: text().notNull(),
    editedAt: timestamp({ withTimezone: true }),
    hiddenAt: timestamp({ withTimezone: true }),
    hiddenBy: uuid().references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    index("direct_messages_conversation_idx").on(t.conversationId, t.createdAt),
    check("direct_messages_body_length", length(t.body, 1, 5000)),
    check("direct_messages_hidden_fields", bothOrNeither(t.hiddenAt, t.hiddenBy)),
  ],
);

/** The earlier text of an edited post or message (kept for the communication log). */
export const messageRevisions = pgTable(
  "message_revisions",
  {
    id: id(),
    tenantId: tenantId(),
    targetType: commsTarget().notNull(),
    targetId: uuid().notNull(),
    body: text().notNull(),
    revisedBy: uuid()
      .notNull()
      .references(() => users.id),
    revisedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("message_revisions_target_idx").on(t.targetType, t.targetId)],
);

/** A learner's report of a post or message; staff hide the item or dismiss the report. */
export const contentReports = pgTable(
  "content_reports",
  {
    id: id(),
    tenantId: tenantId(),
    cohortId: uuid()
      .notNull()
      .references(() => cohorts.id),
    targetType: commsTarget().notNull(),
    targetId: uuid().notNull(),
    reporterId: uuid()
      .notNull()
      .references(() => users.id),
    reason: reportReason().notNull(),
    note: text(),
    status: reportStatus().notNull().default("open"),
    reviewedBy: uuid().references(() => users.id),
    reviewedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("content_reports_tenant_reporter_target_uq").on(
      tenantKey(t.tenantId),
      t.reporterId,
      t.targetType,
      t.targetId,
    ),
    index("content_reports_cohort_status_idx").on(t.cohortId, t.status),
    check("content_reports_note_length", sql`${t.note} IS NULL OR char_length(${t.note}) <= 500`),
    check(
      "content_reports_review_fields",
      sql`(${t.status} = 'open') = (${t.reviewedAt} IS NULL) AND ${bothOrNeither(t.reviewedAt, t.reviewedBy)}`,
    ),
  ],
);

/**
 * Support tickets. Targets (first reply 1 working day, resolved in 5) are
 * stamped when the ticket is raised; academic tickets go to the cohort's
 * facilitators, technical and admin tickets to SDP admins.
 */
export const supportTickets = pgTable(
  "support_tickets",
  {
    id: id(),
    tenantId: tenantId(),
    cohortId: uuid().references(() => cohorts.id),
    raisedBy: uuid()
      .notNull()
      .references(() => users.id),
    category: ticketCategory().notNull(),
    status: ticketStatus().notNull().default("open"),
    subject: text().notNull(),
    body: text().notNull(),
    assignedTo: uuid().references(() => users.id),
    firstResponseDueAt: timestamp({ withTimezone: true }).notNull(),
    resolveDueAt: timestamp({ withTimezone: true }).notNull(),
    firstRespondedAt: timestamp({ withTimezone: true }),
    resolvedAt: timestamp({ withTimezone: true }),
    closedAt: timestamp({ withTimezone: true }),
    lastActivityAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("support_tickets_status_idx").on(t.status),
    index("support_tickets_raised_by_idx").on(t.raisedBy, t.lastActivityAt),
    index("support_tickets_cohort_idx").on(t.cohortId, t.status),
    check("support_tickets_subject_length", length(t.subject, 1, 200)),
    check("support_tickets_body_length", length(t.body, 1, 5000)),
    check(
      "support_tickets_academic_has_cohort",
      sql`${t.category} <> 'academic' OR ${t.cohortId} IS NOT NULL`,
    ),
  ],
);

export const ticketReplies = pgTable(
  "ticket_replies",
  {
    id: id(),
    tenantId: tenantId(),
    ticketId: uuid()
      .notNull()
      .references(() => supportTickets.id),
    authorId: uuid()
      .notNull()
      .references(() => users.id),
    body: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("ticket_replies_ticket_idx").on(t.ticketId, t.createdAt),
    check("ticket_replies_body_length", length(t.body, 1, 5000)),
  ],
);

/**
 * In-app notifications (the bell). The same rows drive email: sent at once,
 * held for the weekly digest (`digestPending`), or not emailed, per the
 * recipient's preferences.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    tenantId: tenantId(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: notificationKind().notNull(),
    title: text().notNull(),
    link: text().notNull(),
    readAt: timestamp({ withTimezone: true }),
    emailedAt: timestamp({ withTimezone: true }),
    digestPending: boolean().notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId, t.createdAt),
    index("notifications_digest_idx")
      .on(t.userId)
      .where(sql`${t.digestPending}`),
    check("notifications_link_relative", sql`${t.link} LIKE '/%' AND ${t.link} NOT LIKE '//%'`),
  ],
);

/** Optional email types (design.md §3). Essential emails ignore these. */
export const emailPreferences = pgTable("email_preferences", {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  tenantId: tenantId(),
  announcements: emailFrequency().notNull().default("instant"),
  discussions: emailFrequency().notNull().default("instant"),
  messages: emailFrequency().notNull().default("instant"),
  tickets: emailFrequency().notNull().default("instant"),
  updatedAt: updatedAt(),
});

/** Facilitator notes and recording links on a section, for one cohort only. */
export const sectionNotes = pgTable(
  "section_notes",
  {
    id: id(),
    tenantId: tenantId(),
    cohortId: uuid()
      .notNull()
      .references(() => cohorts.id),
    sectionId: uuid()
      .notNull()
      .references(() => sections.id),
    authorId: uuid()
      .notNull()
      .references(() => users.id),
    body: text().notNull().default(""),
    recordingUrl: text(),
    recordingLabel: text(),
    archivedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("section_notes_cohort_section_idx").on(t.cohortId, t.sectionId),
    check("section_notes_body_length", length(t.body, 0, 5000)),
    check(
      "section_notes_has_content",
      sql`char_length(${t.body}) > 0 OR ${t.recordingUrl} IS NOT NULL`,
    ),
    check(
      "section_notes_recording_label",
      sql`${t.recordingLabel} IS NULL OR (${t.recordingUrl} IS NOT NULL AND char_length(${t.recordingLabel}) BETWEEN 1 AND 120)`,
    ),
  ],
);

/** A scheduled live online session (Zoom) for a cohort, with its recording link afterwards. */
export const liveSessions = pgTable(
  "live_sessions",
  {
    id: id(),
    tenantId: tenantId(),
    cohortId: uuid()
      .notNull()
      .references(() => cohorts.id),
    moduleId: uuid().references(() => modules.id),
    title: text().notNull(),
    details: text().notNull().default(""),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    endsAt: timestamp({ withTimezone: true }).notNull(),
    joinUrl: text().notNull(),
    recordingUrl: text(),
    recordingAddedAt: timestamp({ withTimezone: true }),
    cancelledAt: timestamp({ withTimezone: true }),
    // Bumped on every change so calendar apps replace the earlier invite (.ics SEQUENCE).
    sequence: integer().notNull().default(0),
    createdBy: uuid()
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("live_sessions_cohort_idx").on(t.cohortId, t.startsAt),
    check("live_sessions_title_length", length(t.title, 1, 200)),
    check("live_sessions_details_length", length(t.details, 0, 2000)),
    check("live_sessions_times", sql`${t.endsAt} > ${t.startsAt}`),
    check("live_sessions_recording_fields", bothOrNeither(t.recordingUrl, t.recordingAddedAt)),
  ],
);

export const sessionAttendance = pgTable(
  "session_attendance",
  {
    id: id(),
    tenantId: tenantId(),
    sessionId: uuid()
      .notNull()
      .references(() => liveSessions.id),
    enrolmentId: uuid()
      .notNull()
      .references(() => enrolments.id),
    status: attendanceStatus().notNull(),
    recordedBy: uuid()
      .notNull()
      .references(() => users.id),
    recordedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("session_attendance_tenant_session_enrolment_uq").on(
      tenantKey(t.tenantId),
      t.sessionId,
      t.enrolmentId,
    ),
  ],
);
