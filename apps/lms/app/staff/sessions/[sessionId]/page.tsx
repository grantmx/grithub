import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cancelSessionAction, recordingAction, sessionAttendanceAction, updateSessionAction } from "@/app/staff/comms-actions";
import staffStyles from "@/components/assess/staff.module.css";
import { Icon } from "@/components/Icon";
import styles from "@/components/comms/staff.module.css";
import { StatusBanner, longDateTimeFmt } from "@/components/comms/staff/Shared";
import ui from "@/components/ui.module.css";
import { CommsError } from "@/lib/server/comms";
import { type AttendanceStatus, getSessionRegister, toSastLocal } from "@/lib/server/liveSessions";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Live session" };
export const dynamic = "force-dynamic";

// TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
const DONE = {
  scheduled: "Session scheduled. Learners have been emailed a calendar invite.",
  updated: "Saved. If the time, link or title changed, learners were emailed an updated invite.",
  cancelled: "Session cancelled. Learners have been emailed.",
  recording_added: "Recording link added. Learners see it on the session.",
};

const STATUSES: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
  { value: "excused", label: "Excused" },
];

/** One live session: edit, cancel, recording link, and the phone-friendly attendance register. */
export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { sessionId } = await params;
  const sp = await searchParams;
  const path = `/staff/sessions/${sessionId}`;
  const { ctx, actor } = await requirePage(path);
  let reg;
  try {
    reg = await getSessionRegister(ctx, actor, sessionId);
  } catch (e) {
    if (e instanceof CommsError) notFound();
    throw e;
  }
  const s = reg.session;
  const now = ctx.now();
  const cancelled = s.cancelledAt !== null;
  const started = s.startsAt <= now;
  const registerBlocked = cancelled
    ? "This session was cancelled, so attendance can't be marked."
    : !started
      ? "Attendance can be marked once the session has started."
      : null;
  const attended = reg.rows.filter((r) => r.status === "present" || r.status === "late").length;
  const marked = reg.rows.filter((r) => r.status).length;
  const minutes = Math.round((s.endsAt.getTime() - s.startsAt.getTime()) / 60_000);

  return (
    <div className={styles.page}>
      <p className={ui.hint}>
        <a href="/staff/sessions">Live sessions</a> › {reg.cohortName}
      </p>
      <div className={styles.toolbar}>
        <h1 className={ui.h1}>{s.title}</h1>
        {cancelled ? (
          <span className={`${styles.status} ${styles.bad}`}>
            <Icon name="wrong" size={16} /> Cancelled
          </span>
        ) : null}
      </div>
      <p className={styles.meta}>
        {longDateTimeFmt.format(s.startsAt)} · {minutes} min ·{" "}
        <a href={s.joinUrl} target="_blank" rel="noopener noreferrer">
          Zoom link <Icon name="link" size={14} />
        </a>
      </p>
      <StatusBanner done={sp.done} error={sp.error} messages={DONE} />

      <section aria-labelledby="register" className={styles.form} style={{ maxWidth: "none" }}>
        <h2 id="register" className={styles.formTitle}>
          Attendance
        </h2>
        <p className={styles.meta}>
          {marked} of {reg.rows.length} marked · {attended} attended
        </p>
        {registerBlocked ? <p className={ui.bannerInfo}>{registerBlocked}</p> : null}
        {reg.rows.length === 0 ? <p className={ui.muted}>No learners in this cohort.</p> : null}
        <ul className={styles.register}>
          {reg.rows.map((row) => (
            <li key={row.enrolmentId} className={styles.registerRow}>
              <p className={styles.registerName}>{row.name}</p>
              <form action={sessionAttendanceAction} className={staffStyles.chipButtons} aria-label={`Attendance for ${row.name}`}>
                <input type="hidden" name="sessionId" value={sessionId} />
                <input type="hidden" name="enrolmentId" value={row.enrolmentId} />
                <input type="hidden" name="back" value={path} />
                {STATUSES.map((st) => (
                  <button
                    key={st.value}
                    type="submit"
                    name="status"
                    value={st.value}
                    className={staffStyles.chipButton}
                    aria-pressed={row.status === st.value}
                    disabled={registerBlocked !== null}
                  >
                    {st.label}
                  </button>
                ))}
              </form>
            </li>
          ))}
        </ul>
      </section>

      {!cancelled ? (
        <form action={recordingAction} className={styles.form}>
          <h2 className={styles.formTitle}>Recording</h2>
          {s.recordingUrl ? (
            <p className={styles.meta}>
              Current:{" "}
              <a href={s.recordingUrl} target="_blank" rel="noopener noreferrer">
                {s.recordingUrl} <Icon name="link" size={14} />
              </a>
            </p>
          ) : null}
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="back" value={path} />
          <label htmlFor="rec-url" className={ui.label}>
            Recording link
          </label>
          <input id="rec-url" name="recordingUrl" type="url" className={ui.input} required aria-describedby="rec-hint" />
          <p id="rec-hint" className={ui.hint}>
            A Zoom cloud recording, or an unlisted YouTube, Vimeo, Google Drive or OneDrive link. Learners get a notification (no email).
          </p>
          <div>
            <button type="submit" className={ui.secondary}>
              {s.recordingUrl ? "Replace recording link" : "Add recording link"}
            </button>
          </div>
        </form>
      ) : null}

      {!cancelled ? (
        <form action={updateSessionAction} className={styles.form}>
          <h2 className={styles.formTitle}>Edit session</h2>
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="back" value={path} />
          <div className={ui.field}>
            <label htmlFor="e-module" className={ui.label}>
              Module (optional)
            </label>
            <select id="e-module" name="moduleId" className={ui.select} defaultValue={s.moduleId ?? ""}>
              <option value="">Whole programme</option>
              {reg.modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code}: {m.title}
                </option>
              ))}
            </select>
          </div>
          <div className={ui.field}>
            <label htmlFor="e-title" className={ui.label}>
              Title
            </label>
            <input id="e-title" name="title" className={ui.input} required maxLength={200} defaultValue={s.title} />
          </div>
          <div className={ui.field}>
            <label htmlFor="e-details" className={ui.label}>
              Details (optional)
            </label>
            <textarea id="e-details" name="details" className={ui.textarea} rows={3} maxLength={2000} defaultValue={s.details} />
          </div>
          <div className={styles.grid2}>
            <div className={ui.field}>
              <label htmlFor="e-start" className={ui.label}>
                Starts (South African time)
              </label>
              <input id="e-start" name="startsAt" type="datetime-local" className={ui.input} required defaultValue={toSastLocal(s.startsAt)} />
            </div>
            <div className={ui.field}>
              <label htmlFor="e-duration" className={ui.label}>
                Length (minutes)
              </label>
              <input id="e-duration" name="durationMinutes" type="number" min={15} max={480} step={5} defaultValue={minutes} className={ui.input} required />
            </div>
          </div>
          <div className={ui.field}>
            <label htmlFor="e-join" className={ui.label}>
              Zoom link
            </label>
            <input id="e-join" name="joinUrl" type="url" className={ui.input} required defaultValue={s.joinUrl} />
          </div>
          <p className={ui.hint}>Changing the time, length, link or title emails every learner an updated calendar invite.</p>
          <div>
            <button type="submit" className={ui.button}>
              Save changes
            </button>
          </div>
        </form>
      ) : null}

      {!cancelled ? (
        <form action={cancelSessionAction} className={styles.form}>
          <h2 className={styles.formTitle}>Cancel session</h2>
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="back" value={path} />
          <label className={ui.checkbox}>
            <input type="checkbox" name="confirm" value="1" required />
            <span>
              Cancel &quot;{s.title}&quot;. Every learner in {reg.cohortName} is emailed a cancellation, and it can&apos;t be undone.
            </span>
          </label>
          <div>
            <button type="submit" className={ui.danger}>
              Cancel session
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
