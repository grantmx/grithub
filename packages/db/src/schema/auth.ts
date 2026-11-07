import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id } from "./columns";
import { cohorts } from "./cohorts";
import { users } from "./people";

/** How a session was established. */
export const sessionAuthMethod = pgEnum("session_auth_method", [
  "passkey",
  "magic_link",
  "invitation",
  "recovery",
]);

/** Single-use emailed tokens. Only a SHA-256 hash is stored. */
export const authTokenPurpose = pgEnum("auth_token_purpose", [
  "invitation",
  "magic_link",
  "recovery",
]);

export const webauthnCeremony = pgEnum("webauthn_ceremony", [
  "registration",
  "authentication",
]);

/**
 * Server-side sessions. The cookie holds a random token; only its SHA-256
 * hash is stored here, so a database leak does not leak live sessions.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    tokenHash: text().notNull().unique("sessions_token_hash_uq"),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    authMethod: sessionAuthMethod().notNull(),
    createdAt: createdAt(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    lastSeenAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp({ withTimezone: true }),
    ipHash: text(),
  },
  (t) => [
    index("sessions_user_idx").on(t.userId),
    check(
      "sessions_expiry_after_creation",
      sql`${t.expiresAt} > ${t.createdAt}`,
    ),
  ],
);

/** Invitation, magic-link and recovery tokens: single use, short-lived. */
export const authTokens = pgTable(
  "auth_tokens",
  {
    id: id(),
    tokenHash: text().notNull().unique("auth_tokens_token_hash_uq"),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: authTokenPurpose().notNull(),
    // Invitations record the cohort the learner was invited into.
    cohortId: uuid().references(() => cohorts.id),
    createdBy: uuid().references(() => users.id),
    createdAt: createdAt(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    usedAt: timestamp({ withTimezone: true }),
    revokedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    index("auth_tokens_user_purpose_idx").on(t.userId, t.purpose),
    check(
      "auth_tokens_expiry_after_creation",
      sql`${t.expiresAt} > ${t.createdAt}`,
    ),
  ],
);

/** One-time WebAuthn challenges, bound to the browser by an httpOnly cookie. */
export const webauthnChallenges = pgTable(
  "webauthn_challenges",
  {
    id: id(),
    challenge: text().notNull().unique("webauthn_challenges_challenge_uq"),
    ceremony: webauthnCeremony().notNull(),
    // Set for registration (signed-in user); null for discoverable sign-in.
    userId: uuid().references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    usedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    check(
      "webauthn_challenges_registration_has_user",
      sql`${t.ceremony} <> 'registration' OR ${t.userId} IS NOT NULL`,
    ),
  ],
);

/**
 * Fixed-window rate-limit counters shared by all serverless instances.
 * Keys are HMACs of the client IP / email, never raw personal data.
 */
export const rateLimitBuckets = pgTable(
  "rate_limit_buckets",
  {
    key: text().primaryKey(),
    windowStart: timestamp({ withTimezone: true }).notNull().defaultNow(),
    count: integer().notNull().default(0),
  },
  (t) => [check("rate_limit_buckets_count_nonneg", sql`${t.count} >= 0`)],
);

/**
 * POPIA notice acceptances (append-only). Stores the notice version and the
 * SHA-256 of the exact text shown, so the wording accepted can be proven.
 */
export const consentRecords = pgTable(
  "consent_records",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    noticeVersion: text().notNull(),
    noticeSha256: text().notNull(),
    acceptedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    ipHash: text(),
  },
  (t) => [
    index("consent_records_user_idx").on(t.userId),
    check(
      "consent_records_sha256_format",
      sql`${t.noticeSha256} ~ '^[0-9a-f]{64}$'`,
    ),
  ],
);
