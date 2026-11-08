import type { AssessmentListItem } from "@/lib/server/assessments";
import { Icon } from "../Icon";
import styles from "../learn/learn.module.css";

const dateFmt = new Intl.DateTimeFormat("en-ZA", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Johannesburg",
});

// TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
function statusLine(a: AssessmentListItem): string {
  switch (a.state) {
    case "open":
      return `Open · closes ${dateFmt.format(a.closesAt)}`;
    case "in_progress":
      return "In progress · your answers are saved";
    case "upcoming":
      return `Opens ${dateFmt.format(a.opensAt)}`;
    case "awaiting_unlock":
      return `${dateFmt.format(a.opensAt)} · opened by your assessor on the day`;
    case "closed":
      return "Closed";
    case "done":
      if (a.kind === "formative" && a.score) return `Done · ${a.score.raw}/${a.score.max}`;
      if (a.outcome) return a.outcome === "competent" ? "Result: Competent" : "Result: Not yet competent";
      return a.awaitingResult ? "Submitted · results appear after moderation" : "Done";
  }
}

/** Programme page › Assessments (design.md L9): open, upcoming and done. */
export function AssessmentsBlock({ items }: { items: AssessmentListItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className={styles.card} aria-labelledby="assessments-title">
      <h2 id="assessments-title" className={styles.cardTitle}>
        Assessments
      </h2>
      <ul className={styles.assessList}>
        {items.map((a) => {
          const icon =
            a.state === "done" ? "done" : a.state === "open" || a.state === "in_progress" ? "assessment" : "lock";
          const href =
            a.state === "in_progress" || a.state === "open"
              ? `/learn/assessment/${a.scheduleId}`
              : a.state === "done" && a.latestAttemptId
                ? `/learn/attempt/${a.latestAttemptId}/result`
                : `/learn/assessment/${a.scheduleId}`;
          return (
            <li key={a.scheduleId} className={styles.assessItem}>
              <span className={styles.assessTitle}>
                <span className={a.state === "done" ? styles.stateDone : undefined}>
                  <Icon name={icon} />
                </span>
                <a href={href} className={styles.textLink}>
                  {a.moduleCode} {a.title}
                </a>
              </span>
              <span className={styles.hint}>
                {statusLine(a)}
                {" · "}
                {a.kind === "summative" ? "Summative" : "Practice"} · {a.questionCount} questions
                {a.timeLimitMinutes ? ` · ${a.timeLimitMinutes} min` : ""} · {a.attemptsUsed} of{" "}
                {a.attemptsAllowed} attempts used
              </span>
              {a.state === "open" || a.state === "in_progress" ? (
                <span className={styles.hint}>Needs a connection.</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
