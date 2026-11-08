import type { Metadata } from "next";
import { createBriefAction } from "@/app/admin/assess-actions";
import ui from "@/components/ui.module.css";
import { listBriefs, practicalModules } from "@/lib/server/briefAuthoring";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Practical tasks" };

/** Admin: practical briefs (criteria, variants, schedules). No workplace module, logbook or mentor. */
export default async function PracticalAdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { ctx, actor } = await requirePage("/admin/practical");
  const { error } = await searchParams;
  const [rows, mods] = await Promise.all([listBriefs(ctx, actor), practicalModules(ctx, actor)]);
  return (
    <>
      <h1 className={ui.h1}>Practical tasks</h1>
      {error ? (
        <p role="alert" className={ui.bannerError}>
          {error}
        </p>
      ) : null}
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th scope="col">Task</th>
              <th scope="col">Module</th>
              <th scope="col">Assessed by</th>
              <th scope="col">Criteria</th>
              <th scope="col">Variants</th>
              <th scope="col">Attempts</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id}>
                <td>
                  <a href={`/admin/practical/${b.id}`}>{b.title}</a>
                </td>
                <td>
                  {b.moduleCode} · {b.component}
                </td>
                <td>{b.mode === "observed" ? "Observation on the day" : "Evidence submission"}</td>
                <td>{b.criteria}</td>
                <td>{b.variants}</td>
                <td>{b.maxAttempts}</td>
                <td className={b.status === "published" ? ui.statusOk : undefined}>{b.status === "published" ? "✓ Published" : "Draft"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className={ui.h2}>New practical task</h2>
      <form action={createBriefAction} className={ui.stack} style={{ maxWidth: "36rem" }}>
        <div className={ui.field}>
          <label htmlFor="moduleId" className={ui.label}>
            Practical module
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
        <div className={ui.field}>
          <label htmlFor="component" className={ui.label}>
            Curriculum component
          </label>
          <input id="component" name="component" className={ui.input} required maxLength={100} placeholder="e.g. PM-01-PS01" />
          <p className={ui.hint}>Every variant of this task is tagged to this component and shares the same criteria.</p>
        </div>
        <div className={ui.field}>
          <label htmlFor="instructions" className={ui.label}>
            Instructions (for every variant)
          </label>
          <textarea id="instructions" name="instructions" className={ui.input} rows={4} required />
        </div>
        <fieldset className={ui.field} style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className={ui.label}>How it is assessed</legend>
          <label className={ui.checkbox}>
            <input type="radio" name="mode" value="submission" defaultChecked /> Learner submits evidence (files and links)
          </label>
          <label className={ui.checkbox}>
            <input type="radio" name="mode" value="observed" /> Assessor observes on an assessment day
          </label>
        </fieldset>
        <div className={ui.field}>
          <label htmlFor="maxAttempts" className={ui.label}>
            Attempts
          </label>
          <input id="maxAttempts" name="maxAttempts" type="number" min={1} max={10} className={ui.input} placeholder="2 (1 + 1 reassessment)" />
        </div>
        <button type="submit" className={ui.button}>
          Create draft
        </button>
      </form>
    </>
  );
}
