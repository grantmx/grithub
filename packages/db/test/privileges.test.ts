import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./helpers";

/**
 * sql/least-privilege.sql: the runtime role can read and write rows but can't
 * change the schema, truncate, or alter append-only evidence.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const script = readFileSync(
  path.join(here, "..", "sql", "least-privilege.sql"),
  "utf8",
);

let t: TestDb;
let app: postgres.Sql;

async function fails(op: () => Promise<unknown>, code: string) {
  let caught: { code?: string } | undefined;
  try {
    await op();
  } catch (e) {
    caught = e as { code?: string };
  }
  expect(caught?.code).toBe(code);
}

beforeAll(async () => {
  t = await createTestDb();
  await t.sql.unsafe(script);
  await t.sql.unsafe(script); // re-runnable
  // Test-only password for a role in a disposable database.
  const password = randomBytes(18).toString("hex");
  await t.sql.unsafe(`ALTER ROLE lms_app PASSWORD '${password}'`);
  const url = new URL(t.config.url);
  url.username = "lms_app";
  url.password = password;
  app = postgres(url.toString(), {
    ssl: t.config.ssl,
    max: 1,
    onnotice: () => {},
  });
});

afterAll(async () => {
  await app?.end({ timeout: 5 });
  await t?.teardown();
});

describe("least-privilege runtime role (lms_app)", () => {
  it("is not a superuser and can't create roles or databases", async () => {
    const [r] =
      await app`select rolsuper, rolcreaterole, rolcreatedb, rolbypassrls from pg_roles where rolname = current_user`;
    expect(r).toMatchObject({
      rolsuper: false,
      rolcreaterole: false,
      rolcreatedb: false,
      rolbypassrls: false,
    });
  });

  it("reads and writes ordinary rows", async () => {
    await app`select count(*) from users`;
    await app`insert into rate_limit_buckets (key, window_start, count) values ('priv-test', now(), 1)`;
    await app`update rate_limit_buckets set count = 2 where key = 'priv-test'`;
    await app`delete from rate_limit_buckets where key = 'priv-test'`;
  });

  it("can't change the schema or truncate", async () => {
    await fails(() => app`create table nope (id int)`, "42501");
    await fails(() => app`drop table users`, "42501");
    await fails(() => app`alter table users add column nope int`, "42501");
    await fails(() => app`truncate rate_limit_buckets`, "42501");
    await fails(
      () =>
        app`create trigger nope before insert on users for each row execute function now()`,
      "42501",
    );
  });

  it("can only insert into and read append-only evidence tables", async () => {
    await app`select count(*) from audit_log`;
    await app`insert into audit_log (action, entity_type) values ('auth.rate_limited', 'privilege_test')`;
    await fails(() => app`update audit_log set entity_type = 'x'`, "42501");
    await fails(() => app`delete from audit_log`, "42501");
    await fails(() => app`delete from consent_records`, "42501");
    await fails(() => app`update moderation_records set id = id`, "42501");
  });
});
