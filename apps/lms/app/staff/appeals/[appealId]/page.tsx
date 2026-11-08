import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { appealDecisionAction } from "@/app/staff/assess-actions";
import { PaperView } from "@/components/assess/PaperView";
import styles from "@/components/assess/staff.module.css";
import ui from "@/components/ui.module.css";
import { AssessmentError } from "@/lib/server/assessments";
import { getReplay } from "@/lib/server/marking";
import { getAppeal } from "@/lib/server/moderation";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Appeal" };

const dateFmt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" });

/** Appeal split view: paper replay | appeal reason, decision history, Uphold / Reassess. */
export default async function AppealPage({
  params,
  searchParams,
}: {
  params: Promise<{ appealId: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { appealId } = await params;
  const sp = await searchParams;
  const path = `/staff/appeals/${appealId}`;
  const { ctx, actor } = await requirePage(path);
  let a, replay;
  try {
    a = await getAppeal(ctx, actor, appealId);
    replay = await getReplay(ctx, actor, a.decision.attemptId!);
  } catch (e) {
    if (e instanceof AssessmentError) notFound();
    throw e;
  }
  const open = a.appeal.status === "open";

  return (
    <div className={ui.stack}>
      <p className={ui.hint}>
        <a href="/staff/appeals">Appeals</a> › {replay.learner.name}
      </p>
      <h1 className={ui.h1} style={{ margin: 0 }}>
        Appeal: {replay.learner.name} · {replay.blueprint.title}
      </h1>
      {sp.done === "appeal_decided" ? (
        <p role="status" className={ui.bannerSuccess}>
          Outcome recorded. The learner can see it on their result.
        </p>
      ) : null}
      {sp.error ? (
        <p role="alert" className={ui.bannerError}>
          {sp.error}
        </p>
      ) : null}
      <div className={styles.split}>
        <section className={styles.panel} aria-labelledby="paper-title">
          <h2 id="paper-title" className={styles.panelTitle}>
            Paper (served order) · <a href={`/staff/attempts/${replay.attempt.id}/pdf`}>PDF</a>
          </h2>
          <PaperView items={replay.items} />
        </section>
        <div className={`${styles.side} ${ui.stack}`}>
          <section className={styles.panel} aria-labelledby="reason-title">
            <h2 id="reason-title" className={styles.panelTitle}>
              Learner&apos;s reason
            </h2>
            <p style={{ whiteSpace: "pre-line", margin: 0 }}>{a.appeal.reason}</p>
            <p className={ui.hint}>Submitted {dateFmt.format(a.appeal.submittedAt)}</p>
          </section>
          <section className={styles.panel} aria-labelledby="history-title">
            <h2 id="history-title" className={styles.panelTitle}>
              Decision history
            </h2>
            <ol className={styles.history}>
              {replay.decisions.map((d) => (
                <li key={d.id}>
                  <span className={d.superseded ? styles.superseded : undefined}>
                    {d.outcome === "competent" ? "Competent" : "Not yet competent"} · {d.assessorName} · {dateFmt.format(d.decidedAt)}
                  </span>
                  <div className={ui.hint}>Feedback: {d.feedback}</div>
                  {d.moderation.map((m) => (
                    <div key={m.id} className={ui.hint}>
                      Moderation: {m.outcome === "upheld" ? "upheld" : "referred back"} by {m.moderatorName}
                    </div>
                  ))}
                </li>
              ))}
            </ol>
          </section>
          {open && !a.ownDecision ? (
            <form action={appealDecisionAction} className={styles.panel}>
              <h2 className={styles.panelTitle}>Outcome</h2>
              <input type="hidden" name="appealId" value={appealId} />
              <input type="hidden" name="back" value={path} />
              <div className={styles.radios} role="radiogroup" aria-label="Appeal outcome">
                <label>
                  <input type="radio" name="outcome" value="upheld" required /> Uphold the decision
                </label>
                <label>
                  <input type="radio" name="outcome" value="reassess" /> Reassess (a different assessor decides)
                </label>
              </div>
              <label htmlFor="notes" className={ui.label}>
                Explanation for the learner
              </label>
              <textarea id="notes" name="notes" className={ui.input} rows={5} required maxLength={4000} />
              <label className={ui.checkbox}>
                <input type="checkbox" name="confirm" value="1" />
                <span className={ui.hint}>The outcome is final and shown to the learner. Reassess gives them one extra attempt.</span>
              </label>
              <button type="submit" className={ui.button}>
                Record outcome
              </button>
            </form>
          ) : (
            <p className={ui.hint}>
              {open
                ? "You made this decision, so another moderator must decide the appeal."
                : `Decided: ${a.appeal.status === "upheld" ? "upheld" : "reassessment ordered"}. ${a.appeal.outcomeNotes ?? ""}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
