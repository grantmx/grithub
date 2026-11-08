CREATE TYPE "public"."appeal_status" AS ENUM('open', 'upheld', 'reassess');--> statement-breakpoint
ALTER TYPE "public"."question_type" ADD VALUE 'short_answer';--> statement-breakpoint
CREATE TABLE "rubric_criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_version_id" uuid NOT NULL,
	"label" text NOT NULL,
	"guidance" text,
	"max_marks" integer NOT NULL,
	"sort_order" smallint NOT NULL,
	CONSTRAINT "rubric_criteria_version_order_uq" UNIQUE("question_version_id","sort_order"),
	CONSTRAINT "rubric_criteria_max_marks" CHECK ("rubric_criteria"."max_marks" BETWEEN 1 AND 100)
);
--> statement-breakpoint
CREATE TABLE "appeals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"decision_id" uuid NOT NULL,
	"enrolment_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" "appeal_status" DEFAULT 'open' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"outcome_notes" text,
	CONSTRAINT "appeals_decision_uq" UNIQUE("decision_id"),
	CONSTRAINT "appeals_decided_fields" CHECK (("appeals"."status" = 'open') = ("appeals"."decided_at" IS NULL AND "appeals"."decided_by" IS NULL)),
	CONSTRAINT "appeals_reason_length" CHECK (length("appeals"."reason") BETWEEN 1 AND 4000)
);
--> statement-breakpoint
CREATE TABLE "assessment_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_id" uuid NOT NULL,
	"blueprint_id" uuid NOT NULL,
	"assessment_day_id" uuid,
	"opens_at" timestamp with time zone NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_schedules_window" CHECK ("assessment_schedules"."closes_at" > "assessment_schedules"."opens_at")
);
--> statement-breakpoint
CREATE TABLE "decision_drafts" (
	"attempt_id" uuid NOT NULL,
	"assessor_id" uuid NOT NULL,
	"outcome" "decision_outcome",
	"feedback" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "decision_drafts_pk" PRIMARY KEY("attempt_id","assessor_id")
);
--> statement-breakpoint
CREATE TABLE "item_marks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_item_id" uuid NOT NULL,
	"criterion_id" uuid NOT NULL,
	"marks" integer NOT NULL,
	"marked_by" uuid NOT NULL,
	"marked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_marks_item_criterion_uq" UNIQUE("attempt_item_id","criterion_id"),
	CONSTRAINT "item_marks_marks_nonnegative" CHECK ("item_marks"."marks" >= 0)
);
--> statement-breakpoint
CREATE TABLE "paper_unlocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"enrolment_id" uuid NOT NULL,
	"attempt_no" integer NOT NULL,
	"unlocked_by" uuid NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "paper_unlocks_schedule_enrolment_attempt_uq" UNIQUE("schedule_id","enrolment_id","attempt_no"),
	CONSTRAINT "paper_unlocks_attempt_no" CHECK ("paper_unlocks"."attempt_no" >= 1)
);
--> statement-breakpoint
CREATE TABLE "register_signoffs" (
	"assessment_day_id" uuid PRIMARY KEY NOT NULL,
	"signed_by" uuid NOT NULL,
	"signed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessment_blueprints" ADD COLUMN "show_answers" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_blueprints" ADD COLUMN "status" "publish_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_blueprints" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "question_versions" ADD COLUMN "max_marks" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD COLUMN "id_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD COLUMN "id_verified_by" uuid;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD COLUMN "schedule_id" uuid;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD COLUMN "unlock_id" uuid;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD COLUMN "deadline_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD COLUMN "extra_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD COLUMN "paused_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD COLUMN "auto_submitted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD COLUMN "used_fallback" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "attempt_items" ADD COLUMN "response_text" text;--> statement-breakpoint
ALTER TABLE "attempt_items" ADD COLUMN "flagged" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "attempt_items" ADD COLUMN "marks_awarded" integer;--> statement-breakpoint
ALTER TABLE "attempt_items" ADD COLUMN "marker_note" text;--> statement-breakpoint
ALTER TABLE "rubric_criteria" ADD CONSTRAINT "rubric_criteria_question_version_id_question_versions_id_fk" FOREIGN KEY ("question_version_id") REFERENCES "public"."question_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_decision_id_assessment_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."assessment_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_enrolment_id_enrolments_id_fk" FOREIGN KEY ("enrolment_id") REFERENCES "public"."enrolments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_schedules" ADD CONSTRAINT "assessment_schedules_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_schedules" ADD CONSTRAINT "assessment_schedules_blueprint_id_assessment_blueprints_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."assessment_blueprints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_schedules" ADD CONSTRAINT "assessment_schedules_assessment_day_id_assessment_days_id_fk" FOREIGN KEY ("assessment_day_id") REFERENCES "public"."assessment_days"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_schedules" ADD CONSTRAINT "assessment_schedules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_drafts" ADD CONSTRAINT "decision_drafts_attempt_id_assessment_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."assessment_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_drafts" ADD CONSTRAINT "decision_drafts_assessor_id_users_id_fk" FOREIGN KEY ("assessor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_marks" ADD CONSTRAINT "item_marks_attempt_item_id_attempt_items_id_fk" FOREIGN KEY ("attempt_item_id") REFERENCES "public"."attempt_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_marks" ADD CONSTRAINT "item_marks_criterion_id_rubric_criteria_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."rubric_criteria"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_marks" ADD CONSTRAINT "item_marks_marked_by_users_id_fk" FOREIGN KEY ("marked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_unlocks" ADD CONSTRAINT "paper_unlocks_schedule_id_assessment_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."assessment_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_unlocks" ADD CONSTRAINT "paper_unlocks_enrolment_id_enrolments_id_fk" FOREIGN KEY ("enrolment_id") REFERENCES "public"."enrolments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_unlocks" ADD CONSTRAINT "paper_unlocks_unlocked_by_users_id_fk" FOREIGN KEY ("unlocked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "register_signoffs" ADD CONSTRAINT "register_signoffs_assessment_day_id_assessment_days_id_fk" FOREIGN KEY ("assessment_day_id") REFERENCES "public"."assessment_days"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "register_signoffs" ADD CONSTRAINT "register_signoffs_signed_by_users_id_fk" FOREIGN KEY ("signed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessment_schedules_cohort_idx" ON "assessment_schedules" USING btree ("cohort_id");--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_id_verified_by_users_id_fk" FOREIGN KEY ("id_verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_schedule_id_assessment_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."assessment_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_unlock_id_paper_unlocks_id_fk" FOREIGN KEY ("unlock_id") REFERENCES "public"."paper_unlocks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessment_attempts_schedule_idx" ON "assessment_attempts" USING btree ("schedule_id");--> statement-breakpoint
CREATE UNIQUE INDEX "moderation_batches_one_open_blueprint_uq" ON "moderation_batches" USING btree ("cohort_id","blueprint_id") WHERE "moderation_batches"."status" = 'open' AND "moderation_batches"."blueprint_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "moderation_batches_one_open_brief_uq" ON "moderation_batches" USING btree ("cohort_id","brief_id") WHERE "moderation_batches"."status" = 'open' AND "moderation_batches"."brief_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_unlock_uq" UNIQUE("unlock_id");--> statement-breakpoint
ALTER TABLE "assessment_decisions" ADD CONSTRAINT "assessment_decisions_supersedes_uq" UNIQUE("supersedes_id");--> statement-breakpoint
ALTER TABLE "assessment_blueprints" ADD CONSTRAINT "assessment_blueprints_summative_in_person" CHECK ("assessment_blueprints"."kind" <> 'summative' OR "assessment_blueprints"."in_person_only");--> statement-breakpoint
ALTER TABLE "assessment_blueprints" ADD CONSTRAINT "assessment_blueprints_published_at" CHECK (("assessment_blueprints"."status" = 'published') = ("assessment_blueprints"."published_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "question_versions" ADD CONSTRAINT "question_versions_max_marks" CHECK ("question_versions"."max_marks" >= 1);--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_id_verified_fields" CHECK (("attendance_records"."id_verified_at" IS NULL) = ("attendance_records"."id_verified_by" IS NULL));--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_extra_minutes" CHECK ("assessment_attempts"."extra_minutes" BETWEEN 0 AND 600);