CREATE TYPE "public"."qcto_row_outcome" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."qcto_submission_purpose" AS ENUM('enrolment', 'eisa_readiness');--> statement-breakpoint
CREATE TYPE "public"."qcto_submission_status" AS ENUM('draft', 'generated', 'submitted', 'accepted', 'rejected');--> statement-breakpoint
CREATE TABLE "assessment_centres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"code" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_centres_tenant_code_uq" UNIQUE NULLS NOT DISTINCT("tenant_id","code"),
	CONSTRAINT "assessment_centres_code_format" CHECK ("assessment_centres"."code" ~ '^[^[:space:]]')
);
--> statement-breakpoint
CREATE TABLE "enrolment_qcto_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"enrolment_id" uuid NOT NULL,
	"readiness_type_code" text DEFAULT '1' NOT NULL,
	"sor_status_code" text DEFAULT '02' NOT NULL,
	"sor_issued_on" date,
	"flc_code" text,
	"flc_statement_number" text,
	"expected_completion_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrolment_qcto_records_enrolment_uq" UNIQUE("enrolment_id"),
	CONSTRAINT "enrolment_qcto_records_sor_date" CHECK (("enrolment_qcto_records"."sor_status_code" = '01') = ("enrolment_qcto_records"."sor_issued_on" IS NOT NULL)),
	CONSTRAINT "enrolment_qcto_records_readiness_sor" CHECK (("enrolment_qcto_records"."readiness_type_code" = '1') = ("enrolment_qcto_records"."sor_status_code" = '02')),
	CONSTRAINT "enrolment_qcto_records_flc_number_required" CHECK ("enrolment_qcto_records"."flc_code" IS NULL OR "enrolment_qcto_records"."flc_code" NOT IN ('01', '02', '03', '08') OR "enrolment_qcto_records"."flc_statement_number" IS NOT NULL),
	CONSTRAINT "enrolment_qcto_records_flc_rpl_format" CHECK ("enrolment_qcto_records"."flc_code" IS DISTINCT FROM '02' OR "enrolment_qcto_records"."flc_statement_number" ~ '^RPL[0-9]{8}$'),
	CONSTRAINT "enrolment_qcto_records_flc_number_format" CHECK ("enrolment_qcto_records"."flc_statement_number" IS NULL OR "enrolment_qcto_records"."flc_statement_number" ~ '^[^[:space:]]')
);
--> statement-breakpoint
CREATE TABLE "learner_qcto_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"user_id" uuid NOT NULL,
	"title_code" text,
	"first_name" text,
	"middle_name" text,
	"last_name" text,
	"national_id_enc" "bytea",
	"national_id_hash" text,
	"alternate_id_enc" "bytea",
	"alternate_id_hash" text,
	"alternative_id_type_code" text,
	"birth_date_enc" "bytea",
	"equity_code_enc" "bytea",
	"nationality_code" text,
	"home_language_code" text,
	"gender_code" text,
	"citizen_resident_status_code" text,
	"socioeconomic_status_code" text,
	"disability_status_enc" "bytea",
	"disability_rating_enc" "bytea",
	"immigrant_status_code" text,
	"home_address_enc" "bytea",
	"postal_address_enc" "bytea",
	"phone_enc" "bytea",
	"cell_phone_enc" "bytea",
	"fax_enc" "bytea",
	"province_code" text,
	"statssa_area_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learner_qcto_profiles_tenant_user_uq" UNIQUE NULLS NOT DISTINCT("tenant_id","user_id"),
	CONSTRAINT "learner_qcto_profiles_national_id_hash_pair" CHECK (("learner_qcto_profiles"."national_id_enc" IS NULL) = ("learner_qcto_profiles"."national_id_hash" IS NULL)),
	CONSTRAINT "learner_qcto_profiles_alternate_id_hash_pair" CHECK (("learner_qcto_profiles"."alternate_id_enc" IS NULL) = ("learner_qcto_profiles"."alternate_id_hash" IS NULL)),
	CONSTRAINT "learner_qcto_profiles_alternative_id_type" CHECK ("learner_qcto_profiles"."alternative_id_type_code" IS NULL OR ("learner_qcto_profiles"."alternate_id_enc" IS NULL) = ("learner_qcto_profiles"."alternative_id_type_code" = '533')),
	CONSTRAINT "learner_qcto_profiles_area_needs_province" CHECK ("learner_qcto_profiles"."statssa_area_code" IS NULL OR "learner_qcto_profiles"."province_code" IS NOT NULL),
	CONSTRAINT "learner_qcto_profiles_name_format" CHECK (("learner_qcto_profiles"."first_name" IS NULL OR "learner_qcto_profiles"."first_name" ~ '^[^[:space:]]')
        AND ("learner_qcto_profiles"."middle_name" IS NULL OR "learner_qcto_profiles"."middle_name" ~ '^[^[:space:]]')
        AND ("learner_qcto_profiles"."last_name" IS NULL OR "learner_qcto_profiles"."last_name" ~ '^[^[:space:]]'))
);
--> statement-breakpoint
CREATE TABLE "provider_accreditations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"legal_name" text NOT NULL,
	"sdp_code" text,
	"accreditation_number" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_accreditations_tenant_number_uq" UNIQUE NULLS NOT DISTINCT("tenant_id","accreditation_number"),
	CONSTRAINT "provider_accreditations_dates_ordered" CHECK ("provider_accreditations"."ends_on" >= "provider_accreditations"."starts_on"),
	CONSTRAINT "provider_accreditations_legal_name_format" CHECK ("provider_accreditations"."legal_name" ~ '^[^[:space:]]'),
	CONSTRAINT "provider_accreditations_number_format" CHECK ("provider_accreditations"."accreditation_number" ~ '^[^[:space:]]'),
	CONSTRAINT "provider_accreditations_sdp_code_format" CHECK ("provider_accreditations"."sdp_code" IS NULL OR "provider_accreditations"."sdp_code" ~ '^[^[:space:]]')
);
--> statement-breakpoint
CREATE TABLE "qcto_alternative_id_types" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "qcto_alternative_id_types_code_format" CHECK ("qcto_alternative_id_types"."code" ~ '^[^[:space:]]')
);
--> statement-breakpoint
CREATE TABLE "qcto_citizen_resident_status_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "qcto_citizen_resident_status_codes_code_format" CHECK ("qcto_citizen_resident_status_codes"."code" ~ '^[^[:space:]]')
);
--> statement-breakpoint
CREATE TABLE "qcto_disability_rating_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "qcto_disability_rating_codes_code_format" CHECK ("qcto_disability_rating_codes"."code" ~ '^[^[:space:]]')
);
--> statement-breakpoint
CREATE TABLE "qcto_disability_status_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "qcto_disability_status_codes_code_format" CHECK ("qcto_disability_status_codes"."code" ~ '^[^[:space:]]')
);
--> statement-breakpoint
CREATE TABLE "qcto_equity_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "qcto_equity_codes_code_format" CHECK ("qcto_equity_codes"."code" ~ '^[^[:space:]]')
);
--> statement-breakpoint
CREATE TABLE "qcto_flc_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "qcto_flc_codes_code_format" CHECK ("qcto_flc_codes"."code" ~ '^[^[:space:]]')
);
--> statement-breakpoint
CREATE TABLE "qcto_gender_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "qcto_gender_codes_code_format" CHECK ("qcto_gender_codes"."code" ~ '^[^[:space:]]')
);
--> statement-breakpoint
CREATE TABLE "qcto_home_language_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "qcto_home_language_codes_code_format" CHECK ("qcto_home_language_codes"."code" ~ '^[^[:space:]]')
);
--> statement-breakpoint
CREATE TABLE "qcto_immigrant_status_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "qcto_immigrant_status_codes_code_format" CHECK ("qcto_immigrant_status_codes"."code" ~ '^[^[:space:]]')
);
--> statement-breakpoint
CREATE TABLE "qcto_learner_titles" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "qcto_learner_titles_code_format" CHECK ("qcto_learner_titles"."code" ~ '^[^[:space:]]')
);
--> statement-breakpoint
CREATE TABLE "qcto_nationality_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "qcto_nationality_codes_code_format" CHECK ("qcto_nationality_codes"."code" ~ '^[^[:space:]]')
);
--> statement-breakpoint
CREATE TABLE "qcto_province_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "qcto_province_codes_code_format" CHECK ("qcto_province_codes"."code" ~ '^[^[:space:]]')
);
--> statement-breakpoint
CREATE TABLE "qcto_readiness_types" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "qcto_readiness_types_code_format" CHECK ("qcto_readiness_types"."code" ~ '^[^[:space:]]')
);
--> statement-breakpoint
CREATE TABLE "qcto_socioeconomic_status_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "qcto_socioeconomic_status_codes_code_format" CHECK ("qcto_socioeconomic_status_codes"."code" ~ '^[^[:space:]]')
);
--> statement-breakpoint
CREATE TABLE "qcto_sor_status_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "qcto_sor_status_codes_code_format" CHECK ("qcto_sor_status_codes"."code" ~ '^[^[:space:]]')
);
--> statement-breakpoint
CREATE TABLE "qcto_submission_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"provider_accreditation_id" uuid NOT NULL,
	"purpose" "qcto_submission_purpose" NOT NULL,
	"cohort_id" uuid,
	"status" "qcto_submission_status" DEFAULT 'draft' NOT NULL,
	"file_name" text,
	"file_date" date,
	"storage_key" text,
	"file_sha256" text,
	"row_count" integer,
	"generated_at" timestamp with time zone,
	"generated_by" uuid,
	"submitted_at" timestamp with time zone,
	"submitted_by" uuid,
	"responded_at" timestamp with time zone,
	"response_note" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qcto_submission_batches_file_name_format" CHECK ("qcto_submission_batches"."file_name" IS NULL OR "qcto_submission_batches"."file_name" ~ '^LEISA[0-9]{8}-[^[:space:]]'),
	CONSTRAINT "qcto_submission_batches_sha256_format" CHECK ("qcto_submission_batches"."file_sha256" IS NULL OR "qcto_submission_batches"."file_sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "qcto_submission_batches_row_count_nonneg" CHECK ("qcto_submission_batches"."row_count" IS NULL OR "qcto_submission_batches"."row_count" >= 0),
	CONSTRAINT "qcto_submission_batches_generated_fields" CHECK ("qcto_submission_batches"."status" = 'draft' OR ("qcto_submission_batches"."file_name" IS NOT NULL AND "qcto_submission_batches"."file_date" IS NOT NULL
        AND "qcto_submission_batches"."storage_key" IS NOT NULL AND "qcto_submission_batches"."file_sha256" IS NOT NULL AND "qcto_submission_batches"."row_count" IS NOT NULL
        AND "qcto_submission_batches"."generated_at" IS NOT NULL AND "qcto_submission_batches"."generated_by" IS NOT NULL)),
	CONSTRAINT "qcto_submission_batches_submitted_fields" CHECK ("qcto_submission_batches"."status" IN ('draft', 'generated') OR ("qcto_submission_batches"."submitted_at" IS NOT NULL AND "qcto_submission_batches"."submitted_by" IS NOT NULL)),
	CONSTRAINT "qcto_submission_batches_response_fields" CHECK (("qcto_submission_batches"."status" IN ('accepted', 'rejected')) = ("qcto_submission_batches"."responded_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "qcto_submission_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"batch_id" uuid NOT NULL,
	"enrolment_id" uuid NOT NULL,
	"row_number" integer,
	"row_sha256" text,
	"outcome" "qcto_row_outcome" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qcto_submission_items_batch_enrolment_uq" UNIQUE("batch_id","enrolment_id"),
	CONSTRAINT "qcto_submission_items_batch_row_uq" UNIQUE("batch_id","row_number"),
	CONSTRAINT "qcto_submission_items_row_number_positive" CHECK ("qcto_submission_items"."row_number" IS NULL OR "qcto_submission_items"."row_number" >= 1),
	CONSTRAINT "qcto_submission_items_row_sha256_format" CHECK ("qcto_submission_items"."row_sha256" IS NULL OR "qcto_submission_items"."row_sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "qcto_submission_items_rejection_reason" CHECK ("qcto_submission_items"."rejection_reason" IS NULL OR "qcto_submission_items"."outcome" = 'rejected')
);
--> statement-breakpoint
CREATE TABLE "qualification_accreditations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"provider_accreditation_id" uuid NOT NULL,
	"qualification_id" uuid NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qualification_accreditations_provider_qual_start_uq" UNIQUE("provider_accreditation_id","qualification_id","starts_on"),
	CONSTRAINT "qualification_accreditations_dates_ordered" CHECK ("qualification_accreditations"."ends_on" >= "qualification_accreditations"."starts_on")
);
--> statement-breakpoint
CREATE TABLE "statssa_area_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"province_code" text NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "statssa_area_codes_code_province_uq" UNIQUE("code","province_code"),
	CONSTRAINT "statssa_area_codes_code_format" CHECK ("statssa_area_codes"."code" ~ '^[^[:space:]]')
);
--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "eisa_on" date;--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "assessment_centre_id" uuid;--> statement-breakpoint
ALTER TABLE "enrolment_qcto_records" ADD CONSTRAINT "enrolment_qcto_records_enrolment_id_enrolments_id_fk" FOREIGN KEY ("enrolment_id") REFERENCES "public"."enrolments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolment_qcto_records" ADD CONSTRAINT "enrolment_qcto_records_readiness_type_code_qcto_readiness_types_code_fk" FOREIGN KEY ("readiness_type_code") REFERENCES "public"."qcto_readiness_types"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolment_qcto_records" ADD CONSTRAINT "enrolment_qcto_records_sor_status_code_qcto_sor_status_codes_code_fk" FOREIGN KEY ("sor_status_code") REFERENCES "public"."qcto_sor_status_codes"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolment_qcto_records" ADD CONSTRAINT "enrolment_qcto_records_flc_code_qcto_flc_codes_code_fk" FOREIGN KEY ("flc_code") REFERENCES "public"."qcto_flc_codes"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_qcto_profiles" ADD CONSTRAINT "learner_qcto_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_qcto_profiles" ADD CONSTRAINT "learner_qcto_profiles_title_code_qcto_learner_titles_code_fk" FOREIGN KEY ("title_code") REFERENCES "public"."qcto_learner_titles"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_qcto_profiles" ADD CONSTRAINT "learner_qcto_profiles_alternative_id_type_code_qcto_alternative_id_types_code_fk" FOREIGN KEY ("alternative_id_type_code") REFERENCES "public"."qcto_alternative_id_types"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_qcto_profiles" ADD CONSTRAINT "learner_qcto_profiles_nationality_code_qcto_nationality_codes_code_fk" FOREIGN KEY ("nationality_code") REFERENCES "public"."qcto_nationality_codes"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_qcto_profiles" ADD CONSTRAINT "learner_qcto_profiles_home_language_code_qcto_home_language_codes_code_fk" FOREIGN KEY ("home_language_code") REFERENCES "public"."qcto_home_language_codes"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_qcto_profiles" ADD CONSTRAINT "learner_qcto_profiles_gender_code_qcto_gender_codes_code_fk" FOREIGN KEY ("gender_code") REFERENCES "public"."qcto_gender_codes"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_qcto_profiles" ADD CONSTRAINT "learner_qcto_profiles_citizen_resident_status_code_qcto_citizen_resident_status_codes_code_fk" FOREIGN KEY ("citizen_resident_status_code") REFERENCES "public"."qcto_citizen_resident_status_codes"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_qcto_profiles" ADD CONSTRAINT "learner_qcto_profiles_socioeconomic_status_code_qcto_socioeconomic_status_codes_code_fk" FOREIGN KEY ("socioeconomic_status_code") REFERENCES "public"."qcto_socioeconomic_status_codes"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_qcto_profiles" ADD CONSTRAINT "learner_qcto_profiles_immigrant_status_code_qcto_immigrant_status_codes_code_fk" FOREIGN KEY ("immigrant_status_code") REFERENCES "public"."qcto_immigrant_status_codes"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_qcto_profiles" ADD CONSTRAINT "learner_qcto_profiles_province_code_qcto_province_codes_code_fk" FOREIGN KEY ("province_code") REFERENCES "public"."qcto_province_codes"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_qcto_profiles" ADD CONSTRAINT "learner_qcto_profiles_area_in_province_fk" FOREIGN KEY ("statssa_area_code","province_code") REFERENCES "public"."statssa_area_codes"("code","province_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcto_submission_batches" ADD CONSTRAINT "qcto_submission_batches_provider_accreditation_id_provider_accreditations_id_fk" FOREIGN KEY ("provider_accreditation_id") REFERENCES "public"."provider_accreditations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcto_submission_batches" ADD CONSTRAINT "qcto_submission_batches_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcto_submission_batches" ADD CONSTRAINT "qcto_submission_batches_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcto_submission_batches" ADD CONSTRAINT "qcto_submission_batches_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcto_submission_batches" ADD CONSTRAINT "qcto_submission_batches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcto_submission_items" ADD CONSTRAINT "qcto_submission_items_batch_id_qcto_submission_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."qcto_submission_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcto_submission_items" ADD CONSTRAINT "qcto_submission_items_enrolment_id_enrolments_id_fk" FOREIGN KEY ("enrolment_id") REFERENCES "public"."enrolments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_accreditations" ADD CONSTRAINT "qualification_accreditations_provider_accreditation_id_provider_accreditations_id_fk" FOREIGN KEY ("provider_accreditation_id") REFERENCES "public"."provider_accreditations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_accreditations" ADD CONSTRAINT "qualification_accreditations_qualification_id_qualifications_id_fk" FOREIGN KEY ("qualification_id") REFERENCES "public"."qualifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statssa_area_codes" ADD CONSTRAINT "statssa_area_codes_province_code_qcto_province_codes_code_fk" FOREIGN KEY ("province_code") REFERENCES "public"."qcto_province_codes"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "learner_qcto_profiles_national_id_uq" ON "learner_qcto_profiles" USING btree (coalesce("tenant_id", '00000000-0000-4000-8000-000000000001'::uuid),"national_id_hash") WHERE "learner_qcto_profiles"."national_id_hash" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "learner_qcto_profiles_alternate_id_uq" ON "learner_qcto_profiles" USING btree (coalesce("tenant_id", '00000000-0000-4000-8000-000000000001'::uuid),"alternate_id_hash") WHERE "learner_qcto_profiles"."alternate_id_hash" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "qcto_submission_batches_provider_idx" ON "qcto_submission_batches" USING btree ("provider_accreditation_id");--> statement-breakpoint
CREATE INDEX "qcto_submission_items_enrolment_idx" ON "qcto_submission_items" USING btree ("enrolment_id");--> statement-breakpoint
CREATE INDEX "qualification_accreditations_qualification_idx" ON "qualification_accreditations" USING btree ("qualification_id");--> statement-breakpoint
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_assessment_centre_id_assessment_centres_id_fk" FOREIGN KEY ("assessment_centre_id") REFERENCES "public"."assessment_centres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_eisa_after_start" CHECK ("cohorts"."eisa_on" IS NULL OR "cohorts"."eisa_on" >= "cohorts"."starts_on");