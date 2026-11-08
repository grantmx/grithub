-- FLC code 06 ("Not applicable, NQF 5 and above") is used exactly when the
-- qualification is NQF 5+ (docs/lms/compliance/qcto-leisa-mapping.md, column AO).
-- 0009 only stopped 06 below NQF 5; this also requires 06 at NQF 5+.

CREATE OR REPLACE FUNCTION lms_enrolment_qcto_record_rules() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  eisa date;
  nqf smallint;
BEGIN
  SELECT c.eisa_on, q.nqf_level INTO eisa, nqf
  FROM enrolments e
  JOIN cohorts c ON c.id = e.cohort_id
  JOIN qualifications q ON q.id = c.qualification_id
  WHERE e.id = NEW.enrolment_id;

  IF NEW.sor_issued_on IS NOT NULL AND eisa IS NOT NULL AND NEW.sor_issued_on > eisa THEN
    RAISE EXCEPTION 'enrolment_qcto_record %: the SOR issue date cannot be after the EISA date', NEW.id
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.flc_code IS NOT NULL AND (NEW.flc_code = '06') <> (nqf >= 5) THEN
    RAISE EXCEPTION 'enrolment_qcto_record %: FLC 06 (not applicable) is used exactly when the qualification is NQF 5 or above', NEW.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE FUNCTION lms_qualification_nqf_flc() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM enrolment_qcto_records r
    JOIN enrolments e ON e.id = r.enrolment_id
    JOIN cohorts c ON c.id = e.cohort_id
    WHERE c.qualification_id = NEW.id
      AND r.flc_code IS NOT NULL
      AND (r.flc_code = '06') <> (NEW.nqf_level >= 5)
  ) THEN
    RAISE EXCEPTION 'qualification %: changing the NQF level would contradict recorded FLC codes', NEW.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER qualifications_nqf_flc
  BEFORE UPDATE OF nqf_level ON qualifications
  FOR EACH ROW EXECUTE FUNCTION lms_qualification_nqf_flc();
