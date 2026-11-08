import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AttemptTimer } from "@/components/assess/AttemptTimer";
import { QuestionForm } from "@/components/assess/QuestionForm";
import { Icon } from "@/components/Icon";
import styles from "@/components/learn/learn.module.css";
import { AssessmentError, getAttemptView } from "@/lib/server/assessments";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Assessment" };
export const dynamic = "force-dynamic";

// TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
const ERRORS: Record<string, string> = {
  invalid_answer: "That answer couldn't be saved. Please choose again.",
  paused: "Your assessor has paused this attempt. Wait for them to resume it.",
  rate_limited: "Too many saves in a short time. Wait a moment and try again.",
};

/** L10 attempt: one question per screen + navigator; autosave; server timer. */
export default async function AttemptPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ q?: string; error?: string }>;
}) {
  const { attemptId } = await params;
  const sp = await searchParams;
  const { ctx, actor } = await requirePage(`/learn/attempt/${attemptId}`);
  const position = Math.max(1, Number.parseInt(sp.q ?? "1", 10) || 1);
  let view;
  try {
    view = await getAttemptView(ctx, actor, attemptId, position);
  } catch (e) {
    if (e instanceof AssessmentError) notFound();
    throw e;
  }
  if (view.state === "submitted") redirect(`/learn/attempt/${attemptId}/result`);
  const q = view.question;
  const answered = view.nav.filter((n) => n.answered).length;

  return (
    <div className={styles.attemptShell}>
      <header className={styles.attemptHeader}>
        <h1 className={styles.attemptTitle}>{view.title}</h1>
        <div className={styles.attemptMeta}>
          {view.deadlineAt ? (
            <AttemptTimer deadlineAt={view.deadlineAt} serverNow={ctx.now().toISOString()} paused={view.paused} />
          ) : null}
        </div>
      </header>

      {view.paused ? (
        <p role="status" className={styles.alert}>
          <Icon name="pause" /> Your assessor has paused this attempt. The clock has stopped. Reload when they resume it.
        </p>
      ) : null}
      {sp.error && ERRORS[sp.error] ? (
        <p role="alert" className={styles.alert}>
          {ERRORS[sp.error]}
        </p>
      ) : null}

      <QuestionForm
        key={q.position}
        attemptId={attemptId}
        position={q.position}
        total={q.total}
        type={q.type}
        stem={q.stem}
        options={q.options}
        chosenTokens={q.chosenTokens}
        responseText={q.responseText}
        flagged={q.flagged}
        disabled={view.paused}
      />

      <nav className={styles.navigator} aria-label="Questions">
        <p className={styles.hint}>
          {answered} of {q.total} answered
        </p>
        <ol className={styles.navGrid}>
          {view.nav.map((n) => (
            <li key={n.position}>
              <a
                href={`/learn/attempt/${attemptId}?q=${n.position}`}
                className={`${styles.navCell} ${n.answered ? styles.navAnswered : ""}`}
                aria-current={n.position === q.position ? "step" : undefined}
                aria-label={`Question ${n.position}${n.answered ? ", answered" : ", not answered"}${n.flagged ? ", flagged" : ""}`}
              >
                <span>{n.position}</span>
                <span aria-hidden="true">{n.flagged ? "⚑" : n.answered ? "✓" : "○"}</span>
              </a>
            </li>
          ))}
        </ol>
        <p className={styles.navLegend} aria-hidden="true">
          <span>✓ answered</span>
          <span>○ not answered</span>
          <span>⚑ flagged</span>
        </p>
        <a href={`/learn/attempt/${attemptId}/review`} className={styles.secondary}>
          Review &amp; submit
        </a>
      </nav>
    </div>
  );
}
