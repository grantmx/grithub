# SOP-TRN-015: QCTO Enrolment and EISA Readiness Submission

| Field | Detail |
| --- | --- |
| **SOP code** | SOP-TRN-015 |
| **Department** | Training and Quality Assurance |
| **Process owner** | [TBC: role] |
| **Approved by** | [TBC: per the Delegation of Authority, with the Information Officer] |
| **Version** | 0.1 (DRAFT - owner to review) |
| **Review cycle** | Annually, and whenever the QCTO issues a new template or specification |
| **Related policies** | [QCTO Quality Assurance](/policies/qcto-quality-assurance-policies), [POPIA Policy](/policies/popia-policy) |
| **Specification** | QCTO learner enrolment and EISA readiness (LEISA) template and Data Load Specifications: [LMS mapping, file rules and decisions](https://github.com/grantmx/grithub/blob/main/docs/lms/compliance/qcto-leisa-mapping.md) |

> [!IMPORTANT]
>
> **DRAFT - owner to review.** The LMS already tracks what is due and checks learner data, and it records each submission batch. **The step that generates the Excel file in the LMS is not built yet**; until it is, the interim method in Part C, step 2 applies. Every item marked [TBC] must be completed by the process owner before the SOP is approved.

## 1. Purpose and scope

This SOP explains how GRIT Hub tells the QCTO which learners are enrolled on a qualification (stage 1) and which are ready for the External Integrated Summative Assessment, EISA (stage 2). It covers deadlines, checks, who sends the file, how it is sent, and how the QCTO's acknowledgement is recorded.

One submission batch covers **one cohort of one qualification**.

## 2. Roles and responsibilities

| Role | Responsibility |
| --- | --- |
| **Process owner** | Makes sure every deadline is met and approves each file before it is sent. |
| **SDP admin** (LMS role) | Prepares the batch, resolves validation errors, generates and sends the file, and records the QCTO's response. Only SDP admins can export learner data for the QCTO. [TBC: the organisational role that sends] |
| **Assessor** (LMS role) | Confirms which learners are ready for EISA, through their released results. |
| **Information Officer** | Approves how the file is sent and stored. |
| **Learner** | Keeps their profile correct ([SOP-TRN-014](/sops/training/sop-trn-014-learner-enrolment-data-collection)). |

## 3. Step-by-step operating procedure

### Part A: Deadlines

| Stage | What is sent | Deadline (QCTO template) | QCTO mailbox |
| --- | --- | --- | --- |
| **1. Learner enrolment** | Learner and enrolment details (columns A to AJ) and the date stamp | Within **21 days after the start date of training**. For a learner who joins late: 21 days after the later of the cohort start and their enrolment date, in a separate stage 1 batch. | `Learnerenrolments@qcto.org.za` |
| **2. EISA readiness** | Readiness details (columns AK to AP) added, learner details refreshed, and the date stamp | **At least 3 months before** the anticipated EISA date | `EISAreadiness@qcto.org.za` |

1. **Set the dates** (SDP admin): the cohort's start date when it is created, and the scheduled EISA date as soon as it is known. The QCTO panel warns when a cohort has no EISA date. [TBC: the EISA date has no LMS screen yet; record how it is entered]
2. **Watch the QCTO submissions panel weekly** (SDP admin). It shows enrolment submissions not yet sent, EISA readiness due, cohorts without an EISA date, accreditation warnings, incomplete profiles, validation errors and the last batch. [TBC: confirm weekly; diary the deadlines as well]

### Part B: Prepare and check (validation)

1. **Profiles complete and valid:** every learner in the batch has a confirmed profile with no validation errors ([SOP-TRN-014](/sops/training/sop-trn-014-learner-enrolment-data-collection)). The panel lists which fields fail, never the values.
2. **Accreditation:** GRIT Hub's accreditation and the qualification's accreditation must both be current. Any date in the file that falls outside either period is an error and blocks the file.
3. **Stage 2 extra checks:** each learner's readiness type, statement of results status and date (a results date only when the status says results were issued, and not after the EISA date), and foundational learning competence. Learners who left before stage 2 are left out, with the reason recorded (no personal details in the reason).
4. **Names with accents** are changed to plain letters in the file only (for example é to e), as the QCTO requires; the LMS keeps the correct spelling and lists every change for checking.
5. **Format rules:** the current QCTO Excel template only (never PDF or another format), both sheets with their exact names, every value entered as text, no columns moved or deleted, and the compiler details on the Instructions sheet filled in. File name: `LEISAyyyymmdd-` followed by GRIT Hub's name as on the accreditation letter (it may be shortened), where yyyymmdd is the date the file was updated.

### Part C: Generate, approve and send

1. **Generate the file** (SDP admin, signed in with a passkey). The LMS records the batch with the file's fingerprint (SHA-256), the number of rows, and who generated it and when. A generated batch can be returned to draft if something must be fixed.
2. **Interim method until the LMS export is built:** [TBC: how the file is compiled, by whom, on which device, and how temporary copies are deleted; must be approved by the Information Officer]
3. **Approve** (process owner): check the row count, the learners included and left out, and the report of changes, without opening individual records unnecessarily.
4. **Send the file** to the QCTO mailbox for the stage (Part A) from [TBC: the GRIT Hub mailbox used for QCTO submissions], with the cohort and stage in the subject line, never learner names. Before sending, check the file's fingerprint matches the batch record.
5. **Record the submission** in the LMS straight away: date sent, who sent it, and the mailbox used. The batch is now **frozen**: its file and rows can't change. A correction means a new batch ([SOP-TRN-016](/sops/training/sop-trn-016-correcting-learner-data-after-submission)).

> [!WARNING]
>
> The file contains identity numbers, race and disability. The current plan is to email it as an ordinary attachment, which the Information Officer has not yet accepted. [TBC: Information Officer decision; the safer options are the QCTO's own upload channel, if available, or an encrypted file with the password sent separately] Never send the file through WhatsApp, a personal mailbox or a file-sharing link, and never keep copies on personal devices.

### Part D: Record the QCTO's acknowledgement

1. **When the QCTO replies,** record in the LMS batch: the date of the reply, the QCTO's reference (if given), and whether the batch was **accepted** or **rejected**. Keep the reply email in [TBC: the QCTO correspondence folder]. Notes on the batch must not contain personal information.
2. **If no acknowledgement arrives** within [TBC] working days, follow up with the QCTO and record the follow-up date.
3. **If rejected,** fix the cause and send a new batch ([SOP-TRN-016](/sops/training/sop-trn-016-correcting-learner-data-after-submission)), keeping the rejected batch as the record.

## 4. Required forms, records and evidence

| Record | Kept by | Retention |
| --- | --- | --- |
| Submission batches: stage, cohort, status, file fingerprint, row count, generated by and at, sent by and at, mailbox | LMS | [TBC] |
| Per-learner row fingerprints (proof of what was sent, without the data) | LMS | [TBC] |
| The submitted file | LMS private storage | [TBC: delete after the QCTO has accepted it and the query period has passed] |
| QCTO replies and acknowledgement references | LMS batch record; [TBC: correspondence folder] | [TBC] |
| Exports and file access | LMS audit log | [TBC] |

## 5. Quality checks and approval points

- Before sending: zero validation errors, accreditation current, process owner approval recorded. [TBC: how approval is recorded]
- Stage 1 sent within 21 days; stage 2 sent at least 3 months before EISA. Checked by the process owner each month.
- Every sent batch has an acknowledgement recorded, or a follow-up.

## 6. Exceptions and escalation

| Situation | What to do |
| --- | --- |
| A deadline will be missed | Tell the process owner at once; contact the QCTO before the deadline if possible. [TBC] |
| Accreditation has expired or is about to | Stop: the file can't be generated. Escalate to management. |
| A learner's data can't be validated in time | Send the batch without that learner only with process owner approval; send them in a later batch. [TBC: confirm the QCTO accepts this] |
| The file was sent to the wrong address | Treat it as a possible breach: follow [SOP-DAT-001](/sops/data-protection/sop-dat-001-personal-information-incidents-and-requests). |

## 7. Related policies and regulatory requirements

- [QCTO Quality Assurance Policies and Procedures](/policies/qcto-quality-assurance-policies)
- [POPIA Policy](/policies/popia-policy)
- QCTO learner enrolment and EISA readiness template and Data Load Specifications ([LMS mapping](https://github.com/grantmx/grithub/blob/main/docs/lms/compliance/qcto-leisa-mapping.md))

## 8. Document control and revision history

| Version | Date | Author | Summary of change |
| --- | --- | --- | --- |
| 0.1 | 2026-11-10 | LMS project team | Initial draft (DRAFT - owner to review) |
