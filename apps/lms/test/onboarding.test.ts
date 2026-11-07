import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  authTokens,
  consentRecords,
  enrolments,
  passkeyCredentials,
  sessions,
  users,
} from "db";
import { CURRENT_NOTICE, noticeSha256 } from "@/lib/popia";
import { AccessDeniedError, signInWithLink } from "@/lib/server/auth";
import { memoryOutbox } from "@/lib/server/email";
import {
  OnboardingError,
  acceptNotice,
  confirmLearnerImport,
  createCohort,
  deactivateUser,
  inviteLearner,
  listCohorts,
  listPeople,
  previewLearnerImport,
  startRecovery,
} from "@/lib/server/onboarding";
import { loadAccessContext } from "@/lib/server/session";
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
beforeAll(async () => {
  t = await createTestDb();
});
afterAll(async () => {
  await t?.teardown();
});
beforeEach(() => {
  memoryOutbox.length = 0;
});

async function adminActor(passkeys = 1) {
  const admin = await makeUser(t.db, { roles: ["sdp_admin"], passkeys });
  const ctx = makeCtx(t.db);
  return { ctx, admin, actor: (await actorFor(ctx, admin.id)).actor };
}

describe("step-up enforcement in server actions", () => {
  it("rejects an SDP admin WITHOUT a passkey, and audits the denial", async () => {
    const { ctx, actor, admin } = await adminActor(0);
    const cohort = await makeCohort(t.db);
    await expect(
      inviteLearner(ctx, actor, {
        cohortId: cohort.id,
        name: "Fake Learner",
        email: "fake.learner@example.invalid",
      }),
    ).rejects.toMatchObject({ decision: { result: "stepup" } });
    expect(memoryOutbox).toHaveLength(0);
    expect(await auditActions(t.db, admin.id)).toContain(
      "auth.permission_denied",
    );
  });

  it("rejects non-admins even with a passkey", async () => {
    const facilitator = await makeUser(t.db, {
      roles: ["facilitator"],
      passkeys: 1,
    });
    const ctx = makeCtx(t.db);
    const { actor } = await actorFor(ctx, facilitator.id);
    const cohort = await makeCohort(t.db);
    await expect(
      deactivateUser(ctx, actor, facilitator.id),
    ).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(
      createCohort(ctx, actor, {
        qualificationId: cohort.qualificationId,
        name: "X",
        startsOn: "2030-01-01",
        endsOn: "2030-02-01",
      }),
    ).rejects.toMatchObject({ decision: { result: "forbidden" } });
  });

  it("rejects a signed-out caller", async () => {
    const cohort = await makeCohort(t.db);
    await expect(
      listPeople(makeCtx(t.db), null, cohort.id),
    ).rejects.toMatchObject({ decision: { result: "signin" } });
  });

  it("treats a revoked passkey as no passkey", async () => {
    const { ctx, admin } = await adminActor(1);
    await t.db
      .update(passkeyCredentials)
      .set({ revokedAt: new Date() })
      .where(eq(passkeyCredentials.userId, admin.id));
    const { actor } = await actorFor(ctx, admin.id);
    expect(actor.activePasskeys).toBe(0);
    const cohort = await makeCohort(t.db);
    await expect(listPeople(ctx, actor, cohort.id)).rejects.toMatchObject({
      decision: { result: "stepup" },
    });
  });

  it("allows an SDP admin with a passkey", async () => {
    const { ctx, actor } = await adminActor(1);
    const cohort = await makeCohort(t.db);
    const id = await createCohort(ctx, actor, {
      qualificationId: cohort.qualificationId,
      name: "Fake cohort B",
      startsOn: "2030-01-01",
      endsOn: "2030-03-01",
    });
    expect(id).toMatch(/[0-9a-f-]{36}/);
  });
});

describe("inviting learners", () => {
  it("creates an invited user, enrols them and emails a 72-hour setup link", async () => {
    const { ctx, actor, admin } = await adminActor();
    const cohort = await makeCohort(t.db);
    const res = await inviteLearner(ctx, actor, {
      cohortId: cohort.id,
      name: "Demo Invitee (fake)",
      email: "demo.invitee@example.invalid",
    });
    expect(res.invited).toBe(true);
    const [user] = await t.db
      .select()
      .from(users)
      .where(eq(users.id, res.userId));
    expect(user?.status).toBe("invited");
    const enrolled = await t.db
      .select()
      .from(enrolments)
      .where(eq(enrolments.userId, res.userId));
    expect(enrolled.map((e) => e.cohortId)).toEqual([cohort.id]);
    expect(memoryOutbox).toHaveLength(1);
    expect(memoryOutbox[0]!.link).toMatch(/\/setup\/[A-Za-z0-9_-]{43}$/);

    const people = await listPeople(ctx, actor, cohort.id, "invited");
    expect(people.map((p) => p.userId)).toEqual([res.userId]);
    expect(await auditActions(t.db, admin.id)).toContain("admin.invite.sent");
  });

  it("lists people with correct passkey counts and cohort learner counts", async () => {
    const { ctx, actor } = await adminActor();
    const cohort = await makeCohort(t.db);
    const two = await makeUser(t.db, { cohortId: cohort.id, passkeys: 2 });
    const none = await makeUser(t.db, { cohortId: cohort.id, passkeys: 0 });
    await makeUser(t.db, { passkeys: 3 }); // not in this cohort
    const people = await listPeople(ctx, actor, cohort.id);
    const byId = new Map(people.map((p) => [p.userId, p]));
    expect(byId.get(two.id)?.passkeys).toBe(2);
    expect(byId.get(none.id)?.passkeys).toBe(0);
    expect(people).toHaveLength(2);
    const cohorts = await listCohorts(ctx);
    expect(cohorts.find((c) => c.id === cohort.id)?.learners).toBe(2);
  });

  it("rejects invalid emails", async () => {
    const { ctx, actor } = await adminActor();
    const cohort = await makeCohort(t.db);
    await expect(
      inviteLearner(ctx, actor, {
        cohortId: cohort.id,
        name: "Fake",
        email: "not-an-email",
      }),
    ).rejects.toBeInstanceOf(OnboardingError);
  });
});

describe("CSV import", () => {
  const csv = [
    "name,email",
    "Demo One (fake),demo.one@example.invalid",
    ",missing.name@example.invalid",
    "Demo Two (fake),not-an-email",
    "Demo One Again (fake),DEMO.ONE@example.invalid",
    "Demo Three (fake),demo.three@example.invalid",
  ].join("\n");

  it("previews row-level errors without saving anything", async () => {
    const { ctx, actor } = await adminActor();
    const cohort = await makeCohort(t.db);
    const preview = await previewLearnerImport(ctx, actor, cohort.id, csv);
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(
      preview.rows.map((r) => (r.status.ok ? "ok" : r.status.error)),
    ).toEqual([
      "ok",
      "Name missing",
      "Email not valid",
      "Duplicate of row 2",
      "ok",
    ]);
    expect(
      await t.db
        .select()
        .from(enrolments)
        .where(eq(enrolments.cohortId, cohort.id)),
    ).toHaveLength(0);
    expect(memoryOutbox).toHaveLength(0);
  });

  it("imports and invites only valid rows on confirm, and audits counts only", async () => {
    const { ctx, actor, admin } = await adminActor();
    const cohort = await makeCohort(t.db);
    const summary = await confirmLearnerImport(ctx, actor, cohort.id, csv);
    expect(summary).toEqual({ imported: 2, invited: 2, skipped: 3 });
    expect(memoryOutbox).toHaveLength(2);

    const audits = await t.db.query.auditLog.findMany({
      where: (a, { eq: e }) => e(a.actorId, admin.id),
    });
    const importAudit = audits.find(
      (a) => a.action === "admin.import.completed",
    );
    expect(importAudit?.after).toEqual({ imported: 2, invited: 2, skipped: 3 });
    // No personal data in any audit payload written by the import.
    expect(JSON.stringify(audits)).not.toMatch(
      /example\.invalid|Demo One|Demo Three/,
    );
  });

  it("flags learners already enrolled and deactivated accounts", async () => {
    const { ctx, actor } = await adminActor();
    const cohort = await makeCohort(t.db);
    const enrolled = await makeUser(t.db, { cohortId: cohort.id });
    const suspended = await makeUser(t.db, { status: "suspended" });
    const preview = await previewLearnerImport(
      ctx,
      actor,
      cohort.id,
      `name,email\nA (fake),${enrolled.email}\nB (fake),${suspended.email}`,
    );
    expect(
      preview.ok &&
        preview.rows.map((r) => (r.status.ok ? "ok" : r.status.error)),
    ).toEqual(["Already enrolled in this cohort", "Account deactivated"]);
  });
});

describe("first-time setup consent", () => {
  it("stores version, text hash and timestamp, and activates the user", async () => {
    const invited = await makeUser(t.db, { setupComplete: false });
    const ctx = makeCtx(t.db);
    const { actor, token } = await actorFor(ctx, invited.id);
    expect(actor.setupComplete).toBe(false);
    await acceptNotice(ctx, actor, {
      version: CURRENT_NOTICE.version,
      accepted: true,
    });

    const [record] = await t.db
      .select()
      .from(consentRecords)
      .where(eq(consentRecords.userId, invited.id));
    expect(record).toMatchObject({
      noticeVersion: CURRENT_NOTICE.version,
      noticeSha256: noticeSha256(),
    });
    expect(record?.acceptedAt).toBeInstanceOf(Date);
    expect((await loadAccessContext(ctx, token))?.setupComplete).toBe(true);
  });

  it("refuses an outdated notice version or an unticked box", async () => {
    const invited = await makeUser(t.db, { setupComplete: false });
    const ctx = makeCtx(t.db);
    const { actor } = await actorFor(ctx, invited.id);
    await expect(
      acceptNotice(ctx, actor, { version: "old", accepted: true }),
    ).rejects.toBeInstanceOf(OnboardingError);
    await expect(
      acceptNotice(ctx, actor, {
        version: CURRENT_NOTICE.version,
        accepted: false,
      }),
    ).rejects.toBeInstanceOf(OnboardingError);
  });

  it("names Airtable as an operator outside South Africa", () => {
    const text = JSON.stringify(CURRENT_NOTICE);
    expect(text).toMatch(
      /Airtable[^"]*management reporting[^"]*outside South Africa/,
    );
    expect(text).toMatch(
      /never receive or store your fingerprint, face or any other biometric data/,
    );
  });
});

describe("deactivation", () => {
  it("blocks the learner, signs them out everywhere and revokes pending links", async () => {
    const { ctx, actor, admin } = await adminActor();
    const learner = await makeUser(t.db);
    const { token } = await actorFor(ctx, learner.id);
    const pending = await import("@/lib/server/tokens").then((m) =>
      m.issueToken(ctx, { userId: learner.id, purpose: "magic_link" }),
    );
    await deactivateUser(ctx, actor, learner.id);

    expect(await loadAccessContext(ctx, token)).toBeNull();
    expect(await signInWithLink(makeCtx(t.db), pending, "link")).toEqual({
      ok: false,
      reason: "revoked",
    });
    expect(await auditActions(t.db, admin.id)).toContain(
      "admin.user.deactivated",
    );
  });

  it("does not let admins deactivate themselves", async () => {
    const { ctx, actor, admin } = await adminActor();
    await expect(deactivateUser(ctx, actor, admin.id)).rejects.toBeInstanceOf(
      OnboardingError,
    );
  });
});

describe("admin-verified recovery", () => {
  it("revokes all passkeys and sessions, emails a single-use recovery link, and audits who verified how", async () => {
    const { ctx, actor, admin } = await adminActor();
    const learner = await makeUser(t.db, { passkeys: 2 });
    const { token: oldSession } = await actorFor(ctx, learner.id);

    await startRecovery(ctx, actor, {
      userId: learner.id,
      verificationMethod: "in_person",
      reason: "Phone lost; verified with ID at the hub (fake test)",
    });

    const active = await t.db
      .select()
      .from(passkeyCredentials)
      .where(
        and(
          eq(passkeyCredentials.userId, learner.id),
          isNull(passkeyCredentials.revokedAt),
        ),
      );
    expect(active).toHaveLength(0);
    expect(await loadAccessContext(ctx, oldSession)).toBeNull();
    const liveSessions = await t.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, learner.id), isNull(sessions.revokedAt)));
    expect(liveSessions).toHaveLength(0);

    expect(memoryOutbox).toHaveLength(1);
    const link = memoryOutbox[0]!.link.split("/").pop()!;
    const first = await signInWithLink(makeCtx(t.db), link, "link");
    expect(first.ok && first.method).toBe("recovery");
    expect(await signInWithLink(makeCtx(t.db), link, "link")).toEqual({
      ok: false,
      reason: "used",
    });

    const audits = await t.db.query.auditLog.findMany({
      where: (a, { eq: e }) => e(a.action, "auth.recovery.started"),
    });
    expect(
      audits.find((a) => a.actorId === admin.id && a.entityId === learner.id)
        ?.after,
    ).toMatchObject({
      verificationMethod: "in_person",
    });
    expect(await auditActions(t.db, learner.id)).toContain(
      "auth.signin.recovery",
    );
    const tokens = await t.db
      .select()
      .from(authTokens)
      .where(eq(authTokens.userId, learner.id));
    expect(tokens.find((tk) => tk.purpose === "recovery")?.createdBy).toBe(
      admin.id,
    );
  });

  it("requires a verification method and a reason", async () => {
    const { ctx, actor } = await adminActor();
    const learner = await makeUser(t.db);
    await expect(
      startRecovery(ctx, actor, {
        userId: learner.id,
        verificationMethod: "sms",
        reason: "Lost phone",
      }),
    ).rejects.toBeInstanceOf(OnboardingError);
    await expect(
      startRecovery(ctx, actor, {
        userId: learner.id,
        verificationMethod: "in_person",
        reason: "",
      }),
    ).rejects.toBeInstanceOf(OnboardingError);
  });
});
