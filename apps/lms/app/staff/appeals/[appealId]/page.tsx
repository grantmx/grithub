import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { appealDecisionAction } from "@/app/staff/assess-actions";
import { PaperView } from "@/components/assess/PaperView";
import styles from "@/components/assess/staff.module.css";
import ui from "@/components/ui.module.css";
import { AssessmentError } from "@/lib/server/assessments";
import { getReplay } from "@/lib/server/marking";
import { EvidenceViewer } from "@/components/practical/EvidenceViewer";
import { PracticalError } from "@/lib/server/practical";
import { getSubmissionView } from "@/lib/server/practicalMarking";
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
  let a, view;
  try {
    a = await getAppeal(ctx, actor, appealId);
    if (a.decision.submissionId) {
      const p = await getSubmissionView(ctx, actor, a.decision.submissionId);
      view = { kind: "practical" as const, learnerName: p.learner.name, title: p.brief.title, decisions: p.decisions, practical: p };
    } else {
      const r = await getReplay(ctx, actor, a.decision.attemptId!);
      view = { kind: "knowledge" as const, learnerName: r.learner.name, title: r.blueprint.title, decisions: r.decisions, knowledge: r };
    }
  } catch (e) {
    if (e instanceof AssessmentError || e instanceof PracticalError) notFound();
    throw e;
  }
  const open = a.appeal.status === "open";

  return (
    <div className={ui.stack}>
      <p className={ui.hint}>
        <a href="/staff/appeals">Appeals</a> › {view.learnerName}
      </p>
      <h1 className={ui.h1} style={{ margin: 0 }}>
        Appeal: {view.learnerName} · {view.title}
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
          {view.kind === "knowledge" ? (
            <>
              <h2 id="paper-title" className={styles.panelTitle}>
                Paper (served order) · <a href={`/staff/attempts/${view.knowledge.attempt.id}/pdf`}>PDF</a>
              </h2>
              <PaperView items={view.knowledge.items} />
            </>
          ) : (
            <>
              <h2 id="paper-title" className={styles.panelTitle}>
                Evidence · Variant {view.practical.variant.label}
              </h2>
              <EvidenceViewer evidence={view.practical.evidence} />
              <ul className={styles.history}>
                {view.practical.criteria.map((c) => (
                  <li key={c.id}>
                    <strong>{c.code}</strong> {c.label}: {c.met === null ? "not judged" : c.met ? "Met" : "Not yet met"}
                    {c.comment ? ` · ${c.comment}` : ""}
                  </li>
                ))}
              </ul>
            </>
          )}
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
              {view.decisions.map((d) => (
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
                  <input type="radio" name="outcome" value="reassess" /> Reassess (one more attempt, marked by the cohort&apos;s assessor and always moderated)
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
