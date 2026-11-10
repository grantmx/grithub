# GRIT Hub LMS: Planning

> Status: **planning only**. `apps/lms` does not exist yet, and nothing here is implemented.

## Purpose

A hybrid Learning Management System for GRIT Hub's QCTO-registered occupational programmes:

- **Self-paced online learning.** Learners work through the Knowledge module content (text first, with optional audio and video), answer a check question at the end of each section, and complete formative assessments online.
- **In-person assessment days.** Learners come to the hub for practical work and supervised assessments. The LMS records attendance, serves the assessments, receives practical submissions, and captures assessor decisions and moderation.

The LMS must also produce the evidence that QCTO Form 5, section 4 (hybrid/blended mode of delivery) asks for. See [compliance/form5-mapping.md](compliance/form5-mapping.md).

## Scope assumptions

- Our programmes have **only Knowledge and Practical modules**. There is **no Workplace module**, **no logbook**, and **no mentor role**.
- Learners are **invited by an SDP admin**. There is no public sign-up in this phase.
- The LMS is the system of record for learning and assessment data. Airtable receives a **one-way** copy for operations reporting.

## Non-goals (this phase)

- Public application, enrolment or payment from the website (deferred; see [phases.md](phases.md)).
- Workplace module delivery, logbooks, mentor workflows.
- Running the External Integrated Summative Assessment (EISA). That is conducted by the Assessment Quality Partner (AQP), not the SDP.
- Issuing certificates. QCTO certifies; the LMS only exports results and POE evidence.
- Authoring course content in Sanity. LMS content lives in the LMS database. This can be revisited later.
- Changes to `apps/web`, `apps/cms`, `apps/docs` or the existing `packages/*`.

## Glossary

| Term                                | Meaning                                                                                                                                                                                                                                                          |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **QCTO**                            | Quality Council for Trades and Occupations. Oversees occupational qualifications, accredits SDPs, and certifies learners.                                                                                                                                        |
| **SAQA**                            | South African Qualifications Authority. Registers qualifications on the NQF and keeps the national learner records database.                                                                                                                                     |
| **MICT SETA**                       | Media, Information and Communication Technologies Sector Education and Training Authority. The sector body for ICT skills (grants, learnerships, sector data). Its quality-assurance role for our specific qualifications is to be confirmed for each programme. |
| **SDP**                             | Skills Development Provider: an accredited training provider (GRIT Hub).                                                                                                                                                                                         |
| **AQP / EISA**                      | Assessment Quality Partner, and the External Integrated Summative Assessment it runs at the end of a qualification. This is outside the LMS.                                                                                                                     |
| **Curriculum document**             | The QCTO-registered curriculum for a qualification. It defines modules, topics/components, weightings and internal assessment criteria. It is the source of truth for coverage.                                                                                  |
| **Curriculum component**            | A topic or element in a module, as defined in the curriculum document (for example KM-01-KT03). Assessment blueprints are defined per component.                                                                                                                 |
| **Knowledge module (KM)**           | Theory component of the curriculum. Delivered online as text-first content with section checks and formative assessments.                                                                                                                                        |
| **Practical module (PM)**           | Practical skills component of the curriculum. The brief is delivered online and completed and assessed in person or by submission.                                                                                                                               |
| **Formative assessment**            | Assessment _for_ learning during a module. It gives feedback and can be retried. It is evidence of progress and goes into the POE.                                                                                                                               |
| **Summative assessment (internal)** | End-of-module assessment by the SDP that confirms competence against the curriculum's internal assessment criteria, before EISA. Not to be confused with the EISA.                                                                                               |
| **POE**                             | Portfolio of Evidence: the collected assessment evidence for a learner (attempts, submissions, decisions, moderation).                                                                                                                                           |
| **Facilitator**                     | Teaches and supports learners, posts content and announcements, and answers questions. Does not make competence decisions.                                                                                                                                       |
| **Assessor**                        | Registered assessor who judges evidence against criteria and records Competent / Not Yet Competent.                                                                                                                                                              |
| **Moderator**                       | Registered moderator who samples assessor decisions to check that they are valid, fair and consistent. Never moderates their own assessments.                                                                                                                    |
| **External evaluator**              | QCTO or quality-partner representative given time-boxed, read-only access during accreditation or monitoring visits.                                                                                                                                             |
| **Section check**                   | One multiple-choice question at the end of each content section, drawn at random from that section's pool.                                                                                                                                                       |
| **Blueprint**                       | Rules that say how many questions to draw from each curriculum component for an assessment.                                                                                                                                                                      |

## Documents

- [architecture.md](architecture.md): proposed stack, alternatives, platform limits, open infrastructure questions
- [roles.md](roles.md): roles and permission matrix
- [domain-model.md](domain-model.md): entities and ER diagram
- [randomization.md](randomization.md): question selection, shuffling and grading
- [compliance/form5-mapping.md](compliance/form5-mapping.md): QCTO Form 5 section 4 → LMS features → evidence
- [phases.md](phases.md): MVP and later phases with acceptance criteria
- [decisions.md](decisions.md): ADR log and open questions
- [dossier/](dossier/README.md): LMS Capability and Security Dossier (system description, services, capacity, POPIA pack, security controls, backup and restore, evaluator demo guide) and its TODO register
- [design.md](design.md): design decisions (filled only through the design gate in `CLAUDE.md`)
