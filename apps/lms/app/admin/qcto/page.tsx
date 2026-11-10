import type { Metadata } from "next";
import { SAST } from "@/components/comms/staff/Shared";
import styles from "@/components/form5/form5.module.css";
import ui from "@/components/ui.module.css";
import { requirePage } from "@/lib/server/page";
import { ENROLMENT_WORKING_DAYS, READINESS_WINDOW_DAYS, qctoPanel } from "@/lib/server/qctoPanel";

export const metadata: Metadata = { title: "QCTO submissions" };
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeZone: SAST });
const dateTimeFmt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: SAST });
const day = (ymd: string) => dateFmt.format(new Date(`${ymd}T12:00:00Z`));

function Due({ daysLeft }: { daysLeft: number }) {
  if (daysLeft < 0)
    return (
      <span className={`${styles.status} ${styles.bad}`}>
        <span aria-hidden="true">!</span> Overdue {-daysLeft} day{daysLeft === -1 ? "" : "s"}
      </span>
    );
  return (
    <span className={daysLeft <= 7 ? `${styles.status} ${styles.attention}` : undefined}>
      {daysLeft === 0 ? "Due today" : `Due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}
    </span>
  );
}

const PROFILE_STATUS = { not_started: "Not started", in_progress: "In progress", confirmed: "Confirmed" } as const;
const PURPOSE = { enrolment: "Enrolment", eisa_readiness: "EISA readiness" } as const;

/** Admin → QCTO submissions (design.md §14, 2026-11-09). SDP admins only. */
export default async function QctoPanelPage() {
  const { ctx, actor } = await requirePage("/admin/qcto");
  const p = await qctoPanel(ctx, actor);

  // TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
  return (
    <div className={styles.page}>
      <h1 className={ui.h1}>QCTO submissions</h1>
      <p className={ui.muted}>
        Checked {day(p.today)}. Related: <a href="/admin/form5">Form 5 readiness</a>.
      </p>

      <section className={styles.panel} aria-labelledby="accreditation">
        <h2 id="accreditation">Accreditation</h2>
        {p.warnings.length === 0 ? (
          <p className={styles.muted}>No accreditation warnings.</p>
        ) : (
          <ul className={styles.lines}>
            {p.warnings.map((w) => (
              <li key={w.text} className={w.level === "expired" ? styles.bad : styles.attention}>
                <span className={styles.status}>
                  <span aria-hidden="true">{w.level === "expired" ? "✗" : "!"}</span>{" "}
                  {w.level === "expired" ? "Expired" : w.level === "soon" ? "Ends in under 6 months" : "Cohort ends after the accreditation"}
                </span>
                : {w.text}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="enrolment">
        <h2 id="enrolment">Enrolment submissions</h2>
        <p className={ui.hint}>Every cohort not yet sent, soonest first. Due {ENROLMENT_WORKING_DAYS} working days after the cohort starts (weekends and public holidays skipped).</p>
        {p.enrolmentDue.length === 0 ? (
          <p className={styles.muted}>Every cohort&apos;s enrolment details have been sent.</p>
        ) : (
          <div className={ui.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Cohort</th>
                  <th scope="col">Programme</th>
                  <th scope="col">Started</th>
                  <th scope="col">Due</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {p.enrolmentDue.map((e) => (
                  <tr key={e.cohortId}>
                    <td>{e.name}</td>
                    <td>{e.qualificationTitle}</td>
                    <td>{day(e.startsOn)}</td>
                    <td>{day(e.dueOn)}</td>
                    <td>
                      <Due daysLeft={e.daysLeft} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="eisa">
        <h2 id="eisa">EISA readiness</h2>
        <p className={ui.hint}>Due 3 months before the EISA date. Listed from {READINESS_WINDOW_DAYS} days before the due date, or when overdue.</p>
        {p.readinessDue.length === 0 ? (
          <p className={styles.muted}>No EISA readiness submissions due in the next {READINESS_WINDOW_DAYS} days.</p>
        ) : (
          <div className={ui.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Cohort</th>
                  <th scope="col">EISA date</th>
                  <th scope="col">Readiness due</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {p.readinessDue.map((r) => (
                  <tr key={r.cohortId}>
                    <td>{r.name}</td>
                    <td>{day(r.eisaOn)}</td>
                    <td>{day(r.dueOn)}</td>
                    <td>
                      <Due daysLeft={r.daysLeft} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {p.eisaNotSet.length > 0 ? (
          <>
            <h3 className={ui.label}>EISA date not set</h3>
            <ul className={styles.lines}>
              {p.eisaNotSet.map((c) => (
                <li key={c.cohortId}>{c.name}</li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <section className={styles.panel} aria-labelledby="incomplete">
        <h2 id="incomplete">Learners with incomplete profiles</h2>
        {p.incomplete.length === 0 ? (
          <p className={styles.muted}>Every active learner has confirmed their QCTO details.</p>
        ) : (
          <div className={ui.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Learner</th>
                  <th scope="col">Cohort</th>
                  <th scope="col">Profile</th>
                  <th scope="col">
                    <span className={ui.srOnly}>Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {p.incomplete.map((l) => (
                  <tr key={l.enrolmentId}>
                    <td>{l.name}</td>
                    <td>{l.cohortName}</td>
                    <td>{PROFILE_STATUS[l.status]}</td>
                    <td>
                      <a href={`/admin/people/${l.userId}/profile`}>Open profile</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="invalid">
        <h2 id="invalid">Validation errors</h2>
        <p className={ui.hint}>Fields that don&apos;t pass the QCTO checks. Values are never shown here.</p>
        {p.invalid.length === 0 ? (
          <p className={styles.muted}>No validation errors.</p>
        ) : (
          <div className={ui.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Learner</th>
                  <th scope="col">Cohort</th>
                  <th scope="col">Fields to fix</th>
                  <th scope="col">
                    <span className={ui.srOnly}>Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {p.invalid.map((l) => (
                  <tr key={l.enrolmentId}>
                    <td>{l.name}</td>
                    <td>{l.cohortName}</td>
                    <td>
                      <ul className={styles.lines}>
                        {l.fields.map((f) => (
                          <li key={`${f.part}-${f.field}`}>
                            {f.part}: {f.field}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      <a href={`/admin/people/${l.userId}/profile`}>Open profile</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="last-batch">
        <h2 id="last-batch">Last submission batch</h2>
        {p.lastBatch ? (
          <ul className={styles.lines}>
            <li>
              {PURPOSE[p.lastBatch.purpose]} · {p.lastBatch.status}
              {p.lastBatch.cohortName ? ` · ${p.lastBatch.cohortName}` : ""}
            </li>
            <li>
              File: {p.lastBatch.fileName ?? "not generated yet"}
              {p.lastBatch.rowCount !== null ? ` · ${p.lastBatch.rowCount} rows` : ""}
            </li>
            <li>{p.lastBatch.submittedAt ? `Submitted ${dateTimeFmt.format(p.lastBatch.submittedAt)}` : `Created ${dateTimeFmt.format(p.lastBatch.createdAt)}, not submitted`}</li>
          </ul>
        ) : (
          <p className={styles.muted}>No QCTO submission batch yet (the LEISA exporter isn&apos;t built).</p>
        )}
      </section>
    </div>
  );
}
