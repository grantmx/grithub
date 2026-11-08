import type { PracticalStatus, PracticalTask } from "@/lib/server/practical";
import { Icon } from "../Icon";
import styles from "../learn/learn.module.css";

const dateFmt = new Intl.DateTimeFormat("en-ZA", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Johannesburg" });

// TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
export const PRACTICAL_STATUS: Record<PracticalStatus, string> = {
  not_started: "Not started",
  draft: "Draft (not submitted)",
  submitted: "Submitted · being assessed",
  competent: "Competent",
  not_yet_competent: "Not yet competent",
  observed_upcoming: "Observed on the assessment day",
  upcoming: "Opens soon",
  closed: "Closed",
};

/** Programme page › Practical tasks (design.md L8 entry). */
export function PracticalBlock({ items }: { items: PracticalTask[] }) {
  if (items.length === 0) return null;
  return (
    <section className={styles.card} aria-labelledby="practical-title">
      <h2 id="practical-title" className={styles.cardTitle}>
        Practical tasks
      </h2>
      <ul className={styles.assessList}>
        {items.map((t) => (
          <li key={t.scheduleId} className={styles.assessItem}>
            <span className={styles.assessTitle}>
              <span className={t.status === "competent" ? styles.stateDone : undefined}>
                <Icon name={t.status === "competent" ? "done" : t.mode === "observed" ? "observe" : "practical"} />
              </span>
              <a href={`/learn/practical/${t.scheduleId}`} className={styles.textLink}>
                {t.moduleCode} {t.title}
              </a>
            </span>
            <span className={styles.hint}>
              {PRACTICAL_STATUS[t.status]}
              {t.mode === "observed" ? ` · ${dateFmt.format(t.opensAt)}` : t.status === "not_started" || t.status === "draft" ? ` · due ${dateFmt.format(t.closesAt)}` : ""}
              {" · "}
              {t.attemptsUsed} of {t.attemptsAllowed} attempts used
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
