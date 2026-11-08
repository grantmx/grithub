import type { Metadata } from "next";
import { redirect } from "next/navigation";
import styles from "@/components/learn/learn.module.css";
import ui from "@/components/ui.module.css";
import { AccessDeniedError } from "@/lib/server/auth";
import { requirePage } from "@/lib/server/page";
import { learnerReport } from "@/lib/server/reports";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = { title: "Progress report" };

const dt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" });
const fmt = (d: Date | null) => (d ? dt.format(d) : "—");

/** Printable per-learner progress report (browser "Save as PDF"), plus CSV. */
export default async function LearnerReportPage({
  params,
}: {
  params: Promise<{ enrolmentId: string }>;
}) {
  const { enrolmentId } = await params;
  const { ctx, actor } = await requirePage(`/staff/progress/${enrolmentId}`);
  let report;
  try {
    report = await learnerReport(ctx, actor, enrolmentId);
  } catch (e) {
    if (e instanceof AccessDeniedError) redirect("/forbidden");
    throw e;
  }

  return (
    <div className={styles.report}>
      <div className={`${ui.row} ${styles.noPrint}`}>
        <a href="/staff/progress">← Learner progress</a>
        <PrintButton />
        <a
          className={ui.secondary}
          href={`/staff/progress/${enrolmentId}/csv`}
          download
        >
          Download CSV
        </a>
      </div>
      <h1 className={ui.h1}>Progress report: {report.learnerName}</h1>
      <p className={ui.muted}>
        {report.qualificationTitle} · {report.cohortName} ·{" "}
        {report.totals.complete} of {report.totals.sections} sections complete ·
        generated {dt.format(report.generatedAt)}
      </p>
      <table className={styles.reportTable}>
        <caption className={ui.srOnly}>Section-by-section progress</caption>
        <thead>
          <tr>
            <th scope="col">Module</th>
            <th scope="col">Section</th>
            <th scope="col">Status</th>
            <th scope="col">First viewed</th>
            <th scope="col">Completed</th>
            <th scope="col">Check attempts</th>
            <th scope="col">Latest check</th>
          </tr>
        </thead>
        <tbody>
          {report.rows.map((r) => (
            <tr key={`${r.moduleCode}-${r.sectionNo}`}>
              <td>{r.moduleCode}</td>
              <td>
                {r.sectionNo}. {r.sectionTitle}
              </td>
              <td>{r.status}</td>
              <td>{fmt(r.firstViewedAt)}</td>
              <td>{fmt(r.completedAt)}</td>
              <td>{r.checkAttempts}</td>
              <td>
                {r.checkLatestCorrect === null
                  ? "—"
                  : r.checkLatestCorrect
                    ? "Correct"
                    : "Not correct"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
