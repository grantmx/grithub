import { eq, sql } from "drizzle-orm";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  encryptPii,
  generatePiiKey,
  piiBlindIndex,
  readPiiKeyring,
} from "../src/pii";
import * as s from "../src/schema";
import * as qcto from "../src/schema/qcto";
import { DEFAULT_TENANT_ID, GLOBAL_TABLES } from "../src/tenancy";
import {
  createTestDb,
  expectPgError,
  makeFixture,
  PG,
  type TestDb,
} from "./helpers";

// Synthetic data only: no real ID numbers, names, addresses or QCTO codes.

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
});
afterAll(async () => {
  await t?.teardown();
});

const one = <T>(rows: T[]): T => {
  const r = rows[0];
  if (!r) throw new Error("no row");
  return r;
};

const keyring = readPiiKeyring({
  PII_ENCRYPTION_KEYS: `1:${generatePiiKey()}`,
  PII_BLIND_INDEX_KEY: generatePiiKey(),
});
let fakeIdCounter = 0;
/** A fake national ID, encrypted for a given profile row, plus its blind index. */
const nationalId = (rowId: string) => {
  const value = `99${String(++fakeIdCounter).padStart(11, "0")}`;
  return {
    nationalIdEnc: encryptPii(keyring, value, {
      table: "learner_qcto_profiles",
      column: "national_id_enc",
      rowId,
    }),
    nationalIdHash: piiBlindIndex(keyring, "national_id", value),
  };
};
const alternateId = (rowId: string, value = `FAKE${++fakeIdCounter}`) => ({
  alternateIdEnc: encryptPii(keyring, value, {
    table: "learner_qcto_profiles",
    column: "alternate_id_enc",
    rowId,
  }),
  alternateIdHash: piiBlindIndex(keyring, "alternate_id", value, "Testperson"),
});

const sha = (c: string) => c.repeat(64);

describe("reference data", () => {
  it("loads every QCTO code list from the spec", async () => {
    const counts: [PgTable, number][] = [
      [s.qctoAlternativeIdTypes, 6],
      [s.qctoEquityCodes, 6],
      [s.qctoNationalityCodes, 24],
      [s.qctoHomeLanguageCodes, 13],
      [s.qctoGenderCodes, 2],
      [s.qctoCitizenResidentStatusCodes, 5],
      [s.qctoSocioeconomicStatusCodes, 12],
      [s.qctoDisabilityStatusCodes, 9],
      [s.qctoDisabilityRatingCodes, 8],
      [s.qctoImmigrantStatusCodes, 3],
      [s.qctoLearnerTitles, 6],
      [s.qctoProvinceCodes, 11],
      [s.qctoSorStatusCodes, 2],
      [s.qctoReadinessTypes, 6],
      [s.qctoFlcCodes, 8],
      [s.statssaAreaCodes, 22107], // official Stats SA list (data/README.md)
    ];
    for (const [table, n] of counts) {
      const [row] = await t.db
        .select({ n: sql<number>`count(*)::int` })
        .from(table);
      expect(row?.n, getTableConfig(table).name).toBe(n);
    }
  });

  it("keeps codes exactly as QCTO writes them (case and leading zeros)", async () => {
    const eq1 = await t.db.select().from(s.qctoEquityCodes);
    expect(eq1.map((r) => r.code).sort()).toEqual([
      "BA",
      "BC",
      "BI",
      "Oth",
      "U",
      "Wh",
    ]);
    const readiness = await t.db.select().from(s.qctoReadinessTypes);
    expect(readiness.map((r) => r.code).sort()).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
    ]);
    const sor = await t.db.select().from(s.qctoSorStatusCodes);
    expect(sor.map((r) => r.code).sort()).toEqual(["01", "02"]);
  });
});

describe("Stats SA area codes", () => {
  it("puts every area in the province its code names (digit after '2011-')", async () => {
    const [row] = await t.db
      .select({ n: sql<number>`count(*)::int` })
      .from(s.statssaAreaCodes)
      .where(
        sql`substr(${s.statssaAreaCodes.code}, 6, 1) <> ${s.statssaAreaCodes.provinceCode}`,
      );
    expect(row?.n).toBe(0);
  });

  it("applies the documented corrections to the source file", async () => {
    const [dup] = await t.db
      .select()
      .from(s.statssaAreaCodes)
      .where(sql`${s.statssaAreaCodes.code} = '2011-199041015'`);
    expect(dup).toMatchObject({ label: "Kensington", provinceCode: "1" });
    const [steenberg] = await t.db
      .select({ label: s.statssaAreaCodes.label })
      .from(s.statssaAreaCodes)
      .where(sql`${s.statssaAreaCodes.code} = '2011-163001011'`);
    expect(steenberg?.label).toBe("Steenberg's Cove");
  });
});

// Column names are camelCase in the config; snake_case is applied at query time.
const isTenantCol = (name: string) =>
  name === "tenantId" || name === "tenant_id";

describe("tenancy readiness", () => {
  const tables = Object.values(qcto)
    .filter(
      (v) =>
        typeof v === "object" &&
        v !== null &&
        Symbol.for("drizzle:IsDrizzleTable") in v,
    )
    .map((v) => getTableConfig(v as PgTable));

  it("marks exactly the QCTO tables without tenant_id as GLOBAL", () => {
    const withoutTenant = tables
      .filter((c) => !c.columns.some((col) => isTenantCol(col.name)))
      .map((c) => c.name)
      .sort();
    expect(withoutTenant).toEqual([...GLOBAL_TABLES].sort());
  });

  it("gives tenant tables a nullable tenant_id defaulting to the first tenant", async () => {
    const f = await makeFixture(t.db);
    const centre = one(
      await t.db
        .insert(s.assessmentCentres)
        .values({ code: `AC-${f.cohort.id}`, name: "Test centre (fake)" })
        .returning(),
    );
    expect(centre.tenantId).toBe(DEFAULT_TENANT_ID);
    for (const c of tables.filter(
      (c) => !GLOBAL_TABLES.includes(c.name as never),
    )) {
      const col = c.columns.find((x) => isTenantCol(x.name));
      expect(col?.notNull, c.name).toBe(false);
    }
  });

  it("scopes uniqueness per tenant (null tenant = default tenant)", async () => {
    await t.db
      .insert(s.assessmentCentres)
      .values({ code: "AC-DUP", name: "A" });
    await expectPgError(
      t.db
        .insert(s.assessmentCentres)
        .values({ code: "AC-DUP", name: "B", tenantId: null }),
      PG.uniqueViolation,
    );
    await t.db.insert(s.assessmentCentres).values({
      code: "AC-DUP",
      name: "Other tenant",
      tenantId: "00000000-0000-4000-8000-000000000002",
    });
  });
});

describe("accreditation", () => {
  const provider = async (startsOn = "2026-01-01", endsOn = "2030-12-31") =>
    one(
      await t.db
        .insert(s.providerAccreditations)
        .values({
          legalName: "Test Provider (fake)",
          accreditationNumber: `ACC-${++fakeIdCounter}`,
          startsOn,
          endsOn,
        })
        .returning(),
    );

  it("keeps qualification accreditation inside the provider period", async () => {
    const f = await makeFixture(t.db);
    const p = await provider();
    await t.db.insert(s.qualificationAccreditations).values({
      providerAccreditationId: p.id,
      qualificationId: f.qualification.id,
      startsOn: "2026-02-01",
      endsOn: "2030-12-31",
    });
    await expectPgError(
      t.db.insert(s.qualificationAccreditations).values({
        providerAccreditationId: p.id,
        qualificationId: f.qualification.id,
        startsOn: "2025-12-31",
        endsOn: "2027-01-01",
      }),
      PG.checkViolation,
      /inside the provider accreditation period/,
    );
    await expectPgError(
      t.db
        .update(s.providerAccreditations)
        .set({ endsOn: "2029-12-31" })
        .where(eq(s.providerAccreditations.id, p.id)),
      PG.checkViolation,
      /no longer cover/,
    );
  });

  it("rejects reversed dates and blank leading characters", async () => {
    await expectPgError(
      provider("2030-01-01", "2029-01-01"),
      PG.checkViolation,
    );
    await expectPgError(
      t.db.insert(s.providerAccreditations).values({
        legalName: " Leading space",
        accreditationNumber: "X",
        startsOn: "2026-01-01",
        endsOn: "2027-01-01",
      }),
      PG.checkViolation,
      /legal_name_format/,
    );
  });
});

describe("learner QCTO profile", () => {
  const profile = async (
    values: Partial<typeof s.learnerQctoProfiles.$inferInsert> = {},
  ) => {
    const f = await makeFixture(t.db);
    const id = crypto.randomUUID();
    return {
      f,
      id,
      insert: t.db
        .insert(s.learnerQctoProfiles)
        .values({ id, userId: f.learner.id, ...values }),
    };
  };

  it("stores sensitive values only as ciphertext", async () => {
    const { id, insert } = await profile();
    await insert;
    const ids = nationalId(id);
    await t.db
      .update(s.learnerQctoProfiles)
      .set({
        ...ids,
        alternativeIdTypeCode: "533",
        genderCode: "F",
        provinceCode: "1",
      })
      .where(eq(s.learnerQctoProfiles.id, id));
    const [row] =
      await t.sql`SELECT national_id_enc FROM learner_qcto_profiles WHERE id = ${id}`;
    expect(Buffer.isBuffer(row?.national_id_enc)).toBe(true);
    expect((row?.national_id_enc as Buffer).toString("latin1")).not.toMatch(
      /99\d{11}/,
    );
  });

  it("allows one profile per learner and one per ID number", async () => {
    const { f, id, insert } = await profile();
    const ids = nationalId(id);
    await t.db
      .insert(s.learnerQctoProfiles)
      .values({ id, userId: f.learner.id, ...ids });
    void insert; // unused builder
    await expectPgError(
      t.db.insert(s.learnerQctoProfiles).values({ userId: f.learner.id }),
      PG.uniqueViolation,
    );
    const other = await f.user("other");
    await expectPgError(
      t.db.insert(s.learnerQctoProfiles).values({
        userId: other.id,
        nationalIdEnc: ids.nationalIdEnc,
        nationalIdHash: ids.nationalIdHash,
      }),
      PG.uniqueViolation,
      /national_id_uq/,
    );
    // Many profiles may have no ID yet.
    const third = await f.user("third");
    await t.db.insert(s.learnerQctoProfiles).values({ userId: other.id });
    await t.db.insert(s.learnerQctoProfiles).values({ userId: third.id });
  });

  it("needs a blind index with every encrypted ID", async () => {
    const { id } = await profile();
    const { f } = await profile();
    await expectPgError(
      t.db.insert(s.learnerQctoProfiles).values({
        userId: f.learner.id,
        nationalIdEnc: nationalId(id).nationalIdEnc,
      }),
      PG.checkViolation,
      /national_id_hash_pair/,
    );
  });

  it("applies the alternative ID type rules (column E)", async () => {
    // National only → 533.
    let p = await profile();
    await expectPgError(
      t.db.insert(s.learnerQctoProfiles).values({
        id: p.id,
        userId: p.f.learner.id,
        ...nationalId(p.id),
        alternativeIdTypeCode: "527",
      }),
      PG.checkViolation,
      /alternative_id_type/,
    );
    await t.db.insert(s.learnerQctoProfiles).values({
      id: p.id,
      userId: p.f.learner.id,
      ...nationalId(p.id),
      alternativeIdTypeCode: "533",
    });

    // Alternate only → a real type, not 533 or 570.
    for (const bad of ["533", "570"]) {
      p = await profile();
      await expectPgError(
        t.db.insert(s.learnerQctoProfiles).values({
          id: p.id,
          userId: p.f.learner.id,
          ...alternateId(p.id),
          alternativeIdTypeCode: bad,
        }),
        PG.checkViolation,
        /alternative_id_type/,
      );
    }
    p = await profile();
    await t.db.insert(s.learnerQctoProfiles).values({
      id: p.id,
      userId: p.f.learner.id,
      ...alternateId(p.id),
      alternativeIdTypeCode: "527",
    });

    // Both → 570.
    p = await profile();
    await expectPgError(
      t.db.insert(s.learnerQctoProfiles).values({
        id: p.id,
        userId: p.f.learner.id,
        ...nationalId(p.id),
        ...alternateId(p.id),
        alternativeIdTypeCode: "527",
      }),
      PG.checkViolation,
      /alternative_id_type/,
    );
    await t.db.insert(s.learnerQctoProfiles).values({
      id: p.id,
      userId: p.f.learner.id,
      ...nationalId(p.id),
      ...alternateId(p.id),
      alternativeIdTypeCode: "570",
    });
  });

  it("only accepts codes from the reference lists", async () => {
    for (const values of [
      { genderCode: "X" },
      { titleCode: "Sir" },
      { homeLanguageCode: "eng" },
      { provinceCode: "10" },
      { nationalityCode: "XX" },
    ]) {
      const { insert } = await profile(values);
      await expectPgError(insert, PG.foreignKeyViolation);
    }
  });

  it("keeps the Stats SA area inside the learner's province", async () => {
    await t.db.insert(s.statssaAreaCodes).values({
      code: "TEST-AREA",
      label: "Fake area",
      town: "Fake town",
      localMunicipality: "Fake municipality",
      provinceCode: "1",
    });
    await (
      await profile({ provinceCode: "1", statssaAreaCode: "TEST-AREA" })
    ).insert;
    await expectPgError(
      (await profile({ provinceCode: "2", statssaAreaCode: "TEST-AREA" }))
        .insert,
      PG.foreignKeyViolation,
    );
    await expectPgError(
      (await profile({ statssaAreaCode: "TEST-AREA" })).insert,
      PG.checkViolation,
      /area_needs_province/,
    );
  });

  it("rejects names that start with a space", async () => {
    await expectPgError(
      (await profile({ lastName: " Testperson" })).insert,
      PG.checkViolation,
      /name_format/,
    );
  });

  it("shares the email by default (column AE)", async () => {
    const { id, insert } = await profile();
    await insert;
    const row = one(
      await t.db
        .select()
        .from(s.learnerQctoProfiles)
        .where(eq(s.learnerQctoProfiles.id, id)),
    );
    expect(row.shareEmailWithQcto).toBe(true);
  });
});

describe("enrolment QCTO record", () => {
  const record = (
    enrolmentId: string,
    values: Partial<typeof s.enrolmentQctoRecords.$inferInsert> = {},
  ) =>
    t.db
      .insert(s.enrolmentQctoRecords)
      .values({ enrolmentId, ...values })
      .returning();

  it("defaults to Enrolled with no SOR", async () => {
    const f = await makeFixture(t.db);
    const r = one(await record(f.enrolment.id));
    expect([r.readinessTypeCode, r.sorStatusCode, r.sorIssuedOn]).toEqual([
      "1",
      "02",
      null,
    ]);
    await expectPgError(record(f.enrolment.id), PG.uniqueViolation);
  });

  it("ties readiness type, SOR status and SOR date together (AK, AL, AN)", async () => {
    const f = await makeFixture(t.db);
    await expectPgError(
      record(f.enrolment.id, { readinessTypeCode: "4" }),
      PG.checkViolation,
      /readiness_sor/,
    );
    await expectPgError(
      record(f.enrolment.id, { readinessTypeCode: "4", sorStatusCode: "01" }),
      PG.checkViolation,
      /sor_date/,
    );
    await expectPgError(
      record(f.enrolment.id, { sorIssuedOn: "2030-05-01" }),
      PG.checkViolation,
      /sor_date/,
    );
    await record(f.enrolment.id, {
      readinessTypeCode: "4",
      sorStatusCode: "01",
      sorIssuedOn: "2030-05-01",
    });
  });

  it("never lets the SOR date pass the cohort's EISA date", async () => {
    const f = await makeFixture(t.db);
    await t.db
      .update(s.cohorts)
      .set({ eisaOn: "2030-06-15" })
      .where(eq(s.cohorts.id, f.cohort.id));
    const issued = { readinessTypeCode: "4", sorStatusCode: "01" } as const;
    await expectPgError(
      record(f.enrolment.id, { ...issued, sorIssuedOn: "2030-06-16" }),
      PG.checkViolation,
      /after the EISA date/,
    );
    await record(f.enrolment.id, { ...issued, sorIssuedOn: "2030-06-15" });
    await expectPgError(
      t.db
        .update(s.cohorts)
        .set({ eisaOn: "2030-06-14" })
        .where(eq(s.cohorts.id, f.cohort.id)),
      PG.checkViolation,
      /before an issued SOR date/,
    );
    const g = await makeFixture(t.db);
    await expectPgError(
      t.db
        .update(s.cohorts)
        .set({ eisaOn: "2029-12-31" })
        .where(eq(s.cohorts.id, g.cohort.id)),
      PG.checkViolation,
      /eisa_after_start/,
    );
  });

  it("uses FLC 06 exactly when the qualification is NQF 5 or above", async () => {
    const f = await makeFixture(t.db); // NQF 4
    await expectPgError(
      record(f.enrolment.id, { flcCode: "06" }),
      PG.checkViolation,
      /FLC 06/,
    );
    await record(f.enrolment.id, { flcCode: "05" });
    // Raising the level would contradict the recorded FLC code.
    await expectPgError(
      t.db
        .update(s.qualifications)
        .set({ nqfLevel: 5 })
        .where(eq(s.qualifications.id, f.qualification.id)),
      PG.checkViolation,
      /contradict recorded FLC/,
    );

    const g = await makeFixture(t.db);
    await t.db
      .update(s.qualifications)
      .set({ nqfLevel: 5 })
      .where(eq(s.qualifications.id, g.qualification.id));
    await expectPgError(
      record(g.enrolment.id, { flcCode: "05" }),
      PG.checkViolation,
      /FLC 06/,
    );
    await record(g.enrolment.id, { flcCode: "06" });
  });

  it("applies the FLC statement number rules (AP)", async () => {
    const f = await makeFixture(t.db);
    await expectPgError(
      record(f.enrolment.id, { flcCode: "01" }),
      PG.checkViolation,
      /flc_number_required/,
    );
    await expectPgError(
      record(f.enrolment.id, {
        flcCode: "02",
        flcStatementNumber: "RPL2030-01-01",
      }),
      PG.checkViolation,
      /flc_rpl_format/,
    );
    await record(f.enrolment.id, {
      flcCode: "02",
      flcStatementNumber: "RPL20300101",
    });
  });

  it("allows an SDP code override only for Assessment Partner RPL (AN = 6)", async () => {
    const f = await makeFixture(t.db);
    await expectPgError(
      record(f.enrolment.id, { sdpCodeOverride: "AP-FAKE" }),
      PG.checkViolation,
      /sdp_code_override/,
    );
    await record(f.enrolment.id, {
      readinessTypeCode: "6",
      sorStatusCode: "01",
      sorIssuedOn: "2030-05-01",
      sdpCodeOverride: "AP-FAKE",
    });
  });
});

describe("consent records", () => {
  const consent = (
    userId: string,
    values: Partial<typeof s.consentRecords.$inferInsert>,
  ) =>
    t.db.insert(s.consentRecords).values({
      userId,
      noticeVersion: "test-1",
      noticeSha256: sha("a"),
      ...values,
    });

  it("records QCTO sharing consent, including a refusal (AH = No)", async () => {
    const f = await makeFixture(t.db);
    await consent(f.learner.id, {});
    await consent(f.learner.id, { kind: "qcto_sharing", granted: false });
    await consent(f.learner.id, { kind: "qcto_sharing", granted: true });
    const rows = await t.db
      .select()
      .from(s.consentRecords)
      .where(eq(s.consentRecords.userId, f.learner.id));
    expect(rows.map((r) => [r.kind, r.granted])).toEqual([
      ["popia_notice", true],
      ["qcto_sharing", false],
      ["qcto_sharing", true],
    ]);
  });

  it("can't record a refused POPIA notice", async () => {
    const f = await makeFixture(t.db);
    await expectPgError(
      consent(f.learner.id, { granted: false }),
      PG.checkViolation,
      /popia_notice_granted/,
    );
  });
});

describe("LEISA submission batches", () => {
  async function setup() {
    const f = await makeFixture(t.db);
    const admin = await f.user("admin");
    const p = one(
      await t.db
        .insert(s.providerAccreditations)
        .values({
          legalName: "Test Provider (fake)",
          accreditationNumber: `ACC-${++fakeIdCounter}`,
          startsOn: "2026-01-01",
          endsOn: "2031-01-01",
        })
        .returning(),
    );
    const batch = one(
      await t.db
        .insert(s.qctoSubmissionBatches)
        .values({
          providerAccreditationId: p.id,
          purpose: "enrolment",
          cohortId: f.cohort.id,
          createdBy: admin.id,
        })
        .returning(),
    );
    const item = one(
      await t.db
        .insert(s.qctoSubmissionItems)
        .values({ batchId: batch.id, enrolmentId: f.enrolment.id })
        .returning(),
    );
    const generated = {
      status: "generated" as const,
      fileName: "LEISA20300101-Test Provider (fake)",
      fileDate: "2030-01-01",
      storageKey: `leisa/${batch.id}.xlsx`,
      fileSha256: sha("b"),
      rowCount: 1,
      generatedAt: new Date(),
      generatedBy: admin.id,
    };
    const setBatch = (
      values: Partial<typeof s.qctoSubmissionBatches.$inferInsert>,
    ) =>
      t.db
        .update(s.qctoSubmissionBatches)
        .set(values)
        .where(eq(s.qctoSubmissionBatches.id, batch.id));
    const setItem = (
      values: Partial<typeof s.qctoSubmissionItems.$inferInsert>,
    ) =>
      t.db
        .update(s.qctoSubmissionItems)
        .set(values)
        .where(eq(s.qctoSubmissionItems.id, item.id));
    return { f, admin, p, batch, item, generated, setBatch, setItem };
  }

  it("needs the file details to leave draft, and a LEISA file name", async () => {
    const { generated, setBatch } = await setup();
    await expectPgError(
      setBatch({ status: "generated" }),
      PG.checkViolation,
      /generated_fields/,
    );
    await expectPgError(
      setBatch({ ...generated, fileName: "leisa-wrong.xlsx" }),
      PG.checkViolation,
      /file_name_format/,
    );
    await setBatch(generated);
  });

  it("moves forward only: draft → generated → submitted → accepted/rejected", async () => {
    const { admin, generated, setBatch } = await setup();
    await expectPgError(
      setBatch({
        ...generated,
        status: "submitted",
        submittedAt: new Date(),
        submittedBy: admin.id,
      }),
      PG.checkViolation,
      /cannot go from draft to submitted/,
    );
    await setBatch(generated);
    await setBatch({ status: "draft" }); // regenerate
    await setBatch(generated);
    await expectPgError(
      setBatch({ status: "submitted" }),
      PG.checkViolation,
      /submitted_fields/,
    );
    await setBatch({
      status: "submitted",
      submittedAt: new Date(),
      submittedBy: admin.id,
    });
    await expectPgError(
      setBatch({ status: "generated" }),
      PG.checkViolation,
      /cannot go from submitted/,
    );
    await expectPgError(
      setBatch({ status: "accepted" }),
      PG.checkViolation,
      /response_fields/,
    );
    await setBatch({
      status: "accepted",
      respondedAt: new Date(),
      responseNote: "Accepted",
    });
    await expectPgError(
      setBatch({ status: "rejected" }),
      PG.checkViolation,
      /cannot go from accepted/,
    );
    await expectPgError(
      setBatch({ responseNote: "Changed" }),
      PG.restrictViolation,
      /response is final/,
    );
  });

  it("freezes the file once submitted and keeps the batch", async () => {
    const { admin, batch, generated, setBatch } = await setup();
    await setBatch(generated);
    await setBatch({
      status: "submitted",
      submittedAt: new Date(),
      submittedBy: admin.id,
    });
    await expectPgError(
      setBatch({ fileSha256: sha("c") }),
      PG.restrictViolation,
      /frozen once submitted/,
    );
    await expectPgError(
      t.db
        .delete(s.qctoSubmissionBatches)
        .where(eq(s.qctoSubmissionBatches.id, batch.id)),
      PG.restrictViolation,
      /only a draft can be deleted/,
    );
    await expectPgError(
      setBatch({ purpose: "eisa_readiness" }),
      PG.restrictViolation,
      /cannot change/,
    );
  });

  it("lets rows change only while draft, and outcomes only after submission", async () => {
    const { f, admin, batch, item, generated, setBatch, setItem } =
      await setup();
    await setItem({ rowNumber: 1, rowSha256: sha("d") });
    await expectPgError(
      setItem({ outcome: "accepted" }),
      PG.checkViolation,
      /only after submission/,
    );
    await setBatch(generated);
    await expectPgError(
      setItem({ rowSha256: sha("e") }),
      PG.restrictViolation,
      /row is frozen/,
    );
    const other = await f.user("late");
    const lateEnrolment = one(
      await t.db
        .insert(s.enrolments)
        .values({ userId: other.id, cohortId: f.cohort.id })
        .returning(),
    );
    await expectPgError(
      t.db
        .insert(s.qctoSubmissionItems)
        .values({ batchId: batch.id, enrolmentId: lateEnrolment.id }),
      PG.restrictViolation,
      /only be added or removed while it is a draft/,
    );
    await expectPgError(
      t.db
        .delete(s.qctoSubmissionItems)
        .where(eq(s.qctoSubmissionItems.id, item.id)),
      PG.restrictViolation,
    );
    await setBatch({
      status: "submitted",
      submittedAt: new Date(),
      submittedBy: admin.id,
    });
    await expectPgError(
      setItem({ rejectionReason: "Invalid code" }),
      PG.checkViolation,
      /rejection_reason/,
    );
    await setItem({ outcome: "rejected", rejectionReason: "Invalid code" });
    await expectPgError(
      setItem({ enrolmentId: lateEnrolment.id }),
      PG.restrictViolation,
      /cannot change/,
    );
  });

  it("only takes enrolments from the batch's cohort", async () => {
    const { batch } = await setup();
    const g = await makeFixture(t.db);
    await expectPgError(
      t.db
        .insert(s.qctoSubmissionItems)
        .values({ batchId: batch.id, enrolmentId: g.enrolment.id }),
      PG.checkViolation,
      /not in the batch's cohort/,
    );
  });
});
