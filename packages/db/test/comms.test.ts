import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as s from "../src/schema";
import * as comms from "../src/schema/comms";
import { DEFAULT_TENANT_ID } from "../src/tenancy";
import { PG, createTestDb, expectPgError, makeFixture, type TestDb } from "./helpers";

// Communication and support tables (design.md §14, 2026-11-08).

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
});
afterAll(async () => {
  await t?.teardown();
});

const one = <T>(rows: T[]): T => {
  expect(rows).toHaveLength(1);
  return rows[0]!;
};

describe("tenancy readiness", () => {
  const tables = [
    ...Object.values(comms),
    s.jobRuns,
  ]
    .filter((v) => typeof v === "object" && v !== null && Symbol.for("drizzle:IsDrizzleTable") in v)
    .map((v) => getTableConfig(v as PgTable));

  it("gives every communication table a nullable tenant_id defaulting to the first tenant", () => {
    expect(tables.length).toBeGreaterThanOrEqual(14);
    for (const c of tables) {
      const col = c.columns.find((x) => x.name === "tenantId" || x.name === "tenant_id");
      expect(col, c.name).toBeDefined();
      expect(col!.notNull, c.name).toBe(false);
    }
  });

  it("scopes job-run uniqueness per tenant (null tenant = default tenant)", async () => {
    await t.db.insert(s.jobRuns).values({ job: "digest", runKey: "2026-W46" });
    await expectPgError(t.db.insert(s.jobRuns).values({ job: "digest", runKey: "2026-W46", tenantId: null }), PG.uniqueViolation);
    await t.db.insert(s.jobRuns).values({ job: "digest", runKey: "2026-W46", tenantId: "00000000-0000-4000-8000-000000000002" });
    const [row] = await t.db.select().from(s.jobRuns).limit(1);
    expect(row!.tenantId).toBe(DEFAULT_TENANT_ID);
  });
});

describe("constraints", () => {
  it("allows one pinned announcement per cohort", async () => {
    const f = await makeFixture(t.db);
    const base = { cohortId: f.cohort.id, authorId: f.assessor.id, title: "T", body: "B", publishedAt: new Date() };
    await t.db.insert(s.announcements).values({ ...base, pinnedAt: new Date() });
    await t.db.insert(s.announcements).values(base);
    await expectPgError(t.db.insert(s.announcements).values({ ...base, pinnedAt: new Date() }), PG.uniqueViolation);
  });

  it("nests replies one level, in the same thread, and never deletes posts", async () => {
    const f = await makeFixture(t.db);
    const thread = one(
      await t.db.insert(s.discussionThreads).values({ cohortId: f.cohort.id, moduleId: f.module.id, authorId: f.assessor.id, title: "T", body: "B" }).returning(),
    );
    const other = one(
      await t.db.insert(s.discussionThreads).values({ cohortId: f.cohort.id, moduleId: f.module.id, authorId: f.assessor.id, title: "T2", body: "B" }).returning(),
    );
    const top = one(await t.db.insert(s.discussionPosts).values({ threadId: thread.id, authorId: f.learner.id, body: "top" }).returning());
    const reply = one(await t.db.insert(s.discussionPosts).values({ threadId: thread.id, parentId: top.id, authorId: f.learner.id, body: "reply" }).returning());
    await expectPgError(
      t.db.insert(s.discussionPosts).values({ threadId: thread.id, parentId: reply.id, authorId: f.learner.id, body: "deep" }),
      PG.checkViolation,
      /one level/,
    );
    await expectPgError(
      t.db.insert(s.discussionPosts).values({ threadId: other.id, parentId: top.id, authorId: f.learner.id, body: "cross" }),
      PG.checkViolation,
      /same thread/,
    );
    await expectPgError(() => t.sql`DELETE FROM discussion_posts WHERE id = ${top.id}`, PG.restrictViolation);
  });

  it("keeps conversations between two different people, learner and facilitator or assessor", async () => {
    const f = await makeFixture(t.db);
    await expectPgError(
      t.db.insert(s.conversations).values({ cohortId: f.cohort.id, learnerId: f.learner.id, staffId: f.learner.id, staffRole: "facilitator" }),
      PG.checkViolation,
    );
    await expectPgError(
      t.db.insert(s.conversations).values({ cohortId: f.cohort.id, learnerId: f.learner.id, staffId: f.moderator.id, staffRole: "moderator" }),
      PG.checkViolation,
    );
    await t.db.insert(s.conversations).values({ cohortId: f.cohort.id, learnerId: f.learner.id, staffId: f.assessor.id, staffRole: "assessor" });
    await expectPgError(
      t.db.insert(s.conversations).values({ cohortId: f.cohort.id, learnerId: f.learner.id, staffId: f.assessor.id, staffRole: "assessor" }),
      PG.uniqueViolation,
    );
  });

  it("requires a cohort on academic tickets and ordered session times", async () => {
    const f = await makeFixture(t.db);
    const due = { firstResponseDueAt: new Date(), resolveDueAt: new Date() };
    await expectPgError(
      t.db.insert(s.supportTickets).values({ raisedBy: f.learner.id, category: "academic", subject: "S", body: "B", ...due }),
      PG.checkViolation,
    );
    await t.db.insert(s.supportTickets).values({ raisedBy: f.learner.id, category: "technical", subject: "S", body: "B", ...due });
    const at = new Date();
    await expectPgError(
      t.db.insert(s.liveSessions).values({ cohortId: f.cohort.id, title: "S", startsAt: at, endsAt: at, joinUrl: "https://zoom.us/j/1", createdBy: f.assessor.id }),
      PG.checkViolation,
    );
  });

  it("keeps message revisions append-only", async () => {
    const f = await makeFixture(t.db);
    const rev = one(
      await t.db.insert(s.messageRevisions).values({ targetType: "direct_message", targetId: f.learner.id, body: "old", revisedBy: f.learner.id }).returning(),
    );
    await expectPgError(() => t.sql`UPDATE message_revisions SET body = 'x' WHERE id = ${rev.id}`, PG.restrictViolation);
  });
});

describe("Form 5 evidence tables (2026-11-09)", () => {
  it("carry a nullable tenant_id and keep one current reference per item", async () => {
    for (const table of [s.complianceDocuments, s.curriculumReferences, s.learnerGuides, s.backupRuns]) {
      const c = getTableConfig(table as PgTable);
      expect(c.columns.find((x) => x.name === "tenantId" || x.name === "tenant_id")?.notNull, c.name).toBe(false);
    }
    const f = await makeFixture(t.db);
    const doc = { itemCode: "4.1.5", title: "ISP contract (fake)", location: "Drive", recordedBy: f.assessor.id };
    await t.db.insert(s.complianceDocuments).values(doc);
    await expectPgError(t.db.insert(s.complianceDocuments).values(doc), PG.uniqueViolation);
    await expectPgError(t.db.insert(s.complianceDocuments).values({ ...doc, itemCode: "9.9" }), PG.checkViolation);
    await expectPgError(
      t.db.insert(s.backupRuns).values({ kind: "backup", status: "ok", startedAt: new Date() }),
      PG.checkViolation,
    );
    await expectPgError(
      t.db.insert(s.backupRuns).values({ kind: "restore_test", status: "ok", startedAt: new Date() }),
      PG.checkViolation,
    );
  });
});
