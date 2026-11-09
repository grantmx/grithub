import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  primaryKey,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id, tenantId } from "./columns";
import {
  appealStatus,
  attemptStatus,
  batchStatus,
  evidenceKind,
  evidenceSource,
  scanStatus,
  submissionStatus,
  decisionOutcome,
  moderationOutcome,
} from "./enums";
import {
  briefCriteria,
  briefVariants,
  practicalBriefs,
  sections,
} from "./curriculum";
import {
  assessmentBlueprints,
  questionVersions,
  rubricCriteria,
} from "./questions";
import { assessmentDays, cohorts } from "./cohorts";
import { enrolments, users } from "./people";

/**
 * When a cohort may write a blueprint: a window (formative) or a supervised
 * assessment day (summative, required by the app). A reassessment is another
 * schedule for the same blueprint on a later day.
 */
export const assessmentSchedules = pgTable(
  "assessment_schedules",
  {
    id: id(),
    cohortId: uuid()
      .notNull()
      .references(() => cohorts.id),
    // Exactly one of blueprint (knowledge) or brief (practical).
    blueprintId: uuid().references(() => assessmentBlueprints.id),
    briefId: uuid().references(() => practicalBriefs.id),
    assessmentDayId: uuid().references(() => assessmentDays.id),
    opensAt: timestamp({ withTimezone: true }).notNull(),
    closesAt: timestamp({ withTimezone: true }).notNull(),
    createdBy: uuid().references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    check(
      "assessment_schedules_window",
      sql`${t.closesAt} > ${t.opensAt}`,
    ),
    check(
      "assessment_schedules_one_target",
      sql`(${t.blueprintId} IS NULL) <> (${t.briefId} IS NULL)`,
    ),
    index("assessment_schedules_cohort_idx").on(t.cohortId),
  ],
);

/**
 * An assessor opened a summative paper for one learner on the day (after
 * marking them present and checking ID). The learner's attempt uses it once.
 */
export const paperUnlocks = pgTable(
  "paper_unlocks",
  {
    id: id(),
    scheduleId: uuid()
      .notNull()
      .references(() => assessmentSchedules.id),
    enrolmentId: uuid()
      .notNull()
      .references(() => enrolments.id),
    attemptNo: integer().notNull(),
    unlockedBy: uuid()
      .notNull()
      .references(() => users.id),
    unlockedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("paper_unlocks_schedule_enrolment_attempt_uq").on(
      t.scheduleId,
      t.enrolmentId,
      t.attemptNo,
    ),
    check("paper_unlocks_attempt_no", sql`${t.attemptNo} >= 1`),
  ],
);

/** The assessor's sign-off of an assessment day's register. Locks attendance. */
export const registerSignoffs = pgTable("register_signoffs", {
  assessmentDayId: uuid()
    .primaryKey()
    .references(() => assessmentDays.id),
  signedBy: uuid()
    .notNull()
    .references(() => users.id),
  signedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/**
 * One attempt by a learner at either a blueprint assessment or a section
 * check (exactly one of blueprint_id / section_id).
 */
export const assessmentAttempts = pgTable(
  "assessment_attempts",
  {
    id: id(),
    enrolmentId: uuid()
      .notNull()
      .references(() => enrolments.id),
    blueprintId: uuid().references(() => assessmentBlueprints.id),
    sectionId: uuid().references(() => sections.id),
    attemptNo: integer().notNull(),
    // Blueprint attempts: the sitting (window or day) it was written in.
    scheduleId: uuid().references(() => assessmentSchedules.id),
    unlockId: uuid().references(() => paperUnlocks.id),
    status: attemptStatus().notNull().default("in_progress"),
    startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    // Server-enforced end time (time limit + extra time + pauses); null = untimed.
    deadlineAt: timestamp({ withTimezone: true }),
    extraMinutes: integer().notNull().default(0),
    pausedAt: timestamp({ withTimezone: true }),
    submittedAt: timestamp({ withTimezone: true }),
    autoSubmitted: boolean().notNull().default(false),
    // The bank ran short of unseen questions (randomization.md §4.5).
    usedFallback: boolean().notNull().default(false),
    scoreRaw: integer(),
    scoreMax: integer(),
  },
  (t) => [
    check(
      "assessment_attempts_one_target",
      sql`(${t.blueprintId} IS NULL) <> (${t.sectionId} IS NULL)`,
    ),
    check("assessment_attempts_attempt_no", sql`${t.attemptNo} >= 1`),
    check(
      "assessment_attempts_score_range",
      sql`${t.scoreRaw} IS NULL OR (${t.scoreMax} IS NOT NULL AND ${t.scoreRaw} BETWEEN 0 AND ${t.scoreMax})`,
    ),
    unique("assessment_attempts_blueprint_attempt_uq").on(
      t.enrolmentId,
      t.blueprintId,
      t.attemptNo,
    ),
    unique("assessment_attempts_section_attempt_uq").on(
      t.enrolmentId,
      t.sectionId,
      t.attemptNo,
    ),
    unique("assessment_attempts_unlock_uq").on(t.unlockId),
    check(
      "assessment_attempts_extra_minutes",
      sql`${t.extraMinutes} BETWEEN 0 AND 600`,
    ),
    index("assessment_attempts_schedule_idx").on(t.scheduleId),
  ],
);

/**
 * Snapshot of exactly what was served: the immutable question version, the
 * option order and the seed (randomization.md §7). The served columns are
 * frozen by a trigger; only the response columns may change.
 */
export const attemptItems = pgTable(
  "attempt_items",
  {
    id: id(),
    attemptId: uuid()
      .notNull()
      .references(() => assessmentAttempts.id),
    questionVersionId: uuid()
      .notNull()
      .references(() => questionVersions.id),
    position: integer().notNull(),
    servedOptionOrder: uuid().array().notNull(),
    optionTokens: jsonb().$type<Record<string, string>>().notNull(),
    seed: text().notNull(),
    responseOptionIds: uuid().array(),
    responseText: text(),
    flagged: boolean().notNull().default(false),
    isCorrect: boolean(),
    answeredAt: timestamp({ withTimezone: true }),
    // Marks for the item: auto-graded items get 0/max; short answers sum their rubric marks.
    marksAwarded: integer(),
    markerNote: text(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("attempt_items_attempt_position_uq").on(t.attemptId, t.position),
    unique("attempt_items_attempt_version_uq").on(
      t.attemptId,
      t.questionVersionId,
    ),
    check("attempt_items_position", sql`${t.position} >= 1`),
  ],
);

/**
 * One practical attempt by a learner at a brief: the seeded variant they were
 * assigned (seed = learner : brief : attempt, stored, never re-drawn), their
 * evidence, and its status. Draft until "Submit for assessment"; observed
 * briefs are created by the assessor on the assessment day.
 */
export const submissions = pgTable(
  "submissions",
  {
    id: id(),
    enrolmentId: uuid()
      .notNull()
      .references(() => enrolments.id),
    briefId: uuid()
      .notNull()
      .references(() => practicalBriefs.id),
    briefVariantId: uuid()
      .notNull()
      .references(() => briefVariants.id),
    attemptNo: integer().notNull().default(1),
    seed: text().notNull(),
    scheduleId: uuid().references(() => assessmentSchedules.id),
    status: submissionStatus().notNull().default("draft"),
    observed: boolean().notNull().default(false),
    observationNotes: text(),
    // The learner confirmed assessors and moderators can open their links.
    linksConfirmed: boolean().notNull().default(false),
    createdAt: createdAt(),
    submittedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    unique("submissions_enrolment_brief_attempt_uq").on(
      t.enrolmentId,
      t.briefId,
      t.attemptNo,
    ),
    index("submissions_enrolment_idx").on(t.enrolmentId),
    check("submissions_attempt_no", sql`${t.attemptNo} >= 1`),
    check(
      "submissions_submitted_at",
      sql`(${t.status} = 'submitted') = (${t.submittedAt} IS NOT NULL)`,
    ),
  ],
);

/**
 * Evidence in a submission: a privately stored file (Vercel Blob pathname,
 * verified size/type/checksum, scan status) or an allow-listed https link.
 */
export const evidenceItems = pgTable(
  "evidence_items",
  {
    id: id(),
    tenantId: tenantId(),
    submissionId: uuid()
      .notNull()
      .references(() => submissions.id),
    kind: evidenceKind().notNull(),
    source: evidenceSource().notNull().default("learner"),
    addedBy: uuid()
      .notNull()
      .references(() => users.id),
    storagePathname: text(),
    fileName: text(),
    mimeType: text(),
    sizeBytes: bigint({ mode: "number" }),
    checksumSha256: text(),
    linkUrl: text(),
    linkHost: text(),
    scanStatus: scanStatus().notNull().default("not_scanned"),
    scannedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("evidence_items_submission_idx").on(t.submissionId),
    unique("evidence_items_pathname_uq").on(t.tenantId, t.storagePathname),
    check(
      "evidence_items_file_fields",
      sql`${t.kind} <> 'file' OR (${t.storagePathname} IS NOT NULL AND ${t.fileName} IS NOT NULL AND ${t.mimeType} IS NOT NULL AND ${t.sizeBytes} > 0 AND ${t.checksumSha256} ~ '^[0-9a-f]{64}$')`,
    ),
    check(
      "evidence_items_link_fields",
      sql`${t.kind} <> 'link' OR (${t.linkUrl} ~ '^https://' AND ${t.linkHost} IS NOT NULL)`,
    ),
  ],
);

/** Met / Not yet met per brief criterion, with an optional comment. Locked at decision. */
export const criterionJudgements = pgTable(
  "criterion_judgements",
  {
    id: id(),
    tenantId: tenantId(),
    submissionId: uuid()
      .notNull()
      .references(() => submissions.id),
    criterionId: uuid()
      .notNull()
      .references(() => briefCriteria.id),
    met: boolean().notNull(),
    comment: text(),
    judgedBy: uuid()
      .notNull()
      .references(() => users.id),
    judgedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("criterion_judgements_submission_criterion_uq").on(
      t.tenantId,
      t.submissionId,
      t.criterionId,
    ),
  ],
);

/** An assessor's unsaved practical decision. Recording creates an immutable decision. */
export const practicalDecisionDrafts = pgTable(
  "practical_decision_drafts",
  {
    tenantId: tenantId(),
    submissionId: uuid()
      .notNull()
      .references(() => submissions.id),
    assessorId: uuid()
      .notNull()
      .references(() => users.id),
    outcome: decisionOutcome(),
    feedback: text().notNull().default(""),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    primaryKey({
      name: "practical_decision_drafts_pk",
      columns: [t.submissionId, t.assessorId],
    }),
  ],
);

/**
 * Decisions for one assessment (or brief) in one cohort. Closing the batch
 * releases every decision in it to learners (design.md, approved rule).
 */
export const moderationBatches = pgTable(
  "moderation_batches",
  {
    id: id(),
    cohortId: uuid()
      .notNull()
      .references(() => cohorts.id),
    blueprintId: uuid().references(() => assessmentBlueprints.id),
    briefId: uuid().references(() => practicalBriefs.id),
    status: batchStatus().notNull().default("open"),
    closedBy: uuid().references(() => users.id),
    closedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    check(
      "moderation_batches_one_target",
      sql`(${t.blueprintId} IS NULL) <> (${t.briefId} IS NULL)`,
    ),
    check(
      "moderation_batches_closed_fields",
      sql`(${t.status} = 'closed') = (${t.closedAt} IS NOT NULL AND ${t.closedBy} IS NOT NULL)`,
    ),
    uniqueIndex("moderation_batches_one_open_blueprint_uq")
      .on(t.cohortId, t.blueprintId)
      .where(sql`${t.status} = 'open' AND ${t.blueprintId} IS NOT NULL`),
    uniqueIndex("moderation_batches_one_open_brief_uq")
      .on(t.cohortId, t.briefId)
      .where(sql`${t.status} = 'open' AND ${t.briefId} IS NOT NULL`),
  ],
);

export const assessmentDecisions = pgTable(
  "assessment_decisions",
  {
    id: id(),
    assessorId: uuid()
      .notNull()
      .references(() => users.id),
    submissionId: uuid().references(() => submissions.id),
    attemptId: uuid().references(() => assessmentAttempts.id),
    batchId: uuid()
      .notNull()
      .references(() => moderationBatches.id),
    outcome: decisionOutcome().notNull(),
    feedback: text().notNull(),
    supersedesId: uuid().references((): AnyPgColumn => assessmentDecisions.id),
    decidedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    // Set only by closing the batch (trigger); learners read decisions with released_at set.
    releasedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    check(
      "assessment_decisions_one_target",
      sql`(${t.submissionId} IS NULL) <> (${t.attemptId} IS NULL)`,
    ),
    check(
      "assessment_decisions_not_self_superseding",
      sql`${t.supersedesId} IS NULL OR ${t.supersedesId} <> ${t.id}`,
    ),
    index("assessment_decisions_batch_idx").on(t.batchId),
    // Versions form a single chain: a decision is superseded at most once.
    unique("assessment_decisions_supersedes_uq").on(t.supersedesId),
  ],
);

export const moderationRecords = pgTable(
  "moderation_records",
  {
    id: id(),
    decisionId: uuid()
      .notNull()
      .references(() => assessmentDecisions.id),
    moderatorId: uuid()
      .notNull()
      .references(() => users.id),
    // Agree = upheld; Agree with actions = upheld + required_actions;
    // Disagree = referred_back (required_actions optional). design.md §14, 2026-11-08.
    outcome: moderationOutcome().notNull(),
    findings: text().notNull(),
    requiredActions: text(),
    moderatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("moderation_records_decision_idx").on(t.decisionId),
    // One moderation verdict per decision version (a re-check is on the new version).
    unique("moderation_records_decision_uq").on(t.decisionId),
    check(
      "moderation_records_actions_not_blank",
      sql`${t.requiredActions} IS NULL OR length(btrim(${t.requiredActions})) > 0`,
    ),
  ],
);

/**
 * The moderator's sample: which learners' work (attempt or submission) in a
 * batch is moderated. Keyed by the work, not the decision version, so a
 * re-decided (superseded) decision stays in the sample. Reassessments ordered
 * on appeal are added automatically (reason 'reassessment').
 */
export const moderationSampleItems = pgTable(
  "moderation_sample_items",
  {
    id: id(),
    tenantId: tenantId(),
    batchId: uuid()
      .notNull()
      .references(() => moderationBatches.id),
    attemptId: uuid().references(() => assessmentAttempts.id),
    submissionId: uuid().references(() => submissions.id),
    reason: text().notNull().default("moderator"),
    addedBy: uuid()
      .notNull()
      .references(() => users.id),
    addedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "moderation_sample_items_one_target",
      sql`(${t.attemptId} IS NULL) <> (${t.submissionId} IS NULL)`,
    ),
    check(
      "moderation_sample_items_reason",
      sql`${t.reason} IN ('moderator', 'reassessment')`,
    ),
    unique("moderation_sample_items_attempt_uq").on(t.tenantId, t.batchId, t.attemptId),
    unique("moderation_sample_items_submission_uq").on(t.tenantId, t.batchId, t.submissionId),
    index("moderation_sample_items_batch_idx").on(t.batchId),
  ],
);

/** The assessor's "Actions done" on an Agree-with-actions verdict (append-only). */
export const moderationActionCompletions = pgTable(
  "moderation_action_completions",
  {
    id: id(),
    tenantId: tenantId(),
    moderationRecordId: uuid()
      .notNull()
      .references(() => moderationRecords.id),
    doneBy: uuid()
      .notNull()
      .references(() => users.id),
    note: text().notNull(),
    doneAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("moderation_action_completions_record_uq").on(t.tenantId, t.moderationRecordId),
    check(
      "moderation_action_completions_note_not_blank",
      sql`length(btrim(${t.note})) > 0`,
    ),
  ],
);

/** When an assessor last opened their Moderation feedback list (sidebar badge). */
export const moderationFeedbackReads = pgTable(
  "moderation_feedback_reads",
  {
    id: id(),
    tenantId: tenantId(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    seenAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [unique("moderation_feedback_reads_user_uq").on(t.tenantId, t.userId)],
);

/** Rubric marks for a short-answer item, per criterion. Locked once a decision is recorded. */
export const itemMarks = pgTable(
  "item_marks",
  {
    id: id(),
    attemptItemId: uuid()
      .notNull()
      .references(() => attemptItems.id),
    criterionId: uuid()
      .notNull()
      .references(() => rubricCriteria.id),
    marks: integer().notNull(),
    markedBy: uuid()
      .notNull()
      .references(() => users.id),
    markedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("item_marks_item_criterion_uq").on(t.attemptItemId, t.criterionId),
    check("item_marks_marks_nonnegative", sql`${t.marks} >= 0`),
  ],
);

/** The assessor's unsaved decision ("Save draft"). Recording it creates an immutable decision. */
export const decisionDrafts = pgTable(
  "decision_drafts",
  {
    attemptId: uuid()
      .notNull()
      .references(() => assessmentAttempts.id),
    assessorId: uuid()
      .notNull()
      .references(() => users.id),
    outcome: decisionOutcome(),
    feedback: text().notNull().default(""),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    primaryKey({
      name: "decision_drafts_pk",
      columns: [t.attemptId, t.assessorId],
    }),
  ],
);

/**
 * A learner appeal against a released decision. A moderator who did not make
 * the decision either upholds it or orders a reassessment (an extra attempt,
 * decided by a different assessor). Final once decided.
 */
export const appeals = pgTable(
  "appeals",
  {
    id: id(),
    decisionId: uuid()
      .notNull()
      .references(() => assessmentDecisions.id),
    enrolmentId: uuid()
      .notNull()
      .references(() => enrolments.id),
    reason: text().notNull(),
    status: appealStatus().notNull().default("open"),
    submittedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    decidedBy: uuid().references(() => users.id),
    decidedAt: timestamp({ withTimezone: true }),
    outcomeNotes: text(),
  },
  (t) => [
    unique("appeals_decision_uq").on(t.decisionId),
    check(
      "appeals_decided_fields",
      sql`(${t.status} = 'open') = (${t.decidedAt} IS NULL AND ${t.decidedBy} IS NULL)`,
    ),
    check("appeals_reason_length", sql`length(${t.reason}) BETWEEN 1 AND 4000`),
  ],
);
