import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { briefPartAction, scheduleBriefAction } from "@/app/admin/assess-actions";
import styles from "@/components/assess/staff.module.css";
import ui from "@/components/ui.module.css";
import { getBriefForAdmin } from "@/lib/server/briefAuthoring";
import { requirePage } from "@/lib/server/page";
import { PracticalError } from "@/lib/server/practical";

export const metadata: Metadata = { title: "Practical task" };

const dtFmt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" });

/** Brief editor: criteria (rubric) and equivalent variants while draft; publish; schedule. */
export default async function BriefAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ briefId: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { briefId } = await params;
  const sp = await searchParams;
  const { ctx, actor } = await requirePage(`/admin/practical/${briefId}`);
  let data;
  try {
    data = await getBriefForAdmin(ctx, actor, briefId);
  } catch (e) {
    if (e instanceof PracticalError) notFound();
    throw e;
  }
  const { brief, module: mod, criteria, variants, schedules, cohorts, days, problems } = data;
  const draft = brief.status === "draft";
  const observed = brief.mode === "observed";
  const hidden = (op: string, partId?: string) => (
    <>
      <input type="hidden" name="briefId" value={brief.id} />
      <input type="hidden" name="op" value={op} />
      {partId ? <input type="hidden" name="partId" value={partId} /> : null}
    </>
  );

  return (
    <div className={ui.stack}>
      <p className={ui.hint}>
        <a href="/admin/practical">Practical tasks</a> › {mod.code}
      </p>
      <h1 className={ui.h1} style={{ margin: 0 }}>
        {brief.title}
      </h1>
      <p className={ui.muted}>
        {brief.curriculumComponentRef} · {observed ? "Observed on an assessment day" : "Evidence submission"} · {brief.maxAttempts} attempt
        {brief.maxAttempts === 1 ? "" : "s"} · {draft ? "Draft" : "Published (fixed)"}
      </p>
      {sp.done === "published" ? <p className={ui.bannerSuccess}>Published. Schedule it for a cohort below.</p> : null}
      {sp.done === "scheduled" ? <p className={ui.bannerSuccess}>Scheduled.</p> : null}
      {sp.error ? (
        <p role="alert" className={ui.bannerError}>
          {sp.error}
        </p>
      ) : null}
      <p style={{ whiteSpace: "pre-line" }}>{brief.instructions}</p>

      <section className={styles.panel} aria-labelledby="criteria-title">
        <h2 id="criteria-title" className={styles.panelTitle}>
          Assessment criteria (rubric, judged Met / Not yet met)
        </h2>
        <ul className={styles.history}>
          {criteria.map((c) => (
            <li key={c.id} className={ui.spread}>
              <span>
                <strong>{c.code}</strong> {c.label}
                {c.guidance ? <span className={ui.hint}> · {c.guidance}</span> : null}
              </span>
              {draft ? (
                <form action={briefPartAction}>
                  {hidden("remove-criterion", c.id)}
                  <button type="submit" className={ui.textButton}>
                    Remove
                  </button>
                </form>
              ) : null}
            </li>
          ))}
          {criteria.length === 0 ? <li className={ui.muted}>None yet.</li> : null}
        </ul>
        {draft ? (
          <form action={briefPartAction} className={ui.row}>
            {hidden("add-criterion")}
            <input name="code" aria-label="Code" placeholder={`AC${criteria.length + 1}`} className={styles.smallInput} required maxLength={20} />
            <input name="label" aria-label="Criterion" placeholder="What the assessor checks" className={ui.input} style={{ flex: 2 }} required />
            <input name="guidance" aria-label="Guidance" placeholder="Guidance (optional)" className={ui.input} style={{ flex: 2 }} />
            <button type="submit" className={ui.secondary}>
              Add criterion
            </button>
          </form>
        ) : null}
      </section>

      <section className={styles.panel} aria-labelledby="variants-title">
        <h2 id="variants-title" className={styles.panelTitle}>
          Variants (equivalent tasks, assigned per learner with a seeded draw)
        </h2>
        <ul className={styles.history}>
          {variants.map((v) => (
            <li key={v.id} className={ui.spread}>
              <span>
                <strong>Variant {v.label}</strong> {v.variantInstructions}
              </span>
              {draft ? (
                <form action={briefPartAction}>
                  {hidden("remove-variant", v.id)}
                  <button type="submit" className={ui.textButton}>
                    Remove
                  </button>
                </form>
              ) : null}
            </li>
          ))}
          {variants.length === 0 ? <li className={ui.muted}>None yet.</li> : null}
        </ul>
        {draft ? (
          <form action={briefPartAction} className={ui.row}>
            {hidden("add-variant")}
            <input name="label" aria-label="Label" placeholder={String.fromCharCode(65 + variants.length)} className={styles.smallInput} required maxLength={20} />
            <input name="instructions" aria-label="Variant instructions" placeholder="What's different in this variant" className={ui.input} style={{ flex: 3 }} required />
            <button type="submit" className={ui.secondary}>
              Add variant
            </button>
          </form>
        ) : null}
        {draft ? (
          <form action={briefPartAction} className={ui.stack}>
            {hidden("publish")}
            {problems.map((p) => (
              <p key={p} className={ui.bannerError}>
                {p}
              </p>
            ))}
            <label className={ui.checkbox}>
              <input type="checkbox" name="confirm" value="1" />
              <span className={ui.hint}>Publish. Criteria and variants are then fixed; to change them, create a new task.</span>
            </label>
            <button type="submit" className={ui.button} disabled={problems.length > 0}>
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
                {heldOn ? ` · assessment day ${heldOn}, ${venue}` : ""}
              </li>
            ))}
            {schedules.length === 0 ? <li className={ui.muted}>Not scheduled yet.</li> : null}
          </ul>
          <form action={scheduleBriefAction} className={ui.stack}>
            <input type="hidden" name="briefId" value={brief.id} />
            <input type="hidden" name="mode" value={brief.mode} />
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
            {observed ? (
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
                      From
                    </label>
                    <input id="startTime" name="startTime" type="time" defaultValue="08:00" className={ui.input} required />
                  </div>
                  <div className={ui.field}>
                    <label htmlFor="endTime" className={ui.label}>
                      To
                    </label>
                    <input id="endTime" name="endTime" type="time" defaultValue="16:00" className={ui.input} required />
                  </div>
                </div>
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
                    Due
                  </label>
                  <input id="closesAt" name="closesAt" type="datetime-local" className={ui.input} required />
                </div>
              </div>
            )}
            <p className={ui.hint}>Times are South African time.</p>
            <button type="submit" className={ui.secondary}>
              Add schedule
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
