-- The new NOT NULL columns on discussion_threads and support_tickets assume
-- those tables are empty: no communication screens existed before this
-- migration (design.md §14, 2026-11-08).

CREATE TYPE "public"."comms_target" AS ENUM('discussion_post', 'direct_message');--> statement-breakpoint
CREATE TYPE "public"."email_frequency" AS ENUM('instant', 'digest', 'off');--> statement-breakpoint
CREATE TYPE "public"."notification_kind" AS ENUM('announcement', 'discussion', 'message', 'ticket', 'session');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('offensive', 'harassment', 'spam', 'personal_info', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'hidden', 'dismissed');--> statement-breakpoint
CREATE TABLE "content_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"cohort_id" uuid NOT NULL,
	"target_type" "comms_target" NOT NULL,
	"target_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" "report_reason" NOT NULL,
	"note" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_reports_note_length" CHECK ("content_reports"."note" IS NULL OR char_length("content_reports"."note") <= 500),
	CONSTRAINT "content_reports_review_fields" CHECK (("content_reports"."status" = 'open') = ("content_reports"."reviewed_at" IS NULL) AND ("content_reports"."reviewed_at" IS NULL) = ("content_reports"."reviewed_by" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"cohort_id" uuid NOT NULL,
	"learner_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"staff_role" "staff_role" NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"learner_read_at" timestamp with time zone,
	"staff_read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversations_two_people" CHECK ("conversations"."learner_id" <> "conversations"."staff_id"),
	CONSTRAINT "conversations_staff_role" CHECK ("conversations"."staff_role" IN ('facilitator', 'assessor'))
);
--> statement-breakpoint
CREATE TABLE "direct_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"conversation_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"edited_at" timestamp with time zone,
	"hidden_at" timestamp with time zone,
	"hidden_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "direct_messages_body_length" CHECK (char_length("direct_messages"."body") BETWEEN 1 AND 5000),
	CONSTRAINT "direct_messages_hidden_fields" CHECK (("direct_messages"."hidden_at" IS NULL) = ("direct_messages"."hidden_by" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "email_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"announcements" "email_frequency" DEFAULT 'instant' NOT NULL,
	"discussions" "email_frequency" DEFAULT 'instant' NOT NULL,
	"messages" "email_frequency" DEFAULT 'instant' NOT NULL,
	"tickets" "email_frequency" DEFAULT 'instant' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"cohort_id" uuid NOT NULL,
	"module_id" uuid,
	"title" text NOT NULL,
	"details" text DEFAULT '' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"join_url" text NOT NULL,
	"recording_url" text,
	"recording_added_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"sequence" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "live_sessions_title_length" CHECK (char_length("live_sessions"."title") BETWEEN 1 AND 200),
	CONSTRAINT "live_sessions_details_length" CHECK (char_length("live_sessions"."details") BETWEEN 0 AND 2000),
	CONSTRAINT "live_sessions_times" CHECK ("live_sessions"."ends_at" > "live_sessions"."starts_at"),
	CONSTRAINT "live_sessions_recording_fields" CHECK (("live_sessions"."recording_url" IS NULL) = ("live_sessions"."recording_added_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "message_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"target_type" "comms_target" NOT NULL,
	"target_id" uuid NOT NULL,
	"body" text NOT NULL,
	"revised_by" uuid NOT NULL,
	"revised_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"user_id" uuid NOT NULL,
	"kind" "notification_kind" NOT NULL,
	"title" text NOT NULL,
	"link" text NOT NULL,
	"read_at" timestamp with time zone,
	"emailed_at" timestamp with time zone,
	"digest_pending" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_link_relative" CHECK ("notifications"."link" LIKE '/%' AND "notifications"."link" NOT LIKE '//%')
);
--> statement-breakpoint
CREATE TABLE "section_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"cohort_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"recording_url" text,
	"recording_label" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "section_notes_body_length" CHECK (char_length("section_notes"."body") BETWEEN 0 AND 5000),
	CONSTRAINT "section_notes_has_content" CHECK (char_length("section_notes"."body") > 0 OR "section_notes"."recording_url" IS NOT NULL),
	CONSTRAINT "section_notes_recording_label" CHECK ("section_notes"."recording_label" IS NULL OR ("section_notes"."recording_url" IS NOT NULL AND char_length("section_notes"."recording_label") BETWEEN 1 AND 120))
);
--> statement-breakpoint
CREATE TABLE "session_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"session_id" uuid NOT NULL,
	"enrolment_id" uuid NOT NULL,
	"status" "attendance_status" NOT NULL,
	"recorded_by" uuid NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"ticket_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_replies_body_length" CHECK (char_length("ticket_replies"."body") BETWEEN 1 AND 5000)
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001',
	"job" text NOT NULL,
	"run_key" text NOT NULL,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "discussion_threads_cohort_idx";--> statement-breakpoint
DROP INDEX "discussion_posts_thread_idx";--> statement-breakpoint
ALTER TABLE "announcements" ADD COLUMN "tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001';--> statement-breakpoint
ALTER TABLE "announcements" ADD COLUMN "pinned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD COLUMN "tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001';--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD COLUMN "edited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD COLUMN "hidden_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD COLUMN "hidden_by" uuid;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD COLUMN "tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001';--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD COLUMN "module_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD COLUMN "body" text NOT NULL;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD COLUMN "pinned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD COLUMN "last_post_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "tenant_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001';--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "cohort_id" uuid;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "first_response_due_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "resolve_due_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "first_responded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "resolved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "last_activity_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_learner_id_users_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_hidden_by_users_id_fk" FOREIGN KEY ("hidden_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_preferences" ADD CONSTRAINT "email_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_revisions" ADD CONSTRAINT "message_revisions_revised_by_users_id_fk" FOREIGN KEY ("revised_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_notes" ADD CONSTRAINT "section_notes_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_notes" ADD CONSTRAINT "section_notes_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_notes" ADD CONSTRAINT "section_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_attendance" ADD CONSTRAINT "session_attendance_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."live_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_attendance" ADD CONSTRAINT "session_attendance_enrolment_id_enrolments_id_fk" FOREIGN KEY ("enrolment_id") REFERENCES "public"."enrolments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_attendance" ADD CONSTRAINT "session_attendance_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_replies" ADD CONSTRAINT "ticket_replies_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_replies" ADD CONSTRAINT "ticket_replies_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_reports_tenant_reporter_target_uq" ON "content_reports" USING btree (coalesce("tenant_id", '00000000-0000-4000-8000-000000000001'::uuid),"reporter_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "content_reports_cohort_status_idx" ON "content_reports" USING btree ("cohort_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_tenant_pair_uq" ON "conversations" USING btree (coalesce("tenant_id", '00000000-0000-4000-8000-000000000001'::uuid),"cohort_id","learner_id","staff_id");--> statement-breakpoint
CREATE INDEX "conversations_staff_idx" ON "conversations" USING btree ("staff_id","last_message_at");--> statement-breakpoint
CREATE INDEX "conversations_learner_idx" ON "conversations" USING btree ("learner_id","last_message_at");--> statement-breakpoint
CREATE INDEX "direct_messages_conversation_idx" ON "direct_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "live_sessions_cohort_idx" ON "live_sessions" USING btree ("cohort_id","starts_at");--> statement-breakpoint
CREATE INDEX "message_revisions_target_idx" ON "message_revisions" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_digest_idx" ON "notifications" USING btree ("user_id") WHERE "notifications"."digest_pending";--> statement-breakpoint
CREATE INDEX "section_notes_cohort_section_idx" ON "section_notes" USING btree ("cohort_id","section_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_attendance_tenant_session_enrolment_uq" ON "session_attendance" USING btree (coalesce("tenant_id", '00000000-0000-4000-8000-000000000001'::uuid),"session_id","enrolment_id");--> statement-breakpoint
CREATE INDEX "ticket_replies_ticket_idx" ON "ticket_replies" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "job_runs_tenant_job_key_uq" ON "job_runs" USING btree (coalesce("tenant_id", '00000000-0000-4000-8000-000000000001'::uuid),"job","run_key");--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_parent_id_discussion_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."discussion_posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_hidden_by_users_id_fk" FOREIGN KEY ("hidden_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "announcements_one_pinned_per_cohort_uq" ON "announcements" USING btree ("cohort_id") WHERE "announcements"."pinned_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "discussion_threads_board_idx" ON "discussion_threads" USING btree ("cohort_id","module_id");--> statement-breakpoint
CREATE INDEX "support_tickets_raised_by_idx" ON "support_tickets" USING btree ("raised_by","last_activity_at");--> statement-breakpoint
CREATE INDEX "support_tickets_cohort_idx" ON "support_tickets" USING btree ("cohort_id","status");--> statement-breakpoint
CREATE INDEX "discussion_posts_thread_idx" ON "discussion_posts" USING btree ("thread_id","created_at");--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_title_length" CHECK (char_length("announcements"."title") BETWEEN 1 AND 200);--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_body_length" CHECK (char_length("announcements"."body") BETWEEN 1 AND 20000);--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_body_length" CHECK (char_length("discussion_posts"."body") BETWEEN 1 AND 5000);--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_hidden_fields" CHECK (("discussion_posts"."hidden_at" IS NULL) = ("discussion_posts"."hidden_by" IS NULL));--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_title_length" CHECK (char_length("discussion_threads"."title") BETWEEN 1 AND 200);--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_body_length" CHECK (char_length("discussion_threads"."body") BETWEEN 1 AND 5000);--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_subject_length" CHECK (char_length("support_tickets"."subject") BETWEEN 1 AND 200);--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_body_length" CHECK (char_length("support_tickets"."body") BETWEEN 1 AND 5000);--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_academic_has_cohort" CHECK ("support_tickets"."category" <> 'academic' OR "support_tickets"."cohort_id" IS NOT NULL);