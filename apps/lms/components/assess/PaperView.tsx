import type { ReplayItem } from "@/lib/server/marking";
import styles from "./staff.module.css";

/**
 * A paper exactly as served (design.md S6): served order, the learner's
 * answers, answer keys overlaid. Auto-marked items are collapsed; short
 * answers are open (they are what an assessor reads). Staff with key access only.
 */
export function PaperView({ items, openAll = false }: { items: ReplayItem[]; openAll?: boolean }) {
  return (
    <ol className={styles.paper} aria-label="Paper in served order">
      {items.map((it) => {
        const short = it.type === "short_answer";
        const marks = it.marksAwarded === null ? `–/${it.maxMarks}` : `${it.marksAwarded}/${it.maxMarks}`;
        const verdict = short ? (it.marksAwarded === null ? "● to mark" : marks) : it.isCorrect ? `✓ ${marks}` : `✗ ${marks}`;
        return (
          <li key={it.itemId}>
            <details className={`${styles.item} ${short && it.marksAwarded === null ? styles.toMark : ""}`} open={openAll || short}>
              <summary>
                <span>
                  Q{it.position} · {short ? "short answer" : it.type === "multi" ? "multiple answers" : "multiple choice"} · v{it.versionNo}
                  {it.flagged ? " · ⚑ flagged" : ""}
                </span>
                <span>{verdict}</span>
              </summary>
              <div className={styles.itemBody}>
                <p className={styles.stem}>{it.stem}</p>
                {short ? (
                  <>
                    <p className={styles.answer}>{it.responseText?.trim() ? it.responseText : "(no answer)"}</p>
                    {it.criteria.length ? (
                      <ul className={styles.options}>
                        {it.criteria.map((c) => (
                          <li key={c.id} className={styles.opt}>
                            {c.label}
                            <span className={styles.tag}>
                              {c.marks ?? "–"}/{c.maxMarks}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {it.markerNote ? <p>Assessor note: {it.markerNote}</p> : null}
                  </>
                ) : (
                  <ul className={styles.options}>
                    {it.options.map((o, i) => (
                      <li key={i} className={`${styles.opt} ${o.correct ? styles.optKey : ""}`}>
                        <span aria-hidden="true">{o.chosen ? "◉" : "○"}</span>
                        <span>
                          {String.fromCharCode(65 + i)}. {o.label}
                          {o.pinned ? " (pinned)" : ""}
                        </span>
                        <span className={styles.tag}>
                          {o.correct && o.chosen ? "Chosen · key" : o.correct ? "Key" : o.chosen ? "Chosen" : ""}
                        </span>
                      </li>
                    ))}
                    {!it.options.some((o) => o.chosen) ? <li className={styles.opt}>(no answer)</li> : null}
                  </ul>
                )}
                {it.explanation ? <p>Explanation: {it.explanation}</p> : null}
              </div>
            </details>
          </li>
        );
      })}
    </ol>
  );
}
