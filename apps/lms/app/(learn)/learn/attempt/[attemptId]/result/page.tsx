import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { appealAction } from "@/app/(learn)/assess-actions";
import { Icon } from "@/components/Icon";
import styles from "@/components/learn/learn.module.css";
import { AssessmentError, getAttemptResult } from "@/lib/server/assessments";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Result" };
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Johannesburg",
});

// TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
const APPEAL_ERRORS: Record<string, string> = {
  appeal_closed: "This result can no longer be appealed.",
  invalid_answer: "Tell us why you're appealing (up to 4000 characters).",
  rate_limited: "Too many tries. Please wait and try again.",
};

/** L11: formative score and answers, or the summative status / released result + appeal. */
export default async function ResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ submitted?: string; appealed?: string; error?: string }>;
}) {
  const { attemptId } = await params;
  const sp = await searchParams;
  const { ctx, actor } = await requirePage(`/learn/attempt/${attemptId}/result`);
  let r;
  try {
    r = await getAttemptResult(ctx, actor, attemptId);
  } catch (e) {
    if (e instanceof AssessmentError) notFound();
    throw e;
  }
  if (!r) redirect(`/learn/attempt/${attemptId}`);

  return (
    <div className={styles.attemptShell}>
      <p className={styles.crumb}>
        <a href={`/learn/${r.qualificationId}`} className={styles.textLink}>
          Programme
        </a>{" "}
        › Assessments
      </p>
      <h1 className={styles.pageTitle}>{r.title}</h1>
      <p className={styles.hint}>
        Submitted {r.submittedAt ? dateFmt.format(r.submittedAt) : ""}
        {r.autoSubmitted ? " · submitted automatically when time ran out" : ""}
      </p>

      {r.kind === "formative" ? (
        <>
          {r.score ? (
            <>
              <p className={styles.score}>
                {r.score.raw} / {r.score.max}
              </p>
              <p className={styles.muted}>
                {Math.round((r.score.raw / r.score.max) * 100)}% · practice pass mark {r.passMarkPercent}%. Practice
                assessments don&apos;t count towards competence.
              </p>
            </>
          ) : null}
          {r.items ? (
            <ol className={styles.list} aria-label="Your answers">
              {r.items.map((it) => (
                <li key={it.position} className={styles.check}>
                  <p className={it.isCorrect ? styles.verdictOk : styles.verdictBad}>
                    <Icon name={it.isCorrect ? "correct" : "wrong"} />
                    Question {it.position}: {it.isCorrect ? "Correct" : "Not quite"}
                  </p>
                  <p className={styles.stem}>{it.stem}</p>
                  <div className={styles.fieldset}>
                    {it.options.map((o, i) => (
                      <div
                        key={i}
                        className={`${styles.optionResult} ${o.correct ? styles.optionCorrect : o.chosen ? styles.optionWrong : ""}`}
                      >
                        <span aria-hidden="true">{o.correct ? <Icon name="correct" /> : o.chosen ? <Icon name="wrong" /> : null}</span>
                        <span>{o.label}</span>
                        {o.correct || o.chosen ? (
                          <span className={styles.resultTag}>
                            {o.correct && o.chosen ? "Your answer · correct" : o.correct ? "Correct answer" : "Your answer"}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  {it.explanation ? <p>{it.explanation}</p> : null}
                </li>
              ))}
            </ol>
          ) : null}
        </>
      ) : r.released ? (
        <>
          <p className={r.released.outcome === "competent" ? styles.verdictOk : styles.verdictBad}>
            <Icon name={r.released.outcome === "competent" ? "done" : "note"} size={24} />
            {r.released.outcome === "competent" ? "Competent" : "Not yet competent"}
          </p>
          <section className={styles.card} aria-labelledby="feedback-title">
            <h2 id="feedback-title" className={styles.cardTitle}>
              Feedback from your assessor
            </h2>
            <p style={{ whiteSpace: "pre-line" }}>{r.released.feedback}</p>
            <p className={styles.hint}>Released {dateFmt.format(r.released.releasedAt)}</p>
          </section>
          <section id="appeal" className={styles.card} aria-labelledby="appeal-title">
            <h2 id="appeal-title" className={styles.cardTitle}>
              Appeal this result
            </h2>
            {sp.appealed ? (
              <p role="status" className={styles.verdictOk}>
                <Icon name="done" /> Your appeal was sent. A moderator will review it.
              </p>
            ) : null}
            {sp.error && APPEAL_ERRORS[sp.error] ? (
              <p role="alert" className={styles.alert}>
                {APPEAL_ERRORS[sp.error]}
              </p>
            ) : null}
            {r.released.appeal.state === "can_appeal" ? (
              <form action={appealAction} className={styles.stack}>
                <input type="hidden" name="attemptId" value={attemptId} />
                <div className={styles.field}>
                  <label htmlFor="reason">Why do you think the result is wrong?</label>
                  <textarea id="reason" name="reason" className={styles.answerText} required maxLength={4000} />
                </div>
                <p className={styles.hint}>You can appeal until {dateFmt.format(r.released.appeal.closesAt)}.</p>
                <button type="submit" className={styles.secondary}>
                  Send appeal
                </button>
              </form>
            ) : r.released.appeal.state === "submitted" ? (
              <p>
                {r.released.appeal.status === "open"
                  ? "Your appeal is with a moderator."
                  : r.released.appeal.status === "upheld"
                    ? "A moderator reviewed your appeal and the result stands."
                    : "A moderator reviewed your appeal and arranged a reassessment. Your facilitator will tell you when."}
                {r.released.appeal.outcomeNotes ? ` ${r.released.appeal.outcomeNotes}` : ""}
              </p>
            ) : (
              <p className={styles.muted}>The appeal period for this result has ended.</p>
            )}
          </section>
        </>
      ) : (
        <p role="status" className={styles.verdictOk}>
          <Icon name="done" /> Submitted. Your results appear after moderation.
        </p>
      )}
    </div>
  );
}
