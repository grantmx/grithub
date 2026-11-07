import { randomBytes } from "node:crypto";
import postgres from "postgres";
import { createDb, type Database } from "./client";
import { readDbConfig, type DbConfig } from "./env";
import { runMigrations } from "./migrate";

// Test-only utilities (exported as "db/testing"). Never import from app code.

export type TestDb = {
  db: Database;
  config: DbConfig;
  /** Raw SQL client for statements Drizzle's types would reject (e.g. invalid enums). */
  sql: postgres.Sql;
  teardown: () => Promise<void>;
};

/**
 * Create a fresh, fully migrated database for one test file and drop it after.
 * Needs TEST_DATABASE_URL pointing at a local or disposable Postgres server.
 */
export async function createTestDb(): Promise<TestDb> {
  const admin = readDbConfig(process.env, "TEST_DATABASE_URL");
  const name = `lms_test_${randomBytes(6).toString("hex")}`;
  const adminSql = postgres(admin.url, {
    ssl: admin.ssl,
    max: 1,
    onnotice: () => {},
  });
  await adminSql.unsafe(`CREATE DATABASE "${name}"`);

  const url = new URL(admin.url);
  url.pathname = `/${name}`;
  const config: DbConfig = { ...admin, url: url.toString(), poolMax: 2 };

  await runMigrations(config);
  const { db, close } = createDb(config);
  const sql = postgres(config.url, {
    ssl: config.ssl,
    max: 1,
    onnotice: () => {},
  });

  return {
    db,
    config,
    sql,
    teardown: async () => {
      await close();
      await sql.end({ timeout: 5 });
      await adminSql.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      await adminSql.end({ timeout: 5 });
    },
  };
}
