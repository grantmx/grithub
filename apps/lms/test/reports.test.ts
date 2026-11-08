import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cohorts, enrolments, users } from "db";
import { seedDemo } from "db/seed";
import { CURRENT_NOTICE } from "@/lib/popia";
import { AccessDeniedError } from "@/lib/server/auth";
import { getSectionPage } from "@/lib/server/learning";
import {
  csvCell,
  learnerReport,
  listCohortLearners,
  listReportCohorts,
  reportToCsv,
} from "@/lib/server/reports";
import {
  actorFor,
  auditActions,
  createTestDb,
  makeCohort,
  makeCtx,
  makeUser,
  type TestDb,
} from "./helpers";

let t: TestDb;
let cohortId: string;
let enrolmentId: string;

beforeAll(async () => {
  t = await createTestDb();
  const { qualificationId } = await seedDemo(t.db);
  const [c] = await t.db
    .select()
    .from(cohorts)
    .where(eq(cohorts.qualificationId, qualificationId));
  cohortId = c!.id;
  const [learner] = await t.db
    .select()
    .from(users)
    .where(eq(users.email, "demo.learner1@example.invalid"));
  const [e] = await t.db
    .select()
    .from(enrolments)
    .where(eq(enrolments.userId, learner!.id));
  enrolmentId = e!.id;
  // Demo users haven't been through first-time setup; do it for them here.
  await t.db.update(users).set({
    status: "active",
    popiaNoticeAcceptedAt: new Date(),
    popiaNoticeVersion: CURRENT_NOTICE.version,
  });
  // Give the learner some progress.
  const ctx = makeCtx(t.db);
  const { actor } = await actorFor(ctx, learner!.id);
  const rows = await t.db.execute<{ id: string }>(
    `select s.id from sections s join modules m on m.id = s.module_id where m.qualification_id = '${qualificationId}' order by m.sort_order, s.sort_order limit 1`,
  );
  await getSectionPage(ctx, actor, rows[0]!.id);
});
afterAll(async () => {
  await t?.teardown();
});

async function demoActor(email: string) {
  const [u] = await t.db.select().from(users).where(eq(users.email, email));
  const ctx = makeCtx(t.db);
  return { ctx, actor: (await actorFor(ctx, u!.id)).actor, userId: u!.id };
}

describe("progress reports", () => {
  it("lets the cohort's facilitator view a learner report and audits it", async () => {
    const { ctx, actor, userId } = await demoActor(
      "demo.facilitator@example.invalid",
    );
    expect((await listReportCohorts(ctx, actor)).map((c) => c.id)).toEqual([
      cohortId,
    ]);
    expect((await listCohortLearners(ctx, actor, cohortId)).length).toBe(3);
    const report = await learnerReport(ctx, actor, enrolmentId);
    expect(report.learnerName).toMatch(/^Demo Learner One/);
    expect(report.totals.sections).toBe(4);
    expect(report.rows[0]).toMatchObject({
      moduleCode: "DEMO-KM-01",
      sectionNo: 1,
      status: "In progress",
    });
    expect(await auditActions(t.db, userId)).toContain(
      "report.progress.viewed",
    );
  });

  it("blocks facilitators from cohorts they aren't assigned to (and audits it)", async () => {
    const other = await makeCohort(t.db);
    const facilitator = await makeUser(t.db, {
      roles: ["facilitator"],
      cohortId: other.id,
    });
    const ctx = makeCtx(t.db);
    const { actor } = await actorFor(ctx, facilitator.id);
    await expect(learnerReport(ctx, actor, enrolmentId)).rejects.toBeInstanceOf(
      AccessDeniedError,
    );
    await expect(
      listCohortLearners(ctx, actor, cohortId),
    ).rejects.toBeInstanceOf(AccessDeniedError);
    expect(await auditActions(t.db, facilitator.id)).toContain(
      "auth.permission_denied",
    );
  });

  it("blocks learners and assessors", async () => {
    const learner = await demoActor("demo.learner2@example.invalid");
    await expect(
      learnerReport(learner.ctx, learner.actor, enrolmentId),
    ).rejects.toBeInstanceOf(AccessDeniedError);
    const assessor = await demoActor("demo.assessor@example.invalid");
    await expect(
      learnerReport(assessor.ctx, assessor.actor, enrolmentId),
    ).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it("lets SDP admins report on any cohort", async () => {
    const { ctx, actor } = await demoActor("demo.admin@example.invalid");
    expect((await learnerReport(ctx, actor, enrolmentId)).rows.length).toBe(4);
  });

  it("exports CSV with a header, one row per section, and audits the export", async () => {
    const { ctx, actor, userId } = await demoActor(
      "demo.facilitator@example.invalid",
    );
    const csv = reportToCsv(
      await learnerReport(ctx, actor, enrolmentId, "exported"),
    );
    const lines = csv.trim().split("\r\n");
    expect(lines[0]).toContain('"module_code"');
    expect(lines).toHaveLength(5);
    expect(await auditActions(t.db, userId)).toContain(
      "report.progress.exported",
    );
  });

  it("neutralises spreadsheet formulas in CSV cells", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`);
    expect(csvCell("+1")).toBe(`"'+1"`);
    expect(csvCell('Say "hi"')).toBe('"Say ""hi"""');
    expect(csvCell(null)).toBe('""');
  });
});
