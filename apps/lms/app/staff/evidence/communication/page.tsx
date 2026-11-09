import type { Metadata } from "next";
import styles from "@/components/comms/staff.module.css";
import ui from "@/components/ui.module.css";
import { staffCohorts } from "@/lib/server/comms";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Communication log" };
export const dynamic = "force-dynamic";

const sastDate = (d: Date) => new Date(d.getTime() + 2 * 3_600_000).toISOString().slice(0, 10);

/**
 * Communication log export (design.md §14, 2026-11-08; Form 5 4.2.6, 4.2.8,
 * 4.2.11): per cohort and date range, CSV or PDF. Every export is audited.
 */
export default async function CommunicationLogPage() {
  const { ctx, actor } = await requirePage("/staff/evidence/communication");
  const cohorts = await staffCohorts(ctx, actor, ["sdp_admin", "external_evaluator"]);
  const now = ctx.now();
  const to = sastDate(now);
  const from = sastDate(new Date(now.getTime() - 30 * 86_400_000));

  return (
    <div className={styles.page}>
      <p className={ui.hint}>
        <a href="/staff/evidence">Evidence</a> › Communication log
      </p>
      <h1 className={ui.h1} style={{ margin: 0 }}>
        Communication log
      </h1>
      <p className={ui.muted} style={{ maxWidth: "48rem" }}>
        Everything facilitators and learners exchanged in one cohort: announcements, discussion posts, private messages, support tickets
        and replies, live sessions with attendance, and section notes. It includes hidden posts and the earlier text of edited ones. Every
        export, with its checksum, is recorded in the audit log.
      </p>
      {cohorts.length === 0 ? (
        <p className={ui.muted}>There are no cohorts yet.</p>
      ) : (
        <form method="get" action="/staff/evidence/communication/csv" className={styles.form}>
          <div className={ui.field}>
            <label htmlFor="log-cohort" className={ui.label}>
              Cohort
            </label>
            <select id="log-cohort" name="cohort" className={ui.select} required>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.qualificationTitle})
                </option>
              ))}
            </select>
          </div>
          <div className={styles.grid2}>
            <div className={ui.field}>
              <label htmlFor="log-from" className={ui.label}>
                From (inclusive)
              </label>
              <input id="log-from" name="from" type="date" className={ui.input} defaultValue={from} required />
            </div>
            <div className={ui.field}>
              <label htmlFor="log-to" className={ui.label}>
                To (inclusive)
              </label>
              <input id="log-to" name="to" type="date" className={ui.input} defaultValue={to} required />
            </div>
          </div>
          <p className={ui.hint}>Dates are South African dates.</p>
          <div className={styles.actions}>
            <button type="submit" className={ui.button}>
              Download CSV
            </button>
            <button type="submit" formAction="/staff/evidence/communication/pdf" className={ui.secondary}>
              Download PDF
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
