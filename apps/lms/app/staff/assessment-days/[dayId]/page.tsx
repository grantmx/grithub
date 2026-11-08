import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  attendanceAction,
  extraTimeAction,
  idCheckAction,
  observeAction,
  pauseAction,
  signOffAction,
  unlockAction,
} from "@/app/staff/assess-actions";
import styles from "@/components/assess/staff.module.css";
import ui from "@/components/ui.module.css";
import { AssessmentError } from "@/lib/server/assessments";
import { requirePage } from "@/lib/server/page";
import { getRegister, type AttendanceStatus } from "@/lib/server/register";

export const metadata: Metadata = { title: "Register" };
export const dynamic = "force-dynamic";

const timeFmt = new Intl.DateTimeFormat("en-ZA", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg" });
const dayFmt = new Intl.DateTimeFormat("en-ZA", { weekday: "short", day: "numeric", month: "short" });

const STATUSES: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
  { value: "excused", label: "Excused" },
];

const PAPER_STATE = {
  locked: "Not opened",
  unlocked: "Opened · waiting to begin",
  writing: "● Writing",
  paused: "⏸ Paused",
  submitted: "✓ Submitted",
} as const;

const DONE: Record<string, string> = {
  unlocked: "Paper opened for the learner.",
  extra_time: "Extra time added.",
  signed_off: "Register signed off. It can no longer change.",
};

/** Assessment-day register (design-gate decision 2026-11-08: one row per learner, phone-friendly). */
export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ dayId: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { dayId } = await params;
  const sp = await searchParams;
  const path = `/staff/assessment-days/${dayId}`;
  const { ctx, actor } = await requirePage(path);
  let reg;
  try {
    reg = await getRegister(ctx, actor, dayId);
  } catch (e) {
    if (e instanceof AssessmentError) notFound();
    throw e;
  }
  const signed = reg.signoff !== null;
  const present = reg.rows.filter((r) => r.status === "present" || r.status === "late").length;

  return (
    <div className={ui.stack}>
      <p className={ui.hint}>
        <a href="/staff/assessment-days">Assessment days</a> › {reg.day.cohortName}
      </p>
      <h1 className={ui.h1} style={{ margin: 0 }}>
        {dayFmt.format(new Date(`${reg.day.heldOn}T12:00:00Z`))} · {reg.day.venue}
      </h1>
      <p className={ui.muted}>
        {[...reg.schedules, ...reg.observedTasks].map((s) => `${s.title} (${timeFmt.format(s.opensAt)}–${timeFmt.format(s.closesAt)})`).join(" · ") ||
          "Nothing scheduled"}{" "}
        · {reg.rows.length} learners · {present} present
      </p>
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
      {signed ? (
        <p className={ui.bannerInfo}>
          Signed off by {reg.signoff!.signedBy} at {timeFmt.format(reg.signoff!.signedAt)}. The register is final.
        </p>
      ) : null}

      <ul className={styles.register}>
        {reg.rows.map((row) => (
          <li key={row.enrolmentId} className={styles.registerRow}>
            <p className={styles.registerName}>{row.name}</p>
            <form action={attendanceAction} className={styles.chipButtons} aria-label={`Attendance for ${row.name}`}>
              <input type="hidden" name="dayId" value={dayId} />
              <input type="hidden" name="enrolmentId" value={row.enrolmentId} />
              <input type="hidden" name="back" value={path} />
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="submit"
                  name="status"
                  value={s.value}
                  className={styles.chipButton}
                  aria-pressed={row.status === s.value}
                  disabled={signed}
                >
                  {s.label}
                </button>
              ))}
            </form>
            <form action={idCheckAction} className={styles.inlineForm}>
              <input type="hidden" name="dayId" value={dayId} />
              <input type="hidden" name="enrolmentId" value={row.enrolmentId} />
              <input type="hidden" name="back" value={path} />
              <input type="hidden" name="verified" value={row.idVerified ? "0" : "1"} />
              <button
                type="submit"
                className={styles.chipButton}
                aria-pressed={row.idVerified}
                disabled={signed || !(row.status === "present" || row.status === "late")}
              >
                {row.idVerified ? "☑ ID checked" : "☐ ID checked"}
              </button>
            </form>
            {row.papers.map((p, i) => {
              const s = reg.schedules[i]!;
              return (
                <div key={p.scheduleId} className={styles.paperLine}>
                  <span>
                    {reg.schedules.length > 1 ? `${s.title}: ` : ""}
                    {PAPER_STATE[p.state]}
                    {p.attemptNo && p.attemptNo > 1 ? ` (attempt ${p.attemptNo})` : ""}
                    {(p.state === "writing" || p.state === "paused") && p.deadlineAt
                      ? ` · ends ${timeFmt.format(p.deadlineAt)}${p.extraMinutes ? ` (+${p.extraMinutes} min)` : ""}`
                      : ""}
                  </span>
                  {reg.canAssess && p.canUnlock ? (
                    <form action={unlockAction}>
                      <input type="hidden" name="scheduleId" value={p.scheduleId} />
                      <input type="hidden" name="enrolmentId" value={row.enrolmentId} />
                      <input type="hidden" name="back" value={path} />
                      <button type="submit" className={ui.button}>
                        Open paper
                      </button>
                    </form>
                  ) : p.state === "locked" && !signed ? (
                    <span className={ui.hint}>Mark present and check ID to open the paper.</span>
                  ) : null}
                  {reg.canAssess && p.attemptId && (p.state === "writing" || p.state === "paused") ? (
                    <details className={ui.menu}>
                      <summary aria-label={`More actions for ${row.name}`}>⋯</summary>
                      <div className={ui.menuPanel}>
                        <form action={pauseAction}>
                          <input type="hidden" name="attemptId" value={p.attemptId} />
                          <input type="hidden" name="paused" value={p.state === "paused" ? "0" : "1"} />
                          <input type="hidden" name="back" value={path} />
                          <button type="submit" className={ui.textButton}>
                            {p.state === "paused" ? "Resume (moves the end time on)" : "Pause (stops the clock)"}
                          </button>
                        </form>
                        <form action={extraTimeAction} className={styles.inlineForm}>
                          <input type="hidden" name="attemptId" value={p.attemptId} />
                          <input type="hidden" name="back" value={path} />
                          <label htmlFor={`extra-${p.attemptId}`} className={ui.hint}>
                            Extra minutes
                          </label>
                          <input
                            id={`extra-${p.attemptId}`}
                            name="minutes"
                            type="number"
                            min={1}
                            max={120}
                            defaultValue={10}
                            className={styles.smallInput}
                          />
                          <button type="submit" className={ui.textButton}>
                            Add extra time
                          </button>
                        </form>
                      </div>
                    </details>
                  ) : null}
                  {p.attemptId && p.state === "submitted" && actor.roles.has("assessor") ? (
                    <a href={`/staff/attempts/${p.attemptId}/pdf`}>Print paper (PDF)</a>
                  ) : null}
                </div>
              );
            })}
            {row.observations.map((o, i) => {
              const task = reg.observedTasks[i]!;
              return (
                <div key={o.scheduleId} className={styles.paperLine}>
                  <span>
                    {task.title}:{" "}
                    {o.state === "not_started" ? "Not observed yet" : o.state === "observed" ? "● Being observed / marked" : "✓ Decided"}
                  </span>
                  {reg.canAssess && o.canStart ? (
                    <form action={observeAction}>
                      <input type="hidden" name="scheduleId" value={o.scheduleId} />
                      <input type="hidden" name="enrolmentId" value={row.enrolmentId} />
                      <input type="hidden" name="back" value={path} />
                      <button type="submit" className={ui.button}>
                        Mark observation
                      </button>
                    </form>
                  ) : o.state === "not_started" && !signed ? (
                    <span className={ui.hint}>Mark present and check ID to start.</span>
                  ) : null}
                  {reg.canAssess && o.submissionId ? <a href={`/staff/marking/practical/${o.submissionId}`}>Open marking</a> : null}
                </div>
              );
            })}
          </li>
        ))}
      </ul>

      {reg.canAssess && !signed ? (
        <form action={signOffAction} className={styles.panel}>
          <input type="hidden" name="dayId" value={dayId} />
          <input type="hidden" name="back" value={path} />
          <label className={ui.checkbox}>
            <input type="checkbox" name="confirm" value="1" />
            <span>
              I confirm this register is correct: {present} of {reg.rows.length} learners present. After sign-off, attendance and ID
              checks can&apos;t change.
            </span>
          </label>
          <button type="submit" className={ui.button}>
            Sign off register
          </button>
        </form>
      ) : null}
    </div>
  );
}
