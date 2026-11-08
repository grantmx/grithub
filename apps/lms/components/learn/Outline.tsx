import type { OutlineModule, SectionState } from "@/lib/server/learning";
import { Icon } from "../Icon";
import { OutlineAutoOpen } from "./OutlineAutoOpen";
import styles from "./learn.module.css";

const STATE_LABEL: Record<SectionState, string> = {
  complete: "complete",
  in_progress: "in progress",
  not_started: "not started",
};

/**
 * Module outline (design.md L7): grouped by module, current module expanded,
 * checkmarks per section. Open by default from 900px (OutlineAutoOpen), a
 * collapsible "Outline" button on phones.
 */
export function Outline({
  outline,
  currentSectionId,
}: {
  outline: OutlineModule[];
  currentSectionId: string;
}) {
  return (
    <details className={styles.outline} id="outline">
      <OutlineAutoOpen targetId="outline" />
      <summary>
        <Icon name="outline" />
        Outline
      </summary>
      <nav aria-label="Programme outline" className={styles.outlineBody}>
        {outline.map((m) => {
          const current = m.sections.some((s) => s.id === currentSectionId);
          const pct = m.sections.length
            ? Math.round((m.completed / m.sections.length) * 100)
            : 0;
          return (
            <details key={m.id} className={styles.outlineModule} open={current}>
              <summary>
                {m.code}: {m.title}
              </summary>
              <ol className={styles.list}>
                {m.sections.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`/learn/section/${s.id}`}
                      className={styles.outlineLink}
                      aria-current={
                        s.id === currentSectionId ? "page" : undefined
                      }
                    >
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
                      <span>
                        {i + 1}. {s.title}
                        <span className={styles.srOnly}>
                          {" "}
                          ({STATE_LABEL[s.state]})
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
              <div
                className={styles.progress}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={m.sections.length}
                aria-valuenow={m.completed}
                aria-label={`${m.code}: ${m.completed} of ${m.sections.length} sections complete`}
              >
                <div
                  className={styles.progressFill}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </details>
          );
        })}
      </nav>
    </details>
  );
}
