-- QCTO reference code lists and integrity rules (docs/lms/compliance/qcto-leisa-mapping.md).
-- Codes and labels are from the QCTO "Data load specifications for SDPs and ACs"
-- (LEISA file), effective 1 June 2022. Labels are kept as QCTO wrote them.
-- 23001 (restrict_violation) = frozen evidence; 23514 (check_violation) = business rule.

-- 1. Reference data (GLOBAL tables, src/tenancy.ts) --------------------------

INSERT INTO qcto_alternative_id_types (code, label, sort_order) VALUES
  ('527', 'Passport Number or Foreign ID Number', 1),
  ('533', 'None', 2),
  ('565', 'Refugee Number', 3),
  ('538', 'Work Permit Number', 4),
  ('540', 'Birth Certificate number', 5),
  ('570', 'Change from Alternate ID to National ID', 6);
--> statement-breakpoint
INSERT INTO qcto_equity_codes (code, label, sort_order) VALUES
  ('BA', 'Black African', 1),
  ('BC', 'Coloured', 2),
  ('BI', 'Indian/Asian', 3),
  ('Wh', 'White', 4),
  ('Oth', 'Other', 5),
  ('U', 'Unknown', 6);
--> statement-breakpoint
INSERT INTO qcto_nationality_codes (code, label, sort_order) VALUES
  ('SA', 'South Africa', 1),
  ('SDC', 'SADC except SA', 2),
  ('NAM', 'Namibia', 3),
  ('BOT', 'Botswana', 4),
  ('ZIM', 'Zimbabwe', 5),
  ('ANG', 'Angola', 6),
  ('MOZ', 'Mozambique', 7),
  ('LES', 'Lesotho', 8),
  ('SWA', 'Swaziland', 9),
  ('MAL', 'Malawi', 10),
  ('ZAM', 'Zambia', 11),
  ('MAU', 'Mauritius', 12),
  ('TAN', 'Tanzania', 13),
  ('SEY', 'Seychelles', 14),
  ('ZAI', 'Zaire', 15),
  ('ROA', 'Rest of Africa', 16),
  ('EUR', 'European countries', 17),
  ('AIS', 'Asian countries', 18),
  ('NOR', 'North American countries', 19),
  ('SOU', 'Central and South American countries', 20),
  ('AUS', 'Australia Oceania countries', 21),
  ('OOC', 'Other and rest of Oceania', 22),
  ('NOT', 'N/A: Institution', 23),
  ('U', 'Unspecified', 24);
--> statement-breakpoint
INSERT INTO qcto_home_language_codes (code, label, sort_order) VALUES
  ('Afr', 'Afrikaans', 1),
  ('Eng', 'English', 2),
  ('Nde', 'isiNdebele', 3),
  ('Xho', 'isiXhosa', 4),
  ('Zul', 'isiZulu', 5),
  ('Sep', 'sePedi (Northern Sotho / Sesotho sa Lebowa)', 6),
  ('Ses', 'seSotho', 7),
  ('Set', 'seTswana', 8),
  ('Swa', 'siSwati', 9),
  ('Tsh', 'tshiVenda', 10),
  ('Xit', 'xiTsonga', 11),
  ('SASL', 'South African Sign Language', 12),
  ('Oth', 'Other', 13);
--> statement-breakpoint
INSERT INTO qcto_gender_codes (code, label, sort_order) VALUES
  ('M', 'Male', 1),
  ('F', 'Female', 2);
--> statement-breakpoint
INSERT INTO qcto_citizen_resident_status_codes (code, label, sort_order) VALUES
  ('SA', 'South Africa', 1),
  ('D', 'Dual (SA plus other)', 2),
  ('PR', 'Permanent Resident', 3),
  ('O', 'Other', 4),
  ('U', 'Unknown', 5);
--> statement-breakpoint
INSERT INTO qcto_socioeconomic_status_codes (code, label, sort_order) VALUES
  ('01', 'Employed', 1),
  ('02', 'Unemployed, looking for work', 2),
  ('03', 'Not working - not looking for work', 3),
  ('04', 'Home-maker (not working)', 4),
  ('06', 'Scholar/student (not working)', 5),
  ('07', 'Pensioner/retired (not working)', 6),
  ('08', 'Not working - disabled person', 7),
  ('09', 'Not working - not wishing to work', 8),
  ('10', 'Not working - not elsewhere classified', 9),
  ('97', 'N/A: Aged <15', 10),
  ('98', 'N/A: Institution', 11),
  ('U', 'Unspecified', 12);
--> statement-breakpoint
INSERT INTO qcto_disability_status_codes (code, label, sort_order) VALUES
  ('N', 'None', 1),
  ('01', 'Sight (even with glasses)', 2),
  ('02', 'Hearing (even with a hearing aid)', 3),
  ('03', 'Communication (talking, listening)', 4),
  ('04', 'Physical (moving, standing, grasping)', 5),
  ('05', 'Intellectual (difficulties in learning)', 6),
  ('06', 'Emotional (behavioural or psychological)', 7),
  ('07', 'Multiple', 8),
  ('09', 'Disabled but Unspecified', 9);
--> statement-breakpoint
INSERT INTO qcto_disability_rating_codes (code, label, sort_order) VALUES
  ('01', 'No difficulty', 1),
  ('02', 'Some difficulty', 2),
  ('03', 'A lot of difficulty', 3),
  ('04', 'Cannot do at all', 4),
  ('06', 'Cannot yet be determined', 5),
  ('60', 'May be part of multiple difficulties (TBC)', 6),
  ('70', 'May have difficulty (TBC)', 7),
  ('80', 'Former difficulty - none now', 8);
--> statement-breakpoint
INSERT INTO qcto_immigrant_status_codes (code, label, sort_order) VALUES
  ('01', 'Immigrant', 1),
  ('02', 'Refugee', 2),
  ('03', 'SA Citizen', 3);
--> statement-breakpoint
INSERT INTO qcto_learner_titles (code, label, sort_order) VALUES
  ('Mr', 'Mr', 1),
  ('Mrs', 'Mrs', 2),
  ('Ms', 'Ms', 3),
  ('Miss', 'Miss', 4),
  ('Dr', 'Dr', 5),
  ('Prof', 'Prof', 6);
--> statement-breakpoint
INSERT INTO qcto_province_codes (code, label, sort_order) VALUES
  ('1', 'Western Cape', 1),
  ('2', 'Eastern Cape', 2),
  ('3', 'Northern Cape', 3),
  ('4', 'Free State', 4),
  ('5', 'KwaZulu-Natal', 5),
  ('6', 'North West', 6),
  ('7', 'Gauteng', 7),
  ('8', 'Mpumalanga', 8),
  ('9', 'Limpopo', 9),
  ('N', 'SA National (in SA, province unspecified)', 10),
  ('X', 'Outside SA', 11);
--> statement-breakpoint
INSERT INTO qcto_sor_status_codes (code, label, sort_order) VALUES
  ('01', 'Statement of Results issued', 1),
  ('02', 'Statement of Results not yet issued', 2);
--> statement-breakpoint
INSERT INTO qcto_readiness_types (code, label, sort_order) VALUES
  ('1', 'Enrolled', 1),
  ('2', 'RPL for Access to EISA determined by SDP', 2),
  ('3', 'Mixed Mode to EISA', 3),
  ('4', 'SDP Training and assessment for readiness to EISA', 4),
  ('5', 'SDP e-learning training and assessment for readiness to EISA', 5),
  ('6', 'RPL for Access to EISA determined by Assessment Partner/Quality Partner', 6);
--> statement-breakpoint
INSERT INTO qcto_flc_codes (code, label, sort_order) VALUES
  ('01', 'FLC certificate (competent)', 1),
  ('02', 'RPL', 2),
  ('03', 'Grade 12/NCV Level 4 with Mathematics/Mathematical Literacy and English HL/FAL or First/Second Language pass', 3),
  ('04', 'Not yet competent', 4),
  ('05', 'FLC not completed yet', 5),
  ('06', 'Not applicable (qualification on NQF 5 and above)', 6),
  ('07', 'Enrolled for FLC', 7),
  ('08', 'N3 Mathematics and Business Language', 8);
--> statement-breakpoint

-- 2. Qualification accreditation sits inside the provider's accreditation ----

CREATE FUNCTION lms_qualification_accreditation_in_period() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  p provider_accreditations%ROWTYPE;
BEGIN
  SELECT * INTO p FROM provider_accreditations WHERE id = NEW.provider_accreditation_id;
  IF NEW.starts_on < p.starts_on OR NEW.ends_on > p.ends_on THEN
    RAISE EXCEPTION 'qualification accreditation % must fall inside the provider accreditation period', NEW.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER qualification_accreditations_in_period
  BEFORE INSERT OR UPDATE ON qualification_accreditations
  FOR EACH ROW EXECUTE FUNCTION lms_qualification_accreditation_in_period();
--> statement-breakpoint

CREATE FUNCTION lms_provider_accreditation_covers_qualifications() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM qualification_accreditations q
    WHERE q.provider_accreditation_id = NEW.id
      AND (q.starts_on < NEW.starts_on OR q.ends_on > NEW.ends_on)
  ) THEN
    RAISE EXCEPTION 'provider accreditation % would no longer cover its qualification accreditations', NEW.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER provider_accreditations_covers_qualifications
  BEFORE UPDATE OF starts_on, ends_on ON provider_accreditations
  FOR EACH ROW EXECUTE FUNCTION lms_provider_accreditation_covers_qualifications();
--> statement-breakpoint

-- 3. Enrolment QCTO record: SOR date vs EISA date, FLC 06 only for NQF 5+ ----

CREATE FUNCTION lms_enrolment_qcto_record_rules() RETURNS trigger
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
  IF NEW.flc_code = '06' AND nqf < 5 THEN
    RAISE EXCEPTION 'enrolment_qcto_record %: FLC 06 (not applicable) is only for NQF 5 and above', NEW.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER enrolment_qcto_records_rules
  BEFORE INSERT OR UPDATE ON enrolment_qcto_records
  FOR EACH ROW EXECUTE FUNCTION lms_enrolment_qcto_record_rules();
--> statement-breakpoint

CREATE FUNCTION lms_cohort_eisa_after_sor() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.eisa_on IS NOT NULL AND EXISTS (
    SELECT 1 FROM enrolment_qcto_records r
    JOIN enrolments e ON e.id = r.enrolment_id
    WHERE e.cohort_id = NEW.id AND r.sor_issued_on > NEW.eisa_on
  ) THEN
    RAISE EXCEPTION 'cohort %: the EISA date cannot be before an issued SOR date', NEW.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER cohorts_eisa_after_sor
  BEFORE UPDATE OF eisa_on ON cohorts
  FOR EACH ROW EXECUTE FUNCTION lms_cohort_eisa_after_sor();
--> statement-breakpoint

-- 4. LEISA submission batches: forward-only lifecycle, frozen once sent ------

CREATE FUNCTION lms_qcto_submission_batches_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'qcto_submission_batch %: only a draft can be deleted', OLD.id
        USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF (NEW.tenant_id, NEW.provider_accreditation_id, NEW.purpose, NEW.cohort_id, NEW.created_by)
     IS DISTINCT FROM
     (OLD.tenant_id, OLD.provider_accreditation_id, OLD.purpose, OLD.cohort_id, OLD.created_by) THEN
    RAISE EXCEPTION 'qcto_submission_batch %: provider, purpose, cohort and creator cannot change', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
       (OLD.status = 'draft' AND NEW.status = 'generated')
    OR (OLD.status = 'generated' AND NEW.status IN ('draft', 'submitted'))
    OR (OLD.status = 'submitted' AND NEW.status IN ('accepted', 'rejected'))
  ) THEN
    RAISE EXCEPTION 'qcto_submission_batch %: status cannot go from % to %', OLD.id, OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.status IN ('submitted', 'accepted', 'rejected') AND
     (NEW.file_name, NEW.file_date, NEW.storage_key, NEW.file_sha256, NEW.row_count,
      NEW.generated_at, NEW.generated_by, NEW.submitted_at, NEW.submitted_by)
     IS DISTINCT FROM
     (OLD.file_name, OLD.file_date, OLD.storage_key, OLD.file_sha256, OLD.row_count,
      OLD.generated_at, OLD.generated_by, OLD.submitted_at, OLD.submitted_by) THEN
    RAISE EXCEPTION 'qcto_submission_batch %: the file is frozen once submitted', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;

  IF OLD.status IN ('accepted', 'rejected') AND
     (NEW.responded_at, NEW.response_note) IS DISTINCT FROM (OLD.responded_at, OLD.response_note) THEN
    RAISE EXCEPTION 'qcto_submission_batch %: the QCTO response is final', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER qcto_submission_batches_guard
  BEFORE UPDATE OR DELETE ON qcto_submission_batches
  FOR EACH ROW EXECUTE FUNCTION lms_qcto_submission_batches_guard();
--> statement-breakpoint

CREATE FUNCTION lms_qcto_submission_items_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  b qcto_submission_batches%ROWTYPE;
  enrolment_cohort uuid;
BEGIN
  SELECT * INTO b FROM qcto_submission_batches
  WHERE id = CASE WHEN TG_OP = 'DELETE' THEN OLD.batch_id ELSE NEW.batch_id END;

  IF TG_OP IN ('INSERT', 'DELETE') THEN
    IF b.status <> 'draft' THEN
      RAISE EXCEPTION 'qcto_submission_batch %: rows can only be added or removed while it is a draft', b.id
        USING ERRCODE = 'restrict_violation';
    END IF;
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
  ELSE
    IF (NEW.tenant_id, NEW.batch_id, NEW.enrolment_id)
       IS DISTINCT FROM (OLD.tenant_id, OLD.batch_id, OLD.enrolment_id) THEN
      RAISE EXCEPTION 'qcto_submission_item %: batch and enrolment cannot change', OLD.id
        USING ERRCODE = 'restrict_violation';
    END IF;
    IF (NEW.row_number, NEW.row_sha256) IS DISTINCT FROM (OLD.row_number, OLD.row_sha256)
       AND b.status <> 'draft' THEN
      RAISE EXCEPTION 'qcto_submission_item %: the row is frozen once the file is generated', OLD.id
        USING ERRCODE = 'restrict_violation';
    END IF;
    IF (NEW.outcome, NEW.rejection_reason) IS DISTINCT FROM (OLD.outcome, OLD.rejection_reason)
       AND b.status NOT IN ('submitted', 'accepted', 'rejected') THEN
      RAISE EXCEPTION 'qcto_submission_item %: outcomes are recorded only after submission', OLD.id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF b.cohort_id IS NOT NULL THEN
    SELECT cohort_id INTO enrolment_cohort FROM enrolments WHERE id = NEW.enrolment_id;
    IF enrolment_cohort IS DISTINCT FROM b.cohort_id THEN
      RAISE EXCEPTION 'qcto_submission_item: enrolment % is not in the batch''s cohort', NEW.enrolment_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER qcto_submission_items_guard
  BEFORE INSERT OR UPDATE OR DELETE ON qcto_submission_items
  FOR EACH ROW EXECUTE FUNCTION lms_qcto_submission_items_guard();
