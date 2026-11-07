import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./columns";
import { blueprintKind, lifecycleStatus, questionType } from "./enums";
import { modules, sections } from "./curriculum";

export const questionBanks = pgTable(
  "question_banks",
  {
    id: id(),
    moduleId: uuid()
      .notNull()
      .references(() => modules.id),
    curriculumComponentRef: text().notNull(),
    title: text().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("question_banks_module_idx").on(t.moduleId)],
);

export const questions = pgTable(
  "questions",
  {
    id: id(),
    bankId: uuid()
      .notNull()
      .references(() => questionBanks.id),
    currentVersionId: uuid().references((): AnyPgColumn => questionVersions.id),
    status: lifecycleStatus().notNull().default("draft"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("questions_bank_idx").on(t.bankId)],
);

/**
 * Immutable once served: when `first_served_at` is set (automatically, when an
 * attempt item references the version), UPDATE and DELETE are rejected by a
 * trigger, and so are changes to its answer options. Editing a question means
 * creating a new version.
 */
export const questionVersions = pgTable(
  "question_versions",
  {
    id: id(),
    questionId: uuid()
      .notNull()
      .references(() => questions.id),
    versionNo: integer().notNull(),
    stem: text().notNull(),
    type: questionType().notNull().default("single"),
    feedback: text(),
    firstServedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    unique("question_versions_question_version_uq").on(
      t.questionId,
      t.versionNo,
    ),
    check("question_versions_version_positive", sql`${t.versionNo} >= 1`),
  ],
);

export const answerOptions = pgTable(
  "answer_options",
  {
    id: id(),
    questionVersionId: uuid()
      .notNull()
      .references(() => questionVersions.id),
    label: text().notNull(),
    // Server-only: never sent to a learner session (randomization.md §6).
    isCorrect: boolean().notNull().default(false),
    // Fixed display position, e.g. "All of the above" = -1 (last).
    pinnedPosition: smallint(),
    authorOrder: smallint().notNull(),
  },
  (t) => [
    unique("answer_options_version_order_uq").on(
      t.questionVersionId,
      t.authorOrder,
    ),
    index("answer_options_version_idx").on(t.questionVersionId),
  ],
);

/** The pool a section's single check question is drawn from. */
export const sectionQuestionPools = pgTable(
  "section_question_pools",
  {
    id: id(),
    sectionId: uuid()
      .notNull()
      .references(() => sections.id),
    minPoolSize: integer().notNull().default(3),
    createdAt: createdAt(),
  },
  (t) => [
    unique("section_question_pools_section_uq").on(t.sectionId),
    check("section_question_pools_min_size", sql`${t.minPoolSize} >= 1`),
  ],
);

export const sectionPoolQuestions = pgTable(
  "section_pool_questions",
  {
    poolId: uuid()
      .notNull()
      .references(() => sectionQuestionPools.id, { onDelete: "cascade" }),
    questionId: uuid()
      .notNull()
      .references(() => questions.id),
  },
  (t) => [
    primaryKey({
      name: "section_pool_questions_pk",
      columns: [t.poolId, t.questionId],
    }),
  ],
);

export const assessmentBlueprints = pgTable(
  "assessment_blueprints",
  {
    id: id(),
    moduleId: uuid()
      .notNull()
      .references(() => modules.id),
    title: text().notNull(),
    kind: blueprintKind().notNull(),
    maxAttempts: integer().notNull().default(1),
    timeLimitMinutes: integer(),
    passMarkPercent: integer().notNull(),
    inPersonOnly: boolean().notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("assessment_blueprints_max_attempts", sql`${t.maxAttempts} >= 1`),
    check(
      "assessment_blueprints_time_limit",
      sql`${t.timeLimitMinutes} IS NULL OR ${t.timeLimitMinutes} > 0`,
    ),
    check(
      "assessment_blueprints_pass_mark",
      sql`${t.passMarkPercent} BETWEEN 0 AND 100`,
    ),
  ],
);

/** "From bank X / curriculum component Y, draw N questions." */
export const blueprintRules = pgTable(
  "blueprint_rules",
  {
    id: id(),
    blueprintId: uuid()
      .notNull()
      .references(() => assessmentBlueprints.id, { onDelete: "cascade" }),
    bankId: uuid()
      .notNull()
      .references(() => questionBanks.id),
    curriculumComponentRef: text().notNull(),
    questionCount: integer().notNull(),
  },
  (t) => [
    unique("blueprint_rules_blueprint_bank_uq").on(t.blueprintId, t.bankId),
    check("blueprint_rules_question_count", sql`${t.questionCount} > 0`),
  ],
);
