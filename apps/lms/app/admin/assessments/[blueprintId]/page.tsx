import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { addRuleAction, publishAction, removeRuleAction, scheduleAction } from "@/app/admin/assess-actions";
import styles from "@/components/assess/staff.module.css";
import ui from "@/components/ui.module.css";
import { AssessmentError } from "@/lib/server/assessments";
import { getBlueprint } from "@/lib/server/authoring";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Assessment" };

const dtFmt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" });

/** Blueprint: rules per curriculum component, publish checks, cohort schedules. */
export default async function BlueprintPage({
  params,
  searchParams,
}: {
  params: Promise<{ blueprintId: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { blueprintId } = await params;
  const sp = await searchParams;
  const { ctx, actor } = await requirePage(`/admin/assessments/${blueprintId}`);
  let data;
  try {
    data = await getBlueprint(ctx, actor, blueprintId);
  } catch (e) {
    if (e instanceof AssessmentError) notFound();
    throw e;
  }
  const { blueprint: bp, module: mod, rules, banks, schedules, cohorts, days, validation } = data;
  const draft = bp.status === "draft";
  const summative = bp.kind === "summative";
  const total = rules.reduce((s, r) => s + r.rule.questionCount, 0);

  return (
    <div className={ui.stack}>
      <p className={ui.hint}>
        <a href="/admin/assessments">Assessments</a> › {mod.code}
      </p>
      <h1 className={ui.h1} style={{ margin: 0 }}>
        {bp.title}
      </h1>
      <p className={ui.muted}>
        {summative ? "Summative · written at an assessment day" : "Formative · practice"} · pass mark {bp.passMarkPercent}% ·{" "}
        {bp.maxAttempts} attempt{bp.maxAttempts === 1 ? "" : "s"} · {bp.timeLimitMinutes ? `${bp.timeLimitMinutes} min` : "no time limit"} ·{" "}
        {bp.showAnswers ? "answers shown after submitting" : "answers not shown"} · {draft ? "Draft" : "Published (fixed)"}
      </p>
      {sp.done === "published" ? (
        <p role="status" className={ui.bannerSuccess}>
          Published. Schedule it for a cohort below.
        </p>
      ) : sp.done === "scheduled" ? (
        <p role="status" className={ui.bannerSuccess}>
          Scheduled.
        </p>
      ) : null}
      {sp.error ? (
        <p role="alert" className={ui.bannerError}>
          {sp.error}
        </p>
      ) : null}

      <section className={styles.panel} aria-labelledby="rules-title">
        <h2 id="rules-title" className={styles.panelTitle}>
          Paper blueprint: {total} questions per paper
        </h2>
        <p className={ui.hint}>Every learner gets the same number of questions from each curriculum component.</p>
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th scope="col">Curriculum component</th>
                <th scope="col">Bank</th>
                <th scope="col">Questions per paper</th>
                {draft ? (
                  <th scope="col">
                    <span className={ui.srOnly}>Remove</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rules.map(({ rule, bankTitle }) => (
                <tr key={rule.id}>
                  <td>{rule.curriculumComponentRef}</td>
                  <td>{bankTitle}</td>
                  <td>{rule.questionCount}</td>
                  {draft ? (
                    <td>
                      <form action={removeRuleAction}>
                        <input type="hidden" name="blueprintId" value={bp.id} />
                        <input type="hidden" name="ruleId" value={rule.id} />
                        <button type="submit" className={ui.textButton}>
                          Remove
                        </button>
                      </form>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {draft ? (
          <form action={addRuleAction} className={ui.row}>
            <input type="hidden" name="blueprintId" value={bp.id} />
            <label htmlFor="bankId" className={ui.srOnly}>
              Bank
            </label>
            <select id="bankId" name="bankId" className={ui.select} style={{ width: "auto" }} required>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.component}: {b.title}
                </option>
              ))}
            </select>
            <label htmlFor="count" className={ui.srOnly}>
              Questions per paper
            </label>
            <input id="count" name="count" type="number" min={1} max={100} defaultValue={2} className={styles.smallInput} />
            <button type="submit" className={ui.secondary}>
              Add or update rule
            </button>
          </form>
        ) : null}
        {validation.errors.map((e) => (
          <p key={e} className={ui.bannerError}>
            {e}
          </p>
        ))}
        {validation.warnings.map((w) => (
          <p key={w} className={ui.bannerInfo}>
            {w}
          </p>
        ))}
        {draft ? (
          <form action={publishAction} className={ui.stack}>
            <input type="hidden" name="blueprintId" value={bp.id} />
            <label className={ui.checkbox}>
              <input type="checkbox" name="confirm" value="1" />
              <span className={ui.hint}>Publish. The rules and settings are then fixed; to change them, create a new assessment.</span>
            </label>
            <button type="submit" className={ui.button} disabled={validation.errors.length > 0}>
              Publish
            </button>
          </form>
        ) : null}
      </section>

      {!draft ? (
        <section className={styles.panel} aria-labelledby="schedules-title">
          <h2 id="schedules-title" className={styles.panelTitle}>
            Schedules
          </h2>
          <ul className={styles.history}>
            {schedules.map(({ s, cohortName, heldOn, venue }) => (
              <li key={s.id}>
                {cohortName}: {dtFmt.format(s.opensAt)} – {dtFmt.format(s.closesAt)}
                {heldOn ? ` · assessment day ${heldOn}, ${venue}` : ""} ·{" "}
                <a href={`/admin/assessments/coverage?blueprint=${bp.id}&cohort=${s.cohortId}`}>Coverage</a>
              </li>
            ))}
            {schedules.length === 0 ? <li className={ui.muted}>Not scheduled yet.</li> : null}
          </ul>
          <form action={scheduleAction} className={ui.stack}>
            <input type="hidden" name="blueprintId" value={bp.id} />
            <input type="hidden" name="kind" value={bp.kind} />
            <div className={ui.field}>
              <label htmlFor="cohortId" className={ui.label}>
                Cohort
              </label>
              <select id="cohortId" name="cohortId" className={ui.select} required>
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {summative ? (
              <>
                <div className={ui.field}>
                  <label htmlFor="assessmentDay" className={ui.label}>
                    Assessment day
                  </label>
                  <select id="assessmentDay" name="assessmentDay" className={ui.select}>
                    <option value="new">New day (enter below)</option>
                    {days.map((d) => (
                      <option key={d.id} value={`${d.id}|${d.heldOn}`}>
                        {d.heldOn} · {d.venue} ({cohorts.find((c) => c.id === d.cohortId)?.name})
                      </option>
                    ))}
                  </select>
                </div>
                <div className={ui.row}>
                  <div className={ui.field}>
                    <label htmlFor="heldOn" className={ui.label}>
                      New day: date
                    </label>
                    <input id="heldOn" name="heldOn" type="date" className={ui.input} />
                  </div>
                  <div className={ui.field}>
                    <label htmlFor="venue" className={ui.label}>
                      New day: venue
                    </label>
                    <input id="venue" name="venue" className={ui.input} maxLength={200} />
                  </div>
                </div>
                <div className={ui.row}>
                  <div className={ui.field}>
                    <label htmlFor="startTime" className={ui.label}>
                      Paper opens
                    </label>
                    <input id="startTime" name="startTime" type="time" defaultValue="08:00" className={ui.input} required />
                  </div>
                  <div className={ui.field}>
                    <label htmlFor="endTime" className={ui.label}>
                      Paper closes
                    </label>
                    <input id="endTime" name="endTime" type="time" defaultValue="16:00" className={ui.input} required />
                  </div>
                </div>
                <p className={ui.hint}>Times are South African time. The assessor opens each learner&apos;s paper on the day.</p>
              </>
            ) : (
              <div className={ui.row}>
                <div className={ui.field}>
                  <label htmlFor="opensAt" className={ui.label}>
                    Opens
                  </label>
                  <input id="opensAt" name="opensAt" type="datetime-local" className={ui.input} required />
                </div>
                <div className={ui.field}>
                  <label htmlFor="closesAt" className={ui.label}>
                    Closes
                  </label>
                  <input id="closesAt" name="closesAt" type="datetime-local" className={ui.input} required />
                </div>
              </div>
            )}
            <button type="submit" className={ui.secondary}>
              Add schedule
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
