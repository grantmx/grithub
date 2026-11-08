import type { Metadata } from "next";
import ui from "@/components/ui.module.css";
import { listAppeals } from "@/lib/server/moderation";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Appeals" };

const dateFmt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeZone: "Africa/Johannesburg" });
const STATUS = { open: "Open", upheld: "✓ Upheld", reassess: "Reassessment ordered" } as const;

/** Learner appeals in my cohorts (decided by a moderator who did not make the decision). */
export default async function AppealsPage() {
  const { ctx, actor } = await requirePage("/staff/appeals");
  const rows = await listAppeals(ctx, actor);
  return (
    <>
      <h1 className={ui.h1}>Appeals</h1>
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th scope="col">Learner</th>
              <th scope="col">Assessment</th>
              <th scope="col">Cohort</th>
              <th scope="col">Decision</th>
              <th scope="col">Submitted</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className={ui.muted}>
                  No appeals.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <a href={`/staff/appeals/${r.id}`}>{r.learnerName}</a>
                  </td>
                  <td>{r.title}</td>
                  <td>{r.cohortName}</td>
                  <td>{r.outcome === "competent" ? "Competent" : "Not yet competent"}</td>
                  <td>{dateFmt.format(r.submittedAt)}</td>
                  <td>
                    {STATUS[r.status]}
                    {r.ownDecision ? <div className={ui.hint}>Your decision: another moderator decides</div> : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
