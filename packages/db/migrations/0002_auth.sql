CREATE TYPE "public"."auth_token_purpose" AS ENUM('invitation', 'magic_link', 'recovery');--> statement-breakpoint
CREATE TYPE "public"."session_auth_method" AS ENUM('passkey', 'magic_link', 'invitation', 'recovery');--> statement-breakpoint
CREATE TYPE "public"."webauthn_ceremony" AS ENUM('registration', 'authentication');--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" "auth_token_purpose" NOT NULL,
	"cohort_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "auth_tokens_token_hash_uq" UNIQUE("token_hash"),
	CONSTRAINT "auth_tokens_expiry_after_creation" CHECK ("auth_tokens"."expires_at" > "auth_tokens"."created_at")
);
--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"notice_version" text NOT NULL,
	"notice_sha256" text NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_hash" text,
	CONSTRAINT "consent_records_sha256_format" CHECK ("consent_records"."notice_sha256" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limit_buckets_count_nonneg" CHECK ("rate_limit_buckets"."count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" uuid NOT NULL,
	"auth_method" "session_auth_method" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"ip_hash" text,
	CONSTRAINT "sessions_token_hash_uq" UNIQUE("token_hash"),
	CONSTRAINT "sessions_expiry_after_creation" CHECK ("sessions"."expires_at" > "sessions"."created_at")
);
--> statement-breakpoint
CREATE TABLE "webauthn_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge" text NOT NULL,
	"ceremony" "webauthn_ceremony" NOT NULL,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	CONSTRAINT "webauthn_challenges_challenge_uq" UNIQUE("challenge"),
	CONSTRAINT "webauthn_challenges_registration_has_user" CHECK ("webauthn_challenges"."ceremony" <> 'registration' OR "webauthn_challenges"."user_id" IS NOT NULL)
);
--> statement-breakpoint
-- bytea -> base64url text (no passkeys exist yet; USING keeps the statement valid).
ALTER TABLE "passkey_credentials" ALTER COLUMN "credential_id" SET DATA TYPE text USING translate(rtrim(encode("credential_id", 'base64'), '='), '+/', '-_');--> statement-breakpoint
ALTER TABLE "passkey_credentials" ADD COLUMN "device_label" text DEFAULT 'Passkey' NOT NULL;--> statement-breakpoint
ALTER TABLE "passkey_credentials" ADD COLUMN "device_type" text;--> statement-breakpoint
ALTER TABLE "passkey_credentials" ADD COLUMN "backed_up" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "passkey_credentials" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webauthn_challenges" ADD CONSTRAINT "webauthn_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_tokens_user_purpose_idx" ON "auth_tokens" USING btree ("user_id","purpose");--> statement-breakpoint
CREATE INDEX "consent_records_user_idx" ON "consent_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "passkey_credentials" ADD CONSTRAINT "passkey_credentials_label_length" CHECK (char_length("passkey_credentials"."device_label") BETWEEN 1 AND 60);