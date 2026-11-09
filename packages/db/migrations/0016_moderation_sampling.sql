CREATE TABLE "moderation_action_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"moderation_record_id" uuid NOT NULL,
	"done_by" uuid NOT NULL,
	"note" text NOT NULL,
	"done_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moderation_action_completions_record_uq" UNIQUE("tenant_id","moderation_record_id"),
	CONSTRAINT "moderation_action_completions_note_not_blank" CHECK (length(btrim("moderation_action_completions"."note")) > 0)
);
--> statement-breakpoint
CREATE TABLE "moderation_feedback_reads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"user_id" uuid NOT NULL,
	"seen_at" timestamp with time zone NOT NULL,
	CONSTRAINT "moderation_feedback_reads_user_uq" UNIQUE("tenant_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "moderation_sample_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"batch_id" uuid NOT NULL,
	"attempt_id" uuid,
	"submission_id" uuid,
	"reason" text DEFAULT 'moderator' NOT NULL,
	"added_by" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moderation_sample_items_attempt_uq" UNIQUE("tenant_id","batch_id","attempt_id"),
	CONSTRAINT "moderation_sample_items_submission_uq" UNIQUE("tenant_id","batch_id","submission_id"),
	CONSTRAINT "moderation_sample_items_one_target" CHECK (("moderation_sample_items"."attempt_id" IS NULL) <> ("moderation_sample_items"."submission_id" IS NULL)),
	CONSTRAINT "moderation_sample_items_reason" CHECK ("moderation_sample_items"."reason" IN ('moderator', 'reassessment'))
);
--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "moderation_rate_percent" integer DEFAULT 25 NOT NULL;--> statement-breakpoint
ALTER TABLE "moderation_records" ADD COLUMN "required_actions" text;--> statement-breakpoint
ALTER TABLE "moderation_action_completions" ADD CONSTRAINT "moderation_action_completions_moderation_record_id_moderation_records_id_fk" FOREIGN KEY ("moderation_record_id") REFERENCES "public"."moderation_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_action_completions" ADD CONSTRAINT "moderation_action_completions_done_by_users_id_fk" FOREIGN KEY ("done_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_feedback_reads" ADD CONSTRAINT "moderation_feedback_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_sample_items" ADD CONSTRAINT "moderation_sample_items_batch_id_moderation_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."moderation_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_sample_items" ADD CONSTRAINT "moderation_sample_items_attempt_id_assessment_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."assessment_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_sample_items" ADD CONSTRAINT "moderation_sample_items_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_sample_items" ADD CONSTRAINT "moderation_sample_items_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "moderation_sample_items_batch_idx" ON "moderation_sample_items" USING btree ("batch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_grants_one_assessor_per_cohort_uq" ON "role_grants" USING btree ("cohort_id") WHERE "role_grants"."role" = 'assessor';--> statement-breakpoint
ALTER TABLE "moderation_records" ADD CONSTRAINT "moderation_records_decision_uq" UNIQUE("decision_id");--> statement-breakpoint
ALTER TABLE "role_grants" ADD CONSTRAINT "role_grants_assessor_has_cohort" CHECK ("role_grants"."role" <> 'assessor' OR "role_grants"."cohort_id" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_moderation_rate" CHECK ("cohorts"."moderation_rate_percent" BETWEEN 1 AND 100);--> statement-breakpoint
ALTER TABLE "moderation_records" ADD CONSTRAINT "moderation_records_actions_not_blank" CHECK ("moderation_records"."required_actions" IS NULL OR length(btrim("moderation_records"."required_actions")) > 0);