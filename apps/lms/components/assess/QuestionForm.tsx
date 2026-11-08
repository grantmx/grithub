"use client";

import { useEffect, useRef, useState } from "react";
import { autosaveAction, saveAndGoAction } from "@/app/(learn)/assess-actions";
import type { LearnerOption } from "@/lib/server/assessments";
import { Icon } from "../Icon";
import styles from "../learn/learn.module.css";

type Answer = { tokens?: string[]; text?: string };
type SaveState = "idle" | "saving" | "saved" | "retrying";

/**
 * One question (design.md L10). A plain form: Previous / Next / Review and
 * the flag post to the server, saving the answer on the way, so it works
 * without JavaScript. With JavaScript every change is also autosaved; if the
 * connection drops the answer stays on screen and is retried
 * ("Not saved – reconnecting").
 */
export function QuestionForm({
  attemptId,
  position,
  total,
  type,
  stem,
  options,
  chosenTokens,
  responseText,
  flagged,
  disabled,
}: {
  attemptId: string;
  position: number;
  total: number;
  type: "single" | "multi" | "short_answer";
  stem: string;
  options: LearnerOption[];
  chosenTokens: string[];
  responseText: string;
  flagged: boolean;
  disabled: boolean;
}) {
  const [state, setState] = useState<SaveState>("idle");
  const pending = useRef<Answer | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const textTimer = useRef<number | undefined>(undefined);

  // The save loop lives in a ref so retries can call it again.
  const flushRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    const retry = () => {
      setState("retrying");
      timer.current = window.setTimeout(() => void flushRef.current(), 5000);
    };
    flushRef.current = async () => {
      const answer = pending.current;
      if (!answer) return;
      setState("saving");
      try {
        const res = await autosaveAction(attemptId, position, answer);
        if (res.ok) {
          if (pending.current === answer) pending.current = null;
          setState("saved");
        } else if (res.code === "time_up" || res.code === "submitted") {
          window.location.assign(`/learn/attempt/${attemptId}/result`);
        } else if (res.code === "paused") {
          window.location.reload();
        } else {
          retry();
        }
      } catch {
        // Network error: keep the answer on screen and try again.
        retry();
      }
    };
    const online = () => void flushRef.current();
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("online", online);
      window.clearTimeout(timer.current);
      window.clearTimeout(textTimer.current);
    };
  }, [attemptId, position]);

  const queue = (answer: Answer, delay = 0) => {
    pending.current = answer;
    window.clearTimeout(timer.current);
    window.clearTimeout(textTimer.current);
    if (delay) textTimer.current = window.setTimeout(() => void flushRef.current(), delay);
    else void flushRef.current();
  };

  const onChoice = (form: HTMLFormElement) => {
    const tokens = new FormData(form).getAll("token").map(String);
    queue({ tokens });
  };

  const legendId = `q-${position}-stem`;
  return (
    <form action={saveAndGoAction} className={styles.stack}>
      <input type="hidden" name="attemptId" value={attemptId} />
      <input type="hidden" name="position" value={position} />
      <input type="hidden" name="type" value={type} />

      <div className={styles.questionHead}>
        <p className={styles.hint}>
          Question {position} of {total}
        </p>
        <button
          type="submit"
          name="go"
          value={flagged ? "unflag" : "flag"}
          className={styles.flagButton}
          aria-pressed={flagged}
          disabled={disabled}
        >
          <Icon name="flag" /> {flagged ? "Flagged" : "Flag"}
        </button>
      </div>

      {type === "short_answer" ? (
        <div className={styles.field}>
          <label id={legendId} htmlFor={`answer-${position}`} className={styles.stem}>
            {stem}
          </label>
          <textarea
            id={`answer-${position}`}
            name="text"
            className={styles.answerText}
            defaultValue={responseText}
            maxLength={5000}
            disabled={disabled}
            onChange={(e) => queue({ text: e.currentTarget.value }, 1200)}
            onBlur={() => void flushRef.current()}
          />
        </div>
      ) : (
        <fieldset
          className={styles.fieldset}
          disabled={disabled}
          onChange={(e) => onChoice(e.currentTarget.form!)}
        >
          <legend className={styles.stem}>{stem}</legend>
          {type === "multi" ? <p className={styles.hint}>Choose all that apply.</p> : null}
          {options.map((o) => (
            <label key={o.token} className={styles.option}>
              <input
                type={type === "multi" ? "checkbox" : "radio"}
                name="token"
                value={o.token}
                defaultChecked={chosenTokens.includes(o.token)}
              />
              <span>{o.label}</span>
            </label>
          ))}
        </fieldset>
      )}

      <p className={styles.hint} aria-live="polite">
        {state === "saving" ? (
          <span className={styles.saveState}>Saving…</span>
        ) : state === "saved" ? (
          <span className={styles.saveState}>
            <Icon name="saved" /> Saved
          </span>
        ) : state === "retrying" ? (
          <span className={`${styles.saveState} ${styles.saveBad}`}>
            <Icon name="offline" /> Not saved – reconnecting. Keep this page open.
          </span>
        ) : null}
      </p>

      <div className={styles.pager}>
        <button
          type="submit"
          name="go"
          value={String(position - 1)}
          className={styles.secondary}
          disabled={disabled || position <= 1}
        >
          <Icon name="back" /> Previous
        </button>
        {position < total ? (
          <button type="submit" name="go" value={String(position + 1)} className={styles.button} disabled={disabled}>
            Next <Icon name="next" />
          </button>
        ) : (
          <button type="submit" name="go" value="review" className={styles.button} disabled={disabled}>
            Review answers <Icon name="next" />
          </button>
        )}
      </div>
    </form>
  );
}
