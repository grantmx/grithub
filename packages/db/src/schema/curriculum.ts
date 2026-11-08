import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id, tenantId, updatedAt } from "./columns";
import {
  briefMode,
  contentKind,
  libraryResourceKind,
  lifecycleStatus,
  moduleType,
  publishStatus,
  qualificationStatus,
} from "./enums";

export const qualifications = pgTable(
  "qualifications",
  {
    id: id(),
    saqaId: text(),
    curriculumCode: text().notNull(),
    title: text().notNull(),
    nqfLevel: smallint().notNull(),
    status: qualificationStatus().notNull().default("draft"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    unique("qualifications_curriculum_code_uq").on(t.curriculumCode),
    check(
      "qualifications_nqf_level_range",
      sql`${t.nqfLevel} BETWEEN 1 AND 10`,
    ),
  ],
);

export const modules = pgTable(
  "modules",
  {
    id: id(),
    qualificationId: uuid()
      .notNull()
      .references(() => qualifications.id),
    code: text().notNull(),
    type: moduleType().notNull(),
    title: text().notNull(),
    credits: integer().notNull(),
    sortOrder: integer().notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("modules_qualification_code_uq").on(t.qualificationId, t.code),
    check("modules_credits_positive", sql`${t.credits} > 0`),
  ],
);

export const sections = pgTable(
  "sections",
  {
    id: id(),
    moduleId: uuid()
      .notNull()
      .references(() => modules.id),
    title: text().notNull(),
    curriculumComponentRef: text().notNull(),
    sortOrder: integer().notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("sections_module_idx").on(t.moduleId)],
);

/**
 * One piece of content in a section. Text is the core; audio and video are
 * optional extras and need a transcript before they can be published
 * (design.md §10).
 */
export const contentItems = pgTable(
  "content_items",
  {
    id: id(),
    sectionId: uuid()
      .notNull()
      .references(() => sections.id),
    kind: contentKind().notNull(),
    title: text().notNull(),
    body: text(),
    mediaAssetId: text(),
    // Mux playback id (signed playback policy) and estimated size for the
    // "6 min · ~25 MB" label shown before the learner chooses to load it.
    mediaPlaybackId: text(),
    mediaSizeBytes: bigint({ mode: "number" }),
    durationSeconds: integer(),
    transcript: text(),
    // True when the section text itself is the transcript of this media.
    transcriptIsSectionText: boolean().notNull().default(false),
    // BCP 47 language of the video's captions track (required to publish video).
    captionsLanguage: text(),
    storageKey: text(),
    externalUrl: text(),
    sortOrder: integer().notNull().default(0),
    status: publishStatus().notNull().default("draft"),
    version: integer().notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("content_items_section_idx").on(t.sectionId),
    check(
      "content_items_text_has_body",
      sql`${t.kind} <> 'text' OR ${t.body} IS NOT NULL`,
    ),
    check(
      "content_items_media_has_asset",
      sql`${t.kind} NOT IN ('audio', 'video') OR ${t.mediaAssetId} IS NOT NULL`,
    ),
    check(
      "content_items_published_media_has_transcript",
      sql`${t.kind} NOT IN ('audio', 'video') OR ${t.status} = 'draft' OR ${t.transcript} IS NOT NULL OR ${t.transcriptIsSectionText}`,
    ),
    check(
      "content_items_published_video_has_captions",
      sql`${t.kind} <> 'video' OR ${t.status} = 'draft' OR ${t.captionsLanguage} IS NOT NULL`,
    ),
    check(
      "content_items_media_size_positive",
      sql`${t.mediaSizeBytes} IS NULL OR ${t.mediaSizeBytes} > 0`,
    ),
    check(
      "content_items_document_has_storage_key",
      sql`${t.kind} <> 'document' OR ${t.storageKey} IS NOT NULL`,
    ),
    check(
      "content_items_link_is_https",
      sql`${t.kind} <> 'external_link' OR ${t.externalUrl} ~ '^https://'`,
    ),
    check("content_items_version_positive", sql`${t.version} >= 1`),
  ],
);

export const practicalBriefs = pgTable(
  "practical_briefs",
  {
    id: id(),
    moduleId: uuid()
      .notNull()
      .references(() => modules.id),
    curriculumComponentRef: text().notNull(),
    title: text().notNull(),
    instructions: text().notNull(),
    // Plain-text summary; the structured rubric is brief_criteria.
    assessmentCriteria: text().notNull(),
    mode: briefMode().notNull().default("submission"),
    maxAttempts: integer().notNull().default(2),
    // Criteria and variants are locked once published (every variant shares them).
    status: publishStatus().notNull().default("draft"),
    publishedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("practical_briefs_module_idx").on(t.moduleId),
    check("practical_briefs_max_attempts", sql`${t.maxAttempts} BETWEEN 1 AND 10`),
    check(
      "practical_briefs_published_at",
      sql`(${t.status} = 'published') = (${t.publishedAt} IS NOT NULL)`,
    ),
  ],
);

/**
 * Practical rubric: assessment criteria judged Met / Not yet met. Shared by
 * every variant of the brief (equivalent tasks, same criteria).
 */
export const briefCriteria = pgTable(
  "brief_criteria",
  {
    id: id(),
    tenantId: tenantId(),
    briefId: uuid()
      .notNull()
      .references(() => practicalBriefs.id),
    code: text().notNull(),
    label: text().notNull(),
    guidance: text(),
    sortOrder: smallint().notNull(),
  },
  (t) => [
    unique("brief_criteria_brief_code_uq").on(t.tenantId, t.briefId, t.code),
    unique("brief_criteria_brief_order_uq").on(t.tenantId, t.briefId, t.sortOrder),
  ],
);

export const briefVariants = pgTable(
  "brief_variants",
  {
    id: id(),
    briefId: uuid()
      .notNull()
      .references(() => practicalBriefs.id),
    label: text().notNull(),
    variantInstructions: text().notNull(),
    status: lifecycleStatus().notNull().default("draft"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("brief_variants_brief_label_uq").on(t.briefId, t.label)],
);

/** Supplementary resources per programme (digital library, Form 5 4.2.7). */
export const libraryResources = pgTable(
  "library_resources",
  {
    id: id(),
    qualificationId: uuid()
      .notNull()
      .references(() => qualifications.id),
    title: text().notNull(),
    description: text(),
    kind: libraryResourceKind().notNull(),
    url: text(),
    storageKey: text(),
    sortOrder: integer().notNull().default(0),
    published: boolean().notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("library_resources_qualification_idx").on(t.qualificationId),
    check(
      "library_resources_link_is_https",
      sql`${t.kind} <> 'link' OR ${t.url} ~ '^https://'`,
    ),
    check(
      "library_resources_document_has_storage_key",
      sql`${t.kind} <> 'document' OR ${t.storageKey} IS NOT NULL`,
    ),
  ],
);
