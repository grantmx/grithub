# SOP-TRN-011: Assessment and Moderation in the LMS

| Field | Detail |
| --- | --- |
| **SOP code** | SOP-TRN-011 |
| **Department** | Training and Quality Assurance |
| **Process owner** | [TBC: role, for example the Curriculum Development and Qualifications Director] |
| **Approved by** | [TBC: per the Delegation of Authority] |
| **Version** | 0.1 (DRAFT - owner to review) |
| **Review cycle** | Annually, or when QCTO requirements or the Assessment Policy change |
| **Related policies** | [Assessment Policy](/policies/assessment-policy), [Appeals Policy](/policies/appeals-policy), [QCTO Quality Assurance](/policies/qcto-quality-assurance-policies) |
| **QCTO Form 5** | Rows [4.2.4 and 4.2.5](https://github.com/grantmx/grithub/blob/main/docs/lms/compliance/form5-mapping.md#42-delivery-of-the-knowledge-module) (knowledge); rows [4.3.4 and 4.3.5](https://github.com/grantmx/grithub/blob/main/docs/lms/compliance/form5-mapping.md#43-delivery-of-the-practical-module) (practical) |

> [!IMPORTANT]
>
> **DRAFT - owner to review.** This SOP applies [SOP-TRN-003 Assessment and Moderation](/sops/training/sop-trn-003-assessment-and-moderation) to assessments run on the LMS. Where they differ, SOP-TRN-003 and the Assessment Policy set the rules; this SOP says how the LMS carries them out. Every item marked [TBC] must be completed by the process owner before the SOP is approved.

## 1. Purpose and scope

This SOP explains how formative and summative assessments are conducted, marked, moderated and released on the LMS, for both Knowledge and Practical modules. Question writing is in [SOP-TRN-010](/sops/training/sop-trn-010-question-bank-development-and-randomization); practical briefs are in [SOP-TRN-009](/sops/training/sop-trn-009-practical-module-delivery).

## 2. Roles and responsibilities

| Role | Responsibility |
| --- | --- |
| **SDP admin** (LMS role) | Schedules assessments and assessment days; sets each cohort's moderation sampling rate. |
| **Facilitator** (LMS role) | Takes attendance and ID checks on assessment days. Makes no competence decisions and never sees answer keys. |
| **Assessor** (LMS role) | Opens summative papers, pauses and adds time, marks, and records Competent or Not yet competent with feedback. One assessor per cohort. Must sign in with a passkey. |
| **Moderator** (LMS role) | Chooses the moderation sample, records verdicts, and releases results by closing the batch. Never moderates their own decisions. Must sign in with a passkey. |
| **Appeals decision-maker** | Decides appeals; never the assessor who made the decision ([SOP-TRN-005](/sops/training/sop-trn-005-appeals-handling)). |
| **Learner** | Completes assessments honestly within their windows. |

## 3. Step-by-step operating procedure

### Part A: Formative assessments (online)

1. **Schedule** the formative for the cohort with an open and close window (SDP admin).
2. **Learners write it online, in their own time,** within the window. Each learner gets their own drawn paper. Answers save as they go; a dropped connection doesn't lose work, and the learner can resume on any device. The time limit is enforced by the server.
3. **The LMS marks it** and, if the blueprint allows, shows answers and explanations after submitting. Retries prefer questions the learner hasn't seen.
4. **Moderate formatives by inspection** (moderator): review the banks, versions, keys, rubrics and sample replays in Assessment materials. [TBC: how often, and how findings are recorded]

### Part B: Summative assessments (in person at the hub)

1. **Schedule the assessment day** (SDP admin). Summatives are in person only.
2. **On the day, record attendance and check each learner's ID** on the register (facilitator, assessor or SDP admin). Record that the check was done, never the ID number.
3. **The assessor opens the paper** for each learner who is present and checked.
4. **During the assessment,** the assessor can pause a learner's attempt (the clock stops) or add extra time, for example for an approved accommodation or a power cut. Every pause and extension is logged.
5. **At the time limit** the LMS submits the saved answers automatically.
6. **The assessor signs off the register.** It can't be changed afterwards.

### Part C: Marking and decisions

1. **Mark** (assessor): multiple-choice answers are marked by the LMS; short answers and practical criteria are marked by the assessor against the rubric or criteria. The pass mark is shown as a suggestion; the assessor decides.
2. **Record the decision**: Competent or Not yet competent, with feedback. A recorded decision is final: a change creates a new decision that replaces it, and only while the moderation batch is open.
3. **Learners don't see decisions yet.** Results are released only by moderation (Part D).

> [!WARNING]
>
> An assessor must not assess a learner they are related to or have another conflict of interest with. Declare it to the process owner before the assessment. [TBC: how declarations are recorded]

### Part D: Moderation and release

1. **Decisions are grouped in a moderation batch:** one batch per assessment (or practical brief) per cohort.
2. **Choose the sample** (moderator): at least the cohort's sampling rate, rounded up. [TBC: confirm the rate per quality partner (LMS default: 25%)]
3. **Moderate each sampled decision,** seeing the exact paper, option order, answers and marks the learner had, or the practical evidence. Record **Agree**, **Agree with actions** or **Disagree**, with reasons.
    - **Disagree:** the assessor re-decides, and the moderator checks again.
    - **Agree with actions:** the assessor completes the actions and marks them done.
4. **Close the batch** (moderator). The LMS allows this only when the sample is big enough, every sampled decision is agreed and every action is done. Closing **releases every decision in the batch** together, including those not sampled, and notifies learners.
5. **Export the moderation report** (PDF or CSV) for the quality partner. The export is recorded in the audit log.

### Part E: Reassessment and appeals

1. **Reassessment:** a learner who is Not yet competent may be reassessed within the attempts allowed. [TBC: confirm per the Assessment Policy (LMS default: one reassessment for summatives)]
2. **Appeals:** a learner may appeal a released decision in the LMS. Follow [SOP-TRN-005 Appeals Handling](/sops/training/sop-trn-005-appeals-handling). A reassessment ordered on appeal is decided by the cohort's assessor and is always moderated.

## 4. Required forms, records and evidence

| Record | Kept by | Retention |
| --- | --- | --- |
| Served papers, answers, autosaves, pauses and extra time | LMS (frozen after submission) | [TBC: with assessment records] |
| Assessment-day registers and ID-check flags | LMS (final once signed off) | [TBC] |
| Marks, decisions and feedback, with every superseded version | LMS | [TBC] |
| Moderation samples, verdicts, actions and reports | LMS | [TBC] |
| Appeals and outcomes | LMS | [TBC] |
| Exact paper PDFs and report exports | LMS audit log records each export | [TBC] |

## 5. Quality checks and approval points

- Every batch is closed only through moderation (the LMS enforces this).
- No moderator moderates their own decision; one assessor per cohort (the LMS enforces both).
- [TBC: process owner reviews moderation reports per cohort]

## 6. Exceptions and escalation

| Situation | What to do |
| --- | --- |
| Power or internet failure during a summative | The assessor pauses affected attempts; answers already saved are kept. Resume when the connection returns, adding time if needed. |
| A learner arrives without ID | [TBC: per the Assessment Policy] |
| Suspected cheating | The assessor records it; follow SOP-TRN-003 step 5. |
| The moderator and assessor can't agree | [TBC: escalation to the process owner or an external moderator] |

## 7. Related policies and regulatory requirements

- [Assessment Policy](/policies/assessment-policy)
- [Appeals Policy](/policies/appeals-policy)
- [SOP-TRN-003 Assessment and Moderation](/sops/training/sop-trn-003-assessment-and-moderation)
- [SOP-TRN-005 Appeals Handling](/sops/training/sop-trn-005-appeals-handling)

## 8. Document control and revision history

| Version | Date | Author | Summary of change |
| --- | --- | --- | --- |
| 0.1 | 2026-11-10 | LMS project team | Initial draft (DRAFT - owner to review) |
