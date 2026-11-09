import type { Metadata } from "next";
import ui from "@/components/ui.module.css";
import { listCohorts, listQualifications } from "@/lib/server/onboarding";
import { requirePage } from "@/lib/server/page";
import { CreateCohortForm, ModerationRateForm } from "../AdminForms";

export const metadata: Metadata = { title: "Cohorts" };

export default async function CohortsPage() {
  const { ctx } = await requirePage("/admin/cohorts");
  const [cohorts, qualifications] = await Promise.all([
    listCohorts(ctx),
    listQualifications(ctx),
  ]);
  return (
    <>
      <h1 className={ui.h1}>Cohorts</h1>
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th scope="col">Cohort</th>
              <th scope="col">Qualification</th>
              <th scope="col">Dates</th>
              <th scope="col">Learners</th>
              <th scope="col">Moderation rate</th>
              <th scope="col">
                <span className={ui.srOnly}>Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {cohorts.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.qualificationTitle}</td>
                <td>
                  {c.startsOn} → {c.endsOn}
                </td>
                <td>{c.learners}</td>
                <td>
                  <ModerationRateForm cohortId={c.id} cohortName={c.name} percent={c.moderationRatePercent} />
                </td>
                <td>
                  <a href={`/admin/people?cohort=${c.id}`}>People</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={ui.hint}>
        Moderation rate: the minimum share of each assessment&apos;s decisions the moderator must check before results are released
        (rounded up).
      </p>
      <h2 className={ui.h2}>Create a cohort</h2>
      {qualifications.length > 0 ? (
        <CreateCohortForm qualifications={qualifications} />
      ) : (
        <p className={ui.muted}>Add a qualification first.</p>
      )}
    </>
  );
}
