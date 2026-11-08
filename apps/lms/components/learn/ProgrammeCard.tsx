import type { ProgrammeSummary } from "@/lib/server/learning";
import { Icon } from "../Icon";
import styles from "./learn.module.css";

const STATUS: Record<ProgrammeSummary["status"], string> = {
  not_started: "Not started",
  in_progress: "In progress",
  learning_complete: "Learning complete",
};

/** One card per programme (Home and Learn): status, progress and Continue. */
export function ProgrammeCard({ p }: { p: ProgrammeSummary }) {
  const pct = p.totalSections
    ? Math.round((p.completedSections / p.totalSections) * 100)
    : 0;
  const continueHref = p.continueTo
    ? `/learn/section/${p.continueTo.sectionId}${p.continueTo.resume ? "?resume=1" : ""}`
    : `/learn/${p.qualificationId}`;
  return (
    <article className={styles.card} aria-labelledby={`prog-${p.enrolmentId}`}>
      <h2 id={`prog-${p.enrolmentId}`} className={styles.cardTitle}>
        <a href={`/learn/${p.qualificationId}`} className={styles.textLink}>
          {p.qualificationTitle}
        </a>
      </h2>
      <p className={styles.muted}>{p.cohortName}</p>
      <p
        className={`${styles.status} ${p.status === "learning_complete" ? styles.statusDone : ""}`}
      >
        <Icon
          name={
            p.status === "learning_complete"
              ? "done"
              : p.status === "in_progress"
                ? "inProgress"
                : "notStarted"
          }
        />
        {STATUS[p.status]}
      </p>
      <div
        className={styles.progress}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={p.totalSections}
        aria-valuenow={p.completedSections}
        aria-label={`${p.completedSections} of ${p.totalSections} sections complete`}
      >
        <div className={styles.progressFill} style={{ width: `${pct}%` }} />
      </div>
      <p className={styles.muted}>
        {p.completedSections} of {p.totalSections} sections ·{" "}
        {p.modulesLearningComplete} of {p.modulesTotal} modules learning
        complete
        {p.modulesCompetent > 0
          ? ` · ${p.modulesCompetent} assessed competent`
          : ""}
      </p>
      {p.continueTo ? (
        <a className={styles.button} href={continueHref}>
          {p.status === "not_started" ? "Start" : "Continue"}
          <Icon name="next" />
        </a>
      ) : null}
    </article>
  );
}
