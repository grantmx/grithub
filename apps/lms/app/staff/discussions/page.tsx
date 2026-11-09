import type { Metadata } from "next";
import styles from "@/components/comms/staff.module.css";
import { CohortPicker, NoCohorts, dateTimeFmt } from "@/components/comms/staff/Shared";
import ui from "@/components/ui.module.css";
import { staffCohorts } from "@/lib/server/comms";
import { DISCUSSION_STAFF, listBoards } from "@/lib/server/discussions";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Discussions" };
export const dynamic = "force-dynamic";

/** Discussion boards: one per module per cohort (design.md §14, 2026-11-08). */
export default async function DiscussionsPage({ searchParams }: { searchParams: Promise<{ cohort?: string }> }) {
  const { ctx, actor } = await requirePage("/staff/discussions");
  const sp = await searchParams;
  const cohorts = await staffCohorts(ctx, actor, DISCUSSION_STAFF);
  const cohort = cohorts.find((c) => c.id === sp.cohort) ?? cohorts[0];
  if (!cohort) return <NoCohorts title="Discussions" />;
  const boards = await listBoards(ctx, actor, cohort.id);

  return (
    <div className={styles.page}>
      <CohortPicker title="Discussions" cohorts={cohorts} selected={cohort.id} />
      <p className={ui.muted}>{cohort.qualificationTitle} · one board per module. Only facilitators start discussions; learners reply.</p>
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th scope="col">Module</th>
              <th scope="col">Discussions</th>
              <th scope="col">Last activity</th>
            </tr>
          </thead>
          <tbody>
            {boards.length === 0 ? (
              <tr>
                <td colSpan={3} className={ui.muted}>
                  This programme has no modules yet.
                </td>
              </tr>
            ) : (
              boards.map((b) => (
                <tr key={b.moduleId}>
                  <td>
                    <a href={`/staff/discussions/board?cohort=${cohort.id}&module=${b.moduleId}`}>
                      {b.code}: {b.title}
                    </a>
                  </td>
                  <td>{b.threads}</td>
                  <td>{b.lastPostAt ? dateTimeFmt.format(new Date(b.lastPostAt)) : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
