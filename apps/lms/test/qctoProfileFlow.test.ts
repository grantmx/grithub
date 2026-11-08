import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { auditLog, consentRecords, learnerQctoProfiles } from "db";
import { CURRENT_NOTICE, QCTO_SHARING_CONSENT } from "@/lib/popia";
import type { ProfilePart, ProfileValues } from "@/lib/qctoProfile";
import { AccessDeniedError } from "@/lib/server/auth";
import { OnboardingError, acceptNotice } from "@/lib/server/onboarding";
import {
  ProfileError,
  adminSaveProfile,
  confirmOwnProfile,
  profileStatuses,
  qctoSharingConsent,
  readOwnProfile,
  readProfileAsAdmin,
  saveOwnProfilePart,
  searchAreas,
} from "@/lib/server/qctoProfile";
import { getSetupState } from "@/lib/server/setupState";
import {
  actorFor,
  createTestDb,
  makeCohort,
  makeCtx,
  makeUser,
  type TestDb,
} from "./helpers";
import { FAKE_ID_M, completeProfile, uniqueProfile } from "./qctoFixtures";

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
});
afterAll(async () => {
  await t?.teardown();
});

/** The form a learner would submit for one part. */
function formFor(part: ProfilePart, v: ProfileValues): FormData {
  const f = new FormData();
  f.set("part", part);
  const set = (k: string, val: string | boolean) => {
    if (typeof val === "boolean") {
      if (val) f.set(k, "yes");
    } else f.set(k, val);
  };
  if (part === "about") {
    for (const k of [
      "titleCode",
      "firstName",
      "middleName",
      "lastName",
      "idKind",
      "nationalId",
      "alternateId",
      "alternativeIdTypeCode",
      "birthDate",
      "genderCode",
    ] as const)
      set(k, v[k]);
  } else if (part === "contact") {
    for (const [k, val] of Object.entries(v.homeAddress))
      set(`homeAddress.${k}`, val);
    for (const [k, val] of Object.entries(v.postalAddress))
      set(`postalAddress.${k}`, val);
    set("postalSameAsHome", v.postalSameAsHome);
    set("shareEmailWithQcto", v.shareEmailWithQcto);
    for (const k of [
      "cellPhone",
      "phone",
      "provinceCode",
      "statssaAreaCode",
    ] as const)
      set(k, v[k]);
  } else {
    for (const k of [
      "nationalityCode",
      "citizenResidentStatusCode",
      "immigrantStatusCode",
      "homeLanguageCode",
      "equityCode",
      "socioeconomicStatusCode",
      "disabilityStatusCode",
      "disabilityRatingCode",
    ] as const)
      set(k, v[k]);
  }
  return f;
}

/** A learner who has confirmed details and accepted the POPIA notice, nothing else. */
async function newLearner() {
  const cohort = await makeCohort(t.db);
  const user = await makeUser(t.db, {
    cohortId: cohort.id,
    skipQctoProfile: true,
  });
  const ctx = makeCtx(t.db);
  return {
    ctx,
    user,
    cohort,
    actor: async () => (await actorFor(ctx, user.id)).actor,
  };
}

async function fillAll(
  ctx: ReturnType<typeof makeCtx>,
  actor: Awaited<ReturnType<Awaited<ReturnType<typeof newLearner>>["actor"]>>,
  v: ProfileValues,
) {
  for (const part of ["about", "contact", "background"] as const) {
    await saveOwnProfilePart(ctx, actor, part, formFor(part, v));
  }
}

describe("QCTO sharing consent (POPI Act Agree / Date)", () => {
  it("is required from learners, recorded separately, and gives AH/AI", async () => {
    const { ctx, user, actor } = await newLearner();
    const a = await actor();
    await expect(
      acceptNotice(ctx, a, { version: CURRENT_NOTICE.version, accepted: true }),
    ).rejects.toThrow(OnboardingError);
    await expect(
      acceptNotice(ctx, a, {
        version: CURRENT_NOTICE.version,
        accepted: true,
        qctoSharing: true,
        qctoVersion: "old-version",
      }),
    ).rejects.toThrow(/changed/);

    await acceptNotice(ctx, a, {
      version: CURRENT_NOTICE.version,
      accepted: true,
      qctoSharing: true,
      qctoVersion: QCTO_SHARING_CONSENT.version,
    });
    const rows = await t.db
      .select()
      .from(consentRecords)
      .where(eq(consentRecords.userId, user.id));
    expect(rows.map((r) => r.kind).sort()).toEqual([
      "popia_notice",
      "qcto_sharing",
    ]);
    const consent = await qctoSharingConsent(ctx, user.id);
    expect(consent?.agree).toBe("Yes");
    expect(consent?.date).toMatch(/^\d{8}$/);
  });

  it("isn't asked of staff (no enrolment)", async () => {
    const staff = await makeUser(t.db, {
      roles: ["facilitator"],
      setupComplete: false,
    });
    const ctx = makeCtx(t.db);
    const { actor } = await actorFor(ctx, staff.id);
    await acceptNotice(ctx, actor, {
      version: CURRENT_NOTICE.version,
      accepted: true,
    });
    expect((await getSetupState(ctx, staff.id))?.isLearner).toBe(false);
    expect((await actorFor(ctx, staff.id)).actor.setupComplete).toBe(true);
  });
});

describe("profile step in first-time setup", () => {
  it("keeps setup open until the learner confirms a complete profile", async () => {
    const { ctx, user, actor } = await newLearner();
    await acceptNotice(ctx, await actor(), {
      version: CURRENT_NOTICE.version,
      accepted: true,
      qctoSharing: true,
      qctoVersion: QCTO_SHARING_CONSENT.version,
    });
    let a = await actor();
    expect(a.setupComplete).toBe(false);
    const mine = uniqueProfile();

    // Can't confirm before everything is filled in.
    await saveOwnProfilePart(ctx, a, "about", formFor("about", mine));
    await expect(confirmOwnProfile(ctx, a, true)).rejects.toThrow(
      /Contact & address/,
    );

    await fillAll(ctx, a, mine);
    await expect(confirmOwnProfile(ctx, a, false)).rejects.toThrow(
      ProfileError,
    );
    await confirmOwnProfile(ctx, a, true);

    a = await actor();
    expect(a.setupComplete).toBe(true);
    const own = await readOwnProfile(ctx, a);
    expect(own.values.nationalId).toBe(mine.nationalId);
    expect(own.values.equityCode).toBe("U");
    expect(own.confirmedAt).toBeInstanceOf(Date);

    // Learners can't edit after confirming (admin only).
    await expect(
      saveOwnProfilePart(ctx, a, "about", formFor("about", mine)),
    ).rejects.toThrow(/already confirmed/);
    expect((await profileStatuses(ctx, [user.id])).get(user.id)).toBe(
      "confirmed",
    );
  });

  it("stores sensitive values encrypted, never in plain text", async () => {
    const { ctx, user, actor } = await newLearner();
    await fillAll(ctx, await actor(), {
      ...completeProfile(),
      nationalId: FAKE_ID_M,
      birthDate: "2001-01-01",
      genderCode: "M",
      equityCode: "BA",
      disabilityStatusCode: "02",
      disabilityRatingCode: "03",
      cellPhone: "0821234567",
    });
    const [row] = await t.db
      .select()
      .from(learnerQctoProfiles)
      .where(eq(learnerQctoProfiles.userId, user.id));
    const raw = JSON.stringify(row, (_k, v: unknown) =>
      v instanceof Uint8Array ? Buffer.from(v).toString("latin1") : v,
    );
    for (const secret of [
      FAKE_ID_M,
      "20010101",
      "0821234567",
      "1 Fake Street",
    ]) {
      expect(raw).not.toContain(secret);
    }
    expect(row?.nationalIdHash).toMatch(/^[0-9a-f]{64}$/);
    expect(row?.alternativeIdTypeCode).toBe("533");
    // Audit names the fields, never the values.
    const audits = await t.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.actorId, user.id));
    const payloads = JSON.stringify(audits.map((r) => r.after));
    expect(payloads).toContain("nationalId");
    expect(payloads).not.toContain(FAKE_ID_M);
  });

  it("rejects invalid parts with field errors and saves nothing", async () => {
    const { ctx, user, actor } = await newLearner();
    const err = await saveOwnProfilePart(
      ctx,
      await actor(),
      "about",
      formFor("about", { ...completeProfile(), birthDate: "1998-03-15" }),
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProfileError);
    expect((err as ProfileError).fieldErrors.birthDate).toBeDefined();
    expect((await profileStatuses(ctx, [user.id])).get(user.id)).toBe(
      "not_started",
    );
  });

  it("checks the Stats SA area against the province", async () => {
    const { ctx, actor } = await newLearner();
    const err = await saveOwnProfilePart(
      ctx,
      await actor(),
      "contact",
      formFor("contact", { ...completeProfile(), provinceCode: "7" }),
    ).catch((e: unknown) => e);
    expect((err as ProfileError).fieldErrors.statssaAreaCode).toMatch(
      /province/,
    );
  });

  it("won't register the same ID number to two learners", async () => {
    const one = await newLearner();
    const two = await newLearner();
    const v = uniqueProfile();
    await saveOwnProfilePart(
      one.ctx,
      await one.actor(),
      "about",
      formFor("about", v),
    );
    const err = await saveOwnProfilePart(
      two.ctx,
      await two.actor(),
      "about",
      formFor("about", v),
    ).catch((e: unknown) => e);
    expect((err as ProfileError).fieldErrors.nationalId).toMatch(
      /already registered/,
    );
  });

  it("isn't available to staff without an enrolment", async () => {
    const staff = await makeUser(t.db, { roles: ["facilitator"] });
    const ctx = makeCtx(t.db);
    const { actor } = await actorFor(ctx, staff.id);
    await expect(
      saveOwnProfilePart(
        ctx,
        actor,
        "about",
        formFor("about", completeProfile()),
      ),
    ).rejects.toThrow(/Only learners/);
  });
});

describe("SDP admin corrections", () => {
  it("lets an admin fill gaps and correct values, audited by field name", async () => {
    const { ctx, user, actor } = await newLearner();
    const mine = uniqueProfile();
    await saveOwnProfilePart(
      ctx,
      await actor(),
      "about",
      formFor("about", mine),
    );
    const admin = await makeUser(t.db, { roles: ["sdp_admin"], passkeys: 1 });
    const adminCtx = makeCtx(t.db);
    const adminActor = (await actorFor(adminCtx, admin.id)).actor;

    const form = new FormData();
    for (const part of ["about", "contact", "background"] as const) {
      for (const [k, v] of formFor(part, mine)) form.set(k, v);
    }
    form.set("lastName", "Corrected-Fake");
    await adminSaveProfile(adminCtx, adminActor, user.id, form);

    const read = await readProfileAsAdmin(adminCtx, adminActor, user.id);
    expect(read.values.lastName).toBe("Corrected-Fake");
    expect(read.confirmedAt).toBeNull(); // admin edits don't confirm for the learner
    const [audit] = await t.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, "admin.qcto_profile.updated"));
    expect(audit?.entityId).toBe(user.id);
    expect(JSON.stringify(audit?.after)).toContain("lastName");
    expect(JSON.stringify(audit?.after)).not.toContain("Corrected-Fake");
  });

  it("needs an SDP admin with a passkey", async () => {
    const { ctx, user, actor } = await newLearner();
    await expect(
      readProfileAsAdmin(ctx, await actor(), user.id),
    ).rejects.toThrow(AccessDeniedError);
    const noPasskey = await makeUser(t.db, {
      roles: ["sdp_admin"],
      passkeys: 0,
    });
    const a = (await actorFor(ctx, noPasskey.id)).actor;
    await expect(
      adminSaveProfile(ctx, a, user.id, new FormData()),
    ).rejects.toThrow(AccessDeniedError);
  });
});

describe("Stats SA area search", () => {
  it("finds areas within one province, names starting with the query first", async () => {
    const ctx = makeCtx(t.db);
    const wc = await searchAreas(ctx, "1", "kliprand");
    expect(wc[0]?.code).toBe("2011-160001001");
    expect(wc[0]?.label).toMatch(/Kliprand/);
    expect(await searchAreas(ctx, "7", "kliprand")).toEqual([]);
    expect(await searchAreas(ctx, "1", "k")).toEqual([]); // 2 letters minimum
    expect(await searchAreas(ctx, "X", "cape")).toEqual([]);
    expect((await searchAreas(ctx, "1", "a")).length).toBe(0);
    expect((await searchAreas(ctx, "2", "an")).length).toBeLessThanOrEqual(20);
    // LIKE wildcards in the query are literal.
    expect(await searchAreas(ctx, "1", "%%")).toEqual([]);
  });
});
