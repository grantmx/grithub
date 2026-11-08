import type { Metadata } from "next";
import { createBlueprintAction } from "@/app/admin/assess-actions";
import ui from "@/components/ui.module.css";
import { knowledgeModules, listBlueprints } from "@/lib/server/authoring";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Assessments" };

/** Admin: knowledge assessment blueprints (rules per curriculum component, settings, schedules). */
export default async function AssessmentsAdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { ctx, actor } = await requirePage("/admin/assessments");
  const { error } = await searchParams;
  const [rows, mods] = await Promise.all([listBlueprints(ctx, actor), knowledgeModules(ctx, actor)]);
  return (
    <>
      <div className={ui.spread}>
        <h1 className={ui.h1} style={{ margin: 0 }}>
          Assessments
        </h1>
        <a href="/admin/assessments/coverage">Coverage report</a>
      </div>
      {error ? (
        <p role="alert" className={ui.bannerError}>
          {error}
        </p>
      ) : null}
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th scope="col">Assessment</th>
              <th scope="col">Module</th>
              <th scope="col">Type</th>
              <th scope="col">Questions</th>
              <th scope="col">Attempts</th>
              <th scope="col">Time</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id}>
                <td>
                  <a href={`/admin/assessments/${b.id}`}>{b.title}</a>
                </td>
                <td>
                  {b.moduleCode} <span className={ui.hint}>{b.qualificationTitle}</span>
                </td>
                <td>{b.kind}</td>
                <td>{b.questionCount}</td>
                <td>{b.maxAttempts}</td>
                <td>{b.timeLimitMinutes ? `${b.timeLimitMinutes} min` : "–"}</td>
                <td className={b.status === "published" ? ui.statusOk : undefined}>{b.status === "published" ? "✓ Published" : "Draft"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className={ui.h2}>New assessment</h2>
      <form action={createBlueprintAction} className={ui.stack} style={{ maxWidth: "36rem" }}>
        <div className={ui.field}>
          <label htmlFor="moduleId" className={ui.label}>
            Knowledge module
          </label>
          <select id="moduleId" name="moduleId" className={ui.select} required>
            {mods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} {m.title} ({m.qualificationTitle})
              </option>
            ))}
          </select>
        </div>
        <div className={ui.field}>
          <label htmlFor="title" className={ui.label}>
            Title
          </label>
          <input id="title" name="title" className={ui.input} required maxLength={200} />
        </div>
        <fieldset className={ui.field} style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className={ui.label}>Type</legend>
          <label className={ui.checkbox}>
            <input type="radio" name="kind" value="formative" defaultChecked /> Formative (practice: instant score and answers)
          </label>
          <label className={ui.checkbox}>
            <input type="radio" name="kind" value="summative" /> Summative (assessment day, assessor decides, moderated)
          </label>
        </fieldset>
        <div className={ui.row}>
          <div className={ui.field}>
            <label htmlFor="passMarkPercent" className={ui.label}>
              Pass mark %
            </label>
            <input id="passMarkPercent" name="passMarkPercent" type="number" min={0} max={100} defaultValue={60} className={ui.input} required />
          </div>
          <div className={ui.field}>
            <label htmlFor="timeLimitMinutes" className={ui.label}>
              Time limit (min)
            </label>
            <input id="timeLimitMinutes" name="timeLimitMinutes" type="number" min={1} max={600} className={ui.input} placeholder="None" />
          </div>
          <div className={ui.field}>
            <label htmlFor="maxAttempts" className={ui.label}>
              Attempts
            </label>
            <input id="maxAttempts" name="maxAttempts" type="number" min={1} max={10} className={ui.input} placeholder="Default" />
          </div>
        </div>
        <p className={ui.hint}>Default attempts: summative 2 (1 + 1 reassessment), formative 3.</p>
        <button type="submit" className={ui.button}>
          Create draft
        </button>
      </form>
    </>
  );
}
