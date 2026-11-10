-- Least-privilege runtime role for apps/lms (docs/lms/dossier/05-security-controls.md).
--
-- Run ONCE per database, after `yarn workspace db db:migrate`, connected as the
-- role that OWNS the tables (the migration role), e.g.:
--   psql "$MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -f packages/db/sql/least-privilege.sql
-- Then set the password interactively (never in a file or commit):
--   \password lms_app
-- and put the lms_app connection string in Vercel as DATABASE_URL.
-- Migrations keep using the owner role (MIGRATION_DATABASE_URL, never in Vercel).
-- Safe to re-run: it re-applies the grants, including for tables added since.
--
-- What lms_app can do: read and write rows (SELECT, INSERT, UPDATE, DELETE) and
-- use sequences. What it cannot do: create, alter or drop anything (no DDL), TRUNCATE,
-- add triggers or references, create roles or databases, bypass row security,
-- or change rows in the append-only evidence tables below (also blocked by triggers).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lms_app') THEN
    CREATE ROLE lms_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
      CONNECTION LIMIT 50;
  END IF;
END $$;

-- Re-assert the attributes in case the role was created elsewhere with more.
ALTER ROLE lms_app NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
-- Long-running or idle sessions are cut off (serverless functions never need more).
ALTER ROLE lms_app SET statement_timeout = '60s';
ALTER ROLE lms_app SET idle_in_transaction_session_timeout = '30s';

DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO lms_app', current_database());
END $$;

-- Nobody but the owner may create objects in the schema.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM lms_app;
GRANT USAGE ON SCHEMA public TO lms_app;

-- Start clean, then grant row-level DML only.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM lms_app;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO lms_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO lms_app;

-- Append-only evidence: insert and read only (defence in depth behind the triggers).
REVOKE UPDATE, DELETE ON
  audit_log,
  consent_records,
  message_revisions,
  moderation_action_completions,
  moderation_records,
  paper_unlocks,
  register_signoffs
FROM lms_app;

-- Tables and sequences created by future migrations (run as this owner) get the same DML grants.
-- Re-run this script after a migration that adds an append-only table.
DO $$
BEGIN
  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO lms_app',
    current_user);
  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO lms_app',
    current_user);
END $$;
