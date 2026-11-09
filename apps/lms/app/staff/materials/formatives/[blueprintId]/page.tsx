import type { Metadata } from "next";
import { notFound } from "next/navigation";
import styles from "@/components/assess/staff.module.css";
import ui from "@/components/ui.module.css";
import { AssessmentError } from "@/lib/server/assessments";
import { getFormativeMaterials } from "@/lib/server/materials";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Formative assessment" };

const dateFmt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" });

/**
 * Moderator, read-only: a formative's settings and draw rules, and every
 * learner attempt in my cohorts, each opening the exact paper as served.
 */
export default async function FormativeMaterialsPage({ params }: { params: Promise<{ blueprintId: string }> }) {
  const { blueprintId } = await params;
  const { ctx, actor } = await requirePage(`/staff/materials/formatives/${blueprintId}`);
  let f;
  try {
    f = await getFormativeMaterials(ctx, actor, blueprintId);
  } catch (e) {
    if (e instanceof AssessmentError) notFound();
    throw e;
  }
  const bp = f.blueprint;
  return (
    <div className={ui.stack}>
      <p className={ui.hint}>
        <a href="/staff/materials">Assessment materials</a> › {f.module.code} {f.module.title}
      </p>
      <h1 className={ui.h1} style={{ margin: 0 }}>
        {bp.title}
      </h1>
      <dl className={styles.kv}>
        <dt>Type</dt>
        <dd>Formative · auto-graded{bp.showAnswers ? " · answers and explanations shown after submitting" : ""}</dd>
        <dt>Attempts</dt>
        <dd>
          Up to {bp.maxAttempts}
          {bp.timeLimitMinutes ? ` · ${bp.timeLimitMinutes} min` : " · no time limit"} · pass mark {bp.passMarkPercent}%
        </dd>
        <dt>Status</dt>
        <dd>{bp.status}</dd>
      </dl>
      <h2 className={styles.panelTitle}>Draw rules</h2>
      <ul className={styles.history}>
        {f.rules.map((r) => (
          <li key={r.id}>
            {r.count} from <a href={`/staff/materials/banks/${r.bankId}`}>{r.bankTitle}</a> <span className={ui.hint}>({r.component})</span>
          </li>
        ))}
      </ul>
      <h2 className={styles.panelTitle}>Learner attempts in your cohorts</h2>
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th scope="col">Learner</th>
              <th scope="col">Cohort</th>
              <th scope="col">Attempt</th>
              <th scope="col">Submitted</th>
              <th scope="col">Score</th>
            </tr>
          </thead>
          <tbody>
            {f.attempts.length === 0 ? (
              <tr>
                <td colSpan={5} className={ui.muted}>
                  No attempts yet.
                </td>
              </tr>
            ) : (
              f.attempts.map((a) => (
                <tr key={a.id}>
                  <td>
                    <a href={`/staff/attempts/${a.id}`}>{a.learnerName}</a>
                  </td>
                  <td>{a.cohortName}</td>
                  <td>{a.attemptNo}</td>
                  <td>{a.submittedAt ? dateFmt.format(a.submittedAt) : "–"}</td>
                  <td>{a.scoreRaw !== null && a.scoreMax ? `${Math.round((a.scoreRaw * 100) / a.scoreMax)}%` : "–"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
