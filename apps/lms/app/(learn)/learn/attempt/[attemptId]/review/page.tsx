import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { submitAttemptAction } from "@/app/(learn)/assess-actions";
import { AttemptTimer } from "@/components/assess/AttemptTimer";
import { Icon } from "@/components/Icon";
import styles from "@/components/learn/learn.module.css";
import { AssessmentError, getAttemptView } from "@/lib/server/assessments";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Review answers" };
export const dynamic = "force-dynamic";

/** Review before submit: answered / flagged / blank, then a clear final submit. */
export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { attemptId } = await params;
  const { error } = await searchParams;
  const { ctx, actor } = await requirePage(`/learn/attempt/${attemptId}/review`);
  let view;
  try {
    view = await getAttemptView(ctx, actor, attemptId, 1);
  } catch (e) {
    if (e instanceof AssessmentError) notFound();
    throw e;
  }
  if (view.state === "submitted") redirect(`/learn/attempt/${attemptId}/result`);
  const blank = view.nav.filter((n) => !n.answered).length;
  const flagged = view.nav.filter((n) => n.flagged).length;

  return (
    <div className={styles.attemptShell}>
      <header className={styles.attemptHeader}>
        <h1 className={styles.attemptTitle}>{view.title}: review</h1>
        {view.deadlineAt ? (
          <AttemptTimer deadlineAt={view.deadlineAt} serverNow={ctx.now().toISOString()} paused={view.paused} />
        ) : null}
      </header>
      <p>
        {view.nav.length - blank} of {view.nav.length} answered
        {flagged ? ` · ${flagged} flagged` : ""}
        {blank ? ` · ${blank} not answered` : ""}
      </p>
      <ol className={styles.reviewList}>
        {view.nav.map((n) => (
          <li key={n.position}>
            <a href={`/learn/attempt/${attemptId}?q=${n.position}`} className={styles.reviewRow}>
              <span>Question {n.position}</span>
              <span className={styles.hint}>
                {n.flagged ? "⚑ Flagged · " : ""}
                {n.answered ? "✓ Answered" : "○ Not answered"}
              </span>
            </a>
          </li>
        ))}
      </ol>
      {error === "paused" ? (
        <p role="alert" className={styles.alert}>
          Your assessor has paused this attempt.
        </p>
      ) : error ? (
        <p role="alert" className={styles.alert}>
          That didn&apos;t work. Please try again.
        </p>
      ) : null}
      <form action={submitAttemptAction} className={styles.stack}>
        <input type="hidden" name="attemptId" value={attemptId} />
        <p className={styles.hint}>
          {/* TODO(copy) */}
          You can&apos;t change your answers after you submit.
          {blank ? " Questions you haven't answered will be marked wrong." : ""}
        </p>
        <button type="submit" className={styles.button} disabled={view.paused}>
          Submit answers <Icon name="next" />
        </button>
      </form>
    </div>
  );
}
