import {
  type CodeLists,
  type ProfileValues,
  emptyProfile,
  luhnValid,
} from "@/lib/qctoProfile";

// All identity numbers below are synthetic, built to pass the checksum only.

/** Append the Luhn check digit to 12 digits. */
export function withCheckDigit(first12: string): string {
  for (let d = 0; d <= 9; d++) {
    if (luhnValid(`${first12}${d}`)) return `${first12}${d}`;
  }
  throw new Error("unreachable");
}

// 14 March 1998, female (0000–4999), citizen (digit 11 = 0).
export const FAKE_ID_F = withCheckDigit("980314000008");
// 1 January 2001, male (5000–9999), permanent resident.
export const FAKE_ID_M = withCheckDigit("010101500018");

const opt = (...codes: string[]) =>
  codes.map((code) => ({ code, label: code }));

/** Code lists as migration 0009 loads them (labels irrelevant here). */
export const LISTS: CodeLists = {
  titles: opt("Mr", "Mrs", "Ms", "Miss", "Dr", "Prof"),
  alternativeIdTypes: opt("527", "533", "565", "538", "540", "570"),
  genders: opt("M", "F"),
  provinces: opt("1", "2", "3", "4", "5", "6", "7", "8", "9", "N", "X"),
  nationalities: opt("SA", "ZIM", "NOT", "U"),
  citizenResidentStatuses: opt("SA", "O", "D", "PR", "U"),
  immigrantStatuses: opt("01", "02", "03"),
  homeLanguages: opt("Eng", "Afr", "Xho", "Zul"),
  equities: opt("BA", "BC", "BI", "Oth", "U", "Wh"),
  socioeconomicStatuses: opt("01", "02", "06", "97", "98", "U"),
  disabilityStatuses: opt("N", "01", "02", "09"),
  disabilityRatings: opt("01", "02", "03", "04", "06", "60", "70", "80"),
};

export const area = (code: string, province: string) =>
  code === "2011-160001001" && province === "1";

export function completeProfile(): ProfileValues {
  return {
    ...emptyProfile(),
    titleCode: "Ms",
    firstName: "Test",
    middleName: "",
    lastName: "Learner-Fake",
    idKind: "national",
    nationalId: FAKE_ID_F,
    birthDate: "1998-03-14",
    genderCode: "F",
    homeAddress: {
      line1: "1 Fake Street",
      line2: "Testville",
      line3: "",
      postalCode: "0001",
    },
    postalSameAsHome: true,
    postalAddress: {
      line1: "1 Fake Street",
      line2: "Testville",
      line3: "",
      postalCode: "0001",
    },
    provinceCode: "1",
    statssaAreaCode: "2011-160001001",
    nationalityCode: "SA",
    citizenResidentStatusCode: "SA",
    immigrantStatusCode: "03",
    homeLanguageCode: "Eng",
    equityCode: "U",
    socioeconomicStatusCode: "02",
    disabilityStatusCode: "N",
    disabilityRatingCode: "",
  };
}

let seq = 0;
/** A fresh synthetic female ID with birth date 14 March 1998 (matches completeProfile). */
export function uniqueFemaleId(): string {
  seq += 1;
  return withCheckDigit(`980314${String(seq).padStart(4, "0")}08`);
}

/** completeProfile() with its own ID number, for tests that save several learners. */
export function uniqueProfile(): ProfileValues {
  return { ...completeProfile(), nationalId: uniqueFemaleId() };
}
