# SOP-TRN-007: Learner Invitation and Administration

| Field | Detail |
| --- | --- |
| **SOP code** | SOP-TRN-007 |
| **Department** | Training and Quality Assurance |
| **Process owner** | [TBC: role] |
| **Approved by** | [TBC: per the Delegation of Authority] |
| **Version** | 0.1 (DRAFT - owner to review) |
| **Review cycle** | Annually, or when the LMS sign-in process changes |
| **Related policies** | [Training (Teaching and Learning) Policy](/policies/training-teaching-and-learning-policy), [POPIA Policy](/policies/popia-policy) |
| **QCTO Form 5** | Section 4.1 (administration of online delivery), rows [4.1.2, 4.1.3 and 4.1.6](https://github.com/grantmx/grithub/blob/main/docs/lms/compliance/form5-mapping.md#41-documented-process-implementation-management-and-administration-of-online-delivery) |

> [!IMPORTANT]
>
> **DRAFT - owner to review.** Every item marked [TBC] must be completed by the process owner before the SOP is approved.

## 1. Purpose and scope

This SOP explains how learners get access to the LMS, how their accounts are looked after while they study, and how access ends. It applies to every learner enrolled in a cohort on the LMS. Staff accounts follow the same steps, with the role grants described in [SOP-TRN-006](/sops/training/sop-trn-006-online-delivery-implementation).

The LMS is **invite-only**: there is no public sign-up. Recruitment and admission decisions happen before this SOP starts. [TBC: link to SOP-TRN-001 Learner recruitment, enrolment and onboarding, when drafted]

## 2. Roles and responsibilities

| Role | Responsibility |
| --- | --- |
| **SDP admin** (LMS role) | Creates cohorts, invites and enrols learners, resends invitations, deactivates accounts, and runs admin-verified account recovery. |
| **Learner** | Completes first-time setup, keeps their email address current, and keeps their sign-in device secure. |
| **Facilitator** | Tells the SDP admin when a learner can't get in or has left the programme. |
| **Information Officer** | Approves the privacy notice and consent wording learners accept at setup. |

## 3. Step-by-step operating procedure

### Part A: Invite learners

1. **Create the cohort** (SDP admin): qualification, name, start and end dates. Set the moderation sampling rate ([SOP-TRN-011](/sops/training/sop-trn-011-assessment-and-moderation-in-the-lms)).
2. **Invite learners**, one at a time (name and email) or by CSV import. A CSV import is checked and shown as a preview first; only valid rows are imported after the SDP admin confirms. The file's contents are never stored or logged.
3. **The LMS emails each learner a single-use invitation link** that expires after 72 hours. Sending a new invitation cancels the old one.
4. **Track status** on the People screen: Invited, Active, Expired invite or Deactivated. Resend expired invitations. [TBC: how many times to resend before contacting the learner another way]

### Part B: First-time setup (learner)

1. The learner opens the link and works through setup, one step per screen:
   1. Confirm their details.
   2. Read and accept the POPIA notice. Learners also give a **separate** consent to share their details with the QCTO. The LMS records which version of each text was accepted, and when.
   3. Complete the QCTO enrolment profile ([SOP-TRN-014 Learner Enrolment Data Collection](/sops/training/sop-trn-014-learner-enrolment-data-collection)).
   4. Register a passkey (the phone's or computer's fingerprint, face or screen lock). Learners may skip this and sign in with email links instead.
2. A learner who doesn't accept the notice or the QCTO consent can't finish setup. The screen explains why and how to contact the Information Officer. [TBC: what GRIT Hub offers a person who refuses QCTO sharing]

### Part C: Sign-in and account help

1. **Signing in:** passkey, or a single-use email link that works for 15 minutes. There are no passwords and no SMS codes.
2. **Lost device:** the learner signs in with an email link and adds a new passkey.
3. **Lost access to email as well:** the SDP admin runs **admin-verified recovery**:
   1. Verify identity in person with an ID document, on a video call with an ID document, or by calling a phone number already on record. Never accept a number given in the same request.
   2. Record the method used and the reason. Never record the ID number.
   3. Start recovery. The LMS removes all the learner's passkeys and signs them out everywhere, then emails a single-use recovery link (30 minutes).
4. **Change of email address:** [TBC: who may change it, and how identity is verified]

### Part D: Ending access

1. **Learner leaves or is withdrawn:** the SDP admin deactivates the account. The learner is signed out everywhere at once and their outstanding links stop working. Their records stay, as required for assessment evidence ([SOP-DAT-003](/sops/data-protection/sop-dat-003-lms-data-backup-and-protection)).
2. **Cohort ends:** [TBC: whether learners keep read-only access to their results and for how long]

> [!WARNING]
>
> Staff must not be enrolled as learners in a cohort where they hold a staff role. The LMS does not block this yet, so the SDP admin checks it when inviting. [TBC: confirm]

## 4. Required forms, records and evidence

| Record | Kept by | Retention |
| --- | --- | --- |
| Account, enrolment and status history | LMS | [TBC] |
| Notice and consent acceptances (version, text fingerprint, time) | LMS (cannot be edited or deleted) | [TBC] |
| Invitations, imports, deactivations and recoveries | LMS audit log (no names or emails in the log) | [TBC] |
| Identity check method and reason for each recovery | LMS audit log | [TBC] |

## 5. Quality checks and approval points

- Weekly while a cohort is starting: every invited learner is Active or has been followed up. [TBC: frequency]
- Every admin-verified recovery has a recorded method and reason.
- At cohort end: leavers are deactivated.

## 6. Exceptions and escalation

| Situation | What to do |
| --- | --- |
| A learner has no email address | [TBC: whether GRIT Hub helps the learner create one, and who] |
| A learner has no smartphone or computer | Learners can use hub computers with email-link sign-in. [TBC: confirm the approach for shared lab computers] |
| Someone asks for an account change and their identity can't be verified | Refuse and escalate to the Information Officer. |
| An invitation email doesn't arrive | Check the address with the learner in person, then resend. |

## 7. Related policies and regulatory requirements

- [Training (Teaching and Learning) Policy](/policies/training-teaching-and-learning-policy)
- [POPIA Policy](/policies/popia-policy)
- [SOP-DAT-001 Personal Information Incidents and Data Subject Requests](/sops/data-protection/sop-dat-001-personal-information-incidents-and-requests)

## 8. Document control and revision history

| Version | Date | Author | Summary of change |
| --- | --- | --- | --- |
| 0.1 | 2026-11-10 | LMS project team | Initial draft (DRAFT - owner to review) |
