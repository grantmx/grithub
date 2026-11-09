import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AssessmentsBlock } from "@/components/assess/AssessmentsBlock";
import { LiveSessionsBlock } from "@/components/comms/learner/LiveSessionsBlock";
import { PracticalBlock } from "@/components/practical/PracticalBlock";
import { Icon } from "@/components/Icon";
import styles from "@/components/learn/learn.module.css";
import { listAssessments } from "@/lib/server/assessments";
import { learnerBoardSummaries } from "@/lib/server/discussions";
import { learnerSessions } from "@/lib/server/liveSessions";
import { LearningError, getProgramme } from "@/lib/server/learning";
import { listPracticalTasks } from "@/lib/server/practical";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Programme" };

const STATE_TEXT = {
  complete: "Complete",
  in_progress: "In progress",
  not_started: "Not started",
} as const;

/** Programme page (L5/L6): modules with sections, checkmarks and progress. */
export default async function ProgrammePage({
  params,
}: {
  params: Promise<{ qualificationId: string }>;
}) {
  const { qualificationId } = await params;
  const { ctx, actor } = await requirePage(`/learn/${qualificationId}`);
  let data;
  try {
    data = await getProgramme(ctx, actor, qualificationId);
  } catch (e) {
    if (e instanceof LearningError) notFound();
    throw e;
  }
  const { qualification, outline, continueTo } = data;
  const assessments = await listAssessments(ctx, actor, qualificationId);
  const practicalTasks = await listPracticalTasks(ctx, actor, qualificationId);
  const [boards, sessions] = await Promise.all([
    learnerBoardSummaries(ctx, actor, qualificationId),
    learnerSessions(ctx, actor, qualificationId),
  ]);

  return (
    <div className={styles.stack}>
      <p className={styles.crumb}>
        <a href="/learn" className={styles.textLink}>
          Learn
        </a>{" "}
        › {qualification.title}
      </p>
      <h1 className={styles.pageTitle}>{qualification.title}</h1>
      {continueTo ? (
        <a
          className={styles.button}
          href={`/learn/section/${continueTo.sectionId}${continueTo.resume ? "?resume=1" : ""}`}
        >
          Continue <Icon name="next" />
        </a>
      ) : null}

      <AssessmentsBlock items={assessments} />
      <PracticalBlock items={practicalTasks} />
      <LiveSessionsBlock sessions={sessions} />

      {outline.map((m) => {
        const pct = m.sections.length
          ? Math.round((m.completed / m.sections.length) * 100)
          : 0;
        return (
          <section
            key={m.id}
            className={styles.card}
            aria-labelledby={`mod-${m.id}`}
          >
            <h2 id={`mod-${m.id}`} className={styles.cardTitle}>
              {m.code}: {m.title}
            </h2>
            <p className={styles.muted}>
              {m.type === "knowledge" ? "Knowledge module" : "Practical module"}{" "}
              · {m.completed} of {m.sections.length} sections
              {m.sections.length > 0 && m.completed === m.sections.length
                ? " · Learning complete"
                : ""}
            </p>
            <div
              className={styles.progress}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={m.sections.length}
              aria-valuenow={m.completed}
              aria-label={`${m.completed} of ${m.sections.length} sections complete`}
            >
              <div
                className={styles.progressFill}
                style={{ width: `${pct}%` }}
              />
            </div>
            <ol className={styles.list}>
              {m.sections.map((s, i) => (
                <li key={s.id} className={styles.listItem}>
                  <span
                    className={
                      s.state === "complete" ? styles.stateDone : undefined
                    }
                  >
                    <Icon
                      name={
                        s.state === "complete"
                          ? "done"
                          : s.state === "in_progress"
                            ? "inProgress"
                            : "notStarted"
                      }
                    />
                  </span>
                  <a
                    href={`/learn/section/${s.id}`}
                    className={styles.textLink}
                  >
                    {i + 1}. {s.title}
                  </a>
                  <span className={styles.srOnly}>({STATE_TEXT[s.state]})</span>
                </li>
              ))}
            </ol>
            <a href={`/learn/discuss/${m.id}`} className={styles.textLink}>
              <Icon name="messages" /> Discussion · {boards.get(m.id) ?? 0}{" "}
              {(boards.get(m.id) ?? 0) === 1 ? "thread" : "threads"}{" "}
              <span aria-hidden="true">›</span>
            </a>
          </section>
        );
      })}
    </div>
  );
}
