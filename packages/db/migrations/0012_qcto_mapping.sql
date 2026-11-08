CREATE TYPE "public"."consent_kind" AS ENUM('popia_notice', 'qcto_sharing');--> statement-breakpoint
ALTER TABLE "assessment_centres" DROP CONSTRAINT "assessment_centres_tenant_code_uq";--> statement-breakpoint
ALTER TABLE "learner_qcto_profiles" DROP CONSTRAINT "learner_qcto_profiles_tenant_user_uq";--> statement-breakpoint
ALTER TABLE "provider_accreditations" DROP CONSTRAINT "provider_accreditations_tenant_number_uq";--> statement-breakpoint
ALTER TABLE "learner_qcto_profiles" DROP CONSTRAINT "learner_qcto_profiles_alternative_id_type";--> statement-breakpoint
ALTER TABLE "consent_records" ADD COLUMN "kind" "consent_kind" DEFAULT 'popia_notice' NOT NULL;--> statement-breakpoint
ALTER TABLE "consent_records" ADD COLUMN "granted" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "enrolment_qcto_records" ADD COLUMN "sdp_code_override" text;--> statement-breakpoint
ALTER TABLE "learner_qcto_profiles" ADD COLUMN "share_email_with_qcto" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_centres_tenant_code_uq" ON "assessment_centres" USING btree (coalesce("tenant_id", '00000000-0000-4000-8000-000000000001'::uuid),"code");--> statement-breakpoint
CREATE UNIQUE INDEX "learner_qcto_profiles_tenant_user_uq" ON "learner_qcto_profiles" USING btree (coalesce("tenant_id", '00000000-0000-4000-8000-000000000001'::uuid),"user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_accreditations_tenant_number_uq" ON "provider_accreditations" USING btree (coalesce("tenant_id", '00000000-0000-4000-8000-000000000001'::uuid),"accreditation_number");--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_popia_notice_granted" CHECK ("consent_records"."kind" <> 'popia_notice' OR "consent_records"."granted");--> statement-breakpoint
ALTER TABLE "enrolment_qcto_records" ADD CONSTRAINT "enrolment_qcto_records_sdp_code_override" CHECK ("enrolment_qcto_records"."sdp_code_override" IS NULL OR ("enrolment_qcto_records"."readiness_type_code" = '6' AND "enrolment_qcto_records"."sdp_code_override" ~ '^[^[:space:]]'));--> statement-breakpoint
ALTER TABLE "learner_qcto_profiles" ADD CONSTRAINT "learner_qcto_profiles_alternative_id_type" CHECK ("learner_qcto_profiles"."alternative_id_type_code" IS NULL OR CASE
        WHEN "learner_qcto_profiles"."alternate_id_enc" IS NULL THEN "learner_qcto_profiles"."alternative_id_type_code" = '533'
        WHEN "learner_qcto_profiles"."national_id_enc" IS NULL THEN "learner_qcto_profiles"."alternative_id_type_code" NOT IN ('533', '570')
        ELSE "learner_qcto_profiles"."alternative_id_type_code" = '570' END);