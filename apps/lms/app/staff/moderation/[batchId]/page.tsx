import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { closeBatchAction, moderateAction } from "@/app/staff/assess-actions";
import styles from "@/components/assess/staff.module.css";
import ui from "@/components/ui.module.css";
import { AssessmentError } from "@/lib/server/assessments";
import { getBatch } from "@/lib/server/moderation";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Moderation batch" };

const dateFmt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" });

/** S7: decisions in the batch, moderate a sample, then close and release (count shown before confirming). */
export default async function BatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ batchId: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { batchId } = await params;
  const sp = await searchParams;
  const path = `/staff/moderation/${batchId}`;
  const { ctx, actor } = await requirePage(path);
  let b;
  try {
    b = await getBatch(ctx, actor, batchId);
  } catch (e) {
    if (e instanceof AssessmentError) notFound();
    throw e;
  }
  const open = b.batch.status === "open";
  const released = sp.done?.startsWith("released:") ? sp.done.slice(9) : null;

  return (
    <div className={ui.stack}>
      <p className={ui.hint}>
        <a href="/staff/moderation">Moderation sample</a> › {b.cohortName}
      </p>
      <h1 className={ui.h1} style={{ margin: 0 }}>
        {b.title}
      </h1>
      {released ? (
        <p role="status" className={ui.bannerSuccess}>
          Sample closed. {released} result{released === "1" ? "" : "s"} released to learners.
        </p>
      ) : sp.done === "moderated" ? (
        <p role="status" className={ui.bannerSuccess}>
          Moderation recorded.
        </p>
      ) : null}
      {sp.error ? (
        <p role="alert" className={ui.bannerError}>
          {sp.error}
        </p>
      ) : null}
      {!open ? <p className={ui.bannerInfo}>Closed {b.batch.closedAt ? dateFmt.format(b.batch.closedAt) : ""}. Results are released.</p> : null}

      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th scope="col">Learner</th>
              <th scope="col">Decision</th>
              <th scope="col">Assessor</th>
              <th scope="col">Moderation</th>
              <th scope="col">
                <span className={ui.srOnly}>Moderate</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {b.decisions.map((d) => (
              <tr key={d.id}>
                <td>
                  <a href={d.submissionId ? `/staff/submissions/${d.submissionId}` : `/staff/attempts/${d.attemptId}`}>{d.learnerName}</a>
                </td>
                <td>
                  {d.outcome === "competent" ? "Competent" : "Not yet competent"}
                  <div className={ui.hint}>{dateFmt.format(d.decidedAt)}</div>
                </td>
                <td>{d.assessorName}</td>
                <td>
                  {d.moderation
                    ? `${d.moderation.outcome === "upheld" ? "✓ Upheld" : "! Referred back"}: ${d.moderation.findings}`
                    : "Not sampled"}
                </td>
                <td>
                  {open && !d.ownDecision ? (
                    <details className={ui.menu}>
                      <summary aria-label={`Moderate ${d.learnerName}`}>Moderate</summary>
                      <form action={moderateAction} className={ui.menuPanel}>
                        <input type="hidden" name="decisionId" value={d.id} />
                        <input type="hidden" name="back" value={path} />
                        <div className={styles.radios} role="radiogroup" aria-label="Moderation outcome">
                          <label>
                            <input type="radio" name="outcome" value="upheld" required /> Upheld
                          </label>
                          <label>
                            <input type="radio" name="outcome" value="referred_back" /> Referred back
                          </label>
                        </div>
                        <label htmlFor={`f-${d.id}`} className={ui.hint}>
                          Findings
                        </label>
                        <textarea id={`f-${d.id}`} name="findings" className={ui.input} rows={4} required maxLength={8000} />
                        <button type="submit" className={ui.button}>
                          Record moderation
                        </button>
                      </form>
                    </details>
                  ) : d.ownDecision ? (
                    <span className={ui.hint}>Your decision</span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && b.decisions.length ? (
        <form action={closeBatchAction} className={styles.panel}>
          <input type="hidden" name="batchId" value={batchId} />
          <input type="hidden" name="back" value={path} />
          <h2 className={styles.panelTitle}>Close sample and release results</h2>
          <p>
            {b.decisions.filter((d) => d.moderation).length} of {b.decisions.length} decisions moderated.
          </p>
          <label className={ui.checkbox}>
            <input type="checkbox" name="confirm" value="1" />
            <span>
              Release {b.learnersToNotify} result{b.learnersToNotify === 1 ? "" : "s"} to learners now. Decisions in this batch become
              final and the batch can&apos;t be reopened.
            </span>
          </label>
          <button type="submit" className={ui.button}>
            Close sample and release
          </button>
        </form>
      ) : null}
    </div>
  );
}
