import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { type DbConfig, readDbConfig } from "./env";

export type Database = PostgresJsDatabase<typeof schema>;

export type DbHandle = {
  db: Database;
  /** Close all connections (scripts and tests). */
  close: () => Promise<void>;
};

export function createDb(config: DbConfig = readDbConfig()): DbHandle {
  const client = postgres(config.url, {
    ssl: config.ssl,
    max: config.poolMax,
    // Keep Postgres NOTICE messages (e.g. from migrations) out of app logs.
    onnotice: () => {},
  });
  const db = drizzle(client, { schema, casing: "snake_case" });
  return { db, close: () => client.end({ timeout: 5 }) };
}
