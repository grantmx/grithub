import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  addLinkAction,
  practicalAppealAction,
  removeEvidenceAction,
  submitPracticalAction,
} from "@/app/(learn)/practical-actions";
import { Icon } from "@/components/Icon";
import styles from "@/components/learn/learn.module.css";
import { EvidenceUploader } from "@/components/practical/EvidenceUploader";
import { PRACTICAL_STATUS } from "@/components/practical/PracticalBlock";
import { LINK_HOST_SUMMARY, MAX_EVIDENCE_ITEMS } from "@/lib/evidenceRules";
import { LearningError } from "@/lib/server/learning";
import { requirePage } from "@/lib/server/page";
import { getBriefPage, PracticalError } from "@/lib/server/practical";

export const metadata: Metadata = { title: "Practical task" };
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" });

const size = (n: number | null) => (n === null ? "" : n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

// TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
const REASONS: Record<string, string> = {
  not_open: "This task hasn't opened yet.",
  closed: "This task has closed.",
  no_attempts_left: "You've used all your attempts for this task.",
  awaiting_result: "Your work is being assessed. You'll see the result here once it's released.",
};

/** L8 practical brief (design-gate decision 2026-11-08, approved wireframe). */
export default async function BriefPage({
  params,
  searchParams,
}: {
  params: Promise<{ scheduleId: string }>;
  searchParams: Promise<{ error?: string; submitted?: string; appealed?: string }>;
}) {
  const { scheduleId } = await params;
  const sp = await searchParams;
  const path = `/learn/practical/${scheduleId}`;
  const { ctx, actor } = await requirePage(path);
  let b;
  try {
    b = await getBriefPage(ctx, actor, scheduleId);
  } catch (e) {
    if (e instanceof PracticalError || e instanceof LearningError) notFound();
    throw e;
  }
  const hasLinks = b.draft?.evidence.some((e) => e.kind === "link") ?? false;

  return (
    <div className={styles.attemptShell}>
      <p className={styles.crumb}>
        <a href={`/learn/${b.qualificationId}`} className={styles.textLink}>
          Programme
        </a>{" "}
        › {b.moduleCode}
      </p>
      <h1 className={styles.pageTitle}>{b.title}</h1>
      <p className={b.status === "competent" ? styles.verdictOk : styles.status}>
        Status: {PRACTICAL_STATUS[b.status]}
        {b.mode === "observed" ? ` · ${dateFmt.format(b.opensAt)}` : b.draft ? ` · due ${dateFmt.format(b.closesAt)}` : ""}
      </p>
      {sp.submitted ? (
        <p role="status" className={styles.verdictOk}>
          <Icon name="done" /> Submitted. Your assessor will review it; results appear after moderation.
        </p>
      ) : null}
      {sp.appealed ? (
        <p role="status" className={styles.verdictOk}>
          <Icon name="done" /> Your appeal was sent. A moderator will review it.
        </p>
      ) : null}
      {sp.error ? (
        <p role="alert" className={styles.alert}>
          {sp.error}
        </p>
      ) : null}

      {b.variant ? (
        <section className={styles.card} aria-labelledby="task-title">
          <h2 id="task-title" className={styles.cardTitle}>
            Your task: Variant {b.variant.label}
          </h2>
          <p style={{ whiteSpace: "pre-line", margin: 0 }}>{b.variant.instructions}</p>
          <details>
            <summary>Full instructions</summary>
            <p style={{ whiteSpace: "pre-line" }}>{b.instructions}</p>
          </details>
        </section>
      ) : (
        <section className={styles.card}>
          <p style={{ whiteSpace: "pre-line", margin: 0 }}>{b.instructions}</p>
          {b.mode === "observed" ? (
            <p className={styles.hint}>Your assessor watches you do this on the assessment day. There&apos;s nothing to upload.</p>
          ) : null}
        </section>
      )}

      <section className={styles.card} aria-labelledby="criteria-title">
        <h2 id="criteria-title" className={styles.cardTitle}>
          What the assessor checks
        </h2>
        <ul className={styles.list}>
          {b.criteria.map((c) => (
            <li key={c.code} className={styles.listItem}>
              <strong>{c.code}</strong> <span>{c.label}</span>
            </li>
          ))}
        </ul>
      </section>

      {b.draft ? (
        <section id="evidence" className={styles.card} aria-labelledby="evidence-title">
          <h2 id="evidence-title" className={styles.cardTitle}>
            Your evidence
          </h2>
          {b.draft.evidence.length ? (
            <ul className={styles.list}>
              {b.draft.evidence.map((e) => (
                <li key={e.id} className={styles.listItem} style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
                  <a href={`/evidence/${e.id}`} target="_blank" rel="noopener noreferrer" className={styles.textLink}>
                    {e.kind === "file" ? e.fileName : e.linkUrl}
                  </a>
                  <span className={styles.hint}>
                    {e.kind === "file" ? `${size(e.sizeBytes)} · ✓ uploaded` : `🔗 ${e.linkHost}`}
                  </span>
                  <form action={removeEvidenceAction}>
                    <input type="hidden" name="evidenceId" value={e.id} />
                    <input type="hidden" name="back" value={path} />
                    <button type="submit" className={styles.secondary}>
                      Remove
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.hint}>Nothing added yet.</p>
          )}
          <EvidenceUploader submissionId={b.draft.submissionId} existing={b.draft.evidence.length} enabled={b.uploadsEnabled} />
          <p className={styles.hint}>
            PDF, images, Word, Excel, PowerPoint, TXT or ZIP; up to 20 MB each, {MAX_EVIDENCE_ITEMS} items in total.
          </p>
          <form action={addLinkAction} className={styles.field}>
            <input type="hidden" name="submissionId" value={b.draft.submissionId} />
            <input type="hidden" name="scheduleId" value={scheduleId} />
            <input type="hidden" name="back" value={path} />
            <label htmlFor="url">Link (video or repository)</label>
            <div className={styles.pager}>
              <input id="url" name="url" type="url" inputMode="url" placeholder="https://" className={styles.answerText} style={{ minHeight: 44 }} required />
              <button type="submit" className={styles.secondary}>
                Add link
              </button>
            </div>
            <span className={styles.hint}>{LINK_HOST_SUMMARY}. Make sure the link isn&apos;t private.</span>
          </form>

          <form id="submit" action={submitPracticalAction} className={styles.stack}>
            <input type="hidden" name="submissionId" value={b.draft.submissionId} />
            <input type="hidden" name="scheduleId" value={scheduleId} />
            {hasLinks ? (
              <label className={styles.confirmLine}>
                <input type="checkbox" name="linksConfirmed" value="1" defaultChecked={b.draft.linksConfirmed} />
                <span>Assessors and moderators can open my links.</span>
              </label>
            ) : null}
            <button type="submit" className={styles.button} disabled={b.draft.evidence.length === 0}>
              Submit for assessment
            </button>
            <p className={styles.hint}>You can&apos;t change it after submitting.</p>
          </form>
        </section>
      ) : b.reason && REASONS[b.reason] ? (
        <p className={styles.hint}>{REASONS[b.reason]}</p>
      ) : null}

      {b.history.length ? (
        <section id="history" className={styles.card} aria-labelledby="history-title">
          <h2 id="history-title" className={styles.cardTitle}>
            History
          </h2>
          <ul className={styles.assessList}>
            {b.history.map((h) => (
              <li key={h.submissionId} className={styles.assessItem}>
                <span>
                  Attempt {h.attemptNo} · {h.observed ? "observed" : "submitted"} {h.submittedAt ? dateFmt.format(h.submittedAt) : ""} ·{" "}
                  {h.result ? (h.result.outcome === "competent" ? "Competent" : "Not yet competent") : "Being assessed"}
                </span>
                {h.result ? (
                  <>
                    <p style={{ whiteSpace: "pre-line", margin: 0 }}>{h.result.feedback}</p>
                    {h.result.appeal.state === "can_appeal" ? (
                      <details>
                        <summary>Appeal this result</summary>
                        <form action={practicalAppealAction} className={styles.stack}>
                          <input type="hidden" name="submissionId" value={h.submissionId} />
                          <input type="hidden" name="scheduleId" value={scheduleId} />
                          <label htmlFor={`reason-${h.submissionId}`}>Why do you think the result is wrong?</label>
                          <textarea id={`reason-${h.submissionId}`} name="reason" className={styles.answerText} required maxLength={4000} />
                          <p className={styles.hint}>You can appeal until {dateFmt.format(h.result.appeal.closesAt)}.</p>
                          <button type="submit" className={styles.secondary}>
                            Send appeal
                          </button>
                        </form>
                      </details>
                    ) : h.result.appeal.state === "submitted" ? (
                      <p className={styles.hint}>
                        {h.result.appeal.status === "open"
                          ? "Your appeal is with a moderator."
                          : h.result.appeal.status === "upheld"
                            ? "A moderator reviewed your appeal and the result stands."
                            : "A moderator arranged a reassessment."}
                        {h.result.appeal.outcomeNotes ? ` ${h.result.appeal.outcomeNotes}` : ""}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
