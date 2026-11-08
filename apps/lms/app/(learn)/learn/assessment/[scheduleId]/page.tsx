import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { beginAttemptAction } from "@/app/(learn)/assess-actions";
import { Icon } from "@/components/Icon";
import styles from "@/components/learn/learn.module.css";
import { AssessmentError, getStartInfo } from "@/lib/server/assessments";
import { LearningError } from "@/lib/server/learning";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Assessment" };

// TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
const REASONS: Record<string, string> = {
  not_open: "This assessment hasn't opened yet.",
  closed: "This assessment has closed.",
  needs_unlock: "Your assessor opens this paper on the assessment day, after checking your ID.",
  no_attempts_left: "You've used all your attempts for this assessment.",
  awaiting_result: "Your last attempt is still being marked. You can try again once your result is out.",
  pool_too_small: "This assessment isn't ready yet. Please tell your facilitator.",
  rate_limited: "Too many tries. Please wait a few minutes.",
};

/** Start screen: what it covers, time, attempts; Begin starts the timer. */
export default async function StartPage({
  params,
  searchParams,
}: {
  params: Promise<{ scheduleId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { scheduleId } = await params;
  const { error } = await searchParams;
  const { ctx, actor } = await requirePage(`/learn/assessment/${scheduleId}`);
  let info;
  try {
    info = await getStartInfo(ctx, actor, scheduleId);
  } catch (e) {
    if (e instanceof AssessmentError || e instanceof LearningError) notFound();
    throw e;
  }
  if (info.inProgressAttemptId) redirect(`/learn/attempt/${info.inProgressAttemptId}`);
  const message = (error && REASONS[error]) || (info.reason && REASONS[info.reason]) || null;

  return (
    <div className={styles.attemptShell}>
      <p className={styles.crumb}>
        <a href={`/learn/${info.qualificationId}`} className={styles.textLink}>
          Programme
        </a>{" "}
        › Assessments
      </p>
      <h1 className={styles.pageTitle}>
        {info.moduleCode} {info.title}
      </h1>
      <ul className={styles.list}>
        <li className={styles.listItem}>
          <Icon name="assessment" /> {info.kind === "summative" ? "Summative assessment" : "Practice (formative) assessment"} ·{" "}
          {info.questionCount} questions
        </li>
        <li className={styles.listItem}>
          <Icon name="timer" />
          {info.timeLimitMinutes
            ? `${info.timeLimitMinutes} minutes. The clock starts when you press Begin and keeps running if you leave.`
            : "No time limit."}
        </li>
        <li className={styles.listItem}>
          <Icon name="saved" /> Your answers save as you go. If your connection drops, reconnect and carry on, on any device.
        </li>
        <li className={styles.listItem}>
          <Icon name="done" />
          {info.attemptNo
            ? `This is attempt ${info.attemptNo} of ${info.attemptsAllowed}.`
            : `${info.attemptsAllowed} attempt${info.attemptsAllowed === 1 ? "" : "s"} allowed.`}
        </li>
        {info.kind === "formative" ? (
          <li className={styles.listItem}>
            <Icon name="tip" /> You&apos;ll see your score and the answers when you submit.
          </li>
        ) : (
          <li className={styles.listItem}>
            <Icon name="note" /> Results appear after your assessor&apos;s decision has been moderated.
          </li>
        )}
      </ul>
      {message ? (
        <p role="alert" className={styles.alert}>
          {message}
        </p>
      ) : null}
      {info.canBegin ? (
        <form action={beginAttemptAction}>
          <input type="hidden" name="scheduleId" value={scheduleId} />
          <button type="submit" className={styles.button}>
            Begin <Icon name="next" />
          </button>
        </form>
      ) : null}
    </div>
  );
}
