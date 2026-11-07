import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./columns";
import { ticketCategory, ticketStatus } from "./enums";
import { cohorts } from "./cohorts";
import { sections } from "./curriculum";
import { users } from "./people";

export const announcements = pgTable(
  "announcements",
  {
    id: id(),
    cohortId: uuid()
      .notNull()
      .references(() => cohorts.id),
    authorId: uuid()
      .notNull()
      .references(() => users.id),
    title: text().notNull(),
    body: text().notNull(),
    publishedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("announcements_cohort_idx").on(t.cohortId, t.publishedAt)],
);

export const discussionThreads = pgTable(
  "discussion_threads",
  {
    id: id(),
    cohortId: uuid()
      .notNull()
      .references(() => cohorts.id),
    sectionId: uuid().references(() => sections.id),
    authorId: uuid()
      .notNull()
      .references(() => users.id),
    title: text().notNull(),
    locked: boolean().notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("discussion_threads_cohort_idx").on(t.cohortId)],
);

export const discussionPosts = pgTable(
  "discussion_posts",
  {
    id: id(),
    threadId: uuid()
      .notNull()
      .references(() => discussionThreads.id, { onDelete: "cascade" }),
    authorId: uuid()
      .notNull()
      .references(() => users.id),
    body: text().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("discussion_posts_thread_idx").on(t.threadId)],
);

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: id(),
    raisedBy: uuid()
      .notNull()
      .references(() => users.id),
    category: ticketCategory().notNull(),
    status: ticketStatus().notNull().default("open"),
    subject: text().notNull(),
    body: text().notNull(),
    assignedTo: uuid().references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("support_tickets_status_idx").on(t.status)],
);
