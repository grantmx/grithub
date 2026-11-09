import type { Metadata } from "next";
import { scheduleSessionAction } from "@/app/staff/comms-actions";
import { Icon } from "@/components/Icon";
import styles from "@/components/comms/staff.module.css";
import { StatusBanner, longDateTimeFmt } from "@/components/comms/staff/Shared";
import ui from "@/components/ui.module.css";
import { listStaffSessions, sessionFormOptions } from "@/lib/server/liveSessions";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Live sessions" };
export const dynamic = "force-dynamic";

/** Live sessions (design.md §14, 2026-11-08; Form 5 4.2.8): schedule on Zoom, list, open the register. */
export default async function SessionsPage({ searchParams }: { searchParams: Promise<{ done?: string; error?: string }> }) {
  const { ctx, actor } = await requirePage("/staff/sessions");
  const sp = await searchParams;
  const [rows, opts] = await Promise.all([listStaffSessions(ctx, actor), sessionFormOptions(ctx, actor)]);
  const now = ctx.now();
  const upcoming = rows.filter((r) => r.endsAt >= now).reverse();
  const past = rows.filter((r) => r.endsAt < now);
  const multipleQuals = new Set(opts.cohorts.map((c) => c.qualificationId)).size > 1;

  const table = (list: typeof rows, isPast: boolean) => (
    <div className={ui.tableWrap}>
      <table className={ui.table}>
        <thead>
          <tr>
            <th scope="col">Session</th>
            <th scope="col">Cohort</th>
            <th scope="col">When (SA time)</th>
            <th scope="col">Status</th>
            {isPast ? <th scope="col">Attendance</th> : null}
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr>
              <td colSpan={isPast ? 5 : 4} className={ui.muted}>
                {isPast ? "No past sessions." : "Nothing scheduled."}
              </td>
            </tr>
          ) : (
            list.map((r) => (
              <tr key={r.id}>
                <td>
                  <a href={`/staff/sessions/${r.id}`}>{r.title}</a>
                  {r.moduleCode ? <span className={styles.meta}> · {r.moduleCode}</span> : null}
                </td>
                <td>{r.cohortName}</td>
                <td>{longDateTimeFmt.format(r.startsAt)}</td>
                <td>
                  {r.cancelledAt ? (
                    <span className={`${styles.status} ${styles.bad}`}>
                      <Icon name="wrong" size={16} /> Cancelled
                    </span>
                  ) : r.recordingUrl ? (
                    <span className={`${styles.status} ${styles.ok}`}>
                      <Icon name="done" size={16} /> Recording added
                    </span>
                  ) : isPast ? (
                    "Held"
                  ) : (
                    <span className={styles.status}>
                      <Icon name="calendar" size={16} /> Scheduled
                    </span>
                  )}
                </td>
                {isPast ? (
                  <td>
                    {r.cancelledAt ? (
                      "—"
                    ) : r.marked > 0 ? (
                      `${r.marked} marked`
                    ) : (
                      <span className={`${styles.status} ${styles.warn}`}>
                        <Icon name="warning" size={16} /> Attendance not marked
                      </span>
                    )}
                  </td>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className={styles.page}>
      <h1 className={ui.h1} style={{ margin: 0 }}>
        Live sessions
      </h1>
      <StatusBanner done={sp.done} error={sp.error} messages={{}} />

      {opts.cohorts.length === 0 ? (
        <p className={ui.muted}>You aren&apos;t assigned to any cohorts yet.</p>
      ) : (
        <form action={scheduleSessionAction} className={styles.form}>
          <h2 className={styles.formTitle}>Schedule a session</h2>
          <input type="hidden" name="back" value="/staff/sessions" />
          <div className={styles.grid2}>
            <div className={ui.field}>
              <label htmlFor="s-cohort" className={ui.label}>
                Cohort
              </label>
              <select id="s-cohort" name="cohortId" className={ui.select} required>
                {opts.cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={ui.field}>
              <label htmlFor="s-module" className={ui.label}>
                Module (optional)
              </label>
              <select id="s-module" name="moduleId" className={ui.select} defaultValue="">
                <option value="">Whole programme</option>
                {opts.modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code}: {m.title}
                  </option>
                ))}
              </select>
              {multipleQuals ? <p className={ui.hint}>Pick a module from the cohort&apos;s programme.</p> : null}
            </div>
          </div>
          <div className={ui.field}>
            <label htmlFor="s-title" className={ui.label}>
              Title
            </label>
            <input id="s-title" name="title" className={ui.input} required maxLength={200} />
          </div>
          <div className={ui.field}>
            <label htmlFor="s-details" className={ui.label}>
              Details (optional)
            </label>
            <textarea id="s-details" name="details" className={ui.textarea} rows={3} maxLength={2000} />
          </div>
          <div className={styles.grid2}>
            <div className={ui.field}>
              <label htmlFor="s-start" className={ui.label}>
                Starts (South African time)
              </label>
              <input id="s-start" name="startsAt" type="datetime-local" className={ui.input} required />
            </div>
            <div className={ui.field}>
              <label htmlFor="s-duration" className={ui.label}>
                Length (minutes)
              </label>
              <input id="s-duration" name="durationMinutes" type="number" min={15} max={480} step={5} defaultValue={60} className={ui.input} required />
            </div>
          </div>
          <div className={ui.field}>
            <label htmlFor="s-join" className={ui.label}>
              Zoom link
            </label>
            <input id="s-join" name="joinUrl" type="url" className={ui.input} required placeholder="https://zoom.us/j/…" aria-describedby="s-join-hint" />
            <p id="s-join-hint" className={ui.hint}>
              zoom.us links only. Learners always see the link.
            </p>
          </div>
          <p className={ui.hint}>Every learner in the cohort is emailed a calendar invite now, and again if the session changes or is cancelled.</p>
          <div>
            <button type="submit" className={ui.button}>
              Schedule session
            </button>
          </div>
        </form>
      )}

      <h2 className={ui.h2} style={{ margin: 0 }}>
        Upcoming
      </h2>
      {table(upcoming, false)}
      <h2 className={ui.h2} style={{ margin: 0 }}>
        Past
      </h2>
      {table(past, true)}
    </div>
  );
}
