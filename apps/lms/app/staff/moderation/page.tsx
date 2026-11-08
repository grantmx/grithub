import type { Metadata } from "next";
import ui from "@/components/ui.module.css";
import { listBatches } from "@/lib/server/moderation";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Moderation sample" };

/** Moderator: one batch per assessment and cohort; closing a batch releases its results. */
export default async function ModerationPage() {
  const { ctx, actor } = await requirePage("/staff/moderation");
  const batches = await listBatches(ctx, actor);
  return (
    <>
      <div className={ui.spread}>
        <h1 className={ui.h1} style={{ margin: 0 }}>
          Moderation sample
        </h1>
        <a href="/staff/appeals">Appeals</a>
      </div>
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th scope="col">Assessment</th>
              <th scope="col">Cohort</th>
              <th scope="col">Decisions</th>
              <th scope="col">Moderated</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 ? (
              <tr>
                <td colSpan={5} className={ui.muted}>
                  No decisions to moderate yet.
                </td>
              </tr>
            ) : (
              batches.map((b) => (
                <tr key={b.id}>
                  <td>
                    <a href={`/staff/moderation/${b.id}`}>{b.title}</a>
                  </td>
                  <td>{b.cohortName}</td>
                  <td>{b.decisions}</td>
                  <td>{b.moderated}</td>
                  <td className={b.status === "closed" ? ui.statusOk : undefined}>
                    {b.status === "closed" ? "✓ Closed · results released" : "Open"}
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
