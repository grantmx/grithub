-- Moderation sampling and release rules (design.md §14, 2026-11-08;
-- Form 5 sections 4.2.5 and 4.3.5).
--
-- The moderator picks the sample; the cohort's rate sets its minimum size.
-- A batch closes (and releases every result in it) only when the minimum is
-- met and every sampled learner's current decision is agreed, with any
-- required actions marked done by the assessor.

-- 1. The current (not superseded) decision for one learner's work in a batch.

CREATE FUNCTION lms_current_decision(batch uuid, attempt uuid, submission uuid) RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT d.id
    FROM assessment_decisions d
   WHERE d.batch_id = batch
     AND (d.attempt_id IS NOT DISTINCT FROM attempt)
     AND (d.submission_id IS NOT DISTINCT FROM submission)
     AND NOT EXISTS (SELECT 1 FROM assessment_decisions n WHERE n.supersedes_id = d.id)
   LIMIT 1
$$;
--> statement-breakpoint

-- 2. Sample items: only while the batch is open, only for work decided in the
--    batch, never edited, and never removed once moderated or when added for
--    an appeal reassessment.

CREATE FUNCTION lms_sample_item_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  r moderation_sample_items%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'moderation sample item % cannot be changed', OLD.id USING ERRCODE = 'restrict_violation';
  END IF;
  r := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  IF NOT EXISTS (SELECT 1 FROM moderation_batches b WHERE b.id = r.batch_id AND b.status = 'open') THEN
    RAISE EXCEPTION 'moderation batch % is closed: its sample is final', r.batch_id
      USING ERRCODE = 'restrict_violation';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF lms_current_decision(r.batch_id, r.attempt_id, r.submission_id) IS NULL THEN
      RAISE EXCEPTION 'only work with a decision in the batch can be sampled' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.reason = 'reassessment' THEN
    RAISE EXCEPTION 'appeal reassessments are always moderated' USING ERRCODE = 'restrict_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM moderation_records m
               JOIN assessment_decisions d ON d.id = m.decision_id
              WHERE d.batch_id = OLD.batch_id
                AND (d.attempt_id IS NOT DISTINCT FROM OLD.attempt_id)
                AND (d.submission_id IS NOT DISTINCT FROM OLD.submission_id)) THEN
    RAISE EXCEPTION 'moderated work cannot be removed from the sample' USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN OLD;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER moderation_sample_items_guard
  BEFORE INSERT OR UPDATE OR DELETE ON moderation_sample_items
  FOR EACH ROW EXECUTE FUNCTION lms_sample_item_guard();
--> statement-breakpoint

-- 3. A moderation verdict is recorded only on the current decision of sampled
--    work, while the batch is open.

CREATE FUNCTION lms_moderation_record_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  d assessment_decisions%ROWTYPE;
BEGIN
  SELECT * INTO d FROM assessment_decisions WHERE id = NEW.decision_id;
  IF NOT EXISTS (SELECT 1 FROM moderation_batches b WHERE b.id = d.batch_id AND b.status = 'open') THEN
    RAISE EXCEPTION 'moderation batch % is closed', d.batch_id USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM assessment_decisions n WHERE n.supersedes_id = d.id) THEN
    RAISE EXCEPTION 'decision % has been superseded: moderate the current decision', d.id
      USING ERRCODE = 'check_violation';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM moderation_sample_items s
                  WHERE s.batch_id = d.batch_id
                    AND (s.attempt_id IS NOT DISTINCT FROM d.attempt_id)
                    AND (s.submission_id IS NOT DISTINCT FROM d.submission_id)) THEN
    RAISE EXCEPTION 'add the learner to the sample before moderating' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER moderation_records_guard
  BEFORE INSERT ON moderation_records
  FOR EACH ROW EXECUTE FUNCTION lms_moderation_record_guard();
--> statement-breakpoint

-- 4. "Actions done": only by the decision's assessor, only for an Agree with
--    actions verdict, while the batch is open. Append-only.

CREATE FUNCTION lms_action_completion_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  m moderation_records%ROWTYPE;
  d assessment_decisions%ROWTYPE;
BEGIN
  SELECT * INTO m FROM moderation_records WHERE id = NEW.moderation_record_id;
  SELECT * INTO d FROM assessment_decisions WHERE id = m.decision_id;
  IF m.outcome <> 'upheld' OR m.required_actions IS NULL THEN
    RAISE EXCEPTION 'moderation record % has no required actions', m.id USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.done_by IS DISTINCT FROM d.assessor_id THEN
    RAISE EXCEPTION 'only the assessor who made the decision can mark its actions done'
      USING ERRCODE = 'check_violation';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM moderation_batches b WHERE b.id = d.batch_id AND b.status = 'open') THEN
    RAISE EXCEPTION 'moderation batch % is closed', d.batch_id USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER moderation_action_completions_guard
  BEFORE INSERT ON moderation_action_completions
  FOR EACH ROW EXECUTE FUNCTION lms_action_completion_guard();
--> statement-breakpoint
CREATE TRIGGER moderation_action_completions_append_only
  BEFORE UPDATE OR DELETE ON moderation_action_completions
  FOR EACH ROW EXECUTE FUNCTION lms_reject_change();
--> statement-breakpoint

-- 5. Closing a batch needs a complete sample: at least the cohort's rate
--    (rounded up) of the batch's learners, and every sampled learner's current
--    decision agreed (with any required actions done).

CREATE FUNCTION lms_moderation_batch_close_gate() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  decided integer;
  sampled integer;
  rate integer;
  minimum integer;
  pending integer;
BEGIN
  IF NOT (OLD.status = 'open' AND NEW.status = 'closed') THEN
    RETURN NEW;
  END IF;
  SELECT count(*) INTO decided
    FROM assessment_decisions d
   WHERE d.batch_id = NEW.id
     AND NOT EXISTS (SELECT 1 FROM assessment_decisions n WHERE n.supersedes_id = d.id);
  IF decided = 0 THEN
    RETURN NEW;
  END IF;
  SELECT c.moderation_rate_percent INTO rate FROM cohorts c WHERE c.id = NEW.cohort_id;
  minimum := ceil(rate * decided / 100.0);
  SELECT count(*) INTO sampled FROM moderation_sample_items s WHERE s.batch_id = NEW.id;
  IF sampled < minimum THEN
    RAISE EXCEPTION 'moderation batch %: sample % of minimum %', NEW.id, sampled, minimum
      USING ERRCODE = 'check_violation';
  END IF;
  SELECT count(*) INTO pending
    FROM moderation_sample_items s
   WHERE s.batch_id = NEW.id
     AND NOT EXISTS (
       SELECT 1 FROM moderation_records m
        WHERE m.decision_id = lms_current_decision(s.batch_id, s.attempt_id, s.submission_id)
          AND m.outcome = 'upheld'
          AND (m.required_actions IS NULL
               OR EXISTS (SELECT 1 FROM moderation_action_completions c WHERE c.moderation_record_id = m.id)));
  IF pending > 0 THEN
    RAISE EXCEPTION 'moderation batch %: % sampled decision(s) not agreed yet', NEW.id, pending
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER moderation_batches_close_gate
  BEFORE UPDATE OF status ON moderation_batches
  FOR EACH ROW EXECUTE FUNCTION lms_moderation_batch_close_gate();
--> statement-breakpoint

-- 6. Backfill: work already moderated in open batches is part of the sample.

INSERT INTO moderation_sample_items (batch_id, attempt_id, submission_id, reason, added_by, added_at)
SELECT DISTINCT ON (d.batch_id, d.attempt_id, d.submission_id)
       d.batch_id, d.attempt_id, d.submission_id, 'moderator', m.moderator_id, m.moderated_at
  FROM moderation_records m
  JOIN assessment_decisions d ON d.id = m.decision_id
  JOIN moderation_batches b ON b.id = d.batch_id
 WHERE b.status = 'open'
 ORDER BY d.batch_id, d.attempt_id, d.submission_id, m.moderated_at
ON CONFLICT DO NOTHING;
