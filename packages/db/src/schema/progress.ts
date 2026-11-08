import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  smallint,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { id } from "./columns";
import { sections } from "./curriculum";
import { enrolments } from "./people";

/**
 * Per-learner, per-section progress. "Continue" resumes the most recently
 * viewed section at its saved scroll position. A section is complete when the
 * learner marks it complete after answering its check (design.md §7).
 */
export const sectionProgress = pgTable(
  "section_progress",
  {
    id: id(),
    enrolmentId: uuid()
      .notNull()
      .references(() => enrolments.id),
    sectionId: uuid()
      .notNull()
      .references(() => sections.id),
    firstViewedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastViewedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    scrollPercent: smallint().notNull().default(0),
    completedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    unique("section_progress_enrolment_section_uq").on(
      t.enrolmentId,
      t.sectionId,
    ),
    index("section_progress_enrolment_viewed_idx").on(
      t.enrolmentId,
      t.lastViewedAt,
    ),
    check(
      "section_progress_scroll_range",
      sql`${t.scrollPercent} BETWEEN 0 AND 100`,
    ),
  ],
);
