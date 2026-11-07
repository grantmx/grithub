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
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id } from "./columns";
import {
  attemptStatus,
  batchStatus,
  decisionOutcome,
  moderationOutcome,
} from "./enums";
import { briefVariants, practicalBriefs, sections } from "./curriculum";
import { assessmentBlueprints, questionVersions } from "./questions";
import { cohorts } from "./cohorts";
import { enrolments, users } from "./people";

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
    status: attemptStatus().notNull().default("in_progress"),
    startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp({ withTimezone: true }),
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
    isCorrect: boolean(),
    answeredAt: timestamp({ withTimezone: true }),
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

export const submissions = pgTable(
  "submissions",
  {
    id: id(),
    enrolmentId: uuid()
      .notNull()
      .references(() => enrolments.id),
    briefVariantId: uuid()
      .notNull()
      .references(() => briefVariants.id),
    attemptNo: integer().notNull().default(1),
    storageKey: text().notNull(),
    checksumSha256: text().notNull(),
    sizeBytes: bigint({ mode: "number" }).notNull(),
    mimeType: text().notNull(),
    submittedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("submissions_storage_key_uq").on(t.storageKey),
    index("submissions_enrolment_idx").on(t.enrolmentId),
    check("submissions_size_positive", sql`${t.sizeBytes} > 0`),
    check(
      "submissions_checksum_format",
      sql`${t.checksumSha256} ~ '^[0-9a-f]{64}$'`,
    ),
    check("submissions_attempt_no", sql`${t.attemptNo} >= 1`),
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
    outcome: moderationOutcome().notNull(),
    findings: text().notNull(),
    moderatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("moderation_records_decision_idx").on(t.decisionId)],
);
