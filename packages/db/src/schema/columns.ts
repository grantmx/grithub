import { sql } from "drizzle-orm";
import { customType, timestamp, uuid } from "drizzle-orm/pg-core";
import { DEFAULT_TENANT_ID } from "../tenancy";

export const id = () => uuid().primaryKey().defaultRandom();

/** Nullable until the tenancy migration; defaults to the first tenant (src/tenancy.ts). */
export const tenantId = () => uuid().default(DEFAULT_TENANT_ID);

/**
 * Tenant key for uniqueness: a NULL tenant_id counts as the default tenant, so
 * the tenancy migration can backfill NULLs without creating duplicates.
 */
export const tenantKey = (col: unknown) =>
  sql`coalesce(${col}, ${sql.raw(`'${DEFAULT_TENANT_ID}'::uuid`)})`;

export const createdAt = () =>
  timestamp({ withTimezone: true }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/** Raw binary column (WebAuthn credential ids and public keys). */
export const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType() {
    return "bytea";
  },
});
