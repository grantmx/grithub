# Randomized questions

Goals: every learner gets **equal curriculum coverage**, learners cannot easily copy from each other, a page refresh **never** changes what a learner sees, answers **cannot** be read from the browser, and any attempt can be **replayed exactly** for moderation or appeal.

## 1. Section check questions

- Every `Section` ends with **one** multiple-choice check question, drawn from that section's `QuestionPool`.
- The draw is seeded (see §3), so revisiting the section shows the same question for that attempt.
- A check is formative. The learner sees feedback after answering. A retry creates a new attempt (`attemptNo + 1`), which draws again and prefers questions not yet seen (see §4).
- Pool guidance: **at least 3 questions per section** (4+ recommended). Admin UI warns when a pool is below `minPoolSize`.
- Open question: does a section check gate progress to the next section, or is it advisory only?

## 2. Assessments use blueprints

> Implemented in `apps/lms/lib/paper.ts` (pure draw, tests in `test/paper.test.ts`), `lib/server/assessments.ts` (attempts, grading) and `lib/server/authoring.ts` (publish validation). Coverage report: `/admin/assessments/coverage`.

- An `AssessmentBlueprint` has `BlueprintRule`s: _"from bank X / curriculum component Y, draw N questions"_.
- Every learner gets the **same number of questions per curriculum component**, so coverage is equal even though the questions differ.
- Validation when a blueprint is published:
  - every rule's bank has at least `N × (maxAttempts)` active questions (warning), and at least `N` (hard error);
  - the sum of rules matches the intended total and the mark allocation;
  - every curriculum component of the module listed in the curriculum document is covered by at least one rule (coverage report). This feeds Form 5 evidence.
- A question appears at most once per paper, even if banks overlap. Formative papers draw single/multi questions only; summative papers may include short answers (marked by an assessor against a rubric).
- Optional later: difficulty bands per rule (for example 2 easy, 2 medium, 1 hard), so that random draws are of comparable difficulty.

## 3. Seeded, stable shuffling

> Implemented in `apps/lms/lib/randomization.ts` (xoshiro128\*\* PRNG) and `apps/lms/lib/server/sectionCheck.ts`; golden-output tests in `apps/lms/test/randomization.test.ts`.

```
seed      = SHA-256( learnerId + ":" + itemId + ":" + attemptNo )
prng      = deterministic PRNG initialised from the seed (e.g. xoshiro128** / mulberry32)
selection = seeded sampling without replacement from eligible questions
order     = Fisher–Yates(questions, prng)
options   = Fisher–Yates(non-pinned options, prng) with pinned options re-inserted at their positions
```

- `itemId` is the section id for a check, or the blueprint id for an assessment.
- The seed makes generation **reproducible**. Generated results are also **persisted** as `AttemptItem` rows when the attempt starts. Every later request (refresh, resume, other device) reads the stored rows and never regenerates them. If stored rows and the seed ever disagree, stored rows win.
- The PRNG and shuffle live in one pure, unit-tested module. Tests use fixed seeds and golden outputs so that a library upgrade cannot silently change the draws.
- The seed is computed only on the server. Knowing the formula does not reveal answers, because answer keys never leave the server.

## 4. Retries prefer unseen questions

When building attempt `k > 1`:

1. Eligible = active questions in the rule's bank/pool.
2. Remove questions this learner has seen in any earlier attempt of the same blueprint/section (from `AttemptItem`).
3. If enough remain, sample from them (seeded).
4. If not, take all unseen questions and fill the rest with the **least-recently-seen** ones (tie-broken by seeded order).
5. Record in the attempt that the fallback was used, so that pool exhaustion shows up in admin reports.

## 5. Pinned options

- `AnswerOption.pinnedPosition` (nullable) keeps an option in a fixed place. For example, "All of the above" / "None of the above" is pinned to the last position.
- The shuffle moves only unpinned options, then inserts pinned ones at their positions (negative = from the end).
- Authoring rule: a question that uses "all/none of the above" must pin it. The editor warns if such text is unpinned.

## 6. Server-side grading only

- The learner payload contains: question stem, option **labels**, and **opaque per-attempt option tokens** (random ids stored in `AttemptItem.optionTokens`). It never includes `AnswerOption.id`, `isCorrect`, feedback for unchosen options, or the memo.
- The response is posted as option tokens. The server maps tokens → option ids → correctness using the stored `AttemptItem`.
- Feedback and correct answers are shown only **after** submission, and only if the blueprint allows it. Summative attempts default to not showing the correct answer.
- Time limits are enforced on the server from `startedAt`. The client timer is for display only.
- Answers are autosaved per item, so a dropped connection on an assessment day loses nothing.

## 7. Evidence for moderation and appeals

Each `AttemptItem` stores:

- `questionVersionId` (the immutable version served);
- `servedOptionOrder` and `optionTokens`;
- `seed`, `position`, the learner's response, correctness, and timestamps.

From this, the moderator view can **replay the attempt exactly** as the learner saw it, with correct answers overlaid. A POE export renders the same view to PDF.

## 8. Things we explicitly do not do

- Client-side shuffling or grading.
- Editing a question version after it has been served.
- Unseeded `Math.random()` for anything an attempt depends on.
