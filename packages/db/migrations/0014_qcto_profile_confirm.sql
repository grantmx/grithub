ALTER TABLE "learner_qcto_profiles" ADD COLUMN "confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "statssa_area_codes" ADD COLUMN "town" text NOT NULL;--> statement-breakpoint
ALTER TABLE "statssa_area_codes" ADD COLUMN "local_municipality" text NOT NULL;--> statement-breakpoint
CREATE INDEX "statssa_area_codes_province_idx" ON "statssa_area_codes" USING btree ("province_code");