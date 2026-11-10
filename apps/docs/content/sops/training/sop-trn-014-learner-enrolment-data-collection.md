# SOP-TRN-014: Learner Enrolment Data Collection

| Field | Detail |
| --- | --- |
| **SOP code** | SOP-TRN-014 |
| **Department** | Training and Quality Assurance |
| **Process owner** | [TBC: role] |
| **Approved by** | [TBC: per the Delegation of Authority, with the Information Officer] |
| **Version** | 0.1 (DRAFT - owner to review) |
| **Review cycle** | Annually, or when the QCTO changes its learner data specification |
| **Related policies** | [POPIA Policy](/policies/popia-policy), [QCTO Quality Assurance](/policies/qcto-quality-assurance-policies) |
| **Specification** | QCTO learner enrolment and EISA readiness (LEISA) file: [LMS column mapping](https://github.com/grantmx/grithub/blob/main/docs/lms/compliance/qcto-leisa-mapping.md) |

> [!IMPORTANT]
>
> **DRAFT - owner to review.** This SOP handles special personal information (race and disability) and identity numbers. The Information Officer must approve it before real learners are enrolled. Every item marked [TBC] must be completed by the process owner before the SOP is approved.

## 1. Purpose and scope

This SOP explains how GRIT Hub collects the personal information the QCTO requires to register each learner, and how that information is checked and protected before it is submitted ([SOP-TRN-015](/sops/training/sop-trn-015-qcto-enrolment-and-eisa-readiness-submission)). It applies to every learner on a QCTO qualification.

We collect only what the QCTO file needs, directly from the learner, inside the LMS. We don't collect it on paper, by email, in spreadsheets or by importing it from another system.

## 2. Roles and responsibilities

| Role | Responsibility |
| --- | --- |
| **Learner** | Gives their details in the LMS, checks them, and confirms they are correct. |
| **SDP admin** (LMS role) | Follows up incomplete or invalid profiles; fills in or corrects details when the learner asks; records the enrolment status fields. The only staff role that can see the learner's QCTO details. |
| **Information Officer** | Approves the notice and consent wording, the lawful basis for special personal information, and this SOP. |
| **Facilitators, assessors, moderators and external evaluators** | Never see the learner's QCTO details. |

## 3. Step-by-step operating procedure

### Part A: Notice and consent (first-time setup)

1. **The learner reads the POPIA notice** in the LMS. It lists the details collected, names the QCTO as a recipient, and names the services that process the data.
2. **The learner gives a separate consent** to share their details with the QCTO. It is a separate tick from the notice and names race and disability. Without it, the learner can't finish setup, and the screen explains why and how to contact the Information Officer. The LMS records which version of each text was accepted, and when; these records can't be edited or deleted.

### Part B: The enrolment profile

1. **The learner completes the profile in three parts**, then a review:
   - **About you:** title, names as on the ID document, ID type and number (South African ID, or another document such as a passport), birth date, gender.
   - **Contact:** home and postal address, cell and other phone numbers, province and Stats SA area, and whether their sign-in email may be shared with the QCTO.
   - **Background:** nationality, citizen or resident status, immigrant status, home language, equity (race) group, socio-economic status, disability status and rating.
2. **The LMS checks every value** against the QCTO code lists and character rules as it is entered (for example, an area must be in the chosen province), and checks that the ID number isn't already used by another learner.
3. **The learner reviews and ticks "These details are correct".**
4. **After confirming, the learner can only view** their details. The ID number is shown masked to its last four characters. Changes go through an SDP admin ([SOP-TRN-016](/sops/training/sop-trn-016-correcting-learner-data-after-submission)).

### Part C: Protection

1. **Encryption:** identity numbers, birth date, addresses, phone numbers, race and disability are encrypted by the LMS before they are stored. Other fields are stored as QCTO codes.
2. **Access:** only the learner and SDP admins (signed in with a passkey) can see the details. Every change by an SDP admin is recorded in the audit log by field name, never the value.
3. **Use:** these details are used only for the QCTO submission. They are never used for marking, at-risk flags, reports or anything a facilitator, assessor or moderator sees.

### Part D: Follow-up (SDP admin)

1. **Weekly while a cohort is starting,** open the QCTO submissions panel. It lists learners with incomplete profiles and which fields fail validation, never the values. Remind those learners in person or through an announcement. [TBC: confirm weekly]
2. **Complete the enrolment status fields** for each learner when they become known: readiness type, statement of results status and date, and foundational learning competence. [TBC: these fields have no LMS screen yet; record how they are captured until one exists]
3. **Profiles must be complete** before the stage 1 submission deadline ([SOP-TRN-015](/sops/training/sop-trn-015-qcto-enrolment-and-eisa-readiness-submission)).

> [!WARNING]
>
> Never ask a learner to email, WhatsApp or photograph their ID document or details, and never copy them into a spreadsheet or notebook. If a learner needs help, sit with them while they enter the details in the LMS themselves.

## 4. Required forms, records and evidence

| Record | Kept by | Retention |
| --- | --- | --- |
| Notice and QCTO consent acceptances (version, text fingerprint, time) | LMS | [TBC] |
| Learner QCTO profile (encrypted fields) | LMS | [TBC] |
| Profile confirmation time | LMS | [TBC] |
| SDP admin changes (field names only) | LMS audit log | [TBC] |

## 5. Quality checks and approval points

- Before the stage 1 deadline: the panel shows no incomplete profiles or validation errors for the cohort.
- The Information Officer has approved the notice and consent versions in use. [TBC]

## 6. Exceptions and escalation

| Situation | What to do |
| --- | --- |
| A learner refuses the QCTO consent | They can't be enrolled with the QCTO. Refer them to the Information Officer. [TBC: what GRIT Hub offers them] |
| A learner has no ID document | [TBC: which alternative documents are accepted, per the QCTO code list] |
| The LMS says the ID number is already registered | Don't override it. Escalate to the process owner: it may be a duplicate account or an error. |
| A learner can't use a device | An SDP admin may enter the details with the learner present; the learner checks and confirms them. |
| Details may have been exposed | Follow [SOP-DAT-001](/sops/data-protection/sop-dat-001-personal-information-incidents-and-requests). |

## 7. Related policies and regulatory requirements

- [POPIA Policy](/policies/popia-policy) (including special personal information)
- [QCTO Quality Assurance Policies and Procedures](/policies/qcto-quality-assurance-policies)
- QCTO Data Load Specifications for the learner enrolment and EISA readiness file, and the current QCTO template ([LMS mapping](https://github.com/grantmx/grithub/blob/main/docs/lms/compliance/qcto-leisa-mapping.md))

## 8. Document control and revision history

| Version | Date | Author | Summary of change |
| --- | --- | --- | --- |
| 0.1 | 2026-11-10 | LMS project team | Initial draft (DRAFT - owner to review) |
