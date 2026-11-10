# SOP-TRN-010: Question Bank Development and Randomization

| Field | Detail |
| --- | --- |
| **SOP code** | SOP-TRN-010 |
| **Department** | Training and Quality Assurance |
| **Process owner** | [TBC: role, for example the Curriculum Development and Qualifications Director] |
| **Approved by** | [TBC: per the Delegation of Authority] |
| **Version** | 0.1 (DRAFT - owner to review) |
| **Review cycle** | Annually, after each cohort's question analytics, or when a curriculum document changes |
| **Related policies** | [Assessment Policy](/policies/assessment-policy), [QCTO Quality Assurance](/policies/qcto-quality-assurance-policies) |
| **QCTO Form 5** | Rows [4.2.3 and 4.2.4](https://github.com/grantmx/grithub/blob/main/docs/lms/compliance/form5-mapping.md#42-delivery-of-the-knowledge-module) (formative activities loaded and how they are conducted); row [4.3.3](https://github.com/grantmx/grithub/blob/main/docs/lms/compliance/form5-mapping.md#43-delivery-of-the-practical-module) |

> [!IMPORTANT]
>
> **DRAFT - owner to review.** Every item marked [TBC] must be completed by the process owner before the SOP is approved.

## 1. Purpose and scope

This SOP explains how knowledge questions are written, reviewed, versioned and organised into banks, and how the LMS draws a different but equivalent paper for each learner. It covers section check questions, formative assessments and summative assessments.

The aims are: every learner covers the curriculum equally; learners can't easily copy from each other; a page refresh never changes a paper; answers can't be read from the learner's browser; and every paper can be shown again exactly as it was served.

## 2. Roles and responsibilities

| Role | Responsibility |
| --- | --- |
| **Assessor** (LMS role) | Writes questions, answer keys, explanations and marking rubrics; creates new versions; retires weak questions. |
| **Moderator** (LMS role) | Reviews banks, versions, keys and rubrics for validity and fairness. |
| **SDP admin** (LMS role) | Creates banks and blueprints, publishes blueprints and schedules assessments. Does not see answer keys. |
| **Facilitator** (LMS role) | May read questions, but never answer keys, so keys can't reach learners through teaching staff. |
| **Process owner** | Approves the coverage of each blueprint against the curriculum document. |

## 3. Step-by-step operating procedure

### Part A: Write and review questions

1. **Create a bank per curriculum component** (SDP admin), and a check pool per section.
2. **Write each question** (assessor) against one curriculum component: the question, options, the correct option(s), an explanation, and for short-answer questions a marking rubric. Formative papers use single- and multiple-choice questions; short answers are for summative papers, marked by an assessor.
3. **Write enough questions.** A bank needs at least as many active questions as a paper draws from it; aim for at least that number multiplied by the number of attempts allowed, so retries get fresh questions. The LMS warns or blocks when a bank is too small.
4. **Review** (moderator, or a second assessor): correct key, one defensible answer, clear wording, plain language, no bias, matches the component. [TBC: reviewer and sign-off method]

### Part B: Versions

1. **Once a question has been served to any learner, it is frozen.** The LMS refuses any change to that version, its options or its rubric. To fix or improve it, the assessor creates a **new version**; earlier papers keep showing exactly what learners saw.
2. **Retire** a question that is flawed or no longer matches the curriculum. Retired questions are not drawn again.

### Part C: Blueprints and randomization

1. **Build a blueprint** (SDP admin) for each assessment: rules of the form "from this bank, draw this many questions", plus time limit, attempts allowed, pass mark and whether answers are shown after submitting.
2. **Publish the blueprint.** The LMS checks bank sizes and the coverage report shows every curriculum component covered. A published blueprint is locked (only its title can change).
3. **How the draw works:** when a learner starts an attempt, the server picks questions from each bank and shuffles the option order, using a seed based on the learner, the assessment and the attempt number. The paper is **stored** at that moment; refreshing, resuming or changing devices always shows the stored paper. Every learner gets the same number of questions per component, so coverage is equal even though questions differ.
4. **Section checks:** one question per section, drawn from the section's pool. A retry asks the same question with the options reshuffled.

### Part D: Keep the bank healthy

1. **After each cohort,** assessors and moderators review question analytics (how often each question and option is chosen) and retire or re-version weak questions. [TBC: review trigger, for example a question almost everyone gets right or wrong]

> [!WARNING]
>
> Never export, print, photograph or share answer keys outside the LMS staff screens. Only assessors, moderators and external evaluators can see keys. The LMS never sends option identifiers, correctness or explanations to a learner's browser before an attempt is graded.

## 4. Required forms, records and evidence

| Record | Kept by | Retention |
| --- | --- | --- |
| Question banks, every question version, keys and rubrics | LMS (served versions are frozen) | [TBC: with assessment records] |
| Published blueprints and coverage report | LMS | [TBC] |
| The exact paper served to each learner (questions, option order, seed) | LMS | [TBC: with assessment records] |
| Review sign-offs | [TBC] | [TBC] |

## 5. Quality checks and approval points

- Before publishing a blueprint: coverage report shows every component covered; process owner approves.
- Before first use: every question reviewed. [TBC]
- After each cohort: analytics reviewed. [TBC]

## 6. Exceptions and escalation

| Situation | What to do |
| --- | --- |
| A wrong key is found after learners were marked | The assessor creates a corrected version; the process owner decides whether affected results are re-marked, following [SOP-TRN-011](/sops/training/sop-trn-011-assessment-and-moderation-in-the-lms) and [SOP-TRN-005](/sops/training/sop-trn-005-appeals-handling). |
| A bank is too small to publish | Write more questions or reduce the draw, with process owner approval. |
| A question or key is leaked | Retire the affected questions, tell the process owner, and consider whether results are affected. |

## 7. Related policies and regulatory requirements

- [Assessment Policy](/policies/assessment-policy)
- [SOP-TRN-003 Assessment and Moderation](/sops/training/sop-trn-003-assessment-and-moderation)
- The curriculum document for each qualification

## 8. Document control and revision history

| Version | Date | Author | Summary of change |
| --- | --- | --- | --- |
| 0.1 | 2026-11-10 | LMS project team | Initial draft (DRAFT - owner to review) |
