import { describe, expect, it } from "vitest";
import {
  type ProfileValues,
  changedFields,
  checkSaId,
  emptyProfile,
  firstIncompletePart,
  isComplete,
  maskId,
  readPartFromForm,
  validateProfile,
} from "@/lib/qctoProfile";
import {
  FAKE_ID_F,
  FAKE_ID_M,
  LISTS,
  area,
  completeProfile,
  withCheckDigit,
} from "./qctoFixtures";

const errorsFor = (v: ProfileValues, partial = false) =>
  validateProfile(v, LISTS, undefined, {
    partial,
    areaInProvince: area,
    today: new Date("2026-11-08T00:00:00Z"),
  });

describe("South African ID numbers", () => {
  it("accepts a valid number and reads date, gender and citizenship", () => {
    expect(checkSaId(FAKE_ID_F)).toEqual({
      yymmdd: "980314",
      gender: "F",
      citizenship: "citizen",
    });
    expect(checkSaId(FAKE_ID_M)).toMatchObject({
      gender: "M",
      citizenship: "permanent_resident",
    });
  });

  it("rejects wrong length, impossible dates and bad check digits", () => {
    expect(checkSaId("12345")).toHaveProperty("error");
    expect(checkSaId(withCheckDigit("981332000008"))).toHaveProperty("error");
    const last = Number(FAKE_ID_F.at(-1));
    expect(
      checkSaId(`${FAKE_ID_F.slice(0, 12)}${(last + 1) % 10}`),
    ).toHaveProperty("error");
  });
});

describe("profile validation", () => {
  it("accepts a complete profile", () => {
    expect(errorsFor(completeProfile())).toEqual({});
    expect(isComplete(completeProfile(), LISTS, { areaInProvince: area })).toBe(
      true,
    );
  });

  it("birth date and gender must match the ID (asked separately)", () => {
    const e = errorsFor({
      ...completeProfile(),
      birthDate: "1998-03-15",
      genderCode: "M",
    });
    expect(e.birthDate).toMatch(/doesn't match/);
    expect(e.genderCode).toMatch(/doesn't match/);
  });

  it("alternate IDs need a real document type (not 533 None or 570)", () => {
    const base = {
      ...completeProfile(),
      idKind: "alternate" as const,
      nationalId: "",
      alternateId: "AB1234567",
    };
    expect(errorsFor({ ...base, alternativeIdTypeCode: "527" })).toEqual({});
    expect(
      errorsFor({ ...base, alternativeIdTypeCode: "533" })
        .alternativeIdTypeCode,
    ).toBeDefined();
    expect(
      errorsFor({ ...base, alternativeIdTypeCode: "570" })
        .alternativeIdTypeCode,
    ).toBeDefined();
  });

  it("applies the QCTO character sets (mapping I-10, I-11)", () => {
    const e = errorsFor({
      ...completeProfile(),
      firstName: "Zoë",
      lastName: "van der Merwe",
      homeAddress: {
        line1: "12",
        line2: "Area <b>",
        line3: "",
        postalCode: "123",
      },
    });
    expect(e.firstName).toMatch(/without the accent/);
    expect(e.lastName).toBeUndefined(); // spaces are allowed
    expect(e["homeAddress.line1"]).toMatch(/street name/);
    expect(e["homeAddress.line2"]).toBeDefined();
    expect(e["homeAddress.postalCode"]).toMatch(/4 digits/);
  });

  it("checks the postal address only when it differs from home", () => {
    const v = { ...completeProfile(), postalSameAsHome: false };
    v.postalAddress = { line1: "", line2: "", line3: "", postalCode: "" };
    expect(Object.keys(errorsFor(v))).toContain("postalAddress.line1");
  });

  it("needs a Stats SA area in the chosen province (1–9), none for N or X", () => {
    expect(
      errorsFor({ ...completeProfile(), provinceCode: "2" }).statssaAreaCode,
    ).toMatch(/province above/);
    expect(
      errorsFor({ ...completeProfile(), statssaAreaCode: "" }).statssaAreaCode,
    ).toBeDefined();
    expect(
      errorsFor({
        ...completeProfile(),
        provinceCode: "X",
        statssaAreaCode: "",
      }),
    ).toEqual({});
  });

  it("needs a disability rating exactly when there is a disability (I-9)", () => {
    expect(
      errorsFor({ ...completeProfile(), disabilityStatusCode: "01" })
        .disabilityRatingCode,
    ).toBeDefined();
    expect(
      errorsFor({
        ...completeProfile(),
        disabilityStatusCode: "01",
        disabilityRatingCode: "02",
      }),
    ).toEqual({});
    expect(
      errorsFor({ ...completeProfile(), disabilityRatingCode: "02" })
        .disabilityRatingCode,
    ).toBeDefined();
  });

  it("doesn't offer institution or under-15 codes to learners", () => {
    expect(
      errorsFor({ ...completeProfile(), nationalityCode: "NOT" })
        .nationalityCode,
    ).toBeDefined();
    expect(
      errorsFor({ ...completeProfile(), socioeconomicStatusCode: "97" })
        .socioeconomicStatusCode,
    ).toBeDefined();
  });

  it("phone numbers are optional but must be 10-digit SA numbers", () => {
    expect(
      errorsFor({ ...completeProfile(), cellPhone: "082 123 4567" }),
    ).toEqual({});
    expect(
      errorsFor({ ...completeProfile(), cellPhone: "+27821234567" }).cellPhone,
    ).toBeDefined();
  });

  it("partial mode (admin) allows gaps but not invalid values", () => {
    expect(errorsFor(emptyProfile(), true)).toEqual({});
    expect(
      errorsFor(
        { ...emptyProfile(), idKind: "national", nationalId: "123" },
        true,
      ).nationalId,
    ).toBeDefined();
  });

  it("finds the first part that still needs work", () => {
    const opts = { areaInProvince: area };
    expect(firstIncompletePart(emptyProfile(), LISTS, opts)).toBe("about");
    expect(
      firstIncompletePart(
        { ...completeProfile(), provinceCode: "" },
        LISTS,
        opts,
      ),
    ).toBe("contact");
    expect(
      firstIncompletePart(
        { ...completeProfile(), equityCode: "" },
        LISTS,
        opts,
      ),
    ).toBe("background");
    expect(firstIncompletePart(completeProfile(), LISTS, opts)).toBe("review");
  });
});

describe("form reading and helpers", () => {
  it("reads only the submitted part and normalises spacing", () => {
    const f = new FormData();
    f.set("titleCode", "Mr");
    f.set("firstName", "  Fake   Name ");
    f.set("lastName", "Learner");
    f.set("idKind", "alternate");
    f.set("nationalId", FAKE_ID_F); // ignored: alternate chosen
    f.set("alternateId", "ab-123 456");
    f.set("alternativeIdTypeCode", "527");
    const base = completeProfile();
    const v = readPartFromForm(f, "about", base);
    expect(v.firstName).toBe("Fake Name");
    expect(v.nationalId).toBe("");
    expect(v.alternateId).toBe("AB123456");
    expect(v.homeAddress).toEqual(base.homeAddress); // other parts untouched
  });

  it("copies the home address when postal is the same", () => {
    const f = new FormData();
    f.set("homeAddress.line1", "2 Fake Road");
    f.set("homeAddress.line2", "Testburg");
    f.set("homeAddress.postalCode", "1234");
    f.set("postalSameAsHome", "yes");
    f.set("postalAddress.line1", "PO Box 1");
    f.set("provinceCode", "X");
    f.set("statssaAreaCode", "2011-160001001"); // dropped: no areas outside SA
    const v = readPartFromForm(f, "contact", emptyProfile());
    expect(v.postalAddress).toEqual(v.homeAddress);
    expect(v.statssaAreaCode).toBe("");
    expect(v.shareEmailWithQcto).toBe(false);
  });

  it("lists changed field names only", () => {
    const a = completeProfile();
    const b = {
      ...a,
      firstName: "Other",
      homeAddress: { ...a.homeAddress, line3: "X" },
    };
    expect(changedFields(a, b).sort()).toEqual(["firstName", "homeAddress"]);
  });

  it("masks all but the last 4 characters", () => {
    expect(maskId("9803140000087")).toBe("•••••••••0087");
    expect(maskId("AB1")).toBe("•••");
  });
});
