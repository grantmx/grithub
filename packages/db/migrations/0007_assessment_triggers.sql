-- Assessment engine integrity rules (docs/lms/randomization.md, design.md).
-- 23001 (restrict_violation) = frozen evidence; 23514 (check_violation) = business rule.

-- 1. Rubric criteria are frozen with their question version once it is served --

CREATE FUNCTION lms_rubric_criteria_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  served timestamptz;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT first_served_at INTO served FROM question_versions WHERE id = OLD.question_version_id;
    IF served IS NOT NULL THEN
      RAISE EXCEPTION 'rubric of question_version % is immutable: it has been served', OLD.question_version_id
        USING ERRCODE = 'restrict_violation';
    END IF;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT first_served_at INTO served FROM question_versions WHERE id = NEW.question_version_id;
    IF served IS NOT NULL THEN
      RAISE EXCEPTION 'rubric of question_version % is immutable: it has been served', NEW.question_version_id
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
CREATE TRIGGER rubric_criteria_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON rubric_criteria
  FOR EACH ROW EXECUTE FUNCTION lms_rubric_criteria_immutable();
--> statement-breakpoint

-- 2. Responses freeze when the attempt is submitted; marks freeze at decision --

CREATE FUNCTION lms_attempt_item_response_frozen() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  attempt_state attempt_status;
BEGIN
  SELECT status INTO attempt_state FROM assessment_attempts WHERE id = OLD.attempt_id;
  IF attempt_state IS DISTINCT FROM 'in_progress' THEN
    IF (NEW.response_option_ids, NEW.response_text, NEW.answered_at, NEW.flagged)
       IS DISTINCT FROM
       (OLD.response_option_ids, OLD.response_text, OLD.answered_at, OLD.flagged) THEN
      RAISE EXCEPTION 'attempt_item %: the response cannot change after the attempt is submitted', OLD.id
        USING ERRCODE = 'restrict_violation';
    END IF;
    IF OLD.is_correct IS NOT NULL AND NEW.is_correct IS DISTINCT FROM OLD.is_correct THEN
      RAISE EXCEPTION 'attempt_item %: grading cannot change after the attempt is submitted', OLD.id
        USING ERRCODE = 'restrict_violation';
    END IF;
  END IF;
  IF (NEW.marks_awarded, NEW.marker_note) IS DISTINCT FROM (OLD.marks_awarded, OLD.marker_note)
     AND EXISTS (SELECT 1 FROM assessment_decisions d WHERE d.attempt_id = OLD.attempt_id) THEN
    RAISE EXCEPTION 'attempt_item %: marks are locked once a decision has been recorded', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER attempt_items_response_frozen
  BEFORE UPDATE ON attempt_items
  FOR EACH ROW EXECUTE FUNCTION lms_attempt_item_response_frozen();
--> statement-breakpoint

-- 3. Rubric marks: within the criterion's range, for the served version, and
--    locked once a decision is recorded for the attempt.

CREATE FUNCTION lms_item_marks_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  item_id uuid;
  attempt uuid;
  served_version uuid;
  crit_version uuid;
  crit_max integer;
BEGIN
  item_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.attempt_item_id ELSE NEW.attempt_item_id END;
  SELECT attempt_id, question_version_id INTO attempt, served_version FROM attempt_items WHERE id = item_id;
  IF EXISTS (SELECT 1 FROM assessment_decisions d WHERE d.attempt_id = attempt) THEN
    RAISE EXCEPTION 'marks for attempt % are locked once a decision has been recorded', attempt
      USING ERRCODE = 'restrict_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  SELECT question_version_id, max_marks INTO crit_version, crit_max FROM rubric_criteria WHERE id = NEW.criterion_id;
  IF crit_version IS DISTINCT FROM served_version THEN
    RAISE EXCEPTION 'criterion % does not belong to the served question version', NEW.criterion_id
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.marks > crit_max THEN
    RAISE EXCEPTION 'marks % exceed the criterion maximum %', NEW.marks, crit_max
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER item_marks_guard
  BEFORE INSERT OR UPDATE OR DELETE ON item_marks
  FOR EACH ROW EXECUTE FUNCTION lms_item_marks_guard();
--> statement-breakpoint

-- 4. Decisions are final once recorded: a change is a new decision that
--    supersedes the old one (same attempt or submission). Only closing the
--    batch may set released_at. Replaces the earlier "editable until moderated" rule.

CREATE OR REPLACE FUNCTION lms_assessment_decision_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  batch_state batch_status;
  prev assessment_decisions%ROWTYPE;
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
    IF NEW.supersedes_id IS NOT NULL THEN
      SELECT * INTO prev FROM assessment_decisions WHERE id = NEW.supersedes_id;
      IF (prev.attempt_id, prev.submission_id) IS DISTINCT FROM (NEW.attempt_id, NEW.submission_id) THEN
        RAISE EXCEPTION 'a new decision version must be for the same attempt or submission'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: only released_at, and only by closing the batch.
  IF (NEW.assessor_id, NEW.submission_id, NEW.attempt_id, NEW.batch_id, NEW.outcome,
      NEW.feedback, NEW.supersedes_id, NEW.decided_at)
     IS DISTINCT FROM
     (OLD.assessor_id, OLD.submission_id, OLD.attempt_id, OLD.batch_id, OLD.outcome,
      OLD.feedback, OLD.supersedes_id, OLD.decided_at) THEN
    RAISE EXCEPTION 'assessment_decision % is final: record a new decision that supersedes it', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;
  IF NEW.released_at IS DISTINCT FROM OLD.released_at
     AND (batch_state IS DISTINCT FROM 'closed' OR OLD.released_at IS NOT NULL) THEN
    RAISE EXCEPTION 'released_at is set only by closing the moderation batch'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

-- 5. Appeals: only against released decisions, decided once by a moderator
--    who did not make the decision.

CREATE FUNCTION lms_appeal_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  d assessment_decisions%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'appeal % cannot be deleted', OLD.id USING ERRCODE = 'restrict_violation';
  END IF;
  SELECT * INTO d FROM assessment_decisions WHERE id = NEW.decision_id;
  IF TG_OP = 'INSERT' THEN
    IF d.released_at IS NULL THEN
      RAISE EXCEPTION 'only released decisions can be appealed' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.status <> 'open' THEN
      RAISE EXCEPTION 'a new appeal must be open' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.status <> 'open' THEN
    RAISE EXCEPTION 'appeal % has been decided and is final', OLD.id USING ERRCODE = 'restrict_violation';
  END IF;
  IF (NEW.decision_id, NEW.enrolment_id, NEW.reason, NEW.submitted_at)
     IS DISTINCT FROM (OLD.decision_id, OLD.enrolment_id, OLD.reason, OLD.submitted_at) THEN
    RAISE EXCEPTION 'appeal %: only the outcome can be recorded', OLD.id USING ERRCODE = 'restrict_violation';
  END IF;
  IF NEW.decided_by = d.assessor_id THEN
    RAISE EXCEPTION 'the assessor who made the decision cannot decide its appeal'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER appeals_guard
  BEFORE INSERT OR UPDATE OR DELETE ON appeals
  FOR EACH ROW EXECUTE FUNCTION lms_appeal_guard();
--> statement-breakpoint

-- 6. A signed-off register is final; unlocks and sign-offs are append-only ----

CREATE FUNCTION lms_attendance_signed_off() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  day_id uuid;
BEGIN
  day_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.assessment_day_id ELSE NEW.assessment_day_id END;
  IF EXISTS (SELECT 1 FROM register_signoffs r WHERE r.assessment_day_id = day_id) THEN
    RAISE EXCEPTION 'the register for assessment day % is signed off and cannot change', day_id
      USING ERRCODE = 'restrict_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER attendance_records_signed_off
  BEFORE INSERT OR UPDATE OR DELETE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION lms_attendance_signed_off();
--> statement-breakpoint
CREATE TRIGGER register_signoffs_append_only
  BEFORE UPDATE OR DELETE ON register_signoffs
  FOR EACH ROW EXECUTE FUNCTION lms_reject_change();
--> statement-breakpoint
CREATE TRIGGER paper_unlocks_append_only
  BEFORE UPDATE OR DELETE ON paper_unlocks
  FOR EACH ROW EXECUTE FUNCTION lms_reject_change();
--> statement-breakpoint

-- 7. A published blueprint is fixed: its rules and settings cannot change
--    (the title can), and it cannot return to draft. Changes = a new blueprint.

CREATE FUNCTION lms_blueprint_published_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'published' THEN
      RAISE EXCEPTION 'blueprint % is published and cannot be deleted', OLD.id
        USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'published' AND
     (NEW.module_id, NEW.kind, NEW.max_attempts, NEW.time_limit_minutes, NEW.pass_mark_percent,
      NEW.in_person_only, NEW.show_answers, NEW.status, NEW.published_at)
     IS DISTINCT FROM
     (OLD.module_id, OLD.kind, OLD.max_attempts, OLD.time_limit_minutes, OLD.pass_mark_percent,
      OLD.in_person_only, OLD.show_answers, OLD.status, OLD.published_at) THEN
    RAISE EXCEPTION 'blueprint % is published: create a new blueprint to change it', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER assessment_blueprints_published_guard
  BEFORE UPDATE OR DELETE ON assessment_blueprints
  FOR EACH ROW EXECUTE FUNCTION lms_blueprint_published_guard();
--> statement-breakpoint

CREATE FUNCTION lms_blueprint_rules_locked() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  bp uuid;
BEGIN
  bp := CASE WHEN TG_OP = 'DELETE' THEN OLD.blueprint_id ELSE NEW.blueprint_id END;
  IF EXISTS (SELECT 1 FROM assessment_blueprints b WHERE b.id = bp AND b.status = 'published')
     OR (TG_OP = 'UPDATE' AND EXISTS (
       SELECT 1 FROM assessment_blueprints b WHERE b.id = OLD.blueprint_id AND b.status = 'published')) THEN
    RAISE EXCEPTION 'blueprint % is published: its rules cannot change', bp
      USING ERRCODE = 'restrict_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER blueprint_rules_locked
  BEFORE INSERT OR UPDATE OR DELETE ON blueprint_rules
  FOR EACH ROW EXECUTE FUNCTION lms_blueprint_rules_locked();
