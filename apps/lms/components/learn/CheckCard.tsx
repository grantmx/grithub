import { retryCheckAction, submitCheckAction } from "@/app/(learn)/actions";
import type { CheckView } from "@/lib/server/sectionCheck";
import { Icon } from "../Icon";
import styles from "./learn.module.css";

// TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
const NOTICES: Record<string, string> = {
  choose: "Choose an answer first.",
  required: "Answer the check question before marking this section complete.",
  error: "That didn't work. Please try again.",
};

/**
 * Section check (design.md "Check card states"). Server-rendered forms: the
 * browser only ever receives option tokens and labels for an unanswered
 * question; correctness and the explanation appear after submitting.
 */
export function CheckCard({
  sectionId,
  view,
  notice,
}: {
  sectionId: string;
  view: CheckView;
  notice?: string;
}) {
  if (view.state === "none") return null;
  const triesLeft = view.maxAttempts - view.attemptNo;

  return (
    <section id="check" className={styles.check} aria-labelledby="check-title">
      <div className={styles.checkHeader}>
        <h2 id="check-title" className={styles.checkTitle}>
          Check your understanding
        </h2>
        <span className={styles.hint}>
          Question {view.attemptNo} of up to {view.maxAttempts}
        </span>
      </div>
      {notice && NOTICES[notice] ? (
        <p role="alert" className={styles.alert}>
          {NOTICES[notice]}
        </p>
      ) : null}

      {view.state === "question" ? (
        <form action={submitCheckAction} className={styles.stack}>
          <input type="hidden" name="sectionId" value={sectionId} />
          <input type="hidden" name="attemptId" value={view.attemptId} />
          <fieldset className={styles.fieldset}>
            <legend className={styles.stem}>{view.stem}</legend>
            {view.options.map((o) => (
              <label key={o.token} className={styles.option}>
                <input type="radio" name="token" value={o.token} required />
                <span>{o.label}</span>
              </label>
            ))}
          </fieldset>
          <button type="submit" className={styles.button}>
            Check answer
          </button>
        </form>
      ) : (
        <div className={styles.stack} aria-live="polite">
          <p className={view.correct ? styles.verdictOk : styles.verdictBad}>
            <Icon name={view.correct ? "correct" : "wrong"} size={24} />
            {view.correct ? "Correct" : "Not quite"}
          </p>
          <fieldset className={styles.fieldset}>
            <legend className={styles.stem}>{view.stem}</legend>
            {view.options.map((o) => {
              const isCorrect = o.token === view.correctToken;
              const isChosen = o.token === view.chosenToken;
              return (
                <div
                  key={o.token}
                  className={`${styles.optionResult} ${isCorrect ? styles.optionCorrect : isChosen ? styles.optionWrong : ""}`}
                >
                  <span aria-hidden="true">
                    {isCorrect ? (
                      <Icon name="correct" />
                    ) : isChosen ? (
                      <Icon name="wrong" />
                    ) : null}
                  </span>
                  <span>{o.label}</span>
                  {isCorrect || isChosen ? (
                    <span className={styles.resultTag}>
                      {isCorrect && isChosen
                        ? "Your answer · correct"
                        : isCorrect
                          ? "Correct answer"
                          : "Your answer"}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </fieldset>
          {view.explanation ? <p>{view.explanation}</p> : null}
          {view.canRetry ? (
            <form action={retryCheckAction}>
              <input type="hidden" name="sectionId" value={sectionId} />
              <button type="submit" className={styles.secondary}>
                Try again ({triesLeft} left)
              </button>
            </form>
          ) : null}
        </div>
      )}
    </section>
  );
}
