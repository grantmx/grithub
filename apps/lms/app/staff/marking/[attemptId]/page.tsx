import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { decisionAction, marksAction } from "@/app/staff/assess-actions";
import { KeyNav } from "@/components/assess/KeyNav";
import { PaperView } from "@/components/assess/PaperView";
import styles from "@/components/assess/staff.module.css";
import ui from "@/components/ui.module.css";
import { AssessmentError } from "@/lib/server/assessments";
import { getMarkingView } from "@/lib/server/marking";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Marking" };

const dateFmt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" });

const DONE: Record<string, string> = {
  marked: "Marks saved.",
  draft: "Draft saved.",
  decided: "Decision recorded. It is final; a change creates a new version.",
};

/** S5 split view: the paper on the left, rubric and decision on the right. */
export default async function MarkingPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { attemptId } = await params;
  const sp = await searchParams;
  const path = `/staff/marking/${attemptId}`;
  const { ctx, actor } = await requirePage(path);
  let v;
  try {
    v = await getMarkingView(ctx, actor, attemptId);
  } catch (e) {
    if (e instanceof AssessmentError) notFound();
    throw e;
  }
  const shorts = v.items.filter((i) => i.type === "short_answer");
  const outcome = v.draft?.outcome ?? v.score.suggested ?? null;
  const prevHref = v.prevId ? `/staff/marking/${v.prevId}` : null;
  const nextHref = v.nextId ? `/staff/marking/${v.nextId}` : null;

  return (
    <div className={ui.stack}>
      <KeyNav prev={prevHref} next={nextHref} />
      <p className={ui.hint}>
        <a href="/staff/marking">Marking queue</a> › {v.learner.name} · {v.blueprint.title} · attempt {v.attempt.attemptNo}
      </p>
      <div className={ui.spread}>
        <h1 className={ui.h1} style={{ margin: 0 }}>
          {v.learner.name}
        </h1>
        <span className={ui.row}>
          <a href={`/staff/attempts/${attemptId}`}>Replay</a>
          <a href={`/staff/attempts/${attemptId}/pdf`}>Download PDF</a>
        </span>
      </div>
      {sp.done && DONE[sp.done] ? (
        <p role="status" className={ui.bannerSuccess}>
          {DONE[sp.done]}
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
            Paper (served order)
          </h2>
          <dl className={styles.kv}>
            <dt>Cohort</dt>
            <dd>{v.cohort.name}</dd>
            <dt>Submitted</dt>
            <dd>
              {v.attempt.submittedAt ? dateFmt.format(v.attempt.submittedAt) : "–"}
              {v.attempt.autoSubmitted ? " (time limit)" : ""}
            </dd>
            {v.sitting ? (
              <>
                <dt>Register</dt>
                <dd>
                  {v.sitting.attendance ?? "not recorded"} · ID {v.sitting.idVerified ? "checked" : "not checked"} ·{" "}
                  {v.sitting.signedOffBy ? `signed off by ${v.sitting.signedOffBy}` : "not signed off"}
                </dd>
              </>
            ) : null}
          </dl>
          <PaperView items={v.items} />
        </section>

        <div className={`${styles.side} ${ui.stack}`}>
          {shorts.map((it) => (
            <form key={it.itemId} action={marksAction} className={styles.panel}>
              <h2 className={styles.panelTitle}>Rubric · Q{it.position}</h2>
              <input type="hidden" name="attemptId" value={attemptId} />
              <input type="hidden" name="position" value={it.position} />
              <input type="hidden" name="back" value={path} />
              {it.criteria.map((c) => (
                <fieldset key={c.id} className={styles.criterion} disabled={!!v.current}>
                  <legend>
                    {c.label} (0–{c.maxMarks})
                  </legend>
                  {c.guidance ? <p className={ui.hint}>{c.guidance}</p> : null}
                  <div className={styles.marks}>
                    {Array.from({ length: c.maxMarks + 1 }, (_, n) => (
                      <label key={n} className={styles.mark}>
                        <input type="radio" name={`c:${c.id}`} value={n} defaultChecked={c.marks === n} />
                        <span>{n}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              <div className={ui.field}>
                <label htmlFor={`note-${it.position}`} className={ui.hint}>
                  Item note (optional)
                </label>
                <input
                  id={`note-${it.position}`}
                  name="note"
                  className={ui.input}
                  defaultValue={it.markerNote ?? ""}
                  maxLength={2000}
                  disabled={!!v.current}
                />
              </div>
              {!v.current ? (
                <button type="submit" className={ui.secondary}>
                  Save marks
                </button>
              ) : null}
            </form>
          ))}

          <form action={decisionAction} className={styles.panel}>
            <h2 className={styles.panelTitle}>Decision</h2>
            <input type="hidden" name="attemptId" value={attemptId} />
            <input type="hidden" name="back" value={path} />
            <p>
              Score {v.score.raw}/{v.score.max} ({v.score.percent}%) · pass mark {v.blueprint.passMarkPercent}%
              {v.score.suggested ? (
                <>
                  <br />
                  Suggested: <strong>{v.score.suggested === "competent" ? "Competent" : "Not yet competent"}</strong>
                </>
              ) : (
                <>
                  <br />
                  <span className={ui.statusWarn}>Mark every short answer to see the suggestion.</span>
                </>
              )}
            </p>
            {v.current ? (
              <p className={ui.hint}>
                Current decision: <strong>{v.current.outcome === "competent" ? "Competent" : "Not yet competent"}</strong> by{" "}
                {v.current.assessorName}, {dateFmt.format(v.current.decidedAt)}
                {v.current.releasedAt ? " · released" : " · in the moderation batch"}
              </p>
            ) : null}
            {v.canDecide ? (
              <>
                <div className={ui.field}>
                  <label htmlFor="feedback" className={ui.label}>
                    Feedback for the learner
                  </label>
                  <textarea
                    id="feedback"
                    name="feedback"
                    className={ui.input}
                    rows={6}
                    defaultValue={v.draft?.feedback ?? ""}
                    maxLength={8000}
                  />
                </div>
                <div className={styles.radios} role="radiogroup" aria-label="Outcome">
                  <label>
                    <input type="radio" name="outcome" value="competent" defaultChecked={outcome === "competent"} /> Competent
                  </label>
                  <label>
                    <input type="radio" name="outcome" value="not_yet_competent" defaultChecked={outcome === "not_yet_competent"} /> Not
                    yet competent
                  </label>
                </div>
                <label className={ui.checkbox}>
                  <input type="checkbox" name="confirm" value="1" />
                  <span className={ui.hint}>
                    {v.current
                      ? "Record a new decision. The current one stays in the history and is superseded."
                      : "Record this decision. It is final and goes into the moderation batch; results are released when the moderator closes the sample."}
                  </span>
                </label>
                <div className={ui.spread}>
                  <button type="submit" name="intent" value="draft" className={ui.secondary}>
                    Save draft
                  </button>
                  <button type="submit" name="intent" value="record" className={ui.button}>
                    Record decision
                  </button>
                </div>
              </>
            ) : (
              <p className={ui.hint}>
                {v.blockedReason === "released"
                  ? "Results are released. Changes go through an appeal."
                  : v.blockedReason === "reassess_other_assessor"
                    ? "This is a reassessment ordered on appeal: a different assessor must decide it."
                    : "Mark every short answer before recording a decision."}
              </p>
            )}
          </form>

          {v.decisions.length ? (
            <section className={styles.panel} aria-labelledby="history-title">
              <h2 id="history-title" className={styles.panelTitle}>
                Decision history
              </h2>
              <ol className={styles.history}>
                {v.decisions.map((d) => (
                  <li key={d.id}>
                    <span className={d.superseded ? styles.superseded : undefined}>
                      {d.outcome === "competent" ? "Competent" : "Not yet competent"} · {d.assessorName} ·{" "}
                      {dateFmt.format(d.decidedAt)}
                    </span>
                    {d.moderation.map((m) => (
                      <div key={m.id} className={ui.hint}>
                        Moderation: {m.outcome === "upheld" ? "upheld" : "referred back"} by {m.moderatorName}: {m.findings}
                      </div>
                    ))}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      </div>
      <nav className={styles.pager} aria-label="Queue">
        {prevHref ? <a href={prevHref}>← Previous in queue (k)</a> : <span />}
        {nextHref ? <a href={nextHref}>Next in queue (j) →</a> : <span />}
      </nav>
    </div>
  );
}
