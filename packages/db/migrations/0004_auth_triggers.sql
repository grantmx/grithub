-- Auth integrity rules. See packages/db/README.md ("Database-enforced rules").

-- POPIA consent records are evidence: append-only.
CREATE TRIGGER consent_records_append_only
  BEFORE UPDATE OR DELETE ON consent_records
  FOR EACH ROW EXECUTE FUNCTION lms_reject_change();
--> statement-breakpoint

-- Single-use tokens and challenges: once used (or revoked) they stay that way.
CREATE FUNCTION lms_single_use_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.used_at IS NOT NULL AND NEW.used_at IS DISTINCT FROM OLD.used_at THEN
    RAISE EXCEPTION '%: used_at cannot change once set (single use)', TG_TABLE_NAME
      USING ERRCODE = 'restrict_violation';
  END IF;
  -- Nested IF: PL/pgSQL resolves OLD.revoked_at even inside an AND, and
  -- webauthn_challenges has no revoked_at column.
  IF TG_TABLE_NAME = 'auth_tokens' THEN
    IF OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at THEN
      RAISE EXCEPTION 'auth_tokens: revoked_at cannot change once set'
        USING ERRCODE = 'restrict_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER auth_tokens_single_use
  BEFORE UPDATE ON auth_tokens
  FOR EACH ROW EXECUTE FUNCTION lms_single_use_guard();
--> statement-breakpoint
CREATE TRIGGER webauthn_challenges_single_use
  BEFORE UPDATE ON webauthn_challenges
  FOR EACH ROW EXECUTE FUNCTION lms_single_use_guard();
--> statement-breakpoint

-- A revoked passkey can never be un-revoked (register a new one instead).
CREATE FUNCTION lms_passkey_revocation_final() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at THEN
    RAISE EXCEPTION 'passkey % is revoked and cannot be restored', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER passkey_credentials_revocation_final
  BEFORE UPDATE ON passkey_credentials
  FOR EACH ROW EXECUTE FUNCTION lms_passkey_revocation_final();
