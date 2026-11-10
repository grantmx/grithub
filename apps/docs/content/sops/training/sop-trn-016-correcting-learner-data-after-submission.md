# SOP-TRN-016: Correcting Learner Data After Submission

| Field | Detail |
| --- | --- |
| **SOP code** | SOP-TRN-016 |
| **Department** | Training and Quality Assurance |
| **Process owner** | [TBC: role] |
| **Approved by** | [TBC: per the Delegation of Authority, with the Information Officer] |
| **Version** | 0.1 (DRAFT - owner to review) |
| **Review cycle** | Annually, or when the QCTO changes its correction process |
| **Related policies** | [POPIA Policy](/policies/popia-policy) (right to correction), [QCTO Quality Assurance](/policies/qcto-quality-assurance-policies) |
| **Specification** | [LMS mapping of the QCTO file, including how stage 2 refreshes learner details](https://github.com/grantmx/grithub/blob/main/docs/lms/compliance/qcto-leisa-mapping.md) |

> [!IMPORTANT]
>
> **DRAFT - owner to review.** Every item marked [TBC] must be completed by the process owner before the SOP is approved. Confirm the QCTO's own correction process before approval.

## 1. Purpose and scope

This SOP explains what to do when a learner's details are wrong after they have been confirmed in the LMS, and especially after they have been sent to the QCTO. It covers corrections asked for by the learner, errors found by staff, and errors reported by the QCTO.

A learner has the right to have incorrect personal information corrected (POPIA). Correct data also matters for the learner's certificate.

## 2. Roles and responsibilities

| Role | Responsibility |
| --- | --- |
| **Learner** | Asks for the correction and shows proof in person where needed. |
| **SDP admin** (LMS role) | Verifies identity, makes the correction in the LMS, and prepares any new QCTO batch. |
| **Process owner** | Decides whether and how the QCTO must be told; approves any new submission. |
| **Information Officer** | Keeps the data subject request log and handles disputes ([SOP-DAT-001](/sops/data-protection/sop-dat-001-personal-information-incidents-and-requests)). |

## 3. Step-by-step operating procedure

### Part A: Receive the request

1. **The learner asks** through an administrative support ticket ([SOP-TRN-012](/sops/training/sop-trn-012-learner-support)) or in person. Staff who find an error themselves start at Part B. The QCTO reporting an error starts at Part B too, using the QCTO's reply as the source.
2. **Don't ask the learner to type the correct ID number or other sensitive details in the ticket.** The ticket says only which kind of detail is wrong (for example "ID number" or "home address").

### Part B: Verify and correct

1. **Verify identity** before changing identity details (names, ID number, birth date, gender): in person with the original ID document, or on a video call with the document, as in [SOP-TRN-007](/sops/training/sop-trn-007-learner-invitation-and-administration). For other details, a request from the learner's own signed-in account is enough. [TBC: confirm]
2. **Look at the proof, don't keep it.** Never photograph, copy or file the document.
3. **Correct the profile in the LMS** (SDP admin). The LMS checks the new value against the QCTO rules and checks that a new ID number isn't already used by another learner. The audit log records which fields were changed and by whom, never the old or new values.
4. **Log the request** with the Information Officer in the data subject request log ([SOP-DAT-001](/sops/data-protection/sop-dat-001-personal-information-incidents-and-requests) Part B): date, type of detail, the learner's LMS account, and the outcome. Close the ticket, telling the learner it is done (SOP-DAT-001 asks for written confirmation).

### Part C: Bring the QCTO up to date

1. **Find where the learner's data has been sent** (QCTO submissions panel → submission batches for their cohort).
2. **Never edit or resend a file that has already been sent.** Sent batches are frozen in the LMS as the record of what the QCTO received.
3. **Then, depending on where the cohort is:**

   | Where the cohort is | What to do |
   | --- | --- |
   | Not yet sent (stage 1 draft) | Nothing more: the corrected value goes in the stage 1 file. |
   | Stage 1 sent, stage 2 not yet sent | The stage 2 file re-reads every learner's details from the LMS, so the correction reaches the QCTO with stage 2. The LMS lists which columns changed since stage 1 for each learner. [TBC: whether the QCTO must also be told sooner, for example for an ID number] |
   | Stage 2 sent | [TBC: the QCTO's correction process, for example a corrected file or a letter to the QCTO]. Prepare a new batch only as the QCTO directs, with process owner approval, following [SOP-TRN-015](/sops/training/sop-trn-015-qcto-enrolment-and-eisa-readiness-submission). |
   | The QCTO rejected the batch | Fix every error the QCTO listed, then send a new batch following SOP-TRN-015. Keep the rejected batch as the record. |

4. **Record what was sent and the QCTO's acknowledgement** on the new batch, as in SOP-TRN-015.

> [!WARNING]
>
> If incorrect data has gone to the wrong learner record or to the wrong recipient, it may be a security compromise. Follow [SOP-DAT-001](/sops/data-protection/sop-dat-001-personal-information-incidents-and-requests) straight away.

## 4. Required forms, records and evidence

| Record | Kept by | Retention |
| --- | --- | --- |
| Correction requests and outcomes | Information Officer: data subject request log (SOP-DAT-001) | [TBC] |
| Changed field names, who changed them and when | LMS audit log | [TBC] |
| Frozen earlier submission batches and the new batch | LMS | As in SOP-TRN-015 |
| QCTO correspondence about the correction | [TBC: correspondence folder] | [TBC] |

## 5. Quality checks and approval points

- Identity verified before any identity detail is changed.
- Process owner approves any new QCTO submission.
- Monthly: the data subject request log has no open correction older than [TBC] working days.

## 6. Exceptions and escalation

| Situation | What to do |
| --- | --- |
| GRIT Hub and the learner disagree about the correct value | Refer to the Information Officer. POPIA allows the learner to have a note of the dispute attached to the record. [TBC: how this is recorded] |
| The new ID number is already used by another learner | Don't override it. Escalate to the process owner: it may be a duplicate account or an earlier mistake. |
| The error affects a certificate already issued | [TBC: link to SOP-TRN-004 Certification and verification, when drafted] |

## 7. Related policies and regulatory requirements

- [POPIA Policy](/policies/popia-policy) (data subject rights)
- [SOP-DAT-001 Personal Information Incidents and Data Subject Requests](/sops/data-protection/sop-dat-001-personal-information-incidents-and-requests)
- [SOP-TRN-014 Learner Enrolment Data Collection](/sops/training/sop-trn-014-learner-enrolment-data-collection)
- [SOP-TRN-015 QCTO Enrolment and EISA Readiness Submission](/sops/training/sop-trn-015-qcto-enrolment-and-eisa-readiness-submission)

## 8. Document control and revision history

| Version | Date | Author | Summary of change |
| --- | --- | --- | --- |
| 0.1 | 2026-11-10 | LMS project team | Initial draft (DRAFT - owner to review) |
