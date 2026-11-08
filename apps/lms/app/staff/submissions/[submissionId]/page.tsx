import type { Metadata } from "next";
import { notFound } from "next/navigation";
import styles from "@/components/assess/staff.module.css";
import { EvidenceViewer } from "@/components/practical/EvidenceViewer";
import ui from "@/components/ui.module.css";
import { requirePage } from "@/lib/server/page";
import { PracticalError } from "@/lib/server/practical";
import { getSubmissionView } from "@/lib/server/practicalMarking";

export const metadata: Metadata = { title: "Practical evidence" };
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" });

/** Read-only practical evidence, criteria and decisions (assessors, moderators, evaluators). */
export default async function SubmissionPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  const { ctx, actor } = await requirePage(`/staff/submissions/${submissionId}`);
  let v;
  try {
    v = await getSubmissionView(ctx, actor, submissionId);
  } catch (e) {
    if (e instanceof PracticalError) notFound();
    throw e;
  }
  const evaluator = actor.roles.has("external_evaluator") && !actor.roles.has("assessor") && !actor.roles.has("moderator");
  return (
    <div className={ui.stack}>
      {evaluator ? (
        <p className={ui.bannerInfo} role="note">
          Read-only evaluator access.
        </p>
      ) : null}
      <h1 className={ui.h1} style={{ margin: 0 }}>
        {v.learner.name} · {v.brief.title}
      </h1>
      <dl className={styles.kv}>
        <dt>Module</dt>
        <dd>
          {v.moduleCode} · {v.brief.curriculumComponentRef}
        </dd>
        <dt>Cohort</dt>
        <dd>{v.cohort.name}</dd>
        <dt>Task</dt>
        <dd>
          Variant {v.variant.label} · attempt {v.submission.attemptNo} · {v.submission.observed ? "observed" : "submitted"}{" "}
          {v.submission.submittedAt ? dateFmt.format(v.submission.submittedAt) : ""}
        </dd>
        {v.sitting ? (
          <>
            <dt>Assessment day</dt>
            <dd>
              {v.sitting.heldOn} · {v.sitting.venue} · {v.sitting.attendance ?? "not recorded"} · ID {v.sitting.idVerified ? "checked" : "not checked"} ·{" "}
              {v.sitting.signedOffBy ? `register signed off by ${v.sitting.signedOffBy}` : "register not signed off"}
            </dd>
          </>
        ) : null}
      </dl>
      <div className={styles.split}>
        <section className={styles.panel} aria-labelledby="evidence-title">
          <h2 id="evidence-title" className={styles.panelTitle}>
            Evidence
          </h2>
          <EvidenceViewer evidence={v.evidence} />
          {v.submission.observationNotes ? <p>Observation notes: {v.submission.observationNotes}</p> : null}
        </section>
        <div className={`${styles.side} ${ui.stack}`}>
          <section className={styles.panel} aria-labelledby="criteria-title">
            <h2 id="criteria-title" className={styles.panelTitle}>
              Criteria
            </h2>
            <ul className={styles.history}>
              {v.criteria.map((c) => (
                <li key={c.id}>
                  <strong>{c.code}</strong> {c.label}:{" "}
                  {c.met === null ? "not judged" : c.met ? <span className={ui.statusOk}>✓ Met</span> : <span className={ui.statusBad}>Not yet met</span>}
                  {c.comment ? <div className={ui.hint}>{c.comment}</div> : null}
                </li>
              ))}
            </ul>
          </section>
          <section className={styles.panel} aria-labelledby="decisions-title">
            <h2 id="decisions-title" className={styles.panelTitle}>
              Decisions
            </h2>
            {v.decisions.length === 0 ? <p className={ui.hint}>No decision recorded yet.</p> : null}
            <ol className={styles.history}>
              {v.decisions.map((d) => (
                <li key={d.id}>
                  <span className={d.superseded ? styles.superseded : undefined}>
                    {d.outcome === "competent" ? "Competent" : "Not yet competent"} · {d.assessorName} · {dateFmt.format(d.decidedAt)}
                    {d.releasedAt ? ` · released ${dateFmt.format(d.releasedAt)}` : ""}
                  </span>
                  <div className={ui.hint}>Feedback: {d.feedback}</div>
                  {d.moderation.map((m) => (
                    <div key={m.id} className={ui.hint}>
                      Moderation by {m.moderatorName}: {m.outcome === "upheld" ? "upheld" : "referred back"}: {m.findings}
                    </div>
                  ))}
                  {d.appeal ? (
                    <div className={ui.hint}>
                      Appeal ({d.appeal.status}): {d.appeal.reason}
                      {d.appeal.outcomeNotes ? ` → ${d.appeal.outcomeNotes}` : ""}
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
