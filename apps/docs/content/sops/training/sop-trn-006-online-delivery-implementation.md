# SOP-TRN-006: Online Delivery Implementation

| Field | Detail |
| --- | --- |
| **SOP code** | SOP-TRN-006 |
| **Department** | Training and Quality Assurance |
| **Process owner** | [TBC: role, for example the Curriculum Development and Qualifications Director] |
| **Approved by** | [TBC: per the Delegation of Authority] |
| **Version** | 0.1 (DRAFT - owner to review) |
| **Review cycle** | Annually, or when QCTO requirements or the LMS change |
| **Related policies** | [Training (Teaching and Learning) Policy](/policies/training-teaching-and-learning-policy), [QCTO Quality Assurance](/policies/qcto-quality-assurance-policies) |
| **QCTO Form 5** | Section 4.1, rows [4.1.1 to 4.1.6](https://github.com/grantmx/grithub/blob/main/docs/lms/compliance/form5-mapping.md#41-documented-process-implementation-management-and-administration-of-online-delivery) |

> [!IMPORTANT]
>
> **DRAFT - owner to review.** This SOP describes how GRIT Hub runs blended (online and in-person) delivery on its learning management system (LMS). Every item marked [TBC] must be completed by the process owner before the SOP is approved.

## 1. Purpose and scope

This SOP explains how GRIT Hub implements, manages and administers online delivery of QCTO occupational qualifications on its own LMS, GRIT Hub Learning. It is the "documented process" asked for in QCTO Form 5, section 4.1, and it ties together the other online delivery SOPs.

It covers the LMS itself, the computers and connectivity learners use, the licences and contracts that support delivery, and the records that show the process is working.

Our programmes have **only Knowledge and Practical modules**. There is no Workplace module, logbook or mentor role, so Form 5 section 4.4 is **not applicable** and there is no Workplace Module SOP. See [section 6](#6-exceptions-and-escalation) and [Form 5 rows 4.4.1 to 4.4.3](https://github.com/grantmx/grithub/blob/main/docs/lms/compliance/form5-mapping.md#44-delivery-of-the-workplace-module).

## 2. Roles and responsibilities

The LMS has six roles. Each person is given only the roles they need, for the cohorts they work with.

| Role | Responsibility |
| --- | --- |
| **Process owner** | Owns this SOP, keeps the Form 5 readiness dashboard current, and reports gaps to management. [TBC: role] |
| **SDP admin** (LMS role) | Sets up qualifications, cohorts and people; records licence and contract references; prepares Form 5 evidence. Held by [TBC: organisational role]. |
| **Facilitator** (LMS role) | Delivers content and supports learners online. Makes no competence decisions. |
| **Assessor** (LMS role) | Runs assessment days, marks, and records competence decisions. |
| **Moderator** (LMS role) | Samples and moderates assessor decisions; releases results. |
| **External evaluator** (LMS role) | QCTO or quality-partner representative with read-only, time-limited access during a visit. |
| **Technical custodian** | Keeps the LMS running: deployments, backups, restore tests and access keys. [TBC: role] |
| **Information Officer** | Approves how personal information is handled ([SOP-DAT-001](/sops/data-protection/sop-dat-001-personal-information-incidents-and-requests)). |

## 3. Step-by-step operating procedure

### Part A: Before a qualification goes online

1. **Confirm the module structure.** The process owner confirms from the curriculum document that the qualification has only Knowledge and Practical modules. The SDP admin records the curriculum document reference on the Form 5 readiness dashboard (this is what marks 4.4 as not applicable).
2. **Load the content.** Follow [SOP-TRN-008 Knowledge Module Delivery](/sops/training/sop-trn-008-knowledge-module-delivery) and [SOP-TRN-009 Practical Module Delivery](/sops/training/sop-trn-009-practical-module-delivery).
3. **Prepare assessments.** Follow [SOP-TRN-010 Question Bank Development and Randomization](/sops/training/sop-trn-010-question-bank-development-and-randomization).
4. **Assign staff.** The SDP admin gives each cohort one assessor, at least one facilitator and a moderator, and sets the cohort's moderation sampling rate.
5. **Record the supporting documents** on the dashboard as references (title, issuer, where the document is kept, valid-until date). The documents themselves stay in GRIT Hub's records, never on this public site:
   - 4.1.1: operating system licences for GRIT Hub's computers.
   - 4.1.3: LMS ownership statement, hosting subscriptions and capacity statement (the LMS is built and owned by GRIT Hub, so there is no vendor licence).
   - 4.1.4: connectivity statement (how learners get internet access at the hub, and backup power).
   - 4.1.5: internet service provider contract.
   - 4.2.9: conferencing platform licence (Zoom).
6. **Check readiness.** The process owner opens the Form 5 readiness dashboard for the qualification. Every row must show Ready, Not applicable or a recorded manual document before the first cohort starts.

### Part B: While cohorts are running

1. **Invite and administer learners.** Follow [SOP-TRN-007 Learner Invitation and Administration](/sops/training/sop-trn-007-learner-invitation-and-administration).
2. **Deliver, support and communicate.** Follow [SOP-TRN-008](/sops/training/sop-trn-008-knowledge-module-delivery), [SOP-TRN-009](/sops/training/sop-trn-009-practical-module-delivery), [SOP-TRN-012 Learner Support](/sops/training/sop-trn-012-learner-support) and [SOP-TRN-013 Facilitator Communication](/sops/training/sop-trn-013-facilitator-communication).
3. **Assess and moderate.** Follow [SOP-TRN-011 Assessment and Moderation in the LMS](/sops/training/sop-trn-011-assessment-and-moderation-in-the-lms).
4. **Protect the data.** Follow [SOP-DAT-003 LMS Data Backup and Protection](/sops/data-protection/sop-dat-003-lms-data-backup-and-protection).
5. **Review the dashboard monthly.** The process owner checks the dashboard and acts on every "Needs attention" row. The dashboard warns 30 days before a recorded licence or contract expires. [TBC: confirm monthly]

### Part C: Before a QCTO or quality-partner visit

1. **Give the evaluator access.** The SDP admin creates an external evaluator account that expires the day after the visit. Every page the evaluator opens is recorded in the LMS audit log.
2. **Prepare the evidence pack.** From the dashboard, export the evidence pack (one PDF, learners pseudonymised). Its fingerprint (SHA-256) is recorded automatically.
3. **After the visit,** let the evaluator account expire, and record any findings against this SOP.

> [!WARNING]
>
> Never put a licence, contract, invoice or learner record on this public site or in the LMS's public pages. Record a reference only.

## 4. Required forms, records and evidence

| Record | Kept by | Retention |
| --- | --- | --- |
| Form 5 readiness dashboard (live) | LMS; SDP admin | Live system |
| Licence and contract references (4.1.1, 4.1.3, 4.1.5, 4.2.9) | SDP admin, in the LMS | [TBC] |
| The licence and contract documents | [TBC: role and location] | [TBC] |
| Curriculum document reference per qualification (4.4 not applicable) | SDP admin, in the LMS | [TBC] |
| Evidence pack exports and their fingerprints | LMS audit log; [TBC: where exported copies are filed] | [TBC] |
| Evaluator access records | LMS audit log | [TBC] |

## 5. Quality checks and approval points

- Before the first cohort: every dashboard row is Ready, Not applicable or has a recorded document. Checked by the process owner.
- Monthly: no "Needs attention" rows left without an action and owner. [TBC]
- Before a visit: the evidence pack has been exported and checked by the process owner.

## 6. Exceptions and escalation

| Situation | What to do |
| --- | --- |
| A curriculum document turns out to include a Workplace module | Stop: the LMS does not support workplace delivery. Escalate to the process owner and management before enrolling. |
| A licence or contract is about to expire | The SDP admin renews it or escalates to [TBC: role] at least 30 days before expiry. |
| The LMS is unavailable | The technical custodian follows [SOP-DAT-003](/sops/data-protection/sop-dat-003-lms-data-backup-and-protection). Facilitators tell learners through [TBC: channel used when the LMS is down]. |
| A dashboard row can't be made Ready | The process owner records why and the plan, and tells management. |

## 7. Related policies and regulatory requirements

- [Training (Teaching and Learning) Policy](/policies/training-teaching-and-learning-policy)
- [QCTO Quality Assurance Policies and Procedures](/policies/qcto-quality-assurance-policies)
- [POPIA Policy](/policies/popia-policy)
- QCTO Form 5 (accreditation application), section 4: hybrid and blended delivery. [LMS mapping of every Form 5 row](https://github.com/grantmx/grithub/blob/main/docs/lms/compliance/form5-mapping.md)

## 8. Document control and revision history

| Version | Date | Author | Summary of change |
| --- | --- | --- | --- |
| 0.1 | 2026-11-10 | LMS project team | Initial draft (DRAFT - owner to review) |
