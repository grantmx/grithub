import type { Metadata } from "next";
import ui from "@/components/ui.module.css";
import { listAssessmentDays } from "@/lib/server/register";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Assessment days" };

const dateFmt = new Intl.DateTimeFormat("en-ZA", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

/** Assessment days in my cohorts, each with its register. */
export default async function AssessmentDaysPage() {
  const { ctx, actor } = await requirePage("/staff/assessment-days");
  const days = await listAssessmentDays(ctx, actor);
  return (
    <>
      <h1 className={ui.h1}>Assessment days</h1>
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Cohort</th>
              <th scope="col">Venue</th>
              <th scope="col">Papers</th>
              <th scope="col">Register</th>
            </tr>
          </thead>
          <tbody>
            {days.length === 0 ? (
              <tr>
                <td colSpan={5} className={ui.muted}>
                  No assessment days yet.
                </td>
              </tr>
            ) : (
              days.map((d) => (
                <tr key={d.id}>
                  <td>
                    <a href={`/staff/assessment-days/${d.id}`}>{dateFmt.format(new Date(`${d.heldOn}T12:00:00Z`))}</a>
                  </td>
                  <td>{d.cohortName}</td>
                  <td>{d.venue}</td>
                  <td>{d.papers}</td>
                  <td className={d.signedAt ? ui.statusOk : undefined}>{d.signedAt ? "✓ Signed off" : "Open"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
