import type { Metadata } from "next";
import { ModerationNote } from "@/components/assess/ModerationNote";
import styles from "@/components/assess/staff.module.css";
import ui from "@/components/ui.module.css";
import { markFeedbackSeen, moderationFeedback } from "@/lib/server/moderation";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Moderation feedback" };

/**
 * Assessor: every moderation outcome on my decisions, newest first, with what
 * I still need to do (design.md §14, 2026-11-08). Opening it clears the badge.
 */
export default async function ModerationFeedbackPage({ searchParams }: { searchParams: Promise<{ done?: string; error?: string }> }) {
  const sp = await searchParams;
  const path = "/staff/moderation-feedback";
  const { ctx, actor } = await requirePage(path);
  const rows = await moderationFeedback(ctx, actor);
  await markFeedbackSeen(ctx, actor);
  const todo = rows.filter((r) => r.todo).length;

  return (
    <div className={ui.stack}>
      <h1 className={ui.h1} style={{ margin: 0 }}>
        Moderation feedback
      </h1>
      {sp.done === "actions_done" ? (
        <p role="status" className={ui.bannerSuccess}>
          Actions marked done. The moderator can now release the results.
        </p>
      ) : null}
      {sp.error ? (
        <p role="alert" className={ui.bannerError}>
          {sp.error}
        </p>
      ) : null}
      <p className={ui.hint}>
        {rows.length === 0
          ? "No moderation outcomes on your decisions yet."
          : todo
            ? `${todo} need${todo === 1 ? "s" : ""} something from you.`
            : "Nothing needs your attention."}
      </p>
      <ol className={styles.history}>
        {rows.map((r) => (
          <li key={r.id} className={styles.panel}>
            <div className={ui.spread}>
              <strong>
                {r.unseen ? <span className={ui.statusWarn}>● New · </span> : null}
                {r.learnerName} · {r.title}
              </strong>
              <a href={r.href}>Open decision →</a>
            </div>
            <div className={ui.hint}>
              {r.cohortName} · your decision: {r.decisionOutcome === "competent" ? "Competent" : "Not yet competent"}
            </div>
            {r.todo === "redecide" ? (
              <p className={ui.statusBad} style={{ margin: 0 }}>
                To do: record a new decision, then the moderator checks it again.
              </p>
            ) : null}
            <ModerationNote m={r} actionsForm={r.todo === "actions"} back={path} />
          </li>
        ))}
      </ol>
    </div>
  );
}
