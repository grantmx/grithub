import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { assessorLinkAction, judgementsAction, practicalDecisionAction } from "@/app/staff/assess-actions";
import { KeyNav } from "@/components/assess/KeyNav";
import styles from "@/components/assess/staff.module.css";
import { EvidenceUploader } from "@/components/practical/EvidenceUploader";
import { EvidenceViewer } from "@/components/practical/EvidenceViewer";
import ui from "@/components/ui.module.css";
import { ModerationNote } from "@/components/assess/ModerationNote";
import { requirePage } from "@/lib/server/page";
import { PracticalError } from "@/lib/server/practical";
import { getPracticalMarkingView } from "@/lib/server/practicalMarking";
import { evidenceStore } from "@/lib/server/evidenceStore";

export const metadata: Metadata = { title: "Practical marking" };
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" });

const DONE: Record<string, string> = {
  judged: "Criteria saved.",
  draft: "Draft saved.",
  decided: "Decision recorded. It is final; a change creates a new version.",
  evidence_added: "Evidence added.",
};

/** S5 practical split view (design-gate decision 2026-11-08, approved wireframe). */
export default async function PracticalMarkingPage({
  params,
  searchParams,
}: {
  params: Promise<{ submissionId: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { submissionId } = await params;
  const sp = await searchParams;
  const path = `/staff/marking/practical/${submissionId}`;
  const { ctx, actor } = await requirePage(path);
  let v;
  try {
    v = await getPracticalMarkingView(ctx, actor, submissionId);
  } catch (e) {
    if (e instanceof PracticalError) notFound();
    throw e;
  }
  const locked = v.current !== null;
  const outcome = v.draft?.outcome ?? v.suggested ?? null;
  const prevHref = v.prevId ? `/staff/marking/practical/${v.prevId}` : null;
  const nextHref = v.nextId ? `/staff/marking/practical/${v.nextId}` : null;

  return (
    <div className={ui.stack}>
      <KeyNav prev={prevHref} next={nextHref} />
      <p className={ui.hint}>
        <a href="/staff/marking?kind=practical">Marking queue</a> › {v.learner.name} · {v.moduleCode} {v.brief.title} · Variant {v.variant.label} ·
        attempt {v.submission.attemptNo}
      </p>
      <h1 className={ui.h1} style={{ margin: 0 }}>
        {v.learner.name}
      </h1>
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
        <section className={styles.panel} aria-labelledby="evidence-title">
          <h2 id="evidence-title" className={styles.panelTitle}>
            Evidence
          </h2>
          <details>
            <summary>Variant {v.variant.label} instructions</summary>
            <p style={{ whiteSpace: "pre-line" }}>{v.variant.variantInstructions}</p>
          </details>
          <dl className={styles.kv}>
            <dt>Cohort</dt>
            <dd>{v.cohort.name}</dd>
            <dt>{v.submission.observed ? "Observed" : "Submitted"}</dt>
            <dd>{v.submission.submittedAt ? dateFmt.format(v.submission.submittedAt) : "–"}</dd>
            {v.sitting ? (
              <>
                <dt>Register</dt>
                <dd>
                  {v.sitting.heldOn} · {v.sitting.venue} · {v.sitting.attendance ?? "not recorded"} · ID {v.sitting.idVerified ? "checked" : "not checked"}
                </dd>
              </>
            ) : null}
            {!v.submission.observed ? (
              <>
                <dt>Links</dt>
                <dd>{v.submission.linksConfirmed ? "Learner confirmed assessors can open them" : "–"}</dd>
              </>
            ) : null}
          </dl>
          <EvidenceViewer evidence={v.evidence} />
          {v.submission.observed && !locked ? (
            <div className={ui.stack}>
              <p className={ui.hint}>Attach your own photos, notes or a link (optional).</p>
              <EvidenceUploader submissionId={submissionId} existing={v.evidence.length} enabled={evidenceStore().kind !== "none"} />
              <form action={assessorLinkAction} className={ui.row}>
                <input type="hidden" name="submissionId" value={submissionId} />
                <input type="hidden" name="back" value={path} />
                <label htmlFor="url" className={ui.srOnly}>
                  Link
                </label>
                <input id="url" name="url" type="url" placeholder="https://" className={ui.input} style={{ flex: 1 }} required />
                <button type="submit" className={ui.secondary}>
                  Add link
                </button>
              </form>
            </div>
          ) : null}
        </section>

        <div className={`${styles.side} ${ui.stack}`}>
          <form action={judgementsAction} className={styles.panel}>
            <h2 className={styles.panelTitle}>Criteria</h2>
            <input type="hidden" name="submissionId" value={submissionId} />
            <input type="hidden" name="back" value={path} />
            {v.criteria.map((c) => (
              <fieldset key={c.id} className={styles.criterion} disabled={locked}>
                <legend>
                  {c.code} {c.label}
                </legend>
                {c.guidance ? <p className={ui.hint}>{c.guidance}</p> : null}
                <div className={styles.radios}>
                  <label>
                    <input type="radio" name={`met:${c.id}`} value="met" defaultChecked={c.met === true} /> Met
                  </label>
                  <label>
                    <input type="radio" name={`met:${c.id}`} value="not_met" defaultChecked={c.met === false} /> Not yet met
                  </label>
                </div>
                <label htmlFor={`comment-${c.id}`} className={ui.srOnly}>
                  Comment on {c.code}
                </label>
                <input id={`comment-${c.id}`} name={`comment:${c.id}`} className={ui.input} placeholder="Comment (optional)" defaultValue={c.comment ?? ""} maxLength={2000} />
              </fieldset>
            ))}
            {v.submission.observed ? (
              <div className={ui.field}>
                <label htmlFor="observationNotes" className={ui.label}>
                  Observation notes
                </label>
                <textarea
                  id="observationNotes"
                  name="observationNotes"
                  className={ui.input}
                  rows={4}
                  defaultValue={v.submission.observationNotes ?? ""}
                  disabled={locked}
                  maxLength={8000}
                />
              </div>
            ) : null}
            {!locked ? (
              <button type="submit" className={ui.secondary}>
                Save criteria
              </button>
            ) : null}
          </form>

          <form action={practicalDecisionAction} className={styles.panel}>
            <h2 className={styles.panelTitle}>Decision</h2>
            <input type="hidden" name="submissionId" value={submissionId} />
            <input type="hidden" name="back" value={path} />
            <p>
              {v.suggested ? (
                <>
                  Suggested: <strong>{v.suggested === "competent" ? "Competent" : "Not yet competent"}</strong>{" "}
                  <span className={ui.hint}>(Competent only when every criterion is met)</span>
                </>
              ) : (
                <span className={ui.statusWarn}>Judge every criterion to see the suggestion.</span>
              )}
            </p>
            {v.current && !v.current.releasedAt && v.current.moderation.some((m) => m.outcome === "referred_back") ? (
              <p role="status" className={ui.bannerError}>
                The moderator disagreed with this decision. Read their comments below, then record a new decision.
              </p>
            ) : null}
            {v.current ? (
              <p className={ui.hint}>
                Current decision: <strong>{v.current.outcome === "competent" ? "Competent" : "Not yet competent"}</strong> by {v.current.assessorName},{" "}
                {dateFmt.format(v.current.decidedAt)}
                {v.current.releasedAt ? " · released" : " · in the moderation batch"}
              </p>
            ) : null}
            {v.canDecide ? (
              <>
                <div className={ui.field}>
                  <label htmlFor="feedback" className={ui.label}>
                    Feedback for the learner
                  </label>
                  <textarea id="feedback" name="feedback" className={ui.input} rows={6} defaultValue={v.draft?.feedback ?? ""} maxLength={8000} />
                </div>
                <div className={styles.radios} role="radiogroup" aria-label="Outcome">
                  <label>
                    <input type="radio" name="outcome" value="competent" defaultChecked={outcome === "competent"} /> Competent
                  </label>
                  <label>
                    <input type="radio" name="outcome" value="not_yet_competent" defaultChecked={outcome === "not_yet_competent"} /> Not yet competent
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
                  : "Judge every criterion before recording a decision."}
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
                      {d.outcome === "competent" ? "Competent" : "Not yet competent"} · {d.assessorName} · {dateFmt.format(d.decidedAt)}
                    </span>
                    {d.moderation.map((m) => (
                      <ModerationNote
                        key={m.id}
                        m={m}
                        back={path}
                        actionsForm={!d.superseded && !d.releasedAt && d.assessorId === actor.userId}
                      />
                    ))}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      </div>
      <nav className={styles.pager} aria-label="Queue">
        {prevHref ? <a href={prevHref}>← Previous (k)</a> : <span />}
        {nextHref ? <a href={nextHref}>Next (j) →</a> : <span />}
      </nav>
    </div>
  );
}
