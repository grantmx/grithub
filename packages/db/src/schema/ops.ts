import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id } from "./columns";
import { syncStatus } from "./enums";
import { users } from "./people";

/**
 * Transactional outbox for the one-way Airtable sync. Rows are written in the
 * same transaction as the change they describe; payloads hold minimal fields.
 */
export const syncOutbox = pgTable(
  "sync_outbox",
  {
    id: id(),
    aggregateType: text().notNull(),
    aggregateId: uuid().notNull(),
    eventType: text().notNull(),
    payload: jsonb().$type<Record<string, unknown>>().notNull(),
    status: syncStatus().notNull().default("pending"),
    attempts: integer().notNull().default(0),
    nextAttemptAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastError: text(),
    createdAt: createdAt(),
    sentAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    index("sync_outbox_pending_idx")
      .on(t.nextAttemptAt)
      .where(sql`${t.status} = 'pending'`),
    check("sync_outbox_attempts_nonneg", sql`${t.attempts} >= 0`),
    check(
      "sync_outbox_sent_at",
      sql`(${t.status} = 'sent') = (${t.sentAt} IS NOT NULL)`,
    ),
  ],
);

/** Append-only: UPDATE, DELETE and TRUNCATE are rejected by triggers. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    actorId: uuid().references(() => users.id),
    action: text().notNull(),
    entityType: text().notNull(),
    entityId: uuid(),
    before: jsonb().$type<Record<string, unknown>>(),
    after: jsonb().$type<Record<string, unknown>>(),
    ipHash: text(),
    at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_entity_idx").on(t.entityType, t.entityId),
    index("audit_log_actor_idx").on(t.actorId),
  ],
);
