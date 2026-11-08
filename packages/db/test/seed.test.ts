import { count, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as s from "../src/schema";
import { assertSeedAllowed, seedDemo } from "../src/seed";
import { DEMO_EMAIL_DOMAIN, DEMO_QUALIFICATION_CODE } from "../src/seed-data";
import { createTestDb, type TestDb } from "./helpers";

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
  await seedDemo(t.db);
});
afterAll(async () => {
  await t?.teardown();
});

describe("demo seed", () => {
  it("creates one DEMO qualification with one knowledge and one practical module", async () => {
    const [q] = await t.db
      .select()
      .from(s.qualifications)
      .where(eq(s.qualifications.curriculumCode, DEMO_QUALIFICATION_CODE));
    expect(q?.title).toMatch(/^DEMO/);
    const mods = await t.db
      .select()
      .from(s.modules)
      .where(eq(s.modules.qualificationId, q!.id));
    expect(mods.map((m) => m.type).sort()).toEqual(["knowledge", "practical"]);
  });

  it("has at least 12 questions across 3 knowledge sections, each with a pool", async () => {
    const [qCount] = await t.db.select({ n: count() }).from(s.questions);
    expect(qCount!.n).toBeGreaterThanOrEqual(12);

    const pools = await t.db
      .select({ poolId: s.sectionPoolQuestions.poolId, n: count() })
      .from(s.sectionPoolQuestions)
      .groupBy(s.sectionPoolQuestions.poolId);
    expect(pools).toHaveLength(3);
    expect(pools.every((p) => p.n >= 3)).toBe(true);
  });

  it("gives every question a current version with exactly one correct option", async () => {
    const qs = await t.db.select().from(s.questions);
    for (const q of qs) {
      expect(q.currentVersionId).not.toBeNull();
      const opts = await t.db
        .select()
        .from(s.answerOptions)
        .where(eq(s.answerOptions.questionVersionId, q.currentVersionId!));
      expect(opts.filter((o) => o.isCorrect)).toHaveLength(1);
    }
  });

  it("pins every 'All of the above' option", async () => {
    const opts = await t.db
      .select()
      .from(s.answerOptions)
      .where(eq(s.answerOptions.label, "All of the above"));
    expect(opts.length).toBeGreaterThan(0);
    expect(opts.every((o) => o.pinnedPosition === -1)).toBe(true);
  });

  it("includes text in every section and media placeholders with transcripts", async () => {
    const items = await t.db.select().from(s.contentItems);
    const sections = await t.db.select().from(s.sections);
    for (const sec of sections) {
      expect(
        items.some((i) => i.sectionId === sec.id && i.kind === "text"),
      ).toBe(true);
    }
    const media = items.filter((i) => i.kind === "audio" || i.kind === "video");
    expect(media.map((m) => m.kind).sort()).toEqual(["audio", "video"]);
    expect(
      media.every((m) => m.mediaAssetId?.startsWith("DEMO-PLACEHOLDER")),
    ).toBe(true);
    expect(media.every((m) => m.transcript || m.transcriptIsSectionText)).toBe(
      true,
    );
    expect(media.find((m) => m.kind === "video")?.captionsLanguage).toBe("en");
    expect(media.every((m) => (m.mediaSizeBytes ?? 0) > 0)).toBe(true);
  });

  it("creates demo users for every role, all obviously fake", async () => {
    const users = await t.db.select().from(s.users);
    expect(users.every((u) => u.email.endsWith(`@${DEMO_EMAIL_DOMAIN}`))).toBe(
      true,
    );
    expect(users.every((u) => /^Demo .*\(fake/.test(u.displayName))).toBe(true);

    const grants = await t.db.select().from(s.roleGrants);
    expect(new Set(grants.map((g) => g.role))).toEqual(
      new Set([
        "sdp_admin",
        "facilitator",
        "assessor",
        "moderator",
        "external_evaluator",
      ]),
    );
    const evaluator = grants.find((g) => g.role === "external_evaluator");
    expect(evaluator?.expiresAt).toBeInstanceOf(Date);
    expect(evaluator?.cohortId).toBeNull();

    const [enrolled] = await t.db.select({ n: count() }).from(s.enrolments);
    expect(enrolled!.n).toBeGreaterThanOrEqual(1);
  });

  it("creates a practical brief with variants and a blueprint covering all 3 banks", async () => {
    const variants = await t.db.select().from(s.briefVariants);
    expect(variants.length).toBeGreaterThanOrEqual(2);
    const rules = await t.db.select().from(s.blueprintRules);
    expect(rules).toHaveLength(3);
  });

  it("writes section text as Markdown and publishes library resources", async () => {
    const texts = await t.db
      .select()
      .from(s.contentItems)
      .where(eq(s.contentItems.kind, "text"));
    expect(
      texts.some((x) => x.body?.includes("## ") && x.body.includes("> [!TIP]")),
    ).toBe(true);
    const lib = await t.db.select().from(s.libraryResources);
    expect(lib.length).toBeGreaterThanOrEqual(2);
    expect(
      lib.every(
        (r) => r.published && r.url?.startsWith("https://example.invalid/"),
      ),
    ).toBe(true);
  });

  it("is idempotent", async () => {
    const before = await t.db.select({ n: count() }).from(s.questions);
    const result = await seedDemo(t.db);
    const after = await t.db.select({ n: count() }).from(s.questions);
    expect(result.created).toBe(false);
    expect(after[0]!.n).toBe(before[0]!.n);
  });
});

describe("seed safety", () => {
  const local = "postgres://user@localhost:5433/lms_dev";
  const remote = "postgres://user@db.example.invalid:5432/lms";

  it("allows local databases", () => {
    expect(() => assertSeedAllowed({}, local)).not.toThrow();
  });

  it("refuses non-local databases unless explicitly allowed", () => {
    expect(() => assertSeedAllowed({}, remote)).toThrow(/non-local/);
    expect(() =>
      assertSeedAllowed({ ALLOW_DEMO_SEED: "true" }, remote),
    ).not.toThrow();
  });

  it("always refuses production", () => {
    expect(() => assertSeedAllowed({ NODE_ENV: "production" }, local)).toThrow(
      /production/,
    );
    expect(() =>
      assertSeedAllowed(
        { VERCEL_ENV: "production", ALLOW_DEMO_SEED: "true" },
        remote,
      ),
    ).toThrow(/production/);
  });
});
