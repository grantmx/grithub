import type { Metadata } from "next";
import { retireQuestionAction } from "@/app/staff/assess-actions";
import styles from "@/components/assess/staff.module.css";
import ui from "@/components/ui.module.css";
import { questionAnalytics } from "@/lib/server/analytics";
import { requirePage } from "@/lib/server/page";
import { FLAG_LABELS, FLAG_RULES } from "@/lib/questionStats";

export const metadata: Metadata = { title: "Question analytics" };

const pct = (n: number | null) => (n === null ? "–" : `${Math.round(n * 100)}%`);

/** Per-question pass rate, discrimination, option selection counts and flags; retire or version. */
export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ blueprintId: string }>;
  searchParams: Promise<{ done?: string; error?: string; flagged?: string }>;
}) {
  const { blueprintId } = await params;
  const sp = await searchParams;
  const path = `/staff/analytics/${blueprintId}`;
  const { ctx, actor } = await requirePage(path);
  const all = await questionAnalytics(ctx, actor, blueprintId);
  const rows = sp.flagged ? all.filter((r) => r.flags.length) : all;
  // Only assessors retire or version questions; moderators read (design.md §14, 2026-11-08).
  const canEdit = actor.roles.has("assessor");

  return (
    <div className={ui.stack}>
      <p className={ui.hint}>
        <a href="/staff/analytics">Question analytics</a>
      </p>
      <h1 className={ui.h1} style={{ margin: 0 }}>
        Questions
      </h1>
      <p className={ui.muted}>
        Flags appear from {FLAG_RULES.minResponses} responses: too easy (≥{FLAG_RULES.tooEasyAtLeast * 100}% correct), too hard (≤
        {FLAG_RULES.tooHardAtMost * 100}%), misleading (a wrong answer chosen more than the right one, or strong learners doing worse than
        weak ones). Retire a question to stop serving it, or create a new version; served versions never change.
      </p>
      {sp.done === "retired" ? (
        <p role="status" className={ui.bannerSuccess}>
          Question retired. It won&apos;t be drawn for new papers.
        </p>
      ) : null}
      {sp.error ? (
        <p role="alert" className={ui.bannerError}>
          {sp.error}
        </p>
      ) : null}
      <nav className={ui.chips} aria-label="Filter">
        <a href={path} className={sp.flagged ? ui.chip : ui.chipActive} aria-current={sp.flagged ? undefined : "true"}>
          All ({all.length})
        </a>
        <a href={`${path}?flagged=1`} className={sp.flagged ? ui.chipActive : ui.chip} aria-current={sp.flagged ? "true" : undefined}>
          Flagged ({all.filter((r) => r.flags.length).length})
        </a>
      </nav>
      <ol className={styles.paper}>
        {rows.map((r) => {
          const max = Math.max(1, ...r.options.map((o) => o.count));
          return (
            <li key={r.versionId}>
              <details className={styles.item} open={r.flags.length > 0}>
                <summary>
                  <span>
                    {r.flags.map((f) => (
                      <span key={f} className={styles.flag}>
                        {FLAG_LABELS[f]}
                      </span>
                    ))}
                    {r.component} · v{r.versionNo}
                    {r.isCurrent ? "" : " (old version)"}
                    {r.questionStatus === "retired" ? " · retired" : ""} · {r.stem.slice(0, 80)}
                    {r.stem.length > 80 ? "…" : ""}
                  </span>
                  <span>
                    {r.responses} resp · {pct(r.correctRate)} correct
                  </span>
                </summary>
                <div className={styles.itemBody}>
                  <p className={styles.stem}>{r.stem}</p>
                  <dl className={styles.kv}>
                    <dt>Responses</dt>
                    <dd>{r.responses}</dd>
                    <dt>Correct</dt>
                    <dd>{pct(r.correctRate)}</dd>
                    <dt>Discrimination</dt>
                    <dd>{r.discrimination === null ? "–" : r.discrimination.toFixed(2)}</dd>
                  </dl>
                  {r.type !== "short_answer" ? (
                    <ul className={styles.bars} aria-label="Answer choices">
                      {r.options.map((o) => (
                        <li key={o.id} className={styles.bar}>
                          <span>
                            {o.label}
                            {o.isCorrect ? " (key)" : ""}
                          </span>
                          <span>{o.count}</span>
                          <span className={styles.barTrack} aria-hidden="true">
                            <span
                              className={`${styles.barFill} ${o.isCorrect ? styles.barKey : ""}`}
                              style={{ width: `${(o.count / max) * 100}%`, display: "block" }}
                            />
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {r.isCurrent && canEdit ? (
                    <div className={ui.row}>
                      <a className={ui.secondary} href={`/staff/questions/${r.questionId}?back=${encodeURIComponent(path)}`}>
                        Create new version
                      </a>
                      {r.questionStatus !== "retired" ? (
                        <form action={retireQuestionAction}>
                          <input type="hidden" name="questionId" value={r.questionId} />
                          <input type="hidden" name="back" value={path} />
                          <button type="submit" className={ui.textButton}>
                            Retire question (stop serving it)
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
