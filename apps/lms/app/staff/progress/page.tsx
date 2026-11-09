import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import ui from "@/components/ui.module.css";
import { riskText } from "@/lib/comms";
import { cohortRisk } from "@/lib/server/atRisk";
import { requirePage } from "@/lib/server/page";
import { listCohortLearners, listReportCohorts } from "@/lib/server/reports";

export const metadata: Metadata = { title: "Learner progress" };

const dateFmt = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" });

/** Facilitator: learners in my cohorts, with a report per learner. */
export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { ctx, actor } = await requirePage("/staff/progress");
  const { cohort: cohortParam } = await searchParams;
  const cohorts = await listReportCohorts(ctx, actor);
  const cohort = cohorts.find((c) => c.id === cohortParam) ?? cohorts[0];

  if (!cohort) {
    return (
      <>
        <h1 className={ui.h1}>Learner progress</h1>
        <p className={ui.muted}>You aren&apos;t assigned to any cohorts yet.</p>
      </>
    );
  }
  const [learners, risk] = await Promise.all([
    listCohortLearners(ctx, actor, cohort.id),
    cohortRisk(ctx, actor, cohort.id),
  ]);
  // At-risk flags are staff only (design.md §14, 2026-11-08); facilitators can message the learner.
  const canMessage = actor.roles.has("facilitator");

  return (
    <>
      <form method="get" className={ui.row}>
        <h1 className={ui.h1} style={{ margin: 0 }}>
          Learner progress ·
        </h1>
        <label htmlFor="cohort" className={ui.srOnly}>
          Cohort
        </label>
        <select
          id="cohort"
          name="cohort"
          className={ui.select}
          defaultValue={cohort.id}
          style={{ width: "auto" }}
        >
          {cohorts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="submit" className={ui.secondary}>
          Show
        </button>
      </form>
      <p className={ui.muted}>{cohort.qualificationTitle}</p>
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th scope="col">Learner</th>
              <th scope="col">Enrolment</th>
              <th scope="col">Sections complete</th>
              <th scope="col">Last active</th>
              <th scope="col">Attention</th>
              <th scope="col">Report</th>
            </tr>
          </thead>
          <tbody>
            {learners.length === 0 ? (
              <tr>
                <td colSpan={6} className={ui.muted}>
                  No learners in this cohort yet.
                </td>
              </tr>
            ) : (
              learners.map((l) => (
                <tr key={l.enrolmentId}>
                  <td>{l.name}</td>
                  <td>{l.status}</td>
                  <td>{l.completed}</td>
                  <td>
                    {l.lastActive
                      ? dateFmt.format(new Date(l.lastActive))
                      : "Not yet"}
                  </td>
                  <td>
                    {risk.get(l.enrolmentId) ? (
                      <span style={{ display: "inline-flex", flexDirection: "column", gap: "var(--space-1)" }}>
                        {risk.get(l.enrolmentId)!.map((r) => (
                          <span key={r.kind} className={ui.statusWarn} style={{ display: "inline-flex", gap: "var(--space-1)", alignItems: "center" }}>
                            <Icon name="warning" size={16} /> {riskText(r)}
                          </span>
                        ))}
                        {canMessage ? <a href={`/staff/messages/new?enrolment=${l.enrolmentId}`}>Message learner</a> : null}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <a href={`/staff/progress/${l.enrolmentId}`}>View</a> ·{" "}
                    <a href={`/staff/progress/${l.enrolmentId}/csv`} download>
                      CSV
                    </a>
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
