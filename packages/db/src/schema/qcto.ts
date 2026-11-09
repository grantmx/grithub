import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { bytea, createdAt, id, tenantId, tenantKey, updatedAt } from "./columns";
import {
  qctoRowOutcome,
  qctoSubmissionPurpose,
  qctoSubmissionStatus,
} from "./enums";
import { cohorts } from "./cohorts";
import { qualifications } from "./curriculum";
import { enrolments, users } from "./people";

// QCTO data needed for the Learner Enrolment and Readiness for EISA (LEISA)
// file. Column-by-column mapping: docs/lms/compliance/qcto-leisa-mapping.md.
//
// Sensitive values are encrypted in the application (src/pii.ts) and stored
// as bytea. The database never sees the plaintext or the key. Encrypted
// columns end in `_enc`; `_hash` columns are keyed HMAC blind indexes used
// only for "is this ID already registered?" lookups.


/** The spec's universal rule: the first character is a valid, non-space character. */
const startsNonSpace = (col: unknown) => sql`${col} ~ '^[^[:space:]]'`;

// ---------------------------------------------------------------------------
// Reference code lists (GLOBAL: shared by every tenant, see src/tenancy.ts).
// Rows are loaded by migration 0009 from the QCTO data load spec (May 2022).
// A code QCTO withdraws is retired, never deleted, so old records stay valid.
// ---------------------------------------------------------------------------

const codeList = (name: string) =>
  pgTable(
    name,
    {
      code: text().primaryKey(),
      label: text().notNull(),
      sortOrder: smallint().notNull().default(0),
      retiredAt: timestamp({ withTimezone: true }),
    },
    (t) => [check(`${name}_code_format`, startsNonSpace(t.code))],
  );

export const qctoAlternativeIdTypes = codeList("qcto_alternative_id_types");
export const qctoEquityCodes = codeList("qcto_equity_codes");
export const qctoNationalityCodes = codeList("qcto_nationality_codes");
export const qctoHomeLanguageCodes = codeList("qcto_home_language_codes");
export const qctoGenderCodes = codeList("qcto_gender_codes");
export const qctoCitizenResidentStatusCodes = codeList(
  "qcto_citizen_resident_status_codes",
);
export const qctoSocioeconomicStatusCodes = codeList(
  "qcto_socioeconomic_status_codes",
);
export const qctoDisabilityStatusCodes = codeList(
  "qcto_disability_status_codes",
);
export const qctoDisabilityRatingCodes = codeList(
  "qcto_disability_rating_codes",
);
export const qctoImmigrantStatusCodes = codeList("qcto_immigrant_status_codes");
export const qctoLearnerTitles = codeList("qcto_learner_titles");
export const qctoProvinceCodes = codeList("qcto_province_codes");
export const qctoSorStatusCodes = codeList("qcto_sor_status_codes");
export const qctoReadinessTypes = codeList("qcto_readiness_types");
export const qctoFlcCodes = codeList("qcto_flc_codes");

/**
 * Stats SA area codes (LEISA column AG). The list comes from Stats SA, not the
 * QCTO spec. Loaded by migration 0015 from data/statssa_area_codes.csv (see
 * data/README.md for the source file and corrections). Each area belongs to a
 * province, and a learner's area must match their province.
 */
export const statssaAreaCodes = pgTable(
  "statssa_area_codes",
  {
    code: text().primaryKey(),
    // Main place / sub-place name (Stats SA "Area").
    label: text().notNull(),
    // Shown next to the area so learners can tell same-named places apart.
    town: text().notNull(),
    localMunicipality: text().notNull(),
    provinceCode: text()
      .notNull()
      .references(() => qctoProvinceCodes.code),
    retiredAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    check("statssa_area_codes_code_format", startsNonSpace(t.code)),
    // Type-ahead search runs within one province.
    index("statssa_area_codes_province_idx").on(t.provinceCode),
    // Target of the composite FK that keeps a profile's area in its province.
    unique("statssa_area_codes_code_province_uq").on(t.code, t.provinceCode),
  ],
);

// ---------------------------------------------------------------------------
// Accreditation (tenant data)
// ---------------------------------------------------------------------------

/**
 * The tenant's own SDP accreditation. Learner data is only valid when the
 * capture, achievement or reporting date falls inside the accreditation period.
 */
export const providerAccreditations = pgTable(
  "provider_accreditations",
  {
    id: id(),
    tenantId: tenantId(),
    // Name exactly as on the accreditation letter; used in the LEISA file name.
    legalName: text().notNull(),
    // QCTO-issued SDP code (LEISA column A). Falls back to the accreditation
    // number when QCTO has not issued a code.
    sdpCode: text(),
    accreditationNumber: text().notNull(),
    startsOn: date().notNull(),
    endsOn: date().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("provider_accreditations_tenant_number_uq").on(
      tenantKey(t.tenantId),
      t.accreditationNumber,
    ),
    check(
      "provider_accreditations_dates_ordered",
      sql`${t.endsOn} >= ${t.startsOn}`,
    ),
    check(
      "provider_accreditations_legal_name_format",
      startsNonSpace(t.legalName),
    ),
    check(
      "provider_accreditations_number_format",
      startsNonSpace(t.accreditationNumber),
    ),
    check(
      "provider_accreditations_sdp_code_format",
      sql`${t.sdpCode} IS NULL OR ${startsNonSpace(t.sdpCode)}`,
    ),
  ],
);

/**
 * What the provider is accredited to offer, and when. The period must sit
 * inside the provider's accreditation period (trigger, migration 0009).
 */
export const qualificationAccreditations = pgTable(
  "qualification_accreditations",
  {
    id: id(),
    tenantId: tenantId(),
    providerAccreditationId: uuid()
      .notNull()
      .references(() => providerAccreditations.id),
    qualificationId: uuid()
      .notNull()
      .references(() => qualifications.id),
    startsOn: date().notNull(),
    endsOn: date().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("qualification_accreditations_provider_qual_start_uq").on(
      t.providerAccreditationId,
      t.qualificationId,
      t.startsOn,
    ),
    index("qualification_accreditations_qualification_idx").on(
      t.qualificationId,
    ),
    check(
      "qualification_accreditations_dates_ordered",
      sql`${t.endsOn} >= ${t.startsOn}`,
    ),
  ],
);

/**
 * Where learners write the EISA (LEISA column AM). The code is the assessment
 * centre's accreditation number. Linked from cohorts.assessment_centre_id.
 */
export const assessmentCentres = pgTable(
  "assessment_centres",
  {
    id: id(),
    tenantId: tenantId(),
    code: text().notNull(),
    name: text().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("assessment_centres_tenant_code_uq").on(
      tenantKey(t.tenantId),
      t.code,
    ),
    check("assessment_centres_code_format", startsNonSpace(t.code)),
  ],
);

// ---------------------------------------------------------------------------
// Learner QCTO profile (one per learner per tenant)
// ---------------------------------------------------------------------------

/**
 * Everything QCTO needs about the learner as a person (LEISA columns C–AF).
 * Profiles are completed over time, so most columns are nullable here; the
 * LEISA export checks completeness. POPI Act agree/date (AH/AI) come from the
 * latest consent_records row of kind 'qcto_sharing'; email (AE) from
 * users.email when share_email_with_qcto is true.
 *
 * confirmed_at: when the learner ticked "These details are correct" during
 * setup. Admin corrections afterwards don't clear it (they are audited).
 *
 * Encrypted (`_enc`, see src/pii.ts; each value is bound to this row and
 * column, so ciphertext can't be moved between rows):
 * - national_id_enc, alternate_id_enc: identity numbers
 * - birth_date_enc: YYYYMMDD
 * - equity_code_enc, disability_status_enc, disability_rating_enc: special
 *   personal information (race, health) under POPIA s26. These codes can't
 *   have foreign keys, so the application validates them against the
 *   qcto_equity_codes / qcto_disability_* tables before encrypting.
 * - home_address_enc, postal_address_enc: JSON {line1, line2, line3, postalCode}
 * - phone_enc, cell_phone_enc, fax_enc
 */
export const learnerQctoProfiles = pgTable(
  "learner_qcto_profiles",
  {
    id: id(),
    tenantId: tenantId(),
    userId: uuid()
      .notNull()
      .references(() => users.id),

    // Names exactly as on the identity document (LEISA O, P, Q, R).
    titleCode: text().references(() => qctoLearnerTitles.code),
    firstName: text(),
    middleName: text(),
    lastName: text(),

    // Identity (C, D, E). Hashes are blind indexes of the normalised value.
    nationalIdEnc: bytea(),
    nationalIdHash: text(),
    alternateIdEnc: bytea(),
    alternateIdHash: text(),
    alternativeIdTypeCode: text().references(() => qctoAlternativeIdTypes.code),
    birthDateEnc: bytea(),

    // Demographics (F–N). Equity and disability are encrypted (special PI).
    equityCodeEnc: bytea(),
    nationalityCode: text().references(() => qctoNationalityCodes.code),
    homeLanguageCode: text().references(() => qctoHomeLanguageCodes.code),
    genderCode: text().references(() => qctoGenderCodes.code),
    citizenResidentStatusCode: text().references(
      () => qctoCitizenResidentStatusCodes.code,
    ),
    socioeconomicStatusCode: text().references(
      () => qctoSocioeconomicStatusCodes.code,
    ),
    disabilityStatusEnc: bytea(),
    disabilityRatingEnc: bytea(),
    immigrantStatusCode: text().references(() => qctoImmigrantStatusCodes.code),

    // Contact (T–AD) and area (AF, AG).
    homeAddressEnc: bytea(),
    postalAddressEnc: bytea(),
    phoneEnc: bytea(),
    cellPhoneEnc: bytea(),
    faxEnc: bytea(),
    provinceCode: text().references(() => qctoProvinceCodes.code),
    statssaAreaCode: text(),
    // Column AE: the learner chooses whether their sign-in email goes to the
    // QCTO (mapping I-15). Default: share it.
    shareEmailWithQcto: boolean().notNull().default(true),

    confirmedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("learner_qcto_profiles_tenant_user_uq").on(
      tenantKey(t.tenantId),
      t.userId,
    ),
    // One profile per identity number per tenant.
    uniqueIndex("learner_qcto_profiles_national_id_uq")
      .on(tenantKey(t.tenantId), t.nationalIdHash)
      .where(sql`${t.nationalIdHash} IS NOT NULL`),
    uniqueIndex("learner_qcto_profiles_alternate_id_uq")
      .on(tenantKey(t.tenantId), t.alternateIdHash)
      .where(sql`${t.alternateIdHash} IS NOT NULL`),
    // The area must lie in the learner's province (spec, column AG).
    foreignKey({
      name: "learner_qcto_profiles_area_in_province_fk",
      columns: [t.statssaAreaCode, t.provinceCode],
      foreignColumns: [statssaAreaCodes.code, statssaAreaCodes.provinceCode],
    }),
    check(
      "learner_qcto_profiles_national_id_hash_pair",
      sql`(${t.nationalIdEnc} IS NULL) = (${t.nationalIdHash} IS NULL)`,
    ),
    check(
      "learner_qcto_profiles_alternate_id_hash_pair",
      sql`(${t.alternateIdEnc} IS NULL) = (${t.alternateIdHash} IS NULL)`,
    ),
    // Column E (mapping I-6, I-7): national ID only → 533 ("None"); alternate
    // ID only → a real type (not 533 or 570); both → 570 ("change from
    // alternate ID to National ID"). Neither is an incomplete profile; the
    // export rejects it.
    check(
      "learner_qcto_profiles_alternative_id_type",
      sql`${t.alternativeIdTypeCode} IS NULL OR CASE
        WHEN ${t.alternateIdEnc} IS NULL THEN ${t.alternativeIdTypeCode} = '533'
        WHEN ${t.nationalIdEnc} IS NULL THEN ${t.alternativeIdTypeCode} NOT IN ('533', '570')
        ELSE ${t.alternativeIdTypeCode} = '570' END`,
    ),
    check(
      "learner_qcto_profiles_area_needs_province",
      sql`${t.statssaAreaCode} IS NULL OR ${t.provinceCode} IS NOT NULL`,
    ),
    check(
      "learner_qcto_profiles_name_format",
      sql`(${t.firstName} IS NULL OR ${startsNonSpace(t.firstName)})
        AND (${t.middleName} IS NULL OR ${startsNonSpace(t.middleName)})
        AND (${t.lastName} IS NULL OR ${startsNonSpace(t.lastName)})`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Per-enrolment QCTO status (one LEISA row = one learner on one qualification)
// ---------------------------------------------------------------------------

/**
 * Readiness, Statement of Results and FLC for one enrolment (LEISA columns
 * AJ–AP; AQ "date stamp" is updated_at). EISA date and assessment centre come
 * from the cohort.
 *
 * Enforced here: SOR date exactly when SOR status is 01; readiness type 1
 * ("Enrolled") exactly when SOR is 02; FLC statement number rules; SDP code
 * override only for readiness type 6. Enforced by trigger (migrations 0009,
 * 0013): SOR date not after the cohort's EISA date; FLC 06 exactly when the
 * qualification is NQF 5+. Enforced by the LEISA export (application): SOR 01 only
 * when every module has a released "competent" decision; dates inside the
 * accreditation period; the 21-day and 3-month submission windows.
 */
export const enrolmentQctoRecords = pgTable(
  "enrolment_qcto_records",
  {
    id: id(),
    tenantId: tenantId(),
    enrolmentId: uuid()
      .notNull()
      .references(() => enrolments.id),
    readinessTypeCode: text()
      .notNull()
      .default("1")
      .references(() => qctoReadinessTypes.code),
    sorStatusCode: text()
      .notNull()
      .default("02")
      .references(() => qctoSorStatusCodes.code),
    sorIssuedOn: date(),
    flcCode: text().references(() => qctoFlcCodes.code),
    // NSC/SC, NCV or N3 certificate number, FLC SOR number, or RPLYYYYMMDD.
    flcStatementNumber: text(),
    // Defaults to the cohort end date in the application (LEISA column AJ).
    expectedCompletionOn: date(),
    // Column A override: when the Assessment Partner does the RPL (readiness
    // type 6), its code replaces the SDP code for this learner (mapping I-27).
    sdpCodeOverride: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("enrolment_qcto_records_enrolment_uq").on(t.enrolmentId),
    check(
      "enrolment_qcto_records_sor_date",
      sql`(${t.sorStatusCode} = '01') = (${t.sorIssuedOn} IS NOT NULL)`,
    ),
    check(
      "enrolment_qcto_records_readiness_sor",
      sql`(${t.readinessTypeCode} = '1') = (${t.sorStatusCode} = '02')`,
    ),
    check(
      "enrolment_qcto_records_flc_number_required",
      sql`${t.flcCode} IS NULL OR ${t.flcCode} NOT IN ('01', '02', '03', '08') OR ${t.flcStatementNumber} IS NOT NULL`,
    ),
    check(
      "enrolment_qcto_records_flc_rpl_format",
      sql`${t.flcCode} IS DISTINCT FROM '02' OR ${t.flcStatementNumber} ~ '^RPL[0-9]{8}$'`,
    ),
    check(
      "enrolment_qcto_records_sdp_code_override",
      sql`${t.sdpCodeOverride} IS NULL OR (${t.readinessTypeCode} = '6' AND ${startsNonSpace(t.sdpCodeOverride)})`,
    ),
    check(
      "enrolment_qcto_records_flc_number_format",
      sql`${t.flcStatementNumber} IS NULL OR ${startsNonSpace(t.flcStatementNumber)}`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// LEISA submissions
// ---------------------------------------------------------------------------

/**
 * One LEISA file sent to QCTO. Lifecycle: draft → generated → submitted →
 * accepted | rejected (generated may go back to draft to regenerate). Once
 * submitted, the file fields are frozen and the batch can't be deleted
 * (trigger, migration 0009). The generated Excel file lives in private object
 * storage; only its key and SHA-256 are stored here.
 */
export const qctoSubmissionBatches = pgTable(
  "qcto_submission_batches",
  {
    id: id(),
    tenantId: tenantId(),
    providerAccreditationId: uuid()
      .notNull()
      .references(() => providerAccreditations.id),
    purpose: qctoSubmissionPurpose().notNull(),
    // Optional: a batch usually covers one cohort, but may mix cohorts.
    cohortId: uuid().references(() => cohorts.id),
    status: qctoSubmissionStatus().notNull().default("draft"),
    // LEISAyyyymmdd-<legal name>; set at generation.
    fileName: text(),
    fileDate: date(),
    storageKey: text(),
    fileSha256: text(),
    rowCount: integer(),
    generatedAt: timestamp({ withTimezone: true }),
    generatedBy: uuid().references(() => users.id),
    submittedAt: timestamp({ withTimezone: true }),
    submittedBy: uuid().references(() => users.id),
    respondedAt: timestamp({ withTimezone: true }),
    // QCTO's response in summary. No learner names or ID numbers.
    responseNote: text(),
    createdBy: uuid()
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("qcto_submission_batches_provider_idx").on(t.providerAccreditationId),
    check(
      "qcto_submission_batches_file_name_format",
      sql`${t.fileName} IS NULL OR ${t.fileName} ~ '^LEISA[0-9]{8}-[^[:space:]]'`,
    ),
    check(
      "qcto_submission_batches_sha256_format",
      sql`${t.fileSha256} IS NULL OR ${t.fileSha256} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "qcto_submission_batches_row_count_nonneg",
      sql`${t.rowCount} IS NULL OR ${t.rowCount} >= 0`,
    ),
    check(
      "qcto_submission_batches_generated_fields",
      sql`${t.status} = 'draft' OR (${t.fileName} IS NOT NULL AND ${t.fileDate} IS NOT NULL
        AND ${t.storageKey} IS NOT NULL AND ${t.fileSha256} IS NOT NULL AND ${t.rowCount} IS NOT NULL
        AND ${t.generatedAt} IS NOT NULL AND ${t.generatedBy} IS NOT NULL)`,
    ),
    check(
      "qcto_submission_batches_submitted_fields",
      sql`${t.status} IN ('draft', 'generated') OR (${t.submittedAt} IS NOT NULL AND ${t.submittedBy} IS NOT NULL)`,
    ),
    check(
      "qcto_submission_batches_response_fields",
      sql`(${t.status} IN ('accepted', 'rejected')) = (${t.respondedAt} IS NOT NULL)`,
    ),
  ],
);

/**
 * Which enrolments a batch contains, and QCTO's outcome per row. The row
 * itself is not copied (it holds personal data); row_sha256 proves what was
 * sent, matched against the stored file. Rows can be added or removed only
 * while the batch is a draft; outcomes only after it is submitted.
 */
export const qctoSubmissionItems = pgTable(
  "qcto_submission_items",
  {
    id: id(),
    tenantId: tenantId(),
    batchId: uuid()
      .notNull()
      .references(() => qctoSubmissionBatches.id),
    enrolmentId: uuid()
      .notNull()
      .references(() => enrolments.id),
    rowNumber: integer(),
    rowSha256: text(),
    outcome: qctoRowOutcome().notNull().default("pending"),
    // QCTO's reason code/text. No personal data.
    rejectionReason: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("qcto_submission_items_batch_enrolment_uq").on(
      t.batchId,
      t.enrolmentId,
    ),
    unique("qcto_submission_items_batch_row_uq").on(t.batchId, t.rowNumber),
    index("qcto_submission_items_enrolment_idx").on(t.enrolmentId),
    check(
      "qcto_submission_items_row_number_positive",
      sql`${t.rowNumber} IS NULL OR ${t.rowNumber} >= 1`,
    ),
    check(
      "qcto_submission_items_row_sha256_format",
      sql`${t.rowSha256} IS NULL OR ${t.rowSha256} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "qcto_submission_items_rejection_reason",
      sql`${t.rejectionReason} IS NULL OR ${t.outcome} = 'rejected'`,
    ),
  ],
);
