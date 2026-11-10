CREATE TYPE "public"."backup_run_kind" AS ENUM('backup', 'restore_test', 'prune');--> statement-breakpoint
CREATE TYPE "public"."backup_run_status" AS ENUM('ok', 'failed');--> statement-breakpoint
CREATE TABLE "backup_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"kind" "backup_run_kind" NOT NULL,
	"status" "backup_run_status" NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"storage_pathname" text,
	"size_bytes" integer,
	"sha256" text,
	"table_count" integer,
	"row_count" integer,
	"notes" text DEFAULT '' NOT NULL,
	"recorded_by" uuid,
	"pruned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "backup_runs_sha256_format" CHECK ("backup_runs"."sha256" IS NULL OR "backup_runs"."sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "backup_runs_ok_backup_has_file" CHECK ("backup_runs"."kind" <> 'backup' OR "backup_runs"."status" <> 'ok' OR ("backup_runs"."storage_pathname" IS NOT NULL AND "backup_runs"."sha256" IS NOT NULL AND "backup_runs"."size_bytes" IS NOT NULL)),
	CONSTRAINT "backup_runs_restore_test_by_admin" CHECK ("backup_runs"."kind" <> 'restore_test' OR "backup_runs"."recorded_by" IS NOT NULL),
	CONSTRAINT "backup_runs_notes_length" CHECK (char_length("backup_runs"."notes") BETWEEN 0 AND 2000)
);
--> statement-breakpoint
CREATE TABLE "compliance_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"item_code" text NOT NULL,
	"title" text NOT NULL,
	"issuer" text DEFAULT '' NOT NULL,
	"location" text NOT NULL,
	"valid_until" date,
	"notes" text DEFAULT '' NOT NULL,
	"recorded_by" uuid NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "compliance_documents_item_code" CHECK ("compliance_documents"."item_code" ~ '^4\.[1-4]\.[0-9]{1,2}$'),
	CONSTRAINT "compliance_documents_title_length" CHECK (char_length("compliance_documents"."title") BETWEEN 1 AND 200),
	CONSTRAINT "compliance_documents_location_length" CHECK (char_length("compliance_documents"."location") BETWEEN 1 AND 300),
	CONSTRAINT "compliance_documents_notes_length" CHECK (char_length("compliance_documents"."notes") BETWEEN 0 AND 2000)
);
--> statement-breakpoint
CREATE TABLE "curriculum_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"qualification_id" uuid NOT NULL,
	"document_title" text NOT NULL,
	"curriculum_code" text NOT NULL,
	"version" text NOT NULL,
	"location" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"recorded_by" uuid NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "curriculum_references_title_length" CHECK (char_length("curriculum_references"."document_title") BETWEEN 1 AND 200),
	CONSTRAINT "curriculum_references_code_length" CHECK (char_length("curriculum_references"."curriculum_code") BETWEEN 1 AND 60),
	CONSTRAINT "curriculum_references_version_length" CHECK (char_length("curriculum_references"."version") BETWEEN 1 AND 40),
	CONSTRAINT "curriculum_references_location_length" CHECK (char_length("curriculum_references"."location") BETWEEN 1 AND 200),
	CONSTRAINT "curriculum_references_note_length" CHECK (char_length("curriculum_references"."note") BETWEEN 0 AND 1000)
);
--> statement-breakpoint
CREATE TABLE "learner_guides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"qualification_id" uuid NOT NULL,
	"title" text NOT NULL,
	"version" text NOT NULL,
	"issued_on" date NOT NULL,
	"storage_pathname" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learner_guides_sha256_format" CHECK ("learner_guides"."sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "learner_guides_size" CHECK ("learner_guides"."size_bytes" > 0),
	CONSTRAINT "learner_guides_title_length" CHECK (char_length("learner_guides"."title") BETWEEN 1 AND 200),
	CONSTRAINT "learner_guides_version_length" CHECK (char_length("learner_guides"."version") BETWEEN 1 AND 40)
);
--> statement-breakpoint
ALTER TABLE "backup_runs" ADD CONSTRAINT "backup_runs_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_documents" ADD CONSTRAINT "compliance_documents_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_references" ADD CONSTRAINT "curriculum_references_qualification_id_qualifications_id_fk" FOREIGN KEY ("qualification_id") REFERENCES "public"."qualifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_references" ADD CONSTRAINT "curriculum_references_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_guides" ADD CONSTRAINT "learner_guides_qualification_id_qualifications_id_fk" FOREIGN KEY ("qualification_id") REFERENCES "public"."qualifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_guides" ADD CONSTRAINT "learner_guides_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "backup_runs_kind_idx" ON "backup_runs" USING btree ("kind","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "compliance_documents_current_uq" ON "compliance_documents" USING btree (coalesce("tenant_id", '00000000-0000-4000-8000-000000000001'::uuid),"item_code") WHERE "compliance_documents"."archived_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_references_current_uq" ON "curriculum_references" USING btree (coalesce("tenant_id", '00000000-0000-4000-8000-000000000001'::uuid),"qualification_id") WHERE "curriculum_references"."archived_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "learner_guides_current_uq" ON "learner_guides" USING btree (coalesce("tenant_id", '00000000-0000-4000-8000-000000000001'::uuid),"qualification_id") WHERE "learner_guides"."archived_at" IS NULL;