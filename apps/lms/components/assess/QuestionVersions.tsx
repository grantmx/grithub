import styles from "@/components/assess/staff.module.css";
import ui from "@/components/ui.module.css";
import type { MaterialQuestion } from "@/lib/server/materials";

const dateFmt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeZone: "Africa/Johannesburg" });

/** Read-only: each question with every version (newest first), keys, rubric and explanation. */
export function QuestionVersions({ questions }: { questions: MaterialQuestion[] }) {
  if (!questions.length) return <p className={ui.muted}>No questions yet.</p>;
  return (
    <ol className={styles.paper}>
      {questions.map((q, i) => (
        <li key={q.id} className={styles.item}>
          <div className={styles.itemBody}>
            <p className={ui.hint} style={{ margin: 0 }}>
              Question {i + 1} · {q.status}
            </p>
            {q.versions.map((v) => (
              <details key={v.id} open={v.current}>
                <summary>
                  Version {v.versionNo}
                  {v.current ? " (current)" : ""} · {v.type === "short_answer" ? `short answer, ${v.maxMarks} marks` : v.type}
                  {v.firstServedAt ? ` · first served ${dateFmt.format(v.firstServedAt)}` : " · not served yet"}
                </summary>
                <p className={styles.stem}>{v.stem}</p>
                {v.options.length ? (
                  <ul className={styles.options}>
                    {v.options.map((o) => (
                      <li key={o.id} className={`${styles.opt} ${o.correct ? styles.optKey : ""}`}>
                        {o.label}
                        <span className={ui.hint}>
                          {o.correct ? " · Key" : ""}
                          {o.pinned ? " · pinned position" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {v.criteria.length ? (
                  <ul className={styles.history}>
                    {v.criteria.map((c) => (
                      <li key={c.id}>
                        Rubric: {c.label} ({c.maxMarks} marks){c.guidance ? <div className={ui.hint}>{c.guidance}</div> : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {v.explanation ? <p className={ui.hint}>Explanation: {v.explanation}</p> : null}
              </details>
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}
