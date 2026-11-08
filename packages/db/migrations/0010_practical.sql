CREATE TYPE "public"."brief_mode" AS ENUM('submission', 'observed');--> statement-breakpoint
CREATE TYPE "public"."evidence_kind" AS ENUM('file', 'link');--> statement-breakpoint
CREATE TYPE "public"."evidence_source" AS ENUM('learner', 'assessor');--> statement-breakpoint
CREATE TYPE "public"."scan_status" AS ENUM('not_scanned', 'pending', 'clean', 'infected');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('draft', 'submitted');--> statement-breakpoint
CREATE TABLE "brief_criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"brief_id" uuid NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"guidance" text,
	"sort_order" smallint NOT NULL,
	CONSTRAINT "brief_criteria_brief_code_uq" UNIQUE("tenant_id","brief_id","code"),
	CONSTRAINT "brief_criteria_brief_order_uq" UNIQUE("tenant_id","brief_id","sort_order")
);
--> statement-breakpoint
CREATE TABLE "criterion_judgements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"submission_id" uuid NOT NULL,
	"criterion_id" uuid NOT NULL,
	"met" boolean NOT NULL,
	"comment" text,
	"judged_by" uuid NOT NULL,
	"judged_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "criterion_judgements_submission_criterion_uq" UNIQUE("tenant_id","submission_id","criterion_id")
);
--> statement-breakpoint
CREATE TABLE "evidence_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"submission_id" uuid NOT NULL,
	"kind" "evidence_kind" NOT NULL,
	"source" "evidence_source" DEFAULT 'learner' NOT NULL,
	"added_by" uuid NOT NULL,
	"storage_pathname" text,
	"file_name" text,
	"mime_type" text,
	"size_bytes" bigint,
	"checksum_sha256" text,
	"link_url" text,
	"link_host" text,
	"scan_status" "scan_status" DEFAULT 'not_scanned' NOT NULL,
	"scanned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidence_items_pathname_uq" UNIQUE("tenant_id","storage_pathname"),
	CONSTRAINT "evidence_items_file_fields" CHECK ("evidence_items"."kind" <> 'file' OR ("evidence_items"."storage_pathname" IS NOT NULL AND "evidence_items"."file_name" IS NOT NULL AND "evidence_items"."mime_type" IS NOT NULL AND "evidence_items"."size_bytes" > 0 AND "evidence_items"."checksum_sha256" ~ '^[0-9a-f]{64}$')),
	CONSTRAINT "evidence_items_link_fields" CHECK ("evidence_items"."kind" <> 'link' OR ("evidence_items"."link_url" ~ '^https://' AND "evidence_items"."link_host" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "practical_decision_drafts" (
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"submission_id" uuid NOT NULL,
	"assessor_id" uuid NOT NULL,
	"outcome" "decision_outcome",
	"feedback" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "practical_decision_drafts_pk" PRIMARY KEY("submission_id","assessor_id")
);
--> statement-breakpoint
ALTER TABLE "submissions" DROP CONSTRAINT "submissions_storage_key_uq";--> statement-breakpoint
ALTER TABLE "submissions" DROP CONSTRAINT "submissions_size_positive";--> statement-breakpoint
ALTER TABLE "submissions" DROP CONSTRAINT "submissions_checksum_format";--> statement-breakpoint
ALTER TABLE "assessment_schedules" ALTER COLUMN "blueprint_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ALTER COLUMN "submitted_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "submissions" ALTER COLUMN "submitted_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "practical_briefs" ADD COLUMN "mode" "brief_mode" DEFAULT 'submission' NOT NULL;--> statement-breakpoint
ALTER TABLE "practical_briefs" ADD COLUMN "max_attempts" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "practical_briefs" ADD COLUMN "status" "publish_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "practical_briefs" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "assessment_schedules" ADD COLUMN "brief_id" uuid;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "brief_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "seed" text NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "schedule_id" uuid;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "status" "submission_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "observed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "observation_notes" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "links_confirmed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "brief_criteria" ADD CONSTRAINT "brief_criteria_brief_id_practical_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."practical_briefs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "criterion_judgements" ADD CONSTRAINT "criterion_judgements_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "criterion_judgements" ADD CONSTRAINT "criterion_judgements_criterion_id_brief_criteria_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."brief_criteria"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "criterion_judgements" ADD CONSTRAINT "criterion_judgements_judged_by_users_id_fk" FOREIGN KEY ("judged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practical_decision_drafts" ADD CONSTRAINT "practical_decision_drafts_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practical_decision_drafts" ADD CONSTRAINT "practical_decision_drafts_assessor_id_users_id_fk" FOREIGN KEY ("assessor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evidence_items_submission_idx" ON "evidence_items" USING btree ("submission_id");--> statement-breakpoint
ALTER TABLE "assessment_schedules" ADD CONSTRAINT "assessment_schedules_brief_id_practical_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."practical_briefs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_brief_id_practical_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."practical_briefs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_schedule_id_assessment_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."assessment_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" DROP COLUMN "storage_key";--> statement-breakpoint
ALTER TABLE "submissions" DROP COLUMN "checksum_sha256";--> statement-breakpoint
ALTER TABLE "submissions" DROP COLUMN "size_bytes";--> statement-breakpoint
ALTER TABLE "submissions" DROP COLUMN "mime_type";--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_enrolment_brief_attempt_uq" UNIQUE("enrolment_id","brief_id","attempt_no");--> statement-breakpoint
ALTER TABLE "practical_briefs" ADD CONSTRAINT "practical_briefs_max_attempts" CHECK ("practical_briefs"."max_attempts" BETWEEN 1 AND 10);--> statement-breakpoint
ALTER TABLE "practical_briefs" ADD CONSTRAINT "practical_briefs_published_at" CHECK (("practical_briefs"."status" = 'published') = ("practical_briefs"."published_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "assessment_schedules" ADD CONSTRAINT "assessment_schedules_one_target" CHECK (("assessment_schedules"."blueprint_id" IS NULL) <> ("assessment_schedules"."brief_id" IS NULL));--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_submitted_at" CHECK (("submissions"."status" = 'submitted') = ("submissions"."submitted_at" IS NOT NULL));