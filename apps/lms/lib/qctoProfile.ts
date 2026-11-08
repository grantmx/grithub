/**
 * QCTO learner profile: field model and validation (LEISA columns C–AG).
 * Pure functions: no I/O and NO logging (values are personal information).
 * Rules: docs/lms/compliance/qcto-leisa-mapping.md (spec rules plus the
 * LMS additions marked "+", and the I-x decisions).
 */

export type Address = {
  line1: string;
  line2: string;
  line3: string;
  postalCode: string;
};

/** Plaintext profile values as the forms and the server use them. */
export type ProfileValues = {
  titleCode: string;
  firstName: string;
  middleName: string;
  lastName: string;
  /** Which identity number the learner has (UI choice; drives column E). */
  idKind: "" | "national" | "alternate";
  nationalId: string;
  alternateId: string;
  alternativeIdTypeCode: string;
  /** YYYY-MM-DD (HTML date input). Exported as YYYYMMDD. */
  birthDate: string;
  genderCode: string;
  homeAddress: Address;
  postalSameAsHome: boolean;
  postalAddress: Address;
  cellPhone: string;
  phone: string;
  shareEmailWithQcto: boolean;
  provinceCode: string;
  statssaAreaCode: string;
  nationalityCode: string;
  citizenResidentStatusCode: string;
  immigrantStatusCode: string;
  homeLanguageCode: string;
  equityCode: string;
  socioeconomicStatusCode: string;
  disabilityStatusCode: string;
  disabilityRatingCode: string;
};

export const emptyAddress = (): Address => ({
  line1: "",
  line2: "",
  line3: "",
  postalCode: "",
});

export function emptyProfile(): ProfileValues {
  return {
    titleCode: "",
    firstName: "",
    middleName: "",
    lastName: "",
    idKind: "",
    nationalId: "",
    alternateId: "",
    alternativeIdTypeCode: "",
    birthDate: "",
    genderCode: "",
    homeAddress: emptyAddress(),
    postalSameAsHome: true,
    postalAddress: emptyAddress(),
    cellPhone: "",
    phone: "",
    shareEmailWithQcto: true,
    provinceCode: "",
    statssaAreaCode: "",
    nationalityCode: "",
    citizenResidentStatusCode: "",
    immigrantStatusCode: "",
    homeLanguageCode: "",
    equityCode: "",
    socioeconomicStatusCode: "",
    disabilityStatusCode: "",
    disabilityRatingCode: "",
  };
}

// ---------------------------------------------------------------------------
// Parts (design gate 2026-11-08: About you → Contact & address → Background →
// Review & confirm)
// ---------------------------------------------------------------------------

export const PROFILE_PARTS = ["about", "contact", "background"] as const;
export type ProfilePart = (typeof PROFILE_PARTS)[number];
export const PART_TITLES: Record<ProfilePart | "review", string> = {
  about: "About you",
  contact: "Contact & address",
  background: "Background",
  review: "Review & confirm",
};

/** Field names each part writes (used to say which fields changed). */
export const PART_FIELDS: Record<
  ProfilePart,
  readonly (keyof ProfileValues)[]
> = {
  about: [
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
  ],
  contact: [
    "homeAddress",
    "postalSameAsHome",
    "postalAddress",
    "cellPhone",
    "phone",
    "shareEmailWithQcto",
    "provinceCode",
    "statssaAreaCode",
  ],
  background: [
    "nationalityCode",
    "citizenResidentStatusCode",
    "immigrantStatusCode",
    "homeLanguageCode",
    "equityCode",
    "socioeconomicStatusCode",
    "disabilityStatusCode",
    "disabilityRatingCode",
  ],
};

// ---------------------------------------------------------------------------
// Code lists
// ---------------------------------------------------------------------------

export type CodeOption = { code: string; label: string };

export type CodeListName =
  | "titles"
  | "alternativeIdTypes"
  | "genders"
  | "provinces"
  | "nationalities"
  | "citizenResidentStatuses"
  | "immigrantStatuses"
  | "homeLanguages"
  | "equities"
  | "socioeconomicStatuses"
  | "disabilityStatuses"
  | "disabilityRatings";

export type CodeLists = Record<CodeListName, CodeOption[]>;

/** Alternative ID type for "national ID only" (column E). */
export const ALT_ID_NONE = "533";
/** "Change from alternate ID to national ID": admin-only situation, not offered. */
export const ALT_ID_CHANGE = "570";
/** Disability status "None". */
export const DISABILITY_NONE = "N";
/** Provinces with Stats SA areas (1–9). N (unspecified) and X (outside SA) have none. */
export const provinceHasAreas = (code: string) => /^[1-9]$/.test(code);

/**
 * Codes that describe institutions or children, never an adult learner, so
 * they are not offered in the forms (the code tables keep them).
 */
export const NOT_FOR_LEARNERS: Partial<
  Record<CodeListName, readonly string[]>
> = {
  alternativeIdTypes: [ALT_ID_NONE, ALT_ID_CHANGE],
  nationalities: ["NOT"],
  socioeconomicStatuses: ["97", "98"],
};

export function learnerOptions(lists: CodeLists, name: CodeListName) {
  const hide = NOT_FOR_LEARNERS[name] ?? [];
  return lists[name].filter((o) => !hide.includes(o.code));
}

const listForField: Partial<Record<keyof ProfileValues, CodeListName>> = {
  titleCode: "titles",
  alternativeIdTypeCode: "alternativeIdTypes",
  genderCode: "genders",
  provinceCode: "provinces",
  nationalityCode: "nationalities",
  citizenResidentStatusCode: "citizenResidentStatuses",
  immigrantStatusCode: "immigrantStatuses",
  homeLanguageCode: "homeLanguages",
  equityCode: "equities",
  socioeconomicStatusCode: "socioeconomicStatuses",
  disabilityStatusCode: "disabilityStatuses",
  disabilityRatingCode: "disabilityRatings",
};

// ---------------------------------------------------------------------------
// Low-level checks
// ---------------------------------------------------------------------------

/** Luhn check digit, as used by South African ID numbers. */
export function luhnValid(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export function isRealDate(y: number, m: number, d: number): boolean {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export type SaIdInfo = {
  /** YYMMDD from the ID. */
  yymmdd: string;
  /** F for 0000–4999, M for 5000–9999 (QCTO column I rule). */
  gender: "F" | "M";
  /** Digit 11: 0 citizen, 1 permanent resident. */
  citizenship: "citizen" | "permanent_resident" | "other";
};

/** Parse and check a South African ID number. Returns an error message or info. */
export function checkSaId(raw: string): { error: string } | SaIdInfo {
  const id = raw.replace(/\s/g, "");
  if (!/^\d{13}$/.test(id))
    return { error: "An ID number has exactly 13 digits." };
  const yy = Number(id.slice(0, 2));
  const mm = Number(id.slice(2, 4));
  const dd = Number(id.slice(4, 6));
  // Either century may apply; the date must be real in at least one.
  if (!isRealDate(2000 + yy, mm, dd) && !isRealDate(1900 + yy, mm, dd)) {
    return { error: "This ID number doesn't start with a real date of birth." };
  }
  if (!luhnValid(id)) {
    return {
      error: "This ID number isn't valid. Check each digit against your ID.",
    };
  }
  const c = id[10];
  return {
    yymmdd: id.slice(0, 6),
    gender: Number(id.slice(6, 10)) < 5000 ? "F" : "M",
    citizenship:
      c === "0" ? "citizen" : c === "1" ? "permanent_resident" : "other",
  };
}

const ACCENTED = /[À-ÖØ-öø-ÿĀ-ž]/;
const NAME_RE = /^[A-Za-z][A-Za-z '-]*$/;
const ADDRESS_RE = /^[A-Za-z0-9 \-#&()/\\:._',]*$/;

function checkName(value: string): string | undefined {
  if (value.length > 50) return "Up to 50 characters.";
  if (ACCENTED.test(value)) {
    return "The QCTO only accepts letters A to Z. Type accented letters without the accent (for example é as e).";
  }
  if (!NAME_RE.test(value)) {
    return "Use letters, spaces, hyphens and apostrophes only.";
  }
  return undefined;
}

function checkAddressLine(value: string): string | undefined {
  if (value.length > 50) return "Up to 50 characters.";
  if (!ADDRESS_RE.test(value)) {
    return "Use letters, numbers, spaces and - # & ( ) / : . _ ' , only.";
  }
  return undefined;
}

export const digitsOnly = (s: string) => s.replace(/[\s()-]/g, "");

export function toQctoDate(isoDate: string): string {
  return isoDate.replace(/-/g, "");
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Field errors keyed by form field name (e.g. "homeAddress.line1"). */
export type FieldErrors = Record<string, string>;

export type ValidateOptions = {
  /**
   * Admin form: missing values are allowed (a profile can be filled in over
   * time), but every value that is present must be valid.
   */
  partial?: boolean;
  /** Stats SA areas exist for this province and include the chosen code. */
  areaInProvince?: (areaCode: string, provinceCode: string) => boolean;
  /** Today, for "not in the future" checks. */
  today?: Date;
};

function codeError(
  lists: CodeLists,
  field: keyof ProfileValues,
  value: string,
): string | undefined {
  const name = listForField[field];
  if (!name || !value) return undefined;
  return learnerOptions(lists, name).some((o) => o.code === value)
    ? undefined
    : "Choose one of the options.";
}

/**
 * Validate the fields of one part (or every part). Returns field errors; empty
 * means valid. Cross-field rules (ID vs birth date and gender, disability
 * rating vs status, area vs province) are checked within their part.
 */
export function validateProfile(
  v: ProfileValues,
  lists: CodeLists,
  parts: readonly ProfilePart[] = PROFILE_PARTS,
  opts: ValidateOptions = {},
): FieldErrors {
  const errors: FieldErrors = {};
  const need = (field: string, value: string | boolean, message: string) => {
    if (!opts.partial && (value === "" || value === undefined))
      errors[field] = message;
  };
  const code = (field: keyof ProfileValues, message: string) => {
    const value = v[field] as string;
    need(field, value, message);
    const err = codeError(lists, field, value);
    if (err) errors[field] = err;
  };

  if (parts.includes("about")) {
    code("titleCode", "Choose your title.");
    need("firstName", v.firstName, "Enter your first name as on your ID.");
    need("lastName", v.lastName, "Enter your surname as on your ID.");
    const names: (keyof ProfileValues)[] = [
      "firstName",
      "middleName",
      "lastName",
    ];
    for (const field of names) {
      const value = v[field] as string;
      if (value) {
        const err = checkName(value);
        if (err) errors[field] = err;
      }
    }

    need("idKind", v.idKind, "Choose which identity document you have.");
    let saId: SaIdInfo | undefined;
    if (v.idKind === "national") {
      need("nationalId", v.nationalId, "Enter your 13-digit ID number.");
      if (v.nationalId) {
        const r = checkSaId(v.nationalId);
        if ("error" in r) errors.nationalId = r.error;
        else saId = r;
      }
    } else if (v.idKind === "alternate") {
      need(
        "alternativeIdTypeCode",
        v.alternativeIdTypeCode,
        "Choose the type of document.",
      );
      const err = codeError(
        lists,
        "alternativeIdTypeCode",
        v.alternativeIdTypeCode,
      );
      if (err) errors.alternativeIdTypeCode = err;
      need("alternateId", v.alternateId, "Enter the document number.");
      if (v.alternateId && !/^[A-Za-z0-9]{3,20}$/.test(v.alternateId)) {
        errors.alternateId =
          "Use 3 to 20 letters and numbers, without spaces or symbols.";
      }
    }

    need("birthDate", v.birthDate, "Enter your date of birth.");
    if (v.birthDate) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.birthDate);
      const today = opts.today ?? new Date();
      if (!m || !isRealDate(Number(m[1]), Number(m[2]), Number(m[3]))) {
        errors.birthDate = "Enter a real date.";
      } else if (
        Number(m[1]) < 1900 ||
        new Date(`${v.birthDate}T00:00:00Z`) > today
      ) {
        errors.birthDate = "Enter your date of birth.";
      } else if (
        saId &&
        v.birthDate.slice(2).replace(/-/g, "") !== saId.yymmdd
      ) {
        errors.birthDate =
          "This doesn't match the date of birth in your ID number.";
      }
    }
    code("genderCode", "Choose your gender as on your ID.");
    if (saId && v.genderCode && v.genderCode !== saId.gender) {
      errors.genderCode = "This doesn't match the gender in your ID number.";
    }
  }

  if (parts.includes("contact")) {
    const addr = (
      prefix: "homeAddress" | "postalAddress",
      a: Address,
      what: string,
    ) => {
      need(
        `${prefix}.line1`,
        a.line1,
        `Enter the street number and name of your ${what}.`,
      );
      need(
        `${prefix}.line2`,
        a.line2,
        `Enter the suburb or area of your ${what}.`,
      );
      need(
        `${prefix}.postalCode`,
        a.postalCode,
        "Enter the 4-digit postal code.",
      );
      for (const k of ["line1", "line2", "line3"] as const) {
        if (a[k]) {
          const err = checkAddressLine(a[k]);
          if (err) errors[`${prefix}.${k}`] = err;
        }
      }
      if (a.line1 && !/[A-Za-z]/.test(a.line1) && !errors[`${prefix}.line1`]) {
        errors[`${prefix}.line1`] =
          "Include the street name, not only a number.";
      }
      if (a.postalCode && !/^\d{4}$/.test(a.postalCode)) {
        errors[`${prefix}.postalCode`] = "A postal code has exactly 4 digits.";
      }
    };
    addr("homeAddress", v.homeAddress, "home address");
    if (!v.postalSameAsHome)
      addr("postalAddress", v.postalAddress, "postal address");

    for (const [field, value] of [
      ["cellPhone", v.cellPhone],
      ["phone", v.phone],
    ] as const) {
      if (value && !/^0\d{9}$/.test(digitsOnly(value))) {
        errors[field] =
          "Enter a 10-digit South African number starting with 0, e.g. 082 123 4567.";
      }
    }

    code("provinceCode", "Choose your province.");
    if (provinceHasAreas(v.provinceCode)) {
      need("statssaAreaCode", v.statssaAreaCode, "Find and choose your area.");
    }
    if (v.statssaAreaCode) {
      if (!provinceHasAreas(v.provinceCode)) {
        errors.statssaAreaCode = "Choose a province first.";
      } else if (
        opts.areaInProvince &&
        !opts.areaInProvince(v.statssaAreaCode, v.provinceCode)
      ) {
        errors.statssaAreaCode = "Choose an area in the province above.";
      }
    }
  }

  if (parts.includes("background")) {
    code("nationalityCode", "Choose your nationality.");
    code("citizenResidentStatusCode", "Choose your citizenship status.");
    code("immigrantStatusCode", "Choose one.");
    code("homeLanguageCode", "Choose your home language.");
    code("equityCode", "Choose your population group, or Unknown.");
    code("socioeconomicStatusCode", "Choose what you do now.");
    code("disabilityStatusCode", "Choose None if you have no disability.");
    if (v.disabilityStatusCode && v.disabilityStatusCode !== DISABILITY_NONE) {
      code("disabilityRatingCode", "Choose how much difficulty you have.");
    } else if (v.disabilityRatingCode) {
      errors.disabilityRatingCode =
        "Only needed when you have a disability. Leave it empty.";
    }
  }
  return errors;
}

/** True when every required field is filled in and valid (ready to confirm). */
export function isComplete(
  v: ProfileValues,
  lists: CodeLists,
  opts: Omit<ValidateOptions, "partial"> = {},
): boolean {
  return (
    Object.keys(validateProfile(v, lists, PROFILE_PARTS, opts)).length === 0
  );
}

/** The first part with a missing or invalid field, or "review". */
export function firstIncompletePart(
  v: ProfileValues,
  lists: CodeLists,
  opts: Omit<ValidateOptions, "partial"> = {},
): ProfilePart | "review" {
  for (const p of PROFILE_PARTS) {
    if (Object.keys(validateProfile(v, lists, [p], opts)).length > 0) return p;
  }
  return "review";
}

// ---------------------------------------------------------------------------
// Form parsing, diffing, display
// ---------------------------------------------------------------------------

const str = (form: FormData, name: string) =>
  String(form.get(name) ?? "").trim();

/**
 * Read one part's fields from a submitted form onto `base` (other parts keep
 * their stored values). Normalises spacing; never trusts hidden state.
 */
export function readPartFromForm(
  form: FormData,
  part: ProfilePart,
  base: ProfileValues,
): ProfileValues {
  const v: ProfileValues = {
    ...base,
    homeAddress: { ...base.homeAddress },
    postalAddress: { ...base.postalAddress },
  };
  const collapse = (s: string) => s.replace(/\s+/g, " ");
  if (part === "about") {
    v.titleCode = str(form, "titleCode");
    v.firstName = collapse(str(form, "firstName"));
    v.middleName = collapse(str(form, "middleName"));
    v.lastName = collapse(str(form, "lastName"));
    const kind = str(form, "idKind");
    v.idKind = kind === "national" || kind === "alternate" ? kind : "";
    v.nationalId =
      v.idKind === "national" ? str(form, "nationalId").replace(/\s/g, "") : "";
    v.alternateId =
      v.idKind === "alternate"
        ? str(form, "alternateId").replace(/[\s-]/g, "").toUpperCase()
        : "";
    v.alternativeIdTypeCode =
      v.idKind === "alternate" ? str(form, "alternativeIdTypeCode") : "";
    v.birthDate = str(form, "birthDate");
    v.genderCode = str(form, "genderCode");
  } else if (part === "contact") {
    const address = (prefix: string): Address => ({
      line1: collapse(str(form, `${prefix}.line1`)),
      line2: collapse(str(form, `${prefix}.line2`)),
      line3: collapse(str(form, `${prefix}.line3`)),
      postalCode: str(form, `${prefix}.postalCode`),
    });
    v.homeAddress = address("homeAddress");
    v.postalSameAsHome = form.get("postalSameAsHome") === "yes";
    v.postalAddress = v.postalSameAsHome
      ? { ...v.homeAddress }
      : address("postalAddress");
    v.cellPhone = str(form, "cellPhone");
    v.phone = str(form, "phone");
    v.shareEmailWithQcto = form.get("shareEmailWithQcto") === "yes";
    v.provinceCode = str(form, "provinceCode");
    v.statssaAreaCode = provinceHasAreas(v.provinceCode)
      ? str(form, "statssaAreaCode")
      : "";
  } else {
    v.nationalityCode = str(form, "nationalityCode");
    v.citizenResidentStatusCode = str(form, "citizenResidentStatusCode");
    v.immigrantStatusCode = str(form, "immigrantStatusCode");
    v.homeLanguageCode = str(form, "homeLanguageCode");
    v.equityCode = str(form, "equityCode");
    v.socioeconomicStatusCode = str(form, "socioeconomicStatusCode");
    v.disabilityStatusCode = str(form, "disabilityStatusCode");
    v.disabilityRatingCode =
      v.disabilityStatusCode && v.disabilityStatusCode !== DISABILITY_NONE
        ? str(form, "disabilityRatingCode")
        : "";
  }
  return v;
}

/** Names of the fields whose values differ (for the audit log: names only). */
export function changedFields(
  before: ProfileValues,
  after: ProfileValues,
): string[] {
  return (Object.keys(after) as (keyof ProfileValues)[]).filter(
    (k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]),
  );
}

/** "•••••••••0087": hides all but the last 4 characters. */
export function maskId(value: string): string {
  if (value.length <= 4) return "•".repeat(value.length);
  return "•".repeat(value.length - 4) + value.slice(-4);
}

export function labelFor(
  lists: CodeLists,
  name: CodeListName,
  code: string,
): string {
  return lists[name].find((o) => o.code === code)?.label ?? "";
}
