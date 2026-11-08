import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { newVersionAction } from "@/app/staff/assess-actions";
import styles from "@/components/assess/staff.module.css";
import ui from "@/components/ui.module.css";
import { safeNext } from "@/lib/access";
import { AssessmentError } from "@/lib/server/assessments";
import { getQuestionForEdit } from "@/lib/server/authoring";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "New question version" };

const SLOTS = 6;

/** Create a new version of a question (the served version is never edited). */
export default async function QuestionVersionPage({
  params,
  searchParams,
}: {
  params: Promise<{ questionId: string }>;
  searchParams: Promise<{ back?: string; done?: string; error?: string }>;
}) {
  const { questionId } = await params;
  const sp = await searchParams;
  const path = `/staff/questions/${questionId}`;
  const { ctx, actor } = await requirePage(path);
  let q;
  try {
    q = await getQuestionForEdit(ctx, actor, questionId);
  } catch (e) {
    if (e instanceof AssessmentError) notFound();
    throw e;
  }
  const back = safeNext(sp.back, "/staff/analytics");
  const short = q.version.type === "short_answer";
  const versioned = sp.done?.startsWith("versioned");
  const warnings = sp.done?.startsWith("versioned:") ? sp.done.slice(10) : null;

  return (
    <div className={ui.stack} style={{ maxWidth: "48rem" }}>
      <p className={ui.hint}>
        <a href={back}>Back to analytics</a>
      </p>
      <h1 className={ui.h1} style={{ margin: 0 }}>
        New version of a question
      </h1>
      <p className={ui.muted}>
        {q.bank.curriculumComponentRef} · current version v{q.version.versionNo}
        {q.version.firstServedAt ? " (served to learners, so it can't be edited)" : ""}. Papers already written keep the version they
        were served.
      </p>
      {versioned ? (
        <p role="status" className={ui.bannerSuccess}>
          New version saved and now in use for new papers.{warnings ? ` Check: ${warnings}` : ""}
        </p>
      ) : null}
      {sp.error ? (
        <p role="alert" className={ui.bannerError}>
          {sp.error}
        </p>
      ) : null}
      <form action={newVersionAction} className={ui.stack}>
        <input type="hidden" name="questionId" value={questionId} />
        <input type="hidden" name="back" value={`${path}?back=${encodeURIComponent(back)}`} />
        <div className={ui.field}>
          <label htmlFor="stem" className={ui.label}>
            Question
          </label>
          <textarea id="stem" name="stem" className={ui.input} rows={3} defaultValue={q.version.stem} required />
        </div>
        {short ? (
          <fieldset className={styles.panel}>
            <legend className={styles.panelTitle}>Rubric criteria</legend>
            {Array.from({ length: SLOTS }, (_, i) => {
              const c = q.criteria[i];
              return (
                <div key={i} className={ui.row}>
                  <label className={ui.srOnly} htmlFor={`crit${i}`}>
                    Criterion {i + 1}
                  </label>
                  <input id={`crit${i}`} name={`crit${i}`} className={ui.input} style={{ flex: 3 }} defaultValue={c?.label ?? ""} placeholder={`Criterion ${i + 1}`} />
                  <label className={ui.srOnly} htmlFor={`max${i}`}>
                    Maximum marks
                  </label>
                  <input id={`max${i}`} name={`max${i}`} type="number" min={1} max={100} className={styles.smallInput} defaultValue={c?.maxMarks ?? 1} />
                  <label className={ui.srOnly} htmlFor={`guide${i}`}>
                    Guidance
                  </label>
                  <input id={`guide${i}`} name={`guide${i}`} className={ui.input} style={{ flex: 3 }} defaultValue={c?.guidance ?? ""} placeholder="Guidance for markers (optional)" />
                </div>
              );
            })}
          </fieldset>
        ) : (
          <fieldset className={styles.panel}>
            <legend className={styles.panelTitle}>
              Answers ({q.version.type === "multi" ? "tick every correct answer" : "tick the one correct answer"})
            </legend>
            {Array.from({ length: SLOTS }, (_, i) => {
              const o = q.options[i];
              return (
                <div key={i} className={ui.row}>
                  <label className={ui.checkbox}>
                    <input type="checkbox" name="correct" value={i} defaultChecked={o?.isCorrect ?? false} />
                    <span className={ui.srOnly}>Answer {i + 1} is correct</span>
                  </label>
                  <label className={ui.srOnly} htmlFor={`opt${i}`}>
                    Answer {i + 1}
                  </label>
                  <input id={`opt${i}`} name={`opt${i}`} className={ui.input} style={{ flex: 1 }} defaultValue={o?.label ?? ""} placeholder={`Answer ${i + 1}`} />
                  <label className={ui.srOnly} htmlFor={`pin${i}`}>
                    Position
                  </label>
                  <select id={`pin${i}`} name={`pin${i}`} className={ui.select} style={{ width: "auto" }} defaultValue={o?.pinnedPosition?.toString() ?? ""}>
                    <option value="">Shuffled</option>
                    <option value="-1">Pinned last</option>
                    <option value="0">Pinned first</option>
                  </select>
                </div>
              );
            })}
            <p className={ui.hint}>Pin &quot;All of the above&quot; / &quot;None of the above&quot; so they aren&apos;t shuffled.</p>
          </fieldset>
        )}
        <div className={ui.field}>
          <label htmlFor="feedback" className={ui.label}>
            Explanation (shown after practice assessments)
          </label>
          <textarea id="feedback" name="feedback" className={ui.input} rows={3} defaultValue={q.version.feedback ?? ""} />
        </div>
        <button type="submit" className={ui.button}>
          Save as v{q.version.versionNo + 1}
        </button>
      </form>
    </div>
  );
}
