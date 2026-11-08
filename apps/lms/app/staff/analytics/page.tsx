import type { Metadata } from "next";
import ui from "@/components/ui.module.css";
import { analyticsBlueprints } from "@/lib/server/analytics";
import { requirePage } from "@/lib/server/page";

export const metadata: Metadata = { title: "Question analytics" };

/** Choose an assessment to see per-question statistics. */
export default async function AnalyticsIndexPage() {
  const { ctx, actor } = await requirePage("/staff/analytics");
  const rows = await analyticsBlueprints(ctx, actor);
  return (
    <>
      <h1 className={ui.h1}>Question analytics</h1>
      <p className={ui.muted}>
        Pass rates, answer choices and flags for each question, from papers in your cohorts. Flags need at least 20 responses.
      </p>
      <ul>
        {rows.map((r) => (
          <li key={r.id}>
            <a href={`/staff/analytics/${r.id}`}>
              {r.moduleCode} {r.title}
            </a>{" "}
            <span className={ui.hint}>({r.kind})</span>
          </li>
        ))}
      </ul>
    </>
  );
}
