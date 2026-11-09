import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { moderateAction } from "@/app/staff/assess-actions";
import { KeyNav } from "@/components/assess/KeyNav";
import { ModerationNote } from "@/components/assess/ModerationNote";
import { PaperView } from "@/components/assess/PaperView";
import styles from "@/components/assess/staff.module.css";
import { EvidenceViewer } from "@/components/practical/EvidenceViewer";
import ui from "@/components/ui.module.css";
import { SAMPLE_STATE_LABEL, VERDICT_LABEL, VERDICTS } from "@/lib/moderation";
import { AssessmentError } from "@/lib/server/assessments";
import { getReplay } from "@/lib/server/marking";
import { getModerationItem } from "@/lib/server/moderation";
import { requirePage } from "@/lib/server/page";
import { PracticalError } from "@/lib/server/practical";
import { getSubmissionView } from "@/lib/server/practicalMarking";

export const metadata: Metadata = { title: "Moderate" };

const dateFmt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" });
const outcomeLabel = (o: "competent" | "not_yet_competent") => (o === "competent" ? "Competent" : "Not yet competent");

/**
 * S7 moderation view (design.md §14, 2026-11-08, option B): the learner's
 * work exactly as served and assessed, full width and read-only; a bar pinned
 * to the bottom with the assessor's decision, history and the moderation form.
 */
export default async function ModerateItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ batchId: string; targetId: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { batchId, targetId } = await params;
  const sp = await searchParams;
  const base = `/staff/moderation/${batchId}`;
  const path = `${base}/item/${targetId}`;
  const { ctx, actor } = await requirePage(path);
  let item;
  let paper = null;
  let practical = null;
  try {
    item = await getModerationItem(ctx, actor, batchId, targetId);
    if (item.row.kind === "knowledge") paper = await getReplay(ctx, actor, targetId);
    else practical = await getSubmissionView(ctx, actor, targetId);
  } catch (e) {
    if (e instanceof AssessmentError || e instanceof PracticalError) notFound();
    throw e;
  }
  const { row } = item;
  const current = row.current;
  const prevHref = item.prevId ? `${base}/item/${item.prevId}` : null;
  const nextHref = item.nextId ? `${base}/item/${item.nextId}` : null;

  return (
    <div className={ui.stack}>
      <KeyNav prev={prevHref} next={nextHref} />
      <p className={ui.hint}>
        <a href="/staff/moderation">Moderation sample</a> › <a href={base}>{item.title}</a> · {item.cohortName}
        {item.position ? ` › Learner ${item.position.index} of ${item.position.of} in the sample` : " › not in the sample"}
      </p>
      <h1 className={ui.h1} style={{ margin: 0 }}>
        {row.learnerName}
      </h1>
      {sp.done === "moderated" ? (
        <p role="status" className={ui.bannerSuccess}>
          Moderation recorded.{nextHref ? " " : ""}
          {nextHref ? <a href={nextHref}>Next in sample →</a> : null}
        </p>
      ) : null}
      {sp.error ? (
        <p role="alert" className={ui.bannerError}>
          {sp.error}
        </p>
      ) : null}
      <p className={ui.bannerInfo} role="note">
        Read-only: you can&apos;t change the learner&apos;s work, the marks or the assessor&apos;s decision.
      </p>

      {paper ? (
        <section aria-labelledby="work-title" className={ui.stack}>
          <h2 id="work-title" className={styles.panelTitle}>
            Learner&apos;s paper, as served
          </h2>
          <dl className={styles.kv}>
            <dt>Module</dt>
            <dd>
              {paper.module.code} {paper.module.title}
            </dd>
            <dt>Attempt</dt>
            <dd>
              {paper.attempt.attemptNo} · submitted {paper.attempt.submittedAt ? dateFmt.format(paper.attempt.submittedAt) : "–"}
              {paper.attempt.autoSubmitted ? " (time limit)" : ""}
              {paper.attempt.extraMinutes ? ` · ${paper.attempt.extraMinutes} min extra time` : ""}
            </dd>
            {paper.sitting ? (
              <>
                <dt>Assessment day</dt>
                <dd>
                  {paper.sitting.heldOn} · {paper.sitting.venue} · {paper.sitting.attendance ?? "attendance not recorded"} · ID{" "}
                  {paper.sitting.idVerified ? "checked" : "not checked"}
                </dd>
              </>
            ) : null}
            <dt>Score</dt>
            <dd>
              {paper.score.raw}/{paper.score.max} ({paper.score.percent}%) · pass mark {paper.blueprint.passMarkPercent}%
            </dd>
          </dl>
          <p className={ui.hint}>Questions and options are in the exact order this learner saw them, with the version served.</p>
          <PaperView items={paper.items} openAll />
        </section>
      ) : null}

      {practical ? (
        <section aria-labelledby="work-title" className={ui.stack}>
          <h2 id="work-title" className={styles.panelTitle}>
            Learner&apos;s evidence
          </h2>
          <dl className={styles.kv}>
            <dt>Task</dt>
            <dd>
              {practical.moduleCode} · {practical.brief.title} · variant {practical.variant.label} · attempt{" "}
              {practical.submission.attemptNo} · {practical.submission.observed ? "observed" : "submitted"}{" "}
              {practical.submission.submittedAt ? dateFmt.format(practical.submission.submittedAt) : ""}
            </dd>
          </dl>
          <div className={styles.panel}>
            <EvidenceViewer evidence={practical.evidence} />
            {practical.submission.observationNotes ? <p>Observation notes: {practical.submission.observationNotes}</p> : null}
          </div>
          <h3 className={styles.panelTitle}>Assessor&apos;s judgements</h3>
          <ul className={styles.history}>
            {practical.criteria.map((c) => (
              <li key={c.id}>
                <strong>{c.code}</strong> {c.label}:{" "}
                {c.met === null ? "not judged" : c.met ? <span className={ui.statusOk}>✓ Met</span> : <span className={ui.statusBad}>Not yet met</span>}
                {c.comment ? <div className={ui.hint}>{c.comment}</div> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={styles.modBar} aria-labelledby="decision-title">
        <div className={styles.modBarRow}>
          <h2 id="decision-title" className={styles.panelTitle}>
            Assessor: {outcomeLabel(current.outcome)}
          </h2>
          <span className={ui.hint}>
            {current.assessorName} · {dateFmt.format(current.decidedAt)}
            {row.score ? ` · ${row.score}` : ""} · {SAMPLE_STATE_LABEL[row.state]}
          </span>
        </div>
        <p style={{ margin: 0 }}>Feedback: {current.feedback}</p>
        <details>
          <summary>Decision history ({row.versions.length})</summary>
          <ol className={styles.history}>
            {row.versions.map((v) => (
              <li key={v.id}>
                <span className={v.id !== current.id ? styles.superseded : undefined}>
                  {outcomeLabel(v.outcome)} · {v.assessorName} · {dateFmt.format(v.decidedAt)}
                </span>
                <div className={ui.hint}>Feedback: {v.feedback}</div>
                {v.moderation ? <ModerationNote m={v.moderation} /> : null}
              </li>
            ))}
          </ol>
        </details>

        {item.canModerate ? (
          <>
            <form action={moderateAction} className={styles.modForm}>
              <input type="hidden" name="decisionId" value={current.id} />
              <input type="hidden" name="back" value={path} />
              <div className={styles.radios} role="radiogroup" aria-label="Your moderation">
                {VERDICTS.map((v) => (
                  <label key={v}>
                    <input type="radio" name="verdict" value={v} required /> {VERDICT_LABEL[v]}
                  </label>
                ))}
              </div>
              <div className={styles.modFields}>
                <div className={ui.field}>
                  <label htmlFor="comments" className={ui.label}>
                    Comments
                  </label>
                  <textarea id="comments" name="comments" className={ui.input} rows={3} required maxLength={8000} />
                </div>
                <div className={ui.field}>
                  <label htmlFor="actions" className={ui.label}>
                    Required actions <span className={ui.hint}>(for Agree with actions; optional for Disagree)</span>
                  </label>
                  <textarea id="actions" name="actions" className={ui.input} rows={3} maxLength={4000} />
                </div>
              </div>
              <div className={ui.spread}>
                <label className={ui.checkbox}>
                  <input type="checkbox" name="confirm" value="1" />
                  <span className={ui.hint}>
                    Record this moderation. It is final. Disagree sends the decision back to the assessor to re-decide; you check the new
                    decision before release.
                  </span>
                </label>
                <button type="submit" className={ui.button}>
                  Record moderation
                </button>
              </div>
            </form>
            <p className={styles.modNarrow}>Moderating needs a wider screen (tablet in landscape or a laptop).</p>
          </>
        ) : (
          <p className={ui.hint} style={{ margin: 0 }}>
            {item.ownDecision
              ? "You made this decision, so you can't moderate it."
              : item.batch.status !== "open"
                ? "This batch is closed and its results are released."
                : !row.sample
                  ? "Not in the sample. Tick it on the batch page to moderate it."
                  : row.state === "disagreed"
                    ? "Waiting for the assessor to record a new decision."
                    : row.state === "actions_open"
                      ? "Waiting for the assessor to finish the required actions."
                      : "Moderated."}
          </p>
        )}
        <nav className={styles.pager} aria-label="Sample">
          {prevHref ? <a href={prevHref}>← Previous in sample (k)</a> : <span />}
          {nextHref ? <a href={nextHref}>Next in sample (j) →</a> : <span />}
        </nav>
      </section>
    </div>
  );
}
