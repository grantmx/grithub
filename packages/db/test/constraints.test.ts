import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as s from "../src/schema";
import {
  createTestDb,
  expectPgError,
  makeFixture,
  PG,
  type TestDb,
} from "./helpers";

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
});
afterAll(async () => {
  await t?.teardown();
});

describe("modules", () => {
  it("only allow knowledge and practical (no workplace module)", async () => {
    const f = await makeFixture(t.db);
    await expectPgError(
      t.sql`INSERT INTO modules (qualification_id, code, type, title, credits)
            VALUES (${f.qualification.id}, 'WM-01', 'workplace', 'Workplace', 1)`,
      PG.invalidEnum,
    );
  });

  it("has no workplace, logbook or mentor tables or values", async () => {
    const tables = await t.sql<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    const names = tables.map((r) => r.table_name).join(" ");
    expect(names).not.toMatch(/workplace|logbook|mentor/i);

    const enumValues = await t.sql<
      { enumlabel: string }[]
    >`SELECT enumlabel FROM pg_enum`;
    expect(enumValues.map((r) => r.enumlabel).join(" ")).not.toMatch(
      /workplace|logbook|mentor/i,
    );
  });
});

describe("role grants", () => {
  it("require an expiry for external evaluators", async () => {
    const f = await makeFixture(t.db);
    const evaluator = await f.user("evaluator");
    await expectPgError(
      t.db
        .insert(s.roleGrants)
        .values({ userId: evaluator.id, role: "external_evaluator" }),
      PG.checkViolation,
    );
    await t.db.insert(s.roleGrants).values({
      userId: evaluator.id,
      role: "external_evaluator",
      expiresAt: new Date(Date.now() + 86_400_000),
    });
  });

  it("keep SDP admin and evaluator global (no cohort)", async () => {
    const f = await makeFixture(t.db);
    const admin = await f.user("admin");
    await expectPgError(
      t.db
        .insert(s.roleGrants)
        .values({ userId: admin.id, role: "sdp_admin", cohortId: f.cohort.id }),
      PG.checkViolation,
    );
  });

  it("reject duplicate global grants", async () => {
    const f = await makeFixture(t.db);
    const admin = await f.user("admin");
    await t.db
      .insert(s.roleGrants)
      .values({ userId: admin.id, role: "sdp_admin" });
    await expectPgError(
      t.db.insert(s.roleGrants).values({ userId: admin.id, role: "sdp_admin" }),
      PG.uniqueViolation,
    );
  });
});

describe("content items", () => {
  it("text items need a body", async () => {
    const f = await makeFixture(t.db);
    await expectPgError(
      t.db
        .insert(s.contentItems)
        .values({ sectionId: f.section.id, kind: "text", title: "No body" }),
      PG.checkViolation,
    );
  });

  it("audio and video need a hosted asset id", async () => {
    const f = await makeFixture(t.db);
    await expectPgError(
      t.db
        .insert(s.contentItems)
        .values({ sectionId: f.section.id, kind: "video", title: "No asset" }),
      PG.checkViolation,
    );
  });

  it("published audio/video needs a transcript; drafts do not", async () => {
    const f = await makeFixture(t.db);
    await t.db.insert(s.contentItems).values({
      sectionId: f.section.id,
      kind: "audio",
      title: "Draft audio",
      mediaAssetId: "TEST-ASSET",
    });
    await expectPgError(
      t.db.insert(s.contentItems).values({
        sectionId: f.section.id,
        kind: "audio",
        title: "Published audio",
        mediaAssetId: "TEST-ASSET",
        status: "published",
      }),
      PG.checkViolation,
    );
  });

  it("documents need a storage key and links must be https", async () => {
    const f = await makeFixture(t.db);
    await expectPgError(
      t.db
        .insert(s.contentItems)
        .values({ sectionId: f.section.id, kind: "document", title: "Doc" }),
      PG.checkViolation,
    );
    await expectPgError(
      t.db.insert(s.contentItems).values({
        sectionId: f.section.id,
        kind: "external_link",
        title: "Insecure link",
        externalUrl: "http://example.invalid",
      }),
      PG.checkViolation,
    );
  });
});

describe("learning content (captions, transcripts, library, progress)", () => {
  it("published video needs captions", async () => {
    const f = await makeFixture(t.db);
    await expectPgError(
      t.db.insert(s.contentItems).values({
        sectionId: f.section.id,
        kind: "video",
        title: "No captions",
        mediaAssetId: "A",
        transcript: "T",
        status: "published",
      }),
      PG.checkViolation,
    );
  });

  it("the section text may serve as the transcript", async () => {
    const f = await makeFixture(t.db);
    await t.db.insert(s.contentItems).values({
      sectionId: f.section.id,
      kind: "audio",
      title: "Audio narrating the text",
      mediaAssetId: "A",
      transcriptIsSectionText: true,
      status: "published",
    });
  });

  it("library links must be https", async () => {
    const f = await makeFixture(t.db);
    await expectPgError(
      t.db.insert(s.libraryResources).values({
        qualificationId: f.qualification.id,
        title: "Insecure",
        kind: "link",
        url: "http://example.invalid",
      }),
      PG.checkViolation,
    );
  });

  it("section progress is unique per enrolment and section, scroll 0-100", async () => {
    const f = await makeFixture(t.db);
    await t.db
      .insert(s.sectionProgress)
      .values({ enrolmentId: f.enrolment.id, sectionId: f.section.id });
    await expectPgError(
      t.db
        .insert(s.sectionProgress)
        .values({ enrolmentId: f.enrolment.id, sectionId: f.section.id }),
      PG.uniqueViolation,
    );
    const g = await makeFixture(t.db);
    await expectPgError(
      t.db.insert(s.sectionProgress).values({
        enrolmentId: g.enrolment.id,
        sectionId: g.section.id,
        scrollPercent: 101,
      }),
      PG.checkViolation,
    );
  });
});

describe("attempts and submissions", () => {
  it("an attempt targets exactly one of blueprint or section", async () => {
    const f = await makeFixture(t.db);
    await expectPgError(
      t.db.insert(s.assessmentAttempts).values({
        enrolmentId: f.enrolment.id,
        blueprintId: f.blueprint.id,
        sectionId: f.section.id,
        attemptNo: 1,
      }),
      PG.checkViolation,
    );
  });

  it("attempt numbers are unique per learner and blueprint", async () => {
    const f = await makeFixture(t.db);
    await t.db.insert(s.assessmentAttempts).values({
      enrolmentId: f.enrolment.id,
      blueprintId: f.blueprint.id,
      attemptNo: 50,
    });
    await expectPgError(
      t.db.insert(s.assessmentAttempts).values({
        enrolmentId: f.enrolment.id,
        blueprintId: f.blueprint.id,
        attemptNo: 50,
      }),
      PG.uniqueViolation,
    );
  });
});

describe("audit log is append-only", () => {
  it("rejects UPDATE, DELETE and TRUNCATE", async () => {
    await t.db
      .insert(s.auditLog)
      .values({ action: "test.event", entityType: "test" });
    await expectPgError(
      t.sql`UPDATE audit_log SET action = 'tampered'`,
      PG.restrictViolation,
    );
    await expectPgError(t.sql`DELETE FROM audit_log`, PG.restrictViolation);
    await expectPgError(t.sql`TRUNCATE audit_log`, PG.restrictViolation);
    const rows = await t.sql<
      { count: string }[]
    >`SELECT count(*)::text AS count FROM audit_log`;
    expect(Number(rows[0]?.count)).toBeGreaterThanOrEqual(1);
  });
});
