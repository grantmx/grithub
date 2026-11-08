CREATE TYPE "public"."library_resource_kind" AS ENUM('link', 'document');--> statement-breakpoint
CREATE TYPE "public"."text_size" AS ENUM('s', 'm', 'l', 'xl');--> statement-breakpoint
CREATE TYPE "public"."theme_preference" AS ENUM('system', 'light', 'dark');--> statement-breakpoint
CREATE TABLE "library_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"qualification_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"kind" "library_resource_kind" NOT NULL,
	"url" text,
	"storage_key" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "library_resources_link_is_https" CHECK ("library_resources"."kind" <> 'link' OR "library_resources"."url" ~ '^https://'),
	CONSTRAINT "library_resources_document_has_storage_key" CHECK ("library_resources"."kind" <> 'document' OR "library_resources"."storage_key" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "section_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrolment_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"first_viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scroll_percent" smallint DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "section_progress_enrolment_section_uq" UNIQUE("enrolment_id","section_id"),
	CONSTRAINT "section_progress_scroll_range" CHECK ("section_progress"."scroll_percent" BETWEEN 0 AND 100)
);
--> statement-breakpoint
ALTER TABLE "content_items" DROP CONSTRAINT "content_items_published_media_has_transcript";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "text_size" text_size DEFAULT 'm' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "theme" "theme_preference" DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "content_items" ADD COLUMN "media_playback_id" text;--> statement-breakpoint
ALTER TABLE "content_items" ADD COLUMN "media_size_bytes" bigint;--> statement-breakpoint
ALTER TABLE "content_items" ADD COLUMN "transcript_is_section_text" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "content_items" ADD COLUMN "captions_language" text;--> statement-breakpoint
ALTER TABLE "library_resources" ADD CONSTRAINT "library_resources_qualification_id_qualifications_id_fk" FOREIGN KEY ("qualification_id") REFERENCES "public"."qualifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_progress" ADD CONSTRAINT "section_progress_enrolment_id_enrolments_id_fk" FOREIGN KEY ("enrolment_id") REFERENCES "public"."enrolments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_progress" ADD CONSTRAINT "section_progress_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "library_resources_qualification_idx" ON "library_resources" USING btree ("qualification_id");--> statement-breakpoint
CREATE INDEX "section_progress_enrolment_viewed_idx" ON "section_progress" USING btree ("enrolment_id","last_viewed_at");--> statement-breakpoint
-- Existing published videos without captions go back to draft (never invent captions data).
UPDATE "content_items" SET "status" = 'draft' WHERE "kind" = 'video' AND "status" = 'published' AND "captions_language" IS NULL;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_published_video_has_captions" CHECK ("content_items"."kind" <> 'video' OR "content_items"."status" = 'draft' OR "content_items"."captions_language" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_media_size_positive" CHECK ("content_items"."media_size_bytes" IS NULL OR "content_items"."media_size_bytes" > 0);--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_published_media_has_transcript" CHECK ("content_items"."kind" NOT IN ('audio', 'video') OR "content_items"."status" = 'draft' OR "content_items"."transcript" IS NOT NULL OR "content_items"."transcript_is_section_text");