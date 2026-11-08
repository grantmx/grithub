// Tenancy readiness (CLAUDE.md, LMS section). The tenancy phase (tenants table,
// NOT NULL tenant_id, row-level security) has not started yet. Until it does:
//
// - every new table carries a nullable `tenant_id` that defaults to the
//   DEFAULT_TENANT_ID below (the first and only tenant today);
// - uniqueness rules are scoped per tenant;
// - reference data shared by every tenant is listed in GLOBAL_TABLES and has
//   no tenant_id at all.
//
// This is the ONE place the default tenant id lives. Don't copy the literal.

/** Id of the first tenant. The tenancy migration will insert a tenants row with this id. */
export const DEFAULT_TENANT_ID = "00000000-0000-4000-8000-000000000001";

/**
 * Tables holding reference data shared by every tenant (QCTO code lists,
 * Stats SA areas). They deliberately have no tenant_id. Keep this list in step
 * with src/schema/qcto.ts; test/qcto.test.ts checks it.
 */
export const GLOBAL_TABLES = [
  "qcto_alternative_id_types",
  "qcto_equity_codes",
  "qcto_nationality_codes",
  "qcto_home_language_codes",
  "qcto_gender_codes",
  "qcto_citizen_resident_status_codes",
  "qcto_socioeconomic_status_codes",
  "qcto_disability_status_codes",
  "qcto_disability_rating_codes",
  "qcto_immigrant_status_codes",
  "qcto_learner_titles",
  "qcto_province_codes",
  "qcto_sor_status_codes",
  "qcto_readiness_types",
  "qcto_flc_codes",
  "statssa_area_codes",
] as const;

export type GlobalTable = (typeof GLOBAL_TABLES)[number];
