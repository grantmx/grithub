ALTER TABLE "discussion_threads" DROP CONSTRAINT "discussion_threads_section_id_sections_id_fk";
--> statement-breakpoint
ALTER TABLE "discussion_threads" DROP COLUMN "section_id";--> statement-breakpoint
ALTER TABLE "discussion_threads" DROP COLUMN "locked";