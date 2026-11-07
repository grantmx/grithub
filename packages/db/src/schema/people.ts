import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { bytea, createdAt, id, updatedAt } from "./columns";
import { enrolmentStatus, staffRole, userStatus } from "./enums";
import { cohorts } from "./cohorts";

export const users = pgTable(
  "users",
  {
    id: id(),
    displayName: text().notNull(),
    email: text().notNull(),
    status: userStatus().notNull().default("invited"),
    popiaNoticeAcceptedAt: timestamp({ withTimezone: true }),
    popiaNoticeVersion: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("users_email_lower_uq").on(sql`lower(${t.email})`),
    check(
      "users_popia_version_with_acceptance",
      sql`(${t.popiaNoticeAcceptedAt} IS NULL) = (${t.popiaNoticeVersion} IS NULL)`,
    ),
  ],
);

export const passkeyCredentials = pgTable(
  "passkey_credentials",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // base64url credential id, exactly as WebAuthn responses carry it.
    credentialId: text().notNull(),
    publicKey: bytea().notNull(),
    signCount: bigint({ mode: "number" }).notNull().default(0),
    transports: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    deviceLabel: text().notNull().default("Passkey"),
    deviceType: text(),
    backedUp: boolean().notNull().default(false),
    createdAt: createdAt(),
    lastUsedAt: timestamp({ withTimezone: true }),
    // Revoked passkeys are kept for the audit trail but can never sign in.
    revokedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    unique("passkey_credentials_credential_id_uq").on(t.credentialId),
    index("passkey_credentials_user_idx").on(t.userId),
    check("passkey_credentials_sign_count_nonneg", sql`${t.signCount} >= 0`),
    check(
      "passkey_credentials_label_length",
      sql`char_length(${t.deviceLabel}) BETWEEN 1 AND 60`,
    ),
  ],
);

/** Staff/evaluator roles, scoped per cohort (null cohort = global). */
export const roleGrants = pgTable(
  "role_grants",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: staffRole().notNull(),
    cohortId: uuid().references(() => cohorts.id, { onDelete: "cascade" }),
    expiresAt: timestamp({ withTimezone: true }),
    grantedBy: uuid().references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    unique("role_grants_user_role_cohort_uq")
      .on(t.userId, t.role, t.cohortId)
      .nullsNotDistinct(),
    index("role_grants_user_idx").on(t.userId),
    // SDP admin and external evaluator are global roles.
    check(
      "role_grants_global_roles_have_no_cohort",
      sql`${t.role} NOT IN ('sdp_admin', 'external_evaluator') OR ${t.cohortId} IS NULL`,
    ),
    // External evaluator access is always time-boxed.
    check(
      "role_grants_evaluator_expires",
      sql`${t.role} <> 'external_evaluator' OR ${t.expiresAt} IS NOT NULL`,
    ),
  ],
);

export const enrolments = pgTable(
  "enrolments",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    cohortId: uuid()
      .notNull()
      .references(() => cohorts.id),
    status: enrolmentStatus().notNull().default("active"),
    enrolledAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("enrolments_user_cohort_uq").on(t.userId, t.cohortId),
    index("enrolments_cohort_idx").on(t.cohortId),
  ],
);
