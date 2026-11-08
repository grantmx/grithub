import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaperView } from "@/components/assess/PaperView";
import styles from "@/components/assess/staff.module.css";
import ui from "@/components/ui.module.css";
import { AssessmentError } from "@/lib/server/assessments";
import { getReplay } from "@/lib/server/marking";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Attempt replay" };

const dateFmt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" });

/** S6 attempt replay: exact questions and option order with keys overlaid (read-only). */
export default async function ReplayPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const { ctx, actor } = await requirePage(`/staff/attempts/${attemptId}`);
  let r;
  try {
    r = await getReplay(ctx, actor, attemptId);
  } catch (e) {
    if (e instanceof AssessmentError) notFound();
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
      <div className={ui.spread}>
        <h1 className={ui.h1} style={{ margin: 0 }}>
          {r.learner.name} · {r.blueprint.title}
        </h1>
        <a className={ui.secondary} href={`/staff/attempts/${attemptId}/pdf`}>
          Download PDF
        </a>
      </div>
      <dl className={styles.kv}>
        <dt>Module</dt>
        <dd>
          {r.module.code} {r.module.title}
        </dd>
        <dt>Cohort</dt>
        <dd>{r.cohort.name}</dd>
        <dt>Attempt</dt>
        <dd>
          {r.attempt.attemptNo} · started {dateFmt.format(r.attempt.startedAt)} · submitted{" "}
          {r.attempt.submittedAt ? dateFmt.format(r.attempt.submittedAt) : "–"}
          {r.attempt.autoSubmitted ? " (time limit)" : ""}
          {r.attempt.extraMinutes ? ` · ${r.attempt.extraMinutes} min extra time` : ""}
        </dd>
        {r.sitting ? (
          <>
            <dt>Assessment day</dt>
            <dd>
              {r.sitting.heldOn} · {r.sitting.venue} · {r.sitting.attendance ?? "attendance not recorded"} · ID{" "}
              {r.sitting.idVerified ? "checked" : "not checked"} ·{" "}
              {r.sitting.signedOffBy ? `register signed off by ${r.sitting.signedOffBy}` : "register not signed off"}
            </dd>
          </>
        ) : null}
        <dt>Score</dt>
        <dd>
          {r.score.raw}/{r.score.max} ({r.score.percent}%){r.score.allMarked ? "" : " · marking incomplete"} · pass mark{" "}
          {r.blueprint.passMarkPercent}%
        </dd>
      </dl>
      <PaperView items={r.items} openAll />
      {r.decisions.length ? (
        <section className={styles.panel} aria-labelledby="decisions-title">
          <h2 id="decisions-title" className={styles.panelTitle}>
            Decisions
          </h2>
          <ol className={styles.history}>
            {r.decisions.map((d) => (
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
      ) : null}
    </div>
  );
}
