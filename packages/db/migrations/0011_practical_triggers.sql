-- Practical assessment integrity rules (Form 5 section 4.3; docs/lms/decisions.md ADR-013).
-- 23001 (restrict_violation) = frozen evidence; 23514 (check_violation) = business rule.

-- 1. A published brief is fixed (title may change); its criteria and variants too.

CREATE FUNCTION lms_brief_published_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'published' THEN
      RAISE EXCEPTION 'brief % is published and cannot be deleted', OLD.id
        USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'published' AND
     (NEW.module_id, NEW.curriculum_component_ref, NEW.instructions, NEW.assessment_criteria,
      NEW.mode, NEW.max_attempts, NEW.status, NEW.published_at)
     IS DISTINCT FROM
     (OLD.module_id, OLD.curriculum_component_ref, OLD.instructions, OLD.assessment_criteria,
      OLD.mode, OLD.max_attempts, OLD.status, OLD.published_at) THEN
    RAISE EXCEPTION 'brief % is published: create a new brief to change it', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER practical_briefs_published_guard
  BEFORE UPDATE OR DELETE ON practical_briefs
  FOR EACH ROW EXECUTE FUNCTION lms_brief_published_guard();
--> statement-breakpoint

-- Criteria and variants of a published brief cannot be added, changed or removed.
CREATE FUNCTION lms_brief_parts_locked() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  b uuid;
BEGIN
  b := CASE WHEN TG_OP = 'DELETE' THEN OLD.brief_id ELSE NEW.brief_id END;
  IF EXISTS (SELECT 1 FROM practical_briefs p WHERE p.id = b AND p.status = 'published')
     OR (TG_OP = 'UPDATE' AND EXISTS (
       SELECT 1 FROM practical_briefs p WHERE p.id = OLD.brief_id AND p.status = 'published')) THEN
    RAISE EXCEPTION 'brief % is published: its % cannot change', b, TG_TABLE_NAME
      USING ERRCODE = 'restrict_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER brief_criteria_locked
  BEFORE INSERT OR UPDATE OR DELETE ON brief_criteria
  FOR EACH ROW EXECUTE FUNCTION lms_brief_parts_locked();
--> statement-breakpoint
CREATE TRIGGER brief_variants_locked
  BEFORE INSERT OR UPDATE OR DELETE ON brief_variants
  FOR EACH ROW EXECUTE FUNCTION lms_brief_parts_locked();
--> statement-breakpoint

-- 2. Submissions: the assigned variant and seed never change; submitting is
--    one-way; a submitted submission is never deleted.

CREATE FUNCTION lms_submission_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'submission % cannot be deleted: it is assessment evidence', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;
  IF (NEW.enrolment_id, NEW.brief_id, NEW.brief_variant_id, NEW.attempt_no, NEW.seed, NEW.observed)
     IS DISTINCT FROM
     (OLD.enrolment_id, OLD.brief_id, OLD.brief_variant_id, OLD.attempt_no, OLD.seed, OLD.observed) THEN
    RAISE EXCEPTION 'submission %: the learner, brief, assigned variant and seed are immutable', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;
  IF OLD.status = 'submitted' THEN
    IF NEW.status <> 'submitted'
       OR (NEW.submitted_at, NEW.schedule_id, NEW.links_confirmed)
          IS DISTINCT FROM (OLD.submitted_at, OLD.schedule_id, OLD.links_confirmed) THEN
      RAISE EXCEPTION 'submission % has been submitted and cannot change', OLD.id
        USING ERRCODE = 'restrict_violation';
    END IF;
    IF NEW.observation_notes IS DISTINCT FROM OLD.observation_notes
       AND EXISTS (SELECT 1 FROM assessment_decisions d WHERE d.submission_id = OLD.id) THEN
      RAISE EXCEPTION 'submission %: observation notes are locked once a decision is recorded', OLD.id
        USING ERRCODE = 'restrict_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER submissions_guard
  BEFORE UPDATE OR DELETE ON submissions
  FOR EACH ROW EXECUTE FUNCTION lms_submission_guard();
--> statement-breakpoint

-- 3. Evidence: learner evidence freezes on submission; all evidence freezes
--    once a decision exists. Only the scan status may change afterwards.

CREATE FUNCTION lms_evidence_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  sub uuid;
  src evidence_source;
  sub_status submission_status;
BEGIN
  IF TG_OP = 'UPDATE'
     AND (NEW.submission_id, NEW.kind, NEW.source, NEW.added_by, NEW.storage_pathname, NEW.file_name,
          NEW.mime_type, NEW.size_bytes, NEW.checksum_sha256, NEW.link_url, NEW.link_host, NEW.created_at)
         IS NOT DISTINCT FROM
         (OLD.submission_id, OLD.kind, OLD.source, OLD.added_by, OLD.storage_pathname, OLD.file_name,
          OLD.mime_type, OLD.size_bytes, OLD.checksum_sha256, OLD.link_url, OLD.link_host, OLD.created_at) THEN
    RETURN NEW; -- scan status only
  END IF;
  sub := CASE WHEN TG_OP = 'DELETE' THEN OLD.submission_id ELSE NEW.submission_id END;
  src := CASE WHEN TG_OP = 'DELETE' THEN OLD.source ELSE NEW.source END;
  SELECT status INTO sub_status FROM submissions WHERE id = sub;
  IF EXISTS (SELECT 1 FROM assessment_decisions d WHERE d.submission_id = sub) THEN
    RAISE EXCEPTION 'evidence for submission % is locked once a decision is recorded', sub
      USING ERRCODE = 'restrict_violation';
  END IF;
  IF src = 'learner' AND sub_status = 'submitted' THEN
    RAISE EXCEPTION 'evidence for submission % cannot change after it is submitted', sub
      USING ERRCODE = 'restrict_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER evidence_items_guard
  BEFORE INSERT OR UPDATE OR DELETE ON evidence_items
  FOR EACH ROW EXECUTE FUNCTION lms_evidence_guard();
--> statement-breakpoint

-- 4. Criterion judgements: only on submitted work, only for the brief's own
--    criteria, and locked once a decision is recorded.

CREATE FUNCTION lms_criterion_judgement_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  sub uuid;
  s submissions%ROWTYPE;
BEGIN
  sub := CASE WHEN TG_OP = 'DELETE' THEN OLD.submission_id ELSE NEW.submission_id END;
  IF EXISTS (SELECT 1 FROM assessment_decisions d WHERE d.submission_id = sub) THEN
    RAISE EXCEPTION 'judgements for submission % are locked once a decision is recorded', sub
      USING ERRCODE = 'restrict_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  SELECT * INTO s FROM submissions WHERE id = sub;
  IF s.status <> 'submitted' THEN
    RAISE EXCEPTION 'submission % has not been submitted', sub USING ERRCODE = 'check_violation';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM brief_criteria c WHERE c.id = NEW.criterion_id AND c.brief_id = s.brief_id) THEN
    RAISE EXCEPTION 'criterion % does not belong to the submission''s brief', NEW.criterion_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER criterion_judgements_guard
  BEFORE INSERT OR UPDATE OR DELETE ON criterion_judgements
  FOR EACH ROW EXECUTE FUNCTION lms_criterion_judgement_guard();
--> statement-breakpoint

-- 5. A decision on a submission needs submitted work.

CREATE FUNCTION lms_decision_needs_submitted() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.submission_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM submissions s WHERE s.id = NEW.submission_id AND s.status = 'submitted') THEN
    RAISE EXCEPTION 'submission % has not been submitted', NEW.submission_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER assessment_decisions_needs_submitted
  BEFORE INSERT ON assessment_decisions
  FOR EACH ROW EXECUTE FUNCTION lms_decision_needs_submitted();
