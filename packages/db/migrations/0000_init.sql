CREATE TYPE "public"."attempt_status" AS ENUM('in_progress', 'submitted', 'graded', 'void');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('present', 'absent', 'late', 'excused');--> statement-breakpoint
CREATE TYPE "public"."batch_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."blueprint_kind" AS ENUM('section_check', 'formative', 'summative');--> statement-breakpoint
CREATE TYPE "public"."content_kind" AS ENUM('text', 'audio', 'video', 'document', 'external_link');--> statement-breakpoint
CREATE TYPE "public"."decision_outcome" AS ENUM('competent', 'not_yet_competent');--> statement-breakpoint
CREATE TYPE "public"."enrolment_status" AS ENUM('active', 'completed', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."lifecycle_status" AS ENUM('draft', 'active', 'retired');--> statement-breakpoint
CREATE TYPE "public"."moderation_outcome" AS ENUM('upheld', 'referred_back');--> statement-breakpoint
CREATE TYPE "public"."module_type" AS ENUM('knowledge', 'practical');--> statement-breakpoint
CREATE TYPE "public"."publish_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."qualification_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('single', 'multi');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('facilitator', 'assessor', 'moderator', 'sdp_admin', 'external_evaluator');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ticket_category" AS ENUM('academic', 'technical', 'admin');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('invited', 'active', 'suspended');--> statement-breakpoint
CREATE TABLE "enrolments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"cohort_id" uuid NOT NULL,
	"status" "enrolment_status" DEFAULT 'active' NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrolments_user_cohort_uq" UNIQUE("user_id","cohort_id")
);
--> statement-breakpoint
CREATE TABLE "passkey_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"credential_id" "bytea" NOT NULL,
	"public_key" "bytea" NOT NULL,
	"sign_count" bigint DEFAULT 0 NOT NULL,
	"transports" text[] DEFAULT '{}'::text[] NOT NULL,
	"nickname" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "passkey_credentials_credential_id_uq" UNIQUE("credential_id"),
	CONSTRAINT "passkey_credentials_sign_count_nonneg" CHECK ("passkey_credentials"."sign_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "role_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "staff_role" NOT NULL,
	"cohort_id" uuid,
	"expires_at" timestamp with time zone,
	"granted_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_grants_user_role_cohort_uq" UNIQUE NULLS NOT DISTINCT("user_id","role","cohort_id"),
	CONSTRAINT "role_grants_global_roles_have_no_cohort" CHECK ("role_grants"."role" NOT IN ('sdp_admin', 'external_evaluator') OR "role_grants"."cohort_id" IS NULL),
	CONSTRAINT "role_grants_evaluator_expires" CHECK ("role_grants"."role" <> 'external_evaluator' OR "role_grants"."expires_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	"status" "user_status" DEFAULT 'invited' NOT NULL,
	"popia_notice_accepted_at" timestamp with time zone,
	"popia_notice_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_popia_version_with_acceptance" CHECK (("users"."popia_notice_accepted_at" IS NULL) = ("users"."popia_notice_version" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "brief_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brief_id" uuid NOT NULL,
	"label" text NOT NULL,
	"variant_instructions" text NOT NULL,
	"status" "lifecycle_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brief_variants_brief_label_uq" UNIQUE("brief_id","label")
);
--> statement-breakpoint
CREATE TABLE "content_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"kind" "content_kind" NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"media_asset_id" text,
	"duration_seconds" integer,
	"transcript" text,
	"storage_key" text,
	"external_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_items_text_has_body" CHECK ("content_items"."kind" <> 'text' OR "content_items"."body" IS NOT NULL),
	CONSTRAINT "content_items_media_has_asset" CHECK ("content_items"."kind" NOT IN ('audio', 'video') OR "content_items"."media_asset_id" IS NOT NULL),
	CONSTRAINT "content_items_published_media_has_transcript" CHECK ("content_items"."kind" NOT IN ('audio', 'video') OR "content_items"."status" = 'draft' OR "content_items"."transcript" IS NOT NULL),
	CONSTRAINT "content_items_document_has_storage_key" CHECK ("content_items"."kind" <> 'document' OR "content_items"."storage_key" IS NOT NULL),
	CONSTRAINT "content_items_link_is_https" CHECK ("content_items"."kind" <> 'external_link' OR "content_items"."external_url" ~ '^https://'),
	CONSTRAINT "content_items_version_positive" CHECK ("content_items"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"qualification_id" uuid NOT NULL,
	"code" text NOT NULL,
	"type" "module_type" NOT NULL,
	"title" text NOT NULL,
	"credits" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modules_qualification_code_uq" UNIQUE("qualification_id","code"),
	CONSTRAINT "modules_credits_positive" CHECK ("modules"."credits" > 0)
);
--> statement-breakpoint
CREATE TABLE "practical_briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"curriculum_component_ref" text NOT NULL,
	"title" text NOT NULL,
	"instructions" text NOT NULL,
	"assessment_criteria" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qualifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"saqa_id" text,
	"curriculum_code" text NOT NULL,
	"title" text NOT NULL,
	"nqf_level" smallint NOT NULL,
	"status" "qualification_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "qualifications_curriculum_code_uq" UNIQUE("curriculum_code"),
	CONSTRAINT "qualifications_nqf_level_range" CHECK ("qualifications"."nqf_level" BETWEEN 1 AND 10)
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"title" text NOT NULL,
	"curriculum_component_ref" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "answer_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_version_id" uuid NOT NULL,
	"label" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"pinned_position" smallint,
	"author_order" smallint NOT NULL,
	CONSTRAINT "answer_options_version_order_uq" UNIQUE("question_version_id","author_order")
);
--> statement-breakpoint
CREATE TABLE "assessment_blueprints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"title" text NOT NULL,
	"kind" "blueprint_kind" NOT NULL,
	"max_attempts" integer DEFAULT 1 NOT NULL,
	"time_limit_minutes" integer,
	"pass_mark_percent" integer NOT NULL,
	"in_person_only" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_blueprints_max_attempts" CHECK ("assessment_blueprints"."max_attempts" >= 1),
	CONSTRAINT "assessment_blueprints_time_limit" CHECK ("assessment_blueprints"."time_limit_minutes" IS NULL OR "assessment_blueprints"."time_limit_minutes" > 0),
	CONSTRAINT "assessment_blueprints_pass_mark" CHECK ("assessment_blueprints"."pass_mark_percent" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "blueprint_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blueprint_id" uuid NOT NULL,
	"bank_id" uuid NOT NULL,
	"curriculum_component_ref" text NOT NULL,
	"question_count" integer NOT NULL,
	CONSTRAINT "blueprint_rules_blueprint_bank_uq" UNIQUE("blueprint_id","bank_id"),
	CONSTRAINT "blueprint_rules_question_count" CHECK ("blueprint_rules"."question_count" > 0)
);
--> statement-breakpoint
CREATE TABLE "question_banks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"curriculum_component_ref" text NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"version_no" integer NOT NULL,
	"stem" text NOT NULL,
	"type" "question_type" DEFAULT 'single' NOT NULL,
	"feedback" text,
	"first_served_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_versions_question_version_uq" UNIQUE("question_id","version_no"),
	CONSTRAINT "question_versions_version_positive" CHECK ("question_versions"."version_no" >= 1)
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_id" uuid NOT NULL,
	"current_version_id" uuid,
	"status" "lifecycle_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "section_pool_questions" (
	"pool_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	CONSTRAINT "section_pool_questions_pk" PRIMARY KEY("pool_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "section_question_pools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"min_pool_size" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "section_question_pools_section_uq" UNIQUE("section_id"),
	CONSTRAINT "section_question_pools_min_size" CHECK ("section_question_pools"."min_pool_size" >= 1)
);
--> statement-breakpoint
CREATE TABLE "assessment_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_id" uuid NOT NULL,
	"held_on" date NOT NULL,
	"venue" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_days_cohort_date_uq" UNIQUE("cohort_id","held_on")
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrolment_id" uuid NOT NULL,
	"assessment_day_id" uuid NOT NULL,
	"status" "attendance_status" NOT NULL,
	"recorded_by" uuid NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_records_enrolment_day_uq" UNIQUE("enrolment_id","assessment_day_id")
);
--> statement-breakpoint
CREATE TABLE "cohorts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"qualification_id" uuid NOT NULL,
	"name" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cohorts_qualification_name_uq" UNIQUE("qualification_id","name"),
	CONSTRAINT "cohorts_dates_ordered" CHECK ("cohorts"."ends_on" >= "cohorts"."starts_on")
);
--> statement-breakpoint
CREATE TABLE "assessment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrolment_id" uuid NOT NULL,
	"blueprint_id" uuid,
	"section_id" uuid,
	"attempt_no" integer NOT NULL,
	"status" "attempt_status" DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"score_raw" integer,
	"score_max" integer,
	CONSTRAINT "assessment_attempts_blueprint_attempt_uq" UNIQUE("enrolment_id","blueprint_id","attempt_no"),
	CONSTRAINT "assessment_attempts_section_attempt_uq" UNIQUE("enrolment_id","section_id","attempt_no"),
	CONSTRAINT "assessment_attempts_one_target" CHECK (("assessment_attempts"."blueprint_id" IS NULL) <> ("assessment_attempts"."section_id" IS NULL)),
	CONSTRAINT "assessment_attempts_attempt_no" CHECK ("assessment_attempts"."attempt_no" >= 1),
	CONSTRAINT "assessment_attempts_score_range" CHECK ("assessment_attempts"."score_raw" IS NULL OR ("assessment_attempts"."score_max" IS NOT NULL AND "assessment_attempts"."score_raw" BETWEEN 0 AND "assessment_attempts"."score_max"))
);
--> statement-breakpoint
CREATE TABLE "assessment_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessor_id" uuid NOT NULL,
	"submission_id" uuid,
	"attempt_id" uuid,
	"batch_id" uuid NOT NULL,
	"outcome" "decision_outcome" NOT NULL,
	"feedback" text NOT NULL,
	"supersedes_id" uuid,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone,
	CONSTRAINT "assessment_decisions_one_target" CHECK (("assessment_decisions"."submission_id" IS NULL) <> ("assessment_decisions"."attempt_id" IS NULL)),
	CONSTRAINT "assessment_decisions_not_self_superseding" CHECK ("assessment_decisions"."supersedes_id" IS NULL OR "assessment_decisions"."supersedes_id" <> "assessment_decisions"."id")
);
--> statement-breakpoint
CREATE TABLE "attempt_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"question_version_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"served_option_order" uuid[] NOT NULL,
	"option_tokens" jsonb NOT NULL,
	"seed" text NOT NULL,
	"response_option_ids" uuid[],
	"is_correct" boolean,
	"answered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attempt_items_attempt_position_uq" UNIQUE("attempt_id","position"),
	CONSTRAINT "attempt_items_attempt_version_uq" UNIQUE("attempt_id","question_version_id"),
	CONSTRAINT "attempt_items_position" CHECK ("attempt_items"."position" >= 1)
);
--> statement-breakpoint
CREATE TABLE "moderation_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_id" uuid NOT NULL,
	"blueprint_id" uuid,
	"brief_id" uuid,
	"status" "batch_status" DEFAULT 'open' NOT NULL,
	"closed_by" uuid,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moderation_batches_one_target" CHECK (("moderation_batches"."blueprint_id" IS NULL) <> ("moderation_batches"."brief_id" IS NULL)),
	CONSTRAINT "moderation_batches_closed_fields" CHECK (("moderation_batches"."status" = 'closed') = ("moderation_batches"."closed_at" IS NOT NULL AND "moderation_batches"."closed_by" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "moderation_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"decision_id" uuid NOT NULL,
	"moderator_id" uuid NOT NULL,
	"outcome" "moderation_outcome" NOT NULL,
	"findings" text NOT NULL,
	"moderated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrolment_id" uuid NOT NULL,
	"brief_variant_id" uuid NOT NULL,
	"attempt_no" integer DEFAULT 1 NOT NULL,
	"storage_key" text NOT NULL,
	"checksum_sha256" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"mime_type" text NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submissions_storage_key_uq" UNIQUE("storage_key"),
	CONSTRAINT "submissions_size_positive" CHECK ("submissions"."size_bytes" > 0),
	CONSTRAINT "submissions_checksum_format" CHECK ("submissions"."checksum_sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "submissions_attempt_no" CHECK ("submissions"."attempt_no" >= 1)
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discussion_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discussion_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_id" uuid NOT NULL,
	"section_id" uuid,
	"author_id" uuid NOT NULL,
	"title" text NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"raised_by" uuid NOT NULL,
	"category" "ticket_category" NOT NULL,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"assigned_to" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"before" jsonb,
	"after" jsonb,
	"ip_hash" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "sync_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "sync_outbox_attempts_nonneg" CHECK ("sync_outbox"."attempts" >= 0),
	CONSTRAINT "sync_outbox_sent_at" CHECK (("sync_outbox"."status" = 'sent') = ("sync_outbox"."sent_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "enrolments" ADD CONSTRAINT "enrolments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolments" ADD CONSTRAINT "enrolments_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkey_credentials" ADD CONSTRAINT "passkey_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_grants" ADD CONSTRAINT "role_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_grants" ADD CONSTRAINT "role_grants_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_grants" ADD CONSTRAINT "role_grants_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brief_variants" ADD CONSTRAINT "brief_variants_brief_id_practical_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."practical_briefs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_qualification_id_qualifications_id_fk" FOREIGN KEY ("qualification_id") REFERENCES "public"."qualifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practical_briefs" ADD CONSTRAINT "practical_briefs_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_options" ADD CONSTRAINT "answer_options_question_version_id_question_versions_id_fk" FOREIGN KEY ("question_version_id") REFERENCES "public"."question_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_blueprints" ADD CONSTRAINT "assessment_blueprints_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blueprint_rules" ADD CONSTRAINT "blueprint_rules_blueprint_id_assessment_blueprints_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."assessment_blueprints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blueprint_rules" ADD CONSTRAINT "blueprint_rules_bank_id_question_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."question_banks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_banks" ADD CONSTRAINT "question_banks_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_versions" ADD CONSTRAINT "question_versions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_bank_id_question_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."question_banks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_current_version_id_question_versions_id_fk" FOREIGN KEY ("current_version_id") REFERENCES "public"."question_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_pool_questions" ADD CONSTRAINT "section_pool_questions_pool_id_section_question_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."section_question_pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_pool_questions" ADD CONSTRAINT "section_pool_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_question_pools" ADD CONSTRAINT "section_question_pools_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_days" ADD CONSTRAINT "assessment_days_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_enrolment_id_enrolments_id_fk" FOREIGN KEY ("enrolment_id") REFERENCES "public"."enrolments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_assessment_day_id_assessment_days_id_fk" FOREIGN KEY ("assessment_day_id") REFERENCES "public"."assessment_days"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_qualification_id_qualifications_id_fk" FOREIGN KEY ("qualification_id") REFERENCES "public"."qualifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_enrolment_id_enrolments_id_fk" FOREIGN KEY ("enrolment_id") REFERENCES "public"."enrolments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_blueprint_id_assessment_blueprints_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."assessment_blueprints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_decisions" ADD CONSTRAINT "assessment_decisions_assessor_id_users_id_fk" FOREIGN KEY ("assessor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_decisions" ADD CONSTRAINT "assessment_decisions_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_decisions" ADD CONSTRAINT "assessment_decisions_attempt_id_assessment_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."assessment_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_decisions" ADD CONSTRAINT "assessment_decisions_batch_id_moderation_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."moderation_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_decisions" ADD CONSTRAINT "assessment_decisions_supersedes_id_assessment_decisions_id_fk" FOREIGN KEY ("supersedes_id") REFERENCES "public"."assessment_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_items" ADD CONSTRAINT "attempt_items_attempt_id_assessment_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."assessment_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_items" ADD CONSTRAINT "attempt_items_question_version_id_question_versions_id_fk" FOREIGN KEY ("question_version_id") REFERENCES "public"."question_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_batches" ADD CONSTRAINT "moderation_batches_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_batches" ADD CONSTRAINT "moderation_batches_blueprint_id_assessment_blueprints_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."assessment_blueprints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_batches" ADD CONSTRAINT "moderation_batches_brief_id_practical_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."practical_briefs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_batches" ADD CONSTRAINT "moderation_batches_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_records" ADD CONSTRAINT "moderation_records_decision_id_assessment_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."assessment_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_records" ADD CONSTRAINT "moderation_records_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_enrolment_id_enrolments_id_fk" FOREIGN KEY ("enrolment_id") REFERENCES "public"."enrolments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_brief_variant_id_brief_variants_id_fk" FOREIGN KEY ("brief_variant_id") REFERENCES "public"."brief_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_thread_id_discussion_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."discussion_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_raised_by_users_id_fk" FOREIGN KEY ("raised_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "enrolments_cohort_idx" ON "enrolments" USING btree ("cohort_id");--> statement-breakpoint
CREATE INDEX "passkey_credentials_user_idx" ON "passkey_credentials" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "role_grants_user_idx" ON "role_grants" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_uq" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "content_items_section_idx" ON "content_items" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "practical_briefs_module_idx" ON "practical_briefs" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "sections_module_idx" ON "sections" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "answer_options_version_idx" ON "answer_options" USING btree ("question_version_id");--> statement-breakpoint
CREATE INDEX "question_banks_module_idx" ON "question_banks" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "questions_bank_idx" ON "questions" USING btree ("bank_id");--> statement-breakpoint
CREATE INDEX "attendance_records_day_idx" ON "attendance_records" USING btree ("assessment_day_id");--> statement-breakpoint
CREATE INDEX "assessment_decisions_batch_idx" ON "assessment_decisions" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "moderation_records_decision_idx" ON "moderation_records" USING btree ("decision_id");--> statement-breakpoint
CREATE INDEX "submissions_enrolment_idx" ON "submissions" USING btree ("enrolment_id");--> statement-breakpoint
CREATE INDEX "announcements_cohort_idx" ON "announcements" USING btree ("cohort_id","published_at");--> statement-breakpoint
CREATE INDEX "discussion_posts_thread_idx" ON "discussion_posts" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "discussion_threads_cohort_idx" ON "discussion_threads" USING btree ("cohort_id");--> statement-breakpoint
CREATE INDEX "support_tickets_status_idx" ON "support_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "sync_outbox_pending_idx" ON "sync_outbox" USING btree ("next_attempt_at") WHERE "sync_outbox"."status" = 'pending';