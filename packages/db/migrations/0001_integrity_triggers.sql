-- Integrity rules that plain CHECK constraints cannot express.
-- See packages/db/README.md ("Database-enforced rules") and docs/lms/domain-model.md.
-- Errors use SQLSTATE 23001 (restrict_violation) for "frozen evidence" and
-- 23514 (check_violation) for business-rule violations.

-- 1. Question versions are immutable once served -------------------------------

CREATE FUNCTION lms_question_version_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.first_served_at IS NOT NULL THEN
    RAISE EXCEPTION 'question_version % is immutable: it has been served to a learner; create a new version instead', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER question_versions_immutable
  BEFORE UPDATE OR DELETE ON question_versions
  FOR EACH ROW EXECUTE FUNCTION lms_question_version_immutable();
--> statement-breakpoint

-- Answer options of a served version are frozen too (insert, update, delete).
CREATE FUNCTION lms_answer_option_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  served timestamptz;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT first_served_at INTO served FROM question_versions WHERE id = OLD.question_version_id;
    IF served IS NOT NULL THEN
      RAISE EXCEPTION 'answer options of question_version % are immutable: it has been served', OLD.question_version_id
        USING ERRCODE = 'restrict_violation';
    END IF;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT first_served_at INTO served FROM question_versions WHERE id = NEW.question_version_id;
    IF served IS NOT NULL THEN
      RAISE EXCEPTION 'answer options of question_version % are immutable: it has been served', NEW.question_version_id
        USING ERRCODE = 'restrict_violation';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER answer_options_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON answer_options
  FOR EACH ROW EXECUTE FUNCTION lms_answer_option_immutable();
--> statement-breakpoint

-- Serving a version (inserting an attempt item) stamps first_served_at.
CREATE FUNCTION lms_mark_question_version_served() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE question_versions
     SET first_served_at = now()
   WHERE id = NEW.question_version_id
     AND first_served_at IS NULL;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER attempt_items_mark_served
  AFTER INSERT ON attempt_items
  FOR EACH ROW EXECUTE FUNCTION lms_mark_question_version_served();
--> statement-breakpoint

-- 2. Attempt items: what was served is frozen; only the response may change ---

CREATE FUNCTION lms_attempt_item_served_frozen() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'attempt_item % cannot be deleted: it is assessment evidence', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;
  IF (NEW.attempt_id, NEW.question_version_id, NEW.position, NEW.served_option_order, NEW.option_tokens, NEW.seed)
     IS DISTINCT FROM
     (OLD.attempt_id, OLD.question_version_id, OLD.position, OLD.served_option_order, OLD.option_tokens, OLD.seed) THEN
    RAISE EXCEPTION 'attempt_item %: served question, order, tokens and seed are immutable', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER attempt_items_served_frozen
  BEFORE UPDATE OR DELETE ON attempt_items
  FOR EACH ROW EXECUTE FUNCTION lms_attempt_item_served_frozen();
--> statement-breakpoint

-- 3. A moderator never moderates their own decision ---------------------------

CREATE FUNCTION lms_moderator_not_assessor() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM assessment_decisions d
              WHERE d.id = NEW.decision_id AND d.assessor_id = NEW.moderator_id) THEN
    RAISE EXCEPTION 'moderator % cannot moderate a decision they made as assessor', NEW.moderator_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER moderation_records_not_assessor
  BEFORE INSERT OR UPDATE ON moderation_records
  FOR EACH ROW EXECUTE FUNCTION lms_moderator_not_assessor();
--> statement-breakpoint

-- Moderation records are evidence: never updated or deleted.
CREATE FUNCTION lms_reject_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% on % is not allowed: the table is append-only', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER moderation_records_append_only
  BEFORE UPDATE OR DELETE ON moderation_records
  FOR EACH ROW EXECUTE FUNCTION lms_reject_change();
--> statement-breakpoint

-- 4. Assessment decisions: locked after moderation, released only by batch ----

CREATE FUNCTION lms_assessment_decision_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  batch_state batch_status;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'assessment_decision % cannot be deleted: supersede it with a new decision', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;

  SELECT status INTO batch_state FROM moderation_batches WHERE id = NEW.batch_id;

  IF TG_OP = 'INSERT' THEN
    IF batch_state = 'closed' THEN
      RAISE EXCEPTION 'moderation batch % is closed: no new decisions can be added', NEW.batch_id
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.released_at IS NOT NULL THEN
      RAISE EXCEPTION 'released_at is set only by closing the moderation batch'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NEW.released_at IS DISTINCT FROM OLD.released_at
     AND (batch_state IS DISTINCT FROM 'closed' OR OLD.released_at IS NOT NULL) THEN
    RAISE EXCEPTION 'released_at is set only by closing the moderation batch'
      USING ERRCODE = 'check_violation';
  END IF;

  IF (NEW.assessor_id, NEW.submission_id, NEW.attempt_id, NEW.batch_id, NEW.outcome,
      NEW.feedback, NEW.supersedes_id, NEW.decided_at)
     IS DISTINCT FROM
     (OLD.assessor_id, OLD.submission_id, OLD.attempt_id, OLD.batch_id, OLD.outcome,
      OLD.feedback, OLD.supersedes_id, OLD.decided_at) THEN
    IF EXISTS (SELECT 1 FROM moderation_records m WHERE m.decision_id = OLD.id) THEN
      RAISE EXCEPTION 'assessment_decision % is locked: it has been moderated', OLD.id
        USING ERRCODE = 'restrict_violation';
    END IF;
    IF batch_state = 'closed' THEN
      RAISE EXCEPTION 'assessment_decision % is locked: its batch is closed and released', OLD.id
        USING ERRCODE = 'restrict_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER assessment_decisions_guard
  BEFORE INSERT OR UPDATE OR DELETE ON assessment_decisions
  FOR EACH ROW EXECUTE FUNCTION lms_assessment_decision_guard();
--> statement-breakpoint

-- Closing a batch releases every decision in it; a closed batch never reopens.
CREATE FUNCTION lms_moderation_batch_close() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'closed' AND NEW.status = 'open' THEN
    RAISE EXCEPTION 'moderation batch % is closed and cannot be reopened', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;
  IF OLD.status = 'open' AND NEW.status = 'closed' THEN
    UPDATE assessment_decisions
       SET released_at = NEW.closed_at
     WHERE batch_id = NEW.id
       AND released_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER moderation_batches_close
  AFTER UPDATE OF status ON moderation_batches
  FOR EACH ROW EXECUTE FUNCTION lms_moderation_batch_close();
--> statement-breakpoint

-- 5. Audit log is append-only ---------------------------------------------------

CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION lms_reject_change();
--> statement-breakpoint
CREATE FUNCTION lms_reject_truncate() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'TRUNCATE on % is not allowed: the table is append-only', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_log_no_truncate
  BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION lms_reject_truncate();
